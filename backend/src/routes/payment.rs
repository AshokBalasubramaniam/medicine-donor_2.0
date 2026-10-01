use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::post, Json, Router};
use hmac::{Hmac, Mac};
use mongodb::bson::{doc, oid::ObjectId, DateTime, Document};
use mongodb::Database;
use reqwest::Client as HttpClient;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::Sha256;

use crate::routes::donation::save_donation;
use crate::utils::auth::{AuthUser, Role};
use crate::utils::bson_num;

type HmacSha256 = Hmac<Sha256>;

/// One record per Razorpay order we create, so a payment can only ever be
/// credited once, to the patient and donor it was created for.
pub const ORDERS: &str = "payment_orders";

#[derive(Clone)]
pub struct Payment {
    pub razor_key_id: String,
    pub razor_key_secret: String,
    pub http_client: HttpClient,
    pub db: Database,
}

#[derive(Deserialize)]
pub struct CreateOrderRequest {
    pub amount_rupees: i64,
    pub patient_id: String,
}

#[derive(Debug, Deserialize)]
struct RazorpayPayment {
    amount: i64,
    status: String,
    order_id: Option<String>,
}

/// Only the ids and signature are trusted from the browser; the patient,
/// donor and amount come from our order record and from Razorpay.
#[derive(Deserialize)]
pub struct VerifyPayload {
    pub razorpay_order_id: String,
    pub razorpay_payment_id: String,
    pub razorpay_signature: String,
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

fn error(code: StatusCode, message: impl Into<String>) -> axum::response::Response {
    (code, Json(json!({ "error": message.into() }))).into_response()
}

pub fn payment_routes(payment_state: Payment) -> Router {
    Router::new()
        .route("/create_order", post(create_order))
        .route("/verify_payment", post(verify_payment))
        .with_state(payment_state)
}

/// Remaining amount (in rupees) an approved, open case can still receive.
async fn open_balance(db: &Database, patient: ObjectId) -> Result<f64, (StatusCode, &'static str)> {
    let doc = db
        .collection::<Document>("patients")
        .find_one(doc! { "_id": patient })
        .await
        .map_err(|e| {
            tracing::error!("open_balance lookup failed: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.")
        })?
        .ok_or((StatusCode::NOT_FOUND, "Patient not found"))?;
    if !doc.get_bool("approved").unwrap_or(false) || doc.get_bool("rejected").unwrap_or(false) {
        return Err((StatusCode::BAD_REQUEST, "This patient is not open for donations"));
    }
    Ok((bson_num(doc.get("amount")) - bson_num(doc.get("paid_amount"))).max(0.0))
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
        return error(StatusCode::BAD_REQUEST, "Donation amount must be at least ₹1");
    }
    let (Ok(patient), Ok(donor)) = (ObjectId::parse_str(&payload.patient_id), ObjectId::parse_str(&user.id)) else {
        return error(StatusCode::BAD_REQUEST, "Invalid patient id");
    };
    match open_balance(&state.db, patient).await {
        Ok(balance) if balance < 1.0 => return error(StatusCode::BAD_REQUEST, "This patient's need is already fully funded"),
        Ok(balance) if payload.amount_rupees as f64 > balance => {
            return error(
                StatusCode::BAD_REQUEST,
                format!("The amount can't be more than the remaining ₹{}", balance as i64),
            )
        }
        Ok(_) => {}
        Err((code, msg)) => return error(code, msg),
    }

    let res = state
        .http_client
        .post("https://api.razorpay.com/v1/orders")
        .basic_auth(&state.razor_key_id, Some(&state.razor_key_secret))
        .json(&json!({
            "amount": payload.amount_rupees * 100, // Razorpay expects paise
            "currency": "INR",
            "receipt": format!("rcpt_{}", chrono::Utc::now().timestamp_millis()),
            "notes": { "patient_id": patient.to_hex(), "donor_id": donor.to_hex() },
        }))
        .send()
        .await;

    let order = match res {
        Ok(resp) if resp.status().is_success() => match resp.json::<RazorpayOrderResponse>().await {
            Ok(order) => order,
            Err(e) => {
                tracing::error!("could not parse Razorpay order response: {e}");
                return error(StatusCode::BAD_GATEWAY, "The payment gateway returned an unexpected response.");
            }
        },
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            tracing::error!("Razorpay order creation failed ({status}): {body}");
            return error(StatusCode::BAD_GATEWAY, "Couldn't start the payment. Please try again.");
        }
        Err(e) => {
            tracing::error!("Razorpay order request failed: {e}");
            return error(StatusCode::BAD_GATEWAY, "Couldn't reach the payment gateway. Please try again.");
        }
    };

    let record = doc! {
        "order_id": &order.id,
        "patient_id": patient,
        "donor_id": donor,
        "amount": order.amount,
        "status": "created",
        "created_at": DateTime::now(),
    };
    if let Err(e) = state.db.collection::<Document>(ORDERS).insert_one(record).await {
        tracing::error!("could not record payment order {}: {e}", order.id);
        return error(StatusCode::INTERNAL_SERVER_ERROR, "Couldn't start the payment. Please try again.");
    }

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

// --------------------- Verify Payment & Update Patient ---------------------

