use crate::state::AppState;
use crate::utils::auth::{AuthUser, Role};
use axum::{extract::State, http::StatusCode, Json};
use futures::StreamExt;
use mongodb::Collection;
use serde_json::json;

/// Patient list for admins (management) and donors (browsing who needs help).
pub async fn get_all_patientsdetails(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    user.require(&[Role::Admin, Role::Donor])?;

    let coll: Collection<mongodb::bson::Document> = state.db.collection("patients");

    let mut cursor = coll.find(None, None).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("DB error: {}", e)})),
        )
    })?;

    let mut patients = vec![];

    while let Some(result) = cursor.next().await {
        let doc = result.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Cursor error: {}", e)})),
            )
        })?;

        // Convert BSON doc → JSON value
        let mut patient_json = serde_json::to_value(&doc).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Serialization error: {}", e)})),
            )
        })?;

        if let Some(obj) = patient_json.as_object_mut() {
            // Never expose credentials or session data.
            for secret in ["password", "refresh_tokens", "otp", "otp_hash", "otp_expires_at"] {
                obj.remove(secret);
            }
            // 🔑 Replace `_id` with string `id`
            if let Ok(oid) = doc.get_object_id("_id") {
                obj.insert("id".to_string(), json!(oid.to_hex()));
                obj.remove("_id");
            }
        }

        patients.push(patient_json);
    }

    Ok(Json(serde_json::Value::Array(patients)))
}
