import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  CalendarDays,
  Clock,
  GraduationCap,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { deleteDoctor, listDoctors, registerdoctor, updateDoctor } from "../../api";
import { confirm, toast } from "../feedback/feedback";
import { isEmail, isPhone } from "../auth/validation";

const SPECIALITIES = [
  "Cardiologist",
  "Dermatologist",
  "General Physician",
  "Neurologist",
  "Oncologist",
  "Pediatrician",
  "Psychologist",
  "Radiologist",
  "Surgeon",
  "Others",
];

const EMPTY = {
  fullName: "",
  email: "",
  phone: "",
  speciality: "",
  otherSpeciality: "",
  qualification: "",
  experience: "",
  availableDays: "",
  availableTimings: "",
  maxPatients: "",
};

const ORDER = ["fullName", "email", "phone", "speciality", "otherSpeciality", "experience", "maxPatients"];
const PAGE = 24;

const SORTS = {
  name: { label: "Name (A–Z)", fn: (a, b) => (a.fullName || "").localeCompare(b.fullName || "") },
  experience: { label: "Most experienced", fn: (a, b) => (Number(b.experience) || 0) - (Number(a.experience) || 0) },
  capacity: { label: "Most patients / day", fn: (a, b) => (Number(b.maxPatients) || 0) - (Number(a.maxPatients) || 0) },
};

function validate(v) {
  return {
    fullName: v.fullName.trim().length < 2 ? "Enter the doctor’s full name" : "",
    email: !v.email.trim() ? "Enter an email address" : !isEmail(v.email) ? "Enter a valid email address" : "",
    phone: !v.phone.trim() ? "Enter a phone number" : !isPhone(v.phone) ? "Enter a valid phone number (10–15 digits)" : "",
    speciality: v.speciality ? "" : "Select a speciality",
    otherSpeciality: v.speciality === "Others" && !v.otherSpeciality.trim() ? "Enter the speciality" : "",
    experience:
      v.experience && !(/^\d{1,2}$/.test(v.experience) && Number(v.experience) <= 70)
        ? "Enter years of experience (0–70)"
        : "",
    maxPatients: v.maxPatients && !(/^\d+$/.test(v.maxPatients) && Number(v.maxPatients) > 0) ? "Enter a positive number" : "",
  };
}

function initials(name = "") {
  const parts = name.replace(/^dr\.?\s+/i, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "D") + (parts[1]?.[0] || "")).toUpperCase();
}

function fromDoctor(d) {
  const known = SPECIALITIES.includes(d.speciality);
  return {
    fullName: d.fullName || "",
    email: d.email || "",
    phone: d.phone || "",
    speciality: d.speciality ? (known ? d.speciality : "Others") : "",
    otherSpeciality: d.speciality && !known ? d.speciality : "",
    qualification: d.qualification || "",
    experience: d.experience != null ? String(d.experience) : "",
    availableDays: d.availableDays || "",
    availableTimings: d.availableTimings || "",
    maxPatients: d.maxPatients != null ? String(d.maxPatients) : "",
  };
}

/* ------------------------------------------------------------ Add / edit */

