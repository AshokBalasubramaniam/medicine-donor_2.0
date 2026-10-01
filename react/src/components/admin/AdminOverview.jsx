import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  HandCoins,
  HeartHandshake,
  Stethoscope,
  Trophy,
  XCircle,
} from 'lucide-react';
import { adminListPatients, getAllPayments, listDoctors } from '../../api';
import {
  amountOf,
  completeness,
  createdAt,
  formatDate,
  fundedPct,
  idOf,
  initials,
  money,
  paidOf,
} from './adminData';

function StatTile({ icon: Icon, label, value, note, tone, to }) {
  const body = (
    <>
      <span className={`ap-stat-icon is-${tone}`} aria-hidden="true"><Icon size={22} /></span>
      <span className="ap-stat-text">
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </span>
    </>
  );
  return to ? <Link to={to} className="ap-stat">{body}</Link> : <div className="ap-stat">{body}</div>;
}

function PanelHead({ icon: Icon, title, subtitle, to, action }) {
  return (
    <div className="pd-section-head">
      <div className="pd-section-title">
        <span className="pd-section-icon" aria-hidden="true"><Icon size={20} /></span>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {to && <Link to={to} className="pd-link-btn ap-link">{action} <ArrowRight size={14} aria-hidden="true" /></Link>}
    </div>
  );
}

