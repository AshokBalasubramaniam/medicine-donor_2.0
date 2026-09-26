import React from "react";
import { useNavigate } from "react-router-dom";

// Professional Hospital Theme Styles for Patient List Base
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
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    borderRadius: "16px",
    padding: "2rem",
    margin: "0",
    boxShadow: "0 10px 40px rgba(59, 130, 246, 0.15)",
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
    margin: "0",
    padding: "1rem",
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

  // Action Button
  actionButton: {
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "0.75rem 1.5rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "1.5rem",
  },
  actionButtonHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },

  // Empty State
  emptyState: {
    textAlign: "center",
    padding: "4rem 2rem",
    margin: "0",
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
      margin: "0",
      padding: "1.5rem",
    },
    headerTitle: {
      fontSize: "2rem",
    },
    patientsGrid: {
      margin: "0",
      padding: "0.5rem",
      gridTemplateColumns: "1fr",
      gap: "1rem",
    },
    patientCard: {
      padding: "1.5rem",
    },
    emptyState: {
      margin: "0",
      padding: "2rem 1rem",
    },
  },
};

export function PatientsListBase({ patients, title }) {
  const navigate = useNavigate();

  // Get appropriate colors and icons based on the title
  const getThemeConfig = (title) => {
    if (title.toLowerCase().includes("approved")) {
      return {
        gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
        avatarBg: "#eff6ff",
        avatarColor: "#10b981",
        badgeBg: "#10b981",
        badgeText: "Approved",
        icon: "✅",
        subtitle:
          "Manage patients who have been approved for medical assistance",
      };
    } else if (title.toLowerCase().includes("completed")) {
      return {
        gradient: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
        avatarBg: "#f3e8ff",
        avatarColor: "#7c3aed",
        badgeBg: "#7c3aed",
        badgeText: "Completed",
        icon: "🎉",
        subtitle:
          "Patients who have successfully completed their medical funding goals",
      };
    } else if (title.toLowerCase().includes("pending")) {
      return {
        gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        avatarBg: "#fffbeb",
        avatarColor: "#f59e0b",
        badgeBg: "#f59e0b",
        badgeText: "Pending",
        icon: "⏳",
        subtitle: "Patients awaiting approval for medical assistance",
      };
    } else if (title.toLowerCase().includes("rejected")) {
      return {
        gradient: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
        avatarBg: "#fef2f2",
        avatarColor: "#dc2626",
        badgeBg: "#dc2626",
        badgeText: "Rejected",
        icon: "❌",
        subtitle: "Patients whose applications were not approved",
      };
    } else {
      // Default/All Patients
      return {
        gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        avatarBg: "#eff6ff",
        avatarColor: "#3b82f6",
        badgeBg: patients.approved ? "#10b981" : "#f59e0b",
        badgeText: patients.approved ? "Approved" : "Pending",
        icon: "👥",
        subtitle: "All registered patients in the system",
      };
    }
  };

  const themeConfig = getThemeConfig(title);

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
          <div style={{ ...styles.header, background: themeConfig.gradient }}>
            <div style={styles.headerIcon}>{themeConfig.icon}</div>
            <h1 style={styles.headerTitle}>{title}</h1>
            <p style={styles.headerSubtitle}>{themeConfig.subtitle}</p>
          </div>

          {/* Patients Grid */}
          <div style={styles.patientsGrid}>
            {patients && patients.length > 0 ? (
              patients.map((patient, index) => (
                <div
                  key={patient._id || patient.id || index}
                  style={styles.patientCard}
                  className="patient-card"
                  onMouseEnter={(e) =>
                    Object.assign(e.target.style, styles.patientCardHover)
                  }
                  onMouseLeave={(e) =>
                    Object.assign(e.target.style, styles.patientCard)
                  }
                >
                  {/* Status Badge */}
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: patient.approved ? "#10b981" : "#f59e0b",
                    }}
                  >
                    {patient.approved ? "Approved" : "Pending"}
                  </div>

                  {/* Patient Header */}
                  <div style={styles.patientHeader}>
                    <div
                      style={{
                        ...styles.patientAvatar,
                        backgroundColor: themeConfig.avatarBg,
                        color: themeConfig.avatarColor,
                      }}
                    >
                      {patient.name
                        ? patient.name.charAt(0).toUpperCase()
                        : "👤"}
                    </div>
                    <h3 style={styles.patientName}>
                      {patient.name || patient.fullName || "Unnamed Patient"}
                    </h3>
                  </div>

                  {/* Patient Details */}
                  <div style={styles.patientDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>🎂</span>
                      <span style={styles.detailLabel}>Age:</span>
                      <span style={styles.detailValue}>
                        {patient.age || "Not specified"}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>⚧</span>
                      <span style={styles.detailLabel}>Gender:</span>
                      <span style={styles.detailValue}>
                        {patient.sex || patient.gender || "Not specified"}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>🏥</span>
                      <span style={styles.detailLabel}>Hospital:</span>
                      <span style={styles.detailValue}>
                        {patient.hospitalname ||
                          patient.hospital ||
                          "Not specified"}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailIcon}>📊</span>
                      <span style={styles.detailLabel}>Status:</span>
                      <span
                        style={{
                          ...styles.detailValue,
                          color: patient.approved ? "#10b981" : "#f59e0b",
                          fontWeight: "600",
                        }}
                      >
                        {patient.approved ? "Approved" : "Pending Review"}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() =>
                      navigate(`/admin/patients/${patient._id || patient.id}`)
                    }
                    style={styles.actionButton}
                    onMouseOver={(e) =>
                      Object.assign(e.target.style, styles.actionButtonHover)
                    }
                    onMouseOut={(e) =>
                      Object.assign(e.target.style, styles.actionButton)
                    }
                  >
                    <span>👁️</span>
                    View Details
                  </button>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📋</div>
                <h3 style={styles.emptyTitle}>No Patients Found</h3>
                <p style={styles.emptyDescription}>
                  There are currently no patients in this category.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
