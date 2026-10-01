import React, { useMemo, useState } from 'react';
import { Plus, Save, Trash2, Upload } from 'lucide-react';
import { confirm, toast } from '../feedback/feedback';
import { getPatientDetails, updatePatientDetails } from '../../api';
import {
  BLOOD_GROUPS,
  EMPTY_MEDICINE,
  FORM_FIELDS,
  FREQUENCY_SUGGESTIONS,
  GENDERS,
  INCOME_RANGES,
  RELATIONSHIPS,
  SEVERITIES,
  TREATMENT_STATUSES,
  formFromPatient,
  prescriptionOf,
} from './patientFields';

const TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'contact', label: 'Address & Contact' },
  { id: 'medical', label: 'Medical' },
  { id: 'medicines', label: 'Medicines' },
  { id: 'history', label: 'History' },
];

const today = () => new Date().toISOString().slice(0, 10);

function Field({ label, span = 3, hint, children }) {
  return (
    <label className={`pd-col-${span}`}>
      {label}
      {children}
      {hint && <small className="pd-hint">{hint}</small>}
    </label>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="pd-field">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function PatientEditForm({ patient, onSaved, onImagePreview }) {
  const initialForm = useMemo(() => formFromPatient(patient), [patient]);
  const initialMeds = useMemo(() => prescriptionOf(patient), [patient]);

  const [tab, setTab] = useState('personal');
  const [form, setForm] = useState(initialForm);
  const [meds, setMeds] = useState(initialMeds.length ? initialMeds : [{ ...EMPTY_MEDICINE }]);
  const [dpFile, setDpFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };
  const input = (key) => ({ value: form[key], onChange: (e) => set(key)(e.target.value), className: 'pd-field' });

  const onBirthday = (value) => {
    const born = new Date(value);
    const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age -= 1;
    setForm((prev) => ({ ...prev, birthday: value, age: value && age > 0 && age <= 150 ? String(age) : prev.age }));
    setError('');
  };

  const setMed = (i, key, value) =>
    setMeds((rows) => rows.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  const addMed = () => setMeds((rows) => [...rows, { ...EMPTY_MEDICINE }]);
  const removeMed = (i) =>
    setMeds((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ ...EMPTY_MEDICINE }]));

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please select a valid image file');
    if (file.size > 5 * 1024 * 1024) return setError('File size must be less than 5MB');
    setDpFile(file);
    onImagePreview(URL.createObjectURL(file));
    setError('');
  }

  function validate() {
    if (form.name.trim().length < 2) return ['personal', 'Please enter your full name'];
    if (form.birthday && form.birthday > today()) return ['personal', 'Date of birth can’t be in the future'];
    if (form.aadharno && !/^\d{12}$/.test(form.aadharno.replace(/\s/g, ''))) return ['personal', 'Aadhaar number must be 12 digits'];
    if (form.panno && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.panno.trim().toUpperCase())) return ['personal', 'PAN number must look like ABCDE1234F'];
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) return ['contact', 'Pincode must be 6 digits'];
    if (form.admissiondate && form.dischargedate && form.dischargedate < form.admissiondate) {
      return ['history', 'Discharge date can’t be before the admission date'];
    }
    if (meds.some((m) => !m.name.trim() && (m.dosage || m.frequency || m.duration || m.quantity))) {
      return ['medicines', 'Every medicine row needs a medicine name'];
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setTab(problem[0]);
      setError(problem[1]);
      return;
    }

    // Only send what changed, so untouched legacy values are never rewritten.
    const changed = FORM_FIELDS.filter((key) => form[key] !== initialForm[key]);
    const cleanMeds = meds.filter((m) => m.name.trim());
    const medsChanged = JSON.stringify(cleanMeds) !== JSON.stringify(initialMeds);
    if (!changed.length && !medsChanged && !dpFile) {
      toast.info('There are no changes to save.', 'Nothing to save');
      return;
    }

    const ok = await confirm({
      title: 'Save changes?',
      message: 'Your profile and medical details will be updated with what you entered.',
      confirmText: 'Save changes',
      icon: 'save',
    });
    if (!ok) return;

    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('id', patient.id || patient._id);
      changed.forEach((key) => formData.append(key, form[key]));
      if (medsChanged) formData.append('prescription', JSON.stringify(cleanMeds));
      if (dpFile) formData.append('image', dpFile);

      await updatePatientDetails(formData);
      toast.success('Your details were updated.', 'Changes saved');
      setDpFile(null);
      onSaved(await getPatientDetails());
    } catch (err) {
      const message = err.error || 'Failed to update your details';
      setError(message);
      toast.error(message, 'Couldn’t save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="pd-tabs" role="tablist" aria-label="Profile sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`pd-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="pd-error pd-form-error" role="alert">{error}</p>}

      {tab === 'personal' && (
        <div className="pd-form">
          <Field label="Full Name *" span={3}>
            <input {...input('name')} maxLength={100} placeholder="Enter full name" />
          </Field>
          <Field label="Date of Birth" span={2}>
            <input type="date" {...input('birthday')} max={today()} onChange={(e) => onBirthday(e.target.value)} />
          </Field>
          <Field label="Age" span={1}>
            <input type="number" min="1" max="150" {...input('age')} placeholder="Age" />
          </Field>
          <Field label="Gender *" span={3}>
            <Select value={form.gender} onChange={set('gender')} options={GENDERS} placeholder="Select gender" />
          </Field>
          <Field label="Marital Status" span={3}>
            <Select value={form.relationship} onChange={set('relationship')} options={RELATIONSHIPS} placeholder="Select status" />
          </Field>
          <Field label="Occupation" span={3}>
            <input {...input('occupation')} maxLength={100} placeholder="e.g. Daily wage worker" />
          </Field>
          <Field label="Monthly Family Income" span={3} hint="Helps the team assess financial need">
            <Select value={form.monthly_income} onChange={set('monthly_income')} options={INCOME_RANGES} placeholder="Select range" />
          </Field>
          <Field label="Aadhaar Number *" span={3}>
            <input {...input('aadharno')} inputMode="numeric" maxLength={14} placeholder="12-digit Aadhaar" />
          </Field>
          <Field label="PAN Number" span={3}>
            <input {...input('panno')} maxLength={10} placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} />
          </Field>
          <label className="pd-col-6">Profile Picture
            <span className="pd-upload">
              <Upload size={26} aria-hidden="true" />
              <span>{dpFile ? dpFile.name : 'Click to upload'}<br /><small>JPG, PNG (Max 5MB)</small></span>
              <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} hidden />
            </span>
          </label>
        </div>
      )}

      {tab === 'contact' && (
        <div className="pd-form">
          <Field label="Mobile Number *" span={3}>
            <input type="tel" {...input('mobile')} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Email" span={3} hint="Your login email can’t be changed here">
            <input value={patient.email || ''} className="pd-field" readOnly disabled />
          </Field>
          <Field label="Address *" span={6}>
            <textarea {...input('address')} className="pd-field pd-textarea" maxLength={300} placeholder="House no., street, area" />
          </Field>
          <Field label="City / Town *" span={2}>
            <input {...input('town')} maxLength={100} placeholder="City" />
          </Field>
          <Field label="State *" span={2}>
            <input {...input('state')} maxLength={100} placeholder="State" />
          </Field>
          <Field label="Pincode *" span={2}>
            <input {...input('pincode')} inputMode="numeric" maxLength={6} placeholder="600001" />
          </Field>
          <p className="pd-col-6 pd-form-heading">Emergency contact</p>
          <Field label="Contact Name *" span={2}>
            <input {...input('emergency_name')} maxLength={100} placeholder="Full name" />
          </Field>
          <Field label="Relation" span={2}>
            <input {...input('emergency_relation')} maxLength={50} placeholder="e.g. Son, Spouse" />
          </Field>
          <Field label="Contact Phone *" span={2}>
            <input type="tel" {...input('emergency_phone')} placeholder="Phone number" />
          </Field>
        </div>
      )}

      {tab === 'medical' && (
        <div className="pd-form">
          <Field label="Diagnosis / Condition *" span={4}>
            <input {...input('disease')} maxLength={200} placeholder="e.g. Type 2 Diabetes, Chronic kidney disease" />
          </Field>
          <Field label="Severity *" span={2}>
            <Select value={form.severity} onChange={set('severity')} options={SEVERITIES} placeholder="Select" />
          </Field>
          <Field label="Diagnosed On" span={2}>
            <input type="date" {...input('diagnosis_date')} max={today()} />
          </Field>
          <Field label="Monthly Medicine Cost (₹) *" span={2}>
            <input type="number" min="0" step="1" {...input('estimated_cost')} placeholder="e.g. 4500" />
          </Field>
          <Field label="Blood Group" span={2}>
            <Select value={form.blood_group} onChange={set('blood_group')} options={BLOOD_GROUPS} placeholder="Select" />
          </Field>
          <Field label="Allergies" span={3}>
            <textarea {...input('allergies')} className="pd-field pd-textarea" maxLength={500} placeholder="Drug / food allergies, or “None”" />
          </Field>
          <Field label="Other Existing Conditions" span={3}>
            <textarea {...input('chronic_conditions')} className="pd-field pd-textarea" maxLength={500} placeholder="e.g. Hypertension, Asthma" />
          </Field>
          <p className="pd-col-6 pd-form-heading">Treating hospital & doctor</p>
          <Field label="Hospital / Clinic *" span={3}>
            <input {...input('hospitalname')} maxLength={150} placeholder="Hospital name" />
          </Field>
          <Field label="Hospital Address" span={3}>
            <input {...input('hospital_address')} maxLength={300} placeholder="Area, city" />
          </Field>
          <Field label="Doctor Name *" span={2}>
            <input {...input('doctor')} maxLength={100} placeholder="Dr. …" />
          </Field>
          <Field label="Doctor / Hospital Phone" span={2}>
            <input type="tel" {...input('doctor_phone')} placeholder="Phone number" />
          </Field>
          <Field label="Next Appointment" span={1}>
            <input type="date" {...input('date')} />
          </Field>
          <Field label="Time" span={1}>
            <input type="time" {...input('time')} />
          </Field>
        </div>
      )}

      {tab === 'medicines' && (
        <div className="pd-meds-edit">
          <p className="pd-hint">List each medicine exactly as written on your prescription. Frequency like 1-0-1 means morning–afternoon–night.</p>
          <datalist id="pd-frequency">
            {FREQUENCY_SUGGESTIONS.map((f) => <option key={f} value={f} />)}
          </datalist>
          {meds.map((m, i) => (
            <div className="pd-med-row" key={i}>
              <label>Medicine *
                <input className="pd-field" value={m.name} maxLength={100} onChange={(e) => setMed(i, 'name', e.target.value)} placeholder="e.g. Metformin" />
              </label>
              <label>Dosage
                <input className="pd-field" value={m.dosage} maxLength={100} onChange={(e) => setMed(i, 'dosage', e.target.value)} placeholder="500 mg" />
              </label>
              <label>Frequency
                <input className="pd-field" list="pd-frequency" value={m.frequency} maxLength={100} onChange={(e) => setMed(i, 'frequency', e.target.value)} placeholder="1-0-1" />
              </label>
              <label>Duration
                <input className="pd-field" value={m.duration} maxLength={100} onChange={(e) => setMed(i, 'duration', e.target.value)} placeholder="3 months" />
              </label>
              <label>Quantity
                <input className="pd-field" value={m.quantity} maxLength={100} onChange={(e) => setMed(i, 'quantity', e.target.value)} placeholder="90 tablets" />
              </label>
              <button type="button" className="pd-icon-btn" onClick={() => removeMed(i)} aria-label={`Remove medicine ${i + 1}`}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          {meds.length < 20 && (
            <button type="button" className="pd-outline-btn pd-add-med" onClick={addMed}>
              <Plus size={15} aria-hidden="true" /> Add medicine
            </button>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="pd-form">
          <Field label="Admission Date" span={2}>
            <input type="date" {...input('admissiondate')} max={today()} />
          </Field>
          <Field label="Discharge Date" span={2}>
            <input type="date" {...input('dischargedate')} min={form.admissiondate || undefined} />
          </Field>
          <Field label="Treatment Status" span={2}>
            <Select value={form.treatment_status} onChange={set('treatment_status')} options={TREATMENT_STATUSES} placeholder="Select" />
          </Field>
          <Field label="Past Surgeries / Treatments" span={6}>
            <textarea {...input('past_surgeries')} className="pd-field pd-textarea" maxLength={1000} placeholder="Surgery or treatment, hospital and year — or “None”" />
          </Field>
          <Field label="Family Medical History" span={6}>
            <textarea {...input('family_history')} className="pd-field pd-textarea" maxLength={1000} placeholder="e.g. Father – diabetes, Mother – hypertension" />
          </Field>
        </div>
      )}

      <div className="pd-form-foot">
        <span className="pd-hint">* Needed before the admin team can review your application</span>
        <button type="submit" className="pd-save" disabled={saving}>
          {saving ? <span className="spinner" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
