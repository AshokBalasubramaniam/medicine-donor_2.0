use axum::{
    extract::{rejection::JsonRejection, Json, Path, State},
    http::StatusCode,
    routing::{get, post, put},
    Router,
};
use futures::TryStreamExt;
use mongodb::bson::{doc, oid::ObjectId, DateTime as BsonDateTime, Document};
use serde_json::{json, Value};

use crate::{
    models::doctor::DoctorInput,
    state::AppState,
    utils::auth::{api_error, ApiError, AuthUser, Role},
};

const COLLECTION: &str = "Doctors";

pub fn doctor_routes(state: AppState) -> Router {
    Router::new()
        .route("/admin/registerdoctor", post(register_doctor_handler))
        .route("/admin/doctors", get(list_doctors))
        .route("/admin/doctors/:id", put(update_doctor).delete(delete_doctor))
        .with_state(state)
}

fn db_error<E: std::fmt::Display>(e: E) -> ApiError {
    tracing::error!("doctor db error: {}", e);
    api_error(StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.")
}

fn email_regex(email: &str) -> String {
    let escaped: String = email
        .chars()
        .flat_map(|c| {
            let special = "\\^$.|?*+()[]{}".contains(c);
            special.then_some('\\').into_iter().chain(std::iter::once(c))
        })
        .collect();
    format!("^{}$", escaped)
}

/// Validates a doctor payload and returns the fields to store.
/// Field names match the documents already stored in this collection.
fn doctor_fields(payload: Result<Json<DoctorInput>, JsonRejection>) -> Result<Document, ApiError> {
    let Json(input) = payload.map_err(|e| {
        tracing::warn!("invalid doctor payload: {}", e);
        api_error(StatusCode::BAD_REQUEST, "Invalid doctor details. Please check the form.")
    })?;

    let name = input.full_name.trim();
    let email = input.email.trim().to_lowercase();
    let phone: String = input.phone.chars().filter(|c| c.is_ascii_digit() || *c == '+').collect();
    let speciality = input.speciality.trim();

    if name.len() < 2 {
        return Err(api_error(StatusCode::BAD_REQUEST, "Enter the doctor's full name"));
    }
    let email_ok = email.split_once('@').is_some_and(|(l, d)| !l.is_empty() && d.contains('.'));
    if !email_ok {
        return Err(api_error(StatusCode::BAD_REQUEST, "Enter a valid email address"));
    }
    let digits = phone.chars().filter(|c| c.is_ascii_digit()).count();
    if !(10..=15).contains(&digits) {
        return Err(api_error(StatusCode::BAD_REQUEST, "Enter a valid phone number"));
    }
    if speciality.is_empty() {
        return Err(api_error(StatusCode::BAD_REQUEST, "Select a speciality"));
    }
    let experience = input.experience.trim();
    if !experience.is_empty() && experience.parse::<u32>().map_or(true, |y| y > 70) {
        return Err(api_error(StatusCode::BAD_REQUEST, "Experience must be a number of years"));
    }
    let max_patients = match input.max_patients.trim() {
        "" => None,
        v => match v.parse::<i32>() {
            Ok(n) if n > 0 => Some(n),
            _ => return Err(api_error(StatusCode::BAD_REQUEST, "Max patients must be a positive number")),
        },
    };

    Ok(doc! {
        "fullName": name,
        "email": &email,
        "phone": &phone,
        "speciality": speciality,
        "qualification": input.qualification.trim(),
        "experience": experience,
        "availableDays": input.available_days.trim(),
        "availableTimings": input.available_timings.trim(),
        "maxPatients": max_patients,
        "profilePhoto": input.profile_photo,
    })
}

async fn email_in_use(state: &AppState, email: &str, except: Option<ObjectId>) -> Result<bool, ApiError> {
    let mut filter = doc! { "email": { "$regex": email_regex(email), "$options": "i" } };
    if let Some(id) = except {
        filter.insert("_id", doc! { "$ne": id });
    }
    let found = state
        .db
        .collection::<Document>(COLLECTION)
        .find_one(filter, None)
        .await
        .map_err(db_error)?;
    Ok(found.is_some())
}

fn parse_id(id: &str) -> Result<ObjectId, ApiError> {
    ObjectId::parse_str(id).map_err(|_| api_error(StatusCode::NOT_FOUND, "Doctor not found"))
}

pub async fn register_doctor_handler(
    State(state): State<AppState>,
    user: AuthUser,
    payload: Result<Json<DoctorInput>, JsonRejection>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    user.require(&[Role::Admin])?;
    let mut fields = doctor_fields(payload)?;
    let email = fields.get_str("email").unwrap_or_default().to_string();
    if email_in_use(&state, &email, None).await? {
        return Err(api_error(StatusCode::CONFLICT, "A doctor with this email is already registered"));
    }
    fields.insert("created_at", BsonDateTime::now());

    let res = state
        .db
        .collection::<Document>(COLLECTION)
        .insert_one(fields, None)
        .await
        .map_err(db_error)?;
    let id = res.inserted_id.as_object_id().map(|o| o.to_hex()).unwrap_or_default();
    Ok((
        StatusCode::CREATED,
        Json(json!({ "success": true, "message": "Doctor registered successfully", "id": id })),
    ))
}

pub async fn update_doctor(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    payload: Result<Json<DoctorInput>, JsonRejection>,
) -> Result<Json<Value>, ApiError> {
    user.require(&[Role::Admin])?;
    let id = parse_id(&id)?;
    let mut fields = doctor_fields(payload)?;
    let email = fields.get_str("email").unwrap_or_default().to_string();
    if email_in_use(&state, &email, Some(id)).await? {
        return Err(api_error(StatusCode::CONFLICT, "Another doctor already uses this email"));
    }
    fields.insert("updated_at", BsonDateTime::now());

    let res = state
        .db
        .collection::<Document>(COLLECTION)
        .update_one(doc! { "_id": id }, doc! { "$set": fields }, None)
        .await
        .map_err(db_error)?;
    if res.matched_count == 0 {
        return Err(api_error(StatusCode::NOT_FOUND, "Doctor not found"));
    }
    Ok(Json(json!({ "success": true, "message": "Doctor updated successfully" })))
}

pub async fn delete_doctor(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    user.require(&[Role::Admin])?;
    let id = parse_id(&id)?;
    let res = state
        .db
        .collection::<Document>(COLLECTION)
        .delete_one(doc! { "_id": id }, None)
        .await
        .map_err(db_error)?;
    if res.deleted_count == 0 {
        return Err(api_error(StatusCode::NOT_FOUND, "Doctor not found"));
    }
    Ok(Json(json!({ "success": true, "message": "Doctor deleted" })))
}

pub async fn list_doctors(State(state): State<AppState>, user: AuthUser) -> Result<Json<Value>, ApiError> {
    user.require(&[Role::Admin])?;
    let coll = state.db.collection::<Document>(COLLECTION);
    let docs: Vec<Document> = coll
        .find(None, None)
        .await
        .map_err(db_error)?
        .try_collect()
        .await
        .map_err(db_error)?;

    let doctors: Vec<Value> = docs
        .iter()
        .map(|d| {
            let text = |k: &str| match d.get(k) {
                Some(mongodb::bson::Bson::String(s)) => json!(s),
                Some(mongodb::bson::Bson::Int32(n)) => json!(n),
                Some(mongodb::bson::Bson::Int64(n)) => json!(n),
                _ => Value::Null,
            };
            json!({
                "id": d.get_object_id("_id").map(|o| o.to_hex()).unwrap_or_default(),
                "fullName": text("fullName"),
                "email": text("email"),
                "phone": text("phone"),
                "speciality": text("speciality"),
                "qualification": text("qualification"),
                "experience": text("experience"),
                "availableDays": text("availableDays"),
                "availableTimings": text("availableTimings"),
                "maxPatients": text("maxPatients"),
            })
        })
        .rev() // newest first
        .collect();

    Ok(Json(json!(doctors)))
}
