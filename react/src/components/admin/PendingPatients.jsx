import React, { useState, useEffect } from 'react';
import { confirm, toast } from '../feedback/feedback';
import { cloudinaryThumb } from '../../utils/cloudinary';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { admingetallpatientdetails, adminUpdatePatient } from '../../api';
import AdminNavbar from "../admin/AdminNavbar";

// Professional Hospital Theme Styles for Pending Patients
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
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    borderRadius: "16px",
    padding: "2rem",
    margin: "0 1rem 2rem 1rem",
    boxShadow: "0 10px 40px rgba(245, 158, 11, 0.15)",
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
    backgroundColor: "#f59e0b",
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
    backgroundColor: "#fef3c7",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f59e0b",
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

  // Action Buttons
  actionButtons: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "1.5rem",
  },
  viewButton: {
    flex: 1,
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
  viewButtonHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
  },

  // Detail View Container
  detailContainer: {
    width: "100%",
    padding: "0",
  },
  detailCard: {
    backgroundColor: "#ffffff",
    borderRadius: "0",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.2)",
    overflow: "hidden",
    margin: "0",
  },

  // Detail Header
  detailHeader: {
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    padding: "1.5rem",
    textAlign: "center",
    position: "relative",
    margin: "0",
  },
  detailIcon: {
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
  detailTitle: {
    fontSize: "1.875rem",
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: "0.5rem",
  },
  detailSubtitle: {
    fontSize: "1rem",
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },

  // Detail Content
  detailContent: {
    padding: "1rem",
  },

  // Patient Profile Section
  profileSection: {
    display: "flex",
    gap: "2rem",
    marginBottom: "2rem",
    alignItems: "flex-start",
  },
  profileImageWrapper: {
    flex: "0 0 200px",
    textAlign: "center",
  },
  profileImage: {
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #e2e8f0",
    marginBottom: "1rem",
  },
  profileImageUpload: {
    display: "inline-block",
    padding: "0.5rem 1rem",
    backgroundColor: "#f3f4f6",
    border: "2px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.875rem",
    color: "#374151",
    transition: "all 0.2s ease",
  },
  profileImageUploadHover: {
    backgroundColor: "#e5e7eb",
    borderColor: "#9ca3af",
  },

  // Profile Info
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: "2rem",
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: "0.5rem",
  },
  profileMeta: {
    fontSize: "1.125rem",
    color: "#64748b",
    marginBottom: "1.5rem",
  },
  profileActions: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },

  // Form Section
  formSection: {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "2rem",
    border: "1px solid #e2e8f0",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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
    borderColor: "#f59e0b",
    boxShadow: "0 0 0 3px rgba(245, 158, 11, 0.1)",
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
  formTextarea: {
    padding: "0.875rem 1rem",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "1rem",
    color: "#1f2937",
    backgroundColor: "#ffffff",
    outline: "none",
    transition: "all 0.2s ease-in-out",
    fontFamily: "inherit",
    minHeight: "100px",
    resize: "vertical",
  },

  // Button Styles
  primaryButton: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
  },
  dangerButton: {
    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
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
  dangerButtonHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
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
    profileSection: {
      flexDirection: "column",
      textAlign: "center",
    },
    profileImageWrapper: {
      flex: "none",
    },
    formGrid: {
      gridTemplateColumns: "1fr",
    },
    detailContent: {
      padding: "0.5rem",
    },
    detailCard: {
      margin: "0 0.5rem",
    },
  },
};

