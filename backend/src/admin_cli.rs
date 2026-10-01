//! `cargo run -- create-admin <email> [name]`
//!
//! Creates an admin account in the `adminpage` collection, or resets the
//! password if an admin with that email already exists. The password is read
//! from the `ADMIN_PASSWORD` env var, or prompted for, so it never has to be
//! typed as a command-line argument.

use anyhow::{bail, Context};
use mongodb::bson::{doc, DateTime, Document};
use std::io::{self, BufRead, Write};

use crate::state::get_db;
use crate::utils::password::hash_password;

pub async fn create_admin(args: &[String]) -> anyhow::Result<()> {
    let Some(email) = args.first().map(|e| e.trim().to_lowercase()) else {
        bail!("usage: cargo run -- create-admin <email> [name]");
    };
    if !email.contains('@') || email.starts_with('@') || email.ends_with('@') {
        bail!("'{email}' is not a valid email address");
    }
    let name = args.get(1).cloned().unwrap_or_else(|| "Administrator".into());

    let password = match std::env::var("ADMIN_PASSWORD") {
        Ok(p) if !p.is_empty() => p,
        _ => {
            print!("Password for {email}: ");
            io::stdout().flush()?;
            let mut line = String::new();
            io::stdin().lock().read_line(&mut line)?;
            line.trim_end_matches(['\r', '\n']).to_string()
        }
    };
    if password.len() < 8
        || !password.chars().any(|c| c.is_ascii_alphabetic())
        || !password.chars().any(|c| c.is_ascii_digit())
    {
        bail!("Password must be at least 8 characters and include a letter and a number");
    }

    let hashed = hash_password(&password).map_err(|e| anyhow::anyhow!("hashing failed: {e}"))?;
    let coll = get_db().await?.collection::<Document>("adminpage");

    // Login matches emails case-insensitively, so do the same here.
    let same_email = doc! { "$expr": { "$eq": [ { "$toLower": "$email" }, &email ] } };
    let existing = coll
        .find_one(same_email.clone(), None)
        .await
        .context("could not read the adminpage collection")?;

    if existing.is_some() {
        coll.update_one(
            same_email,
            doc! { "$set": { "password": &hashed, "name": &name }, "$unset": { "refresh_tokens": "" } },
            None,
        )
        .await
        .context("could not update the admin account")?;
        println!("Admin {email} already existed: password reset and signed out everywhere.");
    } else {
        coll.insert_one(
            doc! {
                "name": &name,
                "email": &email,
                "password": &hashed,
                "created_at": DateTime::now(),
            },
            None,
        )
        .await
        .context("could not create the admin account")?;
        println!("Admin {email} created. Log in at /login with this email and password.");
    }
    Ok(())
}
