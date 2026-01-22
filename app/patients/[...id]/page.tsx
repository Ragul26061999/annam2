import React from 'react';
import PatientDetailsClient from '../[id]/PatientDetailsClient';
import PatientEditClient from './PatientEditClient';

interface PageProps {
  params: Promise<{ id: string[] }>;
}

export default async function CatchAllPatientPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.id;
  
  // Check if the last segment is 'edit' to determine if we should show the edit page
  const isEdit = slug.length > 0 && slug[slug.length - 1] === 'edit';
  
  if (isEdit) {
    // ID is everything except the last 'edit' part
    // For /patients/24-25/3217/edit -> slug=['24-25', '3217', 'edit'] -> id='24-25/3217'
    const patientId = slug.slice(0, -1).map(decodeURIComponent).join('/');
    return <PatientEditClient patientId={patientId} />;
  } else {
    // ID is the whole slug
    // For /patients/24-25/3217 -> slug=['24-25', '3217'] -> id='24-25/3217'
    const patientId = slug.map(decodeURIComponent).join('/');
    return <PatientDetailsClient params={{ id: patientId }} />;
  }
}
