use reqwest::Client as HttpClient;
use serde::{Deserialize};
pub struct Payment {
    razor_key_id: String,
    razor_key_secret: String,
    jwt_secret: String,
    http_client: HttpClient,
    dev_seed_key: String,
}
#[derive(Deserialize)]
pub struct CreateOrderRequest {
    patient_id: String,
    amount_rupees: i64,
}

#[derive(Deserialize)]
pub struct VerifyPaymentRequest {
    razorpay_payment_id: String,
    razorpay_order_id: String,
    razorpay_signature: String,
    patient_id: String,
    amount_rupees: i64,
}
