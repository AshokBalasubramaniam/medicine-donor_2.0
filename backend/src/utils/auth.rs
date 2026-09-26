use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
    Json,
};
use serde_json::{json, Value};

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
    pub email: String,
    pub role: Role,
}

impl AuthUser {
    pub fn from_claims(claims: Claims) -> Option<Self> {
        Some(AuthUser {
            role: Role::from_str(&claims.role)?,
            id: claims.sub,
            email: claims.email,
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

        verify_access_token(token)
            .and_then(AuthUser::from_claims)
            .ok_or_else(|| api_error(StatusCode::UNAUTHORIZED, "Invalid or expired token"))
    }
}
