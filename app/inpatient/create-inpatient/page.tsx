'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Bed, Loader2 } from 'lucide-react';
import InpatientAdmissionForm from '../../../components/InpatientAdmissionForm';

function InpatientRegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams?.get('patientId') || undefined;
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    uhid: string;
    patientName: string;
    qrCode?: string;
    registrationTime?: string;
  } | null>(null);

  const handleRegistrationComplete = (result: { uhid: string; patientName: string; qrCode?: string }) => {
    setRegistrationResult({
      ...result,
      registrationTime: new Date().toLocaleTimeString()
    });
    setRegistrationComplete(true);
  };

  const handleCancel = () => {
    router.push('/inpatient');
  };

  if (registrationComplete && registrationResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/inpatient"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Inpatient Dashboard
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-green-900">Inpatient Admission Complete!</h2>
                <p className="text-sm text-green-700">Patient has been successfully admitted as an Inpatient.</p>
                {registrationResult?.registrationTime && (
                  <p className="text-xs text-green-600 mt-1">Admitted at: {registrationResult.registrationTime}</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-center gap-3">
              <Bed className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-900">
                <strong>Patient UHID:</strong> <span className="font-mono text-lg ml-2">{registrationResult.uhid}</span>
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => router.push('/inpatient')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md shadow-blue-200"
            >
              Go to Inpatient List
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Admit Another Patient
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href="/inpatient"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Inpatient Dashboard
        </Link>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bed className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create IP Admission</h1>
        </div>
        <p className="text-gray-600 ml-11">Convert outpatients to inpatients by creating a new admission</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <InpatientAdmissionForm
          onComplete={handleRegistrationComplete}
          onCancel={handleCancel}
          initialPatientId={initialPatientId}
        />
      </div>
    </div>
  );
}

export default function InpatientRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <InpatientRegisterPageContent />
    </Suspense>
  );
}