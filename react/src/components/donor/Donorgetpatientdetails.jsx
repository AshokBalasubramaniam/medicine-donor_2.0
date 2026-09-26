import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { admingetallpatientdetails } from "../../api";
import PaymentModal from "./PaymentModal";
import donorimage from "../../assets/donorimage.png";

// Professional Medicine Donor System Styles
const styles = {
  // Main Container
  container: {
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
    backgroundColor: "transparent",
    color: "#1e293b",
  },

  // Header/Navigation
  header: {
    background: "linear-gradient(135deg, #0f766e 0%, #059669 100%)",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  headerContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "72px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  logoIcon: {
    width: "40px",
    height: "40px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    color: "#059669",
    fontWeight: "bold",
  },
  logoText: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#ffffff",
    margin: 0,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "0.5rem 1rem",
    borderRadius: "24px",
    backdropFilter: "blur(10px)",
  },
  userInfoText: {
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "500",
  },

  // Main Content
  mainContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem 1rem",
  },

  // Hero Section
  heroSection: {
    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    borderRadius: "16px",
    padding: "3rem 2rem",
    marginBottom: "2rem",
    position: "relative",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
  },
  heroBackground: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "300px",
    height: "200px",
    backgroundImage: `url(${donorimage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: 0.1,
    borderRadius: "16px",
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
  },
  heroTitle: {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "0.5rem",
    lineHeight: "1.2",
  },
  heroSubtitle: {
    fontSize: "1.125rem",
    color: "#64748b",
    marginBottom: "1.5rem",
    maxWidth: "600px",
  },
  heroStats: {
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "1rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    minWidth: "120px",
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#059669",
  },
  statLabel: {
    fontSize: "0.875rem",
    color: "#64748b",
    fontWeight: "500",
  },

  // Patient Cards Section
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
  },
  sectionTitle: {
    fontSize: "1.875rem",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  sectionSubtitle: {
    color: "#64748b",
    margin: "0.25rem 0 0 0",
    fontSize: "0.875rem",
  },
  patientGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  },

  // Patient Card
  patientCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s ease-in-out",
    position: "relative",
    overflow: "hidden",
  },
  patientCardHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.06)",
  },
  patientHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1rem",
  },
  patientId: {
    fontSize: "0.875rem",
    color: "#64748b",
    fontWeight: "500",
    backgroundColor: "#f1f5f9",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
  },
  urgencyBadge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  urgencyHigh: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
  },
  urgencyMedium: {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
  urgencyLow: {
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
  },
  patientName: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "0.5rem",
  },
  patientInfo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  infoLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  infoValue: {
    fontSize: "0.875rem",
    color: "#1e293b",
    fontWeight: "500",
  },
  amountSection: {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "1rem",
    marginBottom: "1rem",
  },
  amountGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  amountItem: {
    textAlign: "center",
  },
  amountValue: {
    fontSize: "1.125rem",
    fontWeight: "700",
    display: "block",
  },
  amountLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  donateButton: {
    width: "100%",
    padding: "0.75rem 1rem",
    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  donateButtonHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
  },

  // Loading and Error States
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    textAlign: "center",
  },
  loadingSpinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #059669",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "1rem",
  },
  loadingText: {
    fontSize: "1.125rem",
    color: "#64748b",
    fontWeight: "500",
  },
  errorState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    textAlign: "center",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    margin: "2rem 0",
  },
  errorIcon: {
    width: "64px",
    height: "64px",
    color: "#dc2626",
    marginBottom: "1rem",
  },
  errorTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: "0.5rem",
  },
  errorMessage: {
    color: "#991b1b",
    marginBottom: "1rem",
  },
  errorButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  errorButtonHover: {
    backgroundColor: "#b91c1c",
  },

  // Empty State
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    textAlign: "center",
    backgroundColor: "#f8fafc",
    border: "2px dashed #e2e8f0",
    borderRadius: "12px",
    margin: "2rem 0",
  },
  emptyIcon: {
    width: "64px",
    height: "64px",
    color: "#cbd5e1",
    marginBottom: "1rem",
  },
  emptyTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#475569",
    marginBottom: "0.5rem",
  },
  emptyMessage: {
    color: "#64748b",
    maxWidth: "400px",
  },

  // Responsive Design
  "@media (max-width: 768px)": {
    heroTitle: {
      fontSize: "2rem",
    },
    patientGrid: {
      gridTemplateColumns: "1fr",
    },
    patientInfo: {
      gridTemplateColumns: "1fr",
    },
    amountGrid: {
      gridTemplateColumns: "1fr",
    },
    heroStats: {
      flexDirection: "column",
      alignItems: "center",
    },
  },
};

function Donorgetpatientdetails() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const token = useSelector((state) => state.auth?.token);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: donor } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    async function fetchPatients() {
      setLoading(true);
      try {
        const data = await admingetallpatientdetails(token);
        setPatients(data || []);
      } catch (err) {
        setError("Failed to fetch patient details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchPatients();

  }, [token, dispatch, navigate]);

  // Helper functions
  const getUrgencyLevel = (balanceAmount, totalAmount) => {
    const percentage = (balanceAmount / totalAmount) * 100;
    if (percentage > 70) return "high";
    if (percentage > 30) return "medium";
    return "low";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPatients = patients.filter(
    (p) => p.completed_payment !== true && p.approved === true && p.amount >= 1
  );

  const totalPatients = filteredPatients.length;
  const totalAmountNeeded = filteredPatients.reduce((sum, p) => sum + (p.balance_amount || 0), 0);
  const averageAmount = totalPatients > 0 ? Math.round(totalAmountNeeded / totalPatients) : 0;
  

  return (
    <>
      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @media (max-width: 768px) {
            .hero-title { font-size: 2rem !important; }
            .patient-grid { grid-template-columns: 1fr !important; }
            .patient-info { grid-template-columns: 1fr !important; }
            .amount-grid { grid-template-columns: 1fr !important; }
            .hero-stats { flex-direction: column !important; align-items: center !important; }
          }
        `}
      </style>

      <div style={styles.container}>

        <main style={styles.mainContent}>
          {/* Hero Section */}
          <section style={styles.heroSection}>
            <div style={styles.heroBackground}></div>
            <div style={styles.heroContent}>
              <h2 style={styles.heroTitle}>Make a Difference Today</h2>
              <p style={styles.heroSubtitle}>
                Help patients in need by contributing to their medical treatment costs.
                Your generosity can save lives and bring hope to families.
              </p>
              <div style={styles.heroStats}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{totalPatients}</span>
                  <span style={styles.statLabel}>Active Cases</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{formatCurrency(totalAmountNeeded)}</span>
                  <span style={styles.statLabel}>Total Needed</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{formatCurrency(averageAmount)}</span>
                  <span style={styles.statLabel}>Avg. per Case</span>
                </div>
              </div>
            </div>
          </section>

          {/* Patient Cards Section */}
          <section>
            <div style={styles.sectionHeader}>
              <div>
                <h3 style={styles.sectionTitle}>Patients Needing Support</h3>
                <p style={styles.sectionSubtitle}>
                  Select a patient to make a donation and help with their medical treatment
                </p>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div style={styles.loadingState}>
                <div style={styles.loadingSpinner}></div>
                <p style={styles.loadingText}>Loading patient information...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div style={styles.errorState}>
                <div style={styles.errorIcon}>⚠️</div>
                <h3 style={styles.errorTitle}>Connection Error</h3>
                <p style={styles.errorMessage}>{error}</p>
                <button
                  style={styles.errorButton}
                  onClick={() => window.location.reload()}
                  onMouseOver={(e) => (e.target.style.backgroundColor = styles.errorButtonHover.backgroundColor)}
                  onMouseOut={(e) => (e.target.style.backgroundColor = styles.errorButton.backgroundColor)}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Patient Grid */}
            {!loading && !error && (
              <>
                {filteredPatients.length > 0 ? (
                  <div style={styles.patientGrid}>
                    {filteredPatients.map((patient) => {
                      const urgencyLevel = getUrgencyLevel(patient.balance_amount, patient.amount);
                      return (
                        <div
                          key={patient._id}
                          style={{
                            ...styles.patientCard,
                            ...(hoveredCard === patient._id ? styles.patientCardHover : {}),
                          }}
                          onMouseEnter={() => setHoveredCard(patient._id)}
                          onMouseLeave={() => setHoveredCard(null)}
                        >
                          <div style={styles.patientHeader}>
                            <span style={styles.patientId}>ID: {patient.id}</span>
                            <span
                              style={{
                                ...styles.urgencyBadge,
                                ...(urgencyLevel === "high" ? styles.urgencyHigh :
                                   urgencyLevel === "medium" ? styles.urgencyMedium :
                                   styles.urgencyLow),
                              }}
                            >
                              {urgencyLevel === "high" ? "Critical" :
                               urgencyLevel === "medium" ? "Urgent" : "Stable"}
                            </span>
                          </div>

                          <h4 style={styles.patientName}>{patient.name}</h4>

                          <div style={styles.patientInfo}>
                            <div style={styles.infoItem}>
                              <span style={styles.infoLabel}>Age</span>
                              <span style={styles.infoValue}>{patient.age} years</span>
                            </div>
                            <div style={styles.infoItem}>
                              <span style={styles.infoLabel}>Disease</span>
                              <span style={styles.infoValue}>{patient.disease}</span>
                            </div>
                            <div style={styles.infoItem}>
                              <span style={styles.infoLabel}>Hospital</span>
                              <span style={styles.infoValue}>{patient.hospital}</span>
                            </div>
                            <div style={styles.infoItem}>
                              <span style={styles.infoLabel}>Location</span>
                              <span style={styles.infoValue}>Available</span>
                            </div>
                          </div>

                          <div style={styles.amountSection}>
                            <div style={styles.amountGrid}>
                              <div style={styles.amountItem}>
                                <span style={{...styles.amountValue, color: "#059669"}}>
                                  {formatCurrency(patient.amount)}
                                </span>
                                <span style={styles.amountLabel}>Total Required</span>
                              </div>
                              <div style={styles.amountItem}>
                                <span style={{...styles.amountValue, color: "#dc2626"}}>
                                  {formatCurrency(patient.balance_amount)}
                                </span>
                                <span style={styles.amountLabel}>Still Needed</span>
                              </div>
                            </div>
                          </div>

                          <button
                            style={{
                              ...styles.donateButton,
                              ...(hoveredCard === patient._id ? styles.donateButtonHover : {}),
                            }}
                            onClick={() => {
                              setSelected(patient);
                              setOpen(true);
                            }}
                          >
                            Donate Now 💝
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>🏥</div>
                    <h3 style={styles.emptyTitle}>No Active Cases</h3>
                    <p style={styles.emptyMessage}>
                      There are currently no patients requiring financial assistance.
                      Please check back later or contact the hospital administration for updates.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      </div>

      {/* Payment Modal */}
      {open && selected && (
        <PaymentModal
          patient={selected}
          onClose={() => {
            setOpen(false);
            setSelected(null);
          }}
          onSuccess={() => {
            setOpen(false);
            setSelected(null);
            // Refresh patient data after successful payment
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

export default Donorgetpatientdetails;
