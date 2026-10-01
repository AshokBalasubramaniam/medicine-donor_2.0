import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
import { adminListPatients } from '../../api';
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
} from './adminData';

const PAGE = 24;

// Sorting happens on the server (routes/admin_patients.rs).
const SORTS = {
  newest: { label: 'Newest first' },
  oldest: { label: 'Oldest first' },
  name: { label: 'Name (A–Z)' },
  needed: { label: 'Most still needed', only: ['approved', 'completed'] },
  funded: { label: 'Least funded', only: ['approved'] },
};

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

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
  const { reloadStats } = useOutletContext();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0);
  const q = useDebounced(query.trim(), 300);

  const meta = STATUS[status];
  const sorts = Object.entries(SORTS).filter(([, s]) => !s.only || s.only.includes(status));

  // Back to the first page whenever the search or sort changes.
  useEffect(() => setPage(1), [q, sort]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    adminListPatients({ status, q, sort, page, limit: PAGE }, controller.signal)
      .then((res) => setData(res))
      .catch((err) => {
        if (!controller.signal.aborted) setError(err?.error || 'Couldn’t load patients. Please try again.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, q, sort, page, version]);

  const refresh = () => {
    setVersion((v) => v + 1);
    reloadStats?.();
  };

  const from = data.total ? (page - 1) * PAGE + 1 : 0;
  const to = Math.min(page * PAGE, data.total);

  return (
    <div className="pd-page">
      <section className="pd-card ap-list-head">
        <div>
          <h1>{meta.title} <span className="ap-count">{loading && !data.total ? '…' : data.total}</span></h1>
          <p>{meta.blurb}</p>
        </div>
        <div className="ap-toolbar">
          <label className="ap-search">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, condition, hospital…" aria-label="Search patients" />
          </label>
          <select className="ap-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {sorts.map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
      </section>

      {error ? (
        <p className="pd-error" role="alert">{error} <button type="button" className="pd-link-btn" onClick={refresh}>Try again</button></p>
      ) : loading && !data.items.length ? (
        <div className="pd-state"><span className="spinner spinner-lg" aria-hidden="true" /><p>Loading patients…</p></div>
      ) : data.items.length ? (
        <>
          <div className={`ap-grid ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
            {data.items.map((p) => <PatientTile key={idOf(p)} patient={p} status={status} onEdit={setEditing} />)}
          </div>
          {data.pages > 1 && (
            <nav className="ap-pager" aria-label="Pages">
              <span>Showing {from}–{to} of {data.total}</span>
              <div>
                <button type="button" className="ap-btn is-small" onClick={() => setPage((n) => n - 1)} disabled={page <= 1 || loading}>
                  <ChevronLeft size={15} aria-hidden="true" /> Previous
                </button>
                <span className="ap-page-no">Page {page} of {data.pages}</span>
                <button type="button" className="ap-btn is-small" onClick={() => setPage((n) => n + 1)} disabled={page >= data.pages || loading}>
                  Next <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </>
      ) : (
        <p className="pd-empty ap-empty">
          {q ? 'No patients match your search.' : `No ${meta.label.toLowerCase()} patients right now.`}
        </p>
      )}

      {editing && (
        <EditPatientModal
          patient={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
