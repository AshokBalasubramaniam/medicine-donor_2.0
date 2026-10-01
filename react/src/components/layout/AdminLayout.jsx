import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, matchPath, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  CheckCircle2,
  Clock,
  Cross,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Trophy,
  XCircle,
} from "lucide-react";
import Alert from "../common/Alert";
import { logout } from "../../store/authSlice";
import { confirm, toast } from "../feedback/feedback";
import { admingetallpatientdetails } from "../../api";
import { statusOf } from "../admin/adminData";
import "../patients/patient-dashboard.css";
import "../admin/admin-edit.css";
import "../admin/admin-portal.css";

const NAV = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/patients/pending", label: "Pending review", icon: Clock, count: "pending" },
  { to: "/admin/patients/approved", label: "Approved", icon: CheckCircle2 },
  { to: "/admin/patients/completed", label: "Completed", icon: Trophy },
  { to: "/admin/patients/rejected", label: "Rejected", icon: XCircle },
  { to: "/admin/doctors", label: "Doctors", icon: Stethoscope },
];

const SUBTITLES = {
  "/admin/dashboard": "Applications, funding and donations at a glance",
  "/admin/patients/pending": "Review new applications",
  "/admin/patients/approved": "Open cases visible to donors",
  "/admin/patients/completed": "Fully funded cases",
  "/admin/patients/rejected": "Applications that were not approved",
  "/admin/doctors": "Register and manage doctors",
};

export default function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const [navOpen, setNavOpen] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Patients are shared by every admin page through the outlet context.
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    try {
      const data = await admingetallpatientdetails();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.error || "Couldn’t load patients. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => setNavOpen(false), [location.pathname]);

  const current =
    NAV.find((n) => matchPath({ path: n.to, end: true }, location.pathname)) ||
    (location.pathname.endsWith("/review")
      ? { label: "Review application" }
      : location.pathname.startsWith("/admin/patients/")
        ? { label: "Patient details" }
        : NAV[0]);

  useEffect(() => {
    document.title = `${current.label} · Medicine Donor Admin`;
  }, [current.label]);

  const counts = { pending: patients.filter((p) => statusOf(p) === "pending").length };

  const onLogout = async () => {
    const ok = await confirm({
      title: "Log out?",
      message: "You’ll need to sign in again to access the admin portal.",
      confirmText: "Log out",
      icon: "logout",
    });
    if (!ok) return;
    setLoggingOut(true);
    await dispatch(logout());
    toast.success("See you soon!", "Logged out");
    navigate("/login", { replace: true });
  };

  return (
    <div className={`pd-shell ap-shell ${navOpen ? "is-nav-open" : ""}`}>
      <aside className="pd-sidebar" aria-label="Sidebar">
        <div className="pd-sidebar-brand">
          <div className="pd-logo">
            <span className="pd-logo-mark" aria-hidden="true">
              <Cross size={22} strokeWidth={2.5} fill="currentColor" />
            </span>
            <span>
              <strong>Medicine Donor</strong>
              <small>Admin Portal</small>
            </span>
          </div>
        </div>

        <nav className="pd-nav" aria-label="Admin">
          {NAV.map(({ to, label, icon: Icon, count }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `pd-nav-link ${isActive ? "is-active" : ""}`}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
              {count && counts[count] > 0 && <span className="ap-nav-count">{counts[count]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="pd-help">
          <div className="pd-help-row">
            <span className="pd-help-icon" aria-hidden="true">
              <Headset size={24} />
            </span>
            <div>
              <p className="pd-help-title">Admin tips</p>
              <p className="pd-help-text">Set the required amount while reviewing — donors only see approved cases with an amount.</p>
            </div>
          </div>
          <button type="button" className="pd-logout-side" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? <span className="spinner" aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
            Log out
          </button>
        </div>
      </aside>

      <div className="pd-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />

      <div className="pd-main">
        <header className="pd-topbar">
          <button
            type="button"
            className="pd-menu-btn"
            aria-label="Open menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <div className="pd-topbar-title">
            {current.label}
            <small>{SUBTITLES[current.to] || "Administrator workspace"}</small>
          </div>
          <div className="pd-topbar-right">
            <div className="pd-user">
              <span className="pd-user-avatar ap-avatar" aria-hidden="true">
                {(user?.name || "A")[0].toUpperCase()}
              </span>
              <span className="pd-user-text">
                <strong>{user?.name || "Administrator"}</strong>
                <span>{user?.email}</span>
              </span>
            </div>
          </div>
        </header>

        {notice && (
          <div className="pd-notice">
            <Alert type={notice.type || "info"} onClose={() => setNotice(null)}>
              {notice.text}
            </Alert>
          </div>
        )}

        <main id="dash-content" className="pd-content" tabIndex={-1}>
          <Outlet context={{ patients, loading, error, reload }} />
        </main>
      </div>
    </div>
  );
}
