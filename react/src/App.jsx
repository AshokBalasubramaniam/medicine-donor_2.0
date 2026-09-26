import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";

import PublicOnlyRoute from "./components/routing/PublicOnlyRoute";
import RoleBasedRoute from "./components/routing/RoleBasedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import { ROLES } from "./auth/roles";
import FeedbackHost from "./components/feedback/FeedbackHost";

import PatientDetails from "./components/patients/PatientDetails";
import Donorgetpatientdetails from "./components/donor/Donorgetpatientdetails";
import Dashboard from "./components/admin/Dashboard";
import AllPatients from "./components/admin/AllPatients";
import PendingPatients from "./components/admin/PendingPatients";
import ApprovedPatients from "./components/admin/ApprovedPatients";
import RejectedPatients from "./components/admin/RejectedPatients";
import CompletedPatients from "./components/admin/CompletedPatients";
import AdminPatientDetails from "./components/admin/adminPatientDetails";
import Doctor from "./components/admin/Doctor";

// Old per-portal URLs, kept so existing bookmarks still land somewhere sensible.
const LEGACY_REDIRECTS = {
  "/Donorlogin": "/login",
  "/adminpage": "/login",
  "/Forgetpassword": "/forgot-password",
  "/PatientDetails": "/patient/dashboard",
  "/Donorgetpatientdetails": "/donor/dashboard",
  "/Dashboard": "/admin/dashboard",
  "/pendingpatients": "/admin/patients/pending",
  "/ApprovedPatients": "/admin/patients/approved",
  "/CompletedPatients": "/admin/patients/completed",
  "/Doctor": "/admin/doctors",
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<RoleBasedRoute allow={[ROLES.PATIENT]} />}>
          <Route path="/patient" element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PatientDetails />} />
          </Route>
        </Route>

        <Route element={<RoleBasedRoute allow={[ROLES.DONOR]} />}>
          <Route path="/donor" element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Donorgetpatientdetails />} />
          </Route>
        </Route>

        <Route element={<RoleBasedRoute allow={[ROLES.ADMIN]} />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="patients" element={<AllPatients />} />
            <Route path="patients/pending" element={<PendingPatients />} />
            <Route path="patients/approved" element={<ApprovedPatients />} />
            <Route path="patients/rejected" element={<RejectedPatients />} />
            <Route path="patients/completed" element={<CompletedPatients />} />
            <Route path="patients/:id" element={<AdminPatientDetails />} />
            <Route path="doctors" element={<Doctor />} />
          </Route>
        </Route>

        {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <FeedbackHost />
    </Router>
  );
}
