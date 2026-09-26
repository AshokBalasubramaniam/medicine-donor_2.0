import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, BadgeCheck, HeartHandshake, Lock, ShieldCheck } from "lucide-react";
import HealthcareIllustration from "../common/HealthcareIllustration";
import { homeFor } from "../../auth/roles";

export default function Hero() {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const startTo = isAuthenticated ? homeFor(user?.role) : "/register";

  return (
    <section id="home" className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow animate-rise">
            <span className="eyebrow-dot" aria-hidden="true">
              <HeartHandshake size={12} />
            </span>
            Verified requests. Transparent giving.
          </span>

          <h1 id="hero-title" className="hero-title animate-rise delay-1">
            Medicine <span className="accent">Donor</span> System
          </h1>

          <p className="hero-subtitle animate-rise delay-2">
            Connecting patients with medicine donors. Request support, give with confidence
            and follow every donation from approval to delivery.
          </p>

          <div className="hero-ctas animate-rise delay-3">
            <Link to={startTo} className="btn btn-primary btn-lg">
              {isAuthenticated ? "Go to dashboard" : "Get Started"}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">
              Learn More
            </a>
          </div>

          <ul className="hero-trust animate-rise delay-3" aria-label="Why people trust us">
            <li>
              <BadgeCheck size={18} aria-hidden="true" /> Admin-verified requests
            </li>
            <li>
              <Lock size={18} aria-hidden="true" /> Secure payments
            </li>
            <li>
              <ShieldCheck size={18} aria-hidden="true" /> Private by default
            </li>
          </ul>
        </div>

        <div className="hero-visual animate-rise delay-2">
          <HealthcareIllustration />
          <div className="float-card float-card-1" aria-hidden="true">
            <span className="float-card-icon tone-green">
              <BadgeCheck size={18} />
            </span>
            <div>
              <strong>Request verified</strong>
              <span>Reviewed by an administrator</span>
            </div>
          </div>
          <div className="float-card float-card-2" aria-hidden="true">
            <span className="float-card-icon tone-blue">
              <Lock size={18} />
            </span>
            <div>
              <strong>Secure donation</strong>
              <span>Encrypted checkout</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
