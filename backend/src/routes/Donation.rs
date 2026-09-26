use crate::{models::Donation::Donation};
use crate::state::{get_db, AppState};
use axum::{
    extract::State,
    http::StatusCode,
    routing::get,
    Json, Router,
};
use mongodb::{
    bson::{doc, oid::ObjectId},
    options::UpdateOptions,
    Database,
};                                                    
use anyhow::Result;
use serde_json::json;
use futures::TryStreamExt;
use crate::utils::auth::{AuthUser, Role};

// ======================= ROUTES ============================
pub fn donation_routes(state: AppState) -> Router {
    Router::new()
        .route("/getdonation", get(get_donations))
        .with_state(state)
}

// ======================= SAVE DONATION =====================
pub async fn save_donation(
    donor_name: &str,
    donor_id: &str,
    patient_name: &str,
    patient_id: &str,
    payment_id: &str,
    amount: i64,
) -> Result<()> {
    let db: Database = get_db().await?;
    let coll = db.collection::<Donation>("donations");

    let donor_obj = ObjectId::parse_str(donor_id)?;
    let patient_obj = ObjectId::parse_str(patient_id)?;

    coll.update_one(
        doc! {
            "donor_id": &donor_obj,
            "patient_id": &patient_obj
        },
        doc! {
            "$set": {
                "donor_name": donor_name,
                "patient_name": patient_name,
                "payment_id": payment_id,
            },
            "$setOnInsert": { "amount": [amount] },
            "$push": { "amount": { "$each": [amount] } }
        },
        UpdateOptions::builder().upsert(true).build(),
    )
    .await?;

    println!("✅ Donation saved: donor={} patient={} amount={}", donor_name, patient_name, amount);
    Ok(())
}

// ======================= GET DONATIONS ====================


use mongodb::{Collection};
use futures::StreamExt;
pub async fn get_donations(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    user.require(&[Role::Admin])?;

    // 2️⃣ Get MongoDB collection as Document
    let coll: Collection<mongodb::bson::Document> = state.db.collection("p");

    // 3️⃣ Fetch all patients
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

        // 🔑 Replace `_id` with string `id`
        if let Some(oid) = doc.get_object_id("_id").ok() {
            if let Some(obj) = patient_json.as_object_mut() {
                obj.insert("id".to_string(), json!(oid.to_hex()));
                obj.remove("_id");
            }
        }

        patients.push(patient_json);
    }


    Ok(Json(serde_json::Value::Array(patients)))
}
