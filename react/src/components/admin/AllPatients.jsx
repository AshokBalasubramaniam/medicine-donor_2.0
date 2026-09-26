import React, { useEffect, useState } from 'react';
import { admingetpatientdetails } from '../../api';
import { PatientsListBase } from './PatientsListBase';

export default function AllPatients() {
  const [patients, setPatients] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const data = await admingetpatientdetails();
        setPatients(Array.isArray(data) ? data.reverse() : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);
  return <PatientsListBase patients={patients} title="All Patients" />;
}
