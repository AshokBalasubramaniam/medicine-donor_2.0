import React from "react";

export default function PageLoader({ label = "Loading…", fullScreen = false }) {
  return (
    <div className={`page-loader ${fullScreen ? "page-loader-full" : ""}`} role="status" aria-live="polite">
      <span className="spinner spinner-lg" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
