import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Hospital,
  Info,
  Lock,
  MapPin,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { toast } from '../feedback/feedback';
import { createOrder, verifyPayment } from '../../api';
import { SORTS, displayName, fundedPct, initials, locationOf, medicinesOf, money, statusOf, toneOf } from './donorData';

const PRESETS = [500, 1000, 2500, 5000];
const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Loads Razorpay checkout on first use instead of on every page. */
let razorpayPromise;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  razorpayPromise ??= new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      razorpayPromise = undefined; // allow a retry
      script.remove();
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return razorpayPromise;
}

function PatientPicker({ patients, onPick }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return patients
      .filter((p) => !s || `${p.name} ${p.disease} ${p.hospitalname} ${locationOf(p)}`.toLowerCase().includes(s))
      .sort(SORTS.urgent.fn);
  }, [patients, q]);

  return (
    <div className="dn-picker">
      <label className="dn-patient-search">
        <Search size={17} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, disease or hospital" autoFocus />
      </label>
      <ul className="dn-picker-list">
        {list.map((p) => {
          const st = statusOf(p);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p.id)}>
                <span className={`dn-avatar is-${toneOf(p)}`} aria-hidden="true">{initials(p.name)}</span>
                <span className="dn-picker-text">
                  <strong>{displayName(p.name)}</strong>
                  <small>{[p.disease, p.hospitalname].filter(Boolean).join(' · ') || 'Verified patient'}</small>
                </span>
                <span className="dn-picker-amount">
                  <span className={`dn-status is-${st.key}`}>{st.label}</span>
                  <small>{money(p.balance_amount)} needed</small>
                </span>
              </button>
            </li>
          );
        })}
        {!list.length && <li className="dn-picker-empty">No matching patients.</li>}
      </ul>
    </div>
  );
}

