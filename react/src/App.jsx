import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

import PublicOnlyRoute from "./components/routing/PublicOnlyRoute";
import RoleBasedRoute from "./components/routing/RoleBasedRoute";
import PageLoader from "./components/common/PageLoader";
import { ROLES } from "./auth/roles";
import FeedbackHost from "./components/feedback/FeedbackHost";

// Each portal is its own chunk, so visitors only download the screens
// (and CSS) for their own role. Landing and login stay in the main bundle.
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));

const PatientLayout = lazy(() => import("./components/layout/PatientLayout"));
const PatientDetails = lazy(() => import("./components/patients/PatientDetails"));

const DonorLayout = lazy(() => import("./components/layout/DonorLayout"));
const DonorOverview = lazy(() => import("./components/donor/DonorOverview"));
const PatientsInNeed = lazy(() => import("./components/donor/PatientsInNeed"));
const MakeDonation = lazy(() => import("./components/donor/MakeDonation"));
const MyDonations = lazy(() => import("./components/donor/MyDonations"));

const AdminLayout = lazy(() => import("./components/layout/AdminLayout"));
const AdminOverview = lazy(() => import("./components/admin/AdminOverview"));
const AdminPatientList = lazy(() => import("./components/admin/AdminPatientList"));
const AdminReview = lazy(() => import("./components/admin/AdminReview"));
const AdminPatientDetails = lazy(() => import("./components/admin/adminPatientDetails"));
const Doctor = lazy(() => import("./components/admin/Doctor"));

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
      <Suspense fallback={<PageLoader fullScreen />}>
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
      </Suspense>
      <FeedbackHost />
    </Router>
  );
}
