import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import RegisterForm from "../components/auth/RegisterForm";

export default function RegisterPage() {
  useEffect(() => {
    document.title = "Create account · Medicine Donor System";
  }, []);

  return (
    <AuthLayout
      asideTitle="Join a community built on care"
      asideText="Request support for treatment, or help verified patients get the medicines they need."
      topRight={
        <>
          <span className="auth-main-top-text">Already registered?</span>
          <Link to="/login" className="btn btn-secondary btn-sm">
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
