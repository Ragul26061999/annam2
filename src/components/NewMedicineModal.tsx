'use client';
import React, { useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMedicineAdded: (medicine: any) => void;
}

export default function NewMedicineModal({ isOpen, onClose, onMedicineAdded }: NewMedicineModalProps) {
  const [formData, setFormData] = useState({
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const generateMedicationCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `EXT${timestamp}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Medicine name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Check if medicine already exists
      const { data: existingMedicine, error: checkError } = await supabase
        .from('medications')
        .select('id, name')
        .ilike('name', formData.name.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingMedicine) {
        setError('A medicine with this name already exists in the system');
        return;
      }

      // Create new external medicine
      const medicationCode = generateMedicationCode();
      
      const { data: newMedicine, error: insertError } = await supabase
        .from('medications')
        .insert({
          medication_code: medicationCode,
          name: formData.name.trim(),
          generic_name: null,
          manufacturer: 'External Pharmacy',
          category: 'External',
          dosage_form: null,
          strength: null,
          selling_price: 0,
          purchase_price: 0,
          is_external: true,
          is_active: true,
          available_stock: 0,
          total_stock: 0,
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      onMedicineAdded(newMedicine);
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          name: ''
        });
        setSuccess(false);
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('Error adding new medicine:', error);
      setError(error?.message || 'Failed to add new medicine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Plus className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New External Medicine</h2>
                <p className="text-gray-600 text-sm">
                  Add a medicine that patient can purchase from outside pharmacy
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-green-700 text-sm">External medicine added successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Medicine Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medicine Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Paracetamol 500mg"
                required
              />
            </div>

            {/* External Medicine Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">External Medicine Information</h4>
                  <p className="text-sm text-blue-700">
                    This medicine will be marked as external and available for patients to purchase from outside pharmacies. 
                    Stock will be set to 0 since it's not available in the hospital inventory.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add External Medicine
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
