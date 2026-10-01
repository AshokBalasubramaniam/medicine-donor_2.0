use axum::{extract::State, http::StatusCode, Json};
use futures::StreamExt;
use mongodb::bson::{doc, Bson, Document};
use mongodb::options::FindOptions;
use mongodb::Collection;
use serde_json::json;

use crate::state::AppState;
use crate::utils::auth::{AuthUser, Role};
use crate::utils::bson_num;

type Reply = (StatusCode, Json<serde_json::Value>);

fn db_failure(e: mongodb::error::Error) -> Reply {
    tracing::error!("patient list query failed: {e}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": "Something went wrong. Please try again." })),
    )
}

/// `{_id: ObjectId}` documents → JSON with a string `id`.
fn to_json(mut d: Document) -> serde_json::Value {
    let id = d.get_object_id("_id").ok().map(|o| o.to_hex());
    d.remove("_id");
    let mut v = Bson::Document(d).into_relaxed_extjson();
    if let Some(id) = id {
        v["id"] = json!(id);
    }
    v
}

/// Open cases for donors to browse. Admins use the paginated
/// `/adminpage/patients` list instead (see admin_patients.rs).
pub async fn get_all_patientsdetails(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, Reply> {
    user.require(&[Role::Donor])?;
    let coll: Collection<Document> = state.db.collection("patients");
    donor_view(&coll).await.map(Json)
}

/// Fields a donor may see. Identity documents, contact details and the full
/// address stay private; donors only get what they need to decide and donate.
const DONOR_FIELDS: [&str; 17] = [
    "name", "age", "gender", "disease", "severity", "treatment_status", "hospitalname",
    "town", "state", "medicines", "prescription", "estimated_cost", "image", "created_at",
    "amount", "paid_amount", "diagnosis_date",
];

/// Approved, open cases only, with the amounts already worked out.
async fn donor_view(coll: &Collection<Document>) -> Result<serde_json::Value, Reply> {
    let mut projection = Document::new();
    for f in DONOR_FIELDS {
        projection.insert(f, 1);
    }
    let options = FindOptions::builder().projection(projection).sort(doc! { "created_at": -1 }).build();
    let mut cursor = coll
        .find(doc! { "approved": true, "rejected": { "$ne": true }, "amount": { "$gte": 1 } }).with_options(options)
        .await
        .map_err(db_failure)?;

    let mut patients = vec![];
    while let Some(result) = cursor.next().await {
        let mut doc = result.map_err(db_failure)?;
        let amount = bson_num(doc.get("amount"));
        let paid = bson_num(doc.get("paid_amount"));
        let balance = (amount - paid).max(0.0);
        if balance <= 0.0 {
            continue;
        }
        doc.insert("amount", amount);
        doc.insert("paid_amount", paid);
        doc.insert("balance_amount", balance);
        patients.push(to_json(doc));
    }
    Ok(serde_json::Value::Array(patients))
}
