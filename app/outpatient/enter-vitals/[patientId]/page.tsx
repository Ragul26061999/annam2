'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Activity,
  Save,
  Loader2,
  User,
  Phone,
  AlertCircle,
  CheckCircle,
  ScanBarcode
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../../src/lib/supabase';
import { updateQueueStatus } from '../../../../src/lib/outpatientQueueService';
import { generateBarcodeForPatient, generatePrintableBarcodeData } from '../../../../src/lib/barcodeUtils';
import StaffSelect from '../../../../src/components/StaffSelect';

export default function EnterVitalsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params?.patientId as string;
  const queueId = searchParams?.get('queueId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [vitalsData, setVitalsData] = useState({
    height: '',
    weight: '',
    bmi: '',
    temperature: '',
    tempUnit: 'fahrenheit',
    bpSystolic: '',
    bpDiastolic: '',
    pulse: '',
    spo2: '',
    respiratoryRate: '',
    randomBloodSugar: '',
    vitalNotes: '',
    staffId: ''
  });

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);


  // Auto-calculate BMI
  useEffect(() => {
    const h = parseFloat(vitalsData.height) / 100; // cm to m
    const w = parseFloat(vitalsData.weight);
    if (h > 0 && w > 0) {
      const bmi = (w / (h * h)).toFixed(1);
      setVitalsData(prev => ({ ...prev, bmi }));
    } else {
      setVitalsData(prev => ({ ...prev, bmi: '' }));
    }
  }, [vitalsData.height, vitalsData.weight]);


  const loadPatientData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;

      setPatient(data);

      // Pre-fill any existing data
      if (data) {
        setVitalsData(prev => ({
          ...prev,
          height: data.height || '',
          weight: data.weight || '',
          bmi: data.bmi || '',
          temperature: data.temperature || '',
          tempUnit: data.temp_unit || 'fahrenheit',
          bpSystolic: data.bp_systolic || '',
          bpDiastolic: data.bp_diastolic || '',
          pulse: data.pulse || '',
          spo2: data.spo2 || '',
          respiratoryRate: data.respiratory_rate || '',
          randomBloodSugar: data.random_blood_sugar || ''
        }));
      }
    } catch (err) {
      console.error('Error loading patient:', err);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVitalsData(prev => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const toNumberOrNull = (v: string) => {
        const trimmed = (v ?? '').toString().trim();
        if (!trimmed) return null;
        const n = Number(trimmed);
        return Number.isFinite(n) ? n : null;
      };

      const toIntOrNull = (v: string) => {
        const n = toNumberOrNull(v);
        return n === null ? null : Math.trunc(n);
      };

      // Update patient record with vitals
      const vitalsUpdate = {
        height: toNumberOrNull(vitalsData.height),
        weight: toNumberOrNull(vitalsData.weight),
        bmi: toNumberOrNull(vitalsData.bmi),
        temperature: toNumberOrNull(vitalsData.temperature),
        temp_unit: vitalsData.tempUnit,
        bp_systolic: toIntOrNull(vitalsData.bpSystolic),
        bp_diastolic: toIntOrNull(vitalsData.bpDiastolic),
        pulse: toIntOrNull(vitalsData.pulse),
        spo2: toIntOrNull(vitalsData.spo2),
        respiratory_rate: toIntOrNull(vitalsData.respiratoryRate),
        random_blood_sugar: vitalsData.randomBloodSugar ? vitalsData.randomBloodSugar : null,
        vital_notes: vitalsData.vitalNotes ? vitalsData.vitalNotes : null,
        registration_status: 'completed',
        vitals_completed_at: new Date().toISOString(),
        staff_id: vitalsData.staffId || null
      };

      const { error: updateError } = await supabase
        .from('patients')
        .update(vitalsUpdate)
        .eq('id', patientId);

      if (updateError) throw updateError;

      // Update queue status if queueId is provided
      if (queueId) {
        await updateQueueStatus(queueId, 'completed', vitalsData.staffId);
      }

      // Update patient's appointment status to move them to Today's OP Queue
      try {
        const { data: appointments, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', patientId)
          .eq('appointment_date', new Date().toISOString().split('T')[0])
          .in('status', ['scheduled', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (!appointmentError && appointments && appointments.length > 0) {
          const appointment = appointments[0];
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ 
              status: 'in_progress',
              updated_at: new Date().toISOString()
            })
            .eq('id', appointment.id);

          if (updateError) {
            console.warn('Failed to update appointment status:', updateError);
          } else {
            console.log('Updated appointment status to in_progress:', appointment.id);
          }
        }
      } catch (appointmentUpdateError) {
        console.warn('Error updating appointment status:', appointmentUpdateError);
        // Don't fail the vitals save if appointment update fails
      }

      setSuccess(true);

      // Redirect after 2 seconds
      // setTimeout(() => {
      //   router.push('/outpatient?vitals=completed');
      // }, 2000);
    } catch (err) {
      console.error('Error saving vitals:', err);
      console.error('Error type:', typeof err);
      console.error('Error keys:', err ? Object.keys(err) : 'null');
      console.error('Error stringified:', JSON.stringify(err, null, 2));
      
      const errorMessage = 
        typeof err === 'string' ? err :
        (err as any)?.message || 
        (err as any)?.error_description || 
        (err as any)?.hint || 
        String(err);
      
      setError(`Failed to save vitals: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }


  const handlePrintBarcode = async () => {
    if (!patient) return;

    try {
      const uhid = patient.patient_id || 'UNKNOWN';
      const patientName = patient.name || 'Unknown Patient';
      
      const barcodeId = await generateBarcodeForPatient(patientId);
      
      const printData = generatePrintableBarcodeData(uhid, barcodeId, patientName);
      
      const printWindow = window.open('', '_blank', 'width=600,height=400');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Patient Barcode - ${patientName}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
                @media print {
                  body { margin: 0; padding: 0; display: block; }
                  .print-container { page-break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                ${printData}
              </div>
              <script>
                window.onload = function() {
                  window.print();
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Error printing barcode:', err);
      alert('Failed to generate barcode for printing');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-orange-50/30 py-8 px-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vitals Saved Successfully!</h2>
          <p className="text-gray-600 mb-6">Patient vitals have been recorded.</p>

          <button
            onClick={handlePrintBarcode}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg mb-4"
          >
            <ScanBarcode className="h-5 w-5" />
            <span>Print Barcode for UHID</span>
          </button>

          <button
             onClick={() => router.push('/outpatient?vitals=completed')}
             className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-colors"
          >
             Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50/30 py-8 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/outpatient"
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Outpatient Queue
          </Link>
        </div>

        {/* Patient Info Card */}
        {patient && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              Patient Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold text-gray-900">{patient.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">UHID</p>
                <p className="font-mono font-semibold text-orange-600">{patient.patient_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="text-gray-900">{patient.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age / Gender</p>
                <p className="text-gray-900">{patient.age || 'N/A'} yrs / {patient.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registration Date</p>
                <p className="text-gray-900">{new Date(patient.created_at).toLocaleDateString()}</p>
              </div>
              {patient.primary_complaint && (
                <div className="md:col-span-3">
                  <p className="text-sm text-gray-500">Primary Complaint</p>
                  <p className="text-gray-900">{patient.primary_complaint}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vitals Entry Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-6 text-white rounded-t-xl">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Enter Patient Vitals & Complete Registration
            </h1>
            <p className="text-white/80 text-sm mt-1">Fill in the vital signs and consultation details</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Vitals Section */}
            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
              <h3 className="text-sm font-bold text-blue-800 mb-6 flex items-center gap-2">
                <Activity size={18} />
                Vital Signs & Measurements
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={vitalsData.height}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="170"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={vitalsData.weight}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="70"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">BMI (Auto)</label>
                  <input
                    type="text"
                    value={vitalsData.bmi}
                    readOnly
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700"
                    placeholder="--"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Temperature</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      name="temperature"
                      value={vitalsData.temperature}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      placeholder="98.6"
                    />
                    <select
                      name="tempUnit"
                      value={vitalsData.tempUnit}
                      onChange={handleInputChange}
                      className="px-2 py-2 border border-blue-200 rounded-lg text-sm"
                    >
                      <option value="fahrenheit">°F</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">BP Systolic</label>
                  <input
                    type="number"
                    name="bpSystolic"
                    value={vitalsData.bpSystolic}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="120"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">BP Diastolic</label>
                  <input
                    type="number"
                    name="bpDiastolic"
                    value={vitalsData.bpDiastolic}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="80"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Pulse (bpm)</label>
                  <input
                    type="number"
                    name="pulse"
                    value={vitalsData.pulse}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="72"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">SpO2 (%)</label>
                  <input
                    type="number"
                    name="spo2"
                    value={vitalsData.spo2}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="98"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Respiratory Rate</label>
                  <input
                    type="number"
                    name="respiratoryRate"
                    value={vitalsData.respiratoryRate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="16"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    name="randomBloodSugar"
                    value={vitalsData.randomBloodSugar}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Vital Notes</label>
                <textarea
                  name="vitalNotes"
                  value={vitalsData.vitalNotes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  placeholder="Any observations or notes about vitals..."
                />
              </div>
            </div>




            {/* Staff Selection */}
            <div>
              <StaffSelect
                value={vitalsData.staffId}
                onChange={(staffId) => setVitalsData(prev => ({ ...prev, staffId }))}
                label="Staff Member (Optional)"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4 border-t">
              <Link href="/outpatient">
                <button
                  type="button"
                  className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Vitals & Complete</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
