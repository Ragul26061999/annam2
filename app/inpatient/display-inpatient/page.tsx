'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowLeft, Bed } from 'lucide-react';
import PatientRegistrationForm from '../../../components/PatientRegistrationForm';
import { registerNewPatient, PatientRegistrationData } from '../../../src/lib/patientService';

export default function InpatientRegisterPage() {
  const router = useRouter();

  const handleRegistrationSubmit = async (data: PatientRegistrationData, previewUHID?: string) => {
    // Set the admission type to inpatient
    const inpatientData = {
      ...data,
      admissionType: 'inpatient'
    };
    
    try {
      const result = await registerNewPatient(inpatientData, previewUHID);
      
      if (result.success) {
        // Redirect to patients list after successful registration
        router.push('/patients');
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/inpatient" 
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
          >
            <ArrowLeft size={16} />
            Back to Patients
          </Link>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bed className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Register New Inpatient</h1>
              <p className="text-gray-600">Register a new inpatient admission for an existing or new patient</p>
            </div>
          </div>
        </div>
        
        <PatientRegistrationForm
          onSubmit={handleRegistrationSubmit}
          onCancel={handleCancel}
          admissionType="inpatient"
        />
      </div>
    </div>
  );
}