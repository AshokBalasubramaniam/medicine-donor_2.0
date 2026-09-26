import React from "react";
import Brand from "../common/Brand";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Brand />
        <p>© {new Date().getFullYear()} Medicine Donor System. Bridging the gap between need and generosity.</p>
      </div>
    </footer>
  );
}
