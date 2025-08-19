'use client';

import React, { useState, useEffect } from 'react';
import { Prescription, getPrescriptions, updatePrescriptionStatus, getPrescriptionStats } from '../src/lib/prescriptionService';

interface PrescriptionListProps {
  doctorId?: string;
  patientId?: string;
  showStats?: boolean;
  onViewPrescription?: (prescription: Prescription) => void;
  onEditPrescription?: (prescription: Prescription) => void;
}

const PrescriptionList: React.FC<PrescriptionListProps> = ({
  doctorId,
  patientId,
  showStats = true,
  onViewPrescription,
  onEditPrescription
}) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [stats, setStats] = useState({
    totalPrescriptions: 0,
    activePrescriptions: 0,
    completedPrescriptions: 0,
    todayPrescriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const limit = 10;

  useEffect(() => {
    loadPrescriptions();
    if (showStats && doctorId) {
      loadStats();
    }
  }, [doctorId, patientId, currentPage, statusFilter, dateFilter]);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const options: any = {
        page: currentPage,
        limit,
      };

      if (doctorId) options.doctor_id = doctorId;
      if (patientId) options.patient_id = patientId;
      if (statusFilter) options.status = statusFilter;
      if (dateFilter) options.date_from = dateFilter;

      const result = await getPrescriptions(options);
      setPrescriptions(result.prescriptions);
      setTotalPages(Math.ceil(result.total / limit));
    } catch (err) {
      setError('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getPrescriptionStats(doctorId);
      if (!result.error) {
        setStats({
          totalPrescriptions: result.totalPrescriptions,
          activePrescriptions: result.activePrescriptions,
          completedPrescriptions: result.completedPrescriptions,
          todayPrescriptions: result.todayPrescriptions
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleStatusUpdate = async (prescriptionId: string, newStatus: 'active' | 'completed' | 'cancelled') => {
    try {
      const { prescription, error } = await updatePrescriptionStatus(prescriptionId, newStatus);
      if (error) {
        setError('Failed to update prescription status');
      } else {
        // Refresh the list
        loadPrescriptions();
        if (showStats && doctorId) {
          loadStats();
        }
      }
    } catch (err) {
      setError('Failed to update prescription status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && prescriptions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{stats.totalPrescriptions}</div>
            <div className="text-sm text-gray-600">Total Prescriptions</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">{stats.activePrescriptions}</div>
            <div className="text-sm text-gray-600">Active Prescriptions</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{stats.completedPrescriptions}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-purple-600">{stats.todayPrescriptions}</div>
            <div className="text-sm text-gray-600">Today's Prescriptions</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('');
                setDateFilter('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Prescriptions List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Prescriptions</h3>
        </div>

        {prescriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No prescriptions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {prescription.prescription_id}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prescription.status)}`}>
                        {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      {!patientId && prescription.patient && (
                        <div>
                          <span className="font-medium">Patient:</span> {prescription.patient.name}
                        </div>
                      )}
                      {!doctorId && prescription.doctor && (
                        <div>
                          <span className="font-medium">Doctor:</span> {prescription.doctor.user?.name}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Issue Date:</span> {formatDate(prescription.issue_date)}
                      </div>
                      {prescription.appointment && (
                        <div>
                          <span className="font-medium">Appointment:</span> {prescription.appointment.appointment_id}
                        </div>
                      )}
                    </div>

                    {/* Medicines */}
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 mb-2">Medicines:</h5>
                      <div className="space-y-1">
                        {prescription.medicines.map((medicine, index) => (
                          <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <span className="font-medium">{medicine.medicine_name}</span>
                            <span className="mx-2">•</span>
                            <span>{medicine.dosage}</span>
                            <span className="mx-2">•</span>
                            <span>{medicine.frequency}</span>
                            <span className="mx-2">•</span>
                            <span>{medicine.duration}</span>
                            {medicine.instructions && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="italic">{medicine.instructions}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {prescription.instructions && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900 mb-1">General Instructions:</h5>
                        <p className="text-sm text-gray-600">{prescription.instructions}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    {onViewPrescription && (
                      <button
                        onClick={() => onViewPrescription(prescription)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                      >
                        View
                      </button>
                    )}
                    {onEditPrescription && prescription.status === 'active' && (
                      <button
                        onClick={() => onEditPrescription(prescription)}
                        className="px-3 py-1 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded hover:bg-green-50"
                      >
                        Edit
                      </button>
                    )}
                    {prescription.status === 'active' && (
                      <button
                        onClick={() => handleStatusUpdate(prescription.id, 'completed')}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                      >
                        Complete
                      </button>
                    )}
                    {prescription.status === 'active' && (
                      <button
                        onClick={() => handleStatusUpdate(prescription.id, 'cancelled')}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionList;