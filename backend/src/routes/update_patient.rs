use crate::state::AppState;
use crate::utils::auth::{AuthUser, Role};
use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    Json,
};
use mongodb::bson::{doc, oid::ObjectId};
use serde_json::json;
use crate::utils::cloudinary::upload_image;

pub async fn update_patient_handler(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> (StatusCode, Json<serde_json::Value>) {
    if let Err(denied) = user.require(&[Role::Patient]) {
        return denied;
    }
    let coll = state.db.collection::<mongodb::bson::Document>("patients");

    // Patients can only ever update their own record: the id comes from the token.
    let obj_id: Option<ObjectId> = ObjectId::parse_str(&user.id).ok();
    let mut update_doc = doc! {};
    let mut image_bytes: Option<Vec<u8>> = None;

    // Iterate over multipart fields
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
        } else {
            if let Ok(value) = field.text().await {
                match name.as_str() {
                    "id" => {
                        if value != user.id {
                            return (
                                StatusCode::FORBIDDEN,
                                Json(json!({"error": "You can only update your own profile"})),
                            );
                        }
                    }
                    "name" => {
                        update_doc.insert("name", value);
                    }
                    // "email" is the login identifier and can't be changed from here.
                    "age" => {
                        if let Ok(parsed) = value.parse::<i32>() {
                            update_doc.insert("age", parsed);
                        }
                    }
                    "date" => {
                        update_doc.insert("date", value);
                    }
                    "time" => {
                        update_doc.insert("time", value);
                    }
                    "mobile" => {
                        update_doc.insert("mobile", value);
                    }
                    "Appointment Date"=>{
                        update_doc.insert("Appointment Date", value);
                    }
                    "Appointment Time"=>{
                        update_doc.insert("Appointment Time", value);
                    }
                    "doctor" => {
                        update_doc.insert("doctor", value);
                    }
                    "disease" => {
                        update_doc.insert("disease", value);
                    }
                    // Stored as `gender` / `relationship` (the fields the profile is
                    // read from); the older form names are still accepted.
                    "gender" | "sex" => {
                        if !["", "Male", "Female", "Other"].contains(&value.as_str()) {
                            return (
                                StatusCode::BAD_REQUEST,
                                Json(json!({"error": "Invalid gender"})),
                            );
                        }
                        update_doc.insert("gender", value);
                    }
                    "relationship" | "relationshipstatus" => {
                        if !["", "Single", "Married", "Divorced", "Widowed"].contains(&value.as_str()) {
                            return (
                                StatusCode::BAD_REQUEST,
                                Json(json!({"error": "Invalid relationship status"})),
                            );
                        }
                        update_doc.insert("relationship", value);
                    }
                    "address" => {
                        update_doc.insert("address", value);
                    }
                    "hospitalname" => {
                        update_doc.insert("hospitalname", value);
                    }
                  


                    _ => {}
                }
            }
        }
    }

    // Upload the new profile picture to Cloudinary (replaces the previous one).
    if let Some(bytes) = image_bytes {
        match upload_image(&bytes, "patients", &user.id).await {
            Ok(img) => {
                update_doc.insert("image", img.url);
                update_doc.insert("image_public_id", img.public_id);
            }
            Err(e) => return e,
        }
    }

    if obj_id.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Patient id is required"})),
        );
    }

    if update_doc.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "No fields provided"})),
        );
    }

    match coll
        .update_one(doc! { "_id": obj_id.unwrap() }, doc! { "$set": update_doc }, None)
        .await
    {
        Ok(res) if res.matched_count > 0 => {
            if let Ok(Some(mut updated)) = coll.find_one(doc! {"_id": obj_id.unwrap()}, None).await {
                for secret in ["password", "refresh_tokens", "otp", "otp_hash", "otp_expires_at"] {
                    updated.remove(secret);
                }
                return (
                    StatusCode::OK,
                    Json(json!({"message": "Patient updated successfully", "patient": updated})),
                );
            }
            (
                StatusCode::OK,
                Json(json!({"message": "Patient updated successfully"})),
            )
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
