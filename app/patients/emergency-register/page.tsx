'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import EmergencyPatientRegistrationForm from '../../../components/EmergencyPatientRegistrationForm';
import { registerNewPatient, PatientRegistrationData } from '../../../src/lib/patientService';
import { CheckCircle, AlertCircle, Copy, Eye, EyeOff, AlertTriangle } from 'lucide-react';

// Interface for emergency patient data
interface EmergencyPatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  primaryComplaint: string;
  allergies?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  admissionType: string;
  admissionDate: string;
  admissionTime: string;
}

export default function EmergencyPatientRegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean;
    uhid?: string;
    patient?: any;
    credentials?: { email: string; password: string };
    error?: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Convert emergency data to full registration data
  const convertToFullRegistrationData = (emergencyData: EmergencyPatientData): PatientRegistrationData => {
    return {
      firstName: emergencyData.firstName,
      lastName: emergencyData.lastName,
      dateOfBirth: emergencyData.dateOfBirth,
      age: '', // Will be calculated later if needed
      diagnosis: '', // Will be added later by medical staff
      gender: emergencyData.gender,
      phone: emergencyData.phone,
      address: emergencyData.address,
      primaryComplaint: emergencyData.primaryComplaint,
      admissionType: emergencyData.admissionType,
      admissionDate: emergencyData.admissionDate,
      admissionTime: emergencyData.admissionTime,
      
      // Optional fields from emergency form
      allergies: emergencyData.allergies || '',
      bloodGroup: emergencyData.bloodGroup || '',
      emergencyContactName: emergencyData.emergencyContactName || '',
      emergencyContactPhone: emergencyData.emergencyContactPhone || '',
      emergencyContactRelationship: emergencyData.emergencyContactRelationship || '',
      
      // Default/empty values for fields not collected in emergency registration
      maritalStatus: '',
      email: '',
      medicalHistory: '',
      currentMedications: '',
      chronicConditions: '',
      previousSurgeries: '',
      referringDoctorFacility: '',
      consultingDoctorName: '',
      consultingDoctorId: '',
      departmentWard: '',
      roomNumber: '',
      guardianName: '',
      guardianRelationship: '',
      guardianPhone: '',
      guardianAddress: '',
      insuranceProvider: '',
      insuranceNumber: '',
      initialSymptoms: '',
      referredBy: ''
    };
  };

  const handleEmergencyRegistrationSubmit = async (data: EmergencyPatientData, previewUHID?: string) => {
    setIsLoading(true);
    
    try {
      // Convert emergency data to full registration format
      const fullRegistrationData = convertToFullRegistrationData(data);
      
      const result = await registerNewPatient(fullRegistrationData, previewUHID);
      setRegistrationResult(result);
      
      if (result.success) {
        // Auto-hide success message after 8 seconds and redirect for emergency cases
        setTimeout(() => {
          router.push('/patients');
        }, 8000);
      }
    } catch (error) {
      console.error('Emergency registration error:', error);
      setRegistrationResult({
        success: false,
        error: 'An unexpected error occurred during emergency registration'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/patients');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderSuccessResult = () => {
    if (!registrationResult?.success || !registrationResult.uhid || !registrationResult.credentials) {
      return null;
    }

    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-900">Emergency Patient Registration Successful!</h2>
              <p className="text-sm text-green-700">Patient has been registered for emergency care</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* UHID Information */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Emergency Patient UHID
            </h3>
            <div className="flex items-center gap-2">
              <div className="bg-white px-4 py-2 rounded-lg border border-red-300 font-mono text-lg font-bold text-red-900 flex-1">
                {registrationResult.uhid}
              </div>
              <button
                onClick={() => copyToClipboard(registrationResult.uhid!)}
                className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                title="Copy UHID"
              >
                <Copy className="h-4 w-4 text-red-600" />
              </button>
            </div>
            <p className="text-sm text-red-700 mt-2">
              This UHID is for emergency care. Additional information can be updated later.
            </p>
          </div>

          {/* Login Credentials */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Patient Portal Login Credentials</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Email Address</label>
                <div className="flex items-center gap-2">
                  <div className="bg-white px-3 py-2 rounded-lg border border-blue-300 font-mono text-sm flex-1">
                    {registrationResult.credentials.email}
                  </div>
                  <button
                    onClick={() => copyToClipboard(registrationResult.credentials!.email)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                    title="Copy Email"
                  >
                    <Copy className="h-4 w-4 text-blue-600" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Temporary Password</label>
                <div className="flex items-center gap-2">
                  <div className="bg-white px-3 py-2 rounded-lg border border-blue-300 font-mono text-sm flex-1">
                    {showPassword ? registrationResult.credentials.password : '••••••••••••'}
                  </div>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-blue-600" /> : <Eye className="h-4 w-4 text-blue-600" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(registrationResult.credentials!.password)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                    title="Copy Password"
                  >
                    <Copy className="h-4 w-4 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Please provide these credentials to the patient or their emergency contact. 
                The patient should change the password upon first login.
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-900 mb-3">Next Steps for Emergency Care</h3>
            <ul className="text-sm text-orange-800 space-y-2">
              <li>• Patient can now be admitted for emergency treatment</li>
              <li>• Additional medical information can be collected during treatment</li>
              <li>• Insurance and detailed medical history can be updated later</li>
              <li>• Emergency contact has been notified if provided</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/patients/${registrationResult.patient?.id || registrationResult.uhid}`)}
              className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
            >
              View Patient Details
            </button>
            <button
              onClick={() => router.push('/patients')}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Patients
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderErrorResult = () => {
    if (!registrationResult || registrationResult.success) {
      return null;
    }

    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-red-200">
        <div className="p-6 border-b border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-red-900">Emergency Registration Failed</h2>
              <p className="text-sm text-red-700">There was an error during the registration process</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
            <p className="text-red-800">{registrationResult.error}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setRegistrationResult(null)}
              className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/patients')}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show result screens if registration is complete
  if (registrationResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {registrationResult.success ? renderSuccessResult() : renderErrorResult()}
        </div>
      </div>
    );
  }

  // Show the emergency registration form
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <EmergencyPatientRegistrationForm
          onSubmit={handleEmergencyRegistrationSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}