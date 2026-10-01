use argon2::password_hash::{rand_core::OsRng, PasswordHash, SaltString};
use argon2::{Argon2, PasswordHasher, PasswordVerifier};

pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)?
        .to_string();
    Ok(hash)
}

// NOTE: first parameter is plain password, second is stored hashed string
pub fn verify_password(password: &str, hash: &str) -> Result<bool, argon2::password_hash::Error> {
    let parsed_hash = PasswordHash::new(hash)?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

/// Argon2 is deliberately slow (tens of ms of CPU); run it off the async
/// runtime so one login doesn't stall every other request on that thread.
pub async fn hash_password_async(password: &str) -> anyhow::Result<String> {
    let password = password.to_owned();
    tokio::task::spawn_blocking(move || hash_password(&password))
        .await?
        .map_err(|e| anyhow::anyhow!("hashing failed: {e}"))
}

pub async fn verify_password_async(password: &str, hash: &str) -> bool {
    let (password, hash) = (password.to_owned(), hash.to_owned());
    tokio::task::spawn_blocking(move || verify_password(&password, &hash).unwrap_or(false))
        .await
        .unwrap_or(false)
}

/// A valid Argon2 hash of a random password, used to spend the same time on
/// unknown accounts as on real ones (so timing doesn't reveal which exist).
pub fn dummy_hash() -> &'static str {
    static DUMMY: std::sync::OnceLock<String> = std::sync::OnceLock::new();
    DUMMY.get_or_init(|| hash_password(&uuid::Uuid::new_v4().to_string()).unwrap_or_default())
}
