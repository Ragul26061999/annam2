'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Bed, BedDouble, Activity, AlertTriangle, Search,
  RefreshCw, ArrowLeft, Eye, LogOut, Clock, Calendar,
  Filter, Hash, Stethoscope, Building, ChevronRight,
  Heart, TrendingUp, CheckCircle, XCircle, Loader2,
  UserPlus, AlertCircle, Phone
} from 'lucide-react';
import { getDashboardStats, type DashboardStats } from '../../src/lib/dashboardService';
import {
  getBedAllocations,
  getBedStats,
  getAvailableBeds,
  type BedAllocation,
  type BedStats,
  type Bed as BedType
} from '../../src/lib/bedAllocationService';

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
  const [availableBedsList, setAvailableBedsList] = useState<BedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // admissionTypeFilter is removed since admission_type column doesn't exist in the database
  // const [admissionTypeFilter, setAdmissionTypeFilter] = useState('all');
  const [showAvailableBeds, setShowAvailableBeds] = useState(false);

  useEffect(() => {
    loadInpatientData();
  }, [statusFilter]);

  const loadInpatientData = async () => {
    try {
      setLoading(true);

      // Get dashboard stats
      const dashboardStats = await getDashboardStats();

      // Get bed stats
      const bedStats = await getBedStats();

      // Get active bed allocations
      const allocationResponse = await getBedAllocations({
        status: statusFilter === 'all' ? 'active' : statusFilter,
        limit: 50
      });

      // Get available beds
      const available = await getAvailableBeds();

      // Calculate today's admissions
      const today = new Date().toISOString().split('T')[0];
      const todayAdmissions = allocationResponse.allocations.filter(
        a => a.allocated_at?.startsWith(today)
      ).length;

      setStats({
        admittedPatients: dashboardStats.admittedPatients || 0,
        criticalPatients: dashboardStats.criticalPatients || 0,
        totalBeds: bedStats.total || dashboardStats.totalBeds || 0,
        occupiedBeds: bedStats.occupied || dashboardStats.occupiedBeds || 0,
        availableBeds: bedStats.available || dashboardStats.availableBeds || 0,
        occupancyRate: bedStats.occupancyRate || dashboardStats.bedOccupancyRate || 0,
        todayAdmissions,
        pendingDischarges: 0
      });

      setAllocations(allocationResponse.allocations);
      setAvailableBedsList(available);
      setError(null);
    } catch (err) {
      console.error('Error loading inpatient data:', err);
      setError('Failed to load inpatient data. The system may be experiencing connectivity issues.');
      // Still set loading to false to prevent infinite loading state
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

  const calculateDaysAdmitted = (allocatedAt: string) => {
    const admission = new Date(allocatedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - admission.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
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
          <button
            onClick={loadInpatientData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

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
              const daysAdmitted = calculateDaysAdmitted(allocation.allocated_at);

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
                          <span className="text-xs text-gray-500 font-mono">{patientId}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(allocation.status)}`}>
                            {allocation.status}
                          </span>
                          {/* Admission type removed since admission_type column doesn't exist in database */}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            {bedNumber} • {bedType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Stethoscope size={12} />
                            Dr. {doctorName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Admitted: {new Date(allocation.allocated_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 text-purple-600 font-medium">
                            <Clock size={12} />
                            {daysAdmitted} day{daysAdmitted !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {allocation.reason && (
                          <p className="text-sm text-gray-500 mt-1">
                            Reason: {allocation.reason}
                          </p>
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
                      {(allocation.status === 'active' || allocation.status === 'allocated') && (
                        <button
                          className="text-xs px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1"
                          title="Discharge Patient"
                        >
                          <LogOut size={14} />
                          Discharge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
