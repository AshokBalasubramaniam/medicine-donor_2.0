import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { HandHeart, Mail, Phone, Stethoscope, UserPlus, UserRound } from "lucide-react";
import { registerUser } from "../../store/authSlice";
import { homeFor } from "../../auth/roles";
import Alert from "../common/Alert";
import { PasswordField, TextField } from "../common/FormField";
import { isEmail, isPhone, validateNewPassword } from "./validation";

const FIELDS = ["name", "email", "phone", "password", "confirmPassword"];

// Only non-admin account types can be chosen; the backend enforces this too
// and decides the final role.
const ACCOUNT_TYPES = [
  { value: "patient", title: "I need support", desc: "Request help with medicines", icon: Stethoscope },
  { value: "donor", title: "I want to donate", desc: "Support verified patients", icon: HandHeart },
];

function validate(v) {
  return {
    name: v.name.trim().length < 2 ? "Enter your full name" : "",
    email: !v.email.trim() ? "Enter your email address" : !isEmail(v.email) ? "Enter a valid email address" : "",
    phone: !v.phone.trim() ? "Enter your phone number" : !isPhone(v.phone) ? "Enter a valid phone number (10–15 digits)" : "",
    password: validateNewPassword(v.password),
    confirmPassword: !v.confirmPassword
      ? "Confirm your password"
      : v.confirmPassword !== v.password
        ? "Passwords don’t match"
        : "",
  };
}

export default function RegisterForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const refs = useRef({});

  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    accountType: "patient",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success
  const busy = status !== "idle";

  const bindRef = (name) => (el) => {
    refs.current[name] = el;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (serverError) setServerError("");
  };

  const onBlur = (e) => {
    const { name } = e.target;
    if (!values[name]) return;
    setErrors((prev) => ({ ...prev, [name]: validate(values)[name] }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    const firstInvalid = FIELDS.find((f) => found[f]);
    if (firstInvalid) {
      refs.current[firstInvalid]?.focus();
      return;
    }

    setStatus("submitting");
    setServerError("");
    const result = await dispatch(
      registerUser({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
        accountType: values.accountType,
      })
    );

    if (registerUser.fulfilled.match(result)) {
      setStatus("success");
      // Brief confirmation before moving to the dashboard.
      setTimeout(() => navigate(homeFor(result.payload.role), { replace: true }), 1200);
      return;
    }

    setStatus("idle");
    const { message, status: code } = result.payload || {};
    if (code === 409 && /email/i.test(message || "")) {
      setErrors((prev) => ({ ...prev, email: message }));
      refs.current.email?.focus();
    } else if (code === 409 && /phone/i.test(message || "")) {
      setErrors((prev) => ({ ...prev, phone: message }));
      refs.current.phone?.focus();
    } else {
      setServerError(message || "Unable to create your account. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <>
        <h1 className="auth-title">You’re all set!</h1>
        <p className="auth-subtitle">Your account has been created.</p>
        <Alert type="success">Taking you to your dashboard…</Alert>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-subtitle">Join the community of patients and donors. It only takes a minute.</p>

      <form className="form" onSubmit={onSubmit} noValidate>
        {serverError && <Alert type="error">{serverError}</Alert>}

        <fieldset className="segmented" disabled={busy}>
          <legend className="field-label">I’m joining as</legend>
          {ACCOUNT_TYPES.map(({ value, title, desc, icon: Icon }) => (
            <label key={value} className="segment">
              <input
                type="radio"
                name="accountType"
                value={value}
                checked={values.accountType === value}
                onChange={onChange}
              />
              <span className="segment-icon" aria-hidden="true">
                <Icon size={17} />
              </span>
              <span>
                <span className="segment-title">{title}</span>
                <span className="segment-desc">{desc}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <TextField
          ref={bindRef("name")}
          label="Full name"
          name="name"
          icon={UserRound}
          autoComplete="name"
          placeholder="e.g. Priya Sharma"
          value={values.name}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.name}
          required
          disabled={busy}
        />

        <div className="form-row">
          <TextField
            ref={bindRef("email")}
            label="Email"
            name="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.email}
            required
            disabled={busy}
          />
          <TextField
            ref={bindRef("phone")}
            label="Phone"
            name="phone"
            type="tel"
            icon={Phone}
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            value={values.phone}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.phone}
            required
            disabled={busy}
          />
        </div>

        <PasswordField
          ref={bindRef("password")}
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={values.password}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.password}
          showStrength
          required
          disabled={busy}
        />

        <PasswordField
          ref={bindRef("confirmPassword")}
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={values.confirmPassword}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.confirmPassword}
          required
          disabled={busy}
        />

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Creating account…
            </>
          ) : (
            <>
              <UserPlus size={18} aria-hidden="true" />
              Create account
            </>
          )}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </>
  );
}
