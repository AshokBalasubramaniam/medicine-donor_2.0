import React, { useState, useEffect } from "react";
import { toast } from '../feedback/feedback';
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  admingetallpatientdetails,
  getAllPayments,
  registerdoctor,
} from "../../api";
import { logout } from "../../store/authSlice";
import AdminNavbar from "../admin/AdminNavbar";

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth?.token);

  const [patients, setPatients] = useState([]);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [doctor, setDoctor] = useState({
    fullName: "",
    email: "",
    phone: "",
    speciality: "",
    experience: "",
    availableDays: "",
    availableTimings: "",
    maxPatients: "",
    profilePhoto: null,
  });

  const specialities = [
    "Cardiologist",
    "Dermatologist",
    "Neurologist",
    "Pediatrician",
    "Psychologist",
    "Radiologist",
    "Surgeon",
    "Others",
  ];

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    async function fetchPatient() {
      try {
        const data = await admingetallpatientdetails(token);
        setPatients(data);
      } catch (err) {
        toast.error(err?.error || "Please refresh the page.", "Couldn’t load patients");
      }
    }

    fetchPatient();

  }, [token, dispatch, navigate]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profilePhoto") {
      setDoctor((prev) => ({ ...prev, profilePhoto: files[0] || null }));
    } else {
      setDoctor((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...doctor,
        maxPatients: Number(doctor.maxPatients),
        profilePhoto: doctor.profilePhoto ? doctor.profilePhoto.name : null,
      };

      await registerdoctor(payload, token);
      toast.success("The doctor was added.", "Doctor added");
      setShowDoctorModal(false);
      setDoctor({
        fullName: "",
        email: "",
        phone: "",
        speciality: "",
        experience: "",
        availableDays: "",
        availableTimings: "",
        maxPatients: "",
        profilePhoto: null,
      });
    } catch (err) {
      toast.error(err?.error || "Please try again.", "Couldn’t add doctor");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!token) return;

    async function fetchPayments() {
      try {
        const data = await getAllPayments(token);
        setPayments(data);
      } catch (err) {
        console.error("Failed to load payments:", err);
      }
    }

    fetchPayments();
  }, [token]);

