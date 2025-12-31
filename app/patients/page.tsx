'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Edit3,
  MoreVertical,
  UserPlus,
  Calendar,
  Phone,
  MapPin,
  Heart,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock,
  RefreshCw,
  Hash,
  AlertTriangle,
  Bed,
  LogOut,
  Trash2,
  X
} from 'lucide-react';
import { getAllPatients, updatePatientStatus, updatePatientCriticalStatus, updatePatientAdmissionStatus, getDailyPatientStats, deletePatient } from '../../src/lib/patientService';
import { supabase } from '../../src/lib/supabase';
import AdmissionModal from '../../src/components/AdmissionModal';
import DischargeModal from '../../src/components/DischargeModal';

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  blood_group: string;
  allergies: string;
  status: string;
  primary_complaint: string;
  admission_type: string;
  department_ward: string;
  room_number: string;
  created_at: string;
  is_critical?: boolean;
  is_admitted?: boolean;
  // Bed allocation fields
  bed_id?: string | null;
  admission_date?: string | null;
  discharge_date?: string | null;
  // New outpatient fields
  age?: number;
  diagnosis?: string;
  height?: string;
  weight?: string;
  bmi?: string;
  temperature?: string;
  temp_unit?: string;
  bp_systolic?: string;
  bp_diastolic?: string;
  pulse?: string;
  spo2?: string;
  respiratory_rate?: string;
  random_blood_sugar?: string;
  op_card_amount?: string;
  consultation_fee?: string;
  total_amount?: string;
  payment_mode?: string;
  consulting_doctor_name?: string;
  staff?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [totalPatients, setTotalPatients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    newToday: 0,
    outpatientToday: 0,
    inpatientToday: 0
  });

  // Admission modal state
  const [admissionModalOpen, setAdmissionModalOpen] = useState(false);
  const [selectedPatientForAdmission, setSelectedPatientForAdmission] = useState<Patient | null>(null);

  // Discharge modal state
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [selectedPatientForDischarge, setSelectedPatientForDischarge] = useState<Patient | null>(null);

  // Dropdown menu state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPatients();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPatients();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentPage, statusFilter, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);



  const handleStatusUpdate = async (patientId: string, isCritical: boolean) => {
    try {
      // Get current patient data to preserve is_admitted status
      const currentPatient = patients.find(p => p.patient_id === patientId);

      if (!currentPatient) {
        console.error('Patient not found in local state:', patientId);
        alert('Patient not found. Please refresh the page.');
        return;
      }

      console.log('Updating critical status for patient:', patientId, 'to:', isCritical);
      console.log('Current patient data:', currentPatient);

      // Pass the current is_admitted value (default to false if undefined)
      await updatePatientStatus(patientId, currentPatient.is_admitted ?? false, isCritical);
      await fetchPatients(); // Reload to get fresh data
    } catch (err) {
      console.error('Error updating patient status:', err);
      alert('Failed to update patient status. Please try again.');
    }
  };


  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the patient service to get patients
      const response = await getAllPatients({
        page: currentPage,
        limit: 20,
        status: statusFilter === '' ? undefined : statusFilter,
        searchTerm: searchTerm || undefined
      });

      setPatients(response.patients);
      setTotalPatients(response.total);

      // Fetch total counts for stats cards
      const stats = await getDailyPatientStats();
      setDailyStats(stats);

    } catch (err) {
      console.error('Error:', err);
      setError('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPatients();
    setRefreshing(false);
  };

  const handleAdmitPatient = (patient: Patient) => {
    setSelectedPatientForAdmission(patient);
    setAdmissionModalOpen(true);
  };

  const handleAdmissionSuccess = () => {
    // Refresh the patients list to show updated admission status
    fetchPatients();
  };

  const handleDischargePatient = (patient: Patient) => {
    setSelectedPatientForDischarge(patient);
    setDischargeModalOpen(true);
  };

  const handleDischargeSuccess = () => {
    // Refresh the patients list to show updated discharge status
    fetchPatients();
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 'N/A';
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'stable':
        return 'bg-green-100 text-green-800';
      case 'recovering':
        return 'bg-orange-100 text-orange-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to determine if patient is admitted
  const isPatientAdmitted = (patient: Patient) => {
    return patient.is_admitted || false;
  };

  // Function to determine if patient is critical
  const isPatientCritical = (patient: Patient) => {
    return patient.is_critical || false;
  };

  const getTruncatedText = (text: string, maxLength: number = 30) => {
    if (!text) return 'Not specified';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const handleDeleteClick = (patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteConfirmOpen(true);
    setOpenDropdownId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;

    setIsDeleting(true);
    try {
      // Permanently delete patient from database
      await deletePatient(patientToDelete.patient_id);

      // Refresh the patient list
      await fetchPatients();

      alert(`Patient ${patientToDelete.name} has been permanently deleted from the database.`);
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setPatientToDelete(null);
    }
  };

  const toggleDropdown = (patientId: string) => {
    setOpenDropdownId(openDropdownId === patientId ? null : patientId);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getGradientColors = (name: string) => {
    const colors = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-pink-500 to-rose-500',
      'from-cyan-500 to-blue-500',
      'from-emerald-500 to-green-500'
    ];

    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  };

  // Calculate stats from real data
  const stats = {
    total: totalPatients,
    newToday: dailyStats.newToday,
    outpatient: dailyStats.outpatientToday,
    inpatient: dailyStats.inpatientToday
  };

  // Filter patients based on search and status
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = !searchTerm ||
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.includes(searchTerm);

    const matchesStatus = !statusFilter ||
      (statusFilter === 'critical' && isPatientCritical(patient)) ||
      (statusFilter === 'admitted' && isPatientAdmitted(patient)) ||
      (statusFilter === 'active' && patient.status === 'active');

    return matchesSearch && matchesStatus;
  });

  if (loading && patients.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 mt-1">Manage patient records and information</p>
        </div>
        <div className="flex gap-3">
        </div>      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.newToday.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">Today</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Outpatients</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.outpatient.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">New Today</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Inpatients</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inpatient.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <Bed className="h-3 w-3 text-purple-500 mr-1" />
                <span className="text-sm font-medium text-purple-600">New Today</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Bed className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search patients by name, ID, or phone..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="critical">Critical</option>
              <option value="admitted">Admitted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Patients Grid */}
      {patients.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div key={patient.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`w-12 h-12 bg-gradient-to-r ${getGradientColors(patient.name)} rounded-xl flex items-center justify-center text-white font-bold text-sm`}>
                    {getInitials(patient.name)}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                    <div className="flex items-center gap-2">
                      <Hash className="h-3 w-3 text-gray-400" />
                      <p className="text-sm text-orange-600 font-mono">{patient.patient_id}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Show Critical badge for emergency patients */}
                  {isPatientCritical(patient) && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                      <AlertCircle size={10} />
                      Critical
                    </span>
                  )}

                  {/* Show Admitted badge only for patients with bed allocation */}
                  {isPatientAdmitted(patient) && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle size={10} />
                      Admitted
                    </span>
                  )}

                  {/* Dropdown Menu */}
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => toggleDropdown(patient.id)}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical size={16} className="text-gray-500" />
                    </button>

                    {openDropdownId === patient.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 dropdown-container">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              router.push(`/patients/${patient.id}`);
                              setOpenDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Eye size={14} />
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              router.push(`/patients/${patient.id}`);
                              setOpenDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Edit3 size={14} />
                            Edit Patient
                          </button>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={() => handleDeleteClick(patient)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            Delete Patient
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar size={14} className="mr-2 text-blue-500" />
                  <span className="font-medium">
                    Age: {patient.age || calculateAge(patient.date_of_birth)} • {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1)} • {patient.blood_group || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={14} className="mr-2 text-green-500" />
                  {patient.phone}
                </div>
                <div className="flex items-start text-sm text-gray-600">
                  <MapPin size={14} className="mr-2 mt-1 text-red-500" />
                  {getTruncatedText(patient.address, 35)}
                </div>

                {/* Vitals summary if available */}
                {(patient.bmi || patient.bp_systolic || patient.pulse) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {patient.bmi && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-bold border border-green-100">
                        BMI: {patient.bmi}
                      </span>
                    )}
                    {patient.bp_systolic && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">
                        BP: {patient.bp_systolic}/{patient.bp_diastolic}
                      </span>
                    )}
                    {patient.pulse && (
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-bold border border-orange-100">
                        Pulse: {patient.pulse}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {patient.primary_complaint && (
                <div className="bg-orange-50 rounded-xl p-3 mb-4">
                  <p className="text-xs font-medium text-orange-700 mb-1">Primary Complaint</p>
                  <p className="text-sm text-orange-900">{getTruncatedText(patient.primary_complaint, 50)}</p>
                </div>
              )}

              {patient.department_ward && (
                <div className="bg-blue-50 rounded-xl p-3 mb-4">
                  <p className="text-xs font-medium text-blue-700 mb-1">Current Department</p>
                  <p className="text-sm text-blue-900">{patient.department_ward} {patient.room_number && `- ${patient.room_number}`}</p>
                </div>
              )}

              {patient.allergies && (
                <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
                  <p className="text-xs font-medium text-red-700 mb-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    Allergies
                  </p>
                  <p className="text-sm text-red-900">{getTruncatedText(patient.allergies, 40)}</p>
                </div>
              )}

              {/* Admission Information */}
              {patient.admission_type && (
                <div className="bg-purple-50 rounded-xl p-3 mb-4">
                  <p className="text-xs font-medium text-purple-700 mb-1">Admission Type</p>
                  <p className="text-sm text-purple-900 capitalize italic font-medium">{patient.admission_type}</p>
                </div>
              )}

              {/* Registered By Staff */}
              {patient.staff && (
                <div className="bg-green-50 rounded-xl p-3 mb-4 border border-green-100">
                  <p className="text-xs font-medium text-green-700 mb-1 flex items-center">
                    <Users size={12} className="mr-1" />
                    Registered By
                  </p>
                  <p className="text-sm text-green-900 font-medium">
                    {patient.staff.first_name} {patient.staff.last_name}
                    <span className="text-xs text-green-600 ml-1">({patient.staff.employee_id})</span>
                  </p>
                </div>
              )}

              {/* Patient Status Controls */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Patient Status</p>
                <div className="space-y-2">
                  {/* Critical Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Critical Status</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name={`critical-${patient.id}`}
                          checked={patient.is_critical || false}
                          onChange={() => handleStatusUpdate(patient.patient_id, true)}
                          className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="ml-1.5 text-xs font-medium text-red-700 group-hover:text-red-800">Critical</span>
                      </label>
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name={`critical-${patient.id}`}
                          checked={!patient.is_critical}
                          onChange={() => handleStatusUpdate(patient.patient_id, false)}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="ml-1.5 text-xs font-medium text-green-700 group-hover:text-green-800">Stable</span>
                      </label>
                    </div>
                  </div>

                  {/* Admission Status Display - Read only based on bed allocation */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Admission Status</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${isPatientAdmitted(patient)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                        }`}>
                        {isPatientAdmitted(patient) ? 'Admitted' : 'Outpatient'}
                      </span>
                      {!isPatientAdmitted(patient) ? (
                        <button
                          onClick={() => handleAdmitPatient(patient)}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors flex items-center gap-1"
                        >
                          <Bed size={10} />
                          Admit
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDischargePatient(patient)}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center gap-1"
                        >
                          <LogOut size={10} />
                          Discharge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/patients/${patient.patient_id}`} className="flex-1">
                  <button className="w-full flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
                    <Eye size={14} className="mr-1" />
                    View
                  </button>
                </Link>
                <button
                  onClick={() => router.push(`/patients/${patient.patient_id}/edit`)}
                  className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  <Edit3 size={14} className="mr-1" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter ? 'Try adjusting your search or filters.' : 'Start by registering your first patient.'}
            </p>
            <Link href="/patients/register">
              <button className="bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors font-medium">
                Register New Patient
              </button>
            </Link>
          </div>
        )
      )}

      {/* Pagination */}
      {totalPatients > 20 && (
        <div className="flex justify-center">
          <div className="bg-white rounded-xl border border-gray-200 p-2">
            <p className="text-sm text-gray-600 px-4 py-2">
              Showing {patients.length} of {totalPatients} patients
            </p>
          </div>
        </div>
      )}

      {/* Admission Modal */}
      {selectedPatientForAdmission && (
        <AdmissionModal
          isOpen={admissionModalOpen}
          onClose={() => {
            setAdmissionModalOpen(false);
            setSelectedPatientForAdmission(null);
          }}
          patient={selectedPatientForAdmission}
          onSuccess={handleAdmissionSuccess}
        />
      )}

      {/* Discharge Modal */}
      {selectedPatientForDischarge && (
        <DischargeModal
          isOpen={dischargeModalOpen}
          onClose={() => {
            setDischargeModalOpen(false);
            setSelectedPatientForDischarge(null);
          }}
          patient={selectedPatientForDischarge}
          onDischargeSuccess={handleDischargeSuccess}
        />
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
                  <strong>Name:</strong> {patientToDelete.name}
                </p>
                <p className="text-sm text-red-800">
                  <strong>UHID:</strong> {patientToDelete.patient_id}
                </p>
                <p className="text-sm text-red-800">
                  <strong>Phone:</strong> {patientToDelete.phone}
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