'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import RestructuredPatientRegistrationForm from '../../../components/RestructuredPatientRegistrationForm';
import PatientRegistrationLabel from '../../../components/PatientRegistrationLabel';
import { CheckCircle } from 'lucide-react';

export default function EnhancedPatientRegisterPage() {
  const router = useRouter();
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
    router.push('/patients');
  };

  if (registrationComplete && registrationResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-green-900">Registration & Appointment Complete!</h2>
                <p className="text-sm text-green-700">Patient registered and appointment scheduled successfully</p>
                {registrationResult?.registrationTime && (
                  <p className="text-xs text-green-600 mt-1">Registered at: {registrationResult.registrationTime}</p>
                )}
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-900">
                <strong>Patient UHID:</strong> <span className="font-mono text-lg">{registrationResult.uhid}</span>
              </p>
            </div>
          </div>

          {/* Print Label Section */}
          <div id="patient-label-section">
            <PatientRegistrationLabel
              uhid={registrationResult.uhid}
              patientName={registrationResult.patientName}
              dateOfVisit={new Date().toISOString()}
              qrCode={registrationResult.qrCode}
            />
          </div>

          <div className="mt-6 flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => {
                const printContent = document.getElementById('patient-label-section');
                if (printContent) {
                  const printWindow = window.open('', '', 'width=800,height=600');
                  if (printWindow) {
                    printWindow.document.write('<html><head><title>Patient Slip</title>');
                    printWindow.document.write('<style>body { font-family: Arial, sans-serif; padding: 20px; }</style>');
                    printWindow.document.write('</head><body>');
                    printWindow.document.write(printContent.innerHTML);
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    printWindow.print();
                  }
                }
              }}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Patient Slip
            </button>
            <button
              onClick={() => router.push('/patients')}
              className="btn-primary"
            >
              View All Patients
            </button>
            <button
              onClick={() => router.push(`/patients/${registrationResult.uhid}`)}
              className="btn-secondary"
            >
              View Patient Record
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              Register Another Patient
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <RestructuredPatientRegistrationForm
        onComplete={handleRegistrationComplete}
        onCancel={handleCancel}
        admissionType="outpatient"
      />
    </div>
  );
}
