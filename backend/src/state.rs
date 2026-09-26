use mongodb::{Client, Database};
use serde::Deserialize;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
}
pub async fn get_db() -> anyhow::Result<Database> {
    let state = init_state().await?;
    Ok(state.db)
}
#[derive(Debug, Deserialize)]
pub struct Config {
    pub mongodb_uri: String,
    pub database_name: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            mongodb_uri: std::env::var("MONGODB_URI").expect("MONGODB_URI not set"),
            database_name: std::env::var("DATABASE_NAME").unwrap_or_else(|_| "med_app".into()),
        }
    }
}

pub async fn init_state() -> anyhow::Result<AppState> {
    let config = Config::from_env();
    let client = Client::with_uri_str(&config.mongodb_uri).await?;
    let db = client.database(&config.database_name);
    Ok(AppState { db })
}