export default function AdminOverview() {
  const { stats, statsError, reloadStats } = useOutletContext();
  const [payments, setPayments] = useState([]);
  const [doctorCount, setDoctorCount] = useState(null);
  // Only the rows these panels show are fetched (the server sorts and limits).
  const [pending, setPending] = useState([]);
  const [funding, setFunding] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [pay, docs, pend, open] = await Promise.all([
        getAllPayments().catch(() => []),
        listDoctors().catch(() => null),
        adminListPatients({ status: 'pending', sort: 'newest', limit: 5 }).catch(() => null),
        adminListPatients({ status: 'approved', sort: 'funded', limit: 5 }).catch(() => null),
      ]);
      setPayments(Array.isArray(pay) ? pay : []);
      setDoctorCount(Array.isArray(docs) ? docs.length : null);
      setPending(pend?.items || []);
      setFunding(open?.items || []);
      setListsLoading(false);
    })();
  }, []);

  const loading = !stats && !statsError;
  const counts = stats?.counts || {};
  const pendingCount = counts.pending || 0;
  const raised = stats?.raised || 0;
  const stillNeeded = stats?.still_needed || 0;
  const ready = stats?.ready || 0;
  const error = statsError;
  const reload = reloadStats;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="pd-page">
      <section className="ap-hero">
        <div>
          <span className="ap-eyebrow">{today}</span>
          <h1>Welcome back, Administrator</h1>
          <p>
            {loading
              ? 'Loading the latest applications…'
              : pendingCount
                ? `${pendingCount} application${pendingCount === 1 ? ' is' : 's are'} waiting for review${ready ? ` — ${ready} ${ready === 1 ? 'has' : 'have'} every required detail filled in` : ''}.`
                : 'You’re all caught up — there are no applications waiting for review.'}
          </p>
          <div className="ap-hero-actions">
            <Link to="/admin/patients/pending" className="ap-btn is-primary">
              <ClipboardCheck size={17} aria-hidden="true" /> Review applications
            </Link>
            <Link to="/admin/doctors" className="ap-btn">
              <Stethoscope size={17} aria-hidden="true" /> Manage doctors
            </Link>
          </div>
        </div>
        <div className="ap-hero-figure" aria-hidden="true">
          <strong>{money(raised)}</strong>
          <span>raised for patients so far</span>
        </div>
      </section>

      {error && (
        <p className="pd-error" role="alert">
          {error} <button type="button" className="pd-link-btn" onClick={reload}>Try again</button>
        </p>
      )}

      <section className="ap-stats" aria-label="Summary">
        <StatTile icon={Clock} tone="amber" label="Pending review" value={loading ? '—' : pendingCount} note={ready ? `${ready} ready to approve` : 'Awaiting details'} to="/admin/patients/pending" />
        <StatTile icon={CheckCircle2} tone="green" label="Approved & open" value={loading ? '—' : counts.approved || 0} note={`${money(stillNeeded)} still needed`} to="/admin/patients/approved" />
        <StatTile icon={Trophy} tone="blue" label="Fully funded" value={loading ? '—' : counts.completed || 0} note="Completed cases" to="/admin/patients/completed" />
        <StatTile icon={XCircle} tone="red" label="Rejected" value={loading ? '—' : counts.rejected || 0} note="Can be re-reviewed" to="/admin/patients/rejected" />
        <StatTile icon={HandCoins} tone="purple" label="Total raised" value={money(raised)} note={`${payments.length} donation${payments.length === 1 ? '' : 's'}`} />
        <StatTile icon={Stethoscope} tone="teal" label="Doctors" value={doctorCount ?? '—'} note="Registered" to="/admin/doctors" />
      </section>

      <div className="pd-grid">
        <section className="pd-card">
          <PanelHead icon={ClipboardCheck} title="Needs review" subtitle="Newest applications first" to="/admin/patients/pending" action="View all" />
          {pending.length ? (
            <ul className="ap-rows">
              {pending.map((p) => {
                const pct = completeness(p);
                return (
                  <li key={idOf(p)}>
                    <span className="ap-row-avatar is-amber" aria-hidden="true">{initials(p.name)}</span>
                    <span className="ap-row-text">
                      <strong>{p.name || 'Unnamed patient'}</strong>
                      <small>{p.disease || 'Condition not given'} · Applied {formatDate(createdAt(p))}</small>
                      <span className="ap-mini-track" aria-label={`${pct}% complete`}><span style={{ width: `${pct}%` }} className={pct === 100 ? 'is-done' : ''} /></span>
                    </span>
                    <Link to={`/admin/patients/${idOf(p)}/review`} className="ap-btn is-small">Review</Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pd-empty">{listsLoading ? 'Loading…' : 'No applications waiting for review.'}</p>
          )}
        </section>

        <section className="pd-card">
          <PanelHead icon={HeartHandshake} title="Funding progress" subtitle="Open cases with the most still to raise" to="/admin/patients/approved" action="All approved" />
          {funding.length ? (
            <ul className="ap-rows">
              {funding.map((p) => {
                const pct = fundedPct(p);
                return (
                  <li key={idOf(p)}>
                    <span className="ap-row-avatar is-green" aria-hidden="true">{initials(p.name)}</span>
                    <span className="ap-row-text">
                      <strong>{p.name}</strong>
                      <small>{money(paidOf(p))} of {amountOf(p) ? money(amountOf(p)) : 'amount not set'}</small>
                      <span className="ap-mini-track"><span style={{ width: `${pct}%` }} className="is-done" /></span>
                    </span>
                    <span className="ap-row-pct">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pd-empty">{listsLoading ? 'Loading…' : 'No open cases right now.'}</p>
          )}
        </section>

        <section className="pd-card pd-span-2">
          <PanelHead icon={HandCoins} title="Recent donations" subtitle="Latest payments from donors" />
          {payments.length ? (
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr><th>Date</th><th>Donor</th><th>Patient</th><th>Amount</th><th>Payment reference</th></tr>
                </thead>
                <tbody>
                  {payments.slice(0, 10).map((d, i) => (
                    <tr key={`${d.payment_id}-${i}`}>
                      <td>{formatDate(d.paid_at, 'Not recorded')}</td>
                      <td>{d.donor_name || '—'}</td>
                      <td>
                        {d.patient_id ? <Link to={`/admin/patients/${d.patient_id}`} className="ap-table-link">{d.patient_name || 'Patient'}</Link> : d.patient_name}
                      </td>
                      <td className="pd-med-name">{money(d.amount)}</td>
                      <td><code className="ap-code">{d.payment_id || '—'}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="pd-empty">No donations recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
