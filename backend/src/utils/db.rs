//! Small helpers shared by the route handlers.

use mongodb::bson::{doc, Bson, Document};
use mongodb::options::IndexOptions;
use mongodb::{Database, IndexModel};

/// Fields that never leave the server, whatever the endpoint.
pub const SECRET_FIELDS: [&str; 10] = [
    "password",
    "refresh_tokens",
    "token_version",
    "otp",
    "otp_hash",
    "otp_expires_at",
    "otp_attempts",
    "image_public_id",
    "last_payment_id",
    "test_seed",
];

pub fn strip_secrets(d: &mut Document) {
    for f in SECRET_FIELDS {
        d.remove(f);
    }
}

/// Reads a number however it was stored (int, double or numeric string).
pub fn bson_num(v: Option<&Bson>) -> f64 {
    match v {
        Some(Bson::Double(n)) => *n,
        Some(Bson::Int32(n)) => *n as f64,
        Some(Bson::Int64(n)) => *n as f64,
        Some(Bson::String(s)) => s.trim().parse().unwrap_or(0.0),
        _ => 0.0,
    }
}

/// Creates the indexes the queries rely on. Safe to run on every start;
/// a failure is logged rather than stopping the server.
pub async fn ensure_indexes(db: &Database) {
    let plain = |keys: Document| IndexModel::builder().keys(keys).build();
    let unique = |keys: Document| {
        IndexModel::builder()
            .keys(keys)
            .options(IndexOptions::builder().unique(true).build())
            .build()
    };
    let wanted: [(&str, Vec<IndexModel>); 6] = [
        ("patients", vec![plain(doc! { "approved": 1, "rejected": 1, "created_at": -1 }), plain(doc! { "mobile": 1 }), plain(doc! { "created_at": -1 })]),
        ("donors", vec![plain(doc! { "phone": 1 })]),
        ("adminpage", vec![plain(doc! { "phone": 1 })]),
        ("Doctors", vec![plain(doc! { "speciality": 1 })]),
        ("donations", vec![plain(doc! { "donor_id": 1, "patient_id": 1 })]),
        ("payment_orders", vec![unique(doc! { "order_id": 1 })]),
    ];
    for (coll, models) in wanted {
        if let Err(e) = db.collection::<Document>(coll).create_indexes(models).await {
            tracing::warn!("could not create indexes on {coll}: {e}");
        }
    }
}

// ------------------------------------------------------- email lookups

/// Set once every stored email is known to be trimmed and lowercase. Until
/// then lookups fall back to a case-insensitive match so nobody is locked out.
static EMAILS_NORMALIZED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

pub fn escape_regex(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        if "\\^$.|?*+()[]{}".contains(c) {
            out.push('\\');
        }
        out.push(c);
    }
    out
}

/// Filter matching an account's email. After the migration this is an exact
/// match on the lowercase value, which uses the unique email index.
pub fn email_query(email: &str) -> Document {
    let email = email.trim().to_lowercase();
    if EMAILS_NORMALIZED.load(std::sync::atomic::Ordering::Relaxed) {
        doc! { "email": email }
    } else {
        doc! { "email": { "$regex": format!("^{}$", escape_regex(&email)), "$options": "i" } }
    }
}

// ------------------------------------------------------------ migrations

const ACCOUNT_COLLECTIONS: [&str; 4] = ["patients", "donors", "adminpage", "Doctors"];
const EMAIL_MIGRATION: &str = "lowercase_emails_v1";

/// One-time, idempotent data migrations, run at startup.
pub async fn run_migrations(db: &Database) {
    match migrate_emails(db).await {
        Ok(true) => {
            EMAILS_NORMALIZED.store(true, std::sync::atomic::Ordering::Relaxed);
            ensure_email_indexes(db).await;
        }
        Ok(false) => tracing::error!(
            "some emails could not be lowercased (see warnings above); using case-insensitive email lookups until they are fixed"
        ),
        Err(e) => tracing::error!("email migration failed: {e}; using case-insensitive email lookups"),
    }
}

/// Lowercases and trims every stored email. Returns false if any record was
/// skipped because the lowercase email already belongs to another record.
async fn migrate_emails(db: &Database) -> mongodb::error::Result<bool> {
    let migrations = db.collection::<Document>("migrations");
    if migrations.find_one(doc! { "_id": EMAIL_MIGRATION }).await?.is_some() {
        return Ok(true);
    }

    let mut conflicts = 0;
    let mut changed = 0;
    for name in ACCOUNT_COLLECTIONS {
        let coll = db.collection::<Document>(name);
        let needs_fix = doc! { "$expr": { "$and": [
            { "$eq": [ { "$type": "$email" }, "string" ] },
            { "$ne": [ "$email", { "$toLower": { "$trim": { "input": "$email" } } } ] },
        ] } };
        let mut cursor = coll
            .find(needs_fix)
            .with_options(mongodb::options::FindOptions::builder().projection(doc! { "email": 1 }).build())
            .await?;
        use futures::StreamExt;
        while let Some(d) = cursor.next().await {
            let d = d?;
            let (Ok(id), Ok(email)) = (d.get_object_id("_id"), d.get_str("email")) else { continue };
            let lower = email.trim().to_lowercase();
            if coll.count_documents(doc! { "email": &lower, "_id": { "$ne": id } }).await? > 0 {
                tracing::warn!("{name} {id}: email '{email}' not lowercased, '{lower}' is already used by another record");
                conflicts += 1;
                continue;
            }
            coll.update_one(doc! { "_id": id }, doc! { "$set": { "email": &lower } }).await?;
            changed += 1;
        }
    }

    if conflicts > 0 {
        return Ok(false);
    }
    migrations
        .insert_one(doc! { "_id": EMAIL_MIGRATION, "applied_at": mongodb::bson::DateTime::now(), "changed": changed })
        .await?;
    tracing::info!("email migration applied ({changed} records lowercased)");
    Ok(true)
}

/// Unique email index per account collection (partial: only string emails).
/// Replaces an older non-unique `email_1` index; keeps a plain index if the
/// data still has duplicates.
async fn ensure_email_indexes(db: &Database) {
    for name in ACCOUNT_COLLECTIONS {
        let coll = db.collection::<Document>(name);
        if let Ok(names) = coll.list_index_names().await {
            if names.iter().any(|n| n == "email_unique") {
                continue;
            }
            if names.iter().any(|n| n == "email_1") {
                let _ = coll.drop_index("email_1").await;
            }
        }
        let unique = IndexModel::builder()
            .keys(doc! { "email": 1 })
            .options(
                IndexOptions::builder()
                    .name("email_unique".to_string())
                    .unique(true)
                    .partial_filter_expression(doc! { "email": { "$type": "string" } })
                    .build(),
            )
            .build();
        if let Err(e) = coll.create_index(unique).await {
            tracing::warn!("{name}: could not create a unique email index ({e}); duplicate emails exist — keeping a plain index");
            let _ = coll.create_index(IndexModel::builder().keys(doc! { "email": 1 }).build()).await;
        }
    }
}
