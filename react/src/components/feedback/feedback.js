// App-wide feedback: toast popups and confirmation dialogs.
//
// Kept outside React so any screen (including the older class-free legacy
// components) can call `toast.success(...)` or `await confirm({...})`
// without prop drilling. <FeedbackHost /> renders the current state.

let state = { toasts: [], dialog: null };
const listeners = new Set();
let nextId = 1;

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = () => state;

// ------------------------------------------------------------------ toasts

const EXIT_MS = 220;

function dismiss(id) {
  const t = state.toasts.find((x) => x.id === id);
  if (!t || t.leaving) return;
  setState({ toasts: state.toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x)) });
  setTimeout(() => setState({ toasts: state.toasts.filter((x) => x.id !== id) }), EXIT_MS);
}

function show({ type = "info", title, message, duration }) {
  const id = nextId++;
  const toastItem = { id, type, title, message };
  // Keep at most 4 on screen.
  const toasts = [...state.toasts.filter((t) => !t.leaving).slice(-3), toastItem];
  setState({ toasts });
  const ms = duration ?? (type === "error" ? 6000 : 3500);
  if (ms > 0) setTimeout(() => dismiss(id), ms);
  return id;
}

export const toast = {
  show,
  dismiss,
  success: (message, title = "Saved") => show({ type: "success", title, message }),
  error: (message, title = "Something went wrong") => show({ type: "error", title, message }),
  info: (message, title) => show({ type: "info", title, message }),
  warning: (message, title) => show({ type: "warning", title, message }),
};

// ------------------------------------------------------------------ confirm

/**
 * Opens a confirmation dialog and resolves to true (confirmed) or false.
 *   const ok = await confirm({ title: "Delete doctor?", tone: "danger" });
 */
export function confirm({
  title = "Are you sure?",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "primary", // primary | danger
  icon, // save | logout | delete | approve | reject
} = {}) {
  // Only one dialog at a time: a new request cancels the previous one.
  if (state.dialog) state.dialog.resolve(false);

  return new Promise((resolve) => {
    const dialog = {
      id: nextId++,
      title,
      message,
      confirmText,
      cancelText,
      tone,
      icon,
      resolve: (value) => {
        if (state.dialog?.id !== dialog.id) return;
        setState({ dialog: { ...dialog, leaving: true } });
        setTimeout(() => {
          if (state.dialog?.id === dialog.id) setState({ dialog: null });
        }, EXIT_MS);
        resolve(value);
      },
    };
    setState({ dialog });
  });
}
