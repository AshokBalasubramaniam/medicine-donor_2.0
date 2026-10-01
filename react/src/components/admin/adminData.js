// Helpers shared by the admin pages.
import { REQUIRED_FOR_REVIEW } from '../patients/patientFields';

export const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const amountOf = (p) => Number(p?.amount) || 0;
export const paidOf = (p) => Number(p?.paid_amount) || 0;

/** pending → approved (open for donations) → completed; or rejected. */
export function statusOf(p) {
  if (p?.rejected) return 'rejected';
  if (!p?.approved) return 'pending';
  const amount = amountOf(p);
  return amount > 0 && paidOf(p) >= amount ? 'completed' : 'approved';
}

export const STATUS = {
  pending: { label: 'Pending review', chip: 'is-amber', title: 'Pending applications', blurb: 'New applications waiting for your review.' },
  approved: { label: 'Approved', chip: 'is-green', title: 'Approved patients', blurb: 'Open cases that donors can currently support.' },
  completed: { label: 'Fully funded', chip: 'is-blue', title: 'Completed cases', blurb: 'Cases whose required amount has been fully raised.' },
  rejected: { label: 'Rejected', chip: 'is-red', title: 'Rejected applications', blurb: 'Applications that were not approved. You can re-review them.' },
};

export function completeness(p) {
  const done = REQUIRED_FOR_REVIEW.filter((c) => c.ok(p)).length;
  return Math.round((done / REQUIRED_FOR_REVIEW.length) * 100);
}

export const missingOf = (p) => REQUIRED_FOR_REVIEW.filter((c) => !c.ok(p)).map((c) => c.label);

export const fundedPct = (p) => (amountOf(p) > 0 ? Math.min(100, Math.round((paidOf(p) / amountOf(p)) * 100)) : 0);

// BSON DateTime arrives as { $date: { $numberLong } } or { $date: "<iso>" }.
export function createdAt(p) {
  const d = p?.created_at?.$date ?? p?.created_at;
  const v = d?.$numberLong ? Number(d.$numberLong) : d;
  const t = v ? new Date(v).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

export function formatDate(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'P') + (parts[1]?.[0] || '')).toUpperCase();
}

export const idOf = (p) => p?.id || p?._id;
