'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PatientRegistrationForm from '../../../components/PatientRegistrationForm';
import { registerNewPatient, PatientRegistrationData } from '../../../src/lib/patientService';
import { CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';

export default function PatientRegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean;
    uhid?: string;
    credentials?: { email: string; password: string };
    error?: string;
    registrationTime?: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegistrationSubmit = async (data: PatientRegistrationData, previewUHID?: string) => {
    setIsLoading(true);
    
    try {
      const result = await registerNewPatient(data, previewUHID);
      
      // Get current time for display
      const currentTime = new Date().toLocaleTimeString();
      
      setRegistrationResult({
        ...result,
        registrationTime: currentTime
      });
      
      if (result.success) {
        // Auto-hide success message after 10 seconds and redirect
        setTimeout(() => {
          router.push('/patients');
        }, 10000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setRegistrationResult({
        success: false,
        error: 'An unexpected error occurred during registration',
        registrationTime: new Date().toLocaleTimeString()
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
              <h2 className="text-xl font-semibold text-green-900">Patient Registration Successful!</h2>
              <p className="text-sm text-green-700">New patient has been registered successfully</p>
              {registrationResult?.registrationTime && (
                <p className="text-xs text-green-600 mt-1">Registered at: {registrationResult.registrationTime}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* UHID Information */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-900 mb-3">Patient UHID (Unique Hospital ID)</h3>
            <div className="flex items-center gap-2">
              <div className="bg-white px-4 py-2 rounded-lg border border-orange-300 font-mono text-lg font-bold text-orange-900 flex-1">
                {registrationResult.uhid}
              </div>
              <button
                onClick={() => copyToClipboard(registrationResult.uhid!)}
                className="p-2 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors"
                title="Copy UHID"
              >
                <Copy className="h-4 w-4 text-orange-600" />
              </button>
            </div>
            <p className="text-sm text-orange-700 mt-2">
              This UHID will be used for all future appointments and medical records.
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
                <label className="block text-sm font-medium text-blue-700 mb-1">Password</label>
                <div className="flex items-center gap-2">
                  <div className="bg-white px-3 py-2 rounded-lg border border-blue-300 font-mono text-sm flex-1">
                    {showPassword ? registrationResult.credentials.password : '••••••••'}
                  </div>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    {showPassword ? 
                      <EyeOff className="h-4 w-4 text-blue-600" /> : 
                      <Eye className="h-4 w-4 text-blue-600" />
                    }
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
            
            <p className="text-sm text-blue-700 mt-3">
              Please provide these credentials to the patient for accessing their patient portal.
            </p>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-900 mb-2">Important Notes</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• The patient can now log in to the patient portal using the credentials above</li>
              <li>• The UHID will be used for all medical records and appointments</li>
              <li>• Please advise the patient to keep their login credentials secure</li>
              <li>• The patient can change their password after first login if needed</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => router.push('/patients')}
              className="btn-primary flex-1"
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
  };

  const renderErrorResult = () => {
    if (!registrationResult?.error) return null;

    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-red-200">
        <div className="p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-red-900">Registration Failed</h2>
              <p className="text-sm text-red-700">There was an error registering the patient</p>
              {registrationResult?.registrationTime && (
                <p className="text-xs text-red-600 mt-1">Attempted at: {registrationResult.registrationTime}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{registrationResult.error}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setRegistrationResult(null)}
              className="btn-primary"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/patients')}
              className="btn-secondary"
            >
              Back to Patients
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {registrationResult ? (
        registrationResult.success ? renderSuccessResult() : renderErrorResult()
      ) : (
        <PatientRegistrationForm
          onSubmit={handleRegistrationSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          admissionType="outpatient"
        />
      )}
    </div>
  );
} 