function DoctorForm({ doctor, onClose, onSaved }) {
  const [values, setValues] = useState(doctor ? fromDoctor(doctor) : EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const refs = useRef({});

  useEffect(() => {
    refs.current.fullName?.focus();
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const field = (name) => ({
    name,
    ref: (el) => { refs.current[name] = el; },
    value: values[name],
    disabled: saving,
    "aria-invalid": errors[name] ? "true" : undefined,
    onChange: (e) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      if (errors[name]) setErrors((x) => ({ ...x, [name]: "" }));
      setMessage("");
    },
  });
  const err = (name) => errors[name] && <small className="ap-field-error">{errors[name]}</small>;

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    const firstInvalid = ORDER.find((f) => found[f]);
    if (firstInvalid) {
      refs.current[firstInvalid]?.focus();
      return;
    }
    setSaving(true);
    const payload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      speciality: values.speciality === "Others" ? values.otherSpeciality.trim() : values.speciality,
      qualification: values.qualification.trim(),
      experience: values.experience.trim(),
      availableDays: values.availableDays.trim(),
      availableTimings: values.availableTimings.trim(),
      maxPatients: values.maxPatients.trim(),
    };
    try {
      if (doctor) {
        await updateDoctor(doctor.id, payload);
        toast.success(`${payload.fullName}’s details were updated.`, "Changes saved");
      } else {
        await registerdoctor(payload);
        toast.success(`${payload.fullName} was added to the doctors list.`, "Doctor added");
      }
      onSaved();
    } catch (error) {
      const text = error?.error || "Could not save the doctor. Please try again.";
      if (error?.status === 409) {
        setErrors((x) => ({ ...x, email: text }));
        refs.current.email?.focus();
      } else {
        setMessage(text);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ae-overlay" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className="ae-modal" onSubmit={onSubmit} noValidate role="dialog" aria-modal="true" aria-labelledby="doc-form-title">
        <header className="ae-head">
          <div>
            <h2 id="doc-form-title">{doctor ? "Edit doctor" : "Add a doctor"}</h2>
            <p>{doctor ? doctor.fullName : "Fields marked * are required."}</p>
          </div>
          <button type="button" className="ae-close" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="ae-body">
          {message && <p className="ae-error" role="alert">{message}</p>}
          <div className="ae-grid">
            <label className="ae-span-4">Full name *
              <input {...field("fullName")} placeholder="e.g. Dr. Meena Raman" autoComplete="off" />
              {err("fullName")}
            </label>
            <label className="ae-span-2">Email *
              <input {...field("email")} type="email" placeholder="doctor@hospital.com" autoComplete="off" />
              {err("email")}
            </label>
            <label className="ae-span-2">Phone *
              <input {...field("phone")} type="tel" inputMode="tel" placeholder="98765 43210" autoComplete="off" />
              {err("phone")}
            </label>
            <label className="ae-span-2">Speciality *
              <select {...field("speciality")}>
                <option value="">Select speciality</option>
                {SPECIALITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {err("speciality")}
            </label>
            {values.speciality === "Others" ? (
              <label className="ae-span-2">Speciality name *
                <input {...field("otherSpeciality")} placeholder="e.g. Nephrologist" />
                {err("otherSpeciality")}
              </label>
            ) : (
              <label className="ae-span-2">Qualification
                <input {...field("qualification")} placeholder="e.g. MBBS, MD" />
              </label>
            )}
            {values.speciality === "Others" && (
              <label className="ae-span-4">Qualification
                <input {...field("qualification")} placeholder="e.g. MBBS, MD" />
              </label>
            )}
            <label className="ae-span-2">Experience (years)
              <input {...field("experience")} inputMode="numeric" placeholder="e.g. 8" />
              {err("experience")}
            </label>
            <label className="ae-span-2">Max patients per day
              <input {...field("maxPatients")} inputMode="numeric" placeholder="e.g. 20" />
              {err("maxPatients")}
            </label>
            <label className="ae-span-2">Available days
              <input {...field("availableDays")} placeholder="e.g. Mon – Fri" />
            </label>
            <label className="ae-span-2">Available timings
              <input {...field("availableTimings")} placeholder="e.g. 10:00 AM – 2:00 PM" />
            </label>
          </div>
        </div>

        <footer className="ae-foot">
          <button type="button" className="ae-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="ae-btn is-primary" disabled={saving}>
            {saving ? <span className="spinner" aria-hidden="true" /> : doctor ? <Save size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
            {saving ? "Saving…" : doctor ? "Save changes" : "Add doctor"}
          </button>
        </footer>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ Page */

export default function Doctor() {
  const [doctors, setDoctors] = useState([]);
  const [listState, setListState] = useState("loading"); // loading | ready | error
  const [form, setForm] = useState(null); // null | { doctor: null | doctor }
  const [deletingId, setDeletingId] = useState(null);
  const [query, setQuery] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [sort, setSort] = useState("name");
  const [limit, setLimit] = useState(PAGE);

  const loadDoctors = useCallback(async () => {
    setListState("loading");
    try {
      const data = await listDoctors();
      setDoctors(Array.isArray(data) ? data : []);
      setListState("ready");
    } catch {
      setListState("error");
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Reset paging whenever the filters change.
  useEffect(() => setLimit(PAGE), [query, speciality, sort]);

  const specialityCounts = useMemo(() => {
    const counts = new Map();
    doctors.forEach((d) => {
      const s = d.speciality || "Not specified";
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [doctors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors
      .filter((d) => !speciality || (d.speciality || "Not specified") === speciality)
      .filter((d) =>
        !q ||
        [d.fullName, d.email, d.phone, d.speciality, d.qualification, d.availableDays]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .sort(SORTS[sort].fn);
  }, [doctors, query, speciality, sort]);

  const onDelete = async (d) => {
    const ok = await confirm({
      title: "Delete doctor?",
      message: `${d.fullName || "This doctor"} will be permanently removed. This can’t be undone.`,
      confirmText: "Delete",
      tone: "danger",
      icon: "delete",
    });
    if (!ok) return;
    setDeletingId(d.id);
    try {
      await deleteDoctor(d.id);
      setDoctors((prev) => prev.filter((x) => x.id !== d.id));
      toast.success(`${d.fullName || "The doctor"} was removed.`, "Doctor deleted");
    } catch (err) {
      toast.error(err?.error || "Please try again.", "Couldn’t delete doctor");
    } finally {
      setDeletingId(null);
    }
  };

  const filtering = query || speciality;

  return (
    <div className="pd-page">
      <section className="pd-card ap-list-head">
        <div>
          <h1>Doctors <span className="ap-count">{listState === "ready" ? doctors.length : "…"}</span></h1>
          <p>Register doctors so patients can be assigned to them.</p>
        </div>
        <div className="ap-toolbar ap-doc-toolbar">
          <label className="ap-search">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, qualification…" aria-label="Search doctors" />
          </label>
          <select className="ap-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort doctors">
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <button type="button" className="ap-btn" onClick={loadDoctors} disabled={listState === "loading"} aria-label="Refresh list" title="Refresh">
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <button type="button" className="ap-btn is-primary" onClick={() => setForm({ doctor: null })}>
            <Plus size={17} aria-hidden="true" /> Add doctor
          </button>
        </div>
      </section>

      {specialityCounts.length > 0 && (
        <div className="ap-chips" role="group" aria-label="Filter by speciality">
          <button type="button" className={`ap-chip ${!speciality ? "is-active" : ""}`} onClick={() => setSpeciality("")}>
            All <span>{doctors.length}</span>
          </button>
          {specialityCounts.map(([s, n]) => (
            <button key={s} type="button" className={`ap-chip ${speciality === s ? "is-active" : ""}`} onClick={() => setSpeciality(speciality === s ? "" : s)}>
              {s} <span>{n}</span>
            </button>
          ))}
        </div>
      )}

      {listState === "loading" ? (
        <div className="pd-state"><span className="spinner spinner-lg" aria-hidden="true" /><p>Loading doctors…</p></div>
      ) : listState === "error" ? (
        <p className="pd-error" role="alert">Couldn’t load doctors. <button type="button" className="pd-link-btn" onClick={loadDoctors}>Try again</button></p>
      ) : !doctors.length ? (
        <div className="pd-empty ap-empty ap-doc-empty">
          <Stethoscope size={28} aria-hidden="true" />
          <strong>No doctors yet</strong>
          <span>Add the hospital’s doctors so patients can be assigned to them.</span>
          <button type="button" className="ap-btn is-primary" onClick={() => setForm({ doctor: null })}>
            <Plus size={17} aria-hidden="true" /> Add the first doctor
          </button>
        </div>
      ) : !filtered.length ? (
        <p className="pd-empty ap-empty">
          No doctors match {filtering ? "these filters" : "your search"}.{" "}
          <button type="button" className="pd-link-btn" onClick={() => { setQuery(""); setSpeciality(""); }}>Clear filters</button>
        </p>
      ) : (
        <>
          {filtering && <p className="ap-result-count">Showing {filtered.length} of {doctors.length} doctors</p>}
          <div className="ap-grid">
            {filtered.slice(0, limit).map((d) => (
              <article key={d.id} className="ap-card">
                <div className="ap-card-head">
                  <span className="ap-row-avatar is-blue" aria-hidden="true">{initials(d.fullName)}</span>
                  <div className="ap-card-title">
                    <strong title={d.fullName}>{d.fullName || "Unnamed doctor"}</strong>
                    <small>{d.qualification || "Qualification not given"}</small>
                  </div>
                  {d.speciality && <span className="pd-chip is-green" title={d.speciality}>{d.speciality}</span>}
                </div>

                <ul className="ap-card-facts">
                  <li><Award size={14} aria-hidden="true" /><span>{d.experience !== null && d.experience !== undefined && d.experience !== "" ? `${d.experience} yrs experience` : "Experience not given"}</span></li>
                  <li><Users size={14} aria-hidden="true" /><span>{d.maxPatients ? `Up to ${d.maxPatients} patients / day` : "Capacity not set"}</span></li>
                  <li><CalendarDays size={14} aria-hidden="true" /><span>{d.availableDays || "Days not set"}</span></li>
                  <li><Clock size={14} aria-hidden="true" /><span>{d.availableTimings || "Timings not set"}</span></li>
                  <li><Mail size={14} aria-hidden="true" /><span title={d.email}>{d.email || "No email"}</span></li>
                  <li><Phone size={14} aria-hidden="true" /><span>{d.phone || "No phone"}</span></li>
                </ul>

                <div className="ap-card-actions">
                  <button type="button" className="ap-btn is-small" onClick={() => setForm({ doctor: d })} disabled={deletingId === d.id}>
                    <Pencil size={15} aria-hidden="true" /> Edit
                  </button>
                  <button type="button" className="ap-btn is-small is-danger" onClick={() => onDelete(d)} disabled={deletingId === d.id} aria-label={`Delete ${d.fullName}`}>
                    {deletingId === d.id ? <span className="spinner" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />} Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          {filtered.length > limit && (
            <div className="ap-more">
              <button type="button" className="ap-btn" onClick={() => setLimit((n) => n + PAGE)}>
                Show more ({filtered.length - limit} left)
              </button>
            </div>
          )}
        </>
      )}

      {form && (
        <DoctorForm
          doctor={form.doctor}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            loadDoctors();
          }}
        />
      )}
    </div>
  );
}
