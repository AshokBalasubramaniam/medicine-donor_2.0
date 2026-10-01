// Helpers shared by the donor pages. Patient records here come from the
// donor-safe projection of /adminpage/getpatients (approved, open cases only).

export const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export function compactMoney(n) {
  const v = Number(n) || 0;
  if (v >= 100000) return `₹${(v / 100000).toFixed(v >= 1000000 ? 0 : 1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
  return money(v);
}

/** "Revathi Sundaram" → "Revathi S." — donors see a first name and initial. */
export function displayName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || 'Patient';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'P') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const locationOf = (p) => [p.town, p.state].filter(Boolean).join(', ');

export const fundedPct = (p) =>
  p.amount > 0 ? Math.min(100, Math.round(((Number(p.paid_amount) || 0) / p.amount) * 100)) : 0;

const TONES = ['blue', 'mint', 'violet'];
export const toneOf = (p) => TONES[[...(p.id || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

/** Card status, from the patient's stated severity, else from funding left. */
export function statusOf(p) {
  const sev = p.severity;
  if (sev === 'Critical' || sev === 'Severe') return { label: 'Urgent', key: 'urgent', rank: 0 };
  if (sev === 'Moderate') return { label: 'In treatment', key: 'in-treatment', rank: 1 };
  if (sev === 'Mild') return { label: 'Stable', key: 'stable', rank: 2 };
  const left = p.amount > 0 ? p.balance_amount / p.amount : 0;
  if (left > 0.7) return { label: 'Urgent', key: 'urgent', rank: 0 };
  if (left > 0.3) return { label: 'In treatment', key: 'in-treatment', rank: 1 };
  return { label: 'Stable', key: 'stable', rank: 2 };
}

// BSON DateTime arrives as { $date: { $numberLong } } or { $date: "<iso>" }.
export function createdAt(p) {
  const d = p.created_at?.$date ?? p.created_at;
  const v = d?.$numberLong ? Number(d.$numberLong) : d;
  const t = v ? new Date(v).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

export function medicinesOf(p) {
  if (Array.isArray(p.prescription) && p.prescription.length) return p.prescription;
  return (Array.isArray(p.medicines) ? p.medicines : []).filter(Boolean).map((name) => ({ name }));
}

export const SORTS = {
  recent: { label: 'Recently added', fn: (a, b) => createdAt(b) - createdAt(a) },
  urgent: {
    label: 'Most urgent',
    fn: (a, b) => statusOf(a).rank - statusOf(b).rank || fundedPct(a) - fundedPct(b),
  },
  amount: { label: 'Amount needed', fn: (a, b) => b.balance_amount - a.balance_amount },
};

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