function PendingPatients() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth?.token);

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editPatient, setEditPatient] = useState({});
  const [loading, setLoading] = useState(false);
  const [dpFile, setDpFile] = useState(null);
  const [dpPreview, setDpPreview] = useState(null);

  async function fetchPatients() {
    try {
      const data = await admingetallpatientdetails(token);
      setPatients(data.filter((p) => p.approved === false));
    } catch (err) {
      console.error('Fetch patients error:', err);
    }
  }

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchPatients();
  }, [token, dispatch, navigate]);

  useEffect(() => {
    if (selectedPatient) {
      setEditPatient({
        id: selectedPatient.id || '',
        name: selectedPatient.name || '',
        email: selectedPatient.email || '',
        age: selectedPatient.age ?? '',
        date: selectedPatient.date || '',
        time: selectedPatient.time || '',
        mobile: selectedPatient.mobile || '',
        sex: selectedPatient.sex || '',
        relationshipstatus: selectedPatient.relationshipstatus || '',
        image: selectedPatient.image || '',
        disease: selectedPatient.disease || '',
        medicines: selectedPatient.medicines || '',
        address: selectedPatient.address || '',
        admission: selectedPatient.admission || '',
        discharge: selectedPatient.discharge || '',
      });
      if (selectedPatient.image) setDpPreview(selectedPatient.image);
    }
  }, [selectedPatient]);

  async function handleApprove() {
    const ok = await confirm({
      title: 'Approve this patient?',
      message: `${editPatient.name || 'The patient'} will become visible to donors with the details you entered.`,
      confirmText: 'Approve',
      icon: 'approve',
    });
    if (!ok) return;
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(editPatient).forEach((key) => {
        if (editPatient[key]) formData.append(key, editPatient[key]);
      });
      if (dpFile) formData.append('image', dpFile);
      formData.append('approved', 'true');
      await adminUpdatePatient(token, editPatient.id, formData);
      toast.success(`${editPatient.name || 'Patient'} is now visible to donors.`, 'Patient approved');
      setSelectedPatient(null);
      setPatients((prev) => prev.filter((p) => p._id !== editPatient.id));
      fetchPatients();
    } catch (err) {
      console.error('Approve error:', err);
      toast.error(err?.error || 'Please try again.', 'Couldn’t approve patient');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    const ok = await confirm({
      title: 'Reject this application?',
      message: `${editPatient.name || 'This patient'}’s application will be marked as rejected.`,
      confirmText: 'Reject',
      tone: 'danger',
      icon: 'reject',
    });
    if (!ok) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('rejected', 'true');
      await adminUpdatePatient(token, editPatient.id, formData);
      toast.success(`${editPatient.name || 'The'} application was rejected.`, 'Application rejected');
      setSelectedPatient(null);
      setPatients((prev) => prev.filter((p) => p._id !== editPatient.id));
      fetchPatients(); // Refresh the list
    } catch (err) {
      console.error('Reject error:', err);
      toast.error(err?.error || 'Please try again.', 'Couldn’t reject application');
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setDpFile(file);
      setDpPreview(URL.createObjectURL(file));
    }
  }

  // Handle file change for profile image
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setDpFile(file);
      setDpPreview(URL.createObjectURL(file));
    }
  }

  // Render list view if no patient is selected
  if (!selectedPatient) {
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
                ⏳
              </div>
              <h1 style={styles.headerTitle}>
                Pending Patients
              </h1>
              <p style={styles.headerSubtitle}>
                Review and approve patient applications awaiting medical assistance
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
                      Pending Review
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
                    </div>

                    {/* Action Buttons */}
                    <div style={styles.actionButtons}>
                      <button
                        style={styles.viewButton}
                        onClick={() => setSelectedPatient(patient)}
                        onMouseOver={(e) => Object.assign(e.target.style, styles.viewButtonHover)}
                        onMouseOut={(e) => Object.assign(e.target.style, styles.viewButton)}
                      >
                        <span>👁️</span>
                        Review Application
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    📋
                  </div>
                  <h3 style={styles.emptyTitle}>No Pending Applications</h3>
                  <p style={styles.emptyDescription}>
                    All patient applications have been reviewed. New applications will appear here for review.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render detail/edit view
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
        <div style={styles.detailContainer}>
          <div style={styles.detailCard}>
            {/* Detail Header */}
            <div style={styles.detailHeader}>
              <div style={styles.detailIcon}>
                👤
              </div>
              <h2 style={styles.detailTitle}>
                Patient Application Review
              </h2>
              <p style={styles.detailSubtitle}>
                Review and process patient application details
              </p>
            </div>

            {/* Detail Content */}
            <div style={styles.detailContent}>
              {/* Patient Profile Section */}
              <div style={styles.profileSection}>
                <div style={styles.profileImageWrapper}>
                  <img
                    src={
                      cloudinaryThumb(dpPreview || editPatient.image) ||
                      'https://cdn-icons-png.flaticon.com/512/847/847969.png'
                    }
                    alt="Patient"
                    style={styles.profileImage}
                  />
                  <label
                    style={styles.profileImageUpload}
                    onMouseOver={(e) => Object.assign(e.target.style, styles.profileImageUploadHover)}
                    onMouseOut={(e) => Object.assign(e.target.style, styles.profileImageUpload)}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    📷 Change Photo
                  </label>
                </div>

                <div style={styles.profileInfo}>
                  <h3 style={styles.profileName}>{editPatient.name}</h3>
                  <div style={styles.profileMeta}>
                    {editPatient.age ? `${editPatient.age} years old` : 'Age not specified'} • {editPatient.sex || 'Gender not specified'}
                  </div>
                  <div style={styles.profileActions}>
                    <button
                      style={styles.primaryButton}
                      onClick={handleApprove}
                      disabled={loading}
                      onMouseOver={(e) => !loading && Object.assign(e.target.style, styles.primaryButtonHover)}
                      onMouseOut={(e) => Object.assign(e.target.style, styles.primaryButton)}
                    >
                      {loading ? (
                        <>
                          <div style={styles.loadingSpinner}></div>
                          Approving...
                        </>
                      ) : (
                        <>
                          <span>✅</span>
                          Approve Patient
                        </>
                      )}
                    </button>

                    <button
                      style={styles.dangerButton}
                      onClick={handleReject}
                      disabled={loading}
                      onMouseOver={(e) => !loading && Object.assign(e.target.style, styles.dangerButtonHover)}
                      onMouseOut={(e) => Object.assign(e.target.style, styles.dangerButton)}
                    >
                      <span>❌</span>
                      Reject Application
                    </button>

                    <button
                      style={styles.secondaryButton}
                      onClick={() => setSelectedPatient(null)}
                      onMouseOver={(e) => Object.assign(e.target.style, styles.secondaryButtonHover)}
                      onMouseOut={(e) => Object.assign(e.target.style, styles.secondaryButton)}
                    >
                      <span>⬅️</span>
                      Back to List
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div style={styles.formSection}>
                <form onSubmit={(e) => { e.preventDefault(); handleApprove(); }}>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>🆔</span>
                        Patient ID
                      </label>
                      <input
                        style={styles.formInput}
                        value={editPatient.id}
                        disabled
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>👤</span>
                        Full Name
                      </label>
                      <input
                        style={styles.formInput}
                        value={editPatient.name}
                        onChange={(e) => setEditPatient({ ...editPatient, name: e.target.value })}
                        onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>💰</span>
                        Required Amount (₹)
                      </label>
                      <input
                        type="number"
                        style={styles.formInput}
                        value={editPatient.amount || ''}
                        onChange={(e) => setEditPatient({ ...editPatient, amount: e.target.value })}
                        placeholder="Enter amount needed"
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
                        style={styles.formInput}
                        value={editPatient.email}
                        disabled
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>🎂</span>
                        Age
                      </label>
                      <input
                        type="number"
                        style={styles.formInput}
                        value={editPatient.age}
                        onChange={(e) => setEditPatient({ ...editPatient, age: e.target.value })}
                        onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>📱</span>
                        Mobile Number
                      </label>
                      <input
                        style={styles.formInput}
                        value={editPatient.mobile}
                        onChange={(e) => setEditPatient({ ...editPatient, mobile: e.target.value })}
                        onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>⚧</span>
                        Gender
                      </label>
                      <select
                        style={styles.formSelect}
                        value={editPatient.sex || ''}
                        onChange={(e) => setEditPatient({ ...editPatient, sex: e.target.value })}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>💕</span>
                        Relationship Status
                      </label>
                      <select
                        style={styles.formSelect}
                        value={editPatient.relationshipstatus || ''}
                        onChange={(e) => setEditPatient({ ...editPatient, relationshipstatus: e.target.value })}
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>🏥</span>
                        Disease/Medical Condition
                      </label>
                      <textarea
                        style={styles.formTextarea}
                        value={editPatient.disease}
                        onChange={(e) => setEditPatient({ ...editPatient, disease: e.target.value })}
                        placeholder="Describe the medical condition"
                        onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, styles.formTextarea)}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>💊</span>
                        Required Medicines
                      </label>
                      <textarea
                        style={styles.formTextarea}
                        value={editPatient.medicines}
                        onChange={(e) => setEditPatient({ ...editPatient, medicines: e.target.value })}
                        placeholder="List required medicines"
                        onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, styles.formTextarea)}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>📅</span>
                        Admission Date
                      </label>
                      <input
                        type="date"
                        style={styles.formInput}
                        value={editPatient.admission || ''}
                        onChange={(e) => setEditPatient({ ...editPatient, admission: e.target.value })}
                        onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span>🏠</span>
                        Discharge Date
                      </label>
                      <input
                        type="date"
                        style={styles.formInput}
                        value={editPatient.discharge || ''}
                        onChange={(e) => setEditPatient({ ...editPatient, discharge: e.target.value })}
                        onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, styles.formInput)}
                      />
                    </div>

                    <div style={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label style={styles.formLabel}>
                        <span>🏠</span>
                        Address
                      </label>
                      <textarea
                        style={styles.formTextarea}
                        value={editPatient.address}
                        onChange={(e) => setEditPatient({ ...editPatient, address: e.target.value })}
                        placeholder="Enter full address"
                        onFocus={(e) => Object.assign(e.target.style, styles.formInputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, styles.formTextarea)}
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PendingPatients;
