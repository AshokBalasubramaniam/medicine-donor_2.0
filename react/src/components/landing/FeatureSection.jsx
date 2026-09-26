import React from "react";
import { ClipboardList, HandHeart, Search, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    tone: "tone-green",
    title: "Find Medicines",
    text: "Submit what you need and get matched with donors ready to help with treatment costs.",
  },
  {
    icon: HandHeart,
    tone: "tone-blue",
    title: "Donate Medicines",
    text: "Browse verified patient requests and contribute directly to the care they need.",
  },
  {
    icon: ClipboardList,
    tone: "tone-teal",
    title: "Track Requests",
    text: "Follow each request from review to approval to completion, all in one place.",
  },
  {
    icon: ShieldCheck,
    tone: "tone-navy",
    title: "Secure & Verified",
    text: "Every request is reviewed by an administrator, and payments are processed securely.",
  },
];

export default function FeatureSection() {
  return (
    <section className="section" aria-labelledby="features-title">
      <div className="container">
        <div className="section-head">
          <span className="section-kicker">What you can do</span>
          <h2 id="features-title" className="section-title">
            Everything you need to give and get help
          </h2>
          <p className="section-lead">One platform for patients, donors and the team that keeps it trustworthy.</p>
        </div>

        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, tone, title, text }) => (
            <article key={title} className="card feature-card">
              <span className={`feature-icon ${tone}`} aria-hidden="true">
                <Icon size={22} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
