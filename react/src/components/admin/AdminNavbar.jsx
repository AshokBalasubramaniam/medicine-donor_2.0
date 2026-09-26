import React from "react";
import { UserPlus } from "lucide-react";

/**
 * Admin page toolbar. Navigation between admin pages now lives in the
 * DashboardLayout sidebar; this only renders page-level actions.
 */
function AdminNavbar({ onAddDoctor }) {
  if (!onAddDoctor) return null;

  return (
    <div className="admin-toolbar">
      <button type="button" className="btn btn-primary btn-sm" onClick={onAddDoctor}>
        <UserPlus size={16} aria-hidden="true" />
        Add doctor
      </button>
    </div>
  );
}

export default AdminNavbar;
