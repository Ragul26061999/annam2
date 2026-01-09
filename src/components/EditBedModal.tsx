'use client';

import React, { useState, useEffect } from 'react';
import { X, Bed, Building, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateBed } from '../lib/bedAllocationService';

interface EditBedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bed: {
    id: string;
    bed_number: string;
    room_number: string;
    floor_number: number;
    bed_type: string;
    daily_rate: number;
    department_id: string;
    features: string[];
    status: string;
  };
}

interface Department {
  id: string;
  name: string;
}

export default function EditBedModal({ isOpen, onClose, onSuccess, bed }: EditBedModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [bedNumber, setBedNumber] = useState(bed.bed_number);
  const [roomNumber, setRoomNumber] = useState(bed.room_number);
  const [floorNumber, setFloorNumber] = useState(bed.floor_number);
  const [bedType, setBedType] = useState(bed.bed_type);
  const [dailyRate, setDailyRate] = useState(bed.daily_rate);
  const [departmentId, setDepartmentId] = useState(bed.department_id);
  const [features, setFeatures] = useState(bed.features.join(', '));
  const [status, setStatus] = useState(bed.status);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset form when bed prop changes
    setBedNumber(bed.bed_number);
    setRoomNumber(bed.room_number);
    setFloorNumber(bed.floor_number);
    setBedType(bed.bed_type);
    setDailyRate(bed.daily_rate);
    setDepartmentId(bed.department_id);
    setFeatures(bed.features.join(', '));
    setStatus(bed.status);
  }, [bed]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;

      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bedNumber.trim()) {
      setError('Bed number is required');
      return;
    }

    if (!roomNumber.trim()) {
      setError('Room number is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Update bed
      await updateBed(bed.id, {
        bed_number: bedNumber,
        room_number: roomNumber,
        floor_number: floorNumber,
        bed_type: bedType,
        daily_rate: dailyRate,
        department_id: departmentId,
        features: features.split(',').map(f => f.trim()).filter(f => f),
        status: status
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error updating bed:', err);
      setError(err.message || 'Failed to update bed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bed className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Bed</h2>
              <p className="text-sm text-gray-600">Update bed information</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bed Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bed Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  placeholder="Enter bed number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={submitting}
                />
              </div>

              {/* Room Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Enter room number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={submitting}
                >
                  <option value="general">General</option>
                  <option value="private">Private</option>
                  <option value="icu">ICU</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              {/* Daily Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Rate (₹)
                </label>
                <input
                  type="number"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={submitting}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={submitting}
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="cleaning">Cleaning</option>
                </select>
              </div>

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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={submitting}
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Features */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Features (comma separated)
                </label>
                <input
                  type="text"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="e.g., oxygen, monitoring, TV"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">Bed updated successfully!</p>
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
                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Bed
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
