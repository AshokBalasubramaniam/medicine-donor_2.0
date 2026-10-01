//! Server-side paginated patient lists and summary counts for the admin
//! portal, so the browser never has to download every patient.

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Json;
use futures::TryStreamExt;
use mongodb::bson::{doc, Bson, Document};
use serde::Deserialize;
use serde_json::json;

use crate::state::AppState;
use crate::utils::auth::{AuthUser, Role};
use crate::utils::db::{escape_regex, SECRET_FIELDS};

type Reply = (StatusCode, Json<serde_json::Value>);

fn db_failure(e: mongodb::error::Error) -> Reply {
    tracing::error!("admin patient query failed: {e}");
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Something went wrong. Please try again." })))
}

const DEFAULT_LIMIT: i64 = 24;
const MAX_LIMIT: i64 = 100;

#[derive(Deserialize)]
pub struct ListQuery {
    #[serde(default)]
    status: String,
    #[serde(default)]
    q: String,
    #[serde(default)]
    sort: String,
    page: Option<i64>,
    limit: Option<i64>,
}

/// Amounts may be stored as int, double or (legacy) string.
fn num(field: &str) -> Bson {
    Bson::Document(doc! { "$convert": { "input": field, "to": "double", "onError": 0.0, "onNull": 0.0 } })
}

/// Adds `_amt`, `_paid`, `_need`, `_pct` and `_name` for filtering and sorting.
fn computed_fields() -> Vec<Document> {
    vec![
        doc! { "$addFields": { "_amt": num("$amount"), "_paid": num("$paid_amount") } },
        doc! { "$addFields": {
            "_need": { "$max": [0.0, { "$subtract": ["$_amt", "$_paid"] }] },
            "_pct": { "$cond": [ { "$gt": ["$_amt", 0.0] }, { "$divide": ["$_paid", "$_amt"] }, 0.0 ] },
            "_name": { "$toLower": { "$ifNull": ["$name", ""] } },
        } },
    ]
}

/// The same four statuses the UI shows: pending → approved (open) →
/// completed (fully funded), or rejected.
fn status_expr() -> Document {
    doc! { "$switch": {
        "branches": [
            { "case": { "$eq": ["$rejected", true] }, "then": "rejected" },
            { "case": { "$ne": ["$approved", true] }, "then": "pending" },
            { "case": { "$and": [ { "$gt": ["$_amt", 0.0] }, { "$gte": ["$_paid", "$_amt"] } ] }, "then": "completed" },
        ],
        "default": "approved",
    } }
}

/// Index-friendly pre-filter for a status (narrowed further by `status_expr`).
fn status_prefilter(status: &str) -> Option<Document> {
    Some(match status {
        "pending" => doc! { "approved": { "$ne": true }, "rejected": { "$ne": true } },
        "approved" | "completed" => doc! { "approved": true, "rejected": { "$ne": true } },
        "rejected" => doc! { "rejected": true },
        _ => return None,
    })
}

fn search_filter(q: &str) -> Option<Document> {
    let q = q.trim();
    if q.is_empty() {
        return None;
    }
    let rx = doc! { "$regex": escape_regex(&q.chars().take(100).collect::<String>()), "$options": "i" };
    let fields = ["name", "email", "mobile", "disease", "hospitalname", "town"];
    Some(doc! { "$or": fields.iter().map(|f| Bson::Document(doc! { *f: rx.clone() })).collect::<Vec<_>>() })
}

fn sort_stage(sort: &str) -> Document {
    match sort {
        "oldest" => doc! { "created_at": 1, "_id": 1 },
        "name" => doc! { "_name": 1, "_id": 1 },
        "needed" => doc! { "_need": -1, "_id": 1 },
        "funded" => doc! { "_pct": 1, "_id": 1 },
        _ => doc! { "created_at": -1, "_id": -1 },
    }
}

fn to_json(mut d: Document) -> serde_json::Value {
    let id = d.get_object_id("_id").ok().map(|o| o.to_hex());
    d.remove("_id");
    let mut v = Bson::Document(d).into_relaxed_extjson();
    if let Some(id) = id {
        v["id"] = json!(id);
    }
    v
}