// Professional Hospital Dashboard Styles
const styles = {
  // Main Container
  container: {
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
    background: "transparent",
    width: "100%",
  },

  // Header Section
  header: {
    background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    borderRadius: "16px",
    padding: "2rem",
    margin: "0 1rem 2rem 1rem",
    boxShadow: "0 10px 40px rgba(30, 64, 175, 0.15)",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
  },
  headerIcon: {
    width: "80px",
    height: "80px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1rem",
    fontSize: "40px",
    backdropFilter: "blur(10px)",
  },
  headerTitle: {
    fontSize: "2.25rem",
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: "0.5rem",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  headerSubtitle: {
    fontSize: "1.125rem",
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },

  // Content Container
  content: {
    width: "100%",
  },

  // Statistics Cards
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.5rem",
    margin: "0 1rem 3rem 1rem",
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "2rem",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e2e8f0",
    transition: "all 0.3s ease",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  statCardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
  },
  statIcon: {
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    marginBottom: "1rem",
  },
  statTitle: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: "0.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statValue: {
    fontSize: "3rem",
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: "0.5rem",
  },
  statChange: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
  },
  // Modal Styles
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.2)",
    overflow: "hidden",
    maxWidth: "700px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
  },

  // Modal Header
  modalHeader: {
    background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    padding: "2rem",
    textAlign: "center",
    position: "relative",
  },
  modalIcon: {
    width: "64px",
    height: "64px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1rem",
    fontSize: "32px",
    backdropFilter: "blur(10px)",
  },
  modalTitle: {
    fontSize: "1.875rem",
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: "0.5rem",
  },
  modalSubtitle: {
    fontSize: "1rem",
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },

  // Modal Close Button
  modalCloseButton: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "20px",
    transition: "all 0.2s ease",
  },

  // Modal Content
  modalContent: {
    padding: "2rem",
  },

  // Form Styles
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  formLabel: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "0.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  formInput: {
    padding: "0.875rem 1rem",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "1rem",
    color: "#1f2937",
    backgroundColor: "#ffffff",
    outline: "none",
    transition: "all 0.2s ease-in-out",
    fontFamily: "inherit",
  },
  formInputFocus: {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
  },
  formSelect: {
    padding: "0.875rem 1rem",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "1rem",
    color: "#1f2937",
    backgroundColor: "#ffffff",
    outline: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 1rem center",
    backgroundSize: "1rem",
    paddingRight: "3rem",
  },

  // Button Styles
  primaryButton: {
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "0.875rem 1.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  primaryButtonHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    color: "#6b7280",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0.875rem 1.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  secondaryButtonHover: {
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },

  // Loading Spinner
  loadingSpinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTop: "2px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  // Payment Section
  paymentSection: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "2rem",
    margin: "0 1rem 2rem 1rem",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e2e8f0",
  },
  paymentHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "2rem",
  },
  paymentIcon: {
    width: "48px",
    height: "48px",
    backgroundColor: "#eff6ff",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#3b82f6",
    fontSize: "24px",
  },
  paymentTitle: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1f2937",
    margin: 0,
  },

  // Table Styles
  tableContainer: {
    overflowX: "auto",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
  },
  tableHeaderCell: {
    padding: "1rem",
    fontWeight: "700",
    color: "#374151",
    textAlign: "left",
    borderBottom: "1px solid #e2e8f0",
  },
  tableRow: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 0.2s ease",
  },
  tableRowHover: {
    backgroundColor: "#f8fafc",
  },
  tableCell: {
    padding: "1rem",
    color: "#64748b",
    borderBottom: "1px solid #f1f5f9",
  },
  tableCellStrong: {
    color: "#1f2937",
    fontWeight: "600",
  },

  // Empty State
  emptyState: {
    textAlign: "center",
    padding: "3rem",
    color: "#64748b",
  },
  emptyIcon: {
    width: "64px",
    height: "64px",
    backgroundColor: "#f1f5f9",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1rem",
    fontSize: "32px",
  },
  emptyTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "0.5rem",
  },

  // Responsive Design
  "@media (max-width: 768px)": {
    header: {
      padding: "1.5rem",
      margin: "0 0.5rem 2rem 0.5rem",
    },
    headerTitle: {
      fontSize: "2rem",
    },
    statsGrid: {
      margin: "0 0.5rem 3rem 0.5rem",
      gridTemplateColumns: "1fr",
      gap: "1rem",
    },
    paymentSection: {
      margin: "0 0.5rem 2rem 0.5rem",
      padding: "1.5rem",
    },
    modalContainer: {
      margin: "1rem",
      maxHeight: "calc(100vh - 2rem)",
    },
    modalContent: {
      padding: "1.5rem",
    },
    formGrid: {
      gridTemplateColumns: "1fr",
    },
  },
};

  // Calculate statistics
  const stats = {
    totalPatients: patients.length,
    approvedPatients: patients.filter((p) => p.approved).length,
    pendingPatients: patients.filter((p) => !p.approved && !p.rejected).length,
    rejectedPatients: patients.filter((p) => p.rejected).length,
    totalDonations: payments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
  };

  return (
    <>
      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={styles.container}>
        <div style={styles.content}>
          {/* Header Section */}
          <div style={styles.header}>
            <div style={styles.headerIcon}>
              🏥
            </div>
            <h1 style={styles.headerTitle}>
              Hospital Administration Dashboard
            </h1>
            <p style={styles.headerSubtitle}>
              Manage patients, doctors, and monitor donation activities
            </p>
          </div>

          {/* Admin Navbar */}
          <AdminNavbar
            onAddDoctor={() => navigate("/admin/doctors")}
            onLogout={handleLogout}
          />

          {/* Statistics Cards */}
          <div style={styles.statsGrid}>
            <div
              style={{
                ...styles.statCard,
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => Object.assign(e.target.style, styles.statCardHover)}
              onMouseLeave={(e) => Object.assign(e.target.style, styles.statCard)}
            >
              <div style={{ ...styles.statIcon, backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
                👥
              </div>
              <div style={styles.statTitle}>Total Patients</div>
              <div style={styles.statValue}>{stats.totalPatients}</div>
              <div style={styles.statChange}>All registered patients</div>
            </div>

            <div
              style={{
                ...styles.statCard,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => Object.assign(e.target.style, styles.statCardHover)}
              onMouseLeave={(e) => Object.assign(e.target.style, styles.statCard)}
            >
              <div style={{ ...styles.statIcon, backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
                ✅
              </div>
              <div style={styles.statTitle}>Approved Patients</div>
              <div style={styles.statValue}>{stats.approvedPatients}</div>
              <div style={styles.statChange}>Ready for donations</div>
            </div>

            <div
              style={{
                ...styles.statCard,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => Object.assign(e.target.style, styles.statCardHover)}
              onMouseLeave={(e) => Object.assign(e.target.style, styles.statCard)}
            >
              <div style={{ ...styles.statIcon, backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
                ⏳
              </div>
              <div style={styles.statTitle}>Pending Review</div>
              <div style={styles.statValue}>{stats.pendingPatients}</div>
              <div style={styles.statChange}>Awaiting approval</div>
            </div>

            <div
              style={{
                ...styles.statCard,
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => Object.assign(e.target.style, styles.statCardHover)}
              onMouseLeave={(e) => Object.assign(e.target.style, styles.statCard)}
            >
              <div style={{ ...styles.statIcon, backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
                💰
              </div>
              <div style={styles.statTitle}>Total Donations</div>
              <div style={styles.statValue}>₹{stats.totalDonations.toLocaleString()}</div>
              <div style={styles.statChange}>Funds collected</div>
            </div>
          </div>

          {/* Doctor Registration Modal */}
          {showDoctorModal && (
            <div style={styles.modalOverlay}>
              <div style={styles.modalContainer}>
                {/* Modal Header */}
                <div style={styles.modalHeader}>
                  <div style={styles.modalIcon}>
                    👨‍⚕️
                  </div>
                  <h2 style={styles.modalTitle}>
                    Register New Doctor
                  </h2>
                  <p style={styles.modalSubtitle}>
                    Add a healthcare professional to the medical team
                  </p>

                  <button
                    style={styles.modalCloseButton}
                    onClick={() => setShowDoctorModal(false)}
                    onMouseOver={(e) => Object.assign(e.target.style, { background: "rgba(255, 255, 255, 0.3)" })}
                    onMouseOut={(e) => Object.assign(e.target.style, { background: "rgba(255, 255, 255, 0.2)" })}
                  >
                    ×
                  </button>
                </div>

                {/* Modal Content */}
                <div style={styles.modalContent}>
                  <form onSubmit={handleSubmit}>
                    <div style={styles.formGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          <span>👤</span>
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          placeholder="Doctor's full name"
                          value={doctor.fullName}
                          onChange={handleChange}
                          style={styles.formInput}
                          required
                          onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                          onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          <span>📧</span>
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          placeholder="doctor@example.com"
                          value={doctor.email}
                          onChange={handleChange}
                          style={styles.formInput}
                          required
                          onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                          onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          <span>📱</span>
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="+91 XXXXX XXXXX"
                          value={doctor.phone}
                          onChange={handleChange}
                          style={styles.formInput}
                          onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                          onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          <span>🩺</span>
                          Medical Speciality
                        </label>
                        <select
                          name="speciality"
                          value={doctor.speciality}
                          onChange={handleChange}
                          style={styles.formSelect}
                          required
                        >
                          <option value="">Select Speciality</option>
                          {specialities.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          <span>🎓</span>
                          Years of Experience
                        </label>
                        <input
                          type="number"
                          name="experience"
                          placeholder="Years of practice"
                          value={doctor.experience}
                          onChange={handleChange}
                          style={styles.formInput}
                          min="0"
                          max="50"
                          onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                          onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          <span>📅</span>
                        </label>
                        <input
                          type="text"
                          name="availableDays"
                          placeholder="Mon, Wed, Fri"
                          value={doctor.availableDays}
                          onChange={handleChange}
                          style={styles.formInput}
                          onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                          onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          <span>🕒</span>
                          Available Timings
                        </label>
                        <input
                          type="text"
                          name="availableTimings"
                          placeholder="9:00 AM - 5:00 PM"
                          value={doctor.availableTimings}
                          onChange={handleChange}
                          style={styles.formInput}
                          onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                          onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          <span>👥</span>
                          Max Patients per Day
                        </label>
                        <input
                          type="number"
                          name="maxPatients"
                          placeholder="Maximum patients"
                          value={doctor.maxPatients}
                          onChange={handleChange}
                          style={styles.formInput}
                          min="1"
                          max="50"
                          onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                          onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          <span>📸</span>
                          Profile Photo
                        </label>
                        <input
                          type="file"
                          name="profilePhoto"
                          accept="image/*"
                          onChange={handleChange}
                          style={styles.formInput}
                        />
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "2rem" }}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => setShowDoctorModal(false)}
                        onMouseOver={(e) => Object.assign(e.target.style, styles.secondaryButtonHover)}
                        onMouseOut={(e) => Object.assign(e.target.style, styles.secondaryButton)}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        style={styles.primaryButton}
                        disabled={loading}
                        onMouseOver={(e) => {
                          if (!loading) Object.assign(e.target.style, styles.primaryButtonHover);
                        }}
                        onMouseOut={(e) => Object.assign(e.target.style, styles.primaryButton)}
                      >
                        {loading ? (
                          <>
                            <div style={styles.loadingSpinner}></div>
                            Registering...
                          </>
                        ) : (
                          <>
                            <span>👨‍⚕️</span>
                            Register Doctor
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Payment Overview Section */}
          <div style={styles.paymentSection}>
            <div style={styles.paymentHeader}>
              <div style={styles.paymentIcon}>
                💰
              </div>
              <h2 style={styles.paymentTitle}>Donation Transactions</h2>
            </div>

            <div style={styles.tableContainer}>
              {payments.length > 0 ? (
                <table style={styles.table}>
                  <thead style={styles.tableHeader}>
                    <tr>
                      <th style={styles.tableHeaderCell}>Patient Name</th>
                      <th style={styles.tableHeaderCell}>Donation Amount</th>
                      <th style={styles.tableHeaderCell}>Payment ID</th>
                      <th style={styles.tableHeaderCell}>Donor Name</th>
                      <th style={styles.tableHeaderCell}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, index) => (
                      <tr
                        key={payment.id || index}
                        style={styles.tableRow}
                        onMouseEnter={(e) => Object.assign(e.target.style, styles.tableRowHover)}
                        onMouseLeave={(e) => Object.assign(e.target.style, styles.tableRow)}
                      >
                        <td style={{ ...styles.tableCell, ...styles.tableCellStrong }}>
                          {payment.patient_name}
                        </td>
                        <td style={{ ...styles.tableCell, ...styles.tableCellStrong, color: "#10b981" }}>
                          ₹{payment.total_amount?.toLocaleString() || "N/A"}
                        </td>
                        <td style={styles.tableCell}>
                          <code style={{
                            backgroundColor: "#f1f5f9",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                          }}>
                            {payment.payment_id || "N/A"}
                          </code>
                        </td>
                        <td style={{ ...styles.tableCell, ...styles.tableCellStrong }}>
                          {payment.donor_name}
                        </td>
                        <td style={styles.tableCell}>
                          {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    📊
                  </div>
                  <h3 style={styles.emptyTitle}>No Donation Data Available</h3>
                  <p>No donation transactions have been recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
