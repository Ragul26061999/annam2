'use client';
import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Search,
  Filter,
  Plus,
  Calendar,
  MapPin,
  Users,
  Clock,
  TrendingUp,
  Award,
  Activity,
  CheckCircle,
  Edit,
  Phone,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getAllDoctorsSimple, getDeletedDoctorsSimple, restoreDoctor, reorderDoctorSortOrder, updateDoctor, getAllSpecializations, addSpecialization, getAllDepartments, addDepartment, deleteDoctor, updateDoctorAvailability, listDoctorDocuments, uploadDoctorDocument, type Doctor, type DoctorRegistrationData, type DoctorDocument } from '../../src/lib/doctorService';
import { createDoctorAction } from '../actions/doctors';
import { supabase } from '../../src/lib/supabase';
import DoctorForm, { DoctorFormData } from '@/components/DoctorForm';
import CreateAccountModal from '@/src/components/CreateAccountModal';

// Color theme helpers for mixed color cards
const getCardGradient = (doctorId: string | undefined) => {
  const colors = [
    'bg-gradient-to-r from-blue-400 to-blue-500',
    'bg-gradient-to-r from-green-400 to-green-500',
    'bg-gradient-to-r from-purple-400 to-purple-500',
    'bg-gradient-to-r from-red-400 to-red-500',
    'bg-gradient-to-r from-indigo-400 to-indigo-500',
    'bg-gradient-to-r from-pink-400 to-pink-500'
  ];
  const index = doctorId ? doctorId.length % colors.length : 0;
  return colors[index];
};

