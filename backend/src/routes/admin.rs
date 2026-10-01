use axum::extract::{DefaultBodyLimit, Multipart, Path, State};
use axum::http::StatusCode;
use axum::routing::{get, put};
use axum::{Json, Router};
use mongodb::bson::{doc, oid::ObjectId, Bson, Document};
use serde_json::json;

use crate::routes::admin_patients::{list_patients, patient_stats};
use crate::routes::get_all_pateints_details::get_all_patientsdetails;
use crate::routes::update_patient::{apply_field, phone_in_use, read_image};
use crate::state::AppState;
use crate::utils::auth::{AuthUser, Role};
use crate::utils::cloudinary::{upload_image, UPLOAD_BODY_LIMIT};
use crate::utils::{bson_num, strip_secrets};

type Reply = (StatusCode, Json<serde_json::Value>);

fn reply(code: StatusCode, message: impl Into<String>) -> Reply {
    (code, Json(json!({ "error": message.into() })))
}

fn db_failure(context: &str, e: mongodb::error::Error) -> Reply {
    tracing::error!("{context}: {e}");
    reply(StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.")
}

pub fn admin_routes(state: AppState) -> Router {
    Router::new()
        .route("/adminpage/getpatients", get(get_all_patientsdetails))
        .route("/adminpage/patients", get(list_patients))
        .route("/adminpage/stats", get(patient_stats))
        .route("/adminpage/patients/:id", get(get_patient_by_id))
        .route(
            "/admin/updatepatient/:id",
            put(update_patient).layer(DefaultBodyLimit::max(UPLOAD_BODY_LIMIT)),
        )
        .with_state(state)
}

/// Full record for the admin review and details screens, minus secrets.
pub async fn get_patient_by_id(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, Reply> {
    user.require(&[Role::Admin])?;
    let obj_id = ObjectId::parse_str(&id).map_err(|_| reply(StatusCode::BAD_REQUEST, "Invalid ID"))?;

    let mut patient = state
        .db
        .collection::<Document>("patients")
        .find_one(doc! { "_id": obj_id })
        .await
        .map_err(|e| db_failure("get_patient_by_id", e))?
        .ok_or_else(|| reply(StatusCode::NOT_FOUND, "Patient not found"))?;

    strip_secrets(&mut patient);
    patient.remove("_id");
    let mut resp = Bson::Document(patient).into_relaxed_extjson();
    resp["_id"] = json!(obj_id.to_hex());
    resp["id"] = json!(obj_id.to_hex());
    Ok(Json(resp))
}

/// Admin edit / approve / reject. Only known fields are accepted (the same
/// validated set patients can edit, plus the admin-only decision fields);
/// anything else in the form is ignored.
pub async fn update_patient(
    Path(id): Path<String>,
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Reply {
    if let Err(denied) = user.require(&[Role::Admin]) {
        return denied;
    }
    let Ok(obj_id) = ObjectId::parse_str(&id) else {
        return reply(StatusCode::BAD_REQUEST, "Invalid patient id");
    };
    let coll = state.db.collection::<Document>("patients");

    let mut update_doc = doc! {};
    let mut image_bytes: Option<Vec<u8>> = None;
    let mut amount_raw: Option<String> = None;

    loop {
        let field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break,
            Err(_) => return reply(StatusCode::BAD_REQUEST, "The form could not be read. Please try again."),
        };
        let name = field.name().unwrap_or("").to_string();
        if name == "image" {
            match read_image(field).await {
                Ok(bytes) => image_bytes = bytes.or(image_bytes),
                Err(e) => return e,
            }
            continue;
        }
        let Ok(value) = field.text().await else {
            return reply(StatusCode::BAD_REQUEST, "The form could not be read. Please try again.");
        };
        match name.as_str() {
            "approved" | "rejected" => {
                if let Ok(b) = value.trim().parse::<bool>() {
                    update_doc.insert(name, b);
                }
            }
            "amount" => amount_raw = Some(value),
            // Older admin forms send medicines as text; it is stored as a list.
            "medicines" => {
                let list: Vec<String> = value
                    .split(['\n', ','])
                    .map(|m| m.trim().to_string())
                    .filter(|m| !m.is_empty())
                    .collect();
                update_doc.insert("medicines", list);
            }
            _ => {
                if let Err(message) = apply_field(&mut update_doc, &name, &value) {
                    return reply(StatusCode::BAD_REQUEST, message);
                }
            }
        }
    }

    if let Some(raw) = amount_raw {
        let Ok(amount) = raw.trim().parse::<f64>() else {
            return reply(StatusCode::BAD_REQUEST, "Required amount must be a number");
        };
        if amount < 0.0 || !amount.is_finite() {
            return reply(StatusCode::BAD_REQUEST, "Required amount can't be negative");
        }
        // Keep the balance in step with what donors have already paid.
        let paid = match coll
            .find_one(doc! { "_id": obj_id }).with_options(mongodb::options::FindOneOptions::builder().projection(doc! { "paid_amount": 1 }).build())
            .await
        {
            Ok(Some(d)) => bson_num(d.get("paid_amount")),
            Ok(None) => return reply(StatusCode::NOT_FOUND, "Patient not found"),
            Err(e) => return db_failure("update_patient paid lookup", e),
        };
        if amount < paid {
            return reply(
                StatusCode::BAD_REQUEST,
                format!("Required amount can't be less than the ₹{} already raised", paid as i64),
            );
        }
        update_doc.insert("amount", amount);
        update_doc.insert("balance_amount", amount - paid);
    }

    if let Ok(mobile) = update_doc.get_str("mobile") {
        match phone_in_use(&state.db, mobile, obj_id).await {
            Ok(true) => return reply(StatusCode::CONFLICT, "Another account already uses this phone number"),
            Ok(false) => {}
            Err(e) => return db_failure("update_patient phone check", e),
        }
    }

    if let Some(bytes) = image_bytes {
        match upload_image(&bytes, "patients", &obj_id.to_hex()).await {
            Ok(img) => {
                update_doc.insert("image", img.url);
                update_doc.insert("image_public_id", img.public_id);
            }
            Err(e) => return e,
        }
    }

    if update_doc.is_empty() {
        return reply(StatusCode::BAD_REQUEST, "No fields provided");
    }

    match coll.update_one(doc! { "_id": obj_id }, doc! { "$set": update_doc }).await {
        Ok(res) if res.matched_count > 0 => (StatusCode::OK, Json(json!({ "message": "Patient updated successfully" }))),
        Ok(_) => reply(StatusCode::NOT_FOUND, "Patient not found"),
        Err(e) => db_failure("update_patient", e),
    }
}
