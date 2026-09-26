import React, { useEffect } from "react";
import AuthLayout from "../components/auth/AuthLayout";
import ForgotPasswordForm from "../components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  useEffect(() => {
    document.title = "Reset password · Medicine Donor System";
  }, []);

  return (
    <AuthLayout
      asideTitle="Locked out? It happens."
      asideText="We’ll email you a short verification code so you can choose a new password securely."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
