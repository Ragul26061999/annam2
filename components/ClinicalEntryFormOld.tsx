'use client';
import React, { useState } from 'react';
import {
  X,
  FileText,
  Scan,
  Pill,
  Syringe,
  Calendar,
  Scissors,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  Eye
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import ScanDocumentUpload from './ScanDocumentUpload';

interface ClinicalEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
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
  medication_id: string; // Link to medications table
  medication_name: string;
  generic_name: string;
  dosage: string;
  form: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  food_instructions: string;
}


export default function ClinicalEntryForm({
  isOpen,
  onClose,
  appointmentId,
  encounterId,
  patientId,
  doctorId,
  patientName,
  onSuccess
}: ClinicalEntryFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clinical Notes State - Optimized and consolidated
  const [clinicalNotes, setClinicalNotes] = useState({
    chief_complaint: '',
    history_of_present_illness: '',
    physical_examination: '',
    assessment: '',
    plan: '', // Treatment plan
    doctor_notes: '' // Main comprehensive notes
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
    frequency: '',
    duration: '',
    quantity: 1,
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


  // Scan Upload State
  const [showScanUpload, setShowScanUpload] = useState(false);
  const [selectedScanForUpload, setSelectedScanForUpload] = useState<ScanOrder | null>(null);

  // Medications list for prescription dropdown
  const [medications, setMedications] = useState<any[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);

  const tabs = [
    { id: 'notes' as TabType, label: 'Clinical Notes', icon: FileText },
    { id: 'scans' as TabType, label: 'Scans & Imaging', icon: Scan },
    { id: 'prescriptions' as TabType, label: 'Prescriptions', icon: Pill },
    { id: 'followup' as TabType, label: 'Follow-up', icon: Calendar }
  ];

  // Load medications on mount
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
    if (currentPrescription.medication_id && currentPrescription.dosage && currentPrescription.frequency) {
      setPrescriptions([...prescriptions, currentPrescription]);
      setCurrentPrescription({
        medication_id: '',
        medication_name: '',
        generic_name: '',
        dosage: '',
        form: 'tablet',
        route: 'oral',
        frequency: '',
        duration: '',
        quantity: 1,
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

  const handleUploadScanDocument = (scan: ScanOrder, index: number) => {
    if (scan.id) {
      setSelectedScanForUpload(scan as any);
      setShowScanUpload(true);
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
          .from('radiology_test_orders')
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clinical Entry Form</h2>
            <p className="text-sm text-gray-600 mt-1">Patient: {patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600 font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Doctor Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Chief Complaint
                  </label>
                  <input
                    type="text"
                    value={clinicalNotes.chief_complaint}
                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, chief_complaint: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Main reason for visit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    History of Present Illness
                  </label>
                  <textarea
                    value={clinicalNotes.history_of_present_illness}
                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, history_of_present_illness: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Detailed history of the current illness"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Physical Examination
                  </label>
                  <textarea
                    value={clinicalNotes.physical_examination}
                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, physical_examination: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Physical examination findings"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assessment
                  </label>
                  <textarea
                    value={clinicalNotes.assessment}
                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, assessment: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Clinical assessment"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Treatment Plan
                  </label>
                  <textarea
                    value={clinicalNotes.plan}
                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, plan: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Treatment plan and recommendations"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Comprehensive Doctor Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={clinicalNotes.doctor_notes}
                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, doctor_notes: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Detailed clinical notes including diagnosis, observations, and any additional information (required)"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Scans Tab */}
          {activeTab === 'scans' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Scan Order</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Scan Type</label>
                    <select
                      value={currentScan.scan_type}
                      onChange={(e) => setCurrentScan({ ...currentScan, scan_type: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Scan Name</label>
                    <input
                      type="text"
                      value={currentScan.scan_name}
                      onChange={(e) => setCurrentScan({ ...currentScan, scan_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Chest X-Ray"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Body Part</label>
                    <input
                      type="text"
                      value={currentScan.body_part}
                      onChange={(e) => setCurrentScan({ ...currentScan, body_part: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Chest, Abdomen"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency</label>
                    <select
                      value={currentScan.urgency}
                      onChange={(e) => setCurrentScan({ ...currentScan, urgency: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Clinical Indication</label>
                    <textarea
                      value={currentScan.clinical_indication}
                      onChange={(e) => setCurrentScan({ ...currentScan, clinical_indication: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="Reason for scan"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Special Instructions</label>
                    <textarea
                      value={currentScan.special_instructions}
                      onChange={(e) => setCurrentScan({ ...currentScan, special_instructions: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="Any special instructions"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddScan}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                >
                  <Plus size={18} />
                  <span>Add Scan</span>
                </button>
              </div>

              {/* Scan List */}
              {scans.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Ordered Scans</h3>
                  {scans.map((scan, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">{scan.scan_name}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              scan.urgency === 'emergency' ? 'bg-red-100 text-red-700' :
                              scan.urgency === 'stat' ? 'bg-orange-100 text-orange-700' :
                              scan.urgency === 'urgent' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {scan.urgency}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{scan.scan_type} - {scan.body_part}</p>
                          <p className="text-sm text-gray-500 mt-1">{scan.clinical_indication}</p>
                        </div>
                        <button
                          onClick={() => setScans(scans.filter((_, i) => i !== index))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => scan.id && handleUploadScanDocument(scan, index)}
                            disabled={!scan.id}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!scan.id ? "Save clinical data first to upload documents" : "Upload scan documents"}
                          >
                            <Upload size={16} />
                            <span>Upload Documents</span>
                          </button>
                          {!scan.id && (
                            <span className="text-xs text-gray-500 italic">Save clinical data first</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Prescription</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Medication <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={currentPrescription.medication_id}
                      onChange={(e) => handleMedicationSelect(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      disabled={loadingMedications}
                    >
                      <option value="">Select medication from inventory</option>
                      {medications.map((med) => (
                        <option key={med.id} value={med.id}>
                          {med.name} ({med.generic_name}) - {med.strength} - {med.dosage_form}
                        </option>
                      ))}
                    </select>
                    {loadingMedications && (
                      <p className="text-sm text-gray-500 mt-1">Loading medications...</p>
                    )}
                    {currentPrescription.medication_id && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <span className="font-semibold">Selected:</span> {currentPrescription.medication_name}
                          {currentPrescription.generic_name && ` (${currentPrescription.generic_name})`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dosage</label>
                    <input
                      type="text"
                      value={currentPrescription.dosage}
                      onChange={(e) => setCurrentPrescription({ ...currentPrescription, dosage: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., 500mg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Form</label>
                    <select
                      value={currentPrescription.form}
                      onChange={(e) => setCurrentPrescription({ ...currentPrescription, form: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="tablet">Tablet</option>
                      <option value="capsule">Capsule</option>
                      <option value="syrup">Syrup</option>
                      <option value="injection">Injection</option>
                      <option value="cream">Cream</option>
                      <option value="drops">Drops</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Route</label>
                    <select
                      value={currentPrescription.route}
                      onChange={(e) => setCurrentPrescription({ ...currentPrescription, route: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="oral">Oral</option>
                      <option value="IV">IV</option>
                      <option value="IM">IM</option>
                      <option value="topical">Topical</option>
                      <option value="sublingual">Sublingual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
                    <input
                      type="text"
                      value={currentPrescription.frequency}
                      onChange={(e) => setCurrentPrescription({ ...currentPrescription, frequency: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Twice daily"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
                    <input
                      type="text"
                      value={currentPrescription.duration}
                      onChange={(e) => setCurrentPrescription({ ...currentPrescription, duration: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., 7 days"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      value={currentPrescription.quantity}
                      onChange={(e) => setCurrentPrescription({ ...currentPrescription, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Food Instructions</label>
                    <select
                      value={currentPrescription.food_instructions}
                      onChange={(e) => setCurrentPrescription({ ...currentPrescription, food_instructions: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select</option>
                      <option value="before_food">Before Food</option>
                      <option value="after_food">After Food</option>
                      <option value="with_food">With Food</option>
                      <option value="empty_stomach">Empty Stomach</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
                    <textarea
                      value={currentPrescription.instructions}
                      onChange={(e) => setCurrentPrescription({ ...currentPrescription, instructions: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="Detailed instructions"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddPrescription}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                >
                  <Plus size={18} />
                  <span>Add Prescription</span>
                </button>
              </div>

              {/* Prescription List */}
              {prescriptions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Prescribed Medications</h3>
                  {prescriptions.map((prescription, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{prescription.medication_name}</div>
                        <p className="text-sm text-gray-600 mt-1">
                          {prescription.dosage} - {prescription.form} - {prescription.route}
                        </p>
                        <p className="text-sm text-gray-600">
                          {prescription.frequency} for {prescription.duration} ({prescription.quantity} units)
                        </p>
                        {prescription.food_instructions && (
                          <p className="text-sm text-gray-500 mt-1">{prescription.food_instructions.replace('_', ' ')}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== index))}
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

          {/* Follow-up Tab */}
          {activeTab === 'followup' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Schedule Follow-up</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Follow-up Date</label>
                    <input
                      type="date"
                      value={followUp.follow_up_date}
                      onChange={(e) => setFollowUp({ ...followUp, follow_up_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Follow-up Time</label>
                    <input
                      type="time"
                      value={followUp.follow_up_time}
                      onChange={(e) => setFollowUp({ ...followUp, follow_up_time: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                    <select
                      value={followUp.priority}
                      onChange={(e) => setFollowUp({ ...followUp, priority: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="routine">Routine</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
                    <textarea
                      value={followUp.reason}
                      onChange={(e) => setFollowUp({ ...followUp, reason: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="Reason for follow-up"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
                    <textarea
                      value={followUp.instructions}
                      onChange={(e) => setFollowUp({ ...followUp, instructions: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      placeholder="Instructions for patient"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <p className="text-green-800 text-sm">Clinical data saved successfully!</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !clinicalNotes.doctor_notes}
              className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Scan Document Upload Modal */}
      {showScanUpload && selectedScanForUpload && selectedScanForUpload.id && (
        <ScanDocumentUpload
          isOpen={showScanUpload}
          onClose={() => {
            setShowScanUpload(false);
            setSelectedScanForUpload(null);
          }}
          scanOrder={selectedScanForUpload as any}
          patientId={patientId}
          encounterId={encounterId}
          onSuccess={() => {
            setShowScanUpload(false);
            setSelectedScanForUpload(null);
          }}
        />
      )}
    </div>
  );
}
