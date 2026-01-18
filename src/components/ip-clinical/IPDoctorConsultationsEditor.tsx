'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Edit2, Save, X } from 'lucide-react';
import { 
  getIPDoctorConsultations, 
  createIPDoctorConsultation, 
  updateIPDoctorConsultation,
  acknowledgeIPDoctorConsultation,
  deleteIPDoctorConsultation,
  getAllDoctors,
  IPDoctorConsultation 
} from '../../lib/ipDoctorConsultationService';

interface IPDoctorConsultationsEditorProps {
  bedAllocationId: string;
  patientId: string;
  isEditable?: boolean;
  onUpdate?: () => void;
}

export default function IPDoctorConsultationsEditor({ 
  bedAllocationId, 
  patientId, 
  isEditable = true,
  onUpdate 
}: IPDoctorConsultationsEditorProps) {
  const [consultations, setConsultations] = useState<IPDoctorConsultation[]>([]);
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; specialization?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    doctor_id: '',
    doctor_name: '',
    consultation_fee: 0,
    days: 1,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [bedAllocationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [consultationsData, doctorsData] = await Promise.all([
        getIPDoctorConsultations(bedAllocationId),
        getAllDoctors()
      ]);
      setConsultations(consultationsData);
      setDoctors(doctorsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      setFormData({
        ...formData,
        doctor_id: doctorId,
        doctor_name: doctor.name
      });
    }
  };

  const handleAdd = async () => {
    if (!formData.doctor_id || !formData.doctor_name) {
      alert('Please select a doctor');
      return;
    }

    try {
      await createIPDoctorConsultation({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        doctor_id: formData.doctor_id,
        doctor_name: formData.doctor_name,
        consultation_fee: formData.consultation_fee,
        days: formData.days,
        notes: formData.notes
      });
      
      await loadData();
      setShowAddForm(false);
      setFormData({
        doctor_id: '',
        doctor_name: '',
        consultation_fee: 0,
        days: 1,
        notes: ''
      });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to add consultation:', error);
      alert('Failed to add consultation');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<IPDoctorConsultation>) => {
    try {
      await updateIPDoctorConsultation(id, updates);
      await loadData();
      setEditingId(null);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update consultation:', error);
      alert('Failed to update consultation');
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeIPDoctorConsultation(id);
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to acknowledge consultation:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this consultation?')) return;
    
    try {
      await deleteIPDoctorConsultation(id);
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to delete consultation:', error);
      alert('Failed to delete consultation');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const totalAmount = consultations.reduce((sum, c) => sum + (c.total_amount || 0), 0);

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading consultations...</div>;
  }

  return (
    <div className="space-y-3">
      {isEditable && (
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Doctor Consultation
        </button>
      )}

      {showAddForm && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-gray-800 mb-3">Add Additional Consultation</h4>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={formData.doctor_id}
              onChange={(e) => handleDoctorSelect(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
            >
              <option value="">Select Doctor *</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Consultation Fee *"
              value={formData.consultation_fee}
              onChange={(e) => setFormData({ ...formData, consultation_fee: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="Days *"
              min="1"
              value={formData.days}
              onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 1 })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
              rows={2}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={!formData.doctor_id}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              Save Consultation
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {consultations.length > 0 && (
        <div className="space-y-2">
          {consultations.map((consultation) => (
            <div key={consultation.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{consultation.doctor_name}</p>
                  {consultation.edited && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                      EDITED
                    </span>
                  )}
                  {consultation.acknowledged && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded flex items-center gap-1">
                      <Check className="h-3 w-3" /> ACK
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Fee/Day:</span> {formatCurrency(consultation.consultation_fee)}
                  <span className="mx-2 text-gray-400">|</span>
                  <span className="font-medium text-gray-700">Days:</span> {consultation.days}
                  <span className="mx-2 text-gray-400">|</span>
                  <span className="font-medium text-gray-700">Total:</span> {formatCurrency(consultation.total_amount || 0)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-gray-900">{formatCurrency(consultation.total_amount || 0)}</p>
                {isEditable && (
                  <div className="flex gap-1">
                    {!consultation.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(consultation.id!)}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                        title="Acknowledge"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(consultation.id!)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
