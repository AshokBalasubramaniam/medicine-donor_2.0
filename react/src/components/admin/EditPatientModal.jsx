import React, { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';
import { confirm, toast } from '../feedback/feedback';
import { adminUpdatePatient } from '../../api';
import { GENDERS, SEVERITIES, TREATMENT_STATUSES } from '../patients/patientFields';
import './admin-edit.css';

// Fields an admin can change on an approved case.
const FIELDS = [
  'amount', 'name', 'age', 'gender', 'mobile',
  'disease', 'severity', 'treatment_status', 'hospitalname', 'doctor',
  'address', 'town', 'state', 'pincode',
];

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function initial(p) {
  const out = {};
  FIELDS.forEach((k) => {
    const v = p?.[k];
    out[k] = v === null || v === undefined ? '' : String(v);
  });
  out.gender = out.gender || p?.sex || '';
  if (out.age === '0') out.age = '';
  return out;
}

export default function EditPatientModal({ patient, onClose, onSaved }) {
  const start = useMemo(() => initial(patient), [patient]);
  const [form, setForm] = useState(start);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const paid = Number(patient.paid_amount) || 0;
  const amount = Number(form.amount) || 0;
  const balance = Math.max(0, amount - paid);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setError('');
    },
  });

  async function save(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Please enter the patient’s full name');
    if (form.amount === '' || amount <= 0) return setError('Required amount must be more than ₹0');
    if (amount < paid) return setError(`Required amount can’t be less than the ${rupees(paid)} already raised`);
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) return setError('Pincode must be 6 digits');

    const changed = FIELDS.filter((k) => form[k] !== start[k]);
    if (!changed.length) {
      toast.info('There are no changes to save.', 'Nothing to save');
      return;
    }
    const ok = await confirm({
      title: 'Save changes?',
      message: changed.includes('amount')
        ? `The required amount will change from ${rupees(start.amount)} to ${rupees(amount)}. Donors will see the new amount.`
        : `${patient.name}’s details will be updated.`,
      confirmText: 'Save changes',
      icon: 'save',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const data = new FormData();
      changed.forEach((k) => data.append(k, form[k].trim()));
      await adminUpdatePatient(null, patient.id || patient._id, data);
      toast.success(`${form.name}’s details were updated.`, 'Changes saved');
      onSaved();
    } catch (err) {
      setError(err?.error || 'Couldn’t save the changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ae-overlay" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className="ae-modal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="ae-title">
        <header className="ae-head">
          <div>
            <h2 id="ae-title">Edit approved patient</h2>
            <p>{patient.name} · {patient.email}</p>
          </div>
          <button type="button" className="ae-close" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="ae-body">
          {error && <p className="ae-error" role="alert">{error}</p>}

          <fieldset className="ae-group">
            <legend>Funding</legend>
            <div className="ae-grid">
              <label className="ae-span-2">Required Amount (₹) *
                <input type="number" min="1" step="1" {...field('amount')} autoFocus />
              </label>
              <div className="ae-stat"><span>Raised so far</span><strong>{rupees(paid)}</strong></div>
              <div className="ae-stat"><span>Still needed</span><strong className="is-due">{rupees(balance)}</strong></div>
            </div>
            {amount > 0 && balance === 0 && (
              <p className="ae-hint">This amount is already fully raised, so the case will close for donors.</p>
            )}
          </fieldset>

          <fieldset className="ae-group">
            <legend>Personal</legend>
            <div className="ae-grid">
              <label className="ae-span-2">Full Name *<input maxLength={100} {...field('name')} /></label>
              <label>Age<input type="number" min="1" max="150" {...field('age')} /></label>
              <label>Gender
                <select {...field('gender')}>
                  <option value="">Not specified</option>
                  {GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className="ae-span-2">Mobile<input type="tel" {...field('mobile')} /></label>
            </div>
          </fieldset>

          <fieldset className="ae-group">
            <legend>Medical</legend>
            <div className="ae-grid">
              <label className="ae-span-2">Diagnosis / Condition<input maxLength={200} {...field('disease')} /></label>
              <label>Severity
                <select {...field('severity')}>
                  <option value="">Not specified</option>
                  {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label>Treatment Status
                <select {...field('treatment_status')}>
                  <option value="">Not specified</option>
                  {TREATMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="ae-span-2">Hospital / Clinic<input maxLength={150} {...field('hospitalname')} /></label>
              <label className="ae-span-2">Doctor<input maxLength={100} {...field('doctor')} /></label>
            </div>
          </fieldset>

          <fieldset className="ae-group">
            <legend>Address</legend>
            <div className="ae-grid">
              <label className="ae-span-4">Address<input maxLength={300} {...field('address')} /></label>
              <label className="ae-span-2">City / Town<input maxLength={100} {...field('town')} /></label>
              <label>State<input maxLength={100} {...field('state')} /></label>
              <label>Pincode<input inputMode="numeric" maxLength={6} {...field('pincode')} /></label>
            </div>
          </fieldset>
        </div>

        <footer className="ae-foot">
          <button type="button" className="ae-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="ae-btn is-primary" disabled={saving}>
            {saving ? <span className="spinner" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </footer>
      </form>
    </div>
  );
}
