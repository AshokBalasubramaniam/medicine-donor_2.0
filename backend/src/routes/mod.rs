pub mod admin;
pub mod admin_patients;
pub mod auth;
pub mod doctor;
pub mod get_all_pateints_details;
pub mod pateind_dataget;
pub mod patient;
pub mod payment;
pub mod update_patient;
pub mod donation;

use crate::{routes::donation::donation_routes, state::AppState};
use axum::Router;

use admin::admin_routes;
use doctor::doctor_routes;
use auth::auth_routes;
use patient::patient_routes;
use payment::{payment_routes, Payment};

pub fn routes(state: AppState) -> Router {
    Router::new()
        .nest("/api", auth_routes(state.clone()))
        .nest("/api", admin_routes(state.clone()))
        .nest("/api", patient_routes(state.clone()))
         .nest("/api", doctor_routes(state.clone()))
        .nest("/api", donation_routes(state.clone()))

}

pub fn payment_route(db: mongodb::Database) -> Router {
    let env = |k: &str| {
        std::env::var(k).unwrap_or_else(|_| {
            tracing::warn!("{} is not set - donations will fail", k);
            String::new()
        })
    };
    let payment_state = Payment {
        razor_key_id: env("RAZORPAY_KEY_ID"),
        razor_key_secret: env("RAZORPAY_KEY_SECRET"),
        http_client: reqwest::Client::new(),
        db,
    };

    Router::new().nest("/api", payment_routes(payment_state))
}

