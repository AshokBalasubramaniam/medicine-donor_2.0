//! Unified authentication for every kind of user.
//!
//! One login endpoint serves patients, donors and admins. The client never
//! sends a role: the backend finds the account, and the collection the
//! account is stored in determines the role that is signed into the JWT.

use axum::{
    body::Bytes,
    extract::{Json, State},
    http::{header::SET_COOKIE, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use mongodb::bson::{doc, oid::ObjectId, DateTime as BsonDateTime, Document};
use rand::Rng;
use serde::Deserialize;
use serde_json::{json, Value};

use std::time::Duration;

use crate::{
    state::AppState,
    utils::{
        auth::{api_error, forget_token_version, token_version, ApiError, AuthUser, Role},
        jwt::{
            create_access_token, create_refresh_token, hash_token, verify_refresh_token, REFRESH_TOKEN_DAYS_REMEMBER,
        },
        mail::send_otp_mail,
        password::{dummy_hash, hash_password_async, verify_password_async},
        rate_limit,
    },
};

/// Sessions (refresh tokens) kept per account; older ones are dropped.
const MAX_SESSIONS: i32 = 5;
const OTP_VALID_MINUTES: i64 = 10;
/// Wrong codes allowed before a reset code is thrown away.
const OTP_MAX_ATTEMPTS: i32 = 5;
const FIFTEEN_MINUTES: Duration = Duration::from_secs(15 * 60);

fn too_many() -> ApiError {
    api_error(StatusCode::TOO_MANY_REQUESTS, "Too many attempts. Please wait a few minutes and try again.")
}

pub fn auth_routes(state: AppState) -> Router {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/register", post(register))
        .route("/auth/refresh", post(refresh))
        .route("/auth/logout", post(logout))
        .route("/auth/me", get(me))
        .route("/auth/forgot-password", post(forgot_password))
        .route("/auth/reset-password", post(reset_password))
        .with_state(state)
}

// ----------------------------------------------------------------- helpers

/// The refresh token lives only in this HttpOnly cookie, so page scripts
/// (and therefore XSS) can never read it. It is sent only to /api/auth.
const REFRESH_COOKIE: &str = "mds_rt";

fn env_flag(key: &str) -> Option<String> {
    std::env::var(key).ok().map(|v| v.trim().to_ascii_lowercase()).filter(|v| !v.is_empty())
}

/// `Secure` unless COOKIE_SECURE=false (browsers treat http://localhost as
/// secure, so the default works in development too).
fn cookie_secure() -> bool {
    env_flag("COOKIE_SECURE").as_deref() != Some("false")
}

/// SameSite=Strict by default. Set COOKIE_SAMESITE=none when the frontend
/// and API are on different sites (requires HTTPS).
fn cookie_same_site() -> &'static str {
    match env_flag("COOKIE_SAMESITE").as_deref() {
        Some("none") => "None",
        Some("lax") => "Lax",
        _ => "Strict",
    }
}

fn cookie_attrs() -> String {
    let secure = cookie_secure() || cookie_same_site() == "None";
    format!("; Path=/api/auth; HttpOnly; SameSite={}{}", cookie_same_site(), if secure { "; Secure" } else { "" })
}

/// "Remember me" keeps the cookie for the refresh token's lifetime;
/// otherwise it is a session cookie that ends when the browser closes.
fn refresh_cookie(token: &str, remember: bool) -> String {
    let max_age = if remember { format!("; Max-Age={}", REFRESH_TOKEN_DAYS_REMEMBER * 24 * 60 * 60) } else { String::new() };
    format!("{REFRESH_COOKIE}={token}{max_age}{}", cookie_attrs())
}

fn clear_refresh_cookie() -> String {
    format!("{REFRESH_COOKIE}=; Max-Age=0{}", cookie_attrs())
}

fn read_refresh_cookie(headers: &HeaderMap) -> Option<String> {
    headers
        .get_all(axum::http::header::COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|v| v.split(';'))
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(k, _)| *k == REFRESH_COOKIE)
        .map(|(_, v)| v.to_string())
        .filter(|v| !v.is_empty())
}

