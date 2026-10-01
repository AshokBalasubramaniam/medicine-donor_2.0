use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::post, Json, Router};
use hmac::{Hmac, Mac};
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::Database;
use reqwest::Client as HttpClient;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::state::get_db;
use crate::models::patient::Patient;
use crate::routes::donation::save_donation;
use crate::utils::auth::{AuthUser, Role};

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone)]
pub struct Payment {
    pub razor_key_id: String,
    pub razor_key_secret: String,
    pub http_client: HttpClient,
   
}

#[derive(Deserialize)]
pub struct CreateOrderRequest {
    pub amount_rupees: i64,
    /// When given, the amount is checked against that patient's remaining balance.
    #[serde(default)]
    pub patient_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RazorpayPayment {
    amount: i64,
    status: String,
    order_id: Option<String>,
}

fn bson_num(v: Option<&mongodb::bson::Bson>) -> f64 {
    use mongodb::bson::Bson;
    match v {
        Some(Bson::Double(n)) => *n,
        Some(Bson::Int32(n)) => *n as f64,
        Some(Bson::Int64(n)) => *n as f64,
        Some(Bson::String(s)) => s.trim().parse().unwrap_or(0.0),
        _ => 0.0,
    }
}

/// Remaining amount (in rupees) an approved, open case can still receive.
async fn open_balance(patient_id: &str) -> Result<f64, (StatusCode, &'static str)> {
    let oid = ObjectId::parse_str(patient_id).map_err(|_| (StatusCode::BAD_REQUEST, "Invalid patient id"))?;
    let db = get_db().await.map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database unavailable"))?;
    let patient = db
        .collection::<mongodb::bson::Document>("patients")
        .find_one(doc! { "_id": oid }, None)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error"))?
        .ok_or((StatusCode::NOT_FOUND, "Patient not found"))?;
    if !patient.get_bool("approved").unwrap_or(false) || patient.get_bool("rejected").unwrap_or(false) {
        return Err((StatusCode::BAD_REQUEST, "This patient is not open for donations"));
    }
    Ok((bson_num(patient.get("amount")) - bson_num(patient.get("paid_amount"))).max(0.0))
}

#[derive(Deserialize)]
pub struct VerifyPayload {
    pub razorpay_order_id: String,
    pub razorpay_payment_id: String,
    pub razorpay_signature: String,
    pub patient_id: String,  
    pub patient_name:String,
    #[allow(dead_code)]
    #[serde(default)]
    pub donor_id:String,
    pub donor_name:String,
    /// Ignored: the amount is read back from Razorpay.
    #[allow(dead_code)]
    #[serde(default)]
    pub amount: i64,
}

#[derive(Debug, Deserialize, Clone)]
struct RazorpayOrderResponse {
    id: String,
    amount: i64,
    currency: String,
    status: String,
}

#[derive(Debug, Serialize)]
struct CreateOrderResponse {
    order_id: String,
    amount: i64,
    currency: String,
    status: String,
    key_id: String,
}

pub fn payment_routes(payment_state: Payment) -> Router {
    Router::new()
        .route("/create_order", post(create_order))
        .route("/verify_payment", post(verify_payment))
        .with_state(payment_state)
}

// --------------------- Create Razorpay Order ---------------------

pub async fn create_order(
    State(state): State<Payment>,
    user: AuthUser,
    Json(payload): Json<CreateOrderRequest>,
) -> impl IntoResponse {
    if let Err(denied) = user.require(&[Role::Donor]) {
        return denied.into_response();
    }
    if payload.amount_rupees < 1 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Donation amount must be at least ₹1"}))).into_response();
    }
    if let Some(pid) = payload.patient_id.as_deref().filter(|p| !p.is_empty()) {
        match open_balance(pid).await {
            Ok(balance) if balance < 1.0 => {
                return (StatusCode::BAD_REQUEST, Json(json!({"error": "This patient's need is already fully funded"}))).into_response();
            }
            Ok(balance) if payload.amount_rupees as f64 > balance => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({"error": format!("The amount can't be more than the remaining ₹{}", balance as i64)})),
                ).into_response();
            }
            Ok(_) => {}
            Err((code, msg)) => return (code, Json(json!({"error": msg}))).into_response(),
        }
    }
    let url = "https://api.razorpay.com/v1/orders";

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let receipt = format!("rcpt_{}", timestamp);

    let res = state
        .http_client
        .post(url)
        .basic_auth(&state.razor_key_id, Some(&state.razor_key_secret))
        .json(&json!({
            "amount": payload.amount_rupees * 100, // Razorpay expects paise
            "currency": "INR",
            "receipt": receipt,
        }))
        .send()
        .await;

    match res {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<RazorpayOrderResponse>().await {
                    Ok(order) => {
                        (
                            StatusCode::OK,
                            Json(CreateOrderResponse {
                                order_id: order.id,
                                amount: order.amount,
                                currency: order.currency,
                                status: order.status,
                                key_id: state.razor_key_id.clone(),
                            }),
                        )
                            .into_response()
                    }
                    Err(_err) => {
                        
                        (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(json!({"error":"failed to parse razorpay response"})),
                        )
                            .into_response()
                    }
                }
            } else {
                let text = resp.text().await.unwrap_or_else(|_| "unknown error".into());
               
                (StatusCode::BAD_GATEWAY, Json(json!({"error": text}))).into_response()
            }
        }
        Err(_err) => {
            
            (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error":"razorpay api request failed"})),
            )
                .into_response()
        }
    }
}

