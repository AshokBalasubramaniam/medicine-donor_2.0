import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ChevronDown, HandHeart, HeartHandshake, Receipt, Users } from 'lucide-react';
import { displayName, initials, money } from './donorData';

function formatDate(ms) {
  if (!ms) return 'Date not recorded';
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyDonations() {
  const { donations, patients, loading } = useOutletContext();
  const [openId, setOpenId] = useState(null);

  const total = donations.reduce((s, d) => s + (Number(d.total) || 0), 0);
  const payments = donations.reduce((s, d) => s + (Number(d.count) || 0), 0);
  const openIds = new Set(patients.map((p) => p.id));

  return (
    <div className="dn-content">
      <section className="dn-welcome">
        <div>
          <span className="dn-eyebrow">My donations</span>
          <h1>Your giving history</h1>
          <p>Every donation you’ve made, grouped by patient.</p>
        </div>
        <Link to="/donor/donate" className="dn-primary-btn">
          <HandHeart size={17} aria-hidden="true" /> <span>Make a donation</span>
        </Link>
      </section>

      <section className="dn-stat-grid" aria-label="Your donation totals">
        <article>
          <div className="dn-stat-icon is-green"><HeartHandshake size={22} aria-hidden="true" /></div>
          <div><span>Total donated</span><strong>{money(total)}</strong><small>All time</small></div>
        </article>
        <article>
          <div className="dn-stat-icon is-blue"><Users size={22} aria-hidden="true" /></div>
          <div><span>Patients helped</span><strong>{donations.length}</strong><small>Families supported</small></div>
        </article>
        <article>
          <div className="dn-stat-icon is-purple"><Receipt size={22} aria-hidden="true" /></div>
          <div><span>Donations made</span><strong>{payments}</strong><small>Successful payments</small></div>
        </article>
      </section>

      <section className="dn-patients-section">
        <div className="dn-section-head">
          <div>
            <span className="dn-eyebrow">History</span>
            <h2>Donations by patient</h2>
          </div>
        </div>

        {loading ? (
          <div className="dn-empty"><span className="spinner spinner-lg" aria-hidden="true" /></div>
        ) : !donations.length ? (
          <div className="dn-empty">
            <HeartHandshake size={30} aria-hidden="true" />
            <strong>No donations yet</strong>
            <span>When you donate to a patient, it will show up here.</span>
            <Link to="/donor/patients" className="dn-primary-btn">Find a patient to support</Link>
          </div>
        ) : (
          <ul className="dn-history">
            {donations.map((d) => {
              const isOpen = openId === d.patient_id;
              const stillOpen = openIds.has(d.patient_id);
              return (
                <li key={d.patient_id} className={isOpen ? 'is-open' : ''}>
                  <button type="button" className="dn-history-row" onClick={() => setOpenId(isOpen ? null : d.patient_id)} aria-expanded={isOpen}>
                    <span className="dn-avatar is-mint" aria-hidden="true">{initials(d.patient_name)}</span>
                    <span className="dn-history-text">
                      <strong>{displayName(d.patient_name)}</strong>
                      <small>{d.count} donation{d.count === 1 ? '' : 's'} · last on {formatDate(d.last_paid_at)}</small>
                    </span>
                    <span className={`dn-status ${stillOpen ? 'is-in-treatment' : 'is-stable'}`}>{stillOpen ? 'Still open' : 'Funded / closed'}</span>
                    <strong className="dn-history-total">{money(d.total)}</strong>
                    <ChevronDown size={18} className="dn-chevron" aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div className="dn-history-detail">
                      <table>
                        <thead><tr><th>Date</th><th>Amount</th><th>Payment reference</th></tr></thead>
                        <tbody>
                          {d.payments.map((p, i) => (
                            <tr key={`${p.payment_id}-${i}`}>
                              <td>{formatDate(p.paid_at)}</td>
                              <td>{money(p.amount)}</td>
                              <td><code>{p.payment_id || '—'}</code></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {stillOpen && (
                        <Link to={`/donor/donate?patient=${d.patient_id}`} className="dn-outline-btn">Donate again</Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
