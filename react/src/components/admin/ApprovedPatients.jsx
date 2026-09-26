import React, { useEffect, useState } from 'react';
import { toast } from '../feedback/feedback';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { admingetallpatientdetails } from '../../api';
import AdminNavbar from "../admin/AdminNavbar";

// Professional Hospital Theme Styles for Approved Patients
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
    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    borderRadius: "16px",
    padding: "2rem",
    margin: "0 1rem 2rem 1rem",
    boxShadow: "0 10px 40px rgba(5, 150, 105, 0.15)",
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

  // Search Section
  searchSection: {
    margin: "0 1rem 2rem 1rem",
    display: "flex",
    justifyContent: "center",
  },
  searchContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e2e8f0",
    width: "100%",
    maxWidth: "600px",
  },
  searchInput: {
    width: "100%",
    padding: "0.875rem 1rem",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "1rem",
    color: "#1f2937",
    backgroundColor: "#ffffff",
    outline: "none",
    transition: "all 0.2s ease-in-out",
    fontFamily: "inherit",
    backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3ccircle cx='11' cy='11' r='8'%3e%3c/circle%3e%3cpath d='m21 21-4.35-4.35'%3e%3c/path%3e%3c/svg%3e\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 1rem center",
    backgroundSize: "1.25rem",
    paddingRight: "3rem",
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
    backgroundColor: "#10b981",
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
    backgroundColor: "#eff6ff",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#3b82f6",
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

  // Amount Section
  amountSection: {
    backgroundColor: "#f0fdf4",
    borderRadius: "8px",
    padding: "1rem",
    marginTop: "1.5rem",
    border: "1px solid #bbf7d0",
  },
  amountLabel: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#166534",
    marginBottom: "0.5rem",
  },
  amountValue: {
    fontSize: "1.5rem",
    fontWeight: "800",
    color: "#166534",
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
    searchContainer: {
      margin: "0 0.5rem",
    },
  },
};

function ApprovedPatients() {
  const Navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth?.token);
  const [patients, setPatients] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  async function fetchPatient() {
    try {
      const data = await admingetallpatientdetails(token);
      const approved = data.filter((p) => p.approved === true);
      setAllPatients(approved); // store full list
      setPatients(approved);
    } catch (err) {
      toast.error(err?.error || 'Please refresh the page.', 'Couldn’t load patients');
    }
  }

  useEffect(() => {
    if (!token) {
      Navigate('/login');
      return;
    }

    fetchPatient();

  }, [token, dispatch, Navigate]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (value.trim() === '') {
      setPatients(allPatients);
    } else {
      const filtered = allPatients.filter(
        (p) =>
          (p.name?.toLowerCase() || '').includes(value.toLowerCase()) ||
          (p.email?.toLowerCase() || '').includes(value.toLowerCase()) ||
          (p.mobile?.toLowerCase() || '').includes(value.toLowerCase()) ||
          (p.date?.toLowerCase() || '').includes(value.toLowerCase())
      );
      setPatients(filtered);
    }
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
              ✅
            </div>
            <h1 style={styles.headerTitle}>
              Approved Patients
            </h1>
            <p style={styles.headerSubtitle}>
              Manage patients who have been approved for medical assistance
            </p>
          </div>

          {/* Admin Navbar */}
          <AdminNavbar />

          {/* Search Section */}
          <div style={styles.searchSection}>
            <div style={styles.searchContainer}>
              <input
                type="search"
                placeholder="Search by name, email, mobile, or date..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={styles.searchInput}
                onFocus={(e) => Object.assign(e.target.style, {
                  borderColor: "#3b82f6",
                  boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                })}
                onBlur={(e) => Object.assign(e.target.style, {
                  borderColor: "#e2e8f0",
                  boxShadow: "none",
                })}
              />
            </div>
          </div>

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
                    Approved
                  </div>

                  {/* Patient Header */}
                  <div style={styles.patientHeader}>
                    <div style={styles.patientAvatar}>
                      {patient.name ? patient.name.charAt(0).toUpperCase() : "👤"}
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
                      <span style={styles.detailIcon}>📱</span>
                      <span style={styles.detailLabel}>Mobile:</span>
                      <span style={styles.detailValue}>{patient.mobile || "Not provided"}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>📅</span>
                      <span style={styles.detailLabel}>Date:</span>
                      <span style={styles.detailValue}>{patient.date || "Not specified"}</span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>🆔</span>
                      <span style={styles.detailLabel}>Status:</span>
                      <span style={{ ...styles.detailValue, color: "#10b981", fontWeight: "600" }}>
                        Approved
                      </span>
                    </div>
                  </div>

                  {/* Amount Section */}
                  <div style={styles.amountSection}>
                    <div style={styles.amountLabel}>Required Amount</div>
                    <div style={styles.amountValue}>
                      ₹{patient.amount ? patient.amount.toLocaleString() : "0"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  📋
                </div>
                <h3 style={styles.emptyTitle}>No Approved Patients Found</h3>
                <p style={styles.emptyDescription}>
                  {searchTerm
                    ? "No patients match your search criteria. Try adjusting your search terms."
                    : "There are currently no approved patients in the system."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ApprovedPatients;
