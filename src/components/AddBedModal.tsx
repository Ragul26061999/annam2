'use client';

import React, { useState, useEffect } from 'react';
import { X, Bed, Building, AlertCircle, CheckCircle, Plus, Minus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createBed } from '../lib/bedAllocationService';

interface AddBedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Department {
  id: string;
  name: string;
}

interface BedEntry {
  id: string;
  bedNumber: string;
  dailyRate: number;
}

export default function AddBedModal({ isOpen, onClose, onSuccess }: AddBedModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [roomNumber, setRoomNumber] = useState('');
  const [floorNumber, setFloorNumber] = useState(1);
  const [bedType, setBedType] = useState('general');
  const [departmentId, setDepartmentId] = useState('');
  const [features, setFeatures] = useState('');
  const [beds, setBeds] = useState<BedEntry[]>([
    { id: '1', bedNumber: '', dailyRate: 0 }
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      resetForm();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;

      setDepartments(data || []);
      if (data && data.length > 0) {
        setDepartmentId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRoomNumber('');
    setFloorNumber(1);
    setBedType('general');
    setFeatures('');
    setBeds([{ id: '1', bedNumber: '', dailyRate: 0 }]);
    setError(null);
    setSuccess(false);
  };

  const addBedEntry = () => {
    const newId = (Math.max(...beds.map(b => parseInt(b.id))) + 1).toString();
    setBeds([...beds, { id: newId, bedNumber: '', dailyRate: 0 }]);
  };

  const removeBedEntry = (id: string) => {
    if (beds.length > 1) {
      setBeds(beds.filter(bed => bed.id !== id));
    }
  };

  const updateBedEntry = (id: string, field: keyof BedEntry, value: string | number) => {
    setBeds(beds.map(bed => 
      bed.id === id ? { ...bed, [field]: value } : bed
    ));
  };

  const generateBedNumbers = () => {
    if (!roomNumber) return;
    
    const updatedBeds = beds.map((bed, index) => ({
      ...bed,
      bedNumber: `${roomNumber}-${String(index + 1).padStart(2, '0')}`
    }));
    setBeds(updatedBeds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomNumber.trim()) {
      setError('Room number is required');
      return;
    }

    // Validate all bed entries
    const invalidBeds = beds.filter(bed => !bed.bedNumber.trim());
    if (invalidBeds.length > 0) {
      setError('All bed numbers are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create all beds
      const bedPromises = beds.map(bed => 
        createBed({
          bed_number: bed.bedNumber,
          room_number: roomNumber,
          floor_number: floorNumber,
          bed_type: bedType,
          daily_rate: bed.dailyRate,
          department_id: departmentId,
          features: features.split(',').map(f => f.trim()).filter(f => f)
        })
      );

      await Promise.all(bedPromises);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating beds:', err);
      setError(err.message || 'Failed to create beds. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bed className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Beds</h2>
              <p className="text-sm text-gray-600">Create multiple beds in a room</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Room Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-gray-500" />
                Room Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-lg">
                {/* Room Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g., 101, ICU-A"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>

                {/* Floor Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>

                {/* Bed Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bed Type
                  </label>
                  <select
                    value={bedType}
                    onChange={(e) => setBedType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  >
                    <option value="general">General</option>
                    <option value="private">Private</option>
                    <option value="icu">ICU</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {/* Department and Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  {loading ? (
                    <div className="text-gray-500">Loading departments...</div>
                  ) : (
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={submitting}
                    >
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features (comma separated)
                  </label>
                  <input
                    type="text"
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                    placeholder="e.g., oxygen, monitoring, TV"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Beds Configuration */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  Beds Configuration ({beds.length} beds)
                </h3>
                <button
                  type="button"
                  onClick={generateBedNumbers}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={!roomNumber || submitting}
                >
                  Auto-generate Numbers
                </button>
              </div>

              <div className="space-y-4">
                {beds.map((bed, index) => (
                  <div key={bed.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bed Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bed Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bed.bedNumber}
                          onChange={(e) => updateBedEntry(bed.id, 'bedNumber', e.target.value)}
                          placeholder="e.g., 101-01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={submitting}
                        />
                      </div>

                      {/* Daily Rate */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Daily Rate (₹)
                        </label>
                        <input
                          type="number"
                          value={bed.dailyRate}
                          onChange={(e) => updateBedEntry(bed.id, 'dailyRate', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => removeBedEntry(bed.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={beds.length === 1 || submitting}
                        title="Remove bed"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Bed Button */}
              <button
                type="button"
                onClick={addBedEntry}
                className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                disabled={submitting}
              >
                <Plus className="h-4 w-4" />
                Add Another Bed
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">{beds.length} beds created successfully!</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating {beds.length} Beds...
                  </>
                ) : (
                  <>
                    <Bed className="h-4 w-4" />
                    Create {beds.length} Beds
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