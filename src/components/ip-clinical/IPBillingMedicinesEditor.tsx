'use client';

import React, { useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { IPPrescribedMedicine } from '../../lib/ipBillingService';

interface IPBillingMedicinesEditorProps {
  medicines: IPPrescribedMedicine[];
  onSave: (medicines: IPPrescribedMedicine[]) => Promise<void>;
  isEditable?: boolean;
}

export default function IPBillingMedicinesEditor({
  medicines: initialMedicines,
  onSave,
  isEditable = true
}: IPBillingMedicinesEditorProps) {
  const [medicines, setMedicines] = useState<IPPrescribedMedicine[]>(initialMedicines);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleUpdate = (index: number, field: keyof IPPrescribedMedicine, value: string | number) => {
    const updatedMedicines = [...medicines];
    const medicine = { ...updatedMedicines[index] };
    
    if (field === 'quantity' || field === 'unit_price') {
      (medicine as any)[field] = parseFloat(String(value)) || 0;
      medicine.total_price = medicine.quantity * medicine.unit_price;
    } else {
      (medicine as any)[field] = value;
    }
    
    updatedMedicines[index] = medicine;
    setMedicines(updatedMedicines);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSave(medicines);
      setIsEditing(false);
      setEditingIndex(null);
      alert('Prescribed medicines saved successfully!');
    } catch (error) {
      console.error('Error saving medicines:', error);
      alert('Failed to save medicines. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalAmount = medicines.reduce((sum, med) => sum + med.total_price, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Prescribed Medicines</h3>
          <p className="text-sm text-gray-600">Medicines prescribed during IP stay (from existing prescriptions)</p>
        </div>
        {isEditable && (
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Edit Medicines
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save All'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingIndex(null);
                    setMedicines(initialMedicines);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Medicines List */}
      {medicines.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No prescribed medicines found for this IP stay</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Medicine Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Dosage</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Frequency</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Duration</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Unit Price</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {medicines.map((medicine, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{medicine.medicine_name}</p>
                      {medicine.generic_name && (
                        <p className="text-xs text-gray-500">{medicine.generic_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {isEditing && editingIndex === index ? (
                      <input
                        type="text"
                        value={medicine.dosage}
                        onChange={(e) => handleUpdate(index, 'dosage', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      medicine.dosage
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {isEditing && editingIndex === index ? (
                      <input
                        type="text"
                        value={medicine.frequency}
                        onChange={(e) => handleUpdate(index, 'frequency', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      medicine.frequency
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {isEditing && editingIndex === index ? (
                      <input
                        type="text"
                        value={medicine.duration}
                        onChange={(e) => handleUpdate(index, 'duration', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      medicine.duration
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {isEditing && editingIndex === index ? (
                      <input
                        type="number"
                        min="1"
                        value={medicine.quantity}
                        onChange={(e) => handleUpdate(index, 'quantity', e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                      />
                    ) : (
                      medicine.quantity
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {isEditing && editingIndex === index ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={medicine.unit_price}
                        onChange={(e) => handleUpdate(index, 'unit_price', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                      />
                    ) : (
                      formatCurrency(medicine.unit_price)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(medicine.total_price)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {isEditing && editingIndex === index ? (
                      <input
                        type="text"
                        value={medicine.notes || ''}
                        onChange={(e) => handleUpdate(index, 'notes', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Add notes..."
                      />
                    ) : (
                      <span className="text-xs">{medicine.notes || '-'}</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-bold">
                <td colSpan={6} className="px-4 py-3 text-right text-gray-900">Total Medicines Cost:</td>
                <td className="px-4 py-3 text-right text-blue-600 text-lg">{formatCurrency(totalAmount)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
