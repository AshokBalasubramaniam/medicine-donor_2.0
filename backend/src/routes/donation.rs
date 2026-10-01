use axum::{extract::State, http::StatusCode, routing::get, Json, Router};
use futures::StreamExt;
use mongodb::{
    bson::{doc, oid::ObjectId, Bson, DateTime, Document},
    options::UpdateOptions,
    Collection, Database,
};
use serde_json::json;

use crate::state::AppState;
use crate::utils::auth::{AuthUser, Role};

// ======================= ROUTES ============================
pub fn donation_routes(state: AppState) -> Router {
    Router::new()
        .route("/getdonation", get(get_donations))
        .route("/donor/mydonations", get(get_my_donations))
        .with_state(state)
}

// ======================= SAVE DONATION =====================

/// Records one confirmed payment: one document per donor/patient pair, with
/// every payment kept in `payments`.
pub async fn save_donation(
    db: &Database,
    donor_name: &str,
    donor_id: ObjectId,
    patient_name: &str,
    patient_id: ObjectId,
    payment_id: &str,
    amount: i64,
) -> mongodb::error::Result<()> {
    db.collection::<Document>("donations")
        .update_one(
            doc! { "donor_id": donor_id, "patient_id": patient_id },
            doc! {
                "$set": {
                    "donor_name": donor_name,
                    "patient_name": patient_name,
                    "payment_id": payment_id,
                },
                // `$push` creates the arrays on insert, so no `$setOnInsert` for them
                // (setting and pushing the same path in one update is rejected).
                "$push": {
                    "amount": amount,
                    "payments": { "amount": amount, "payment_id": payment_id, "paid_at": DateTime::now() },
                },
            }).with_options(UpdateOptions::builder().upsert(true).build())
        .await?;
    tracing::info!("donation saved: donor={donor_id} patient={patient_id} amount={amount}");
    Ok(())
}

// ======================= GET DONATIONS ====================

pub async fn get_donations(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    user.require(&[Role::Admin])?;
    let db_err = |e: mongodb::error::Error| {
        tracing::error!("donations query failed: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Something went wrong. Please try again."})),
        )
    };

    // One row per payment, newest first. Older records without a `payments`
    // list fall back to their `amount` entries (no dates).
    let coll: Collection<Document> = state.db.collection("donations");
    let mut cursor = coll.find(doc! {}).await.map_err(db_err)?;
    let mut rows = vec![];
    while let Some(result) = cursor.next().await {
        let d = result.map_err(db_err)?;
        let base = json!({
            "donor_id": d.get_object_id("donor_id").map(|o| o.to_hex()).unwrap_or_default(),
            "donor_name": d.get_str("donor_name").unwrap_or(""),
            "patient_id": d.get_object_id("patient_id").map(|o| o.to_hex()).unwrap_or_default(),
            "patient_name": d.get_str("patient_name").unwrap_or(""),
        });
        let push = |rows: &mut Vec<serde_json::Value>, amount: serde_json::Value, payment_id: &str, paid_at: Option<i64>| {
            let mut row = base.clone();
            row["amount"] = amount;
            row["payment_id"] = json!(payment_id);
            row["paid_at"] = json!(paid_at);
            rows.push(row);
        };
        match d.get_array("payments") {
            Ok(list) => {
                for p in list.iter().filter_map(|p| p.as_document()) {
                    push(
                        &mut rows,
                        p.get("amount").cloned().map(Bson::into_relaxed_extjson).unwrap_or(json!(0)),
                        p.get_str("payment_id").unwrap_or(""),
                        p.get_datetime("paid_at").ok().map(|t| t.timestamp_millis()),
                    );
                }
            }
            Err(_) => {
                for a in d.get_array("amount").map(|a| a.to_vec()).unwrap_or_default() {
                    push(&mut rows, a.into_relaxed_extjson(), d.get_str("payment_id").unwrap_or(""), None);
                }
            }
        }
    }
    rows.sort_by_key(|r| std::cmp::Reverse(r["paid_at"].as_i64().unwrap_or(0)));
    Ok(Json(serde_json::Value::Array(rows)))
}

// ======================= DONOR: MY DONATIONS ==============

/// The signed-in donor's donations, one entry per patient, newest first.
pub async fn get_my_donations(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    user.require(&[Role::Donor])?;
    let donor_id = ObjectId::parse_str(&user.id).map_err(|_| {
        (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user id in token"})))
    })?;
    let db_err = |e: mongodb::error::Error| {
        tracing::error!("donations query failed: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Something went wrong. Please try again."})),
        )
    };

    let coll: Collection<Document> = state.db.collection("donations");
    let mut cursor = coll.find(doc! { "donor_id": donor_id }).await.map_err(db_err)?;

    let mut out = vec![];
    while let Some(result) = cursor.next().await {
        let d = result.map_err(db_err)?;
        let amounts: Vec<i64> = d
            .get_array("amount")
            .map(|a| a.iter().filter_map(|v| match v {
                Bson::Int64(n) => Some(*n),
                Bson::Int32(n) => Some(*n as i64),
                Bson::Double(n) => Some(*n as i64),
                _ => None,
            }).collect())
            .unwrap_or_default();

        // Older records only have the `amount` list, without dates.
        let payments: Vec<serde_json::Value> = match d.get_array("payments") {
            Ok(list) => list
                .iter()
                .filter_map(|p| p.as_document())
                .map(|p| json!({
                    "amount": p.get("amount").cloned().map(Bson::into_relaxed_extjson),
                    "payment_id": p.get_str("payment_id").unwrap_or(""),
                    "paid_at": p.get_datetime("paid_at").ok().map(|t| t.timestamp_millis()),
                }))
                .collect(),
            Err(_) => amounts.iter().map(|a| json!({ "amount": a, "payment_id": "", "paid_at": null })).collect(),
        };
        let last_paid_at = payments.iter().filter_map(|p| p["paid_at"].as_i64()).max();

        out.push(json!({
            "patient_id": d.get_object_id("patient_id").map(|o| o.to_hex()).unwrap_or_default(),
            "patient_name": d.get_str("patient_name").unwrap_or(""),
            "total": amounts.iter().sum::<i64>(),
            "count": amounts.len(),
            "last_payment_id": d.get_str("payment_id").unwrap_or(""),
            "last_paid_at": last_paid_at,
            "payments": payments,
        }));
    }
    out.sort_by_key(|v| std::cmp::Reverse(v["last_paid_at"].as_i64().unwrap_or(0)));
    Ok(Json(serde_json::Value::Array(out)))
}
