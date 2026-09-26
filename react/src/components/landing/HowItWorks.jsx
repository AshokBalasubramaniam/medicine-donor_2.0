import React from "react";

const STEPS = [
  {
    title: "Create your account",
    text: "Sign up in under a minute. One login works for everyone, and you’re taken to the right dashboard automatically.",
  },
  {
    title: "Request or give support",
    text: "Patients share their treatment details for review. Donors browse approved requests and choose who to help.",
  },
  {
    title: "Track every step",
    text: "See request status, donations received and remaining balance update as support comes in.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section section-muted" aria-labelledby="how-title">
      <div className="container">
        <div className="section-head">
          <span className="section-kicker">How it works</span>
          <h2 id="how-title" className="section-title">
            From request to relief in three steps
          </h2>
        </div>

        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card step">
              <span className="step-num" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
