import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { admingetallpatientdetails } from '../../api';
import AdminNavbar from "../admin/AdminNavbar";

// Professional Hospital Theme Styles for Rejected Patients
const styles = {
  // Main Container
  container: {
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
    background: "transparent",
    width: "100%",
  },

  // Content Container
  content: {
    width: "100%",
  },

  // Header Section
  header: {
    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    borderRadius: "16px",
    padding: "2rem",
    margin: "0 1rem 2rem 1rem",
    boxShadow: "0 10px 40px rgba(220, 38, 38, 0.15)",
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

  // Patients Grid
  patientsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1.5rem",
    margin: "0 1rem 2rem 1rem",
  },

  // Patient Card
  patientCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "2rem",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e2e8f0",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
  },
  patientCardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
  },
  statusBadge: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    padding: "0.375rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  // Patient Info
  patientHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  patientAvatar: {
    width: "60px",
    height: "60px",
    backgroundColor: "#fef2f2",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#dc2626",
    fontSize: "24px",
    fontWeight: "600",
  },
  patientName: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1f2937",
    margin: 0,
  },

  // Patient Details
  patientDetails: {
    display: "grid",
    gap: "0.75rem",
  },
  detailRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    fontSize: "0.875rem",
  },
  detailIcon: {
    width: "20px",
    height: "20px",
    color: "#64748b",
    flexShrink: 0,
  },
  detailLabel: {
    fontWeight: "600",
    color: "#374151",
    minWidth: "80px",
  },
  detailValue: {
    color: "#64748b",
    flex: 1,
  },

  // Rejection Notice
  rejectionNotice: {
    backgroundColor: "#fef2f2",
    borderRadius: "8px",
    padding: "1rem",
    marginTop: "1.5rem",
    border: "1px solid #fecaca",
  },
  rejectionLabel: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: "0.5rem",
  },
  rejectionValue: {
    fontSize: "0.875rem",
    color: "#991b1b",
  },

  // Action Buttons
  actionButtons: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "1.5rem",
  },
  reviewButton: {
    flex: 1,
    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  reviewButtonHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
  },

  // Empty State
  emptyState: {
    textAlign: "center",
    padding: "4rem 2rem",
    margin: "0 1rem 2rem 1rem",
  },
  emptyIcon: {
    width: "80px",
    height: "80px",
    backgroundColor: "#f1f5f9",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1.5rem",
    fontSize: "40px",
  },
  emptyTitle: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#374151",
    marginBottom: "0.5rem",
  },
  emptyDescription: {
    fontSize: "1rem",
    color: "#64748b",
  },

  // Responsive Design
  "@media (max-width: 768px)": {
    header: {
      margin: "0 0.5rem 2rem 0.5rem",
      padding: "1.5rem",
    },
    headerTitle: {
      fontSize: "2rem",
    },
    patientsGrid: {
      margin: "0 0.5rem 2rem 0.5rem",
      gridTemplateColumns: "1fr",
      gap: "1rem",
    },
    patientCard: {
      padding: "1.5rem",
    },
  },
};

function RejectedPatients() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth?.token);
  const [patients, setPatients] = useState([]);

  async function fetchPatients() {
    try {
      const data = await admingetallpatientdetails(token);
      // Filter for patients who are explicitly rejected (not just not approved)
      setPatients(data.filter((p) => p.rejected === true));
    } catch (err) {
      console.error('Fetch rejected patients error:', err);
    }
  }

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchPatients();

  }, [token, dispatch, navigate]);

  return (
    <>
      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .patient-card {
            animation: fadeIn 0.5s ease-out;
          }
        `}
      </style>

      <div style={styles.container}>
        <div style={styles.content}>
          {/* Header Section */}
          <div style={styles.header}>
            <div style={styles.headerIcon}>
              ❌
            </div>
            <h1 style={styles.headerTitle}>
              Rejected Applications
            </h1>
            <p style={styles.headerSubtitle}>
              Patients whose applications were not approved for medical assistance
            </p>
          </div>

          {/* Admin Navbar */}
          <AdminNavbar />

          {/* Patients Grid */}
          <div style={styles.patientsGrid}>
            {patients.length > 0 ? (
              patients.map((patient, index) => (
                <div
                  key={patient._id || patient.id || index}
                  style={styles.patientCard}
                  className="patient-card"
                  onMouseEnter={(e) => Object.assign(e.target.style, styles.patientCardHover)}
                  onMouseLeave={(e) => Object.assign(e.target.style, styles.patientCard)}
                >
                  {/* Status Badge */}
                  <div style={styles.statusBadge}>
                    Rejected
                  </div>

                  {/* Patient Header */}
                  <div style={styles.patientHeader}>
                    <div style={styles.patientAvatar}>
                      {patient.name ? patient.name.charAt(0).toUpperCase() : "❌"}
                    </div>
                    <h3 style={styles.patientName}>
                      {patient.name || "Unnamed Patient"}
                    </h3>
                  </div>

                  {/* Patient Details */}
                  <div style={styles.patientDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>📧</span>
                      <span style={styles.detailLabel}>Email:</span>
                      <span style={styles.detailValue}>{patient.email || "Not provided"}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>🎂</span>
                      <span style={styles.detailLabel}>Age:</span>
                      <span style={styles.detailValue}>{patient.age ? `${patient.age} years` : "Not specified"}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>📱</span>
                      <span style={styles.detailLabel}>Mobile:</span>
                      <span style={styles.detailValue}>{patient.mobile || "Not provided"}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>📅</span>
                      <span style={styles.detailLabel}>Applied:</span>
                      <span style={styles.detailValue}>{patient.date || "Not specified"}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>💰</span>
                      <span style={styles.detailLabel}>Amount:</span>
                      <span style={styles.detailValue}>₹{patient.amount || "0"}</span>
                    </div>
                  </div>

                  {/* Rejection Notice */}
                  <div style={styles.rejectionNotice}>
                    <div style={styles.rejectionLabel}>Application Status</div>
                    <div style={styles.rejectionValue}>
                      This application was reviewed and not approved for medical assistance funding.
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={styles.actionButtons}>
                    <button
                      style={styles.reviewButton}
                      onClick={() => navigate(`/admin/patients/${patient._id || patient.id}`)}
                      onMouseOver={(e) => Object.assign(e.target.style, styles.reviewButtonHover)}
                      onMouseOut={(e) => Object.assign(e.target.style, styles.reviewButton)}
                    >
                      <span>👁️</span>
                      View Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  📋
                </div>
                <h3 style={styles.emptyTitle}>No Rejected Applications</h3>
                <p style={styles.emptyDescription}>
                  There are currently no rejected patient applications in the system.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default RejectedPatients;
