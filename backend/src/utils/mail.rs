//! Password-reset mail. SMTP settings come from the environment:
//! SMTP_USERNAME, SMTP_PASSWORD (Gmail: an App Password), optional SMTP_FROM
//! and SMTP_HOST (default smtp.gmail.com).

use lettre::message::header;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

pub async fn send_otp_mail(to: &str, otp: &str) -> Result<(), String> {
    let env = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
    let (username, password) = match (env("SMTP_USERNAME"), env("SMTP_PASSWORD")) {
        (Some(u), Some(p)) => (u, p),
        _ => return Err("SMTP_USERNAME / SMTP_PASSWORD are not configured".into()),
    };
    let from = env("SMTP_FROM").unwrap_or_else(|| format!("Medicine Donor System <{}>", username));
    let host = env("SMTP_HOST").unwrap_or_else(|| "smtp.gmail.com".into());

    let email = Message::builder()
        .from(from.parse().map_err(|e| format!("invalid SMTP_FROM: {}", e))?)
        .to(to.parse().map_err(|e| format!("invalid recipient: {}", e))?)
        .subject("Your password reset code")
        .header(header::ContentType::TEXT_PLAIN)
        .body(format!(
            "Your Medicine Donor verification code is: {otp}\n\nIt expires in 10 minutes. If you didn't ask for this, you can ignore this email."
        ))
        .map_err(|e| e.to_string())?;

    // Async transport: sending never blocks a runtime worker thread.
    let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(&host)
        .map_err(|e| e.to_string())?
        .credentials(Credentials::new(username, password))
        .build();
    mailer.send(email).await.map(|_| ()).map_err(|e| e.to_string())
}