const getCardButtonColors = (doctorId: string | undefined) => {
  const colorSets = [
    { schedule: 'bg-blue-50 text-blue-600 hover:bg-blue-100', edit: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { schedule: 'bg-green-50 text-green-600 hover:bg-green-100', edit: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { schedule: 'bg-purple-50 text-purple-600 hover:bg-purple-100', edit: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { schedule: 'bg-red-50 text-red-600 hover:bg-red-100', edit: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { schedule: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100', edit: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
    { schedule: 'bg-pink-50 text-pink-600 hover:bg-pink-100', edit: 'bg-pink-100 text-pink-700 hover:bg-pink-200' }
  ];
  const index = doctorId ? doctorId.length % colorSets.length : 0;
  return colorSets[index];
};

const getNextAvailableSlot = (doctor: Doctor) => {
  try {
    const availabilityData = doctor.availability_hours;
    if (!availabilityData || !availabilityData.availableSessions || !availabilityData.sessions) {
      return 'Not scheduled';
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const availableSessions = availabilityData.availableSessions;
    const sessions = availabilityData.sessions;
    const workingDays = availabilityData.workingDays || [1, 2, 3, 4, 5, 6]; // Default Mon-Sat

    // Helper function to parse time string to minutes
    const parseTimeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Check if today is a working day
    const isTodayWorkingDay = workingDays.includes(currentDay);

    // Find next available session today
    if (isTodayWorkingDay) {
      for (const sessionName of ['morning', 'afternoon', 'evening'] as const) {
        if (availableSessions.includes(sessionName) && sessions[sessionName]) {
          const session = sessions[sessionName];
          const startTime = session.startTime;
          if (startTime) {
            const sessionStartMinutes = parseTimeToMinutes(startTime);
            if (currentTime < sessionStartMinutes) {
              return `Today ${startTime}`;
            }
          }
        }
      }
    }

    // Find next working day with available sessions
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      if (workingDays.includes(nextDay)) {
        // Find the first available session for that day
        for (const sessionName of ['morning', 'afternoon', 'evening'] as const) {
          if (availableSessions.includes(sessionName) && sessions[sessionName]) {
            const dayName = i === 1 ? 'Tomorrow' : getDayName(nextDay);
            const startTime = sessions[sessionName].startTime || '09:00';
            return `${dayName} ${startTime}`;
          }
        }
      }
    }

    return 'Not available';
  } catch (error) {
    console.error('Error getting next available slot:', error);
    return 'Check schedule';
  }
};

const getDayName = (dayIndex: number) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
};

const getAvailabilityStatus = (doctor: Doctor) => {
  try {
    // Check the new availability_type field first
    if (doctor.availability_type) {
      if (doctor.availability_type === 'session_based') {
        return { status: 'Session Based', color: 'bg-green-100 text-green-700', type: 'session_based' };
      } else if (doctor.availability_type === 'on_call') {
        return { status: 'On Call', color: 'bg-orange-100 text-orange-700', type: 'on_call' };
      }
    }

    // Fallback to legacy logic for backward compatibility
    const availabilityData = doctor.availability_hours;
    if (!availabilityData || !availabilityData.availableSessions || availabilityData.availableSessions.length === 0) {
      return { status: 'Session Based', color: 'bg-green-100 text-green-700', type: 'session_based' };
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();
    const workingDays = availabilityData.workingDays || [1, 2, 3, 4, 5, 6];
    const availableSessions = availabilityData.availableSessions;
    const sessions = availabilityData.sessions;

    if (doctor.status !== 'active' && doctor.is_active !== true) {
      return { status: 'Session Based', color: 'bg-green-100 text-green-700', type: 'session_based' };
    }

    // Check if doctor is on call from availability_hours
    if (availabilityData.onCall || availabilityData.emergencyAvailable) {
      return { status: 'On Call', color: 'bg-orange-100 text-orange-700', type: 'on_call' };
    }

    // Default to session based
    return { status: 'Session Based', color: 'bg-green-100 text-green-700', type: 'session_based' };
  } catch {
    return { status: 'Session Based', color: 'bg-green-100 text-green-700', type: 'session_based' };
  }
};

const getSessionTimings = (doctor: Doctor) => {
  try {
    const availabilityData = doctor.availability_hours;
    if (!availabilityData || !availabilityData.availableSessions || !availabilityData.sessions) {
      return [];
    }

    const sessions = availabilityData.sessions;
    const availableSessions = availabilityData.availableSessions;

    return availableSessions.map((sessionName: string) => {
      const session = sessions[sessionName];
      if (session) {
        return {
          name: sessionName.charAt(0).toUpperCase() + sessionName.slice(1),
          time: `${session.startTime || '00:00'} - ${session.endTime || '00:00'}`
        };
      }
      return null;
    }).filter(Boolean);
  } catch {
    return [];
  }
};

// Interfaces now imported from DoctorForm component

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [deletedDoctors, setDeletedDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('All Specializations');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [viewTab, setViewTab] = useState<'overview' | 'appointments' | 'payments'>('overview');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorDocuments, setDoctorDocuments] = useState<DoctorDocument[]>([]);
  const [docType, setDocType] = useState<'aadhar' | 'certificate'>('aadhar');
  const [docDisplayName, setDocDisplayName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDoctors: 0,
    onDuty: 0,
    consultationsToday: 0,
    pendingAppointments: 0
  });

  const [formData, setFormData] = useState<DoctorFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    licenseNumber: '',
    specialization: '',
    department: '',
    qualification: '',
    consultationFee: 0,
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    workingDays: [1, 2, 3, 4, 5],
    roomNumber: '',
    floorNumber: 1,
    emergencyAvailable: false,
    sessions: {
      morning: { startTime: '09:00', endTime: '12:00' },
      afternoon: { startTime: '14:00', endTime: '17:00' },
      evening: { startTime: '18:00', endTime: '21:00' }
    },
    availableSessions: []
  });

  // Load data on component mount
  useEffect(() => {
    loadDoctors();
    loadSpecializations();
    loadDepartments();
  }, []);

  useEffect(() => {
    if (showDeleted) {
      loadDeletedDoctors();
    }
  }, [showDeleted]);

  // Filter doctors based on search and specialization
  useEffect(() => {
    let filtered = doctors;

    if (searchTerm) {
      filtered = filtered.filter(doctor =>
        doctor.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.license_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSpecialization !== 'All Specializations') {
      filtered = filtered.filter(doctor => doctor.specialization === selectedSpecialization);
    }

    setFilteredDoctors(filtered);
  }, [doctors, searchTerm, selectedSpecialization]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const doctorsData = await getAllDoctorsSimple();
      console.log('Loaded doctors data:', JSON.stringify(doctorsData, null, 2));
      setDoctors(doctorsData);
      setFilteredDoctors(doctorsData);

      // Calculate stats
      // Get real stats from database
      const totalDoctors = doctorsData.length;

      // Calculate doctors appearing today based on their working days and availability
      const todayDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const doctorsAppearingToday = doctorsData.filter(doctor => {
        if (doctor.status !== 'active') return false;

        const availabilityData = doctor.availability_hours;
        if (!availabilityData || !availabilityData.workingDays) {
          // Default working days if not specified (Mon-Fri)
          return [1, 2, 3, 4, 5].includes(todayDayOfWeek);
        }

        return availabilityData.workingDays.includes(todayDayOfWeek);
      }).length;

      // Get consultation stats from appointments
      const today = new Date().toISOString().split('T')[0];
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', today)
        .eq('status', 'completed');

      // Get pending appointments for today
      const { data: pendingAppointmentsData } = await supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', today)
        .in('status', ['scheduled', 'confirmed', 'pending']);

      setStats({
        totalDoctors,
        onDuty: doctorsAppearingToday,
        consultationsToday: appointmentsData?.length || 0,
        pendingAppointments: pendingAppointmentsData?.length || 0
      });
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedDoctors = async () => {
    try {
      const deleted = await getDeletedDoctorsSimple();
      setDeletedDoctors(deleted);
    } catch (error) {
      console.error('Error loading deleted doctors:', error);
    }
  };

  const loadSpecializations = async () => {
    try {
      const specs = await getAllSpecializations();
      setSpecializations(specs);
    } catch (error) {
      console.error('Error loading specializations:', error);
    }
  };

  const handleCreateSpecialization = async (name: string) => {
    try {
      await addSpecialization(name);
      await loadSpecializations();
    } catch (error) {
      console.error('Error in handleCreateSpecialization:', error);
      throw error;
    }
  };

  const loadDepartments = async () => {
    try {
      const depts = await getAllDepartments();
      setDepartments(depts);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleCreateDepartment = async (name: string) => {
    try {
      await addDepartment(name);
      await loadDepartments();
    } catch (error) {
      console.error('Error in handleCreateDepartment:', error);
      throw error;
    }
  };

  const handleAddDoctor = async () => {
    try {
      const result = await createDoctorAction({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        licenseNumber: formData.licenseNumber,
        specialization: formData.specialization,
        department: formData.department,
        qualification: formData.qualification,
        consultationFee: formData.consultationFee,
        workingHoursStart: formData.workingHoursStart,
        workingHoursEnd: formData.workingHoursEnd,
        workingDays: formData.workingDays,
        roomNumber: formData.roomNumber,
        floorNumber: formData.floorNumber,
        emergencyAvailable: formData.emergencyAvailable,
        sessions: formData.sessions,
        availableSessions: formData.availableSessions
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create doctor');
      }

      setShowAddModal(false);
      resetForm();
      loadDoctors();
    } catch (error: any) {
      console.error('Error adding doctor:', error);
      alert(error.message || 'Error adding doctor. Please try again.');
    }
  };

  const handleEditDoctor = async () => {
    if (!selectedDoctor) return;

    try {
      console.log('Starting doctor update for ID:', selectedDoctor.id);
      console.log('Form data being sent:', JSON.stringify(formData, null, 2));
      
      const updatedDoctor = await updateDoctor(selectedDoctor.id, formData);
      console.log('Updated doctor returned:', JSON.stringify(updatedDoctor, null, 2));
      
      setShowEditModal(false);
      setSelectedDoctor(null);
      resetForm();

      console.log('Reloading doctors list...');
      await loadDoctors();
    } catch (error) {
      console.error('Error updating doctor:', error);
      throw error;
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      licenseNumber: '',
      specialization: '',
      department: '',
      qualification: '',
      consultationFee: 0,
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      workingDays: [1, 2, 3, 4, 5],
      roomNumber: '',
      floorNumber: 1,
      emergencyAvailable: false,
      sessions: {
        morning: { startTime: '09:00', endTime: '12:00' },
        afternoon: { startTime: '14:00', endTime: '17:00' },
        evening: { startTime: '18:00', endTime: '21:00' }
      },
      availableSessions: []
    });
  };

  const handleDeleteDoctor = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate doctor "${name}"? The doctor will be hidden from lists and cannot be scheduled, but existing patient records will remain intact.`)) {
      return;
    }

    try {
      await deleteDoctor(id);
      loadDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      alert('Failed to deactivate doctor. Please try again.');
    }
  };

  const openEditModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);

    // Parse availability_hours to get sessions and available sessions
    let sessions = {
      morning: { startTime: '09:00', endTime: '12:00' },
      afternoon: { startTime: '14:00', endTime: '17:00' },
      evening: { startTime: '18:00', endTime: '21:00' }
    };
    let availableSessions: string[] = [];
    let availabilityWorkingDays: number[] | undefined;
    let availabilityEmergencyAvailable: boolean | undefined;
    let availabilityFloorNumber: number | undefined;
    let availabilityWorkingHoursStart: string | undefined;
    let availabilityWorkingHoursEnd: string | undefined;
    let availabilityDepartment: string | undefined;

    if (doctor.availability_hours) {
      try {
        const availabilityData = typeof doctor.availability_hours === 'string'
          ? JSON.parse(doctor.availability_hours)
          : doctor.availability_hours;

        if (availabilityData.sessions) {
          sessions = { ...sessions, ...availabilityData.sessions };
        }
        if (availabilityData.availableSessions) {
          availableSessions = availabilityData.availableSessions;
        }
        if (availabilityData.workingDays) {
          availabilityWorkingDays = availabilityData.workingDays;
        }
        if (typeof availabilityData.emergencyAvailable === 'boolean') {
          availabilityEmergencyAvailable = availabilityData.emergencyAvailable;
        }
        if (typeof availabilityData.floorNumber === 'number') {
          availabilityFloorNumber = availabilityData.floorNumber;
        }
        if (availabilityData.workingHoursStart) {
          availabilityWorkingHoursStart = availabilityData.workingHoursStart;
        }
        if (availabilityData.workingHoursEnd) {
          availabilityWorkingHoursEnd = availabilityData.workingHoursEnd;
        }
        if (availabilityData.department) {
          availabilityDepartment = availabilityData.department;
        }
      } catch (error) {
        console.error('Error parsing availability_hours:', error);
      }
    }

    setFormData({
      name: doctor.user?.name || '',
      email: doctor.user?.email || '',
      phone: doctor.user?.phone || '',
      address: doctor.user?.address || '',
      licenseNumber: doctor.license_number,
      specialization: doctor.specialization,
      department: doctor.department || availabilityDepartment || '',
      qualification: doctor.qualification,
      consultationFee: doctor.consultation_fee,
      workingHoursStart: doctor.working_hours_start || availabilityWorkingHoursStart || '09:00',
      workingHoursEnd: doctor.working_hours_end || availabilityWorkingHoursEnd || '17:00',
      workingDays: doctor.working_days || availabilityWorkingDays || [1, 2, 3, 4, 5],
      roomNumber: doctor.room_number,
      floorNumber: doctor.floor_number || availabilityFloorNumber || 1,
      emergencyAvailable: doctor.emergency_available ?? availabilityEmergencyAvailable ?? false,
      sessions,
      availableSessions
    });
    setShowEditModal(true);
  };

  const openScheduleModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowScheduleModal(true);
  };

  const openDocumentsModal = async (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowDocumentsModal(true);
    setDocType('aadhar');
    setDocDisplayName('');
    setDocFile(null);

    try {
      const docs = await listDoctorDocuments(doctor.id);
      setDoctorDocuments(docs);
    } catch (err) {
      console.error('Failed to load doctor documents:', err);
      setDoctorDocuments([]);
    }
  };

  const openViewModal = async (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowViewModal(true);
    setViewTab('overview');
    setAppointments([]);
  };

  const openCreateAccountModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsCreateAccountModalOpen(true);
  };

  const loadDoctorAppointments = async (doctor: Doctor) => {
    try {
      setAppointmentsLoading(true);

      const { data: encounters, error: encErr } = await supabase
        .from('encounter')
        .select('id, patient_id, start_at')
        .eq('clinician_id', doctor.user_id)
        .order('start_at', { ascending: false })
        .limit(50);

      if (encErr) throw encErr;
      const encounterIds = (encounters || []).map((e: any) => e.id);

      if (encounterIds.length === 0) {
        setAppointments([]);
        return;
      }

      const { data: appts, error: apptErr } = await supabase
        .from('appointment')
        .select('id, encounter_id, scheduled_at, duration_minutes, booking_method')
        .in('encounter_id', encounterIds)
        .order('scheduled_at', { ascending: false })
        .limit(50);

      if (apptErr) throw apptErr;
      setAppointments(appts || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const refreshDocuments = async () => {
    if (!selectedDoctor) return;
    const docs = await listDoctorDocuments(selectedDoctor.id);
    setDoctorDocuments(docs);
  };

  const openDocument = async (doc: DoctorDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('doctor-documents')
        .createSignedUrl(doc.storage_path, 60);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Failed to create signed url');
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to open document:', err);
      alert('Unable to open document. Storage permissions may be missing.');
    }
  };

  const handleAvailabilityToggle = async (doctor: Doctor, availabilityType: 'session_based' | 'on_call') => {
    try {
      // Update doctor availability status
      await updateDoctorAvailability(doctor.id, availabilityType);
      loadDoctors(); // Refresh the list
    } catch (error) {
      console.error('Error updating doctor availability:', error);
      alert('Failed to update doctor availability. Please try again.');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-gray-500 mt-1">Manage doctor profiles and schedules</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Plus size={16} className="mr-2" />
          Add Doctor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Doctors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDoctors}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">2 new this month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Available Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.onDuty}</p>
              <div className="flex items-center mt-2">
                <CheckCircle size={14} className="text-green-500 mr-1" />
                <span className="text-xs text-gray-500">
                  {stats.totalDoctors > 0 ? Math.round((stats.onDuty / stats.totalDoctors) * 100) : 0}% available
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Activity className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Consultations Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.consultationsToday}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">{stats.pendingAppointments} pending</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-300 to-orange-400 rounded-xl flex items-center justify-center">
              <Users className="text-white" size={20} />
            </div>
          </div>
        </div>


      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search doctors by name, specialization, license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </button>
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`flex items-center px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                showDeleted
                  ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showDeleted ? 'Show Active' : 'Show Deleted'}
            </button>
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option>All Specializations</option>
              {specializations.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Doctors */}
      {!showDeleted && viewMode === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">Order</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">Specialization</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">License</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        defaultValue={doctor.sort_order || 0}
                        onBlur={async (e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!Number.isFinite(v)) return;
                          try {
                            await reorderDoctorSortOrder(doctor.id, v);
                            await loadDoctors();
                          } catch (err) {
                            console.error('Failed to update sort order:', err);
                          }
                        }}
                        className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{doctor.user?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{doctor.specialization}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{doctor.license_number}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openViewModal(doctor)}
                          className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openDocumentsModal(doctor)}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100"
                        >
                          Documents
                        </button>
                        <button
                          onClick={() => openEditModal(doctor)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doctor.id, doctor.user?.name || 'Unknown')}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!showDeleted && viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredDoctors.map((doctor, idx) => {
          const cardGradient = getCardGradient(doctor.id);
          const availStatus = getAvailabilityStatus(doctor);
          const sessionTimings = getSessionTimings(doctor);
          const accentColors = [
            'from-blue-500 to-indigo-600',
            'from-emerald-500 to-teal-600',
            'from-violet-500 to-purple-600',
            'from-rose-500 to-pink-600',
            'from-amber-500 to-orange-600',
            'from-cyan-500 to-blue-600'
          ];
          const accent = accentColors[(doctor.id?.length || idx) % accentColors.length];

          return (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="group relative bg-white rounded-2xl shadow-sm border border-gray-100/80 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 overflow-hidden"
            >
              {/* Accent top bar */}
              <div className={`h-1 bg-gradient-to-r ${accent}`} />

              {/* Card body */}
              <div className="p-5">
                {/* Header: Avatar + Name + Fee badge */}
                <div className="flex items-start gap-3.5 mb-4">
                  <div className={`relative w-12 h-12 bg-gradient-to-br ${accent} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                    {getInitials(doctor.user?.name || 'Unknown')}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${availStatus.type === 'on_call' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-[15px] truncate leading-tight">{doctor.user?.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium tracking-wide">{doctor.license_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-gray-900">₹{doctor.consultation_fee}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">per visit</p>
                  </div>
                </div>

                {/* Info chips */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                    <Stethoscope size={11} />
                    {doctor.specialization}
                  </span>
                  {doctor.department && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium">
                      <Award size={11} />
                      {doctor.department}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium">
                    <Award size={11} />
                    {doctor.qualification}
                  </span>
                  {doctor.room_number && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium">
                      <MapPin size={11} />
                      Room {doctor.room_number}
                    </span>
                  )}
                </div>

                {/* Availability section */}
                <div className="bg-gray-50/80 rounded-xl p-3.5 mb-4 border border-gray-100/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${availStatus.color}`}>
                        {availStatus.type === 'on_call' ? <Phone size={10} /> : <CheckCircle size={10} />}
                        {availStatus.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Next: <span className="text-gray-700">{getNextAvailableSlot(doctor)}</span>
                    </span>
                  </div>
                  {sessionTimings.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      {sessionTimings.map((session: { name: string; time: string }, index: number) => (
                        <div key={index} className="bg-white rounded-lg px-2 py-1.5 text-center border border-gray-100/80">
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{session.name}</p>
                          <p className="text-[11px] font-medium text-gray-700 mt-0.5">{session.time}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 mt-1">No sessions configured</p>
                  )}
                </div>

                {/* Availability toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => handleAvailabilityToggle(doctor, 'session_based')}
                    className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                      availStatus.type === 'session_based'
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                    }`}
                  >
                    <CheckCircle size={11} className="mr-1" />
                    Session Based
                  </button>
                  <button
                    onClick={() => handleAvailabilityToggle(doctor, 'on_call')}
                    className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                      availStatus.type === 'on_call'
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                    }`}
                  >
                    <Phone size={11} className="mr-1" />
                    On Call
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 -mx-5 mb-3" />

                {/* Actions row */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    defaultValue={doctor.sort_order || 0}
                    onBlur={async (e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isFinite(v)) return;
                      try {
                        await reorderDoctorSortOrder(doctor.id, v);
                        await loadDoctors();
                      } catch (err) {
                        console.error('Failed to update sort order:', err);
                      }
                    }}
                    className="w-12 px-1.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-gray-50 text-center focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
                    title="Sort order"
                  />
                  <button
                    onClick={() => openViewModal(doctor)}
                    className="flex items-center justify-center h-8 px-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium transition-colors"
                    title="View"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openDocumentsModal(doctor)}
                    className="flex items-center justify-center h-8 px-3 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium transition-colors"
                    title="Documents"
                  >
                    Docs
                  </button>
                  <button
                    onClick={() => openScheduleModal(doctor)}
                    className="flex items-center justify-center h-8 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition-colors"
                    title="Schedule"
                  >
                    <Calendar size={12} className="mr-1" />
                    Schedule
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => openEditModal(doctor)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteDoctor(doctor.id, doctor.user?.name || 'Unknown')}
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Delete Doctor"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      ) : null}

      {showDeleted ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Deleted Doctors</h3>
            <span className="text-sm text-gray-500">{deletedDoctors.length} items</span>
          </div>
          <div className="divide-y divide-gray-100">
            {deletedDoctors.map((doctor) => (
              <div key={doctor.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{doctor.user?.name}</div>
                  <div className="text-sm text-gray-600">{doctor.specialization} • {doctor.license_number}</div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await restoreDoctor(doctor.id);
                      await loadDeletedDoctors();
                      await loadDoctors();
                    } catch (err) {
                      console.error('Failed to restore doctor:', err);
                      alert('Failed to restore doctor. Please try again.');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 font-medium text-sm"
                >
                  Reactivate
                </button>
              </div>
            ))}
            {deletedDoctors.length === 0 && (
              <div className="p-8 text-center text-gray-500">No deleted doctors.</div>
            )}
          </div>
        </div>
      ) : null}

      {/* Load More */}
      {filteredDoctors.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No doctors found matching your criteria.</p>
        </div>
      )}

      {/* Add Doctor Modal */}
      <DoctorForm
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        onSubmit={handleAddDoctor}
        formData={formData}
        setFormData={setFormData}
        specializations={specializations}
        departments={departments}
        isEditing={false}
        title="Add New Doctor"
        onAddDepartment={handleCreateDepartment}
        onAddSpecialization={handleCreateSpecialization}
      />

      {/* Edit Doctor Modal */}
      <DoctorForm
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedDoctor(null); resetForm(); }}
        onSubmit={handleEditDoctor}
        formData={formData}
        setFormData={setFormData}
        specializations={specializations}
        departments={departments}
        isEditing={true}
        title="Edit Doctor"
        onAddDepartment={handleCreateDepartment}
        onAddSpecialization={handleCreateSpecialization}
      />

      {/* Create Account Modal */}
      {selectedDoctor && (
        <CreateAccountModal
          isOpen={isCreateAccountModalOpen}
          onClose={() => setIsCreateAccountModalOpen(false)}
          onSuccess={() => loadDoctors()}
          entityId={selectedDoctor.id}
          entityType="doctor"
          name={selectedDoctor.user?.name || 'Unknown'}
          role="Doctor"
          initialEmail={selectedDoctor.user?.email}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowScheduleModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 ${getCardGradient(selectedDoctor.id)} rounded-xl flex items-center justify-center text-white font-bold text-sm mr-3`}>
                      {getInitials(selectedDoctor.user?.name || 'Unknown')}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{selectedDoctor.user?.name}</h3>
                      <p className="text-sm text-gray-500">{selectedDoctor.specialization}</p>
                    </div>
                  </div>
                  <button 
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowScheduleModal(false)}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center">
                      <div className="font-medium text-gray-900 mb-2">{day}</div>
                      <div className="space-y-2">
                        {Array.from({ length: 8 }, (_, i) => (
                          <div 
                            key={i}
                            className={`p-2 rounded-lg text-xs cursor-pointer ${
                              Math.random() > 0.7 ? 'bg-orange-100 text-orange-600' :
                              Math.random() > 0.5 ? 'bg-gray-100 text-gray-600' :
                              'bg-white border border-gray-200 hover:border-orange-200'
                            }`}
                          >
                            {`${9 + i}:00`}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="h-4 w-4 bg-orange-100 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">Booked</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-4 w-4 bg-gray-100 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">Unavailable</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-4 w-4 bg-white border border-gray-200 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">Available</span>
                    </div>
                  </div>
                  <button className="btn-primary">Save Schedule</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocumentsModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDocumentsModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Doctor Documents</h3>
                    <p className="text-sm text-gray-500">{selectedDoctor.user?.name}</p>
                  </div>
                  <button
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowDocumentsModal(false)}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 mb-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as 'aadhar' | 'certificate')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                      >
                        <option value="aadhar">Aadhar</option>
                        <option value="certificate">Certificate</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                      <input
                        type="text"
                        value={docDisplayName}
                        onChange={(e) => setDocDisplayName(e.target.value)}
                        placeholder="e.g., Aadhar Front / MBBS Certificate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <input
                      type="file"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="text-sm"
                    />
                    <button
                      onClick={async () => {
                        if (!docFile || !docDisplayName.trim()) {
                          alert('Please provide document name and choose a file.');
                          return;
                        }
                        try {
                          setDocBusy(true);
                          await uploadDoctorDocument({
                            doctorId: selectedDoctor.id,
                            docType,
                            displayName: docDisplayName.trim(),
                            file: docFile
                          });
                          setDocDisplayName('');
                          setDocFile(null);
                          await refreshDocuments();
                        } catch (err) {
                          console.error('Upload failed:', err);
                          alert('Upload failed. Storage permissions may be missing.');
                        } finally {
                          setDocBusy(false);
                        }
                      }}
                      disabled={docBusy}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm disabled:opacity-60"
                    >
                      {docBusy ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-700">Uploaded</div>
                    <button
                      onClick={async () => {
                        try {
                          await refreshDocuments();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="text-sm text-orange-700 hover:text-orange-800 font-medium"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {doctorDocuments.map((d) => (
                      <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{d.display_name}</div>
                          <div className="text-xs text-gray-500">{d.doc_type}</div>
                        </div>
                        <button
                          onClick={() => openDocument(d)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                        >
                          Open
                        </button>
                      </div>
                    ))}
                    {doctorDocuments.length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-500">No documents uploaded.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Doctor Modal */}
      {showViewModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowViewModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedDoctor.user?.name}</h3>
                    <p className="text-sm text-gray-500">{selectedDoctor.specialization} • {selectedDoctor.license_number}</p>
                  </div>
                  <button
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowViewModal(false)}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="border-b border-gray-200 mb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewTab('overview')}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg ${viewTab === 'overview' ? 'bg-orange-50 text-orange-700 border border-b-0 border-orange-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={async () => {
                        setViewTab('appointments');
                        await loadDoctorAppointments(selectedDoctor);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg ${viewTab === 'appointments' ? 'bg-orange-50 text-orange-700 border border-b-0 border-orange-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Appointments
                    </button>
                    <button
                      onClick={() => setViewTab('payments')}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg ${viewTab === 'payments' ? 'bg-orange-50 text-orange-700 border border-b-0 border-orange-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Payments
                    </button>
                  </div>
                </div>

                {viewTab === 'overview' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Contact</div>
                      <div className="text-sm text-gray-700">Email: {selectedDoctor.user?.email || '-'}</div>
                      <div className="text-sm text-gray-700">Phone: {selectedDoctor.user?.phone || '-'}</div>
                      <div className="text-sm text-gray-700">Address: {selectedDoctor.user?.address || '-'}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Work</div>
                      <div className="text-sm text-gray-700">Room: {selectedDoctor.room_number || '-'}</div>
                      <div className="text-sm text-gray-700">Floor: {selectedDoctor.floor_number ?? '-'}</div>
                      <div className="text-sm text-gray-700">Consultation Fee: ₹{selectedDoctor.consultation_fee ?? 0}</div>
                      <div className="text-sm text-gray-700">Availability Type: {selectedDoctor.availability_type || 'session_based'}</div>
                    </div>
                  </div>
                ) : null}

                {viewTab === 'appointments' ? (
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700">Recent Appointments</div>
                      <button
                        onClick={() => loadDoctorAppointments(selectedDoctor)}
                        className="text-sm text-orange-700 hover:text-orange-800 font-medium"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {appointmentsLoading ? (
                        <div className="px-4 py-8 text-center text-gray-500">Loading…</div>
                      ) : null}

                      {!appointmentsLoading && appointments.map((a) => (
                        <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{new Date(a.scheduled_at).toLocaleString()}</div>
                            <div className="text-xs text-gray-500">Duration: {a.duration_minutes} mins • Method: {a.booking_method}</div>
                          </div>
                          <div className="text-xs text-gray-500">#{String(a.id).slice(0, 8)}</div>
                        </div>
                      ))}

                      {!appointmentsLoading && appointments.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">No appointments found.</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {viewTab === 'payments' ? (
                  <div className="rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
                    Payments tab is inactive for now. We can integrate billing logic later.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}