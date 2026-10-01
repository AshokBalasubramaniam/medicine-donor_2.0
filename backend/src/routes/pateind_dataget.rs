use axum::{extract::State, http::StatusCode, Json};
use mongodb::bson::{doc, oid::ObjectId, Bson, Document};
use serde_json::json;

use crate::state::AppState;
use crate::utils::strip_secrets;
use crate::utils::auth::{AuthUser, Role};


pub async fn get_patient_details(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    user.require(&[Role::Patient])?;

    let obj_id = ObjectId::parse_str(&user.id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid user id in token"})),
        )
    })?;

    // Read the raw document so profile, medical and admin-managed fields
    // (amount, paid_amount, rejected, ...) are all returned as stored.
    let mut patient = state
        .db
        .collection::<Document>("patients")
        .find_one(doc! { "_id": obj_id })
        .await
        .map_err(|e| {
            tracing::error!("patient profile lookup failed: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Something went wrong. Please try again."})),
            )
        })?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Patient not found"})),
        ))?;

    strip_secrets(&mut patient);
    patient.remove("_id");

    let mut resp = Bson::Document(patient).into_relaxed_extjson();
    resp["id"] = json!(obj_id.to_hex());
    Ok(Json(resp))
}
