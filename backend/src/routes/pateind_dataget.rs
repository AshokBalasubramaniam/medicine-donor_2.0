use axum::{extract::State, http::StatusCode, Json};
use mongodb::bson::{doc, oid::ObjectId};
use serde_json::json;

use crate::models::patient::Patient;
use crate::state::AppState;
use crate::utils::auth::{AuthUser, Role};

pub async fn get_patient_details(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    user.require(&[Role::Patient])?;
    let user_id = user.id;

    // Parse user_id as ObjectId
    let obj_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid user id in token"})),
        )
    })?;


    // Get MongoDB collection
    let coll = state.db.collection::<Patient>("patients");

    // Find patient by _id
    let patient = coll
        .find_one(doc! { "_id": obj_id }, None)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("DB error: {}", e)})),
            )
        })?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Patient not found"})),
        ))?;

    let user_resp = json!({
        "id": patient.id.map(|oid| oid.to_hex()),
        "name": patient.name,
        "email": patient.email,
        "age": patient.age,
        "mobile": patient.mobile,
        "hospitalname": patient.hospitalname,
        "doctor": patient.doctor,
        "date": patient.date,
        "time": patient.time,
        "disease": patient.disease,
        "approved": patient.approved,
        "medicines": patient.medicines,
        "created_at": patient.created_at,
        "aadharno":patient.aadharno,
        "panno":patient.panno,
        "relationship":patient.relationship,
        "gender":patient.gender,
         "image": patient.image,
    });
 

    Ok(Json(user_resp))
}
