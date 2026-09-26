import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Mail, Send } from "lucide-react";
import { authApi } from "../../api";
import Alert from "../common/Alert";
import { PasswordField, TextField } from "../common/FormField";
import { isEmail, validateNewPassword } from "./validation";

/** Two steps: request a one-time code by email, then set a new password. */
export default function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState("request"); // request | reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const requestCode = async (e) => {
    e?.preventDefault();
    const emailError = !email.trim() ? "Enter your email address" : !isEmail(email) ? "Enter a valid email address" : "";
    setErrors({ email: emailError });
    if (emailError) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setStep("reset");
      setMessage({ type: "success", text: res.message });
    } catch (err) {
      setMessage({ type: "error", text: err.error });
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    const found = {
      otp: /^\d{6}$/.test(otp.trim()) ? "" : "Enter the 6-digit code from your email",
      password: validateNewPassword(password),
      confirm: confirm === password ? "" : "Passwords don’t match",
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await authApi.resetPassword({ email: email.trim(), otp: otp.trim(), newPassword: password });
      navigate("/login", { replace: true, state: { notice: { type: "success", text: res.message } } });
    } catch (err) {
      setMessage({ type: "error", text: err.error });
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="auth-title">{step === "request" ? "Reset your password" : "Enter verification code"}</h1>
      <p className="auth-subtitle">
        {step === "request"
          ? "Enter the email linked to your account and we’ll send you a verification code."
          : `We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
      </p>

      {step === "request" ? (
        <form className="form" onSubmit={requestCode} noValidate>
          {message && <Alert type={message.type}>{message.text}</Alert>}
          <TextField
            label="Email"
            name="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors({});
            }}
            error={errors.email}
            autoFocus
            required
            disabled={busy}
          />
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            {busy ? "Sending code…" : "Send code"}
          </button>
        </form>
      ) : (
        <form className="form" onSubmit={resetPassword} noValidate>
          {message && <Alert type={message.type}>{message.text}</Alert>}
          <TextField
            label="Verification code"
            name="otp"
            icon={KeyRound}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            error={errors.otp}
            autoFocus
            required
            disabled={busy}
            labelAction={
              <button type="button" className="btn-ghost link-sm" style={{ border: 0, background: "none", cursor: "pointer", color: "var(--green-700)" }} onClick={requestCode} disabled={busy}>
                Resend code
              </button>
            }
          />
          <PasswordField
            label="New password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            showStrength
            required
            disabled={busy}
          />
          <PasswordField
            label="Confirm new password"
            name="confirm"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            required
            disabled={busy}
          />
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {busy ? "Updating password…" : "Update password"}
          </button>
        </form>
      )}

      <p className="auth-switch">
        <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to log in
        </Link>
      </p>
    </>
  );
}
