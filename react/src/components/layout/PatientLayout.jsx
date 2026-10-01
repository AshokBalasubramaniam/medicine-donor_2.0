import React, { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ClipboardList,
  Cross,
  FileClock,
  HandHeart,
  IdCard,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  UserRoundPen,
} from "lucide-react";
import Alert from "../common/Alert";
import { logout } from "../../store/authSlice";
import { confirm, toast } from "../feedback/feedback";
import "../patients/patient-dashboard.css";

// Each entry scrolls to a section rendered by PatientDetails.
const PATIENT_SECTIONS = [
  { id: "pd-top", label: "Dashboard", icon: LayoutDashboard },
  { id: "pd-profile", label: "My Profile", icon: UserRound },
  { id: "pd-medical", label: "Medical Information", icon: ClipboardList },
  { id: "pd-history", label: "Medical History", icon: FileClock },
  { id: "pd-status", label: "Application Status", icon: HandHeart },
  { id: "pd-personal", label: "Personal & Contact", icon: IdCard },
  { id: "pd-edit", label: "Edit Profile", icon: UserRoundPen },
];

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "P").concat(parts[1]?.[0] || "").toUpperCase();
}

function Logo() {
  return (
    <div className="pd-logo">
      <span className="pd-logo-mark" aria-hidden="true">
        <Cross size={22} strokeWidth={2.5} fill="currentColor" />
      </span>
      <span>
        <strong>Medicine Donor</strong>
        <small>Patient Portal</small>
      </span>
    </div>
  );
}

export default function PatientLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const [active, setActive] = useState("pd-top");
  const [navOpen, setNavOpen] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    document.title = "My dashboard · Medicine Donor System";
  }, []);

  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  // Highlight the section currently in view. Sections register themselves
  // through `sectionRef` (outlet context) as they mount, so nothing polls.
  const observerRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    observerRef.current = observer;
    document.querySelectorAll(".pd-page section[id]").forEach((n) => observer.observe(n));
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []);
  const sectionRef = useCallback((el) => {
    if (el) observerRef.current?.observe(el);
  }, []);

  const goTo = (id) => {
    setActive(id);
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
    <div className={`pd-shell ${navOpen ? "is-nav-open" : ""}`}>
      <aside className="pd-sidebar" aria-label="Sidebar">
        <div className="pd-sidebar-brand">
          <Logo />
        </div>

        <nav className="pd-nav" aria-label="Dashboard sections">
          {PATIENT_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
              className={`pd-nav-link ${active === id ? "is-active" : ""}`}
              aria-current={active === id ? "true" : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="pd-help">
          <div className="pd-help-row">
            <span className="pd-help-icon" aria-hidden="true">
              <Headset size={24} />
            </span>
            <div>
              <p className="pd-help-title">Need Help?</p>
              <p className="pd-help-text">Contact the hospital administration team for support with your account.</p>
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
            My dashboard
            <small>Patient workspace</small>
          </div>

          <div className="pd-topbar-right">
            <div className="pd-user">
              <span className="pd-user-avatar" aria-hidden="true">
                {initials(user?.name)}
              </span>
              <span className="pd-user-text">
                <strong>{user?.name}</strong>
                <span>Patient</span>
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
          <Outlet context={{ sectionRef }} />
        </main>
      </div>
    </div>
  );
}
