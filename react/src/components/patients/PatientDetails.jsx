// Professional Medical Patient Details Component
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { confirm, toast } from '../feedback/feedback';
import { cloudinaryThumb } from '../../utils/cloudinary';
import { useNavigate } from 'react-router-dom';
import { getPatientDetails, updatePatientDetails } from '../../api';

// Professional Medical UI Styles
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

  // Patient Header Section
  patientHeader: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "2rem",
    marginBottom: "2rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    border: "1px solid #e2e8f0",
  },
  patientHeaderContent: {
    display: "flex",
    alignItems: "center",
    gap: "2rem",
    flexWrap: "wrap",
  },
  patientAvatar: {
    position: "relative",
  },
  avatarImage: {
    width: "120px",
    height: "120px",
    borderRadius: "16px",
    objectFit: "cover",
    border: "4px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  },
  avatarBadge: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  },
  statusApproved: {
    backgroundColor: "#10b981",
    color: "#ffffff",
  },
  statusPending: {
    backgroundColor: "#f59e0b",
    color: "#ffffff",
  },
  patientInfo: {
    flex: 1,
    minWidth: "300px",
  },
  patientName: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "0.5rem",
    lineHeight: "1.2",
  },
  patientMeta: {
    display: "flex",
    gap: "2rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "#64748b",
    fontSize: "0.875rem",
  },
  metaIcon: {
    color: "#059669",
    fontSize: "16px",
  },
  patientId: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: "600",
    display: "inline-block",
    marginBottom: "1rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  patientActions: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },
  actionButton: {
    padding: "0.75rem 1.5rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    border: "none",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  primaryButton: {
    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
  },
  primaryButtonHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 6px 20px rgba(5, 150, 105, 0.4)",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    color: "#64748b",
    border: "2px solid #e2e8f0",
  },
  secondaryButtonHover: {
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },

  // Content Grid
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "2rem",
  },
  "@media (min-width: 1024px)": {
    contentGrid: {
      gridTemplateColumns: "2fr 1fr",
    },
  },

  // Information Cards
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    border: "1px solid #e2e8f0",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
    paddingBottom: "0.75rem",
    borderBottom: "2px solid #f1f5f9",
  },
  cardIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  cardContent: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "1rem",
  },
  "@media (min-width: 640px)": {
    cardContent: {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },

  // Form Fields
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  formLabel: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  formInput: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "0.875rem",
    color: "#1e293b",
    backgroundColor: "#ffffff",
    outline: "none",
    transition: "all 0.2s ease-in-out",
    fontFamily: "inherit",
  },
  formInputFocus: {
    borderColor: "#059669",
    boxShadow: "0 0 0 3px rgba(5, 150, 105, 0.1)",
  },
  formSelect: {
    ...this?.formInput,
    cursor: "pointer",
  },
  formTextarea: {
    ...this?.formInput,
    minHeight: "100px",
    resize: "vertical",
  },
  readOnlyField: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    color: "#64748b",
    cursor: "not-allowed",
  },

  // Medical History Section
  medicalHistory: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    border: "1px solid #e2e8f0",
  },
  historyHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
    paddingBottom: "0.75rem",
    borderBottom: "2px solid #f1f5f9",
  },
  historyIcon: {
    width: "40px",
    height: "40px",
    backgroundColor: "#fef3c7",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#d97706",
    fontSize: "18px",
  },
  historyTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  historyGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "1rem",
  },
  "@media (min-width: 640px)": {
    historyGrid: {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
  historyItem: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "1rem",
    border: "1px solid #e2e8f0",
  },
  historyLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.25rem",
  },
  historyValue: {
    fontSize: "0.875rem",
    color: "#1e293b",
    fontWeight: "500",
  },

  // Status Cards
  statusCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    border: "1px solid #e2e8f0",
  },
  statusHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  statusIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },
  statusTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "0.875rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statusApproved: {
    backgroundColor: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },
  statusPending: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fde68a",
  },

  // Loading States
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

  // Error States
  errorMessage: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  errorIcon: {
    color: "#dc2626",
    fontSize: "20px",
  },
  errorText: {
    fontSize: "0.875rem",
    color: "#dc2626",
    fontWeight: "500",
    margin: 0,
  },

  // File Upload
  fileUpload: {
    marginTop: "1rem",
  },
  fileInput: {
    display: "none",
  },
  fileLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    backgroundColor: "#f1f5f9",
    border: "2px dashed #cbd5e1",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    color: "#475569",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  fileLabelHover: {
    backgroundColor: "#e2e8f0",
    borderColor: "#94a3b8",
  },
};