pub async fn verify_payment(
    State(state): State<Payment>,
    user: AuthUser,
    Json(payload): Json<VerifyPayload>,
) -> impl IntoResponse {
    if let Err(denied) = user.require(&[Role::Donor]) {
        return denied.into_response();
    }

    // 1. Signature (constant-time comparison).
    let mut mac = HmacSha256::new_from_slice(state.razor_key_secret.as_bytes()).expect("HMAC accepts any key size");
    mac.update(format!("{}|{}", payload.razorpay_order_id, payload.razorpay_payment_id).as_bytes());
    let signature_ok = hex::decode(payload.razorpay_signature.trim())
        .map(|sig| mac.verify_slice(&sig).is_ok())
        .unwrap_or(false);
    if !signature_ok {
        return error(StatusCode::BAD_REQUEST, "Invalid payment signature");
    }

    // 2. Our record of the order: who it is for and who is paying.
    let orders = state.db.collection::<Document>(ORDERS);
    let order = match orders.find_one(doc! { "order_id": &payload.razorpay_order_id }).await {
        Ok(Some(o)) => o,
        Ok(None) => return error(StatusCode::BAD_REQUEST, "Unknown payment order"),
        Err(e) => {
            tracing::error!("order lookup failed: {e}");
            return error(StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong. Please contact support with your payment id.");
        }
    };
    let (Ok(patient_id), Ok(donor_id)) = (order.get_object_id("patient_id"), order.get_object_id("donor_id")) else {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "Payment order is incomplete");
    };
    if donor_id.to_hex() != user.id {
        return error(StatusCode::FORBIDDEN, "This payment belongs to another account");
    }
    if order.get_str("status").unwrap_or("") == "paid" {
        // Already credited (e.g. the request was retried) — nothing to do.
        return (StatusCode::OK, Json(json!({ "status": "payment verified", "message": "Already recorded" }))).into_response();
    }

    // 3. Amount and status from Razorpay, never from the browser.
    let payment = match state
        .http_client
        .get(format!("https://api.razorpay.com/v1/payments/{}", payload.razorpay_payment_id))
        .basic_auth(&state.razor_key_id, Some(&state.razor_key_secret))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => resp.json::<RazorpayPayment>().await.ok(),
        Ok(resp) => {
            tracing::error!("Razorpay payment lookup failed: {}", resp.status());
            None
        }
        Err(e) => {
            tracing::error!("Razorpay payment lookup failed: {e}");
            None
        }
    };
    let Some(payment) = payment else {
        return error(
            StatusCode::BAD_GATEWAY,
            "Could not confirm the payment with Razorpay. If money was deducted, contact support with your payment id.",
        );
    };
    if payment.order_id.as_deref() != Some(payload.razorpay_order_id.as_str())
        || !matches!(payment.status.as_str(), "authorized" | "captured")
    {
        return error(StatusCode::BAD_REQUEST, "Payment does not match this order");
    }
    let amount = payment.amount / 100;

    // 4. Claim the order atomically; a concurrent or repeated call matches nothing.
    let claimed = orders
        .update_one(
            doc! { "order_id": &payload.razorpay_order_id, "status": { "$ne": "paid" } },
            doc! { "$set": { "status": "paid", "payment_id": &payload.razorpay_payment_id, "paid_amount": amount, "paid_at": DateTime::now() } })
        .await;
    match claimed {
        Ok(r) if r.modified_count == 1 => {}
        Ok(_) => {
            return (StatusCode::OK, Json(json!({ "status": "payment verified", "message": "Already recorded" }))).into_response();
        }
        Err(e) => {
            tracing::error!("could not claim order {}: {e}", payload.razorpay_order_id);
            return error(StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong. Please contact support with your payment id.");
        }
    }

    // 5. Credit the patient and record the donation. The payment is already
    //    captured, so failures here are logged for manual follow-up.
    let mut warning = None;
    if let Err(e) = update_patient_payment(&state.db, patient_id, &payload.razorpay_payment_id, amount).await {
        tracing::error!("payment {} verified but patient {} not updated: {e}", payload.razorpay_payment_id, patient_id);
        warning = Some("Payment received, but the patient's total could not be updated yet.");
    }
    let names = account_names(&state.db, patient_id, donor_id).await;
    if let Err(e) = save_donation(&state.db, &names.1, donor_id, &names.0, patient_id, &payload.razorpay_payment_id, amount).await {
        tracing::error!("payment {} verified but donation not saved: {e}", payload.razorpay_payment_id);
        warning = Some("Payment received, but your donation history could not be updated yet.");
    }

    let mut response = json!({ "status": "payment verified", "amount": amount });
    match warning {
        Some(w) => response["warning"] = json!(w),
        None => response["message"] = json!("Thank you — your donation was recorded."),
    }
    (StatusCode::OK, Json(response)).into_response()
}

/// (patient name, donor name) as stored in the database.
async fn account_names(db: &Database, patient: ObjectId, donor: ObjectId) -> (String, String) {
    let name = |coll: &'static str, id: ObjectId| async move {
        db.collection::<Document>(coll)
            .find_one(doc! { "_id": id }).with_options(mongodb::options::FindOneOptions::builder().projection(doc! { "name": 1 }).build())
            .await
            .ok()
            .flatten()
            .and_then(|d| d.get_str("name").ok().map(str::to_string))
            .unwrap_or_default()
    };
    tokio::join!(name("patients", patient), name("donors", donor))
}

// --------------------- MongoDB Update ---------------------

async fn update_patient_payment(db: &Database, patient: ObjectId, payment_id: &str, amount: i64) -> anyhow::Result<()> {
    db.collection::<Document>("patients")
        .update_one(
            doc! { "_id": patient },
            vec![doc! {
                "$set": {
                    "paid_amount": { "$add": [ { "$ifNull": ["$paid_amount", 0] }, amount ] },
                    "balance_amount": { "$max": [0, { "$subtract": [
                        { "$ifNull": ["$amount", 0] },
                        { "$add": [ { "$ifNull": ["$paid_amount", 0] }, amount ] },
                    ] }] },
                    "last_payment_id": payment_id,
                }
            }])
        .await?;
    Ok(())
}
