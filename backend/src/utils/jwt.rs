use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, errors::Result as JwtResult, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// Access tokens are short-lived; the frontend silently refreshes them.
pub const ACCESS_TOKEN_MINUTES: i64 = 15;
/// Refresh token lifetime without / with "remember me".
pub const REFRESH_TOKEN_DAYS: i64 = 1;
pub const REFRESH_TOKEN_DAYS_REMEMBER: i64 = 30;

pub const TOKEN_TYPE_ACCESS: &str = "access";
pub const TOKEN_TYPE_REFRESH: &str = "refresh";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // user id (the _id of the user's document in its role collection)
    pub email: String,
    /// Role issued by the backend at login time, read from the database.
    #[serde(default)]
    pub role: String,
    /// "access" or "refresh". Tokens without it are rejected by the auth guard.
    #[serde(default)]
    pub typ: String,
    /// Unique id so every refresh token is distinct (used for rotation).
    #[serde(default)]
    pub jti: String,
    /// Whether the session was created with "remember me" (refresh tokens only).
    #[serde(default)]
    pub rem: bool,
    /// The account's `token_version` when the token was issued. Bumping it
    /// (password reset, session-theft detection) invalidates every
    /// outstanding access token immediately.
    #[serde(default)]
    pub tv: i64,
    pub exp: usize,
    pub iat: usize,
}

static SECRETS: std::sync::OnceLock<(String, String)> = std::sync::OnceLock::new();

/// Reads the signing secrets once at startup. Refuses to run without strong
/// secrets: a guessable secret would let anyone forge admin tokens.
pub fn init_secrets() -> anyhow::Result<()> {
    let read = |key: &str| -> anyhow::Result<String> {
        let v = std::env::var(key).unwrap_or_default();
        if v.trim().len() < 32 {
            anyhow::bail!("{key} must be set to a random value of at least 32 characters (see .env.example)");
        }
        Ok(v)
    };
    let access = read("JWT_SECRET")?;
    let refresh = read("JWT_REFRESH_SECRET")?;
    if access == refresh {
        anyhow::bail!("JWT_SECRET and JWT_REFRESH_SECRET must be different");
    }
    let _ = SECRETS.set((access, refresh));
    Ok(())
}

fn secrets() -> &'static (String, String) {
    SECRETS.get().expect("jwt::init_secrets() must run at startup")
}

fn access_secret() -> &'static str {
    &secrets().0
}

fn refresh_secret() -> &'static str {
    &secrets().1
}

fn sign(claims: &Claims, secret: &str) -> JwtResult<String> {
    encode(&Header::default(), claims, &EncodingKey::from_secret(secret.as_bytes()))
}

fn verify(token: &str, secret: &str) -> JwtResult<Claims> {
    decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default())
        .map(|data| data.claims)
}

pub fn create_access_token(user_id: &str, email: &str, role: &str, token_version: i64) -> JwtResult<String> {
    let now = Utc::now();
    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        typ: TOKEN_TYPE_ACCESS.to_string(),
        jti: uuid::Uuid::new_v4().to_string(),
        rem: false,
        tv: token_version,
        exp: (now + Duration::minutes(ACCESS_TOKEN_MINUTES)).timestamp() as usize,
        iat: now.timestamp() as usize,
    };
    sign(&claims, access_secret())
}

pub fn create_refresh_token(user_id: &str, email: &str, role: &str, remember: bool, token_version: i64) -> JwtResult<String> {
    let now = Utc::now();
    let days = if remember { REFRESH_TOKEN_DAYS_REMEMBER } else { REFRESH_TOKEN_DAYS };
    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        typ: TOKEN_TYPE_REFRESH.to_string(),
        jti: uuid::Uuid::new_v4().to_string(),
        rem: remember,
        tv: token_version,
        exp: (now + Duration::days(days)).timestamp() as usize,
        iat: now.timestamp() as usize,
    };
    sign(&claims, refresh_secret())
}

/// Verifies an access token (signature, expiry and token type).
pub fn verify_access_token(token: &str) -> Option<Claims> {
    verify(token, access_secret()).ok().filter(|c| c.typ == TOKEN_TYPE_ACCESS)
}

/// Verifies a refresh token (signature, expiry and token type).
pub fn verify_refresh_token(token: &str) -> Option<Claims> {
    verify(token, refresh_secret()).ok().filter(|c| c.typ == TOKEN_TYPE_REFRESH)
}

/// Refresh tokens are stored hashed so a database leak does not leak sessions.
pub fn hash_token(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}
