import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { HandHeart, HeartHandshake, LayoutGrid, LogOut, Menu, Phone, Search, Users, X } from "lucide-react";
import Alert from "../common/Alert";
import { logout } from "../../store/authSlice";
import { confirm, toast } from "../feedback/feedback";
import { admingetallpatientdetails, getMyDonations } from "../../api";
import "../donor/donor-dashboard.css";

const NAV = [
  { to: "/donor/dashboard", label: "Overview", icon: LayoutGrid },
  { to: "/donor/patients", label: "Patients in need", icon: Users },
  { to: "/donor/donate", label: "Make a donation", icon: HandHeart },
  { to: "/donor/donations", label: "My donations", icon: HeartHandshake },
];

function Logo() {
  return (
    <div className="dn-logo">
      <div className="dn-logo-mark" aria-hidden="true">
        <span />
        <span />
      </div>
      <div>
        <strong>Medicine Donor</strong>
        <small>Donor community</small>
      </div>
    </div>
  );
}

export default function DonorLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [query, setQuery] = useState("");

  // Shared by every donor page through the outlet context.
  const [patients, setPatients] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    try {
      const [p, d] = await Promise.all([admingetallpatientdetails(), getMyDonations().catch(() => [])]);
      setPatients(Array.isArray(p) ? p : []);
      setDonations(Array.isArray(d) ? d : []);
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

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const current = NAV.find((n) => location.pathname.startsWith(n.to));
    document.title = `${current?.label || "Donor"} · Medicine Donor System`;
  }, [location.pathname]);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/donor/patients${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
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

  const firstName = (user?.name || "").split(/\s+/)[0] || "there";

  return (
    <div className="dn-shell">
      {open && <button type="button" className="dn-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}

      <aside className={`dn-sidebar ${open ? "is-open" : ""}`} aria-label="Sidebar">
        <div className="dn-sidebar-top">
          <Logo />
          <button type="button" className="dn-icon-btn dn-sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="dn-nav" aria-label="Main navigation">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `dn-nav-item ${isActive ? "is-active" : ""}`}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dn-support">
          <div className="dn-support-icon" aria-hidden="true">
            <Phone size={20} />
          </div>
          <strong>Need a hand?</strong>
          <p>The hospital administration team can help with donations or your account.</p>
        </div>
        <button type="button" className="dn-logout" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? <span className="spinner" aria-hidden="true" /> : <LogOut size={18} aria-hidden="true" />}
          Log out
        </button>
      </aside>

      <div className="dn-main">
        <header className="dn-topbar">
          <button type="button" className="dn-icon-btn dn-mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={22} />
          </button>
          <div className="dn-mobile-logo">
            <Logo />
          </div>
          <form className="dn-top-search" onSubmit={onSearch} role="search">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients, conditions, hospitals, locations..."
              aria-label="Search patients"
            />
          </form>
          <div className="dn-profile-chip">
            <div className="dn-profile-avatar" aria-hidden="true">
              {(user?.name || "D")[0].toUpperCase()}
            </div>
            <div>
              <strong>{user?.name || firstName}</strong>
              <small>Donor account</small>
            </div>
          </div>
        </header>

        {notice && (
          <div className="dn-notice">
            <Alert type={notice.type || "info"} onClose={() => setNotice(null)}>
              {notice.text}
            </Alert>
          </div>
        )}

        <main id="dash-content" className="dn-page" tabIndex={-1}>
          <Outlet context={{ patients, donations, loading, error, reload, user }} />
        </main>
      </div>
    </div>
  );
}
