import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Award,
  CalendarDays,
  Clock,
  Pencil,
  Save,
  Trash2,
  X,
  GraduationCap,
  Mail,
  Phone,
  RefreshCw,
  Stethoscope,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { deleteDoctor, listDoctors, registerdoctor, updateDoctor } from "../../api";
import { confirm, toast } from "../feedback/feedback";
import Alert from "../common/Alert";
import EmptyState from "../common/EmptyState";
import { TextField } from "../common/FormField";
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

function validate(v) {
  const errors = {
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
  return errors;
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "D") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function Doctor() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // doctor being edited, or null
  const [deletingId, setDeletingId] = useState(null);
  const refs = useRef({});
  const formRef = useRef(null);

  const [doctors, setDoctors] = useState([]);
  const [listState, setListState] = useState("loading"); // loading | ready | error

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

  const bindRef = (name) => (el) => {
    refs.current[name] = el;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (message?.type === "error") setMessage(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    const firstInvalid = ORDER.find((f) => found[f]);
    if (firstInvalid) {
      refs.current[firstInvalid]?.focus();
      return;
    }

    if (editing) {
      const ok = await confirm({
        title: "Save changes?",
        message: `Update the details for ${editing.fullName || "this doctor"}?`,
        confirmText: "Save changes",
        icon: "save",
      });
      if (!ok) return;
    }

    setSaving(true);
    setMessage(null);
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
      if (editing) {
        await updateDoctor(editing.id, payload);
        toast.success(`${payload.fullName}’s details were updated.`, "Changes saved");
      } else {
        await registerdoctor(payload);
        toast.success(`${payload.fullName} was added to the doctors list.`, "Doctor added");
      }
      setValues(EMPTY);
      setErrors({});
      setEditing(null);
      loadDoctors();
    } catch (err) {
      const text = err?.error || "Could not register the doctor. Please try again.";
      if (err?.status === 409) {
        setErrors((prev) => ({ ...prev, email: text }));
        refs.current.email?.focus();
      } else {
        setMessage({ type: "error", text });
        toast.error(text, editing ? "Couldn’t save changes" : "Couldn’t add doctor");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (d) => {
    const known = SPECIALITIES.includes(d.speciality);
    setEditing(d);
    setErrors({});
    setMessage(null);
    setValues({
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
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => refs.current.fullName?.focus({ preventScroll: true }), 300);
  };

  const cancelEdit = () => {
    setEditing(null);
    setValues(EMPTY);
    setErrors({});
    setMessage(null);
  };

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
      if (editing?.id === d.id) cancelEdit();
      toast.success(`${d.fullName || "The doctor"} was removed.`, "Doctor deleted");
    } catch (err) {
      toast.error(err?.error || "Please try again.", "Couldn’t delete doctor");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Doctors</h1>
          <p>Register doctors so patients can be assigned to them.</p>
        </div>
      </div>

      <div className="doctor-grid">
        <section ref={formRef} className="card panel" aria-labelledby="add-doctor-title">
          <div className="panel-head">
            <span className={`feature-icon ${editing ? "tone-blue" : "tone-green"}`} aria-hidden="true">
              {editing ? <Pencil size={20} /> : <UserPlus size={20} />}
            </span>
            <div>
              <h2 id="add-doctor-title">{editing ? "Edit doctor" : "Add a doctor"}</h2>
              <p>Fields marked * are required.</p>
            </div>
          </div>

          <form className="form" onSubmit={onSubmit} noValidate>
            {editing && (
              <div className="edit-banner">
                <span>
                  Editing <strong>{editing.fullName}</strong>
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={saving}>
                  <X size={15} aria-hidden="true" /> Cancel
                </button>
              </div>
            )}
            {message && (
              <Alert type={message.type} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            )}

            <TextField
              ref={bindRef("fullName")}
              label="Full name *"
              name="fullName"
              icon={UserRound}
              autoComplete="off"
              placeholder="e.g. Dr. Meena Raman"
              value={values.fullName}
              onChange={onChange}
              error={errors.fullName}
              disabled={saving}
            />

            <div className="form-row">
              <TextField
                ref={bindRef("email")}
                label="Email *"
                name="email"
                type="email"
                icon={Mail}
                autoComplete="off"
                placeholder="doctor@hospital.com"
                value={values.email}
                onChange={onChange}
                error={errors.email}
                disabled={saving}
              />
              <TextField
                ref={bindRef("phone")}
                label="Phone *"
                name="phone"
                type="tel"
                inputMode="tel"
                icon={Phone}
                autoComplete="off"
                placeholder="98765 43210"
                value={values.phone}
                onChange={onChange}
                error={errors.phone}
                disabled={saving}
              />
            </div>

            <div className="form-row">
              <div className="field">
                <label className="field-label" htmlFor="doctor-speciality">
                  Speciality *
                </label>
                <div className="input-wrap">
                  <Stethoscope className="input-icon" size={18} aria-hidden="true" />
                  <select
                    ref={bindRef("speciality")}
                    id="doctor-speciality"
                    name="speciality"
                    className="input select"
                    value={values.speciality}
                    onChange={onChange}
                    aria-invalid={errors.speciality ? "true" : undefined}
                    aria-describedby={errors.speciality ? "doctor-speciality-error" : undefined}
                    disabled={saving}
                  >
                    <option value="">Select speciality</option>
                    {SPECIALITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.speciality && (
                  <span id="doctor-speciality-error" className="field-error">
                    {errors.speciality}
                  </span>
                )}
              </div>
              <TextField
                label="Qualification"
                name="qualification"
                icon={GraduationCap}
                placeholder="e.g. MBBS, MD"
                value={values.qualification}
                onChange={onChange}
                disabled={saving}
              />
            </div>

            {values.speciality === "Others" && (
              <TextField
                ref={bindRef("otherSpeciality")}
                label="Speciality name *"
                name="otherSpeciality"
                icon={Stethoscope}
                placeholder="Enter speciality"
                value={values.otherSpeciality}
                onChange={onChange}
                error={errors.otherSpeciality}
                disabled={saving}
              />
            )}

            <div className="form-row">
              <TextField
                ref={bindRef("experience")}
                label="Experience (years)"
                name="experience"
                inputMode="numeric"
                icon={Award}
                placeholder="e.g. 8"
                value={values.experience}
                onChange={onChange}
                error={errors.experience}
                disabled={saving}
              />
              <TextField
                ref={bindRef("maxPatients")}
                label="Max patients per day"
                name="maxPatients"
                inputMode="numeric"
                icon={Users}
                placeholder="e.g. 20"
                value={values.maxPatients}
                onChange={onChange}
                error={errors.maxPatients}
                disabled={saving}
              />
            </div>

            <div className="form-row">
              <TextField
                label="Available days"
                name="availableDays"
                icon={CalendarDays}
                placeholder="e.g. Mon – Fri"
                value={values.availableDays}
                onChange={onChange}
                disabled={saving}
              />
              <TextField
                label="Available timings"
                name="availableTimings"
                icon={Clock}
                placeholder="e.g. 10:00 AM – 2:00 PM"
                value={values.availableTimings}
                onChange={onChange}
                disabled={saving}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  {editing ? "Saving…" : "Adding doctor…"}
                </>
              ) : editing ? (
                <>
                  <Save size={18} aria-hidden="true" />
                  Save changes
                </>
              ) : (
                <>
                  <UserPlus size={18} aria-hidden="true" />
                  Add doctor
                </>
              )}
            </button>
          </form>
        </section>

        <section className="card panel" aria-labelledby="doctor-list-title" aria-busy={listState === "loading"}>
          <div className="panel-head">
            <span className="feature-icon tone-blue" aria-hidden="true">
              <Stethoscope size={20} />
            </span>
            <div>
              <h2 id="doctor-list-title">Registered doctors</h2>
              <p>{listState === "ready" ? `${doctors.length} total` : " "}</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm panel-action"
              onClick={loadDoctors}
              disabled={listState === "loading"}
              aria-label="Refresh list"
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          </div>

          {listState === "loading" && (
            <div className="page-loader" style={{ minHeight: 200 }} role="status">
              <span className="spinner spinner-lg" aria-hidden="true" />
              <span>Loading doctors…</span>
            </div>
          )}

          {listState === "error" && (
            <Alert type="error">
              Couldn’t load doctors.{" "}
              <button type="button" className="text-button" onClick={loadDoctors}>
                Try again
              </button>
            </Alert>
          )}

          {listState === "ready" && doctors.length === 0 && (
            <EmptyState icon={Stethoscope} title="No doctors yet">
              Doctors you add will appear here.
            </EmptyState>
          )}

          {listState === "ready" && doctors.length > 0 && (
            <ul className="doctor-list">
              {doctors.map((d) => (
                <li key={d.id} className={`doctor-item ${editing?.id === d.id ? "is-editing" : ""}`}>
                  <span className="avatar" aria-hidden="true">
                    {initials(d.fullName)}
                  </span>
                  <div className="doctor-info">
                    <div className="doctor-name-row">
                      <strong>{d.fullName || "Unnamed doctor"}</strong>
                      {d.speciality && <span className="badge badge-green">{d.speciality}</span>}
                    </div>
                    <span className="doctor-meta">
                      {[d.qualification, d.experience !== null && d.experience !== "" ? `${d.experience} yrs exp.` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="doctor-meta">
                      {[d.email, d.phone].filter(Boolean).join(" · ")}
                    </span>
                    {(d.availableDays || d.availableTimings) && (
                      <span className="doctor-meta">
                        <Clock size={13} aria-hidden="true" />
                        {[d.availableDays, d.availableTimings].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="doctor-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => startEdit(d)}
                      aria-label={`Edit ${d.fullName}`}
                      title="Edit"
                      disabled={saving || deletingId === d.id}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon btn-icon-danger"
                      onClick={() => onDelete(d)}
                      aria-label={`Delete ${d.fullName}`}
                      title="Delete"
                      disabled={deletingId === d.id}
                    >
                      {deletingId === d.id ? <span className="spinner" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
