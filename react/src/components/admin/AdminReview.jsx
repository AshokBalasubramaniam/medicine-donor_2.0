import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  IndianRupee,
  Pill,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { adminUpdatePatient, getPatientById } from '../../api';
import { confirm, toast } from '../feedback/feedback';
import { GENDERS, REQUIRED_FOR_REVIEW, SEVERITIES, TREATMENT_STATUSES, prescriptionOf } from '../patients/patientFields';
import { STATUS, formatDate, createdAt, initials, money, paidOf, statusOf } from './adminData';

const FIELDS = ['amount', 'name', 'age', 'gender', 'mobile', 'disease', 'severity', 'treatment_status', 'hospitalname', 'doctor'];

function initialForm(p) {
  const out = {};
  FIELDS.forEach((k) => {
    const v = p?.[k];
    out[k] = v === null || v === undefined ? '' : String(v);
  });
  out.gender = out.gender || p?.sex || '';
  if (out.age === '0') out.age = '';
  if (out.amount === '0') out.amount = '';
  return out;
}

export default function AdminReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reloadStats } = useOutletContext();
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const p = await getPatientById(id);
        setPatient(p);
        setForm(initialForm(p));
      } catch (e) {
        setError(e?.error || 'Couldn’t load this application.');
      }
    })();
  }, [id]);

  const start = useMemo(() => (patient ? initialForm(patient) : null), [patient]);

  if (error && !patient) return <div className="pd-page"><p className="pd-error">{error}</p></div>;
  if (!patient || !form) {
    return <div className="pd-page pd-state"><span className="spinner spinner-lg" aria-hidden="true" /><p>Loading application…</p></div>;
  }

  const status = statusOf(patient);
  const checklist = REQUIRED_FOR_REVIEW.map((c) => ({ label: c.label, done: c.ok({ ...patient, ...form }) }));
  const missing = checklist.filter((c) => !c.done);
  const meds = prescriptionOf(patient);
  const paid = paidOf(patient);
  const amount = Number(form.amount) || 0;
  const estimate = Number(patient.estimated_cost) || 0;

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setError('');
    },
    disabled: !!busy,
  });

  async function decide(approve) {
    if (approve) {
      if (form.name.trim().length < 2) return setError('Enter the patient’s full name.');
      if (amount < 1) return setError('Set the required amount before approving — donors need to know how much to raise.');
      if (amount < paid) return setError(`The required amount can’t be less than the ${money(paid)} already raised.`);
    }

    const ok = await confirm(
      approve
        ? {
            title: 'Approve this application?',
            message: `${form.name} will be visible to donors with a goal of ${money(amount)}.${missing.length ? ` Note: ${missing.length} required detail${missing.length === 1 ? ' is' : 's are'} still missing.` : ''}`,
            confirmText: 'Approve',
            icon: 'approve',
          }
        : {
            title: 'Reject this application?',
            message: `${patient.name || 'This patient'}’s application will be marked as rejected. You can re-review it later.`,
            confirmText: 'Reject',
            tone: 'danger',
            icon: 'reject',
          }
    );
    if (!ok) return;

    setBusy(approve ? 'approve' : 'reject');
    try {
      const data = new FormData();
      if (approve) {
        FIELDS.filter((k) => form[k] !== start[k] || k === 'amount').forEach((k) => data.append(k, form[k].trim()));
      }
      data.append('approved', approve ? 'true' : 'false');
      data.append('rejected', approve ? 'false' : 'true');
      await adminUpdatePatient(id, data);
      toast.success(
        approve ? `${form.name} is now visible to donors.` : 'The application was rejected.',
        approve ? 'Application approved' : 'Application rejected'
      );
      reloadStats();
      navigate(approve ? '/admin/patients/approved' : '/admin/patients/rejected');
    } catch (e) {
      setError(e?.error || 'Please try again.');
      setBusy('');
    }
  }

  return (
    <div className="pd-page">
      <div className="ap-topline">
        <button type="button" className="ae-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        <Link to={`/admin/patients/${id}`} className="ae-btn">
          <Eye size={16} aria-hidden="true" /> Full details
        </Link>
      </div>

      <section className="pd-card ap-review-head">
        <span className="ap-row-avatar is-amber ap-avatar-lg" aria-hidden="true">{initials(patient.name)}</span>
        <div>
          <div className="pd-profile-name">
            <h2>Review: {patient.name || 'Unnamed patient'}</h2>
            <span className={`pd-chip ${STATUS[status].chip}`}>{STATUS[status].label}</span>
          </div>
          <p className="pd-profile-sub">{patient.email} · {patient.mobile || 'No phone'} · Applied {formatDate(createdAt(patient))}</p>
        </div>
      </section>

      {(status === 'approved' || status === 'completed') ? (
        <div className="pd-locked">
          <CheckCircle2 size={20} aria-hidden="true" />
          <p>This application is already approved. Use <strong>Edit</strong> on the Approved page to change its details or amount.</p>
        </div>
      ) : (
        <div className="ap-review-grid">
          <form className="pd-card" onSubmit={(e) => { e.preventDefault(); decide(true); }}>
            <div className="pd-section-head">
              <div className="pd-section-title">
                <span className="pd-section-icon" aria-hidden="true"><ClipboardCheck size={20} /></span>
                <div><h2>Decision</h2><p>Check and correct the key details, set the amount, then approve or reject.</p></div>
              </div>
            </div>

            {error && <p className="pd-error pd-form-error" role="alert">{error}</p>}

            <div className="ap-amount-box">
              <label htmlFor="ap-amount">Required amount (₹) *</label>
              <div className="ap-amount-input">
                <IndianRupee size={18} aria-hidden="true" />
                <input id="ap-amount" type="number" min="1" step="1" placeholder="Amount donors should raise" {...field('amount')} />
              </div>
              <small>
                {estimate > 0 ? (
                  <>Patient’s monthly medicine estimate: <strong>{money(estimate)}</strong>{' '}
                    <button type="button" className="pd-link-btn" onClick={() => setForm((f) => ({ ...f, amount: String(Math.round(estimate)) }))} disabled={!!busy}>Use this</button>
                  </>
                ) : 'The patient didn’t give a cost estimate.'}
                {paid > 0 && <> · Already raised: <strong>{money(paid)}</strong></>}
              </small>
            </div>

            <div className="ae-grid ap-review-fields">
              <label className="ae-span-2">Full Name *<input maxLength={100} {...field('name')} /></label>
              <label>Age<input type="number" min="1" max="150" {...field('age')} /></label>
              <label>Gender
                <select {...field('gender')}><option value="">Not specified</option>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select>
              </label>
              <label className="ae-span-2">Mobile<input type="tel" {...field('mobile')} /></label>
              <label className="ae-span-2">Diagnosis / Condition<input maxLength={200} {...field('disease')} /></label>
              <label>Severity
                <select {...field('severity')}><option value="">Not specified</option>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label>Treatment Status
                <select {...field('treatment_status')}><option value="">Not specified</option>{TREATMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label className="ae-span-2">Hospital / Clinic<input maxLength={150} {...field('hospitalname')} /></label>
              <label className="ae-span-2">Doctor<input maxLength={100} {...field('doctor')} /></label>
            </div>

            <div className="ap-decision">
              <button type="button" className="ap-btn is-danger" onClick={() => decide(false)} disabled={!!busy || status === 'rejected'}>
                {busy === 'reject' ? <span className="spinner" aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
                {status === 'rejected' ? 'Already rejected' : 'Reject'}
              </button>
              <button type="submit" className="ap-btn is-primary" disabled={!!busy}>
                {busy === 'approve' ? <span className="spinner" aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
                Approve application
              </button>
            </div>
          </form>

          <aside className="ap-review-side">
            <section className="pd-card">
              <div className="pd-section-head">
                <div className="pd-section-title">
                  <span className="pd-section-icon" aria-hidden="true"><Check size={20} /></span>
                  <div><h2>Checklist</h2><p>{checklist.length - missing.length} of {checklist.length} required details</p></div>
                </div>
              </div>
              <ul className="ap-checklist">
                {checklist.map((c) => (
                  <li key={c.label} className={c.done ? 'is-done' : ''}>
                    {c.done ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                    {c.label}
                  </li>
                ))}
              </ul>
            </section>

            <section className="pd-card">
              <div className="pd-section-head">
                <div className="pd-section-title">
                  <span className="pd-section-icon" aria-hidden="true"><Pill size={20} /></span>
                  <div><h2>Prescription</h2><p>{meds.length} medicine{meds.length === 1 ? '' : 's'}</p></div>
                </div>
              </div>
              {meds.length ? (
                <ul className="ap-med-list">
                  {meds.map((m, i) => (
                    <li key={`${m.name}-${i}`}>
                      <strong>{m.name}</strong>
                      <span>{[m.dosage, m.frequency, m.duration, m.quantity].filter(Boolean).join(' · ') || 'As prescribed'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pd-empty">No medicines listed.</p>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
