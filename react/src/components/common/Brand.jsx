import React from "react";
import { Link } from "react-router-dom";
import { Cross } from "lucide-react";

export default function Brand({ to = "/", subtitle, className = "" }) {
  return (
    <Link to={to} className={`brand ${className}`} aria-label="Medicine Donor System home">
      <span className="brand-mark" aria-hidden="true">
        <Cross size={18} strokeWidth={2.5} fill="currentColor" />
      </span>
      <span className="brand-text">
        Medicine Donor
        {subtitle && <small>{subtitle}</small>}
      </span>
    </Link>
  );
}
