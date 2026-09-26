import React from "react";
import { BadgeCheck, Lock, ShieldCheck } from "lucide-react";
import Brand from "../common/Brand";
import HealthcareIllustration from "../common/HealthcareIllustration";

/**
 * Two-column auth shell: illustration on the left, form on the right.
 * Stacks vertically (form first) on smaller screens.
 */
export default function AuthLayout({ asideTitle, asideText, topRight, children }) {
  return (
    <div className="auth-page">
      <a href="#auth-main" className="skip-link">
        Skip to form
      </a>

      <aside className="auth-aside" aria-label="About Medicine Donor System">
        <Brand />
        <div className="auth-aside-body">
          <HealthcareIllustration />
          <div>
            <h2>{asideTitle}</h2>
            <p>{asideText}</p>
          </div>
        </div>
        <div className="auth-aside-foot">
          <span>
            <ShieldCheck size={16} aria-hidden="true" /> Role-based access
          </span>
          <span>
            <Lock size={16} aria-hidden="true" /> Encrypted sessions
          </span>
          <span>
            <BadgeCheck size={16} aria-hidden="true" /> Verified requests
          </span>
        </div>
      </aside>

      <main id="auth-main" className="auth-main">
        <div className="auth-main-top">
          <Brand className="auth-mobile-brand" />
          {topRight}
        </div>
        <div className="auth-form-wrap">{children}</div>
        <p className="auth-legal">Protected by encrypted sessions. We never share your information.</p>
      </main>
    </div>
  );
}
