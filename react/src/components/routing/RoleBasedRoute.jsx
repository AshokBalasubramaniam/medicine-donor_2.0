import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { homeFor } from "../../auth/roles";
import ProtectedRoute from "./ProtectedRoute";

/**
 * Restricts a route to the given roles. Users with another role are sent to
 * their own dashboard with a notice. This is a UX guard only: the backend
 * independently authorizes every request by the role in the signed token.
 */
export default function RoleBasedRoute({ allow, children }) {
  return (
    <ProtectedRoute>
      <RoleGate allow={allow}>{children}</RoleGate>
    </ProtectedRoute>
  );
}

function RoleGate({ allow, children }) {
  const role = useSelector((s) => s.auth.user?.role);

  if (!allow.includes(role)) {
    return (
      <Navigate
        to={homeFor(role)}
        replace
        state={{
          notice: {
            type: "warning",
            text: "You don’t have access to that page, so we brought you to your dashboard.",
          },
        }}
      />
    );
  }

  return children ?? <Outlet />;
}