export default function MakeDonation() {
  const { patients, loading, reload, user } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('patient');
  const patient = patients.find((p) => p.id === selectedId) || null;

  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Fetch the checkout script in the background so "Donate" opens instantly.
  useEffect(() => {
    loadRazorpay();
  }, []);

  const balance = Math.floor(Number(patient?.balance_amount) || 0);
  const value = Math.floor(Number(amount) || 0);
  const amountError =
    !amount ? '' : value < 1 ? 'Enter an amount of at least ₹1' : value > balance ? `Only ${money(balance)} is still needed` : '';
  const presets = PRESETS.filter((p) => p < balance);

  const pick = (id) => {
    setParams(id ? { patient: id } : {});
    setAmount('');
    setReceipt(null);
  };

  async function donate(e) {
    e.preventDefault();
    if (!patient || amountError || value < 1) return;
    setPaying(true);
    if (!(await loadRazorpay())) {
      toast.error('The payment gateway didn’t load. Check your connection and try again.', 'Payment unavailable');
      setPaying(false);
      return;
    }
    try {
      const order = await createOrder(value, patient.id);
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Medicine Donor',
        description: `Donation for ${displayName(patient.name)}`,
        order_id: order.order_id,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        notes: { patient_id: patient.id },
        theme: { color: '#078b67' },
        modal: {
          confirm_close: true,
          ondismiss: () => setPaying(false),
        },
        handler: async (res) => {
          try {
            await verifyPayment({
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            });
            setReceipt({ amount: value, paymentId: res.razorpay_payment_id, name: displayName(patient.name) });
            toast.success(`Thank you for supporting ${displayName(patient.name)}.`, 'Donation successful');
            reload();
          } catch (err) {
            toast.error(
              err?.error || 'Please contact support with your payment id if the amount was deducted.',
              'Payment verification failed'
            );
          } finally {
            setPaying(false);
          }
        },
      });
      rzp.on('payment.failed', (resp) => {
        toast.error(resp.error?.description || 'The payment didn’t go through.', 'Payment failed');
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err?.error || 'Please try again.', 'Couldn’t start payment');
      setPaying(false);
    }
  }

  if (receipt) {
    return (
      <div className="dn-content">
        <section className="dn-card dn-success">
          <CheckCircle2 size={56} aria-hidden="true" />
          <h1>Thank you!</h1>
          <p>Your donation of <strong>{money(receipt.amount)}</strong> to <strong>{receipt.name}</strong> was received.</p>
          <p className="dn-muted">Payment reference: <code>{receipt.paymentId}</code></p>
          <div className="dn-success-actions">
            <button type="button" className="dn-primary-btn" onClick={() => pick(null)}>Donate to another patient</button>
            <Link to="/donor/donations" className="dn-outline-btn">View my donations</Link>
          </div>
        </section>
      </div>
    );
  }

  const meds = patient ? medicinesOf(patient) : [];
  const pct = patient ? fundedPct(patient) : 0;
  const status = patient ? statusOf(patient) : null;

  return (
    <div className="dn-content">
      <section className="dn-welcome">
        <div>
          <span className="dn-eyebrow">Make a donation</span>
          <h1>Support a patient’s treatment</h1>
          <p>Choose a verified patient and an amount. Payments are processed securely by Razorpay.</p>
        </div>
      </section>

      <div className="dn-donate-grid">
        <section className="dn-card">
          <div className="dn-step-head">
            <span className="dn-step-num">1</span>
            <h2>{patient ? 'Patient' : 'Choose a patient'}</h2>
            {patient && (
              <button type="button" className="dn-link" onClick={() => pick(null)}>
                <ArrowLeft size={15} aria-hidden="true" /> Change
              </button>
            )}
          </div>

          {selectedId && !patient && !loading && (
            <p className="dn-inline-note"><Info size={16} aria-hidden="true" /> That case is no longer open for donations. Please choose another patient.</p>
          )}

          {loading ? (
            <div className="dn-empty"><span className="spinner spinner-lg" aria-hidden="true" /></div>
          ) : !patient ? (
            patients.length ? <PatientPicker patients={patients} onPick={pick} /> : (
              <div className="dn-empty">
                <strong>No open cases right now</strong>
                <span>Every approved case is fully funded. Please check back later.</span>
              </div>
            )
          ) : (
            <>
              <div className="dn-card-head dn-selected">
                <div className={`dn-avatar is-${toneOf(patient)}`} aria-hidden="true">{initials(patient.name)}</div>
                <div className="dn-patient-title">
                  <strong>{displayName(patient.name)}</strong>
                  <small>{patient.age ? `${patient.age} years` : 'Verified patient'}{patient.gender ? ` · ${patient.gender}` : ''}</small>
                </div>
                <span className={`dn-status is-${status.key}`}>{status.label}</span>
              </div>

              <div className="dn-facts">
                <span><Stethoscope size={16} aria-hidden="true" /> {patient.disease || 'Condition not specified'}{patient.severity ? ` (${patient.severity})` : ''}</span>
                <span><Hospital size={16} aria-hidden="true" /> {patient.hospitalname || 'Hospital not specified'}</span>
                <span><MapPin size={16} aria-hidden="true" /> {locationOf(patient) || 'Location not shared'}</span>
              </div>

              <div className="dn-progress-box">
                <div className="dn-fund">
                  <div><span>Raised so far</span><strong>{money(patient.paid_amount)}</strong></div>
                  <div><span>Still needed</span><strong className="is-needed">{money(balance)}</strong></div>
                </div>
                <div className="dn-track"><span style={{ width: `${Math.max(pct, 2)}%` }} /></div>
                <p className="dn-goal">{pct}% of {money(patient.amount)} goal</p>
              </div>

              <h3 className="dn-subhead"><Pill size={16} aria-hidden="true" /> What your donation covers</h3>
              {meds.length ? (
                <ul className="dn-med-list">
                  {meds.map((m, i) => (
                    <li key={`${m.name}-${i}`}>
                      <strong>{m.name}</strong>
                      <span>{[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ') || 'As prescribed'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dn-muted">Prescribed medicines for this patient’s treatment.</p>
              )}
            </>
          )}
        </section>

        <form className="dn-card dn-amount-card" onSubmit={donate}>
          <div className="dn-step-head">
            <span className="dn-step-num">2</span>
            <h2>Choose an amount</h2>
          </div>

          <div className="dn-presets" role="group" aria-label="Quick amounts">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                className={value === p ? 'is-active' : ''}
                onClick={() => setAmount(String(p))}
                disabled={!patient || paying}
              >
                {money(p)}
              </button>
            ))}
            {patient && balance > 0 && (
              <button
                type="button"
                className={`dn-preset-full ${value === balance ? 'is-active' : ''}`}
                onClick={() => setAmount(String(balance))}
                disabled={paying}
              >
                Cover all {money(balance)}
              </button>
            )}
          </div>

          <label className="dn-amount-input">
            <span>Or enter an amount</span>
            <div className={amountError ? 'has-error' : ''}>
              <b>₹</b>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max={balance || undefined}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={patient ? 'Amount' : 'Choose a patient first'}
                disabled={!patient || paying}
              />
            </div>
            {amountError && <small className="dn-error">{amountError}</small>}
          </label>

          <dl className="dn-summary">
            <div><dt>Patient</dt><dd>{patient ? displayName(patient.name) : '—'}</dd></div>
            <div><dt>Donation</dt><dd>{value > 0 ? money(value) : '—'}</dd></div>
            <div className="is-total"><dt>Total</dt><dd>{value > 0 ? money(value) : '₹0'}</dd></div>
          </dl>

          <button type="submit" className="dn-primary-btn dn-pay-btn" disabled={!patient || !value || !!amountError || paying}>
            {paying ? <span className="spinner" aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
            {paying ? 'Processing…' : `Donate ${value > 0 ? money(value) : ''} securely`}
          </button>

          <p className="dn-secure"><ShieldCheck size={16} aria-hidden="true" /> Paid through Razorpay’s secure checkout. The amount goes toward this patient’s verified treatment.</p>
        </form>
      </div>
    </div>
  );
}
