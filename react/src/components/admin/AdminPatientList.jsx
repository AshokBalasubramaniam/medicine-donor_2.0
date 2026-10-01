import React, { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardCheck,
  Eye,
  Hospital,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  Stethoscope,
} from 'lucide-react';
import EditPatientModal from './EditPatientModal';
import {
  STATUS,
  amountOf,
  completeness,
  createdAt,
  formatDate,
  fundedPct,
  idOf,
  initials,
  missingOf,
  money,
  paidOf,
  statusOf,
} from './adminData';

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => createdAt(b) - createdAt(a) },
  oldest: { label: 'Oldest first', fn: (a, b) => createdAt(a) - createdAt(b) },
  name: { label: 'Name (A–Z)', fn: (a, b) => (a.name || '').localeCompare(b.name || '') },
  complete: { label: 'Most complete', fn: (a, b) => completeness(b) - completeness(a), only: 'pending' },
  needed: { label: 'Most still needed', fn: (a, b) => (amountOf(b) - paidOf(b)) - (amountOf(a) - paidOf(a)), only: 'approved' },
  funded: { label: 'Least funded', fn: (a, b) => fundedPct(a) - fundedPct(b), only: 'approved' },
};

function PatientTile({ patient, status, onEdit }) {
  const id = idOf(patient);
  const pct = completeness(patient);
  const funded = fundedPct(patient);
  const missing = missingOf(patient);
  const place = [patient.town, patient.state].filter(Boolean).join(', ');

  return (
    <article className="ap-card">
      <div className="ap-card-head">
        <span className={`ap-row-avatar is-${status === 'pending' ? 'amber' : status === 'rejected' ? 'red' : status === 'completed' ? 'blue' : 'green'}`} aria-hidden="true">
          {initials(patient.name)}
        </span>
        <div className="ap-card-title">
          <strong title={patient.name}>{patient.name || 'Unnamed patient'}</strong>
          <small>{[patient.age ? `${patient.age} yrs` : null, patient.gender || patient.sex].filter(Boolean).join(' · ') || 'Age / gender not given'}</small>
        </div>
        <span className={`pd-chip ${STATUS[status].chip}`}>{STATUS[status].label}</span>
      </div>

      <ul className="ap-card-facts">
        <li><Stethoscope size={14} aria-hidden="true" /><span>{patient.disease || 'Condition not given'}{patient.severity ? ` · ${patient.severity}` : ''}</span></li>
        <li><Hospital size={14} aria-hidden="true" /><span>{patient.hospitalname || 'Hospital not given'}</span></li>
        <li><Phone size={14} aria-hidden="true" /><span>{patient.mobile || 'No phone'}</span></li>
        <li><MapPin size={14} aria-hidden="true" /><span>{place || 'Location not given'}</span></li>
        <li><CalendarDays size={14} aria-hidden="true" /><span>Applied {formatDate(createdAt(patient))}</span></li>
      </ul>

      {status === 'pending' || status === 'rejected' ? (
        <div className="ap-card-meter">
          <div><span>Profile completeness</span><strong>{pct}%</strong></div>
          <span className="ap-mini-track"><span style={{ width: `${pct}%` }} className={pct === 100 ? 'is-done' : ''} /></span>
          <small title={missing.join(', ')}>{missing.length ? `Missing: ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? ` +${missing.length - 2}` : ''}` : 'All required details filled'}</small>
        </div>
      ) : (
        <div className="ap-card-meter">
          <div><span>Raised {money(paidOf(patient))}</span><strong>{amountOf(patient) ? money(amountOf(patient)) : 'No amount'}</strong></div>
          <span className="ap-mini-track"><span style={{ width: `${funded}%` }} className="is-done" /></span>
          <small>{funded}% funded · {money(Math.max(0, amountOf(patient) - paidOf(patient)))} still needed</small>
        </div>
      )}

      <div className="ap-card-actions">
        <Link to={`/admin/patients/${id}`} className="ap-btn is-small"><Eye size={15} aria-hidden="true" /> Details</Link>
        {status === 'pending' && (
          <Link to={`/admin/patients/${id}/review`} className="ap-btn is-small is-primary"><ClipboardCheck size={15} aria-hidden="true" /> Review</Link>
        )}
        {status === 'rejected' && (
          <Link to={`/admin/patients/${id}/review`} className="ap-btn is-small is-primary"><RotateCcw size={15} aria-hidden="true" /> Re-review</Link>
        )}
        {(status === 'approved' || status === 'completed') && (
          <button type="button" className="ap-btn is-small is-primary" onClick={() => onEdit(patient)}><Pencil size={15} aria-hidden="true" /> Edit</button>
        )}
      </div>
    </article>
  );
}

export default function AdminPatientList({ status }) {
  const { patients, loading, error, reload } = useOutletContext();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [editing, setEditing] = useState(null);

  const meta = STATUS[status];
  const sorts = Object.entries(SORTS).filter(([, s]) => !s.only || s.only === status || (s.only === 'approved' && status === 'completed'));
  const sortFn = (SORTS[sort] && sorts.some(([k]) => k === sort) ? SORTS[sort] : SORTS.newest).fn;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients
      .filter((p) => statusOf(p) === status)
      .filter((p) => !q || `${p.name} ${p.email} ${p.mobile} ${p.disease} ${p.hospitalname} ${p.town}`.toLowerCase().includes(q))
      .sort(sortFn);
  }, [patients, status, query, sortFn]);

  const total = patients.filter((p) => statusOf(p) === status).length;

  return (
    <div className="pd-page">
      <section className="pd-card ap-list-head">
        <div>
          <h1>{meta.title} <span className="ap-count">{loading ? '…' : total}</span></h1>
          <p>{meta.blurb}</p>
        </div>
        <div className="ap-toolbar">
          <label className="ap-search">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, condition, hospital…" aria-label="Search patients" />
          </label>
          <select className="ap-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {sorts.map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
      </section>

      {error ? (
        <p className="pd-error" role="alert">{error} <button type="button" className="pd-link-btn" onClick={reload}>Try again</button></p>
      ) : loading ? (
        <div className="pd-state"><span className="spinner spinner-lg" aria-hidden="true" /><p>Loading patients…</p></div>
      ) : list.length ? (
        <div className="ap-grid">
          {list.map((p) => <PatientTile key={idOf(p)} patient={p} status={status} onEdit={setEditing} />)}
        </div>
      ) : (
        <p className="pd-empty ap-empty">
          {query ? 'No patients match your search.' : `No ${meta.label.toLowerCase()} patients right now.`}
        </p>
      )}

      {editing && (
        <EditPatientModal
          patient={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
