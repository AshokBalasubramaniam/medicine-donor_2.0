import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminUpdatePatient, getPatientById } from '../../api';
import { confirm, toast } from '../feedback/feedback';

export default function AdminPatientDetails() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPatientById(id);
        setPatient(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [id]);

  if (!patient) return <div style={{ padding: 20 }}>Loading patient...</div>;

  const setStatus = async (approve) => {
    const ok = await confirm(
      approve
        ? {
            title: 'Approve this patient?',
            message: `${patient.name || 'The patient'} will become visible to donors.`,
            confirmText: 'Approve',
            icon: 'approve',
          }
        : {
            title: 'Reject this application?',
            message: `${patient.name || 'This patient'}’s application will be marked as rejected.`,
            confirmText: 'Reject',
            tone: 'danger',
            icon: 'reject',
          }
    );
    if (!ok) return;
    try {
      const formData = new FormData();
      formData.append(approve ? 'approved' : 'rejected', 'true');
      await adminUpdatePatient(null, id, formData);
      setPatient(await getPatientById(id));
      toast.success(
        approve ? 'The patient is now visible to donors.' : 'The application was rejected.',
        approve ? 'Patient approved' : 'Application rejected'
      );
    } catch (e) {
      toast.error(e?.error || 'Please try again.', approve ? 'Couldn’t approve patient' : 'Couldn’t reject application');
    }
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '24px auto',
        padding: 20,
        background: '#fff',
        borderRadius: 12,
      }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Patient Details</h2>
      <div>
        <strong>Name:</strong> {patient.name}
      </div>
      <div>
        <strong>Age:</strong> {patient.age}
      </div>
      <div>
        <strong>Gender:</strong> {patient.sex || patient.gender}
      </div>
      <div style={{ marginTop: 12 }}>
        {!patient.approved && (
          <>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setStatus(true)} style={{ marginRight: 8 }}>
              Approve
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStatus(false)}>Reject</button>
          </>
        )}
      </div>
    </div>
  );
}
