use crate::state::AppState;
use crate::utils::auth::{AuthUser, Role};
use axum::{extract::State, http::StatusCode, Json};
use futures::StreamExt;
use mongodb::bson::{doc, Bson, Document};
use mongodb::Collection;
use serde_json::json;

/// Patient list for admins (management) and donors (browsing who needs help).
pub async fn get_all_patientsdetails(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    user.require(&[Role::Admin, Role::Donor])?;

    let coll: Collection<mongodb::bson::Document> = state.db.collection("patients");

    if user.role == Role::Donor {
        return donor_view(&coll).await.map(Json);
    }

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

/// Fields a donor may see. Identity documents, contact details and the full
/// address stay private; donors only get what they need to decide and donate.
const DONOR_FIELDS: [&str; 16] = [
    "name", "age", "gender", "disease", "severity", "treatment_status", "hospitalname",
    "town", "state", "medicines", "prescription", "estimated_cost", "image", "created_at",
    "amount", "diagnosis_date",
];

fn as_f64(v: Option<&Bson>) -> f64 {
    match v {
        Some(Bson::Double(n)) => *n,
        Some(Bson::Int32(n)) => *n as f64,
        Some(Bson::Int64(n)) => *n as f64,
        Some(Bson::String(s)) => s.trim().parse().unwrap_or(0.0),
        _ => 0.0,
    }
}

/// Approved, open cases only, with the amounts already worked out.
async fn donor_view(
    coll: &Collection<Document>,
) -> Result<serde_json::Value, (StatusCode, Json<serde_json::Value>)> {
    let db_err = |e: mongodb::error::Error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("DB error: {}", e)})),
        )
    };
    let mut cursor = coll
        .find(doc! { "approved": true, "rejected": { "$ne": true } }, None)
        .await
        .map_err(db_err)?;

    let mut patients = vec![];
    while let Some(result) = cursor.next().await {
        let doc = result.map_err(db_err)?;
        let amount = as_f64(doc.get("amount"));
        let paid = as_f64(doc.get("paid_amount"));
        let balance = (amount - paid).max(0.0);
        if amount < 1.0 || balance <= 0.0 {
            continue;
        }

        let mut out = Document::new();
        for key in DONOR_FIELDS {
            if let Some(v) = doc.get(key) {
                out.insert(key, v.clone());
            }
        }
        out.insert("amount", amount);
        out.insert("paid_amount", paid);
        out.insert("balance_amount", balance);

        let mut value = Bson::Document(out).into_relaxed_extjson();
        if let Ok(oid) = doc.get_object_id("_id") {
            value["id"] = json!(oid.to_hex());
        }
        patients.push(value);
    }
    Ok(serde_json::Value::Array(patients))
}