function PatientDetails() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth?.token);

  const [patient, setPatient] = useState(null);
  const [editpatient, setEditPatient] = useState({
    id: '',
    name: '',
    email: '',
    age: '',
    date: '',
    time: '',
    mobile: '',
    image: '',
    sex: '',
    relationshipstatus: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dpFile, setDpFile] = useState(null);
  const [dpPreview, setDpPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    async function fetchPatient() {
      setLoading(true);
      setError('');
      try {
        const data = await getPatientDetails(token);
        setPatient(data);
      } catch (err) {
        console.error('Fetch details error:', err);
        setError(err.error || 'Failed to fetch patient details');
      } finally {
        setLoading(false);
      }
    }

    fetchPatient();

  }, [token, dispatch, navigate]);

  useEffect(() => {
    if (patient) {
      setEditPatient({
        id: patient.id || patient._id || '',
        name: patient.name || '',
        email: patient.email || '',
        // New accounts start with age 0; show it as empty so the min=1 check doesn't block saving.
        age: patient.age ? patient.age : '',
        date: patient.date || '',
        time: patient.time || '',
        mobile: patient.mobile || '',
        sex: patient.gender || patient.sex || '',
        relationshipstatus: patient.relationship || patient.relationshipstatus || '',
        image: patient.image || '',
      });
      if (patient.image) setDpPreview(patient.image);
    }
  }, [patient]);

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading && !patient) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading patient information...</p>
        </div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div style={styles.container}>
        <div style={styles.mainContent}>
          <div style={styles.errorMessage}>
            <span style={styles.errorIcon}>⚠️</span>
            <p style={styles.errorText}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <p style={styles.loadingText}>Patient data not available</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await confirm({
      title: 'Save changes?',
      message: 'Your profile will be updated with the details you entered.',
      confirmText: 'Save changes',
      icon: 'save',
    });
    if (!ok) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('id', editpatient.id);
      formData.append('name', editpatient.name);
      formData.append('email', editpatient.email);
      formData.append('age', editpatient.age);
      formData.append('date', editpatient.date);
      formData.append('time', editpatient.time);
      formData.append('mobile', editpatient.mobile);
      formData.append('gender', editpatient.sex || '');
      formData.append('relationship', editpatient.relationshipstatus || '');

      if (dpFile) {
        formData.append('image', dpFile);
      }

      await updatePatientDetails(token, formData);
      toast.success('Your profile details were updated.', 'Changes saved');

      const updated = await getPatientDetails(token);
      setPatient(updated);
      if (updated.image) setDpPreview(updated.image);
    } catch (err) {
      console.error('Update error:', err);
      setError(err.error || 'Failed to update patient details');
      toast.error(err.error || 'Failed to update patient details', 'Couldn’t save changes');
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setDpFile(file);
      setDpPreview(URL.createObjectURL(file));
      setError('');
    }
  }

  const handleInputChange = (field, value) => {
    setEditPatient(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
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
          @media (min-width: 1024px) {
            .content-grid { grid-template-columns: 2fr 1fr !important; }
          }
          @media (min-width: 640px) {
            .card-content, .history-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}
      </style>

      <div style={styles.container}>

        <main style={styles.mainContent}>
          {/* Patient Header Section */}
          <section style={styles.patientHeader}>
            <div style={styles.patientHeaderContent}>
              <div style={styles.patientAvatar}>
                <img
                  src={cloudinaryThumb(dpPreview || editpatient.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name || 'Patient')}&background=059669&color=fff&size=120`}
                  alt="Patient"
                  style={styles.avatarImage}
                />
                <div style={{
                  ...styles.avatarBadge,
                  ...(patient.approved ? styles.statusApproved : styles.statusPending)
                }}>
                  {patient.approved ? '✓' : '⏳'}
                </div>
              </div>

              <div style={styles.patientInfo}>
                <h1 style={styles.patientName}>{patient.name}</h1>

                <div style={styles.patientMeta}>
                  <div style={styles.metaItem}>
                    <span style={styles.metaIcon}>📅</span>
                    <span>Age: {patient.age || 'Not specified'}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaIcon}>👤</span>
                    <span>{patient.gender || patient.sex || 'Gender not specified'}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaIcon}>📞</span>
                    <span>{patient.mobile || 'Phone not provided'}</span>
                  </div>
                </div>

                <div style={styles.patientId}>
                  Patient ID: {patient.id || patient._id}
                </div>

                <div style={styles.patientActions}>
                  {!patient.approved && (
                    <button
                      style={styles.primaryButton}
                      onClick={() => document.getElementById('edit-form')?.scrollIntoView({ behavior: 'smooth' })}
                      onMouseOver={(e) => Object.assign(e.target.style, styles.primaryButtonHover)}
                      onMouseOut={(e) => Object.assign(e.target.style, styles.primaryButton)}
                    >
                      ✏️ Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Success/Error Messages */}
          {success && (
            <div style={{
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}>
              <span style={{ color: "#16a34a", fontSize: "20px" }}>✅</span>
              <p style={{ fontSize: "0.875rem", color: "#166534", fontWeight: "500", margin: 0 }}>
                {success}
              </p>
            </div>
          )}

          {error && (
            <div style={styles.errorMessage}>
              <span style={styles.errorIcon}>⚠️</span>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          {/* Content Grid */}
          <div style={styles.contentGrid} className="content-grid">

            {/* Personal Information Card */}
            <div style={styles.infoCard}>
              <div style={styles.cardHeader}>
                <div style={{
                  ...styles.cardIcon,
                  backgroundColor: "#dbeafe",
                  color: "#1d4ed8"
                }}>
                  👤
                </div>
                <h3 style={styles.cardTitle}>Personal Information</h3>
              </div>
              <div style={styles.cardContent} className="card-content">
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <span style={{ color: "#059669" }}>📧</span>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editpatient.email}
                    style={{ ...styles.formInput, ...styles.readOnlyField }}
                    readOnly
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <span style={{ color: "#059669" }}>📱</span>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={editpatient.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    style={patient.approved ? { ...styles.formInput, ...styles.readOnlyField } : styles.formInput}
                    disabled={patient.approved}
                    placeholder="Enter mobile number"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <span style={{ color: "#059669" }}>⚤</span>
                    Gender
                  </label>
                  <select
                    value={editpatient.sex || ""}
                    onChange={(e) => handleInputChange('sex', e.target.value)}
                    style={patient.approved ? { ...styles.formSelect, ...styles.readOnlyField } : styles.formSelect}
                    disabled={patient.approved}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <span style={{ color: "#059669" }}>💕</span>
                    Relationship Status
                  </label>
                  <select
                    value={editpatient.relationshipstatus || ""}
                    onChange={(e) => handleInputChange('relationshipstatus', e.target.value)}
                    style={patient.approved ? { ...styles.formSelect, ...styles.readOnlyField } : styles.formSelect}
                    disabled={patient.approved}
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medical Information Card */}
            <div style={styles.infoCard}>
              <div style={styles.cardHeader}>
                <div style={{
                  ...styles.cardIcon,
                  backgroundColor: "#fef3c7",
                  color: "#d97706"
                }}>
                  🏥
                </div>
                <h3 style={styles.cardTitle}>Medical Information</h3>
              </div>
              <div style={styles.cardContent} className="card-content">
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <span style={{ color: "#dc2626" }}>🩺</span>
                    Disease/Condition
                  </label>
                  <textarea
                    value={patient.disease || ""}
                    style={{ ...styles.formTextarea, ...styles.readOnlyField }}
                    readOnly
                    rows={3}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <span style={{ color: "#059669" }}>💊</span>
                    Prescribed Medicines
                  </label>
                  <textarea
                    value={patient.medicines || ""}
                    style={patient.approved ? { ...styles.formTextarea, ...styles.readOnlyField } : styles.formTextarea}
                    disabled={patient.approved}
                    rows={3}
                    placeholder="List prescribed medicines"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <span style={{ color: "#059669" }}>🏥</span>
                    Hospital/Clinic
                  </label>
                  <input
                    type="text"
                    value={patient.hospitalname || patient.hospital || ""}
                    style={{ ...styles.formInput, ...styles.readOnlyField }}
                    readOnly
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    <span style={{ color: "#059669" }}>👨‍⚕️</span>
                    Doctor Name
                  </label>
                  <input
                    type="text"
                    value={patient.doctor || ""}
                    style={{ ...styles.formInput, ...styles.readOnlyField }}
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div style={styles.medicalHistory}>
              <div style={styles.historyHeader}>
                <div style={styles.historyIcon}>📋</div>
                <h3 style={styles.historyTitle}>Medical History</h3>
              </div>
              <div style={styles.historyGrid} className="history-grid">
                <div style={styles.historyItem}>
                  <div style={styles.historyLabel}>Admission Date</div>
                  <div style={styles.historyValue}>{formatDate(patient.admissiondate)}</div>
                </div>

                <div style={styles.historyItem}>
                  <div style={styles.historyLabel}>Discharge Date</div>
                  <div style={styles.historyValue}>{formatDate(patient.dischargedate)}</div>
                </div>

                <div style={styles.historyItem}>
                  <div style={styles.historyLabel}>Aadhar Number</div>
                  <div style={styles.historyValue}>{patient.aadharno || 'Not provided'}</div>
                </div>

                <div style={styles.historyItem}>
                  <div style={styles.historyLabel}>PAN Number</div>
                  <div style={styles.historyValue}>{patient.panno || 'Not provided'}</div>
                </div>

                <div style={styles.historyItem}>
                  <div style={styles.historyLabel}>Emergency Contact</div>
                  <div style={styles.historyValue}>{patient.emergencyContact || 'Not provided'}</div>
                </div>

                <div style={styles.historyItem}>
                  <div style={styles.historyLabel}>Zone/Area</div>
                  <div style={styles.historyValue}>{patient.zone || 'Not specified'}</div>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div style={styles.statusCard}>
              <div style={styles.statusHeader}>
                <div style={{
                  ...styles.statusIcon,
                  backgroundColor: patient.approved ? "#f0fdf4" : "#fef3c7",
                  color: patient.approved ? "#16a34a" : "#d97706"
                }}>
                  {patient.approved ? "✅" : "⏳"}
                </div>
                <h3 style={styles.statusTitle}>Application Status</h3>
              </div>

              <div style={{
                ...styles.statusBadge,
                ...(patient.approved ? styles.statusApproved : styles.statusPending)
              }}>
                {patient.approved ? "Approved" : "Pending Review"}
              </div>

              <p style={{
                fontSize: "0.875rem",
                color: "#64748b",
                margin: "1rem 0 0 0",
                lineHeight: "1.5"
              }}>
                {patient.approved
                  ? "Your application has been approved. Your profile is now read-only and you can apply for medicine donations."
                  : "Your application is under review. Once approved, you'll be able to edit your profile and apply for medicine donations."
                }
              </p>
            </div>

            {/* Editable Form Section */}
            {!patient.approved && (
              <div style={styles.infoCard} id="edit-form">
                <div style={styles.cardHeader}>
                  <div style={{
                    ...styles.cardIcon,
                    backgroundColor: "#e0f2fe",
                    color: "#0277bd"
                  }}>
                    ✏️
                  </div>
                  <h3 style={styles.cardTitle}>Edit Profile Information</h3>
                </div>

                <form onSubmit={handleSubmit}>
                  <div style={styles.cardContent} className="card-content">
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span style={{ color: "#059669" }}>👤</span>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editpatient.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        style={styles.formInput}
                        required
                        placeholder="Enter full name"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span style={{ color: "#059669" }}>🎂</span>
                        Age
                      </label>
                      <input
                        type="number"
                        value={editpatient.age}
                        onChange={(e) => handleInputChange('age', e.target.value)}
                        style={styles.formInput}
                        min="1"
                        max="150"
                        placeholder="Enter age"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span style={{ color: "#059669" }}>🏠</span>
                        Address
                      </label>
                      <textarea
                        value={patient.address || ""}
                        style={{ ...styles.formTextarea, ...styles.readOnlyField }}
                        readOnly
                        rows={3}
                        placeholder="Address information"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span style={{ color: "#059669" }}>🖼️</span>
                        Profile Picture
                      </label>
                      <div style={styles.fileUpload}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          style={styles.fileInput}
                          id="profile-image"
                        />
                        <label
                          htmlFor="profile-image"
                          style={styles.fileLabel}
                          onMouseOver={(e) => Object.assign(e.target.style, styles.fileLabelHover)}
                          onMouseOut={(e) => Object.assign(e.target.style, styles.fileLabel)}
                        >
                          📎 Choose Image
                        </label>
                        {dpFile && (
                          <span style={{
                            marginLeft: "1rem",
                            fontSize: "0.875rem",
                            color: "#059669",
                            fontWeight: "500"
                          }}>
                            ✓ {dpFile.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: "2rem",
                    paddingTop: "1rem",
                    borderTop: "2px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "1rem"
                  }}>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        ...styles.primaryButton,
                        opacity: saving ? 0.6 : 1,
                        cursor: saving ? 'not-allowed' : 'pointer'
                      }}
                      onMouseOver={(e) => {
                        if (!saving) Object.assign(e.target.style, styles.primaryButtonHover);
                      }}
                      onMouseOut={(e) => {
                        if (!saving) Object.assign(e.target.style, styles.primaryButton);
                      }}
                    >
                      {saving ? (
                        <>
                          <div style={{
                            width: "16px",
                            height: "16px",
                            border: "2px solid rgba(255, 255, 255, 0.3)",
                            borderTop: "2px solid #ffffff",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            display: "inline-block",
                            marginRight: "0.5rem"
                          }}></div>
                          Saving...
                        </>
                      ) : (
                        <>💾 Save Changes</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}

export default PatientDetails;
