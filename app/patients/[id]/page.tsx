import PatientDetailsClient from './PatientDetailsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailsPage({ params }: PageProps) {
  const resolvedParams = await params;
  
  return <PatientDetailsClient params={resolvedParams} />;
}