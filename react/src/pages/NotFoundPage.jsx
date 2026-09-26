import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { homeFor } from "../auth/roles";

export default function NotFoundPage() {
  const { isAuthenticated, user } = useSelector((s) => s.auth);

  return (
    <main className="status-page">
      <div className="card">
        <p className="status-code">404</p>
        <h1 style={{ fontSize: 22, marginTop: 8 }}>Page not found</h1>
        <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link
          to={isAuthenticated ? homeFor(user?.role) : "/"}
          className="btn btn-primary"
          style={{ marginTop: 24 }}
        >
          {isAuthenticated ? "Back to dashboard" : "Back to home"}
        </Link>
      </div>
    </main>
  );
}
