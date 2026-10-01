mod admin_cli;
mod seed;
mod models;
mod routes;
mod state;
mod utils;

use crate::routes::{payment_route, routes};
use crate::state::init_state;
use axum::Router;
use std::net::SocketAddr;
use axum::http::{header, HeaderName, HeaderValue, Method};
use tower_http::cors::CorsLayer;
use tower_http::set_header::SetResponseHeaderLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // A malformed line stops .env loading, so report it instead of silently
    // running with half the settings. A missing .env is fine (real env vars).
    let env_file = dotenvy::dotenv();
    // Our own messages at INFO (override with LOG_LEVEL=debug), libraries at
    // WARN only — otherwise the MongoDB/TLS libraries flood the console with
    // handshake traces.
    let app_level = std::env::var("LOG_LEVEL")
        .ok()
        .and_then(|l| l.parse::<tracing::Level>().ok())
        .unwrap_or(tracing::Level::INFO);
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(
            tracing_subscriber::filter::Targets::new()
                .with_default(tracing::Level::WARN)
                .with_target("backend", app_level),
        )
        .init();
    if let Err(e) = env_file {
        if !e.not_found() {
            anyhow::bail!("backend/.env could not be read: {} (quote values that contain spaces)", e);
        }
    }

    let args: Vec<String> = std::env::args().skip(1).collect();
    match args.first().map(String::as_str) {
        Some("create-admin") => return admin_cli::create_admin(&args[1..]).await,
        Some("seed-test-data") => return seed::seed_test_data().await,
        Some("clear-test-data") => return seed::clear_test_data().await,
        _ => {}
    }

    utils::jwt::init_secrets()?;
    let state = init_state().await?;
    utils::db::ensure_indexes(&state.db).await;
    utils::db::run_migrations(&state.db).await;

    // Only the frontend's own origins may call the API from a browser.
    // CORS_ORIGINS is a comma-separated list (default: the Vite dev server).
    let origins: Vec<HeaderValue> = std::env::var("CORS_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:5173,http://127.0.0.1:5173".into())
        .split(',')
        .filter_map(|o| HeaderValue::from_str(o.trim()).ok())
        .collect();
    let cors = CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, HeaderName::from_static("x-requested-with")])
        // The refresh-token cookie must travel when the frontend is on another origin.
        .allow_credentials(true);

    // Security headers on every API response (all JSON, never rendered as a page).
    let security_headers = [
        (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
        (header::X_FRAME_OPTIONS, "DENY"),
        (header::REFERRER_POLICY, "no-referrer"),
        (header::CONTENT_SECURITY_POLICY, "default-src 'none'; frame-ancestors 'none'"),
        (header::STRICT_TRANSPORT_SECURITY, "max-age=31536000; includeSubDomains"),
        (header::CACHE_CONTROL, "no-store"),
    ];

    let mut app = Router::new()
        .merge(routes(state.clone()))
        .merge(payment_route(state.db.clone())) // payment routes with their own state
        .layer(cors);
    for (name, value) in security_headers {
        app = app.layer(SetResponseHeaderLayer::if_not_present(name, HeaderValue::from_static(value)));
    }

    // Start server
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(3000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Listening on http://{}", addr);
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}
