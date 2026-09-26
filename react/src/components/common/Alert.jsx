import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

export default function Alert({ type = "info", title, children, onClose }) {
  const Icon = ICONS[type] || Info;
  // Errors interrupt screen readers; everything else is announced politely.
  const liveProps = type === "error" ? { role: "alert" } : { role: "status", "aria-live": "polite" };

  return (
    <div className={`alert alert-${type}`} {...liveProps}>
      <Icon size={18} aria-hidden="true" />
      <div className="alert-body">
        {title && <strong>{title} </strong>}
        {children}
      </div>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
