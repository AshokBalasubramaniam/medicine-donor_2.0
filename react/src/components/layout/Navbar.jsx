import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import Brand from "../common/Brand";
import { homeFor } from "../../auth/roles";

const LINKS = [
  { id: "home", label: "Home" },
  { id: "how-it-works", label: "How It Works" },
  { id: "about", label: "About" },
];

export default function Navbar() {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section currently in view.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const action = isAuthenticated ? (
    <Link to={homeFor(user?.role)} className="btn btn-primary btn-sm">
      <LayoutDashboard size={16} aria-hidden="true" />
      Dashboard
    </Link>
  ) : (
    <Link to="/login" className="btn btn-secondary btn-sm">
      <LogIn size={16} aria-hidden="true" />
      Login
    </Link>
  );

  const links = (onClick) =>
    LINKS.map(({ id, label }) => (
      <a
        key={id}
        href={`#${id}`}
        className={`nav-link ${active === id ? "is-active" : ""}`}
        aria-current={active === id ? "true" : undefined}
        onClick={onClick}
      >
        {label}
      </a>
    ));

  return (
    <header className={`navbar ${scrolled ? "is-scrolled" : ""}`}>
      <nav className="container navbar-inner" aria-label="Main">
        <Brand />

        <ul className="nav-links">
          {links().map((link) => (
            <li key={link.key}>{link}</li>
          ))}
        </ul>

        <div className="nav-actions">
          <span className="nav-desktop-only">{action}</span>
          <button
            type="button"
            className="nav-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      <div id="mobile-nav" className={`nav-mobile ${open ? "is-open" : ""}`}>
        {links(() => setOpen(false))}
        {action}
      </div>
    </header>
  );
}