/// `GET /adminpage/patients?status=pending&q=&sort=newest&page=1&limit=24`
pub async fn list_patients(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<ListQuery>,
) -> Result<Json<serde_json::Value>, Reply> {
    user.require(&[Role::Admin])?;
    let Some(prefilter) = status_prefilter(&query.status) else {
        return Err((StatusCode::BAD_REQUEST, Json(json!({ "error": "Unknown status" }))));
    };
    let limit = query.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);
    let page = query.page.unwrap_or(1).max(1);

    let mut hide = doc! { "_amt": 0, "_paid": 0, "_need": 0, "_pct": 0, "_name": 0 };
    for f in SECRET_FIELDS {
        hide.insert(f, 0);
    }

    let mut pipeline = vec![doc! { "$match": prefilter }];
    pipeline.extend(computed_fields());
    pipeline.push(doc! { "$match": { "$expr": { "$eq": [status_expr(), &query.status] } } });
    if let Some(search) = search_filter(&query.q) {
        pipeline.push(doc! { "$match": search });
    }
    pipeline.push(doc! { "$sort": sort_stage(&query.sort) });
    pipeline.push(doc! { "$facet": {
        "items": [ { "$skip": (page - 1) * limit }, { "$limit": limit }, { "$project": hide } ],
        "total": [ { "$count": "n" } ],
    } });

    let result = state
        .db
        .collection::<Document>("patients")
        .aggregate(pipeline)
        .await
        .map_err(db_failure)?
        .try_next()
        .await
        .map_err(db_failure)?
        .unwrap_or_default();

    let items: Vec<serde_json::Value> = result
        .get_array("items")
        .map(|a| a.iter().filter_map(|b| b.as_document().cloned()).map(to_json).collect())
        .unwrap_or_default();
    let total = result
        .get_array("total")
        .ok()
        .and_then(|a| a.first())
        .and_then(|b| b.as_document())
        .and_then(|d| d.get_i32("n").map(i64::from).or_else(|_| d.get_i64("n")).ok())
        .unwrap_or(0);

    Ok(Json(json!({
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) / limit,
    })))
}

/// Pending applications with every detail the review checklist needs
/// (mirrors REQUIRED_FOR_REVIEW in the frontend).
fn ready_for_review() -> Document {
    let filled = |f: &str| doc! { f: { "$type": "string", "$ne": "" } };
    doc! { "$and": [
        { "approved": { "$ne": true } }, { "rejected": { "$ne": true } },
        filled("name"), filled("gender"), filled("mobile"),
        filled("address"), filled("town"), filled("state"), filled("pincode"),
        filled("aadharno"), filled("emergency_name"), filled("emergency_phone"),
        filled("disease"), filled("severity"), filled("hospitalname"), filled("doctor"),
        { "$or": [ { "age": { "$gt": 0 } }, filled("birthday") ] },
        { "$or": [ { "prescription.0": { "$exists": true } }, { "medicines.0": { "$exists": true } } ] },
        { "estimated_cost": { "$gt": 0 } },
    ] }
}

/// `GET /adminpage/stats`: counts per status, money raised and still needed.
pub async fn patient_stats(State(state): State<AppState>, user: AuthUser) -> Result<Json<serde_json::Value>, Reply> {
    user.require(&[Role::Admin])?;
    let coll = state.db.collection::<Document>("patients");

    let mut pipeline = computed_fields();
    pipeline.push(doc! { "$group": {
        "_id": status_expr(),
        "count": { "$sum": 1 },
        "raised": { "$sum": "$_paid" },
        "need": { "$sum": "$_need" },
    } });

    let groups_fut = async {
        let cursor = coll.aggregate(pipeline).await?;
        cursor.try_collect::<Vec<Document>>().await
    };
    let ready_fut = async { coll.count_documents(ready_for_review()).await };
    let (groups, ready): (Vec<Document>, u64) = tokio::try_join!(groups_fut, ready_fut).map_err(db_failure)?;

    let mut counts = json!({ "pending": 0, "approved": 0, "completed": 0, "rejected": 0 });
    let (mut raised, mut still_needed) = (0.0, 0.0);
    for g in groups {
        let status = g.get_str("_id").unwrap_or("pending").to_string();
        let count = g.get_i32("count").map(i64::from).unwrap_or(0);
        counts[&status] = json!(count);
        raised += g.get_f64("raised").unwrap_or(0.0);
        if status == "approved" {
            still_needed += g.get_f64("need").unwrap_or(0.0);
        }
    }
    Ok(Json(json!({ "counts": counts, "raised": raised, "still_needed": still_needed, "ready": ready })))
}
