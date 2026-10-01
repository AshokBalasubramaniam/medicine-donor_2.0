use crate::state::AppState;
use crate::utils::auth::{AuthUser, Role};
use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    Json,
};
use chrono::NaiveDate;
use mongodb::bson::{doc, oid::ObjectId, Bson, Document};
use serde_json::json;
use crate::utils::cloudinary::upload_image;

const GENDERS: &[&str] = &["Male", "Female", "Other"];
const RELATIONSHIPS: &[&str] = &["Single", "Married", "Divorced", "Widowed"];
const BLOOD_GROUPS: &[&str] = &["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SEVERITIES: &[&str] = &["Mild", "Moderate", "Severe", "Critical"];
const TREATMENT_STATUSES: &[&str] = &["Not started", "Ongoing", "Follow-up", "Completed"];
const INCOME_RANGES: &[&str] = &[
    "Below ₹10,000",
    "₹10,000 – ₹25,000",
    "₹25,000 – ₹50,000",
    "Above ₹50,000",
];
const MAX_PRESCRIPTION_ITEMS: usize = 20;

type FieldResult = Result<(), String>;

fn text(doc: &mut Document, key: &str, value: &str, max: usize, label: &str) -> FieldResult {
    let value = value.trim();
    if value.chars().count() > max {
        return Err(format!("{label} must be at most {max} characters"));
    }
    doc.insert(key, value);
    Ok(())
}

fn choice(doc: &mut Document, key: &str, value: &str, allowed: &[&str], label: &str) -> FieldResult {
    let value = value.trim();
    if !value.is_empty() && !allowed.contains(&value) {
        return Err(format!("Invalid {label}"));
    }
    doc.insert(key, value);
    Ok(())
}

fn date(doc: &mut Document, key: &str, value: &str, label: &str) -> FieldResult {
    let value = value.trim();
    if !value.is_empty() && NaiveDate::parse_from_str(value, "%Y-%m-%d").is_err() {
        return Err(format!("{label} must be a valid date"));
    }
    doc.insert(key, value);
    Ok(())
}

fn phone(doc: &mut Document, key: &str, value: &str, label: &str) -> FieldResult {
    let cleaned: String = value.chars().filter(|c| c.is_ascii_digit() || *c == '+').collect();
    let digits = cleaned.chars().filter(|c| c.is_ascii_digit()).count();
    if !cleaned.is_empty() && !(10..=15).contains(&digits) {
        return Err(format!("{label} must be a valid phone number"));
    }
    doc.insert(key, cleaned);
    Ok(())
}

fn digits(doc: &mut Document, key: &str, value: &str, len: usize, label: &str) -> FieldResult {
    let cleaned: String = value.chars().filter(|c| !c.is_whitespace()).collect();
    if !cleaned.is_empty() && (cleaned.len() != len || !cleaned.chars().all(|c| c.is_ascii_digit())) {
        return Err(format!("{label} must be {len} digits"));
    }
    doc.insert(key, cleaned);
    Ok(())
}

fn pan(doc: &mut Document, value: &str) -> FieldResult {
    let v = value.trim().to_uppercase();
    let b = v.as_bytes();
    let valid = b.len() == 10
        && b[..5].iter().all(u8::is_ascii_uppercase)
        && b[5..9].iter().all(u8::is_ascii_digit)
        && b[9].is_ascii_uppercase();
    if !v.is_empty() && !valid {
        return Err("PAN number must look like ABCDE1234F".into());
    }
    doc.insert("panno", v);
    Ok(())
}

/// `prescription` arrives as a JSON array of
/// `{ name, dosage, frequency, duration, quantity }`. The medicine names are
/// also mirrored into `medicines`, which the admin and donor screens read.
fn prescription(doc: &mut Document, value: &str) -> FieldResult {
    let items: Vec<serde_json::Value> =
        serde_json::from_str(value).map_err(|_| "Invalid prescription list".to_string())?;
    if items.len() > MAX_PRESCRIPTION_ITEMS {
        return Err(format!("At most {MAX_PRESCRIPTION_ITEMS} medicines can be listed"));
    }

    let mut rows = Vec::new();
    let mut names = Vec::new();
    for item in items {
        let get = |k: &str| item.get(k).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
        let name = get("name");
        if name.is_empty() {
            continue;
        }
        let row = doc! {
            "name": &name,
            "dosage": get("dosage"),
            "frequency": get("frequency"),
            "duration": get("duration"),
            "quantity": get("quantity"),
        };
        if row.values().any(|v| v.as_str().map_or(false, |s| s.chars().count() > 100)) {
            return Err("Prescription entries must be at most 100 characters".into());
        }
        names.push(Bson::String(name));
        rows.push(Bson::Document(row));
    }
    doc.insert("prescription", rows);
    doc.insert("medicines", names);
    Ok(())
}

fn apply_field(doc: &mut Document, name: &str, value: &str) -> FieldResult {
    match name {
        // Personal
        "name" => {
            if value.trim().chars().count() < 2 {
                return Err("Please enter your full name".into());
            }
            text(doc, "name", value, 100, "Name")
        }
        "age" => {
            let v = value.trim();
            if v.is_empty() {
                return Ok(());
            }
            match v.parse::<i32>() {
                Ok(age) if (1..=150).contains(&age) => {
                    doc.insert("age", age);
                    Ok(())
                }
                _ => Err("Age must be between 1 and 150".into()),
            }
        }
        "birthday" => date(doc, "birthday", value, "Date of birth"),
        "gender" | "sex" => choice(doc, "gender", value, GENDERS, "gender"),
        "relationship" | "relationshipstatus" => {
            choice(doc, "relationship", value, RELATIONSHIPS, "relationship status")
        }
        "blood_group" => choice(doc, "blood_group", value, BLOOD_GROUPS, "blood group"),
        "mobile" => phone(doc, "mobile", value, "Mobile number"),
        "occupation" => text(doc, "occupation", value, 100, "Occupation"),
        "monthly_income" => choice(doc, "monthly_income", value, INCOME_RANGES, "income range"),
        "aadharno" => digits(doc, "aadharno", value, 12, "Aadhaar number"),
        "panno" => pan(doc, value),

        // Address
        "address" => text(doc, "address", value, 300, "Address"),
        "town" => text(doc, "town", value, 100, "City"),
        "state" => text(doc, "state", value, 100, "State"),
        "pincode" => digits(doc, "pincode", value, 6, "Pincode"),

        // Emergency contact
        "emergency_name" => text(doc, "emergency_name", value, 100, "Emergency contact name"),
        "emergency_relation" => text(doc, "emergency_relation", value, 50, "Emergency contact relation"),
        "emergency_phone" => phone(doc, "emergency_phone", value, "Emergency contact phone"),

        // Medical information
        "disease" => text(doc, "disease", value, 200, "Diagnosis"),
        "severity" => choice(doc, "severity", value, SEVERITIES, "severity"),
        "diagnosis_date" => date(doc, "diagnosis_date", value, "Diagnosis date"),
        "allergies" => text(doc, "allergies", value, 500, "Allergies"),
        "chronic_conditions" => text(doc, "chronic_conditions", value, 500, "Other conditions"),
        "prescription" => prescription(doc, value),
        "estimated_cost" => {
            let v = value.trim();
            if v.is_empty() {
                doc.insert("estimated_cost", Bson::Null);
                return Ok(());
            }
            match v.parse::<f64>() {
                Ok(cost) if cost >= 0.0 && cost.is_finite() => {
                    doc.insert("estimated_cost", cost);
                    Ok(())
                }
                _ => Err("Monthly medicine cost must be a positive number".into()),
            }
        }
        "hospitalname" => text(doc, "hospitalname", value, 150, "Hospital name"),
        "hospital_address" => text(doc, "hospital_address", value, 300, "Hospital address"),
        "doctor" => text(doc, "doctor", value, 100, "Doctor name"),
        "doctor_phone" => phone(doc, "doctor_phone", value, "Doctor phone"),
        "date" => date(doc, "date", value, "Next appointment date"),
        "time" => text(doc, "time", value, 20, "Appointment time"),

        // Medical history
        "admissiondate" => date(doc, "admissiondate", value, "Admission date"),
        "dischargedate" => date(doc, "dischargedate", value, "Discharge date"),
        "treatment_status" => choice(doc, "treatment_status", value, TREATMENT_STATUSES, "treatment status"),
        "past_surgeries" => text(doc, "past_surgeries", value, 1000, "Past surgeries / treatments"),
        "family_history" => text(doc, "family_history", value, 1000, "Family medical history"),

        // "id" is checked by the caller; "email" is the login identifier and
        // can't be changed here; anything else is ignored.
        _ => Ok(()),
    }
}

pub async fn update_patient_handler(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> (StatusCode, Json<serde_json::Value>) {
    if let Err(denied) = user.require(&[Role::Patient]) {
        return denied;
    }
    let coll = state.db.collection::<Document>("patients");

    // Patients can only ever update their own record: the id comes from the token.
    let Ok(obj_id) = ObjectId::parse_str(&user.id) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Patient id is required"})),
        );
    };

    let current = match coll.find_one(doc! { "_id": obj_id }, None).await {
        Ok(Some(d)) => d,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(json!({"error": "Patient not found"})));
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("DB error: {}", e)})),
            );
        }
    };

    // Approved applications are what donors see, so they can't be changed by the patient.
    if current.get_bool("approved").unwrap_or(false) {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "Your application is approved, so your profile can no longer be edited"})),
        );
    }

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
            continue;
        }

        let Ok(value) = field.text().await else { continue };
        if name == "id" {
            if value != user.id {
                return (
                    StatusCode::FORBIDDEN,
                    Json(json!({"error": "You can only update your own profile"})),
                );
            }
            continue;
        }
        if let Err(message) = apply_field(&mut update_doc, &name, &value) {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": message})));
        }
    }

    // Discharge can't be before admission (comparing against stored values too).
    let pick = |k: &str| {
        update_doc
            .get_str(k)
            .ok()
            .or_else(|| current.get_str(k).ok())
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
    };
    if let (Some(admit), Some(discharge)) = (pick("admissiondate"), pick("dischargedate")) {
        if discharge < admit {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Discharge date can't be before the admission date"})),
            );
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
        Ok(res) if res.matched_count > 0 => (
            StatusCode::OK,
            Json(json!({"message": "Patient updated successfully"})),
        ),
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
