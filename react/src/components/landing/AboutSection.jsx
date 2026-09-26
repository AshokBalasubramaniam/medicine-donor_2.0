import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, CheckCircle2, Eye, FileCheck2, Lock, UserCheck } from "lucide-react";

const VALUES = [
  { icon: FileCheck2, tone: "tone-green", title: "Reviewed", text: "Every request checked before it goes live" },
  { icon: Eye, tone: "tone-blue", title: "Transparent", text: "Donors see exactly where support goes" },
  { icon: Lock, tone: "tone-teal", title: "Secure", text: "Encrypted sessions and payments" },
  { icon: UserCheck, tone: "tone-navy", title: "Private", text: "Access limited to the right people" },
];

export default function AboutSection() {
  const { isAuthenticated } = useSelector((s) => s.auth);

  return (
    <>
      <section id="about" className="section" aria-labelledby="about-title">
        <div className="container about-grid">
          <div>
            <span className="section-kicker">About</span>
            <h2 id="about-title" className="section-title">
              Built to make medical giving simple and trustworthy
            </h2>
            <p className="section-lead">
              Medicine Donor System brings patients, donors and hospital administrators together
              so that help reaches the people who need it, without the guesswork.
            </p>
            <ul className="about-points">
              <li>
                <CheckCircle2 size={18} aria-hidden="true" />
                Patients get a single place to request and track support.
              </li>
              <li>
                <CheckCircle2 size={18} aria-hidden="true" />
                Donors give to verified requests and see their impact.
              </li>
              <li>
                <CheckCircle2 size={18} aria-hidden="true" />
                Administrators review requests and keep the community safe.
              </li>
            </ul>
          </div>

          <div className="stats">
            {VALUES.map(({ icon: Icon, tone, title, text }) => (
              <div key={title} className="card stat">
                <span className={`feature-icon ${tone}`} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!isAuthenticated && (
        <section className="section" style={{ paddingTop: 0 }} aria-label="Get started">
          <div className="container">
            <div className="cta-band">
              <div>
                <h2>Ready to make a difference?</h2>
                <p>Create a free account and get started in minutes.</p>
              </div>
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
