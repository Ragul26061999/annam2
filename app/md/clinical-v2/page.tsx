'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import ClinicalEntryForm2 from '../../../components/ClinicalEntryForm2';
import { supabase } from '../../../src/lib/supabase';

export default function ClinicalV2Page() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);

  const appointmentId = params?.appointmentId as string;
  const patientId = params?.patientId as string;

  useEffect(() => {
    if (appointmentId && patientId) {
      loadAppointmentData();
    }
  }, [appointmentId, patientId]);

  const loadAppointmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get appointment details with patient and doctor info
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointment')
        .select(`
          *,
          encounter!inner(
            *,
            patient!inner(
              id,
              patient_id,
              name,
              date_of_birth,
              gender,
              phone
            ),
            doctor!inner(
              id,
              name,
              specialization
            )
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError) {
        throw appointmentError;
      }

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      setAppointmentData(appointment);
    } catch (err: any) {
      console.error('Error loading appointment data:', err);
      setError(err.message || 'Failed to load appointment data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading clinical data...</p>
        </div>
      </div>
    );
  }

  if (error || !appointmentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Appointment not found'}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white text-gray-600 hover:text-gray-900 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clinical 2.0</h1>
              <p className="text-sm text-gray-600">
                {appointmentData.encounter?.patient?.name} - {appointmentData.encounter?.patient?.patient_id}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ClinicalEntryForm2
          isOpen={true}
          onClose={() => router.back()}
          appointmentId={appointmentId}
          encounterId={appointmentData.encounter_id}
          patientId={patientId}
          doctorId={appointmentData.encounter?.doctor?.id}
          patientName={appointmentData.encounter?.patient?.name || 'Unknown Patient'}
          patientUHID={appointmentData.encounter?.patient?.patient_id || 'N/A'}
          onSuccess={() => {
            // Optional: Handle success, maybe show a success message
            console.log('Clinical entry saved successfully');
          }}
        />
      </div>
    </div>
  );
}
