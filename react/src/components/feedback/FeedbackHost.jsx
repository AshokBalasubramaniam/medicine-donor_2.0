import React, { useEffect, useRef, useSyncExternalStore } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  LogOut,
  Save,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { getSnapshot, subscribe, toast } from "./feedback";

const TOAST_ICONS = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info };
const DIALOG_ICONS = { save: Save, logout: LogOut, delete: Trash2, approve: ThumbsUp, reject: ThumbsDown };

/** Renders toasts and the confirmation dialog. Mount once near the app root. */
export default function FeedbackHost() {
  const { toasts, dialog } = useSyncExternalStore(subscribe, getSnapshot);

  return (
    <>
      <div className="toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => {
          const Icon = TOAST_ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              className={`toast toast-${t.type} ${t.leaving ? "is-leaving" : ""}`}
              role={t.type === "error" ? "alert" : "status"}
            >
              <span className="toast-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <div className="toast-body">
                {t.title && <strong>{t.title}</strong>}
                {t.message && <p>{t.message}</p>}
              </div>
              <button type="button" className="toast-close" onClick={() => toast.dismiss(t.id)} aria-label="Dismiss notification">
                <X size={15} aria-hidden="true" />
              </button>
              <span className="toast-progress" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      {dialog && <ConfirmDialog key={dialog.id} dialog={dialog} />}
    </>
  );
}

function ConfirmDialog({ dialog }) {
  const panelRef = useRef(null);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const Icon = DIALOG_ICONS[dialog.icon] || (dialog.tone === "danger" ? AlertTriangle : HelpCircle);

  useEffect(() => {
    const previous = document.activeElement;
    // Destructive actions default focus to Cancel, others to Confirm.
    (dialog.tone === "danger" ? cancelRef : confirmRef).current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [dialog.tone]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      dialog.resolve(false);
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const focusables = panelRef.current.querySelectorAll("button");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className={`dialog-backdrop ${dialog.leaving ? "is-leaving" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && dialog.resolve(false)}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        className={`dialog dialog-${dialog.tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={dialog.message ? "confirm-message" : undefined}
      >
        <span className="dialog-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <h2 id="confirm-title">{dialog.title}</h2>
        {dialog.message && <p id="confirm-message">{dialog.message}</p>}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={() => dialog.resolve(false)}>
            {dialog.cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${dialog.tone === "danger" ? "btn-danger" : "btn-primary"}`}
            onClick={() => dialog.resolve(true)}
          >
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
