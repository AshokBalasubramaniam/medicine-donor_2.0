import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";

import PublicOnlyRoute from "./components/routing/PublicOnlyRoute";
import RoleBasedRoute from "./components/routing/RoleBasedRoute";
import AdminLayout from "./components/layout/AdminLayout";
import PatientLayout from "./components/layout/PatientLayout";
import { ROLES } from "./auth/roles";
import FeedbackHost from "./components/feedback/FeedbackHost";

import PatientDetails from "./components/patients/PatientDetails";
import DonorLayout from "./components/layout/DonorLayout";
import DonorOverview from "./components/donor/DonorOverview";
import PatientsInNeed from "./components/donor/PatientsInNeed";
import MakeDonation from "./components/donor/MakeDonation";
import MyDonations from "./components/donor/MyDonations";
import AdminOverview from "./components/admin/AdminOverview";
import AdminPatientList from "./components/admin/AdminPatientList";
import AdminReview from "./components/admin/AdminReview";
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
          <Route path="/patient" element={<PatientLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PatientDetails />} />
          </Route>
        </Route>

        <Route element={<RoleBasedRoute allow={[ROLES.DONOR]} />}>
          <Route path="/donor" element={<DonorLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DonorOverview />} />
            <Route path="patients" element={<PatientsInNeed />} />
            <Route path="donate" element={<MakeDonation />} />
            <Route path="donations" element={<MyDonations />} />
          </Route>
        </Route>

        <Route element={<RoleBasedRoute allow={[ROLES.ADMIN]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminOverview />} />
            <Route path="patients" element={<Navigate to="/admin/patients/pending" replace />} />
            <Route path="patients/pending" element={<AdminPatientList key="pending" status="pending" />} />
            <Route path="patients/approved" element={<AdminPatientList key="approved" status="approved" />} />
            <Route path="patients/rejected" element={<AdminPatientList key="rejected" status="rejected" />} />
            <Route path="patients/completed" element={<AdminPatientList key="completed" status="completed" />} />
            <Route path="patients/:id" element={<AdminPatientDetails />} />
            <Route path="patients/:id/review" element={<AdminReview />} />
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
