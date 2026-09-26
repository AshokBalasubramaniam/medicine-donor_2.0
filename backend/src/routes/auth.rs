//! Unified authentication for every kind of user.
//!
//! One login endpoint serves patients, donors and admins. The client never
//! sends a role: the backend finds the account, and the collection the
//! account is stored in determines the role that is signed into the JWT.

use axum::{
    extract::{Json, State},
    http::StatusCode,
    routing::{get, post},
    Router,
};
use mongodb::bson::{doc, oid::ObjectId, DateTime as BsonDateTime, Document};
use rand::Rng;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::{
    routes::admin::send_otp_mail,
    state::AppState,
    utils::{
        auth::{api_error, ApiError, AuthUser, Role},
        jwt::{create_access_token, create_refresh_token, hash_token, verify_refresh_token},
        password::{hash_password, verify_password},
    },
};

/// Sessions (refresh tokens) kept per account; older ones are dropped.
const MAX_SESSIONS: i32 = 5;
const OTP_VALID_MINUTES: i64 = 10;

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

fn server_error<E: std::fmt::Display>(e: E) -> ApiError {
    tracing::error!("auth error: {}", e);
    api_error(StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.")
}

fn escape_regex(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        if "\\^$.|?*+()[]{}".contains(c) {
            out.push('\\');
        }
        out.push(c);
    }
    out
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

/// Case-insensitive exact email match (older records were stored as typed).
fn email_filter(email: &str) -> Document {
    doc! { "email": { "$regex": format!("^{}$", escape_regex(email.trim())), "$options": "i" } }
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
        return verify_password(password, stored).unwrap_or(false);
    }
    if stored.is_empty() || !constant_time_eq(stored.as_bytes(), password.as_bytes()) {
        return false;
    }
    if let (Ok(id), Ok(hashed)) = (d.get_object_id("_id"), hash_password(password)) {
        let _ = state
            .db
            .collection::<Document>(role.collection())
            .update_one(doc! { "_id": id }, doc! { "$set": { "password": hashed } }, None)
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
) -> Result<Value, ApiError> {
    let id = d.get_object_id("_id").map_err(server_error)?;
    let email = d.get_str("email").unwrap_or("");

    let access = create_access_token(&id.to_hex(), email, role.as_str()).map_err(server_error)?;
    let refresh = create_refresh_token(&id.to_hex(), email, role.as_str(), remember).map_err(server_error)?;

    state
        .db
        .collection::<Document>(role.collection())
        .update_one(
            doc! { "_id": id },
            doc! { "$push": { "refresh_tokens": { "$each": [hash_token(&refresh)], "$slice": -MAX_SESSIONS } } },
            None,
        )
        .await
        .map_err(server_error)?;

    Ok(json!({
        "success": true,
        "accessToken": access,
        "refreshToken": refresh,
        "user": public_user(role, d),
    }))
}

async fn email_taken(state: &AppState, email: &str) -> Result<bool, ApiError> {
    for role in Role::ALL {
        let found = state
            .db
            .collection::<Document>(role.collection())
            .find_one(email_filter(email), None)
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
            .find_one(doc! { "$or": [ { "mobile": phone }, { "phone": phone } ] }, None)
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
) -> Result<Json<Value>, ApiError> {
    let invalid = || api_error(StatusCode::UNAUTHORIZED, "Invalid email/phone or password");

    if input.identifier.trim().is_empty() || input.password.is_empty() {
        return Err(api_error(StatusCode::BAD_REQUEST, "Email/phone and password are required"));
    }

    let filter = identifier_filter(&input.identifier);
    for role in Role::ALL {
        let found = state
            .db
            .collection::<Document>(role.collection())
            .find_one(filter.clone(), None)
            .await
            .map_err(server_error)?;

        if let Some(d) = found {
            if check_password(&state, role, &d, &input.password).await {
                return issue_session(&state, role, &d, input.remember_me).await.map(Json);
            }
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
) -> Result<(StatusCode, Json<Value>), ApiError> {
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

    let hashed = hash_password(&input.password).map_err(server_error)?;
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
    let inserted = coll.insert_one(&new_doc, None).await.map_err(server_error)?;
    let id = inserted.inserted_id.as_object_id().ok_or_else(|| server_error("missing inserted id"))?;

    let mut saved = new_doc;
    saved.insert("_id", id);
    let body = issue_session(&state, role, &saved, false).await?;
    Ok((StatusCode::CREATED, Json(body)))
}

// ----------------------------------------------------------------- refresh

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshInput {
    pub refresh_token: String,
}

/// Rotates the refresh token. A valid-looking token that is no longer on
/// record means it was already used (possible theft), so every session of
/// that account is revoked.
async fn refresh(
    State(state): State<AppState>,
    Json(input): Json<RefreshInput>,
) -> Result<Json<Value>, ApiError> {
    let expired = || api_error(StatusCode::UNAUTHORIZED, "Session expired. Please log in again.");

    let claims = verify_refresh_token(&input.refresh_token).ok_or_else(expired)?;
    let role = Role::from_str(&claims.role).ok_or_else(expired)?;
    let id = ObjectId::parse_str(&claims.sub).map_err(|_| expired())?;
    let coll = state.db.collection::<Document>(role.collection());
    let token_hash = hash_token(&input.refresh_token);

    // Atomically consume the old token.
    let consumed = coll
        .update_one(
            doc! { "_id": id, "refresh_tokens": &token_hash },
            doc! { "$pull": { "refresh_tokens": &token_hash } },
            None,
        )
        .await
        .map_err(server_error)?;

    if consumed.matched_count == 0 {
        let _ = coll
            .update_one(doc! { "_id": id }, doc! { "$set": { "refresh_tokens": [] } }, None)
            .await;
        return Err(expired());
    }

    // Re-read the account so a deleted user cannot keep refreshing.
    let d = coll
        .find_one(doc! { "_id": id }, None)
        .await
        .map_err(server_error)?
        .ok_or_else(expired)?;

    issue_session(&state, role, &d, claims.rem).await.map(Json)
}

// ------------------------------------------------------------------ logout

async fn logout(
    State(state): State<AppState>,
    Json(input): Json<RefreshInput>,
) -> Json<Value> {
    if let Some(claims) = verify_refresh_token(&input.refresh_token) {
        if let (Some(role), Ok(id)) = (Role::from_str(&claims.role), ObjectId::parse_str(&claims.sub)) {
            let _ = state
                .db
                .collection::<Document>(role.collection())
                .update_one(
                    doc! { "_id": id },
                    doc! { "$pull": { "refresh_tokens": hash_token(&input.refresh_token) } },
                    None,
                )
                .await;
        }
    }
    // Logging out always succeeds from the client's point of view.
    Json(json!({ "success": true }))
}

// ---------------------------------------------------------------------- me

async fn me(State(state): State<AppState>, user: AuthUser) -> Result<Json<Value>, ApiError> {
    let id = ObjectId::parse_str(&user.id)
        .map_err(|_| api_error(StatusCode::UNAUTHORIZED, "Invalid token"))?;
    let d = state
        .db
        .collection::<Document>(user.role.collection())
        .find_one(doc! { "_id": id }, None)
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

    for role in Role::ALL {
        let coll = state.db.collection::<Document>(role.collection());
        let found = coll
            .find_one(email_filter(&input.email), None)
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
                doc! { "$set": { "otp_hash": hash_token(&otp), "otp_expires_at": expires } },
                None,
            )
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

    let hashed = hash_password(&input.new_password).map_err(server_error)?;
    let mut filter = email_filter(&input.email);
    filter.insert("otp_hash", hash_token(input.otp.trim()));
    filter.insert("otp_expires_at", doc! { "$gt": BsonDateTime::now() });

    for role in Role::ALL {
        let result = state
            .db
            .collection::<Document>(role.collection())
            .update_one(
                filter.clone(),
                doc! {
                    // A password reset also signs the account out everywhere.
                    "$set": { "password": &hashed, "refresh_tokens": [] },
                    "$unset": { "otp_hash": "", "otp_expires_at": "", "otp": "" },
                },
                None,
            )
            .await
            .map_err(server_error)?;
        if result.matched_count > 0 {
            return Ok(Json(json!({ "success": true, "message": "Password updated. You can now log in." })));
        }
    }
    Err(api_error(StatusCode::BAD_REQUEST, "The code is invalid or has expired"))
}
