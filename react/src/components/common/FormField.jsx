import React, { useId, useState } from "react";
import { AlertCircle, Eye, EyeOff, Lock } from "lucide-react";
import { passwordStrength } from "../auth/validation";

/** Labelled text input with optional leading icon, hint and error message. */
export function TextField({ label, icon: Icon, error, hint, labelAction, id, className = "", ...inputProps }) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field ${className}`}>
      <div className="field-label-row">
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
        {labelAction}
      </div>
      <div className="input-wrap">
        {Icon && <Icon className="input-icon" size={18} aria-hidden="true" />}
        <input
          id={inputId}
          className="input"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
      </div>
      {hint && !error && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

/** Password input with a show/hide toggle and optional strength meter. */
export function PasswordField({ label = "Password", error, hint, labelAction, showStrength = false, id, value, ...inputProps }) {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const strength = showStrength ? passwordStrength(value) : null;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
        {labelAction}
      </div>
      <div className="input-wrap">
        <Lock className="input-icon" size={18} aria-hidden="true" />
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className="input input-has-action"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          value={value}
          {...inputProps}
        />
        <button
          type="button"
          className="input-action"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={inputId}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {showStrength && value && (
        <>
          <div className="strength" data-score={strength.score} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <span className="field-hint" aria-live="polite">
            Password strength: {strength.label}
          </span>
        </>
      )}
      {hint && !error && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

function FieldError({ id, children }) {
  return (
    <span id={id} className="field-error">
      <AlertCircle size={14} aria-hidden="true" />
      {children}
    </span>
  );
}
