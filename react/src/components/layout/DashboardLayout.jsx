import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, matchPath, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  CheckCircle2,
  Clock,
  HandHeart,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Trophy,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import Brand from "../common/Brand";
import Alert from "../common/Alert";
import { logout } from "../../store/authSlice";
import { ROLE_LABEL, homeFor } from "../../auth/roles";
import { confirm, toast } from "../feedback/feedback";
import useReveal from "../../hooks/useReveal";

const NAV_BY_ROLE = {
  patient: [{ to: "/patient/dashboard", label: "My dashboard", icon: UserRound }],
  donor: [{ to: "/donor/dashboard", label: "Patients in need", icon: HandHeart }],
  admin: [
    { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/patients", label: "All patients", icon: Users, end: true },
    { to: "/admin/patients/pending", label: "Pending", icon: Clock },
    { to: "/admin/patients/approved", label: "Approved", icon: CheckCircle2 },
    { to: "/admin/patients/rejected", label: "Rejected", icon: XCircle },
    { to: "/admin/patients/completed", label: "Completed", icon: Trophy },
    { to: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  ],
};

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U").concat(parts[1]?.[0] || "").toUpperCase();
}

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const [navOpen, setNavOpen] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || null);
  const [loggingOut, setLoggingOut] = useState(false);
  const contentRef = useRef(null);
  useReveal(contentRef, location.pathname);

  const role = user?.role;
  const items = NAV_BY_ROLE[role] || [];
  const current =
    items.find((i) => matchPath({ path: i.to, end: true }, location.pathname)) ||
    (location.pathname.startsWith("/admin/patients/") ? { label: "Patient details" } : items[0]);

  // Pick up notices passed via navigation (e.g. after a role redirect), then
  // clear them from history so a refresh doesn't show them again.
  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => setNavOpen(false), [location.pathname]);

  useEffect(() => {
    document.title = `${current?.label || "Dashboard"} · Medicine Donor System`;
  }, [current?.label]);

  const onLogout = async () => {
    const ok = await confirm({
      title: "Log out?",
      message: "You’ll need to sign in again to access your dashboard.",
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
    <div className={`dash ${navOpen ? "is-nav-open" : ""}`}>
      <a href="#dash-content" className="skip-link">
        Skip to content
      </a>

      <aside className="dash-sidebar" aria-label="Sidebar">
        <Brand to={homeFor(role)} subtitle={`${ROLE_LABEL[role] || ""} portal`} />

        <nav className="dash-nav" aria-label="Dashboard">
          <span className="dash-nav-label">Menu</span>
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="dash-link">
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-foot">
          <div className="dash-help">
            <strong>Need help?</strong>
            Contact the hospital administration team for support with your account.
          </div>
          <button type="button" className="btn btn-secondary btn-block" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? <span className="spinner" aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
            Log out
          </button>
        </div>
      </aside>

      <div className="dash-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />

      <div className="dash-main">
        <header className="dash-topbar">
          <button
            type="button"
            className="nav-toggle dash-menu-btn"
            aria-label="Open menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <div className="dash-topbar-title">
            {current?.label || "Dashboard"}
            <small>{ROLE_LABEL[role]} workspace</small>
          </div>

          <div className="dash-topbar-right">
            <span className={`badge ${role === "admin" ? "badge-blue" : "badge-green"}`}>{ROLE_LABEL[role]}</span>
            <div className="user-chip">
              <span className="avatar" aria-hidden="true">
                {initials(user?.name)}
              </span>
              <span className="user-chip-text">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout} disabled={loggingOut}>
              <LogOut size={16} aria-hidden="true" />
              <span className="btn-label">Log out</span>
            </button>
          </div>
        </header>

        {notice && (
          <div className="dash-notice">
            <Alert type={notice.type || "info"} onClose={() => setNotice(null)}>
              {notice.text}
            </Alert>
          </div>
        )}

        <main id="dash-content" className="dash-content" tabIndex={-1}>
          <div key={location.pathname} ref={contentRef} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
