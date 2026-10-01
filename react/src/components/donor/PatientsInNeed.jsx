import React from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import PatientBrowser from './PatientBrowser';

export default function PatientsInNeed() {
  const { patients, loading, error, reload } = useOutletContext();
  const [params] = useSearchParams();
  const q = params.get('q') || '';

  return (
    <div className="dn-content">
      {/* Re-mount when the top-bar search changes so the query is applied. */}
      <PatientBrowser key={q} initialQuery={q} patients={patients} loading={loading} error={error} onRetry={reload} />
    </div>
  );
}
