'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Bed, BedDouble, Activity, AlertTriangle, Search,
  RefreshCw, ArrowLeft, Eye, LogOut, Clock, Calendar,
  Filter, Hash, Stethoscope, Building, ChevronRight,
  Heart, TrendingUp, CheckCircle, XCircle, Loader2,
  UserPlus, AlertCircle, Phone, MoreVertical, Trash2, X, ClipboardList, FileText, Receipt
} from 'lucide-react';
import { getDashboardStats, type DashboardStats } from '../../src/lib/dashboardService';
import { deletePatient } from '../../src/lib/patientService';
import { getDischargeSummaryIdsByAllocations } from '../../src/lib/dischargeService';
import {
  getBedAllocations,
  getBedStats,
  getAvailableBeds,
  type BedAllocation,
  type BedStats,
  type Bed as BedType
} from '../../src/lib/bedAllocationService';
import IPatientPharmacyRecommendations from '../../src/components/IPatientPharmacyRecommendations';

interface InpatientStats {
  admittedPatients: number;
  criticalPatients: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  todayAdmissions: number;
  pendingDischarges: number;
}

export default function InpatientPage() {
  const [stats, setStats] = useState<InpatientStats>({
    admittedPatients: 0,
    criticalPatients: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    occupancyRate: 0,
    todayAdmissions: 0,
    pendingDischarges: 0
  });
  const [allocations, setAllocations] = useState<BedAllocation[]>([]);
  const [allAllocations, setAllAllocations] = useState<BedAllocation[]>([]); // For billing tab - all records
  const [dischargeSummaryByAllocation, setDischargeSummaryByAllocation] = useState<Record<string, string>>({});
  const [availableBedsList, setAvailableBedsList] = useState<BedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [billingSearchTerm, setBillingSearchTerm] = useState('');
  const [billingStatusFilter, setBillingStatusFilter] = useState('all');
  // admissionTypeFilter is removed since admission_type column doesn't exist in the database
  // const [admissionTypeFilter, setAdmissionTypeFilter] = useState('all');
  const [showAvailableBeds, setShowAvailableBeds] = useState(false);
  const [selectedPatientForPharmacy, setSelectedPatientForPharmacy] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'billing'>('overview');

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadInpatientData();
  }, [statusFilter]);

  const loadInpatientData = async () => {
    try {
      setLoading(true);

      // Add a timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Loading timeout')), 15000) // 15 second timeout
      );

      // Make all API calls in parallel for better performance
      const results = await Promise.race([
        Promise.allSettled([
          getDashboardStats(),
          getBedStats(),
          getBedAllocations({
            status: statusFilter === 'all' ? undefined : statusFilter,
            limit: 100
          }),
          getBedAllocations({
            status: undefined, // Get all statuses
            limit: 500 // Increase limit to get more historical records
          }),
          getAvailableBeds()
        ]),
        timeoutPromise
      ]);

      // Handle results with fallbacks
      const [
        dashboardStats,
        bedStats,
        allocationResponse,
        allAllocationResponse,
        available
      ] = results as PromiseSettledResult<any>[];

      const dashboardData = dashboardStats.status === 'fulfilled' ? dashboardStats.value : { admittedPatients: 0, criticalPatients: 0 };
      const bedData = bedStats.status === 'fulfilled' ? bedStats.value : { total: 0, occupied: 0, available: 0, occupancyRate: 0 };
      const allocationData = allocationResponse.status === 'fulfilled' ? allocationResponse.value : { allocations: [] };
      const allAllocationData = allAllocationResponse.status === 'fulfilled' ? allAllocationResponse.value : { allocations: [] };
      const availableData = available.status === 'fulfilled' ? available.value : [];

      // Calculate today's admissions
      const today = new Date().toISOString().split('T')[0];
      const todayAdmissions = allocationData.allocations.filter(
        (a: any) => a.admission_date?.startsWith(today)
      ).length;

      setStats({
        admittedPatients: dashboardData.admittedPatients || 0,
        criticalPatients: dashboardData.criticalPatients || 0,
        totalBeds: bedData.total || 0,
        occupiedBeds: bedData.occupied || 0,
        availableBeds: bedData.available || 0,
        occupancyRate: bedData.occupancyRate || 0,
        todayAdmissions,
        pendingDischarges: 0
      });

      setAllocations(allocationData.allocations);
      setAllAllocations(allAllocationData.allocations);

      // Load discharge summaries separately to avoid blocking main content
      if (allocationData.allocations.length > 0) {
        try {
          const allocationIds = allocationData.allocations.map((a: any) => a.id);
          const map = await getDischargeSummaryIdsByAllocations(allocationIds);
          setDischargeSummaryByAllocation(map);
        } catch (e) {
          console.error('Error loading discharge summaries for allocations:', e);
          setDischargeSummaryByAllocation({});
        }
      }
      
      setAvailableBedsList(availableData);
      
      // Set default selected patient for pharmacy recommendations
      if (allocationData.allocations.length > 0 && !selectedPatientForPharmacy) {
        setSelectedPatientForPharmacy(allocationData.allocations[0].patient_id);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading inpatient data:', err);
      if (err instanceof Error && err.message === 'Loading timeout') {
        setError('Loading is taking too long. Please check your connection and try again.');
      } else {
        setError('Failed to load inpatient data. The system may be experiencing connectivity issues.');
      }
      // Set default values to prevent empty state
      setStats({
        admittedPatients: 0,
        criticalPatients: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        availableBeds: 0,
        occupancyRate: 0,
        todayAdmissions: 0,
        pendingDischarges: 0
      });
      setAllocations([]);
      setAllAllocations([]);
      setAvailableBedsList([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'allocated': return 'bg-green-100 text-green-800';
      case 'discharged': return 'bg-gray-100 text-gray-800';
      case 'transferred': return 'bg-blue-100 text-blue-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // getAdmissionTypeColor function removed since admission_type column doesn't exist in database
  // const getAdmissionTypeColor = (type: string) => {
  //   switch (type?.toLowerCase()) {
  //     case 'emergency': return 'bg-red-100 text-red-700';
  //     case 'scheduled': return 'bg-blue-100 text-blue-700';
  //     case 'transfer': return 'bg-purple-100 text-purple-700';
  //     default: return 'bg-gray-100 text-gray-700';
  //   }
  // };

  const calculateDaysAdmitted = (admissionDate: string, dischargeDate?: string | null, status?: string) => {
    const admission = new Date(admissionDate);
    const end = (status === 'discharged' && dischargeDate) ? new Date(dischargeDate) : new Date();
    
    // Calculate difference in milliseconds
    const diffTime = Math.abs(end.getTime() - admission.getTime());
    // Convert to days (rounding up to count partial days as a day)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Ensure at least 1 day is shown if less than 24 hours
    return Math.max(1, diffDays);
  };

  const handleDeleteClick = (allocation: any) => {
    setPatientToDelete(allocation);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;

    setIsDeleting(true);
    try {
      await deletePatient(patientToDelete.patient_id);
      await loadInpatientData();
      alert(`Patient ${patientToDelete.patient?.name || 'Unknown'} has been permanently deleted from the database.`);
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setPatientToDelete(null);
    }
  };

  const filteredAllocations = allocations.filter(allocation => {
    if (!searchTerm) return true;
    const patientName = (allocation.patient?.name || '').toLowerCase();
    const patientId = allocation.patient?.uhid?.toLowerCase() || '';
    const bedNumber = allocation.bed?.bed_number?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase()) ||
      patientId.includes(searchTerm.toLowerCase()) ||
      bedNumber.includes(searchTerm.toLowerCase());
  });

  const filteredBillingAllocations = allAllocations.filter(allocation => {
    // Status filter
    if (billingStatusFilter !== 'all' && allocation.status !== billingStatusFilter) {
      return false;
    }
    
    // Search filter
    if (!billingSearchTerm) return true;
    const patientName = (allocation.patient?.name || '').toLowerCase();
    const patientId = allocation.patient?.uhid?.toLowerCase() || '';
    const bedNumber = allocation.bed?.bed_number?.toLowerCase() || '';
    return patientName.includes(billingSearchTerm.toLowerCase()) ||
      patientId.includes(billingSearchTerm.toLowerCase()) ||
      bedNumber.includes(billingSearchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
        <p className="text-gray-600 mb-2">Loading inpatient data...</p>
        <p className="text-sm text-gray-500">This may take a few moments</p>
        <button
          onClick={() => {
            setLoading(false);
            setError('Loading was cancelled. Please try again.');
          }}
          className="mt-4 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel Loading
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/outpatient">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inpatient (IP) Management</h1>
            <p className="text-gray-600 mt-1">Manage admitted patients and bed allocations</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/inpatient/create-inpatient">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <Bed className="h-4 w-4" />
              Register Inpatient
            </button>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              activeTab === 'billing'
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Billing
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Admitted Patients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Admitted</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.admittedPatients}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">Active patients</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Critical Patients */}
        <div className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Critical</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.criticalPatients}</p>
              <p className="text-xs text-gray-500 mt-1">Need attention</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>

        {/* Available Beds */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Available Beds</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.availableBeds}</p>
              <p className="text-xs text-gray-500 mt-1">of {stats.totalBeds} total</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <BedDouble className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Bed Occupancy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Occupancy</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.occupancyRate}%</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{ width: `${Math.min(stats.occupancyRate, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & OP to IP Flow */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
          <Link href="/outpatient">
            <button className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> View OP Queue
            </button>
          </Link>
          <button
            onClick={() => setShowAvailableBeds(!showAvailableBeds)}
            className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors flex items-center gap-1"
          >
            <BedDouble className="h-3 w-3" />
            Available Beds ({stats.availableBeds})
          </button>
        </div>
      </div>

      {/* Available Beds Section (Collapsible) */}
      {showAvailableBeds && availableBedsList.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-green-600" />
            Available Beds for Admission
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {availableBedsList.slice(0, 8).map((bed) => (
              <div key={bed.id} className="p-3 border border-green-100 rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{bed.bed_number}</p>
                    <p className="text-xs text-gray-500">
                      Room {bed.room_number} • Floor {bed.floor_number}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {bed.bed_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {availableBedsList.length > 8 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              +{availableBedsList.length - 8} more beds available
            </p>
          )}
        </div>
      )}

      {/* Admitted Patients Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Admitted Patients</h2>
              <p className="text-sm text-gray-600">Currently admitted inpatients with bed allocations</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search patient/bed..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="discharged">Discharged</option>
                <option value="transferred">Transferred</option>
              </select>
              {/* Admission type filter removed since admission_type column doesn't exist in database */}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredAllocations.length === 0 ? (
            <div className="text-center py-12">
              <BedDouble className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No admitted patients found</h3>
              <p className="text-gray-600 mb-6">There are no inpatients matching your criteria.</p>
            </div>
          ) : (
            filteredAllocations.map((allocation) => {
              const patientName = (allocation.patient?.name && typeof allocation.patient.name === 'string') ? allocation.patient.name.trim() || 'Unknown Patient' : 'Unknown Patient';
              const patientId = allocation.patient?.uhid || 'N/A';
              const bedNumber = allocation.bed?.bed_number || 'N/A';
              const bedType = allocation.bed?.bed_type || 'General';
              const doctorName = (allocation.doctor?.name && typeof allocation.doctor.name === 'string') ? allocation.doctor.name.trim() || 'Not Assigned' : 'Not Assigned';
              const daysAdmitted = calculateDaysAdmitted(allocation.admission_date, allocation.discharge_date, allocation.status);

              return (
                <div key={allocation.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Bed Info */}
                      <div className="w-14 h-14 bg-gradient-to-r from-purple-400 to-purple-500 rounded-xl flex flex-col items-center justify-center">
                        <BedDouble className="h-5 w-5 text-white" />
                        <span className="text-white text-xs font-bold mt-0.5">{bedNumber}</span>
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{patientName}</h3>
                          <span className="text-[10px] text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            {allocation.patient?.uhid || 'N/A'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full ${getStatusColor(allocation.status)}`}>
                            {allocation.status}
                          </span>
                          {allocation.patient?.is_critical && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-red-100 text-red-800 animate-pulse">
                              <AlertTriangle size={10} />
                              Critical
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-600">
                          <span className="flex items-center gap-1 font-medium">
                            {bedNumber} • {bedType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Stethoscope size={12} className="text-blue-500" />
                            Dr. {doctorName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-gray-400" />
                            Admitted: {new Date(allocation.admission_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 text-purple-600 font-bold">
                            <Clock size={12} />
                            {daysAdmitted} day{daysAdmitted !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Additional Info Row */}
                        <div className="mt-2 flex flex-wrap gap-3">
                          {allocation.patient?.diagnosis && (
                            <div className="text-xs text-gray-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center gap-1">
                              <Activity size={10} className="text-blue-600" />
                              <span className="font-medium">Diagnosis:</span>
                              <span className="truncate max-w-[200px]" title={allocation.patient.diagnosis}>
                                {allocation.patient.diagnosis}
                              </span>
                            </div>
                          )}

                          {allocation.reason && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <AlertCircle size={10} />
                              <span className="italic">Note: {allocation.reason}</span>
                            </div>
                          )}
                        </div>

                        {allocation.staff && (
                          <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded border border-gray-100 w-fit italic">
                            <Users size={12} className="text-purple-500" />
                            <span>Admitted By: {allocation.staff.first_name} {allocation.staff.last_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link href={`/patients/${allocation.patient_id}`}>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Patient">
                          <Eye size={18} />
                        </button>
                      </Link>

                      {dischargeSummaryByAllocation[allocation.id] && (
                        <Link href={`/inpatient/discharge/${allocation.id}?view=1`}>
                          <button
                            className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-1"
                            title="View Discharge Summary"
                          >
                            <Eye size={14} />
                            View Summary
                          </button>
                        </Link>
                      )}

                      {(allocation.status === 'active' || allocation.status === 'allocated') && (
                        <Link href={`/patients/${allocation.patient_id}?tab=clinical-records&subtab=discharge`}>
                          <button
                            className="text-xs px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors flex items-center gap-1"
                            title="Discharge Summary 2.0"
                          >
                            <FileText size={14} />
                            Discharge Summary 2.0
                          </button>
                        </Link>
                      )}

                      <Link href={`/patients/${allocation.patient_id}?tab=clinical-records&allocation=${allocation.id}`}>
                        <button
                          className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1"
                          title="Clinical Records"
                        >
                          <ClipboardList size={14} />
                          Clinical Records
                        </button>
                      </Link>

                      {(allocation.status === 'active' || allocation.status === 'allocated') && (
                        <Link href={`/inpatient/discharge/${allocation.id}`}>
                          <button
                            className="text-xs px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1"
                            title="Discharge Patient"
                          >
                            <LogOut size={14} />
                            Discharge
                          </button>
                        </Link>
                      )}
                      <button 
                        onClick={() => handleDeleteClick(allocation)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Patient"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pharmacy Recommendations Section */}
      {allocations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pharmacy Recommendations</h3>
              {allocations.length > 1 && (
                <select
                  value={selectedPatientForPharmacy}
                  onChange={(e) => setSelectedPatientForPharmacy(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Array.from(new Map(allocations.map(a => [a.patient_id, a])).values()).map((allocation) => (
                    <option key={allocation.patient_id} value={allocation.patient_id}>
                      {allocation.patient?.name || 'Unknown'} ({allocation.patient?.uhid || 'N/A'})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {(() => {
              const selectedAllocation = allocations.find(a => a.patient_id === selectedPatientForPharmacy);
              return (
                <IPatientPharmacyRecommendations
                  patientId={selectedAllocation?.patient_id || ''}
                  patientData={{
                    diagnosis: selectedAllocation?.patient?.diagnosis || '',
                    allergies: (selectedAllocation?.patient as any)?.allergies?.split(',').filter(Boolean) || [],
                    current_medications: (selectedAllocation?.patient as any)?.current_medications?.split(',').filter(Boolean) || []
                  }}
                  onRecommendationProcessed={() => {
                    // Refresh data when recommendations are processed
                    loadInpatientData();
                  }}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* OP to IP Connection Info */}
      <div className="bg-gradient-to-r from-orange-50 to-purple-50 rounded-xl p-6 border border-orange-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <ChevronRight className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">OP to IP Admission Flow</h3>
            <p className="text-sm text-gray-600 mb-4">
              Convert outpatients to inpatients when admission is required. The flow ensures proper bed allocation and patient tracking.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200">
                <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>OP Consultation</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 self-center" />
              <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>Doctor Recommends Admission</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 self-center" />
              <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>Select Available Bed</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 self-center" />
              <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200">
                <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span>IP Admission Complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'billing' && (
        <>
          {/* Billing Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total IP Records</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{allAllocations.length}</p>
                  <p className="text-xs text-gray-500 mt-1">All time admissions</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Active Patients</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{allAllocations.filter(a => a.status === 'active' || a.status === 'allocated').length}</p>
                  <p className="text-xs text-gray-500 mt-1">Currently admitted</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <BedDouble className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Discharged</p>
                  <p className="text-2xl font-bold text-gray-600 mt-1">{allAllocations.filter(a => a.status === 'discharged').length}</p>
                  <p className="text-xs text-gray-500 mt-1">Completed admissions</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* All IP Records for Billing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">All IP Records - Billing</h2>
                  <p className="text-sm text-gray-600">Complete list of all inpatient records with billing access</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search patient/bed..."
                      value={billingSearchTerm}
                      onChange={(e) => setBillingSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                    />
                  </div>
                  <select
                    value={billingStatusFilter}
                    onChange={(e) => setBillingStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="allocated">Allocated</option>
                    <option value="discharged">Discharged</option>
                    <option value="transferred">Transferred</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filteredBillingAllocations.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No IP records found</h3>
                  <p className="text-gray-600 mb-6">There are no inpatient records matching your criteria.</p>
                </div>
              ) : (
                filteredBillingAllocations.map((allocation, index) => {
                  const patientName = (allocation.patient?.name && typeof allocation.patient.name === 'string') ? allocation.patient.name.trim() || 'Unknown Patient' : 'Unknown Patient';
                  const patientId = allocation.patient?.uhid || 'N/A';
                  const bedNumber = allocation.bed?.bed_number || 'N/A';
                  const bedType = allocation.bed?.bed_type || 'General';
                  const doctorName = (allocation.doctor?.name && typeof allocation.doctor.name === 'string') ? allocation.doctor.name.trim() || 'Not Assigned' : 'Not Assigned';
                  const daysAdmitted = calculateDaysAdmitted(allocation.admission_date, allocation.discharge_date, allocation.status);

                  return (
                    <div key={allocation.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Bed Info */}
                          <div className="w-14 h-14 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl flex flex-col items-center justify-center">
                            <BedDouble className="h-5 w-5 text-white" />
                            <span className="text-white text-xs font-bold mt-0.5">{bedNumber}</span>
                          </div>

                          {/* Patient Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">{patientName}</h3>
                              <span className="text-[10px] text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                {allocation.patient?.uhid || 'N/A'}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full ${getStatusColor(allocation.status)}`}>
                                {allocation.status}
                              </span>
                              {allocation.patient?.is_critical && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-red-100 text-red-800 animate-pulse">
                                  <AlertTriangle size={10} />
                                  Critical
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-600">
                              <span className="flex items-center gap-1 font-medium">
                                {bedNumber} • {bedType}
                              </span>
                              <span className="flex items-center gap-1">
                                <Stethoscope size={12} className="text-blue-500" />
                                Dr. {doctorName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={12} className="text-gray-400" />
                                Admitted: {new Date(allocation.admission_date).toLocaleDateString()}
                              </span>
                              {allocation.discharge_date && (
                                <span className="flex items-center gap-1">
                                  <LogOut size={12} className="text-gray-400" />
                                  Discharged: {new Date(allocation.discharge_date).toLocaleDateString()}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-purple-600 font-bold">
                                <Clock size={12} />
                                {daysAdmitted} day{daysAdmitted !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Additional Info Row */}
                            <div className="mt-2 flex flex-wrap gap-3">
                              {allocation.patient?.diagnosis && (
                                <div className="text-xs text-gray-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center gap-1">
                                  <Activity size={10} className="text-blue-600" />
                                  <span className="font-medium">Diagnosis:</span>
                                  <span className="truncate max-w-[200px]" title={allocation.patient.diagnosis}>
                                    {allocation.patient.diagnosis}
                                  </span>
                                </div>
                              )}

                              {allocation.reason && (
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  <span className="italic">Note: {allocation.reason}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link href={`/inpatient/billing/${allocation.id}`}>
                            <button 
                              className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                              title="View Billing Details"
                            >
                              <Receipt size={14} />
                              View Bill
                            </button>
                          </Link>

                          <Link href={`/inpatient/billing-breakdown/${allocation.id}`}>
                            <button 
                              className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-1"
                              title="View Department-wise Breakdown Bill"
                            >
                              <FileText size={14} />
                              Breakdown Bill
                            </button>
                          </Link>

                          <Link href={`/patients/${allocation.patient_id}`}>
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Patient">
                              <Eye size={18} />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setError(null);
                  loadInpatientData();
                }}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && patientToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Patient</h2>
              </div>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setPatientToDelete(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this patient? <strong className="text-red-600">This action cannot be undone and will permanently remove all patient data from the database.</strong>
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-900 mb-1">Patient Details:</p>
                <p className="text-sm text-red-800">
                  <strong>Name:</strong> {patientToDelete.patient?.name || 'Unknown Patient'}
                </p>
                <p className="text-sm text-red-800">
                  <strong>UHID:</strong> {patientToDelete.patient_id}
                </p>
                <p className="text-sm text-red-800">
                  <strong>Phone:</strong> {patientToDelete.patient?.phone || 'N/A'}
                </p>
              </div>
              <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                <p className="text-xs text-yellow-800 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <strong>Warning:</strong> All associated records (appointments, vitals, medical history) will also be affected.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setPatientToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Patient
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
