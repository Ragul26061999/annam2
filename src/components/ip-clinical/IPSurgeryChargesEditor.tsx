'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { 
  getIPSurgeryCharges, 
  createIPSurgeryCharge, 
  updateIPSurgeryCharge,
  acknowledgeIPSurgeryCharge,
  deleteIPSurgeryCharge,
  IPSurgeryCharge 
} from '../../lib/ipSurgeryService';

interface IPSurgeryChargesEditorProps {
  bedAllocationId: string;
  patientId: string;
  isEditable?: boolean;
  onUpdate?: () => void;
}

export default function IPSurgeryChargesEditor({ 
  bedAllocationId, 
  patientId, 
  isEditable = true,
  onUpdate 
}: IPSurgeryChargesEditorProps) {
  const [surgeries, setSurgeries] = useState<IPSurgeryCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<IPSurgeryCharge>>({
    surgery_name: '',
    surgeon_name: '',
    surgery_date: new Date().toISOString().split('T')[0],
    surgery_type: '',
    anesthesia_type: '',
    duration_minutes: 0,
    surgeon_fee: 0,
    anesthesia_fee: 0,
    ot_charges: 0,
    equipment_charges: 0,
    consumables_charges: 0,
    other_charges: 0,
    notes: '',
    status: 'pending'
  });

  useEffect(() => {
    loadSurgeries();
  }, [bedAllocationId]);

  const loadSurgeries = async () => {
    setLoading(true);
    try {
      const data = await getIPSurgeryCharges(bedAllocationId);
      setSurgeries(data);
    } catch (error) {
      console.error('Failed to load surgery charges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      await createIPSurgeryCharge({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        ...formData
      } as any);
      
      await loadSurgeries();
      setShowAddForm(false);
      setFormData({
        surgery_name: '',
        surgeon_name: '',
        surgery_date: new Date().toISOString().split('T')[0],
        surgery_type: '',
        anesthesia_type: '',
        duration_minutes: 0,
        surgeon_fee: 0,
        anesthesia_fee: 0,
        ot_charges: 0,
        equipment_charges: 0,
        consumables_charges: 0,
        other_charges: 0,
        notes: '',
        status: 'pending'
      });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to add surgery charge:', error);
      alert('Failed to add surgery charge');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<IPSurgeryCharge>) => {
    try {
      await updateIPSurgeryCharge(id, updates);
      await loadSurgeries();
      setEditingId(null);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update surgery charge:', error);
      alert('Failed to update surgery charge');
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeIPSurgeryCharge(id, 'current-user-id'); // Replace with actual user ID
      await loadSurgeries();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to acknowledge surgery charge:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this surgery charge?')) return;
    
    try {
      await deleteIPSurgeryCharge(id);
      await loadSurgeries();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to delete surgery charge:', error);
      alert('Failed to delete surgery charge');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const totalAmount = surgeries.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading surgery charges...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Surgery Charges</h3>
          <p className="text-sm text-gray-600">Surgical procedures and related charges</p>
        </div>
        {isEditable && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Surgery
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-semibold text-gray-800 mb-3">Add Surgery Charge</h4>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Surgery Name *"
              value={formData.surgery_name}
              onChange={(e) => setFormData({ ...formData, surgery_name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Surgeon Name"
              value={formData.surgeon_name}
              onChange={(e) => setFormData({ ...formData, surgeon_name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="date"
              value={formData.surgery_date}
              onChange={(e) => setFormData({ ...formData, surgery_date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Surgery Type"
              value={formData.surgery_type}
              onChange={(e) => setFormData({ ...formData, surgery_type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="Surgeon Fee"
              value={formData.surgeon_fee}
              onChange={(e) => setFormData({ ...formData, surgeon_fee: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="Anesthesia Fee"
              value={formData.anesthesia_fee}
              onChange={(e) => setFormData({ ...formData, anesthesia_fee: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="OT Charges"
              value={formData.ot_charges}
              onChange={(e) => setFormData({ ...formData, ot_charges: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="Equipment Charges"
              value={formData.equipment_charges}
              onChange={(e) => setFormData({ ...formData, equipment_charges: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={!formData.surgery_name}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              Save Surgery
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

      {surgeries.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          No surgery charges recorded
        </div>
      ) : (
        <div className="space-y-3">
          {surgeries.map((surgery) => (
            <div key={surgery.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{surgery.surgery_name}</h4>
                    {surgery.edited && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                        EDITED
                      </span>
                    )}
                    {surgery.acknowledged && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded flex items-center gap-1">
                        <Check className="h-3 w-3" /> ACKNOWLEDGED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {surgery.surgeon_name} • {surgery.surgery_date ? new Date(surgery.surgery_date).toLocaleDateString() : 'Date not set'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(surgery.total_amount || 0)}</p>
                  <div className="flex gap-1 mt-1">
                    {!surgery.acknowledged && isEditable && (
                      <button
                        onClick={() => handleAcknowledge(surgery.id!)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Acknowledge"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    {isEditable && (
                      <button
                        onClick={() => handleDelete(surgery.id!)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-2">
                <div>Surgeon: {formatCurrency(surgery.surgeon_fee)}</div>
                <div>Anesthesia: {formatCurrency(surgery.anesthesia_fee)}</div>
                <div>OT: {formatCurrency(surgery.ot_charges)}</div>
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Surgery Charges:</span>
              <span className="text-2xl font-bold text-purple-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
