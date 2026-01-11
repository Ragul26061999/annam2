'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Calendar, Clock, Stethoscope, Filter, Search,
  UserPlus, RefreshCw, Eye, CheckCircle, XCircle,
  AlertCircle, Phone, Hash, ArrowRight, Loader2,
  TrendingUp, Activity, User, X as CloseIcon,
  MoreVertical, Edit3, Trash2
} from 'lucide-react';
import { getDashboardStats } from '../../src/lib/dashboardService';
import { getAppointments, type Appointment } from '../../src/lib/appointmentService';
import { getPatientByUHID, registerNewPatient, getAllPatients } from '../../src/lib/patientService';
import { supabase } from '../../src/lib/supabase';

interface OutpatientStats {
  totalPatients: number;
  outpatientPatients: number;
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  waitingPatients: number;
  inConsultation: number;
}

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  date_of_birth: string;
  age?: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  blood_group: string;
  allergies: string;
  status: string;
  primary_complaint: string;
  diagnosis?: string;
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
  staff?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  consulting_doctor_name?: string;
  total_amount?: number;
}

export default function OutpatientContent() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<OutpatientStats>({
    totalPatients: 0,
    outpatientPatients: 0,
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    waitingPatients: 0,
    inConsultation: 0
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  // State for patient search
  const [searchedPatient, setSearchedPatient] = useState<any | null>(null);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  // Dropdown menu state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Check for registration success parameter
  useEffect(() => {
    if (searchParams && searchParams.get('registration') === 'success') {
      setShowRegistrationSuccess(true);
      // Hide the notification after 5 seconds
      const timer = setTimeout(() => {
        setShowRegistrationSuccess(false);
        // Remove the parameter from URL without reloading
        window.history.replaceState({}, document.title, '/outpatient');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    loadOutpatientData();

    // Auto-refresh every 30 seconds
    const intervalMs = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    if (intervalMs > 0) {
      interval = setInterval(() => {
        loadOutpatientData();
      }, intervalMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDate, statusFilter]);

  const fetchAdmittedCount = async () => {
    try {
      const { data, error } = await supabase
        .from('bed_allocations')
        .select('patient_id')
        .is('discharge_date', null)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching admitted count:', error);
        return 0;
      } else {
        return data?.length || 0;
      }
    } catch (err) {
      console.error('Error fetching admitted count:', err);
      return 0;
    }
  };

  const loadOutpatientData = async () => {
    try {
      setLoading(true);

      // Get general dashboard stats
      const dashboardStats = await getDashboardStats();

      // Get outpatient patients
      const response = await getAllPatients({
        page: 1,
        limit: 50,
        status: statusFilter === '' ? undefined : statusFilter,
        searchTerm: searchTerm || undefined
      });

      // Filter for outpatient patients only
      const outpatientPatients = response.patients.filter((p: any) => !p.is_admitted);

      // Calculate admitted count
      const admittedCount = await fetchAdmittedCount();

      // Calculate critical count
      const criticalCount = response.patients.filter((p: any) => p.is_critical).length;

      setStats({
        totalPatients: dashboardStats.totalPatients,
        outpatientPatients: outpatientPatients.length,
        todayAppointments: dashboardStats.todayAppointments,
        upcomingAppointments: dashboardStats.upcomingAppointments,
        completedAppointments: dashboardStats.completedAppointments,
        waitingPatients: response.patients.filter((p: any) => p.status === 'scheduled').length,
        inConsultation: response.patients.filter((p: any) => p.status === 'in_progress').length
      });

      setPatients(outpatientPatients);
      setError(null);
    } catch (err) {
      console.error('Error loading outpatient data:', err);
      setError('Failed to load outpatient data. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'in_progress': return <Activity className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
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

  const handlePatientSearch = async (patientId: string) => {
    if (!patientId.trim()) {
      setSearchedPatient(null);
      setPatientSearchError(null);
      return;
    }

    setPatientSearchLoading(true);
    setPatientSearchError(null);

    try {
      const patientData = await getPatientByUHID(patientId);
      setSearchedPatient(patientData);
    } catch (err) {
      console.error('Error searching patient:', err);
      setPatientSearchError('Patient not found. Please check the Patient ID.');
      setSearchedPatient(null);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  // Handle search term changes
  useEffect(() => {
    // If search term looks like a patient ID (starts with AH and has dash), search for patient
    if (searchTerm && searchTerm.match(/^AH\d{4}-\d{4}$/)) {
      handlePatientSearch(searchTerm);
    } else if (searchTerm && searchTerm.trim() !== '') {
      // For other search terms, we'll filter appointments as before
      setSearchedPatient(null);
    } else {
      setSearchedPatient(null);
      setPatientSearchError(null);
    }
  }, [searchTerm]);

  const filteredAppointments = appointments.filter(apt => {
    if (!searchTerm) return true;
    const patientName = apt.patient?.name?.toLowerCase() || '';
    const doctorName = apt.doctor?.user?.name?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase()) ||
      doctorName.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outpatient (OP) Management</h1>
          <p className="text-gray-600 mt-2">Manage outpatient appointments and patient visits</p>
        </div>
        <div className="flex gap-3">
          <Link href="/outpatient/create-outpatient">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <UserPlus className="h-4 w-4" />
              Register Outpatient
            </button>
          </Link>
        </div>
      </div>

      {/* Registration Success Notification */}
      {showRegistrationSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Registration Successful</h3>
              <p className="text-sm text-green-700">New patient has been registered and added to today's queue.</p>
            </div>
            <button
              onClick={() => setShowRegistrationSuccess(false)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Outpatients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total OP</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.outpatientPatients}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">All time</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">Appointments</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Waiting */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Waiting</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.waitingPatients}</p>
              <p className="text-xs text-gray-500 mt-1">In queue</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* In Consultation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">In Consult</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.inConsultation}</p>
              <p className="text-xs text-gray-500 mt-1">With doctor</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Stethoscope className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completedAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">Done today</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Quick Actions:</span>

          <Link href="/appointments">
            <button className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
              Book Appointment
            </button>
          </Link>
          <Link href="/inpatient">
            <button className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors flex items-center gap-1">
              Convert to IP <ArrowRight className="h-3 w-3" />
            </button>
          </Link>
          <Link href="/outpatient/patient-display">
            <button className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              View All Patients
            </button>
          </Link>
        </div>
      </div>

      {/* Patient Search Result */}
      {patientSearchLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
            <span>Searching for patient...</span>
          </div>
        </div>
      )}

      {patientSearchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Patient Not Found</h3>
              <p className="text-sm text-red-700">{patientSearchError}</p>
            </div>
          </div>
        </div>
      )}

      {searchedPatient && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Patient Information</h2>
            <Link href={`/patients/${searchedPatient.id}`}>
              <button className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <Eye size={14} />
                View Full Record
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {searchedPatient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'P'}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{searchedPatient.name || 'Unknown Patient'}</h3>
                <p className="text-sm text-gray-600">{searchedPatient.patient_id}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Phone size={14} className="mr-2" />
                <span>{searchedPatient.phone || 'No phone provided'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <User size={14} className="mr-2" />
                <span className="capitalize">{searchedPatient.gender || 'Not specified'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Hash size={14} className="mr-2" />
                <span>Blood Group: {searchedPatient.blood_group || 'Not specified'}</span>
              </div>
              {searchedPatient.allergies && (
                <div className="flex items-center text-sm text-red-600">
                  <AlertCircle size={14} className="mr-2" />
                  <span>Allergies: {searchedPatient.allergies}</span>
                </div>
              )}
            </div>
          </div>

          {searchedPatient.primary_complaint && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800">
                <span className="font-medium">Primary Complaint:</span> {searchedPatient.primary_complaint}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Outpatient Display Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Outpatient Overview</h2>
            <p className="text-sm text-gray-600">Recently registered outpatients</p>
          </div>
          <Link href="/outpatient/patient-display">
            <button className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              View All Patients
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>

        {patients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.slice(0, 3).map((patient) => (
              <div
                key={patient.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{patient.name}</h3>
                    <p className="text-gray-500 text-sm font-mono">{patient.patient_id}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Outpatient
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Age: {patient.age || calculateAge(patient.date_of_birth)} | {patient.gender}</span>
                  </div>

                  {(patient.diagnosis || patient.primary_complaint) && (
                    <div className="flex items-start gap-2">
                      <Stethoscope className="h-4 w-4 mt-0.5 text-blue-500" />
                      <div className="overflow-hidden">
                        <span className="truncate font-medium block" title={patient.diagnosis || patient.primary_complaint}>
                          {patient.diagnosis || (patient.primary_complaint && patient.primary_complaint.length > 30
                            ? `${patient.primary_complaint.substring(0, 30)}...`
                            : patient.primary_complaint)}
                        </span>
                        {patient.consulting_doctor_name && (
                          <span className="text-xs text-gray-500 italic">Dr. {patient.consulting_doctor_name}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'N/A'}</span>
                  </div>

                  {patient.total_amount && parseFloat(patient.total_amount.toString()) > 0 && (
                    <div className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 inline-block mt-1">
                      Fees Paid: ₹{patient.total_amount}
                    </div>
                  )}
                </div>

                {patient.staff && (
                  <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded border border-gray-100 italic">
                    <User size={10} className="text-blue-500" />
                    <span>Reg. By: {patient.staff.first_name} {patient.staff.last_name}</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href={`/patients/${patient.patient_id}`}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"
                  >
                    View Details
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No recent outpatients found</p>
          </div>
        )}
      </div>

      {/* Appointments Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Today's OP Queue</h2>
              <p className="text-sm text-gray-600">Manage outpatient visits for {new Date(selectedDate).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <Calendar size={14} className="mr-2 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent focus:outline-none"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by Patient ID, Name, Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Waiting</option>
                <option value="in_progress">In Consultation</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600 mb-6">There are no outpatient appointments matching your criteria.</p>
              {/* <Link href="/patients/enhanced-register">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                  Register New Patient
                </button>
              </Link> */}
            </div>
          ) : (
            filteredAppointments.map((appointment, index) => {
              const patientName = appointment.patient?.name || 'Unknown Patient';
              const doctorName = appointment.doctor?.user?.name || 'Unknown Doctor';
              const patientInitials = patientName.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase();

              return (
                <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Token Number */}
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{patientName}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                            {getStatusIcon(appointment.status)}
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {appointment.appointment_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Stethoscope size={12} />
                            Dr. {doctorName}
                          </span>
                          {appointment.chief_complaint && (
                            <span className="text-gray-500">
                              • {appointment.chief_complaint}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link href={`/patients/${appointment.patient_id}`}>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Patient">
                          <Eye size={18} />
                        </button>
                      </Link>
                      {appointment.status === 'scheduled' && (
                        <Link href="/inpatient">
                          <button className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                            Admit to IP
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
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