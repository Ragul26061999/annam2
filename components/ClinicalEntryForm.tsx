'use client';
import React, { useState } from 'react';
import {
  X,
  FileText,
  Scan,
  Pill,
  Calendar,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';

interface ClinicalEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  patientUHID: string;
  onSuccess?: () => void;
}

type TabType = 'notes' | 'scans' | 'prescriptions' | 'followup';

interface ScanOrder {
  id?: string;
  scan_type: string;
  scan_name: string;
  body_part: string;
  urgency: 'routine' | 'urgent' | 'stat' | 'emergency';
  clinical_indication: string;
  special_instructions: string;
}

interface PrescriptionOrder {
  medication_id: string;
  medication_name: string;
  generic_name: string;
  dosage: string;
  form: string;
  route: string;
  frequency_times: string[];
  duration: string;
  quantity: number;
  instructions: string;
  food_instructions: string;
}

export default function ClinicalEntryFormNew({
  isOpen,
  onClose,
  appointmentId,
  encounterId,
  patientId,
  doctorId,
  patientName,
  patientUHID,
  onSuccess
}: ClinicalEntryFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clinical Notes State
  const [clinicalNotes, setClinicalNotes] = useState({
    chief_complaint: '',
    history_of_present_illness: '',
    physical_examination: '',
    assessment: '',
    plan: '',
    doctor_notes: ''
  });

  // Scans State
  const [scans, setScans] = useState<ScanOrder[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanOrder>({
    scan_type: '',
    scan_name: '',
    body_part: '',
    urgency: 'routine',
    clinical_indication: '',
    special_instructions: ''
  });

  // Prescriptions State
  const [prescriptions, setPrescriptions] = useState<PrescriptionOrder[]>([]);
  const [currentPrescription, setCurrentPrescription] = useState<PrescriptionOrder>({
    medication_id: '',
    medication_name: '',
    generic_name: '',
    dosage: '',
    form: 'tablet',
    route: 'oral',
    frequency_times: [],
    duration: '',
    quantity: 0,
    instructions: '',
    food_instructions: ''
  });

  // Follow-up State
  const [followUp, setFollowUp] = useState({
    follow_up_date: '',
    follow_up_time: '',
    reason: '',
    instructions: '',
    priority: 'routine' as 'routine' | 'important' | 'urgent'
  });

  // Medications list
  const [medications, setMedications] = useState<any[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);

  const tabs = [
    { id: 'notes' as TabType, label: 'Clinical Notes', icon: FileText },
    { id: 'scans' as TabType, label: 'Scans & Imaging', icon: Scan },
    { id: 'prescriptions' as TabType, label: 'Prescriptions', icon: Pill },
    { id: 'followup' as TabType, label: 'Follow-up', icon: Calendar }
  ];

  React.useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    setLoadingMedications(true);
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (!error && data) {
        setMedications(data);
      }
    } catch (err) {
      console.error('Error loading medications:', err);
    } finally {
      setLoadingMedications(false);
    }
  };

  const handleAddScan = () => {
    if (currentScan.scan_type && currentScan.scan_name && currentScan.clinical_indication) {
      setScans([...scans, currentScan]);
      setCurrentScan({
        scan_type: '',
        scan_name: '',
        body_part: '',
        urgency: 'routine',
        clinical_indication: '',
        special_instructions: ''
      });
    }
  };

  const handleAddPrescription = () => {
    if (currentPrescription.medication_id && currentPrescription.dosage && currentPrescription.frequency_times.length > 0) {
      setPrescriptions([...prescriptions, currentPrescription]);
      setCurrentPrescription({
        medication_id: '',
        medication_name: '',
        generic_name: '',
        dosage: '',
        form: 'tablet',
        route: 'oral',
        frequency_times: [],
        duration: '',
        quantity: 0,
        instructions: '',
        food_instructions: ''
      });
    }
  };

  const handleMedicationSelect = (medicationId: string) => {
    const medication = medications.find(m => m.id === medicationId);
    if (medication) {
      setCurrentPrescription({
        ...currentPrescription,
        medication_id: medication.id,
        medication_name: medication.name,
        generic_name: medication.generic_name || '',
        form: medication.dosage_form || 'tablet'
      });
    }
  };

  const toggleFrequencyTime = (time: string) => {
    const times = currentPrescription.frequency_times;
    if (times.includes(time)) {
      setCurrentPrescription({
        ...currentPrescription,
        frequency_times: times.filter(t => t !== time)
      });
    } else {
      setCurrentPrescription({
        ...currentPrescription,
        frequency_times: [...times, time]
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save Clinical Notes
      if (clinicalNotes.doctor_notes) {
        const { error: notesError } = await supabase
          .from('clinical_notes')
          .insert([{
            encounter_id: encounterId,
            appointment_id: appointmentId,
            doctor_id: doctorId,
            patient_id: patientId,
            ...clinicalNotes
          }]);

        if (notesError) throw notesError;
      }

      // Save X-ray/Scan Orders
      if (scans.length > 0) {
        const scanRecords = scans.map(scan => ({
          encounter_id: encounterId,
          appointment_id: appointmentId,
          patient_id: patientId,
          doctor_id: doctorId,
          ...scan
        }));

        const { error: scansError } = await supabase
          .from('xray_orders')
          .insert(scanRecords);

        if (scansError) throw scansError;
      }

      // Save Prescriptions
      if (prescriptions.length > 0) {
        const prescriptionRecords = prescriptions.map(prescription => ({
          encounter_id: encounterId,
          appointment_id: appointmentId,
          patient_id: patientId,
          doctor_id: doctorId,
          status: 'pending',
          ...prescription
        }));

        const { error: prescriptionsError } = await supabase
          .from('prescription_orders')
          .insert(prescriptionRecords);

        if (prescriptionsError) throw prescriptionsError;
      }

      // Save Follow-up
      if (followUp.follow_up_date && followUp.reason) {
        const { error: followUpError } = await supabase
          .from('follow_up_appointments')
          .insert([{
            encounter_id: encounterId,
            appointment_id: appointmentId,
            patient_id: patientId,
            doctor_id: doctorId,
            ...followUp
          }]);

        if (followUpError) throw followUpError;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error saving clinical data:', err);
      setError(err.message || 'Failed to save clinical data');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-teal-500 flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Clinical Entry Form</h2>
              <p className="text-sm text-gray-600">Patient: {patientName} • ID: {patientUHID}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-gray-50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-teal-500 text-teal-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Clinical Notes Tab */}
          {activeTab === 'notes' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <FileText className="h-5 w-5 text-teal-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Clinical Assessment</h3>
                  <p className="text-sm text-gray-500">Add required diagnostics for clinical analysis</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chief Complaint
                    </label>
                    <input
                      type="text"
                      value={clinicalNotes.chief_complaint}
                      onChange={(e) => setClinicalNotes({ ...clinicalNotes, chief_complaint: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      placeholder="Main reason for visit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      History of Present Illness
                    </label>
                    <textarea
                      value={clinicalNotes.history_of_present_illness}
                      onChange={(e) => setClinicalNotes({ ...clinicalNotes, history_of_present_illness: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      placeholder="Detailed history of the current illness"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Physical Examination
                    </label>
                    <textarea
                      value={clinicalNotes.physical_examination}
                      onChange={(e) => setClinicalNotes({ ...clinicalNotes, physical_examination: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      placeholder="Physical examination findings"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assessment
                    </label>
                    <textarea
                      value={clinicalNotes.assessment}
                      onChange={(e) => setClinicalNotes({ ...clinicalNotes, assessment: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      placeholder="Clinical assessment"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Treatment Plan
                    </label>
                    <textarea
                      value={clinicalNotes.plan}
                      onChange={(e) => setClinicalNotes({ ...clinicalNotes, plan: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      placeholder="Treatment plan and recommendations"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comprehensive Doctor Notes <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={clinicalNotes.doctor_notes}
                      onChange={(e) => setClinicalNotes({ ...clinicalNotes, doctor_notes: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      placeholder="Detailed clinical notes including diagnosis, observations, and any additional information (required)"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scans & Imaging Tab */}
          {activeTab === 'scans' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-teal-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Radiological Procedures</h3>
                      <p className="text-sm text-gray-500">Select modality and body regions</p>
                    </div>
                  </div>
                  <button
                    onClick={handleAddScan}
                    disabled={!currentScan.scan_type || !currentScan.scan_name || !currentScan.clinical_indication}
                    className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={18} />
                    <span>Add Scan</span>
                  </button>
                </div>

                <div className="bg-teal-50 rounded-xl p-6 space-y-4 border border-teal-100">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                        Procedure Name
                      </label>
                      <input
                        type="text"
                        value={currentScan.scan_name}
                        onChange={(e) => setCurrentScan({ ...currentScan, scan_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                        placeholder="Choose scan..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                        Modality
                      </label>
                      <select
                        value={currentScan.scan_type}
                        onChange={(e) => setCurrentScan({ ...currentScan, scan_type: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      >
                        <option value="">Select type</option>
                        <option value="X-Ray">X-Ray</option>
                        <option value="CT Scan">CT Scan</option>
                        <option value="MRI">MRI</option>
                        <option value="Ultrasound">Ultrasound</option>
                        <option value="PET Scan">PET Scan</option>
                        <option value="Mammography">Mammography</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                        Urgency
                      </label>
                      <select
                        value={currentScan.urgency}
                        onChange={(e) => setCurrentScan({ ...currentScan, urgency: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                      Specific Region / View Details
                    </label>
                    <input
                      type="text"
                      value={currentScan.body_part}
                      onChange={(e) => setCurrentScan({ ...currentScan, body_part: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      placeholder="E.g. AP & LATERAL, OBLIQUE VIEW, CONTRAST REQUIRED"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clinical Indication
                    </label>
                    <textarea
                      value={currentScan.clinical_indication}
                      onChange={(e) => setCurrentScan({ ...currentScan, clinical_indication: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      placeholder="Reason for scan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Instructions
                    </label>
                    <textarea
                      value={currentScan.special_instructions}
                      onChange={(e) => setCurrentScan({ ...currentScan, special_instructions: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      placeholder="Any special instructions"
                    />
                  </div>
                </div>
              </div>

              {/* Ordered Scans List */}
              {scans.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Ordered Scans ({scans.length})</h3>
                  {scans.map((scan, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{scan.scan_name}</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700 uppercase">
                            {scan.scan_type}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            scan.urgency === 'emergency' ? 'bg-red-100 text-red-700' :
                            scan.urgency === 'stat' ? 'bg-orange-100 text-orange-700' :
                            scan.urgency === 'urgent' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {scan.urgency}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{scan.body_part}</p>
                        <p className="text-sm text-gray-500 mt-1">{scan.clinical_indication}</p>
                      </div>
                      <button
                        onClick={() => setScans(scans.filter((_, i) => i !== index))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Prescribed Medications</h3>
                    <p className="text-sm text-gray-500">Patient: {patientName} • ID: {patientUHID}</p>
                  </div>
                  <button
                    onClick={handleAddPrescription}
                    disabled={!currentPrescription.medication_id || !currentPrescription.dosage || currentPrescription.frequency_times.length === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={18} />
                    <span>Add Medication</span>
                  </button>
                </div>

                {/* Current Medication Form */}
                {currentPrescription.medication_id && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{currentPrescription.medication_name}</h4>
                        {currentPrescription.generic_name && (
                          <p className="text-sm text-gray-600">{currentPrescription.generic_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setCurrentPrescription({
                          medication_id: '',
                          medication_name: '',
                          generic_name: '',
                          dosage: '',
                          form: 'tablet',
                          route: 'oral',
                          frequency_times: [],
                          duration: '',
                          quantity: 0,
                          instructions: '',
                          food_instructions: ''
                        })}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          value={currentPrescription.dosage}
                          onChange={(e) => setCurrentPrescription({ ...currentPrescription, dosage: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="e.g., 500mg, 1 tablet"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (Days) *
                        </label>
                        <input
                          type="text"
                          value={currentPrescription.duration}
                          onChange={(e) => setCurrentPrescription({ ...currentPrescription, duration: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="e.g., 7"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency Times *
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
                          <label key={time} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentPrescription.frequency_times.includes(time)}
                              onChange={() => toggleFrequencyTime(time)}
                              className="w-4 h-4 text-green-500 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">{time}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meal Timing
                      </label>
                      <select
                        value={currentPrescription.food_instructions}
                        onChange={(e) => setCurrentPrescription({ ...currentPrescription, food_instructions: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select meal timing</option>
                        <option value="before_food">Before Food</option>
                        <option value="after_food">After Food</option>
                        <option value="with_food">With Food</option>
                        <option value="empty_stomach">Empty Stomach</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instructions
                      </label>
                      <textarea
                        value={currentPrescription.instructions}
                        onChange={(e) => setCurrentPrescription({ ...currentPrescription, instructions: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., Take after meals, Avoid alcohol, Complete the full course"
                      />
                    </div>
                  </div>
                )}

                {/* Medication Selection */}
                {!currentPrescription.medication_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Medication
                    </label>
                    <select
                      onChange={(e) => handleMedicationSelect(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={loadingMedications}
                    >
                      <option value="">Search & Select Medication...</option>
                      {medications.map((med) => (
                        <option key={med.id} value={med.id}>
                          {med.name} ({med.generic_name}) - {med.strength} - {med.dosage_form}
                        </option>
                      ))}
                    </select>
                    {loadingMedications && (
                      <p className="text-sm text-gray-500 mt-1">Loading medications...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Prescribed Medications List */}
              {prescriptions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Added Medications ({prescriptions.length})</h3>
                  {prescriptions.map((prescription, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{prescription.medication_name}</div>
                          {prescription.generic_name && (
                            <p className="text-sm text-gray-600">{prescription.generic_name}</p>
                          )}
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Dosage:</span> {prescription.dosage}
                            </p>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Frequency:</span> {prescription.frequency_times.join(', ')}
                            </p>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Duration:</span> {prescription.duration} days
                            </p>
                            {prescription.food_instructions && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Meal Timing:</span> {prescription.food_instructions.replace('_', ' ')}
                              </p>
                            )}
                            {prescription.instructions && (
                              <p className="text-sm text-gray-600 mt-2">{prescription.instructions}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== index))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Follow-up Tab */}
          {activeTab === 'followup' && (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <Calendar className="h-5 w-5 text-teal-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Schedule Follow-up Appointment</h3>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Date *
                      </label>
                      <input
                        type="date"
                        value={followUp.follow_up_date}
                        onChange={(e) => setFollowUp({ ...followUp, follow_up_date: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Time
                      </label>
                      <input
                        type="time"
                        value={followUp.follow_up_time}
                        onChange={(e) => setFollowUp({ ...followUp, follow_up_time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        value={followUp.priority}
                        onChange={(e) => setFollowUp({ ...followUp, priority: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="routine">Routine</option>
                        <option value="important">Important</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Follow-up *
                    </label>
                    <textarea
                      value={followUp.reason}
                      onChange={(e) => setFollowUp({ ...followUp, reason: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Reason for follow-up appointment"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructions for Patient
                    </label>
                    <textarea
                      value={followUp.instructions}
                      onChange={(e) => setFollowUp({ ...followUp, instructions: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Instructions for patient before follow-up"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-white">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <p className="text-green-800 text-sm">Clinical data saved successfully!</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !clinicalNotes.doctor_notes}
              className="flex items-center space-x-2 px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Clinical Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
