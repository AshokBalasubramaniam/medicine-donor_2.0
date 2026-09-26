import React, { useEffect, useRef } from "react";
import useReveal from "../hooks/useReveal";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Hero from "../components/landing/Hero";
import FeatureSection from "../components/landing/FeatureSection";
import HowItWorks from "../components/landing/HowItWorks";
import AboutSection from "../components/landing/AboutSection";

export default function LandingPage() {
  const mainRef = useRef(null);
  useReveal(mainRef);

  useEffect(() => {
    document.title = "Medicine Donor System · Connecting patients with medicine donors";
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main" ref={mainRef}>
        <Hero />
        <FeatureSection />
        <HowItWorks />
        <AboutSection />
      </main>
      <Footer />
    </>
  );
}
