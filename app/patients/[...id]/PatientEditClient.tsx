'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import PatientEditForm from '../../../components/PatientEditForm';
import { getPatientWithRelatedData } from '../../../src/lib/patientService';

interface Patient {
  patient_id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus?: string;
  phone: string;
  email?: string;
  address: string;
  bloodGroup: string;
  allergies: string;
  medicalHistory: string;
  currentMedications: string;
  chronicConditions: string;
  previousSurgeries: string;
  admissionDate?: string;
  admissionTime?: string;
  primaryComplaint: string;
  admissionType: string;
  referringDoctorFacility?: string;
  consultingDoctorId?: string;
  consultingDoctorName?: string;
  departmentWard?: string;
  roomNumber?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  initialSymptoms?: string;
  referredBy?: string;
}

interface PatientEditClientProps {
  patientId: string;
}

export default function PatientEditClient({ patientId }: PatientEditClientProps) {
  const router = useRouter();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const patientData = await getPatientWithRelatedData(patientId);
        
        if (!patientData) {
          setError('Patient not found');
          return;
        }
        
        setPatient(patientData);
      } catch (err) {
        console.error('Error fetching patient:', err);
        setError('Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  const handleSave = async (updatedData: Partial<Patient>) => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update patient');
      }

      const result = await response.json();
      
      // Show success message (you can implement a toast notification here)
      alert('Patient updated successfully!');
      
      // Redirect back to patient details
      // Use encoded patientId if it contains slashes? 
      // Router.push handles strings. If patientId is '24-25/3217', it should work if the route captures it.
      router.push(`/patients/${patientId}`);
    } catch (err) {
      console.error('Error updating patient:', err);
      alert(`Failed to update patient: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/patients/${patientId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error || 'Patient not found'}
          </div>
          <button
            onClick={() => router.push('/patients')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCancel}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Patient Details
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">
                Edit Patient: {patient.firstName} {patient.lastName}
              </h1>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {patient.patient_id}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PatientEditForm
          patient={patient}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={saving}
        />
      </div>
    </div>
  );
}
