// Option lists and rules shared by the patient dashboard and its edit form.
// The option values must match the backend (routes/update_patient.rs).

export const GENDERS = ['Male', 'Female', 'Other'];
export const RELATIONSHIPS = ['Single', 'Married', 'Divorced', 'Widowed'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const SEVERITIES = ['Mild', 'Moderate', 'Severe', 'Critical'];
export const TREATMENT_STATUSES = ['Not started', 'Ongoing', 'Follow-up', 'Completed'];
export const INCOME_RANGES = [
  'Below ₹10,000',
  '₹10,000 – ₹25,000',
  '₹25,000 – ₹50,000',
  'Above ₹50,000',
];
export const FREQUENCY_SUGGESTIONS = [
  '1-0-1', '1-1-1', '1-0-0', '0-0-1', 'Once daily', 'Twice daily', 'Thrice daily', 'Weekly', 'As needed',
];

// Plain string fields edited by the form (prescription is handled separately).
export const FORM_FIELDS = [
  'name', 'age', 'birthday', 'gender', 'relationship', 'blood_group', 'mobile', 'occupation',
  'monthly_income', 'aadharno', 'panno',
  'address', 'town', 'state', 'pincode',
  'emergency_name', 'emergency_relation', 'emergency_phone',
  'disease', 'severity', 'diagnosis_date', 'allergies', 'chronic_conditions', 'estimated_cost',
  'hospitalname', 'hospital_address', 'doctor', 'doctor_phone', 'date', 'time',
  'admissiondate', 'dischargedate', 'treatment_status', 'past_surgeries', 'family_history',
];

export const EMPTY_MEDICINE = { name: '', dosage: '', frequency: '', duration: '', quantity: '' };

/** What the admin team needs before an application can be reviewed. */
export const REQUIRED_FOR_REVIEW = [
  { label: 'Full name', ok: (p) => !!p.name },
  { label: 'Age or date of birth', ok: (p) => !!(Number(p.age) > 0 || p.birthday) },
  { label: 'Gender', ok: (p) => !!p.gender },
  { label: 'Mobile number', ok: (p) => !!p.mobile },
  { label: 'Full address with pincode', ok: (p) => !!(p.address && p.town && p.state && p.pincode) },
  { label: 'Aadhaar number', ok: (p) => !!p.aadharno },
  { label: 'Emergency contact', ok: (p) => !!(p.emergency_name && p.emergency_phone) },
  { label: 'Diagnosis and severity', ok: (p) => !!(p.disease && p.severity) },
  { label: 'Hospital and doctor', ok: (p) => !!(p.hospitalname && p.doctor) },
  { label: 'Prescribed medicines', ok: (p) => prescriptionOf(p).length > 0 },
  { label: 'Monthly medicine cost', ok: (p) => Number(p.estimated_cost) > 0 },
];

/** Structured prescription, falling back to the older plain `medicines` list. */
export function prescriptionOf(p) {
  if (Array.isArray(p?.prescription) && p.prescription.length) {
    return p.prescription.map((m) => ({ ...EMPTY_MEDICINE, ...m }));
  }
  const names = Array.isArray(p?.medicines) ? p.medicines : p?.medicines ? [p.medicines] : [];
  return names.filter(Boolean).map((name) => ({ ...EMPTY_MEDICINE, name }));
}

/** Initial form values from a patient record. */
export function formFromPatient(p) {
  const form = {};
  FORM_FIELDS.forEach((key) => {
    const v = p?.[key];
    form[key] = v === null || v === undefined ? '' : String(v);
  });
  // Older records used `sex` / `relationshipstatus`; new accounts start with age 0.
  form.gender = form.gender || p?.sex || '';
  form.relationship = form.relationship || p?.relationshipstatus || '';
  if (form.age === '0') form.age = '';
  return form;
}
