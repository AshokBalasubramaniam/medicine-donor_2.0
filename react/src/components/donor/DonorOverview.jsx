import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, HandHeart, Heart, Hospital, Users } from 'lucide-react';
import donorImage from '../../assets/donorimage.png';
import PatientBrowser from './PatientBrowser';
import { compactMoney, createdAt, greeting, money } from './donorData';

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function DonorOverview() {
  const { patients, donations, loading, error, reload, user } = useOutletContext();

  const firstName = (user?.name || '').split(/\s+/)[0] || 'there';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalNeeded = patients.reduce((s, p) => s + (Number(p.balance_amount) || 0), 0);
  const newThisWeek = patients.filter((p) => Date.now() - createdAt(p) < WEEK).length;
  const myTotal = donations.reduce((s, d) => s + (Number(d.total) || 0), 0);
  const families = donations.filter((d) => d.total > 0).length;

  return (
    <div className="dn-content">
      <section className="dn-welcome">
        <div>
          <span className="dn-eyebrow">{today}</span>
          <h1>{greeting()}, {firstName}</h1>
          <p>Here is the impact your community is making today.</p>
        </div>
        <Link to="/donor/donate" className="dn-primary-btn">
          <Heart size={17} aria-hidden="true" /> <span>Make a donation</span>
        </Link>
      </section>

      <section className="dn-hero">
        <div className="dn-hero-copy">
          <span className="dn-hero-label">Every contribution matters</span>
          <h2>Help someone take their next step toward recovery.</h2>
          <p>
            Support patients verified by the hospital administration team through secure, transparent
            donations that go directly toward their prescribed medicines.
          </p>
          <Link to="/donor/patients" className="dn-hero-btn">
            Explore patients <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <div className="dn-hero-trust">
            <span>{patients.length} open case{patients.length === 1 ? '' : 's'}</span>
            <i />
            <span>Every case verified by hospital admin</span>
          </div>
        </div>
        <div className="dn-hero-image">
          <img src={donorImage} alt="Illustration of people supporting each other with medicines" />
          <div className="dn-impact-badge">
            <strong>{compactMoney(myTotal)}</strong>
            <span>donated by you</span>
          </div>
        </div>
      </section>

      <section className="dn-stat-grid" aria-label="Donation statistics">
        <article>
          <div className="dn-stat-icon is-green"><Users size={22} aria-hidden="true" /></div>
          <div>
            <span>Patients in need</span>
            <strong>{loading ? '—' : patients.length}</strong>
            <small>{newThisWeek ? `${newThisWeek} new this week` : 'Verified & open'}</small>
          </div>
        </article>
        <article>
          <div className="dn-stat-icon is-blue"><Hospital size={22} aria-hidden="true" /></div>
          <div>
            <span>Total care still needed</span>
            <strong>{loading ? '—' : money(totalNeeded)}</strong>
            <small>Across {patients.length} active case{patients.length === 1 ? '' : 's'}</small>
          </div>
        </article>
        <article>
          <div className="dn-stat-icon is-purple"><HandHeart size={22} aria-hidden="true" /></div>
          <div>
            <span>Your total impact</span>
            <strong>{money(myTotal)}</strong>
            <small>{families ? `Helping ${families} famil${families === 1 ? 'y' : 'ies'}` : 'Make your first donation'}</small>
          </div>
        </article>
      </section>

      <PatientBrowser
        patients={patients}
        loading={loading}
        error={error}
        onRetry={reload}
        limit={3}
        eyebrow="Most urgent"
        subtitle="Cases that need help the most right now."
      />
    </div>
  );
}
