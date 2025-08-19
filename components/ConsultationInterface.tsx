'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Pill, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Clock, 
  User, 
  Stethoscope,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface ConsultationData {
  appointmentId: string;
  diagnosis: string;
  treatmentPlan: string;
  medications: Medication[];
  followUpDate?: string;
  followUpNotes?: string;
  doctorNotes: string;
  vitalSigns?: {
    bloodPressure?: string;
    temperature?: string;
    heartRate?: string;
    weight?: string;
    height?: string;
  };
}

interface ConsultationInterfaceProps {
  appointment: any;
  onClose: () => void;
  onSave: (data: ConsultationData) => Promise<void>;
}

const ConsultationInterface: React.FC<ConsultationInterfaceProps> = ({
  appointment,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'prescription' | 'followup'>('diagnosis');
  const [loading, setSaving] = useState(false);
  const [consultationData, setConsultationData] = useState<ConsultationData>({
    appointmentId: appointment.id,
    diagnosis: appointment.diagnosis || '',
    treatmentPlan: appointment.treatment_plan || '',
    medications: [],
    doctorNotes: appointment.notes || '',
    vitalSigns: {
      bloodPressure: '',
      temperature: '',
      heartRate: '',
      weight: '',
      height: ''
    }
  });

  const addMedication = () => {
    const newMedication: Medication = {
      id: Date.now().toString(),
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    };
    setConsultationData(prev => ({
      ...prev,
      medications: [...prev.medications, newMedication]
    }));
  };

  const updateMedication = (id: string, field: keyof Medication, value: string) => {
    setConsultationData(prev => ({
      ...prev,
      medications: prev.medications.map(med => 
        med.id === id ? { ...med, [field]: value } : med
      )
    }));
  };

  const removeMedication = (id: string) => {
    setConsultationData(prev => ({
      ...prev,
      medications: prev.medications.filter(med => med.id !== id)
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(consultationData);
      onClose();
    } catch (error) {
      console.error('Error saving consultation:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'diagnosis', label: 'Diagnosis & Treatment', icon: <Stethoscope size={16} /> },
    { id: 'prescription', label: 'Prescription', icon: <Pill size={16} /> },
    { id: 'followup', label: 'Follow-up', icon: <Calendar size={16} /> }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Patient Consultation</h2>
              <p className="text-blue-100 mt-1">
                {appointment.patient?.name} • {new Date(appointment.appointment_date).toLocaleDateString()} • {appointment.appointment_time}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Patient Info Bar */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Patient ID:</span>
              <span className="ml-2 font-medium">{appointment.patient?.patient_id || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Age:</span>
              <span className="ml-2 font-medium">{appointment.patient?.age || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Gender:</span>
              <span className="ml-2 font-medium">{appointment.patient?.gender || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Chief Complaint:</span>
              <span className="ml-2 font-medium">{appointment.symptoms || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            {activeTab === 'diagnosis' && (
              <motion.div
                key="diagnosis"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Vital Signs */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <AlertCircle className="mr-2 text-blue-500" size={20} />
                    Vital Signs
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        placeholder="120/80"
                        value={consultationData.vitalSigns?.bloodPressure || ''}
                        onChange={(e) => setConsultationData(prev => ({
                          ...prev,
                          vitalSigns: { ...prev.vitalSigns, bloodPressure: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
                      <input
                        type="text"
                        placeholder="98.6"
                        value={consultationData.vitalSigns?.temperature || ''}
                        onChange={(e) => setConsultationData(prev => ({
                          ...prev,
                          vitalSigns: { ...prev.vitalSigns, temperature: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)</label>
                      <input
                        type="text"
                        placeholder="72"
                        value={consultationData.vitalSigns?.heartRate || ''}
                        onChange={(e) => setConsultationData(prev => ({
                          ...prev,
                          vitalSigns: { ...prev.vitalSigns, heartRate: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                      <input
                        type="text"
                        placeholder="70"
                        value={consultationData.vitalSigns?.weight || ''}
                        onChange={(e) => setConsultationData(prev => ({
                          ...prev,
                          vitalSigns: { ...prev.vitalSigns, weight: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                      <input
                        type="text"
                        placeholder="170"
                        value={consultationData.vitalSigns?.height || ''}
                        onChange={(e) => setConsultationData(prev => ({
                          ...prev,
                          vitalSigns: { ...prev.vitalSigns, height: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Diagnosis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                  <textarea
                    rows={4}
                    value={consultationData.diagnosis}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, diagnosis: e.target.value }))}
                    placeholder="Enter primary and secondary diagnoses..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Treatment Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                  <textarea
                    rows={4}
                    value={consultationData.treatmentPlan}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                    placeholder="Describe the recommended treatment approach..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Doctor Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Notes</label>
                  <textarea
                    rows={3}
                    value={consultationData.doctorNotes}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, doctorNotes: e.target.value }))}
                    placeholder="Additional observations, patient behavior, etc..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'prescription' && (
              <motion.div
                key="prescription"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Pill className="mr-2 text-green-500" size={20} />
                    Prescription Details
                  </h3>
                  <button
                    onClick={addMedication}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} />
                    Add Medication
                  </button>
                </div>

                {consultationData.medications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Pill className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                    <p>No medications prescribed yet</p>
                    <p className="text-sm">Click "Add Medication" to start prescribing</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultationData.medications.map((medication, index) => (
                      <div key={medication.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">Medication {index + 1}</h4>
                          <button
                            onClick={() => removeMedication(medication.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
                            <input
                              type="text"
                              value={medication.name}
                              onChange={(e) => updateMedication(medication.id, 'name', e.target.value)}
                              placeholder="e.g., Paracetamol"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                            <input
                              type="text"
                              value={medication.dosage}
                              onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                              placeholder="e.g., 500mg"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                            <select
                              value={medication.frequency}
                              onChange={(e) => updateMedication(medication.id, 'frequency', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            >
                              <option value="">Select frequency</option>
                              <option value="Once daily">Once daily</option>
                              <option value="Twice daily">Twice daily</option>
                              <option value="Three times daily">Three times daily</option>
                              <option value="Four times daily">Four times daily</option>
                              <option value="As needed">As needed</option>
                              <option value="Before meals">Before meals</option>
                              <option value="After meals">After meals</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                            <input
                              type="text"
                              value={medication.duration}
                              onChange={(e) => updateMedication(medication.id, 'duration', e.target.value)}
                              placeholder="e.g., 7 days"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                          <textarea
                            rows={2}
                            value={medication.instructions}
                            onChange={(e) => updateMedication(medication.id, 'instructions', e.target.value)}
                            placeholder="e.g., Take with food, avoid alcohol..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'followup' && (
              <motion.div
                key="followup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar className="mr-2 text-purple-500" size={20} />
                  Follow-up Appointment
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date</label>
                    <input
                      type="date"
                      value={consultationData.followUpDate || ''}
                      onChange={(e) => setConsultationData(prev => ({ ...prev, followUpDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recommended Time</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select time preference</option>
                      <option value="morning">Morning (9:00 AM - 12:00 PM)</option>
                      <option value="afternoon">Afternoon (2:00 PM - 5:00 PM)</option>
                      <option value="evening">Evening (6:00 PM - 9:00 PM)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Notes</label>
                  <textarea
                    rows={4}
                    value={consultationData.followUpNotes || ''}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, followUpNotes: e.target.value }))}
                    placeholder="Specify what to monitor, tests to conduct, or specific concerns to address in the follow-up..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-blue-50 rounded-xl p-6">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Clock className="mr-2" size={16} />
                    Recommended Follow-up Timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <button 
                      onClick={() => {
                        const date = new Date();
                        date.setDate(date.getDate() + 7);
                        setConsultationData(prev => ({ ...prev, followUpDate: date.toISOString().split('T')[0] }));
                      }}
                      className="p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-colors text-left"
                    >
                      <div className="font-medium text-blue-900">1 Week</div>
                      <div className="text-blue-600">Routine follow-up</div>
                    </button>
                    <button 
                      onClick={() => {
                        const date = new Date();
                        date.setDate(date.getDate() + 14);
                        setConsultationData(prev => ({ ...prev, followUpDate: date.toISOString().split('T')[0] }));
                      }}
                      className="p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-colors text-left"
                    >
                      <div className="font-medium text-blue-900">2 Weeks</div>
                      <div className="text-blue-600">Medication review</div>
                    </button>
                    <button 
                      onClick={() => {
                        const date = new Date();
                        date.setMonth(date.getMonth() + 1);
                        setConsultationData(prev => ({ ...prev, followUpDate: date.toISOString().split('T')[0] }));
                      }}
                      className="p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-colors text-left"
                    >
                      <div className="font-medium text-blue-900">1 Month</div>
                      <div className="text-blue-600">Progress evaluation</div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <CheckCircle className="inline mr-1" size={16} />
            All fields marked with * are required
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !consultationData.diagnosis || !consultationData.treatmentPlan}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Consultation
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ConsultationInterface;