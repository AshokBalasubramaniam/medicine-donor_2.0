import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, RotateCcw, Search, Stethoscope } from 'lucide-react';
import PatientCard from './PatientCard';
import { SORTS, locationOf } from './donorData';

/** Searchable, filterable grid of open cases. `limit` shows a preview. */
export default function PatientBrowser({ patients, loading, error, onRetry, initialQuery = '', limit, title, eyebrow, subtitle }) {
  const [query, setQuery] = useState(initialQuery);
  const [condition, setCondition] = useState('');
  const [place, setPlace] = useState('');
  const [sort, setSort] = useState(limit ? 'urgent' : 'recent');
  // Full list shows 24 cards at a time; the overview preview passes `limit`.
  const [shownCount, setShownCount] = useState(24);
  useEffect(() => setShownCount(24), [query, condition, place, sort]);

  const conditions = useMemo(
    () => [...new Set(patients.map((p) => p.disease).filter(Boolean))].sort(),
    [patients]
  );
  const places = useMemo(
    () => [...new Set(patients.map((p) => p.town || p.state).filter(Boolean))].sort(),
    [patients]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients
      .filter((p) => !condition || p.disease === condition)
      .filter((p) => !place || (p.town || p.state) === place)
      .filter((p) =>
        !q || `${p.name} ${p.disease} ${p.hospitalname} ${locationOf(p)}`.toLowerCase().includes(q)
      )
      .sort(SORTS[sort].fn);
  }, [patients, query, condition, place, sort]);

  const shown = filtered.slice(0, limit || shownCount);
  const filtering = query || condition || place;

  return (
    <section className="dn-patients-section" id="patients">
      <div className="dn-section-head">
        <div>
          <span className="dn-eyebrow">{eyebrow || 'Verified cases'}</span>
          <h2>{title || 'Patients needing support'}</h2>
          <p>{subtitle || 'Choose a case and make a meaningful difference today.'}</p>
        </div>
        {limit ? (
          <Link to="/donor/patients" className="dn-link">View all {patients.length} <ArrowRight size={15} aria-hidden="true" /></Link>
        ) : (
          <label className="dn-sort">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort patients">
              {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>

      {!limit && (
        <div className="dn-filters">
          <label className="dn-patient-search">
            <Search size={17} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, disease or hospital" />
          </label>
          <label className="dn-filter">
            <Stethoscope size={16} aria-hidden="true" />
            <select value={condition} onChange={(e) => setCondition(e.target.value)} aria-label="Filter by condition">
              <option value="">All conditions</option>
              {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="dn-filter">
            <MapPin size={16} aria-hidden="true" />
            <select value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Filter by location">
              <option value="">All locations</option>
              {places.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="dn-filter-reset"
            onClick={() => { setQuery(''); setCondition(''); setPlace(''); }}
            disabled={!filtering}
          >
            <RotateCcw size={16} aria-hidden="true" /> Clear filters
          </button>
        </div>
      )}

      {loading ? (
        <div className="dn-empty"><span className="spinner spinner-lg" aria-hidden="true" /><span>Loading patients…</span></div>
      ) : error ? (
        <div className="dn-empty">
          <strong>Couldn’t load patients</strong>
          <span>{error}</span>
          <button type="button" className="dn-primary-btn" onClick={onRetry}>Try again</button>
        </div>
      ) : shown.length ? (
        <>
          <div className="dn-patient-grid">
            {shown.map((p) => <PatientCard key={p.id} patient={p} />)}
          </div>
          {!limit && filtered.length > shown.length && (
            <div className="dn-more">
              <button type="button" className="dn-outline-btn" onClick={() => setShownCount((n) => n + 24)}>
                Show more ({filtered.length - shown.length} left)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="dn-empty">
          <Search size={28} aria-hidden="true" />
          <strong>{filtering ? 'No patients found' : 'No open cases right now'}</strong>
          <span>{filtering ? 'Try a different search or clear the filters.' : 'Every approved case is fully funded. Please check back later.'}</span>
        </div>
      )}
    </section>
  );
}
