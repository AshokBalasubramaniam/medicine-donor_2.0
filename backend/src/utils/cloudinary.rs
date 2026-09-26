//! Image uploads to Cloudinary (signed uploads, no SDK needed).
//!
//! Configure with either
//!   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
//! or the three variables CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY /
//! CLOUDINARY_API_SECRET. CLOUDINARY_FOLDER (default "medicine-donor")
//! sets the root folder. CLOUDINARY_API_BASE overrides the API host (tests).

use axum::http::StatusCode;
use base64::Engine;
use serde::Deserialize;
use sha1::{Digest, Sha1};
use std::sync::OnceLock;

use crate::utils::auth::{api_error, ApiError};

pub const MAX_IMAGE_BYTES: usize = 5 * 1024 * 1024;
/// Request body limit for routes that accept an image plus form fields.
pub const UPLOAD_BODY_LIMIT: usize = MAX_IMAGE_BYTES + 1024 * 1024;

pub struct UploadedImage {
    pub url: String,
    pub public_id: String,
}

struct Config {
    cloud_name: String,
    api_key: String,
    api_secret: String,
    folder: String,
}

fn config() -> Option<Config> {
    let non_empty = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
    let folder = non_empty("CLOUDINARY_FOLDER").unwrap_or_else(|| "medicine-donor".into());

    if let Some(url) = non_empty("CLOUDINARY_URL") {
        // cloudinary://key:secret@cloud
        let rest = url.trim().strip_prefix("cloudinary://")?;
        let (creds, cloud) = rest.split_once('@')?;
        let (key, secret) = creds.split_once(':')?;
        return Some(Config {
            cloud_name: cloud.trim_end_matches('/').to_string(),
            api_key: key.to_string(),
            api_secret: secret.to_string(),
            folder,
        });
    }
    Some(Config {
        cloud_name: non_empty("CLOUDINARY_CLOUD_NAME")?,
        api_key: non_empty("CLOUDINARY_API_KEY")?,
        api_secret: non_empty("CLOUDINARY_API_SECRET")?,
        folder,
    })
}

/// Detects the image type from its first bytes (the file name / declared
/// content type from the browser are not trusted).
fn sniff_image(bytes: &[u8]) -> Option<&'static str> {
    match bytes {
        [0xFF, 0xD8, 0xFF, ..] => Some("image/jpeg"),
        [0x89, b'P', b'N', b'G', ..] => Some("image/png"),
        [b'G', b'I', b'F', b'8', ..] => Some("image/gif"),
        [b'R', b'I', b'F', b'F', _, _, _, _, b'W', b'E', b'B', b'P', ..] => Some("image/webp"),
        _ => None,
    }
}

fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("http client")
    })
}

#[derive(Deserialize)]
struct UploadResponse {
    secure_url: String,
    public_id: String,
}

#[derive(Deserialize)]
struct ErrorResponse {
    error: ErrorMessage,
}

#[derive(Deserialize)]
struct ErrorMessage {
    message: String,
}

/// Validates and uploads an image. `subfolder` is e.g. "patients" and
/// `name` a stable id (e.g. the patient id) so a new upload replaces the
/// old image instead of piling up files.
pub async fn upload_image(bytes: &[u8], subfolder: &str, name: &str) -> Result<UploadedImage, ApiError> {
    if bytes.is_empty() {
        return Err(api_error(StatusCode::BAD_REQUEST, "The selected image is empty"));
    }
    if bytes.len() > MAX_IMAGE_BYTES {
        return Err(api_error(StatusCode::PAYLOAD_TOO_LARGE, "Image must be smaller than 5 MB"));
    }
    let mime = sniff_image(bytes).ok_or_else(|| {
        api_error(StatusCode::BAD_REQUEST, "Please upload a JPG, PNG, WEBP or GIF image")
    })?;
    let cfg = config().ok_or_else(|| {
        tracing::error!("image upload attempted but Cloudinary is not configured");
        api_error(StatusCode::SERVICE_UNAVAILABLE, "Image uploads are not configured on the server")
    })?;

    let folder = format!("{}/{}", cfg.folder.trim_matches('/'), subfolder);
    let timestamp = chrono::Utc::now().timestamp().to_string();

    // Signature: parameters sorted alphabetically, joined, + API secret, SHA-1.
    let to_sign = format!(
        "folder={folder}&invalidate=true&overwrite=true&public_id={name}&timestamp={timestamp}{}",
        cfg.api_secret
    );
    let signature = hex::encode(Sha1::digest(to_sign.as_bytes()));
    let data_uri = format!(
        "data:{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    );

    let api_base = std::env::var("CLOUDINARY_API_BASE").unwrap_or_else(|_| "https://api.cloudinary.com".into());
    let url = format!("{}/v1_1/{}/image/upload", api_base.trim_end_matches('/'), cfg.cloud_name);
    let resp = client()
        .post(url)
        .form(&[
            ("file", data_uri.as_str()),
            ("api_key", cfg.api_key.as_str()),
            ("timestamp", timestamp.as_str()),
            ("folder", folder.as_str()),
            ("public_id", name),
            ("overwrite", "true"),
            ("invalidate", "true"),
            ("signature", signature.as_str()),
        ])
        .send()
        .await
        .map_err(|e| {
            tracing::error!("cloudinary request failed: {}", e);
            api_error(StatusCode::BAD_GATEWAY, "Could not reach the image service. Please try again.")
        })?;

    if !resp.status().is_success() {
        let status = resp.status();
        let message = resp
            .json::<ErrorResponse>()
            .await
            .map(|e| e.error.message)
            .unwrap_or_default();
        tracing::error!("cloudinary upload rejected ({}): {}", status, message);
        return Err(api_error(StatusCode::BAD_GATEWAY, "The image could not be uploaded. Please try again."));
    }

    let body: UploadResponse = resp.json().await.map_err(|e| {
        tracing::error!("cloudinary response parse error: {}", e);
        api_error(StatusCode::BAD_GATEWAY, "The image could not be uploaded. Please try again.")
    })?;
    Ok(UploadedImage { url: body.secure_url, public_id: body.public_id })
}
