'use client';
import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Bed, Building, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BedTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBed: {
    id: string;
    bed_number: string;
    room_number: string;
    bed_type: string;
    patient_name: string;
    patient_hospital_id: string;
  };
  onSuccess: () => void;
}

interface AvailableBed {
  id: string;
  bed_number: string;
  room_number: string;
  bed_type: string;
  floor_number: number;
  daily_rate: number;
  department_name?: string;
}

export default function BedTransferModal({ isOpen, onClose, currentBed, onSuccess }: BedTransferModalProps) {
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [filteredBeds, setFilteredBeds] = useState<AvailableBed[]>([]);
  const [selectedBed, setSelectedBed] = useState<AvailableBed | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bedTypeFilter, setBedTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableBeds();
      setError(null);
      setSuccess(false);
      setReason('');
      setSelectedBed(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (bedTypeFilter === 'all') {
      setFilteredBeds(availableBeds);
    } else {
      setFilteredBeds(availableBeds.filter(bed => bed.bed_type === bedTypeFilter));
    }
  }, [bedTypeFilter, availableBeds]);

  const fetchAvailableBeds = async () => {
    try {
      setLoading(true);
      const { data: beds, error } = await supabase
        .from('beds')
        .select('*')
        .eq('status', 'available')
        .neq('id', currentBed.id) // Exclude current bed
        .order('bed_type')
        .order('bed_number');

      if (error) throw error;
      
      setAvailableBeds(beds || []);
      setFilteredBeds(beds || []);
    } catch (err) {
      console.error('Error fetching available beds:', err);
      setError('Failed to load available beds');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedBed) {
      setError('Please select a bed to transfer to');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for transfer');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      console.log('Starting bed transfer from', currentBed.id, 'to', selectedBed.id);

      // Get the current active bed allocation
      const { data: currentAllocation, error: allocationError } = await supabase
        .from('bed_allocations')
        .select('*')
        .eq('bed_id', currentBed.id)
        .eq('status', 'active')
        .is('discharge_date', null)
        .single();

      if (allocationError) {
        console.error('Error fetching current allocation:', allocationError);
        throw new Error(`Failed to find current bed allocation: ${allocationError.message}`);
      }

      if (!currentAllocation) {
        throw new Error('No active bed allocation found for this bed');
      }

      console.log('Current allocation found:', currentAllocation.id);

      // Mark current allocation as transferred
      console.log('Updating current allocation to transferred status');
      const { error: updateError } = await supabase
        .from('bed_allocations')
        .update({
          status: 'transferred',
          discharge_date: new Date().toISOString(),
          reason: `Transferred to bed ${selectedBed.bed_number}. Reason: ${reason}`
        })
        .eq('id', currentAllocation.id);

      if (updateError) {
        console.error('Error updating allocation:', updateError);
        throw new Error(`Failed to update bed allocation: ${updateError.message}`);
      }

      console.log('Creating new allocation for bed', selectedBed.bed_number);
      // Create new allocation for the new bed
      const { error: newAllocationError } = await supabase
        .from('bed_allocations')
        .insert({
          patient_id: currentAllocation.patient_id,
          bed_id: selectedBed.id,
          doctor_id: currentAllocation.doctor_id,
          admission_date: new Date().toISOString(),
          reason: `Transfer from bed ${currentBed.bed_number}. Reason: ${reason}`,
          status: 'active'
        });

      if (newAllocationError) {
        console.error('Error creating new allocation:', newAllocationError);
        throw new Error(`Failed to create new bed allocation: ${newAllocationError.message}`);
      }

      // Update bed statuses
      console.log('Updating bed statuses');
      const [oldBedUpdate, newBedUpdate] = await Promise.all([
        supabase
          .from('beds')
          .update({ status: 'available' })
          .eq('id', currentBed.id),
        supabase
          .from('beds')
          .update({ status: 'occupied' })
          .eq('id', selectedBed.id)
      ]);

      if (oldBedUpdate.error) {
        console.error('Error updating old bed status:', oldBedUpdate.error);
        throw new Error(`Failed to update old bed status: ${oldBedUpdate.error.message}`);
      }

      if (newBedUpdate.error) {
        console.error('Error updating new bed status:', newBedUpdate.error);
        throw new Error(`Failed to update new bed status: ${newBedUpdate.error.message}`);
      }

      console.log('Bed transfer completed successfully');
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error transferring bed:', err);
      setError(err.message || 'Failed to transfer bed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const bedTypes = [...new Set(availableBeds.map(bed => bed.bed_type))];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowRightLeft className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Transfer Patient Bed</h2>
              <p className="text-sm text-gray-600">Move patient to a different bed</p>
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
          {/* Current Bed Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Current Bed</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Patient:</span>
                <p className="text-blue-900">{currentBed.patient_name}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">UHID:</span>
                <p className="text-blue-900">{currentBed.patient_hospital_id}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Current Bed:</span>
                <p className="text-blue-900">{currentBed.bed_number}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Room:</span>
                <p className="text-blue-900">{currentBed.room_number}</p>
              </div>
            </div>
          </div>

          {/* Transfer Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Transfer <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for bed transfer..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
              disabled={submitting}
            />
          </div>

          {/* Bed Type Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Bed Type</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setBedTypeFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  bedTypeFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Beds ({availableBeds.length})
              </button>
              {bedTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setBedTypeFilter(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    bedTypeFilter === type
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type} ({availableBeds.filter(b => b.bed_type === type).length})
                </button>
              ))}
            </div>
          </div>

          {/* Available Beds */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Select New Bed ({filteredBeds.length} available)
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading available beds...</p>
              </div>
            ) : filteredBeds.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Bed className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No available beds found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {filteredBeds.map((bed) => (
                  <div
                    key={bed.id}
                    onClick={() => setSelectedBed(bed)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedBed?.id === bed.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{bed.bed_number}</h4>
                        <p className="text-sm text-gray-600">Room: {bed.room_number}</p>
                        <p className="text-sm text-gray-600">Floor: {bed.floor_number}</p>
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {bed.bed_type}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">₹{bed.daily_rate}/day</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">Bed transfer completed successfully!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={submitting || !selectedBed || !reason.trim()}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4" />
                Transfer Bed
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
