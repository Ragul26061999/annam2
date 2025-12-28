'use client';
import React, { useState, useEffect } from 'react';
import { X, Bed, Building, User, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { allocateBed } from '../lib/bedAllocationService';

interface AdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    id: string;
    patient_id: string;
    name: string;
    phone: string;
    primary_complaint?: string;
  };
  onSuccess: () => void;
}

interface Bed {
  id: string;
  bed_number: string;
  room_number: string;
  bed_type: string;
  status: string;
  floor_number: number;
  department_id?: string;
  department?: {
    name: string;
  };
}

interface Doctor {
  id: string;
  license_number: string;
  specialization: string;
  user: {
    name: string;
  };
}

export default function AdmissionModal({ isOpen, onClose, patient, onSuccess }: AdmissionModalProps) {
  const [availableBeds, setAvailableBeds] = useState<Bed[]>([]);
  const [filteredBeds, setFilteredBeds] = useState<Bed[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [wards, setWards] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    bedId: '',
    doctorId: '',
    admissionType: 'inpatient' as 'emergency' | 'elective' | 'scheduled' | 'referred' | 'transfer' | 'inpatient' | 'outpatient',
    reason: '',
    admissionDate: new Date().toISOString().split('T')[0],
  });

  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableBeds();
      fetchDoctors();
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const fetchAvailableBeds = async () => {
    try {
      setLoading(true);
      const { data: beds, error } = await supabase
        .from('beds')
        .select(`
          *,
          department:departments(name)
        `)
        .eq('status', 'available')
        .order('bed_number');

      if (error) throw error;

      const bedsWithDepartment = beds?.map(bed => ({
        ...bed,
        department: Array.isArray(bed.department) ? bed.department[0] : bed.department
      })) || [];

      setAvailableBeds(bedsWithDepartment);

      // Extract unique ward names
      const uniqueWards = [...new Set(bedsWithDepartment
        .map(bed => bed.department?.name)
        .filter(Boolean)
      )] as string[];
      setWards(uniqueWards);

      // Initially show all beds
      setFilteredBeds(bedsWithDepartment);
    } catch (err) {
      console.error('Error fetching beds:', err);
      setError('Failed to load available beds');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data: doctors, error } = await supabase
        .from('doctors')
        .select(`
          id,
          license_number,
          specialization,
          user:users!inner(name)
        `)
        .eq('status', 'active')
        .order('specialization');

      if (error) throw error;

      // Transform the data to match our interface
      const transformedDoctors = doctors?.map(doctor => ({
        ...doctor,
        user: Array.isArray(doctor.user) ? doctor.user[0] : doctor.user
      })) || [];

      setDoctors(transformedDoctors);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors');
    }
  };

  const handleWardFilter = (wardName: string) => {
    setSelectedWard(wardName);
    if (wardName === 'all' || wardName === '') {
      setFilteredBeds(availableBeds);
    } else {
      const filtered = availableBeds.filter(bed => bed.department?.name === wardName);
      setFilteredBeds(filtered);
    }
    // Reset bed selection when changing ward
    setFormData(prev => ({ ...prev, bedId: '' }));
    setSelectedBed(null);
  };

  const handleBedSelect = (bed: Bed) => {
    setSelectedBed(bed);
    setFormData(prev => ({ ...prev, bedId: bed.id }));
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setFormData(prev => ({ ...prev, doctorId: doctor.id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bedId) {
      setError('Please select a bed');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const allocationData = {
        patientId: patient.id,
        bedId: formData.bedId,
        doctorId: formData.doctorId || undefined,
        admissionDate: formData.admissionDate,
        admissionType: formData.admissionType || 'scheduled',
        reason: formData.reason || '',
      };

      await allocateBed(allocationData);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 2000);

    } catch (err: any) {
      console.error('Error admitting patient:', err);
      setError(err.message || 'Failed to admit patient');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bedId: '',
      doctorId: '',
      admissionType: 'inpatient' as 'emergency' | 'elective' | 'scheduled' | 'referred' | 'transfer' | 'inpatient' | 'outpatient',
      reason: '',
      admissionDate: new Date().toISOString().split('T')[0],
    });
    setSelectedBed(null);
    setSelectedDoctor(null);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  // Group filtered beds by floor
  const bedsByFloor = filteredBeds.reduce((acc, bed) => {
    const floor = `Floor ${bed.floor_number}`;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(bed);
    return acc;
  }, {} as Record<string, Bed[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Patient Admission</h2>
              <p className="text-orange-100 mt-1">
                Admit {patient.name} ({patient.patient_id})
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Patient Admitted Successfully!
              </h3>
              <p className="text-gray-600">
                {patient.name} has been admitted to Floor {selectedBed?.floor_number} - Bed {selectedBed?.bed_number}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {/* Patient Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{patient.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ID:</span>
                    <span className="ml-2 font-medium">{patient.patient_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">{patient.phone}</span>
                  </div>
                  {patient.primary_complaint && (
                    <div>
                      <span className="text-gray-600">Complaint:</span>
                      <span className="ml-2 font-medium">{patient.primary_complaint}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admission Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Date *
                  </label>
                  <input
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, admissionDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Admission Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admission Type *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'emergency', label: 'Emergency', color: 'red' },
                    { value: 'inpatient', label: 'Inpatient', color: 'blue' },
                    { value: 'transfer', label: 'Transfer', color: 'yellow' }
                  ].map((type) => (
                    <label key={type.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="admissionType"
                        value={type.value}
                        checked={formData.admissionType === type.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, admissionType: e.target.value as any }))}
                        className="sr-only"
                      />
                      <div className={`w-full p-3 rounded-lg border-2 text-center text-sm font-medium transition-all ${formData.admissionType === type.value
                        ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}>
                        {type.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Doctor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attending Doctor *
                </label>
                {loading ? (
                  <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {doctors.map((doctor) => (
                      <label key={doctor.id} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="doctor"
                          value={doctor.license_number}
                          checked={formData.doctorId === doctor.license_number}
                          onChange={() => handleDoctorSelect(doctor)}
                          className="sr-only"
                        />
                        <div className={`w-full p-3 rounded-lg border text-sm transition-all ${formData.doctorId === doctor.license_number
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}>
                          <div className="font-medium">{doctor.user.name}</div>
                          <div className="text-xs text-gray-500">{doctor.specialization}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Bed Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Bed *
                </label>

                {/* Ward Filter */}
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleWardFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedWard === 'all' || selectedWard === ''
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      All Wards ({availableBeds.length})
                    </button>
                    {wards.map((ward) => {
                      const wardBedCount = availableBeds.filter(bed => bed.department?.name === ward).length;
                      return (
                        <button
                          key={ward}
                          type="button"
                          onClick={() => handleWardFilter(ward)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedWard === ward
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {ward} ({wardBedCount})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {loading ? (
                  <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
                ) : filteredBeds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bed className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No beds available in {selectedWard || 'any ward'}</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    {Object.keys(bedsByFloor).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Bed className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No beds available on any floor</p>
                      </div>
                    ) : (
                      Object.entries(bedsByFloor).map(([floor, beds]) => (
                        <div key={floor} className="border-b border-gray-100 last:border-b-0">
                          <div className="bg-gray-50 px-4 py-2 font-medium text-gray-700 text-sm flex items-center justify-between">
                            <span>{floor}</span>
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                              {(beds as Bed[]).length} bed{(beds as Bed[]).length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="p-2 grid grid-cols-4 md:grid-cols-6 gap-2">
                            {(beds as Bed[]).map((bed) => (
                              <label key={bed.id} className="flex items-center cursor-pointer group">
                                <input
                                  type="radio"
                                  name="bedId"
                                  value={bed.id}
                                  checked={formData.bedId === bed.id}
                                  onChange={() => handleBedSelect(bed)}
                                  className="sr-only"
                                />
                                <div className={`w-full p-2 rounded-lg border-2 text-center text-sm transition-all group-hover:shadow-sm ${formData.bedId === bed.id
                                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-25'
                                  }`}>
                                  <div className="font-medium text-xs">Bed {bed.bed_number}</div>
                                  {bed.department?.name && (
                                    <div className="text-xs text-gray-400 mt-1 truncate">
                                      {bed.department.name}
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Reason for Admission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Admission *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter the reason for admission..."
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Admitting...
                    </>
                  ) : (
                    'Admit Patient'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}