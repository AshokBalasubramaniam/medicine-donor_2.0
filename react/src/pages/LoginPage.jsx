import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import LoginForm from "../components/auth/LoginForm";

export default function LoginPage() {
  useEffect(() => {
    document.title = "Log in · Medicine Donor System";
  }, []);

  return (
    <AuthLayout
      asideTitle="One login for patients, donors and administrators"
      asideText="Sign in once and we’ll take you straight to the right dashboard for your account."
      topRight={
        <>
          <span className="auth-main-top-text">Don’t have an account?</span>
          <Link to="/register" className="btn btn-secondary btn-sm">
            Sign up
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
