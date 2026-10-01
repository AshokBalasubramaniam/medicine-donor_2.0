import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Hospital, MapPin, Pill, Stethoscope } from 'lucide-react';
import { displayName, fundedPct, initials, locationOf, medicinesOf, money, statusOf, toneOf } from './donorData';

export default function PatientCard({ patient }) {
  const status = statusOf(patient);
  const meds = medicinesOf(patient);
  const pct = fundedPct(patient);

  return (
    <article className="dn-patient-card">
      <div className="dn-card-head">
        <div className={`dn-avatar is-${toneOf(patient)}`} aria-hidden="true">{initials(patient.name)}</div>
        <div className="dn-patient-title">
          <strong>{displayName(patient.name)}</strong>
          <small>Verified patient</small>
        </div>
        <span className={`dn-status is-${status.key}`}>{status.label}</span>
      </div>

      <div className="dn-patient-details">
        <span><CalendarDays size={15} aria-hidden="true" />{patient.age ? `${patient.age} years` : 'Age not shared'}{patient.gender ? ` · ${patient.gender}` : ''}</span>
        <span><Stethoscope size={15} aria-hidden="true" />{patient.disease || 'Condition not specified'}</span>
        <span><Hospital size={15} aria-hidden="true" />{patient.hospitalname || 'Hospital not specified'}</span>
        <span><MapPin size={15} aria-hidden="true" />{locationOf(patient) || 'Location not shared'}</span>
        {meds.length > 0 && (
          <span title={meds.map((m) => m.name).join(', ')}>
            <Pill size={15} aria-hidden="true" />{meds.length} medicine{meds.length === 1 ? '' : 's'} prescribed
          </span>
        )}
      </div>

      <div className="dn-fund">
        <div>
          <span>Raised so far</span>
          <strong>{money(patient.paid_amount)}</strong>
        </div>
        <div>
          <span>Still needed</span>
          <strong className="is-needed">{money(patient.balance_amount)}</strong>
        </div>
      </div>
      <div className="dn-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% funded`}>
        <span style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <p className="dn-goal">{pct}% of {money(patient.amount)} goal</p>

      <Link to={`/donor/donate?patient=${patient.id}`} className="dn-donate-btn">
        Donate now <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </article>
  );
}