// --------------------- Verify Payment & Update Patient ---------------------

pub async fn verify_payment(
    State(state): State<Payment>,
    user: AuthUser,
    Json(payload): Json<VerifyPayload>,
) -> impl IntoResponse {
    if let Err(denied) = user.require(&[Role::Donor]) {
        return denied.into_response();
    }
    // Step 0: Verify signature
    let mut mac = HmacSha256::new_from_slice(state.razor_key_secret.as_bytes())
        .expect("HMAC can take key of any size");

    let data = format!("{}|{}", payload.razorpay_order_id, payload.razorpay_payment_id);
    mac.update(data.as_bytes());
    let generated_signature = hex::encode(mac.finalize().into_bytes());

    if generated_signature != payload.razorpay_signature {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "invalid signature"})),
        ).into_response();
    }

    // Step 0b: Take the amount from Razorpay, never from the browser. The
    // signature only covers the ids, so `payload.amount` can't be trusted.
    let payment = match state
        .http_client
        .get(format!("https://api.razorpay.com/v1/payments/{}", payload.razorpay_payment_id))
        .basic_auth(&state.razor_key_id, Some(&state.razor_key_secret))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => resp.json::<RazorpayPayment>().await.ok(),
        _ => None,
    };
    let Some(payment) = payment else {
        return (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error": "Could not confirm the payment with Razorpay. If money was deducted, contact support with your payment id."})),
        ).into_response();
    };
    if payment.order_id.as_deref() != Some(payload.razorpay_order_id.as_str())
        || !matches!(payment.status.as_str(), "authorized" | "captured")
    {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Payment does not match this order"}))).into_response();
    }
    let amount = payment.amount / 100;

    // Step 1: Update patient DB, log error but don't fail payment
    let patient_update_result = update_patient_payment(
        &payload.patient_id,
        &payload.razorpay_payment_id,
        amount,
    ).await;

    if let Err(_err) = &patient_update_result {
        
    }

    // Step 2: Save donation, log error but don't fail payment
    let donation_result = save_donation(
                   // <-- AppState needed here
        &payload.donor_name,                        // donor_name
        &user.id,              // donor_id (from the token, not the request body)
        &payload.patient_name,                        // patient_name
        &payload.patient_id,            // patient_id
        &payload.razorpay_payment_id,   // payment_id
        amount,                         // amount confirmed by Razorpay
    ).await;

    if let Err(_err) = &donation_result {
       
    }

    // Step 3: Return overall response
    let mut response = json!({"status": "payment verified"});
    if patient_update_result.is_err() || donation_result.is_err() {
        response["warning"] = json!("DB update or donation save failed, but payment verified");
    } else {
        response["message"] = json!("Patient updated and donation saved successfully");
    }

    (StatusCode::OK, Json(response)).into_response()
}


// --------------------- MongoDB Update ---------------------

pub async fn update_patient_payment(
    patient_id: &str,
    payment_id: &str,
    amount: i64,
) -> anyhow::Result<()> {
    let db: Database = get_db().await?;
    let coll = db.collection::<Patient>("patients");

    let obj_id = ObjectId::parse_str(patient_id)?;

coll.update_one(
    doc! { "_id": obj_id },
    vec![
        doc! {
            "$set": {
                "paid_amount": { "$add": [ { "$ifNull": ["$paid_amount", 0] }, amount ] },
                "balance_amount": { "$subtract": ["$amount", { "$add": [ { "$ifNull": ["$paid_amount", 0] }, amount ] }] },
                "last_payment_id": payment_id,
            }
        }
    ],
    None,
)
.await?;

    Ok(())
}
