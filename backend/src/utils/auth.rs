use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
    Json,
};
use mongodb::bson::{doc, oid::ObjectId, Document};
use mongodb::options::FindOneOptions;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::state::get_db;
use crate::utils::jwt::{verify_access_token, Claims};

pub type ApiError = (StatusCode, Json<Value>);

pub fn api_error(status: StatusCode, message: &str) -> ApiError {
    (status, Json(json!({ "success": false, "error": message })))
}

/// Every role maps to the collection that stores that kind of account.
/// The collection a user's document lives in is the source of truth for their role.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    Patient,
    Donor,
    Admin,
}

impl Role {
    /// Lookup order at login. Admin first so an admin account can never be
    /// shadowed by a self-registered account with the same email.
    pub const ALL: [Role; 3] = [Role::Admin, Role::Patient, Role::Donor];

    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Patient => "patient",
            Role::Donor => "donor",
            Role::Admin => "admin",
        }
    }

    pub fn from_str(s: &str) -> Option<Role> {
        match s {
            "patient" => Some(Role::Patient),
            "donor" => Some(Role::Donor),
            "admin" => Some(Role::Admin),
            _ => None,
        }
    }

    pub fn collection(&self) -> &'static str {
        match self {
            Role::Patient => "patients",
            Role::Donor => "donors",
            Role::Admin => "adminpage",
        }
    }
}

/// Authenticated caller, extracted from a valid `Authorization: Bearer <access token>`.
/// Add it as a handler argument to require authentication, then call
/// [`AuthUser::require`] to restrict the handler to specific roles.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: String,
    pub role: Role,
}

impl AuthUser {
    pub fn from_claims(claims: Claims) -> Option<Self> {
        Some(AuthUser {
            role: Role::from_str(&claims.role)?,
            id: claims.sub,
        })
    }

    /// Returns 403 unless the caller has one of the allowed roles.
    pub fn require(&self, allowed: &[Role]) -> Result<(), ApiError> {
        if allowed.contains(&self.role) {
            Ok(())
        } else {
            Err(api_error(
                StatusCode::FORBIDDEN,
                "You do not have permission to access this resource",
            ))
        }
    }
}

#[async_trait]
impl<S: Send + Sync> FromRequestParts<S> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or_else(|| api_error(StatusCode::UNAUTHORIZED, "Missing or invalid Authorization header"))?;

        let invalid = || api_error(StatusCode::UNAUTHORIZED, "Invalid or expired token");
        let claims = verify_access_token(token).ok_or_else(invalid)?;
        let version = claims.tv;
        let user = AuthUser::from_claims(claims).ok_or_else(invalid)?;

        // A token issued before the account's latest password reset (or
        // session revocation) is rejected, as is one for a deleted account.
        match current_token_version(user.role, &user.id).await {
            Some(current) if current == version => Ok(user),
            Some(_) => Err(api_error(StatusCode::UNAUTHORIZED, "Session expired. Please log in again.")),
            None => Err(invalid()),
        }
    }
}

// ------------------------------------------------------ token version cache

/// How long a looked-up `token_version` is trusted. Revocations made by this
/// server take effect at once (the entry is dropped); ones made by another
/// instance take effect within this window.
const VERSION_TTL: Duration = Duration::from_secs(30);

static VERSIONS: Mutex<Option<HashMap<String, (i64, Instant)>>> = Mutex::new(None);

/// Reads `token_version` (missing = 0) whether stored as int32 or int64.
pub fn token_version(d: &Document) -> i64 {
    d.get_i64("token_version")
        .or_else(|_| d.get_i32("token_version").map(i64::from))
        .unwrap_or(0)
}

/// The account's current token version, or `None` if the account is gone.
async fn current_token_version(role: Role, id: &str) -> Option<i64> {
    let key = format!("{}:{id}", role.as_str());
    {
        let guard = VERSIONS.lock().unwrap_or_else(|e| e.into_inner());
        if let Some((v, at)) = guard.as_ref().and_then(|m| m.get(&key)) {
            if at.elapsed() < VERSION_TTL {
                return Some(*v);
            }
        }
    }
    let oid = ObjectId::parse_str(id).ok()?;
    let db = get_db().await.ok()?;
    let found = db
        .collection::<Document>(role.collection())
        .find_one(doc! { "_id": oid })
        .with_options(FindOneOptions::builder().projection(doc! { "token_version": 1 }).build())
        .await;
    let d = match found {
        Ok(d) => d?,
        Err(e) => {
            tracing::error!("token version lookup failed: {e}");
            return None;
        }
    };
    let v = token_version(&d);
    let mut guard = VERSIONS.lock().unwrap_or_else(|e| e.into_inner());
    let map = guard.get_or_insert_with(HashMap::new);
    if map.len() > 50_000 {
        map.clear();
    }
    map.insert(key, (v, Instant::now()));
    Some(v)
}

/// Drop the cached version after bumping it, so this server rejects old
/// tokens immediately.
pub fn forget_token_version(role: Role, id: &str) {
    let mut guard = VERSIONS.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(map) = guard.as_mut() {
        map.remove(&format!("{}:{id}", role.as_str()));
    }
}
