'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowLeft, CheckCircle } from 'lucide-react';
import PatientRegistrationForm from '../../../components/PatientRegistrationForm';
import { registerNewPatient, PatientRegistrationData } from '../../../src/lib/patientService';

export default function OutpatientRegisterPage() {
  const router = useRouter();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [patientUHID, setPatientUHID] = useState('');

  const handleRegistrationSubmit = async (data: PatientRegistrationData, previewUHID?: string) => {
    // Set the admission type to outpatient
    const outpatientData = {
      ...data,
      admissionType: 'outpatient'
    };
    
    try {
      const result = await registerNewPatient(outpatientData, previewUHID);
      
      if (result.success) {
        // Show success message instead of redirecting
        setRegistrationSuccess(true);
        setPatientUHID(result.uhid || '');
        // Reset form after 3 seconds and stay on page
        setTimeout(() => {
          setRegistrationSuccess(false);
        }, 5000);
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to register patient: ' + (error as Error).message);
    }
  };

  const handleCancel = () => {
    router.push('/patients');
  };

  const handleViewQueue = () => {
    router.push('/patients');
  };

  const handleRegisterAnother = () => {
    setRegistrationSuccess(false);
    setPatientUHID('');
    // Reload the page to reset the form
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/outpatient" 
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
          >
            <ArrowLeft size={16} />
            Back to Patients
          </Link>
        </div>
        
        {registrationSuccess ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-4">Patient has been registered successfully and added to today's queue.</p>
              {patientUHID && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 inline-block">
                  <p className="text-sm text-gray-500">Patient UHID</p>
                  <p className="font-mono text-lg font-bold text-gray-900">{patientUHID}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleViewQueue}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View All Patients
                </button>
                <button
                  onClick={handleRegisterAnother}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Register Another Patient
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserPlus className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Register New Outpatient</h1>
                  <p className="text-gray-600">Register a new outpatient visit for an existing or new patient</p>
                </div>
              </div>
            </div>
            
            <PatientRegistrationForm
              onSubmit={handleRegistrationSubmit}
              onCancel={handleCancel}
              admissionType="outpatient"
            />
          </>
        )}
      </div>
    </div>
  );
}