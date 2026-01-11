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
  Edit
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getAllDoctorsSimple, createDoctor, updateDoctor, getAllSpecializations, getAllDepartments, addDepartment, deleteDoctor, type Doctor, type DoctorRegistrationData } from '../../src/lib/doctorService';
import { supabase } from '../../src/lib/supabase';
import DoctorForm, { DoctorFormData } from '@/components/DoctorForm';

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
    const availabilityData = doctor.availability_hours;
    if (!availabilityData || !availabilityData.availableSessions || availabilityData.availableSessions.length === 0) {
      return { status: 'No sessions', color: 'bg-gray-100 text-gray-700' };
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();
    const workingDays = availabilityData.workingDays || [1, 2, 3, 4, 5, 6];
    const availableSessions = availabilityData.availableSessions;
    const sessions = availabilityData.sessions;

    if (doctor.status !== 'active') {
      return { status: 'Inactive', color: 'bg-red-100 text-red-700' };
    }

    // Helper function to parse time string to minutes
    const parseTimeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const isTodayWorkingDay = workingDays.includes(currentDay);

    if (isTodayWorkingDay) {
      // Check if there are any upcoming sessions today
      let hasUpcomingSessions = false;
      let allSessionsOver = true;

      for (const sessionName of ['morning', 'afternoon', 'evening'] as const) {
        if (availableSessions.includes(sessionName) && sessions[sessionName]) {
          const session = sessions[sessionName];
          if (session.startTime) {
            const sessionStartMinutes = parseTimeToMinutes(session.startTime);
            if (currentTime < sessionStartMinutes) {
              hasUpcomingSessions = true;
              allSessionsOver = false;
              break;
            }
            // If we have session data, we know sessions exist for today
            allSessionsOver = false;
          }
        }
      }

      if (hasUpcomingSessions) {
        return { status: 'Available Today', color: 'bg-green-100 text-green-700' };
      } else if (!allSessionsOver) {
        // Sessions exist but all are over for today
        return { status: 'Duty Over', color: 'bg-orange-100 text-orange-700' };
      }
    }

    // Find next working day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      if (workingDays.includes(nextDay)) {
        const dayName = i === 1 ? 'Tomorrow' : getDayName(nextDay);
        return { status: `Next: ${dayName}`, color: 'bg-blue-100 text-blue-700' };
      }
    }

    return { status: 'No schedule', color: 'bg-gray-100 text-gray-700' };
  } catch {
    return { status: 'Check schedule', color: 'bg-yellow-100 text-yellow-700' };
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
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('All Specializations');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
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
    experienceYears: 0,
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

  const loadSpecializations = async () => {
    try {
      const specs = await getAllSpecializations();
      setSpecializations(specs);
    } catch (error) {
      console.error('Error loading specializations:', error);
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
      const doctorData: DoctorRegistrationData = {
        doctorId: '', // This will be generated automatically
        ...formData,
        sessions: formData.sessions,
        availableSessions: formData.availableSessions
      };

      await createDoctor(doctorData);
      setShowAddModal(false);
      resetForm();
      loadDoctors();
    } catch (error) {
      console.error('Error adding doctor:', error);
      alert('Error adding doctor. Please try again.');
    }
  };

  const handleEditDoctor = async () => {
    if (!selectedDoctor) return;

    try {
      await updateDoctor(selectedDoctor.id, formData);
      setShowEditModal(false);
      setSelectedDoctor(null);
      resetForm();
      loadDoctors();
    } catch (error) {
      console.error('Error updating doctor:', error);
      alert('Error updating doctor. Please try again.');
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
      experienceYears: 0,
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
      department: doctor.department || '',
      qualification: doctor.qualification,
      experienceYears: doctor.years_of_experience,
      consultationFee: doctor.consultation_fee,
      workingHoursStart: doctor.working_hours_start || '09:00',
      workingHoursEnd: doctor.working_hours_end || '17:00',
      workingDays: doctor.working_days || [1, 2, 3, 4, 5],
      roomNumber: doctor.room_number,
      floorNumber: doctor.floor_number || 1,
      emergencyAvailable: doctor.emergency_available || false,
      sessions,
      availableSessions
    });
    setShowEditModal(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatExperience = (years: number) => {
    return years === 1 ? '1 year exp' : `${years} years exp`;
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

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDoctors.map((doctor) => {
          const buttonColors = getCardButtonColors(doctor.id);
          const cardGradient = getCardGradient(doctor.id);

          return (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`w-12 h-12 ${cardGradient} rounded-xl flex items-center justify-center text-white font-bold text-sm`}>
                    {getInitials(doctor.user?.name || 'Unknown')}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{doctor.user?.name}</h3>
                    <p className="text-sm text-gray-500">{doctor.license_number}</p>
                  </div>
                </div>
                              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Stethoscope size={14} className="mr-2" />
                  {doctor.specialization} • {formatExperience(doctor.experience_years || 0)}
                </div>
                {doctor.department && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Award size={14} className="mr-2" />
                    Department: {doctor.department}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Award size={14} className="mr-2" />
                  {doctor.qualification}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin size={14} className="mr-2" />
                  Room {doctor.room_number}
                </div>
              </div>

              <div className={`${cardGradient.replace('bg-gradient-to-r', 'bg-gradient-to-r').replace('400', '50').replace('500', '100')} rounded-xl p-3 mb-4`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">Availability</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getAvailabilityStatus(doctor).color}`}>
                    {getAvailabilityStatus(doctor).status}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">Next slot: {getNextAvailableSlot(doctor)}</p>
                  {getSessionTimings(doctor).length > 0 && (
                    <div className="text-xs text-gray-600">
                      <p className="font-medium mb-1">Sessions:</p>
                      {getSessionTimings(doctor).map((session: { name: string; time: string }, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{session.name}: {session.time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm font-medium text-gray-900">
                    {doctor.availability_hours?.availableSessions?.length || 0} sessions
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({doctor.availability_hours?.availableSessions?.join(', ') || 'None'})
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₹{doctor.consultation_fee}</p>
                  <p className="text-xs text-gray-500">Consultation</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className={`flex-1 flex items-center justify-center ${buttonColors.schedule} py-2 px-3 rounded-xl text-sm font-medium transition-colors`}>
                  <Calendar size={14} className="mr-1" />
                  Schedule
                </button>
                <button
                  onClick={() => openEditModal(doctor)}
                  className={`flex-1 flex items-center justify-center ${buttonColors.edit} py-2 px-3 rounded-xl text-sm font-medium transition-colors`}
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteDoctor(doctor.id, doctor.user?.name || 'Unknown')}
                  className="flex-1 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 py-2 px-3 rounded-xl text-sm font-medium transition-colors"
                  title="Delete Doctor"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

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
      />
    </div>
  );
}