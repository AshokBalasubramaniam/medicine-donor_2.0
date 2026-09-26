use crate::routes::get_all_pateints_details::get_all_patientsdetails;
use crate::utils::auth::{AuthUser, Role};
use crate::{models::patient::Patient, state::AppState};
use axum::extract::Multipart;
use axum::extract::Path;
use axum::routing::{get, put};
use axum::{extract::State, http::StatusCode, Json, Router};
use lettre::message::{header, Message};
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::SmtpTransport;
use lettre::Transport;
use mongodb::bson::oid::ObjectId;
use mongodb::{bson::doc, Collection};
use serde_json::json;
use crate::utils::cloudinary::{upload_image, UPLOAD_BODY_LIMIT};
use axum::extract::DefaultBodyLimit;

/// Fields an admin form must never write directly.
const PROTECTED_FIELDS: [&str; 9] = [
    "_id", "id", "password", "refresh_tokens", "otp", "otp_hash", "otp_expires_at", "image_public_id", "email",
];

pub fn admin_routes(state: AppState) -> Router {
  
    Router::new()
        .route("/adminpage/getpatients", get(get_all_patientsdetails))
        .route("/adminpage/patients", get(get_all_patients))
        .route("/adminpage/patients/:id", get(get_patient_by_id))
        .route(
            "/admin/updatepatient/:id",
            put(update_patient).layer(DefaultBodyLimit::max(UPLOAD_BODY_LIMIT)),
        )
        .with_state(state)
}

/// Sends the password-reset code. SMTP settings come from the environment:
/// SMTP_USERNAME, SMTP_PASSWORD (Gmail: an App Password), optional SMTP_FROM
/// and SMTP_HOST (default smtp.gmail.com).
pub async fn send_otp_mail(to: &str, otp: &str) -> Result<(), String> {
    let env = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
    let (username, password) = match (env("SMTP_USERNAME"), env("SMTP_PASSWORD")) {
        (Some(u), Some(p)) => (u, p),
        _ => return Err("SMTP_USERNAME / SMTP_PASSWORD are not configured".into()),
    };
    let from = env("SMTP_FROM").unwrap_or_else(|| format!("Medicine Donor System <{}>", username));
    let host = env("SMTP_HOST").unwrap_or_else(|| "smtp.gmail.com".into());

    let email = Message::builder()
        .from(from.parse().map_err(|e| format!("invalid SMTP_FROM: {}", e))?)
        .to(to.parse().map_err(|e| format!("invalid recipient: {}", e))?)
        .subject("Your OTP Code")
        .header(header::ContentType::TEXT_PLAIN)
        .body(format!("Your OTP code is: {}", otp))
        .map_err(|e| e.to_string())?;

    let creds = Credentials::new(username, password);

    let mailer = SmtpTransport::relay(&host)
        .map_err(|e| e.to_string())?
        .credentials(creds)
        .build();

    match mailer.send(&email) {
        Ok(_) => {
           
            Ok(())
        }
        Err(e) => {
           
            Err(e.to_string())
        }
    }
}

use futures::TryStreamExt;

pub async fn get_all_patients(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, Json<serde_json::Value>)> {
    user.require(&[Role::Admin])?;
    let coll = state.db.collection::<Patient>("patients");

    let mut cursor = coll.find(None, None).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("DB error: {}", e)})),
        )
    })?;

    let mut patients = Vec::new();
    while let Some(patient) = cursor.try_next().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Cursor error: {}", e)})),
        )
    })? {
        patients.push(json!({
            "_id": patient.id.map(|oid| oid.to_hex()),
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
            "image": patient.image,
        }));
    }
  
    Ok(Json(patients))
}

pub async fn get_patient_by_id(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    user.require(&[Role::Admin])?;
    let coll: Collection<Patient> = state.db.collection("patients");

    let obj_id = match ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return Err((StatusCode::BAD_REQUEST, Json(json!({"error":"Invalid ID"})))),
    };

    match coll.find_one(doc! { "_id": obj_id }, None).await {
        Ok(Some(patient)) => {
            let id_hex = patient
                .id
                .clone()
                .map(|oid| oid.to_hex())
                .unwrap_or_default();

            let resp = json!({
                "_id": id_hex,
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
                "image": patient.image,
            });
            Ok(Json(resp))
        }

        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({"error":"Patient not found"})),
        )),
        Err(err) => {
            eprintln!("DB error: {:?}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error":"DB error"})),
            ))
        }
    }
}

use mongodb::bson::Document;

pub async fn update_patient(
    Path(id): Path<String>,
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> (StatusCode, Json<serde_json::Value>) {
    if let Err(denied) = user.require(&[Role::Admin]) {
        return denied;
    }
    let coll: Collection<Document> = state.db.collection("patients");

    let obj_id = match ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Invalid patient id"})),
            )
        }
    };

    let mut update_doc = doc! {};
    let mut image_bytes: Option<Vec<u8>> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();

        if name == "image" {
            // A text "image" field (the current URL) is ignored; only files are uploaded.
            if field.file_name().is_some() {
                match field.bytes().await {
                    Ok(data) if !data.is_empty() => image_bytes = Some(data.to_vec()),
                    Ok(_) => {}
                    Err(_) => {
                        return (
                            StatusCode::PAYLOAD_TOO_LARGE,
                            Json(json!({"error": "Image must be smaller than 5 MB"})),
                        );
                    }
                }
            }
        } else if PROTECTED_FIELDS.contains(&name.as_str()) {
            // Never let a form overwrite credentials, sessions or ids.
            continue;
        } else if let Ok(value) = field.text().await {
            // 👇 Smart type conversion
            if name == "age" {
                if let Ok(age) = value.parse::<i32>() {
                    update_doc.insert(name, age);
                }
            } else if name == "approved" || name == "rejected" {
                if let Ok(b) = value.parse::<bool>() {
                    update_doc.insert(name, b);
                }
            } else {
                update_doc.insert(name, value);
            }
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
    if let Some(amount) = update_doc.get("amount") {
        if let Ok(a) = amount.as_str().unwrap().parse::<f64>() {
            update_doc.insert("amount", a);
        }
    }

    if update_doc.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "No fields provided"})),
        );
    }

    match coll
        .update_one(doc! { "_id": obj_id }, doc! { "$set": update_doc }, None)
        .await
    {
        Ok(res) if res.matched_count > 0 => {
            if let Ok(Some(mut updated)) = coll.find_one(doc! {"_id": obj_id}, None).await {
                for secret in ["password", "refresh_tokens", "otp", "otp_hash", "otp_expires_at"] {
                    updated.remove(secret);
                }
                (
                    StatusCode::OK,
                    Json(json!({"message": "Patient updated successfully", "patient": updated})),
                )
            } else {
                (
                    StatusCode::OK,
                    Json(json!({"message": "Patient updated successfully"})),
                )
            }
        }
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Patient not found"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("DB update error: {}", e)})),
        ),
    }
}
