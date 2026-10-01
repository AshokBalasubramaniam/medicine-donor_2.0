use anyhow::{bail, Context};
use mongodb::{
    bson::doc,
    options::{AuthMechanism, ClientOptions, Credential, Tls, TlsOptions},
    Client, Database,
};
use std::path::PathBuf;
use tokio::sync::OnceCell;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
}

/// One MongoDB client for the whole process (it pools connections itself).
static DB: OnceCell<Database> = OnceCell::const_new();

/// Database handle for code that has no access to `AppState` (e.g. payment
/// callbacks). Reuses the shared client instead of reconnecting.
pub async fn get_db() -> anyhow::Result<Database> {
    DB.get_or_try_init(connect).await.cloned()
}

pub async fn init_state() -> anyhow::Result<AppState> {
    Ok(AppState { db: get_db().await? })
}

fn env(key: &str) -> Option<String> {
    std::env::var(key).ok().map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

/// Connects to MongoDB using **X.509 certificate authentication only**.
///
/// * `MONGODB_URI` — host(s) and options only, no username/password, e.g.
///   `mongodb+srv://cluster0.xxxx.mongodb.net/`.
/// * `MONGODB_TLS_CERT_KEY_FILE` — required PEM file with the client
///   certificate and its private key. The database user is the certificate
///   subject; there is no password.
/// * `MONGODB_TLS_CA_FILE` — optional CA PEM, only for servers that use a
///   private/self-signed CA (Atlas does not need it).
/// * `DATABASE_NAME` — database to use (default `med_app`).
async fn connect() -> anyhow::Result<Database> {
    let uri = env("MONGODB_URI").context("MONGODB_URI is not set")?;
    let database_name = env("DATABASE_NAME").unwrap_or_else(|| "med_app".into());
    let cert_key = env("MONGODB_TLS_CERT_KEY_FILE").context(
        "MONGODB_TLS_CERT_KEY_FILE is not set: MongoDB access uses X.509 certificate \
         authentication only (see backend/certs/README.md)",
    )?;
    let cert_key = check_pem(&cert_key, "MONGODB_TLS_CERT_KEY_FILE", true)?;
    let ca = env("MONGODB_TLS_CA_FILE")
        .map(|ca| check_pem(&ca, "MONGODB_TLS_CA_FILE", false))
        .transpose()?;

    let mut options = ClientOptions::parse(&uri)
        .await
        .context("MONGODB_URI is not a valid MongoDB connection string")?;

    // Password-based login is not allowed: reject credentials in the URI.
    if let Some(cred) = &options.credential {
        if cred.username.is_some() || cred.password.is_some() {
            bail!("MONGODB_URI must not contain a username or password; authentication uses the certificate only");
        }
        if cred.mechanism.as_ref().is_some_and(|m| *m != AuthMechanism::MongoDbX509) {
            bail!("MONGODB_URI sets an authMechanism other than MONGODB-X509; remove it");
        }
    }

    options.app_name = Some("medicine-donor-backend".into());
    options.tls = Some(Tls::Enabled(
        TlsOptions::builder()
            .cert_key_file_path(cert_key.clone())
            .ca_file_path(ca)
            .build(),
    ));
    options.credential = Some(
        Credential::builder()
            .mechanism(AuthMechanism::MongoDbX509)
            .source("$external".to_string())
            .build(),
    );

    let client = Client::with_options(options).context("invalid MongoDB client options")?;
    let db = client.database(&database_name);

    // Fail at startup with a clear message instead of on the first request.
    db.run_command(doc! { "ping": 1 }).await.with_context(|| {
        format!("could not connect to MongoDB with the X.509 certificate {}", cert_key.display())
    })?;
    tracing::info!(
        "connected to MongoDB database '{}' using X.509 certificate {}",
        database_name,
        cert_key.display()
    );
    Ok(db)
}

/// Validates a PEM file up front so misconfiguration gives a readable error.
fn check_pem(path: &str, var: &str, needs_key: bool) -> anyhow::Result<PathBuf> {
    let path = PathBuf::from(path);
    let text = std::fs::read_to_string(&path)
        .with_context(|| format!("{}: cannot read {}", var, path.display()))?;

    if !text.contains("-----BEGIN CERTIFICATE-----") {
        bail!("{}: {} does not contain a certificate", var, path.display());
    }
    if needs_key {
        if text.contains("ENCRYPTED PRIVATE KEY") || text.contains("Proc-Type: 4,ENCRYPTED") {
            bail!(
                "{}: the private key in {} is password-protected; export it without a password \
                 (openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-plain.pem)",
                var,
                path.display()
            );
        }
        if text.contains("BEGIN EC PRIVATE KEY") {
            bail!(
                "{}: EC keys must be in PKCS#8 format (openssl pkcs8 -topk8 -nocrypt -in {} -out key-pkcs8.pem)",
                var,
                path.display()
            );
        }
        if !text.contains("-----BEGIN PRIVATE KEY-----") && !text.contains("-----BEGIN RSA PRIVATE KEY-----") {
            bail!(
                "{}: {} must contain the client certificate and its private key in one file \
                 (cat client.crt client.key > client.pem)",
                var,
                path.display()
            );
        }
    }
    Ok(path)
}
