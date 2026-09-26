use axum::{
    extract::DefaultBodyLimit,
    routing::{get, put},
    Router,
};

use crate::routes::pateind_dataget::get_patient_details;
use crate::routes::update_patient::update_patient_handler;
use crate::state::AppState;
use crate::utils::cloudinary::UPLOAD_BODY_LIMIT;

// Registration and login for every role live in `routes::auth`.
pub fn patient_routes(state: AppState) -> Router {
    Router::new()
        .route("/patientdetails", get(get_patient_details))
        .route(
            "/patientdetails/update",
            put(update_patient_handler).layer(DefaultBodyLimit::max(UPLOAD_BODY_LIMIT)),
        )
        .with_state(state)
}