/// Refresh and logout act on a cookie the browser attaches by itself, so
/// they also require a header a cross-site form can't send (any cross-origin
/// script sending it must pass a CORS preflight first).
fn require_csrf_header(headers: &HeaderMap) -> Result<(), ApiError> {
    match headers.get("x-requested-with").and_then(|v| v.to_str().ok()) {
        Some(v) if v.eq_ignore_ascii_case("XMLHttpRequest") => Ok(()),
        _ => Err(api_error(StatusCode::FORBIDDEN, "Missing X-Requested-With header")),
    }
}

/// Refresh token from the cookie, or from a legacy JSON body
/// (`{"refreshToken": ...}`) sent once by clients upgrading from storage.
fn refresh_token_from(headers: &HeaderMap, body: &Bytes) -> Option<String> {
    read_refresh_cookie(headers).or_else(|| {
        serde_json::from_slice::<Value>(body)
            .ok()?
            .get("refreshToken")?
            .as_str()
            .map(str::to_string)
            .filter(|t| !t.is_empty())
    })
}

fn with_cookie(cookie: String, body: Value) -> Response {
    ([(SET_COOKIE, cookie)], Json(body)).into_response()
}

fn server_error<E: std::fmt::Display>(e: E) -> ApiError {
    tracing::error!("auth error: {}", e);
    api_error(StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.")
}

fn normalize_phone(s: &str) -> String {
    s.chars().filter(|c| c.is_ascii_digit() || *c == '+').collect()
}

fn is_valid_email(email: &str) -> bool {
    let mut parts = email.split('@');
    match (parts.next(), parts.next(), parts.next()) {
        (Some(local), Some(domain), None) => {
            !local.is_empty() && domain.contains('.') && !domain.starts_with('.') && !domain.ends_with('.')
        }
        _ => false,
    }
}

/// Exact email match (see `utils::db::email_query` for the migration fallback).
fn email_filter(email: &str) -> Document {
    crate::utils::db::email_query(email)
}

fn identifier_filter(identifier: &str) -> Document {
    let identifier = identifier.trim();
    if identifier.contains('@') {
        email_filter(identifier)
    } else {
        let phone = normalize_phone(identifier);
        doc! { "$or": [ { "mobile": &phone }, { "phone": &phone } ] }
    }
}

/// Public user object returned to the frontend (never includes secrets).
fn public_user(role: Role, d: &Document) -> Value {
    let id = d.get_object_id("_id").map(|o| o.to_hex()).unwrap_or_default();
    let name = d
        .get_str("name")
        .ok()
        .filter(|n| !n.is_empty())
        .unwrap_or(if role == Role::Admin { "Administrator" } else { "" });
    let phone = d.get_str("phone").or_else(|_| d.get_str("mobile")).unwrap_or("");
    json!({
        "id": id,
        // `_id` kept for existing screens that still read it.
        "_id": id,
        "name": name,
        "email": d.get_str("email").unwrap_or(""),
        "phone": phone,
        "role": role.as_str(),
    })
}

/// Checks a password against a stored value. Legacy admin records hold a
/// plain-text password; those are verified once and upgraded to Argon2.
async fn check_password(state: &AppState, role: Role, d: &Document, password: &str) -> bool {
    let stored = d.get_str("password").unwrap_or("");
    if stored.starts_with("$argon2") {
        return verify_password_async(password, stored).await;
    }
    if stored.is_empty() || !constant_time_eq(stored.as_bytes(), password.as_bytes()) {
        return false;
    }
    if let (Ok(id), Ok(hashed)) = (d.get_object_id("_id"), hash_password_async(password).await) {
        let _ = state
            .db
            .collection::<Document>(role.collection())
            .update_one(doc! { "_id": id }, doc! { "$set": { "password": hashed } })
            .await;
    }
    true
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// Creates an access/refresh token pair and records the refresh token hash.
async fn issue_session(
    state: &AppState,
    role: Role,
    d: &Document,
    remember: bool,
) -> Result<(Value, String), ApiError> {
    let id = d.get_object_id("_id").map_err(server_error)?;
    let email = d.get_str("email").unwrap_or("");
    let version = token_version(d);

    let access = create_access_token(&id.to_hex(), email, role.as_str(), version).map_err(server_error)?;
    let refresh = create_refresh_token(&id.to_hex(), email, role.as_str(), remember, version).map_err(server_error)?;

    state
        .db
        .collection::<Document>(role.collection())
        .update_one(
            doc! { "_id": id },
            doc! { "$push": { "refresh_tokens": { "$each": [hash_token(&refresh)], "$slice": -MAX_SESSIONS } } })
        .await
        .map_err(server_error)?;

    let body = json!({
        "success": true,
        "accessToken": access,
        "user": public_user(role, d),
    });
    Ok((body, refresh_cookie(&refresh, remember)))
}

async fn email_taken(state: &AppState, email: &str) -> Result<bool, ApiError> {
    for role in Role::ALL {
        let found = state
            .db
            .collection::<Document>(role.collection())
            .find_one(email_filter(email))
            .await
            .map_err(server_error)?;
        if found.is_some() {
            return Ok(true);
        }
    }
    Ok(false)
}

async fn phone_taken(state: &AppState, phone: &str) -> Result<bool, ApiError> {
    for role in [Role::Patient, Role::Donor] {
        let found = state
            .db
            .collection::<Document>(role.collection())
            .find_one(doc! { "$or": [ { "mobile": phone }, { "phone": phone } ] })
            .await
            .map_err(server_error)?;
        if found.is_some() {
            return Ok(true);
        }
    }
    Ok(false)
}

// ------------------------------------------------------------------- login

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginInput {
    /// Email address or phone number.
    #[serde(alias = "email")]
    pub identifier: String,
    pub password: String,
    #[serde(default)]
    pub remember_me: bool,
}

async fn login(
    State(state): State<AppState>,
    Json(input): Json<LoginInput>,
) -> Result<Response, ApiError> {
    let invalid = || api_error(StatusCode::UNAUTHORIZED, "Invalid email/phone or password");

    if input.identifier.trim().is_empty() || input.password.is_empty() {
        return Err(api_error(StatusCode::BAD_REQUEST, "Email/phone and password are required"));
    }

    if !rate_limit::allow("login", &input.identifier, 10, FIFTEEN_MINUTES) {
        return Err(too_many());
    }

    // Look the identifier up in every role collection at once.
    let filter = identifier_filter(&input.identifier);
    let lookups = Role::ALL.map(|role| {
        let coll = state.db.collection::<Document>(role.collection());
        let filter = filter.clone();
        async move { coll.find_one(filter).await.map(|d| d.map(|d| (role, d))) }
    });
    let found: Vec<(Role, Document)> = futures::future::try_join_all(lookups)
        .await
        .map_err(server_error)?
        .into_iter()
        .flatten()
        .collect();

    if found.is_empty() {
        // Same Argon2 cost as a real account, so timing doesn't reveal which accounts exist.
        let _ = verify_password_async(&input.password, dummy_hash()).await;
        return Err(invalid());
    }
    for (role, d) in found {
        if check_password(&state, role, &d, &input.password).await {
            let (body, cookie) = issue_session(&state, role, &d, input.remember_me).await?;
            return Ok(with_cookie(cookie, body));
        }
    }
    Err(invalid())
}

// ---------------------------------------------------------------- register

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterInput {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub password: String,
    /// "patient" (default) or "donor". Admin accounts cannot self-register.
    #[serde(default)]
    pub account_type: Option<String>,
}

async fn register(
    State(state): State<AppState>,
    Json(input): Json<RegisterInput>,
) -> Result<Response, ApiError> {
    let name = input.name.trim();
    let email = input.email.trim().to_lowercase();
    let phone = normalize_phone(&input.phone);

    let role = match input.account_type.as_deref().map(str::trim) {
        None | Some("") | Some("patient") => Role::Patient,
        Some("donor") => Role::Donor,
        Some(_) => return Err(api_error(StatusCode::BAD_REQUEST, "Invalid account type")),
    };

    if name.len() < 2 || name.len() > 100 {
        return Err(api_error(StatusCode::BAD_REQUEST, "Please enter your full name"));
    }
    if !is_valid_email(&email) {
        return Err(api_error(StatusCode::BAD_REQUEST, "Please enter a valid email address"));
    }
    let digits = phone.chars().filter(|c| c.is_ascii_digit()).count();
    if !(10..=15).contains(&digits) {
        return Err(api_error(StatusCode::BAD_REQUEST, "Please enter a valid phone number"));
    }
    if input.password.len() < 8
        || !input.password.chars().any(|c| c.is_ascii_alphabetic())
        || !input.password.chars().any(|c| c.is_ascii_digit())
    {
        return Err(api_error(
            StatusCode::BAD_REQUEST,
            "Password must be at least 8 characters and include a letter and a number",
        ));
    }
    if email_taken(&state, &email).await? {
        return Err(api_error(StatusCode::CONFLICT, "An account with this email already exists"));
    }
    if phone_taken(&state, &phone).await? {
        return Err(api_error(StatusCode::CONFLICT, "An account with this phone number already exists"));
    }

    let hashed = hash_password_async(&input.password).await.map_err(server_error)?;
    let now = BsonDateTime::now();

    // Profile documents keep the shape the existing dashboards expect;
    // patients and donors complete the remaining fields from their dashboard.
    let new_doc = match role {
        Role::Patient => doc! {
            "name": name, "age": 0, "disease": "", "hospitalname": "", "medicines": [],
            "doctor": "", "date": "", "time": "", "mobile": &phone, "email": &email,
            "password": &hashed, "created_at": now, "gender": "", "relationship": "",
            "birthday": "", "category": "", "aadharno": "", "panno": "", "place": "",
            "street": "", "town": "", "pincode": "", "state": "", "approved": false,
            "image": null, "refresh_tokens": [],
        },
        Role::Donor => doc! {
            "name": name, "age": 0, "employment": "", "place": "", "category": "",
            "birthday": "", "email": &email, "phone": &phone, "password": &hashed,
            "created_at": now, "image": null, "refresh_tokens": [],
        },
        Role::Admin => unreachable!("admins cannot self-register"),
    };

    let coll = state.db.collection::<Document>(role.collection());
    let inserted = coll.insert_one(&new_doc).await.map_err(server_error)?;
    let id = inserted.inserted_id.as_object_id().ok_or_else(|| server_error("missing inserted id"))?;

    let mut saved = new_doc;
    saved.insert("_id", id);
    let (body, cookie) = issue_session(&state, role, &saved, false).await?;
    Ok((StatusCode::CREATED, [(SET_COOKIE, cookie)], Json(body)).into_response())
}

// ----------------------------------------------------------------- refresh

async fn refresh(State(state): State<AppState>, headers: HeaderMap, body: Bytes) -> Response {
    let expired = || {
        let (code, json) = api_error(StatusCode::UNAUTHORIZED, "Session expired. Please log in again.");
        (code, [(SET_COOKIE, clear_refresh_cookie())], json).into_response()
    };
    if let Err(e) = require_csrf_header(&headers) {
        return e.into_response();
    }
    let Some(token) = refresh_token_from(&headers, &body) else { return expired() };
    let Some(claims) = verify_refresh_token(&token) else { return expired() };
    let (Some(role), Ok(id)) = (Role::from_str(&claims.role), ObjectId::parse_str(&claims.sub)) else {
        return expired();
    };
    let coll = state.db.collection::<Document>(role.collection());
    let token_hash = hash_token(&token);

    // Atomically consume the old token (single use).
    let consumed = match coll
        .update_one(doc! { "_id": id, "refresh_tokens": &token_hash }, doc! { "$pull": { "refresh_tokens": &token_hash } })
        .await
    {
        Ok(r) => r,
        Err(e) => return server_error(e).into_response(),
    };
    if consumed.matched_count == 0 {
        // A valid but already-used token: likely stolen. End every session
        // and invalidate outstanding access tokens.
        let _ = coll
            .update_one(doc! { "_id": id }, doc! { "$set": { "refresh_tokens": [] }, "$inc": { "token_version": 1 } })
            .await;
        forget_token_version(role, &claims.sub);
        tracing::warn!("refresh token reuse detected for {} {}", role.as_str(), claims.sub);
        return expired();
    }

    // Re-read the account so a deleted user cannot keep refreshing.
    let d = match coll.find_one(doc! { "_id": id }).await {
        Ok(Some(d)) => d,
        Ok(None) => return expired(),
        Err(e) => return server_error(e).into_response(),
    };
    match issue_session(&state, role, &d, claims.rem).await {
        Ok((body, cookie)) => with_cookie(cookie, body),
        Err(e) => e.into_response(),
    }
}

// ------------------------------------------------------------------ logout

async fn logout(State(state): State<AppState>, headers: HeaderMap, body: Bytes) -> Response {
    if let Err(e) = require_csrf_header(&headers) {
        return e.into_response();
    }
    if let Some(token) = refresh_token_from(&headers, &body) {
        if let Some(claims) = verify_refresh_token(&token) {
            if let (Some(role), Ok(id)) = (Role::from_str(&claims.role), ObjectId::parse_str(&claims.sub)) {
                let _ = state
                    .db
                    .collection::<Document>(role.collection())
                    .update_one(doc! { "_id": id }, doc! { "$pull": { "refresh_tokens": hash_token(&token) } })
                    .await;
            }
        }
    }
    // Logging out always succeeds from the client's point of view.
    with_cookie(clear_refresh_cookie(), json!({ "success": true }))
}

// ---------------------------------------------------------------------- me

async fn me(State(state): State<AppState>, user: AuthUser) -> Result<Json<Value>, ApiError> {
    let id = ObjectId::parse_str(&user.id)
        .map_err(|_| api_error(StatusCode::UNAUTHORIZED, "Invalid token"))?;
    let d = state
        .db
        .collection::<Document>(user.role.collection())
        .find_one(doc! { "_id": id })
        .await
        .map_err(server_error)?
        .ok_or_else(|| api_error(StatusCode::UNAUTHORIZED, "Account no longer exists"))?;
    Ok(Json(json!({ "success": true, "user": public_user(user.role, &d) })))
}

// --------------------------------------------------------- password reset

#[derive(Deserialize)]
pub struct ForgotInput {
    pub email: String,
}

async fn forgot_password(
    State(state): State<AppState>,
    Json(input): Json<ForgotInput>,
) -> Result<Json<Value>, ApiError> {
    // Same response whether or not the account exists (no account enumeration).
    let generic = Json(json!({
        "success": true,
        "message": "If an account exists for this email, a verification code has been sent."
    }));

    if !is_valid_email(input.email.trim()) {
        return Err(api_error(StatusCode::BAD_REQUEST, "Please enter a valid email address"));
    }
    // Throttled per email so the endpoint can't be used to flood an inbox.
    if !rate_limit::allow("forgot", &input.email, 3, FIFTEEN_MINUTES) {
        return Ok(generic);
    }

    for role in Role::ALL {
        let coll = state.db.collection::<Document>(role.collection());
        let found = coll
            .find_one(email_filter(&input.email))
            .await
            .map_err(server_error)?;
        if let Some(d) = found {
            let otp = rand::thread_rng().gen_range(100000..1000000).to_string();
            let expires = BsonDateTime::from_millis(
                chrono::Utc::now().timestamp_millis() + OTP_VALID_MINUTES * 60 * 1000,
            );
            let id = d.get_object_id("_id").map_err(server_error)?;
            coll.update_one(
                doc! { "_id": id },
                doc! { "$set": { "otp_hash": hash_token(&otp), "otp_expires_at": expires, "otp_attempts": 0 } })
            .await
            .map_err(server_error)?;

            if let Err(e) = send_otp_mail(d.get_str("email").unwrap_or(&input.email), &otp).await {
                tracing::error!("failed to send OTP mail: {}", e);
                return Err(api_error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "We could not send the email right now. Please try again later.",
                ));
            }
            return Ok(generic);
        }
    }
    Ok(generic)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetInput {
    pub email: String,
    pub otp: String,
    pub new_password: String,
}

async fn reset_password(
    State(state): State<AppState>,
    Json(input): Json<ResetInput>,
) -> Result<Json<Value>, ApiError> {
    if input.new_password.len() < 8
        || !input.new_password.chars().any(|c| c.is_ascii_alphabetic())
        || !input.new_password.chars().any(|c| c.is_ascii_digit())
    {
        return Err(api_error(
            StatusCode::BAD_REQUEST,
            "Password must be at least 8 characters and include a letter and a number",
        ));
    }

    if !rate_limit::allow("reset", &input.email, 10, FIFTEEN_MINUTES) {
        return Err(too_many());
    }
    let invalid = || api_error(StatusCode::BAD_REQUEST, "The code is invalid or has expired");

    // The account with a live reset code for this email.
    let mut filter = email_filter(&input.email);
    filter.insert("otp_expires_at", doc! { "$gt": BsonDateTime::now() });
    let mut account = None;
    for role in Role::ALL {
        let coll = state.db.collection::<Document>(role.collection());
        if let Some(d) = coll.find_one(filter.clone()).await.map_err(server_error)? {
            account = Some((role, coll, d));
            break;
        }
    }
    let Some((role, coll, d)) = account else { return Err(invalid()) };
    let id = d.get_object_id("_id").map_err(server_error)?;

    let stored = d.get_str("otp_hash").unwrap_or("");
    let given = hash_token(input.otp.trim());
    if stored.is_empty() || !constant_time_eq(stored.as_bytes(), given.as_bytes()) {
        // Count the wrong guess; after a few the code is discarded.
        let attempts = d.get_i32("otp_attempts").unwrap_or(0) + 1;
        let update = if attempts >= OTP_MAX_ATTEMPTS {
            doc! { "$unset": { "otp_hash": "", "otp_expires_at": "", "otp_attempts": "" } }
        } else {
            doc! { "$inc": { "otp_attempts": 1 } }
        };
        coll.update_one(doc! { "_id": id }, update).await.map_err(server_error)?;
        if attempts >= OTP_MAX_ATTEMPTS {
            return Err(api_error(StatusCode::BAD_REQUEST, "Too many wrong codes. Please request a new code."));
        }
        return Err(invalid());
    }

    let hashed = hash_password_async(&input.new_password).await.map_err(server_error)?;
    // Matching on the code again makes the reset single-use under concurrency.
    let result = coll
        .update_one(
            doc! { "_id": id, "otp_hash": stored },
            doc! {
                // A password reset signs the account out everywhere: refresh
                // tokens are dropped and outstanding access tokens rejected.
                "$set": { "password": &hashed, "refresh_tokens": [] },
                "$inc": { "token_version": 1 },
                "$unset": { "otp_hash": "", "otp_expires_at": "", "otp": "", "otp_attempts": "" },
            })
        .await
        .map_err(server_error)?;
    if result.matched_count == 0 {
        return Err(invalid());
    }
    forget_token_version(role, &id.to_hex());
    Ok(Json(json!({ "success": true, "message": "Password updated. You can now log in." })))
}
