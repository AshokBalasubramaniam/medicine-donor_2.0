import React, { useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { homeFor } from "../../auth/roles";
import PageLoader from "../common/PageLoader";

/**
 * Login/register/forgot-password pages. Users who arrive already signed in
 * go straight to their dashboard. Users who sign in *on* these pages are
 * navigated by the form itself (so it can show a success state first).
 */
export default function PublicOnlyRoute() {
  const { isAuthenticated, status, user } = useSelector((s) => s.auth);
  const signedInOnArrival = useRef(null);

  if (status === "checking") {
    return <PageLoader label="Loading…" fullScreen />;
  }

  if (signedInOnArrival.current === null) {
    signedInOnArrival.current = isAuthenticated;
  }

  if (signedInOnArrival.current && isAuthenticated) {
    return <Navigate to={homeFor(user?.role)} replace />;
  }

  return <Outlet />;
}
