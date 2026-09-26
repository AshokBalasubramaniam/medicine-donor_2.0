import React, { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { LogIn, UserRound } from "lucide-react";
import { loginUser } from "../../store/authSlice";
import { homeFor } from "../../auth/roles";
import Alert from "../common/Alert";
import { PasswordField, TextField } from "../common/FormField";
import { validateIdentifier } from "./validation";

/** Only return to a deep link if it belongs to the signed-in user's area. */
function destinationFor(user, from) {
  const home = homeFor(user.role);
  if (from && from.startsWith(`/${user.role}/`)) return from;
  return home;
}

export default function LoginForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice;
  const from = location.state?.from?.pathname;

  const [values, setValues] = useState({ identifier: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const identifierRef = useRef(null);
  const passwordRef = useRef(null);

  const validate = (v) => ({
    identifier: validateIdentifier(v.identifier),
    password: v.password ? "" : "Enter your password",
  });

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (serverError) setServerError("");
  };

  const onBlur = (e) => {
    const { name } = e.target;
    if (!values[name]) return; // don't nag on an untouched empty field
    setErrors((prev) => ({ ...prev, [name]: validate(values)[name] }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (found.identifier) return identifierRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setSubmitting(true);
    setServerError("");
    const result = await dispatch(
      loginUser({
        identifier: values.identifier.trim(),
        password: values.password,
        rememberMe: values.rememberMe,
      })
    );
    if (loginUser.fulfilled.match(result)) {
      navigate(destinationFor(result.payload, from), { replace: true });
    } else {
      setSubmitting(false);
      setServerError(result.payload || "Unable to log in. Please try again.");
      setValues((prev) => ({ ...prev, password: "" }));
      passwordRef.current?.focus();
    }
  };

  return (
    <>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Log in to continue to your dashboard.</p>

      <form className="form" onSubmit={onSubmit} noValidate aria-describedby={serverError ? "login-error" : undefined}>
        {notice && !serverError && <Alert type={notice.type || "info"}>{notice.text}</Alert>}
        {serverError && (
          <div id="login-error">
            <Alert type="error">{serverError}</Alert>
          </div>
        )}

        <TextField
          ref={identifierRef}
          label="Email or phone"
          name="identifier"
          icon={UserRound}
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="you@example.com or phone number"
          value={values.identifier}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.identifier}
          autoFocus
          required
          disabled={submitting}
        />

        <PasswordField
          ref={passwordRef}
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={values.password}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.password}
          required
          disabled={submitting}
          labelAction={
            <Link to="/forgot-password" className="link-sm">
              Forgot password?
            </Link>
          }
        />

        <label className="checkbox">
          <input
            type="checkbox"
            name="rememberMe"
            checked={values.rememberMe}
            onChange={onChange}
            disabled={submitting}
          />
          Remember me for 30 days
        </label>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Logging in…
            </>
          ) : (
            <>
              <LogIn size={18} aria-hidden="true" />
              Log in
            </>
          )}
        </button>
      </form>

      <p className="auth-switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </>
  );
}
