import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Droplet,
  FileText,
  Heart,
  Hospital,
  IdCard,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Pill,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { getPatientById } from '../../api';
import { cloudinaryThumb } from '../../utils/cloudinary';
import { REQUIRED_FOR_REVIEW, prescriptionOf } from '../patients/patientFields';
import '../patients/patient-dashboard.css';
import './admin-edit.css';

const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function bsonDate(value) {
  const d = value?.$date ?? value;
  return d?.$numberLong ? Number(d.$numberLong) : d;
}

function formatDate(value, fallback = 'Not set') {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Tile({ icon: Icon, label, value, color = 'blue', wide = false }) {
  return (
    <div className={`pd-tile ${wide ? 'is-wide' : ''}`}>
      <span className={`pd-tile-icon is-${color}`} aria-hidden="true"><Icon size={18} /></span>
      <div className="pd-tile-text">
        <p className="pd-tile-label">{label}</p>
        <p className={`pd-tile-value ${wide ? 'is-multiline' : ''}`}>{value || 'Not provided'}</p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="pd-card">
      <div className="pd-section-head">
        <div className="pd-section-title">
          <span className="pd-section-icon" aria-hidden="true"><Icon size={20} /></span>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AdminPatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setPatient(await getPatientById(id));
      } catch (e) {
        setError(e?.error || 'Couldn’t load this patient.');
      }
    })();
  }, [id]);

  if (error) return <div className="ap-details"><p className="pd-error">{error}</p></div>;
  if (!patient) {
    return (
      <div className="ap-details pd-state">
        <span className="spinner spinner-lg" aria-hidden="true" />
        <p>Loading patient…</p>
      </div>
    );
  }

  const status = patient.rejected ? 'rejected' : patient.approved ? 'approved' : 'pending';
  const statusLabel = { rejected: 'Rejected', approved: 'Approved', pending: 'Pending review' }[status];
  const chip = { rejected: 'is-red', approved: 'is-green', pending: 'is-amber' }[status];
  const meds = prescriptionOf(patient);
  const checklist = REQUIRED_FOR_REVIEW.map((c) => ({ label: c.label, done: c.ok(patient) }));
  const missing = checklist.filter((c) => !c.done);
  const amount = Number(patient.amount) || 0;
  const paid = Number(patient.paid_amount) || 0;
  const avatar = cloudinaryThumb(patient.image);
  const gender = patient.gender || patient.sex;
  const address = [patient.address, patient.town, patient.state, patient.pincode].filter(Boolean).join(', ');
  const emergency = patient.emergency_name
    ? `${patient.emergency_name}${patient.emergency_relation ? ` (${patient.emergency_relation})` : ''}${patient.emergency_phone ? ` · ${patient.emergency_phone}` : ''}`
    : '';

  return (
    <div className="ap-details">
      <div className="ap-topline">
        <button type="button" className="ae-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        {status !== 'approved' && (
          <Link to={`/admin/patients/${patient.id}/review`} className="ae-btn is-primary">
            <ClipboardCheck size={16} aria-hidden="true" />
            {status === 'rejected' ? 'Re-review & approve' : 'Review & approve'}
          </Link>
        )}
      </div>

      <section className="pd-card ap-hero">
        {avatar ? (
          <img src={avatar} alt="" className="pd-avatar" />
        ) : (
          <div className="pd-avatar pd-avatar-initials" aria-hidden="true">
            {(patient.name || 'P').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="pd-profile-info">
          <div className="pd-profile-name">
            <h2>{patient.name || 'Unnamed patient'}</h2>
            <span className={`pd-chip ${chip}`}>{statusLabel}</span>
            {patient.severity && <span className="pd-chip is-orange">{patient.severity}</span>}
          </div>
          <div className="pd-profile-meta">
            <span><Mail size={15} aria-hidden="true" /> {patient.email || 'No email'}</span>
            <span><Phone size={15} aria-hidden="true" /> {patient.mobile || 'No phone'}</span>
            <span><CalendarDays size={15} aria-hidden="true" /> Registered {formatDate(bsonDate(patient.created_at), '—')}</span>
          </div>
          <p className="pd-profile-sub">
            Age: {patient.age || 'Not specified'}<span className="pd-sep">|</span>
            Gender: {gender || 'Not specified'}<span className="pd-sep">|</span>
            ID: {patient.id}
          </p>
        </div>
      </section>

      {status !== 'approved' && (
        <div className={`ap-review ${missing.length ? 'is-missing' : 'is-ready'}`}>
          {missing.length ? (
            <>
              <strong>{missing.length} of {checklist.length} required details missing:</strong>{' '}
              {missing.map((m) => m.label).join(', ')}
            </>
          ) : (
            <strong>All required details are filled in. Ready for review.</strong>
          )}
        </div>
      )}

      <div className="pd-grid">
        <Section icon={Wallet} title="Funding">
          <div className="pd-tiles">
            <Tile icon={IndianRupee} label="Required Amount" value={amount ? money(amount) : 'Not set'} color="green" />
            <Tile icon={Wallet} label="Raised So Far" value={money(paid)} />
            <Tile icon={IndianRupee} label="Still Needed" value={money(Math.max(0, amount - paid))} color="pink" />
            <Tile icon={IndianRupee} label="Patient’s Monthly Cost Estimate" value={Number(patient.estimated_cost) > 0 ? money(patient.estimated_cost) : 'Not given'} color="orange" />
          </div>
        </Section>

        <Section icon={IdCard} title="Personal & Contact">
          <div className="pd-tiles">
            <Tile icon={CalendarDays} label="Date of Birth" value={formatDate(patient.birthday, '')} />
            <Tile icon={Heart} label="Marital Status" value={patient.relationship || patient.relationshipstatus} color="pink" />
            <Tile icon={Briefcase} label="Occupation" value={patient.occupation} color="purple" />
            <Tile icon={Wallet} label="Monthly Family Income" value={patient.monthly_income} color="green" />
            <Tile icon={IdCard} label="Aadhaar Number" value={patient.aadharno} color="orange" />
            <Tile icon={IdCard} label="PAN Number" value={patient.panno} color="pink" />
            <Tile icon={MapPin} label="Address" value={address} wide />
            <Tile icon={Phone} label="Emergency Contact" value={emergency} color="orange" wide />
          </div>
        </Section>
      </div>

      <Section icon={ClipboardList} title="Medical Information">
        <div className="pd-tiles is-3">
          <Tile icon={Stethoscope} label="Diagnosis / Condition" value={patient.disease} />
          <Tile icon={AlertTriangle} label="Severity" value={patient.severity} color="orange" />
          <Tile icon={CalendarDays} label="Diagnosed On" value={formatDate(patient.diagnosis_date, '')} color="purple" />
          <Tile icon={Droplet} label="Blood Group" value={patient.blood_group} color="pink" />
          <Tile icon={ShieldAlert} label="Allergies" value={patient.allergies} color="orange" />
          <Tile icon={Activity} label="Other Conditions" value={patient.chronic_conditions} color="green" />
          <Tile icon={Hospital} label="Hospital / Clinic" value={[patient.hospitalname, patient.hospital_address].filter(Boolean).join(' — ')} />
          <Tile icon={UserRound} label="Treating Doctor" value={[patient.doctor, patient.doctor_phone].filter(Boolean).join(' · ')} color="green" />
          <Tile icon={CalendarDays} label="Next Appointment" value={patient.date ? `${formatDate(patient.date)}${patient.time ? ` · ${patient.time}` : ''}` : ''} color="purple" />
        </div>

        <div className="pd-subhead"><h3><Pill size={16} aria-hidden="true" /> Prescribed Medicines</h3></div>
        {meds.length ? (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Quantity</th></tr></thead>
              <tbody>
                {meds.map((m, i) => (
                  <tr key={`${m.name}-${i}`}>
                    <td>{i + 1}</td><td className="pd-med-name">{m.name}</td><td>{m.dosage || '—'}</td>
                    <td>{m.frequency || '—'}</td><td>{m.duration || '—'}</td><td>{m.quantity || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pd-empty">The patient hasn’t listed any medicines yet.</p>
        )}
      </Section>

      <Section icon={FileText} title="Medical History">
        <div className="pd-tiles is-3">
          <Tile icon={CalendarDays} label="Admission Date" value={formatDate(patient.admissiondate || patient.admission, '')} />
          <Tile icon={CalendarDays} label="Discharge Date" value={formatDate(patient.dischargedate || patient.discharge, '')} color="green" />
          <Tile icon={BedDouble} label="Treatment Status" value={patient.treatment_status} color="purple" />
          <Tile icon={ClipboardList} label="Past Surgeries / Treatments" value={patient.past_surgeries} color="pink" wide />
          <Tile icon={Users} label="Family Medical History" value={patient.family_history} wide />
        </div>
      </Section>
    </div>
  );
}
