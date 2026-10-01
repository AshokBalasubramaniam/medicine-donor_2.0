import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  Droplet,
  FileText,
  Heart,
  HeartPulse,
  Hospital,
  IdCard,
  IndianRupee,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Pill,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { cloudinaryThumb } from '../../utils/cloudinary';
import { getPatientDetails } from '../../api';
import PatientEditForm from './PatientEditForm';
import { REQUIRED_FOR_REVIEW, prescriptionOf } from './patientFields';
import './patient-dashboard.css';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1764885415480-558e5631d371?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1600';

const SEVERITY_TONE = { Mild: 'green', Moderate: 'amber', Severe: 'orange', Critical: 'red' };

// BSON DateTime arrives as { $date: { $numberLong } } or { $date: "<iso>" }.
function bsonDate(value) {
  const d = value?.$date ?? value;
  return d?.$numberLong ? Number(d.$numberLong) : d;
}

function formatDate(value, fallback = 'Not set') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(value) {
  if (!value) return '';
  const [h, m] = String(value).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return String(value);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function maskTail(value, visible = 4) {
  if (!value) return 'Not provided';
  const s = String(value);
  return s.length <= visible ? s : '•'.repeat(s.length - visible) + s.slice(-visible);
}

function stayLength(admit, discharge) {
  if (!admit) return 'Not applicable';
  const start = new Date(admit);
  const end = discharge ? new Date(discharge) : new Date();
  const days = Math.max(0, Math.round((end - start) / 86400000));
  if (Number.isNaN(days)) return 'Not applicable';
  return `${days} day${days === 1 ? '' : 's'}${discharge ? '' : ' (still admitted)'}`;
}

function initials(name) {
  if (!name) return 'P';
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Single application state derived from admin + payment fields. */
function applicationState(p) {
  const amount = Number(p.amount) || 0;
  const paid = Number(p.paid_amount) || 0;
  if (p.rejected) return { key: 'rejected', label: 'REJECTED', amount, paid };
  if (p.approved && amount > 0 && paid >= amount) return { key: 'funded', label: 'FULLY FUNDED', amount, paid };
  if (p.approved) return { key: 'approved', label: 'APPROVED', amount, paid };
  return { key: 'pending', label: 'PENDING REVIEW', amount, paid };
}

function SectionTitle({ icon: Icon, title, subtitle, action, onAction }) {
  return (
    <div className="pd-section-head">
      <div className="pd-section-title">
        <span className="pd-section-icon" aria-hidden="true"><Icon size={20} /></span>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {action && <button type="button" className="pd-link-btn" onClick={onAction}>{action}</button>}
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, color = 'blue', wide = false, multiline = false }) {
  return (
    <div className={`pd-tile ${wide ? 'is-wide' : ''}`}>
      <span className={`pd-tile-icon is-${color}`} aria-hidden="true"><Icon size={18} /></span>
      <div className="pd-tile-text">
        <p className="pd-tile-label">{label}</p>
        <p className={`pd-tile-value ${multiline ? 'is-multiline' : ''}`} title={typeof value === 'string' ? value : undefined}>{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, tone, onClick }) {
  return (
    <button type="button" className={`pd-quick is-${tone}`} onClick={onClick}>
      <span className="pd-quick-icon" aria-hidden="true"><Icon size={22} /></span>
      <span className="pd-quick-foot">
        <span className="pd-quick-title">{title}</span>
        <span className="pd-quick-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
      </span>
    </button>
  );
}

export default function PatientDetails() {
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth?.token);

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dpPreview, setDpPreview] = useState(null);
  // Bumped after each save so the edit form re-initialises from fresh data.
  const [saveCount, setSaveCount] = useState(0);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    (async () => {
      setLoading(true);
      setError('');
      try {
        setPatient(await getPatientDetails(token));
      } catch (err) {
        console.error('Fetch details error:', err);
        setError(err.error || 'Failed to fetch patient details');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, navigate]);

  if (loading && !patient) {
    return (
      <div className="pd-state">
        <span className="spinner spinner-lg" aria-hidden="true" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="pd-state">
        <p className="pd-error">{error || 'Patient data not available'}</p>
      </div>
    );
  }

  const app = applicationState(patient);
  const locked = !!patient.approved;
  const firstName = (patient.name || '').split(/\s+/)[0] || 'there';
  const avatar = cloudinaryThumb(dpPreview || patient.image);
  const meds = prescriptionOf(patient);
  const checklist = REQUIRED_FOR_REVIEW.map((item) => ({ label: item.label, done: item.ok(patient) }));
  const completeness = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const missing = checklist.filter((c) => !c.done);
  const fundedPct = app.amount > 0 ? Math.min(100, Math.round((app.paid / app.amount) * 100)) : 0;
  const severityTone = SEVERITY_TONE[patient.severity] || 'blue';
  const appointment = patient.date
    ? `${formatDate(patient.date)}${patient.time ? ` · ${formatTime(patient.time)}` : ''}`
    : 'Not scheduled';
  const fullAddress = [patient.address, patient.town, patient.state, patient.pincode].filter(Boolean).join(', ');

  const steps = [
    { label: 'Account created', done: true, note: formatDate(bsonDate(patient.created_at), '') },
    { label: 'Profile & medical details', done: completeness === 100, note: `${completeness}% complete` },
    {
      label: 'Admin review',
      done: patient.approved || patient.rejected,
      failed: !!patient.rejected,
      note: patient.rejected ? 'Rejected' : patient.approved ? 'Approved' : 'In progress',
    },
    {
      label: 'Receiving donations',
      done: app.key === 'funded',
      note: app.amount > 0 ? `${money(app.paid)} of ${money(app.amount)}` : patient.approved ? 'Amount being set' : 'After approval',
    },
  ];

  const statusMessage = {
    pending:
      completeness === 100
        ? 'Your application is complete and waiting for the hospital administration team to review it.'
        : 'Complete the missing details below so the hospital administration team can review your application.',
    approved: 'Your application is approved and visible to donors. Your profile is now read-only.',
    funded: 'Your medicine cost has been fully covered by donors. The hospital team will contact you about collection.',
    rejected: 'Your application was not approved. Please contact the hospital administration team to know the reason and next steps.',
  }[app.key];

  return (
    <div className="pd-page">
      {/* Hero */}
      <section id="pd-top" className="pd-hero">
        <img src={HERO_IMAGE} alt="" className="pd-hero-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div className="pd-hero-overlay" />
        <div className="pd-hero-body">
          <h1>Welcome back,<br /><span>{firstName}</span></h1>
          <p>Manage your medical information, track your applications and be a part of a healthier, stronger community.</p>
        </div>
        <div className="pd-hero-badge" aria-hidden="true">
          <Heart size={34} />
          <p>Donate<br />Medicines<br />Save Lives</p>
          <span />
        </div>
      </section>

      {/* Profile summary + quick actions */}
      <section id="pd-profile" className="pd-card pd-profile">
        <div className="pd-profile-main">
          {avatar ? (
            <img src={avatar} alt={patient.name} className="pd-avatar" />
          ) : (
            <div className="pd-avatar pd-avatar-initials" aria-hidden="true">{initials(patient.name)}</div>
          )}
          <div className="pd-profile-info">
            <div className="pd-profile-name">
              <h2>{patient.name}</h2>
              <span className="pd-chip is-green">Patient</span>
              <span className={`pd-chip is-${{ pending: 'amber', approved: 'green', funded: 'green', rejected: 'red' }[app.key]}`}>
                {app.label.charAt(0) + app.label.slice(1).toLowerCase()}
              </span>
            </div>
            <div className="pd-profile-meta">
              <span><Phone size={15} aria-hidden="true" /> {patient.mobile || 'Phone not provided'}</span>
              <span><Mail size={15} aria-hidden="true" /> {patient.email}</span>
            </div>
            <p className="pd-profile-sub">
              Age: {patient.age || 'Not specified'}
              <span className="pd-sep">|</span>
              Gender: {patient.gender || 'Not specified'}
              <span className="pd-sep">|</span>
              Blood: {patient.blood_group || '—'}
            </p>
          </div>
          <button type="button" className="pd-outline-btn" onClick={() => scrollTo('pd-edit')}>
            <Pencil size={15} aria-hidden="true" /> {locked ? 'View Profile' : 'Edit Profile'}
          </button>
        </div>
        <div className="pd-quick-grid">
          <QuickAction icon={Pill} title={'My\nMedicines'} tone="green" onClick={() => scrollTo('pd-medical')} />
          <QuickAction icon={HeartPulse} title={'Track\nApplication'} tone="blue" onClick={() => scrollTo('pd-status')} />
          <QuickAction icon={ClipboardList} title={locked ? 'Medical\nHistory' : 'Update\nMedical Info'} tone="purple" onClick={() => scrollTo(locked ? 'pd-history' : 'pd-edit')} />
        </div>
      </section>

      {error && <p className="pd-error" role="alert">{error}</p>}

      {/* Medical information */}
      <section id="pd-medical" className="pd-card">
        <SectionTitle
          icon={ClipboardList}
          title="Medical Information"
          subtitle="Current condition, treating doctor and prescription"
          action={locked ? undefined : 'Edit'}
          onAction={() => scrollTo('pd-edit')}
        />
        <div className="pd-tiles is-3">
          <InfoTile icon={Stethoscope} label="Diagnosis / Condition" value={patient.disease || 'Not specified'} />
          <InfoTile
            icon={AlertTriangle}
            label="Severity"
            color={severityTone === 'red' ? 'pink' : severityTone === 'amber' ? 'orange' : severityTone}
            value={patient.severity ? <span className={`pd-chip is-${severityTone}`}>{patient.severity}</span> : 'Not specified'}
          />
          <InfoTile icon={CalendarDays} label="Diagnosed On" value={formatDate(patient.diagnosis_date)} color="purple" />
          <InfoTile icon={Droplet} label="Blood Group" value={patient.blood_group || 'Not specified'} color="pink" />
          <InfoTile icon={ShieldAlert} label="Allergies" value={patient.allergies || 'Not specified'} color="orange" />
          <InfoTile icon={Activity} label="Other Conditions" value={patient.chronic_conditions || 'None listed'} color="green" />
          <InfoTile icon={Hospital} label="Hospital / Clinic" value={[patient.hospitalname, patient.hospital_address].filter(Boolean).join(' — ') || 'Not specified'} />
          <InfoTile icon={UserRound} label="Treating Doctor" value={[patient.doctor, patient.doctor_phone].filter(Boolean).join(' · ') || 'Not specified'} color="green" />
          <InfoTile icon={CalendarCheck} label="Next Appointment" value={appointment} color="purple" />
        </div>

        <div className="pd-subhead">
          <h3><Pill size={16} aria-hidden="true" /> Prescribed Medicines</h3>
          <span className="pd-cost">
            <IndianRupee size={14} aria-hidden="true" />
            Monthly cost: <strong>{Number(patient.estimated_cost) > 0 ? money(patient.estimated_cost) : 'Not given'}</strong>
          </span>
        </div>
        {meds.length ? (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Quantity</th></tr>
              </thead>
              <tbody>
                {meds.map((m, i) => (
                  <tr key={`${m.name}-${i}`}>
                    <td>{i + 1}</td>
                    <td className="pd-med-name">{m.name}</td>
                    <td>{m.dosage || '—'}</td>
                    <td>{m.frequency || '—'}</td>
                    <td>{m.duration || '—'}</td>
                    <td>{m.quantity || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pd-empty">No medicines added yet. Add the medicines from your prescription so donors know what you need.</p>
        )}
      </section>

      <div className="pd-grid">
        {/* Medical history */}
        <section id="pd-history" className="pd-card">
          <SectionTitle icon={FileText} title="Medical History" subtitle="Hospitalisation and past treatment" />
          <div className="pd-tiles">
            <InfoTile icon={CalendarDays} label="Admission Date" value={formatDate(patient.admissiondate)} />
            <InfoTile icon={CalendarDays} label="Discharge Date" value={formatDate(patient.dischargedate)} color="green" />
            <InfoTile icon={BedDouble} label="Hospital Stay" value={stayLength(patient.admissiondate, patient.dischargedate)} color="purple" />
            <InfoTile icon={Activity} label="Treatment Status" value={patient.treatment_status || 'Not specified'} color="orange" />
            <InfoTile icon={ClipboardList} label="Past Surgeries / Treatments" value={patient.past_surgeries || 'None listed'} color="pink" wide multiline />
            <InfoTile icon={Users} label="Family Medical History" value={patient.family_history || 'None listed'} wide multiline />
          </div>
        </section>

        {/* Application status */}
        <section id="pd-status" className="pd-card">
          <SectionTitle icon={Clock} title="Application Status" subtitle="Review progress and donations" />
          <div className={`pd-status is-${app.key}`}>
            <span className="pd-status-pill">{app.label}</span>
            <p>{statusMessage}</p>
            {app.key === 'rejected'
              ? <XCircle className="pd-status-art" aria-hidden="true" />
              : app.key === 'pending'
                ? <ClipboardList className="pd-status-art" aria-hidden="true" />
                : <BadgeCheck className="pd-status-art" aria-hidden="true" />}
          </div>

          <ol className="pd-steps">
            {steps.map((s) => (
              <li key={s.label} className={s.failed ? 'is-failed' : s.done ? 'is-done' : ''}>
                <span className="pd-step-dot" aria-hidden="true">
                  {s.failed ? <XCircle size={14} /> : s.done ? <Check size={14} /> : null}
                </span>
                <span className="pd-step-text">
                  <strong>{s.label}</strong>
                  {s.note && <small>{s.note}</small>}
                </span>
              </li>
            ))}
          </ol>

          {app.amount > 0 && (
            <div className="pd-funding">
              <div className="pd-funding-row">
                <span><Wallet size={15} aria-hidden="true" /> Raised {money(app.paid)}</span>
                <span>Goal {money(app.amount)}</span>
              </div>
              <div className="pd-progress" role="progressbar" aria-valuenow={fundedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Donations received">
                <span style={{ width: `${fundedPct}%` }} />
              </div>
              <small>{fundedPct}% funded · {money(Math.max(0, app.amount - app.paid))} remaining</small>
            </div>
          )}

          {app.key === 'pending' && missing.length > 0 && (
            <div className="pd-missing">
              <p><strong>{missing.length} item{missing.length === 1 ? '' : 's'} missing</strong> before review:</p>
              <ul>{missing.map((m) => <li key={m.label}>{m.label}</li>)}</ul>
              <button type="button" className="pd-link-btn" onClick={() => scrollTo('pd-edit')}>Complete profile →</button>
            </div>
          )}
        </section>

        {/* Personal & contact */}
        <section id="pd-personal" className="pd-card pd-span-2">
          <SectionTitle icon={IdCard} title="Personal & Contact" subtitle="Identity, address and emergency contact" />
          <div className="pd-tiles is-3">
            <InfoTile icon={CalendarDays} label="Date of Birth" value={formatDate(patient.birthday)} />
            <InfoTile icon={Heart} label="Marital Status" value={patient.relationship || 'Not specified'} color="pink" />
            <InfoTile icon={Briefcase} label="Occupation" value={patient.occupation || 'Not specified'} color="purple" />
            <InfoTile icon={Wallet} label="Monthly Family Income" value={patient.monthly_income || 'Not specified'} color="green" />
            <InfoTile icon={IdCard} label="Aadhaar Number" value={maskTail(patient.aadharno)} color="orange" />
            <InfoTile icon={IdCard} label="PAN Number" value={maskTail(patient.panno)} color="pink" />
            <InfoTile icon={MapPin} label="Address" value={fullAddress || 'Not provided'} wide multiline />
            <InfoTile
              icon={Phone}
              label="Emergency Contact"
              color="orange"
              wide
              value={patient.emergency_name
                ? `${patient.emergency_name}${patient.emergency_relation ? ` (${patient.emergency_relation})` : ''}${patient.emergency_phone ? ` · ${patient.emergency_phone}` : ''}`
                : 'Not provided'}
            />
          </div>
        </section>

        {/* Edit profile */}
        <section id="pd-edit" className="pd-card pd-span-2">
          <SectionTitle
            icon={UserRound}
            title="Edit Profile Information"
            subtitle={locked ? 'Your profile is locked after approval' : 'Keep your personal and medical details up to date'}
          />
          {locked ? (
            <div className="pd-locked">
              <Lock size={20} aria-hidden="true" />
              <p>Your application is approved, so profile and medical details can no longer be changed. Contact the hospital administration team if something needs correcting.</p>
            </div>
          ) : (
            <PatientEditForm
              key={saveCount}
              patient={patient}
              token={token}
              onImagePreview={setDpPreview}
              onSaved={(updated) => {
                setPatient(updated);
                setDpPreview(null);
                setSaveCount((n) => n + 1);
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}
