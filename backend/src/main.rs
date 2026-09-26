mod models;
mod routes;
mod state;
mod utils;

use crate::routes::{payment_route, routes};
use crate::state::init_state;
use axum::Router;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
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
    let state = init_state().await?;

    let app = Router::new()
        .merge(routes(state.clone())) // other app routes
        .merge(payment_route()) // payment routes with separate Payment state
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    // Start server
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(3000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Listening on http://{}", addr);
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}
