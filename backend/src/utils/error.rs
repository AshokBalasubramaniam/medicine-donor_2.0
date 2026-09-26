use axum::{http::StatusCode, Json};
use serde_json::json;

pub fn internal_err<E: std::fmt::Display>(e: E) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": e.to_string() })),
    )
}
