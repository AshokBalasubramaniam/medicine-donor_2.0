import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import PageLoader from "../common/PageLoader";

/**
 * Renders its children (or nested routes) only for signed-in users.
 * While a stored session is being restored, a loader is shown instead of
 * bouncing the user to the login page.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, status } = useSelector((s) => s.auth);
  const location = useLocation();

  if (status === "checking") {
    return <PageLoader label="Restoring your session…" fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
