'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Calendar, MoreVertical, ChevronLeft, ChevronRight, Heart, Brain, Settings as Lungs, Baby, UserRound, Clock, MapPin, Phone, Mail, Award, Stethoscope, Save, X, User, Building, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllDoctors, createDoctor, updateDoctor, getDoctorsBySpecialization, getAllSpecializations, getAllDepartments, addDepartment, updateDoctorAvailability, deleteDoctor, type Doctor, type DoctorRegistrationData } from '../src/lib/doctorService';
import { Check } from 'lucide-react';

// Department definitions with icons
const departmentIcons: Record<string, { icon: any; color: string }> = {
  'Cardiology': { icon: Heart, color: 'text-red-500 bg-red-100' },
  'Neurology': { icon: Brain, color: 'text-purple-500 bg-purple-100' },
  'Pulmonology': { icon: Lungs, color: 'text-blue-500 bg-blue-100' },
  'Pediatrics': { icon: Baby, color: 'text-green-500 bg-green-100' },
  'Obstetrics': { icon: UserRound, color: 'text-pink-500 bg-pink-100' },
  'General': { icon: Stethoscope, color: 'text-gray-500 bg-gray-100' },
};

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

const getTableButtonColors = (doctorId: string | undefined) => {
  const colorSets = [
    { schedule: 'text-blue-600 hover:bg-blue-50', edit: 'text-blue-700 hover:bg-blue-100' },
    { schedule: 'text-green-600 hover:bg-green-50', edit: 'text-green-700 hover:bg-green-100' },
    { schedule: 'text-purple-600 hover:bg-purple-50', edit: 'text-purple-700 hover:bg-purple-100' },
    { schedule: 'text-red-600 hover:bg-red-50', edit: 'text-red-700 hover:bg-red-100' },
    { schedule: 'text-indigo-600 hover:bg-indigo-50', edit: 'text-indigo-700 hover:bg-indigo-100' },
    { schedule: 'text-pink-600 hover:bg-pink-50', edit: 'text-pink-700 hover:bg-pink-100' }
  ];
  const index = doctorId ? doctorId.length % colorSets.length : 0;
  return colorSets[index];
};

interface SessionTiming {
  startTime: string;
  endTime: string;
  maxPatients: number;
}

interface DoctorFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  licenseNumber: string;
  specialization: string;
  department: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[];
  roomNumber: string;
  floorNumber: number;
  emergencyAvailable: boolean;
  // Enhanced session-based availability
  sessions: {
    morning: SessionTiming;
    afternoon: SessionTiming;
    evening: SessionTiming;
  };
  availableSessions: string[]; // ['morning', 'afternoon', 'evening']
}

const DoctorManagementDashboard: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [view, setView] = useState<'card' | 'table'>('card');
  const [loading, setLoading] = useState(true);
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
    workingDays: [],
    roomNumber: '',
    floorNumber: 1,
    emergencyAvailable: false,
    sessions: {
      morning: { startTime: '09:00', endTime: '12:00', maxPatients: 15 },
      afternoon: { startTime: '14:00', endTime: '17:00', maxPatients: 15 },
      evening: { startTime: '18:00', endTime: '21:00', maxPatients: 10 }
    },
    availableSessions: []
  });

  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDoctors();
    loadSpecializations();
    loadDepartments();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [doctors, selectedDepartment, searchTerm]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const { doctors: doctorsData } = await getAllDoctors();
      setDoctors(doctorsData || []);
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
      setDepartments(['All', ...depts]);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) return;

    setIsSubmittingDept(true);
    try {
      await addDepartment(newDeptName.trim());
      await loadDepartments();
      setFormData({ ...formData, department: newDeptName.trim() });
      setNewDeptName('');
      setIsAddingDepartment(false);
    } catch (error) {
      console.error('Error adding department:', error);
      alert('Failed to add department. It might already exist.');
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const filterDoctors = () => {
    let filtered = doctors;

    if (selectedDepartment !== 'All') {
      filtered = filtered.filter(doctor => doctor.department && doctor.department === selectedDepartment);
    }

    if (searchTerm) {
      filtered = filtered.filter(doctor =>
        doctor.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDoctors(filtered);
  };

  const handleAddDoctor = async () => {
    try {
      const doctorData: DoctorRegistrationData = {
        doctorId: '', // Will be generated
        ...formData,
      };

      await createDoctor(doctorData);
      await loadDoctors();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding doctor:', error);
    }
  };

  const handleEditDoctor = async () => {
    if (!selectedDoctor) return;

    try {
      await updateDoctor(selectedDoctor.id, formData);
      await loadDoctors();
      setShowEditModal(false);
      resetForm();
      setSelectedDoctor(null);
    } catch (error) {
      console.error('Error updating doctor:', error);
    }
  };

  const handleStatusChange = async (doctorId: string, status: string) => {
    try {
      await updateDoctorAvailability(doctorId, status);
      await loadDoctors();
    } catch (error) {
      console.error('Error updating doctor status:', error);
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this doctor? The doctor will be hidden from lists and cannot be scheduled, but existing patient records will remain intact.')) {
      return;
    }

    try {
      await deleteDoctor(doctorId);
      await loadDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      alert('Failed to deactivate doctor. Please try again.');
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
      workingDays: [1, 2, 3, 4, 5, 6],
      roomNumber: '',
      floorNumber: 1,
      emergencyAvailable: false,
      sessions: {
        morning: { startTime: '09:00', endTime: '12:00', maxPatients: 15 },
        afternoon: { startTime: '14:00', endTime: '17:00', maxPatients: 15 },
        evening: { startTime: '18:00', endTime: '21:00', maxPatients: 10 }
      },
      availableSessions: []
    });
  };

  const openEditModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setFormData({
      name: doctor.user?.name || '',
      email: doctor.user?.email || '',
      phone: doctor.user?.phone || '',
      address: doctor.user?.address || '',
      licenseNumber: doctor.license_number || '',
      specialization: doctor.specialization || '',
      department: doctor.department || '',
      qualification: doctor.qualification || '',
      experienceYears: doctor.experience_years || 0,
      consultationFee: doctor.consultation_fee || 0,
      workingHoursStart: doctor.working_hours_start || '09:00',
      workingHoursEnd: doctor.working_hours_end || '17:00',
      workingDays: doctor.working_days || [],
      roomNumber: doctor.room_number || '',
      floorNumber: doctor.floor_number || 1,
      emergencyAvailable: doctor.emergency_available || false,
      sessions: {
        morning: { startTime: '09:00', endTime: '12:00', maxPatients: 15 },
        afternoon: { startTime: '14:00', endTime: '17:00', maxPatients: 15 },
        evening: { startTime: '18:00', endTime: '21:00', maxPatients: 10 }
      },
      availableSessions: []
    });
    setShowEditModal(true);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'busy':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'off_duty':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'on_leave':
        return 'bg-red-50 text-red-600 border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getDepartmentIcon = (department: string) => {
    const config = departmentIcons[department] || departmentIcons['General'];
    return config;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Doctor Management
              </h1>
              <p className="text-gray-600 mt-1">Manage hospital doctors and their schedules</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-50 px-4 py-2 rounded-xl">
                <span className="text-sm text-blue-600 font-medium">{filteredDoctors.length} Doctors</span>
              </div>
            </div>
          </div>
        </div>

        {/* Department Tabs */}
        <div className="relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
            <button
              className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={() => scroll('left')}
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
          </div>

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto hide-scrollbar flex space-x-4 px-12 py-2"
          >
            {departments.map((dept) => {
              const { icon: Icon, color } = getDepartmentIcon(dept);
              return (
                <motion.button
                  key={dept}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-200 ${selectedDepartment === dept
                      ? 'bg-white/90 backdrop-blur-sm shadow-lg border border-blue-200'
                      : 'bg-white/60 backdrop-blur-sm hover:bg-white/80 hover:shadow-md'
                    }`}
                  onClick={() => setSelectedDepartment(dept)}
                >
                  <div className={`p-2 rounded-lg ${color}`}>
                    <Icon size={20} />
                  </div>
                  <span className="font-medium whitespace-nowrap text-gray-700">{dept}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
            <button
              className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={() => scroll('right')}
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, specialty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 bg-gray-50/80 backdrop-blur-sm rounded-xl w-96 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-gray-200/50"
                />
                <Search className="absolute left-3 top-3.5 text-gray-500" size={20} />
              </div>
              <button className="flex items-center px-4 py-3 bg-gray-50/80 backdrop-blur-sm rounded-xl hover:bg-gray-100/80 transition-all duration-200 border border-gray-200/50">
                <Filter size={18} className="mr-2 text-gray-600" />
                <span className="text-gray-700">Filter</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200/50">
                <button
                  className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${view === 'card' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  onClick={() => setView('card')}
                >
                  Cards
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${view === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  onClick={() => setView('table')}
                >
                  Table
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={18} className="mr-2" />
                Add Doctor
              </motion.button>
            </div>
          </div>
        </div>

        {/* Doctors Grid View */}
        {view === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredDoctors.map((doctor) => {
                const { icon: Icon, color } = getDepartmentIcon(doctor.department || 'General');
                return (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="relative">
                          <div className={`h-12 w-12 rounded-full ${getCardGradient(doctor.id || '')} flex items-center justify-center text-white font-semibold`}>
                            {doctor.user?.name?.charAt(0) || 'D'}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${color}`}>
                            <Icon size={12} />
                          </div>
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold text-gray-900">{doctor.user?.name}</h3>
                          <p className="text-sm text-gray-600">{doctor.specialization}</p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <Building size={14} className="mr-1" />
                          Department
                        </span>
                        <span className="text-gray-900 font-medium">{doctor.department}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <MapPin size={14} className="mr-1" />
                          Room
                        </span>
                        <span className="text-gray-900 font-medium">{doctor.room_number}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <Clock size={14} className="mr-1" />
                          Hours
                        </span>
                        <span className="text-gray-900 font-medium">
                          {doctor.working_hours_start} - {doctor.working_hours_end}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(doctor.availability_status || 'unavailable')}`}>
                          {formatStatus(doctor.availability_status || 'unavailable')}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between space-x-2 mt-6">
                      <button
                        className={`flex-1 flex items-center justify-center px-3 py-2 ${getCardButtonColors(doctor.id || '').schedule} rounded-lg transition-colors text-sm font-medium`}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setShowScheduleModal(true);
                        }}
                      >
                        <Calendar size={14} className="mr-1" />
                        Schedule
                      </button>
                      <button
                        className={`flex-1 flex items-center justify-center px-3 py-2 ${getCardButtonColors(doctor.id || '').edit} rounded-lg transition-colors text-sm font-medium`}
                        onClick={() => openEditModal(doctor)}
                      >
                        <Edit size={14} className="mr-1" />
                        Edit
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        title="Delete Doctor"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Doctors Table View */}
        {view === 'table' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 backdrop-blur-sm">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Doctor</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Specialty</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Department</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Room</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map((doctor, index) => (
                    <tr key={doctor.id} className={`border-t border-gray-100/50 ${index % 2 === 0 ? 'bg-white/40' : 'bg-gray-50/40'} backdrop-blur-sm`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full ${getCardGradient(doctor.id || '')} flex items-center justify-center text-white font-semibold`}>
                            {doctor.user?.name?.charAt(0) || 'D'}
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">{doctor.user?.name}</div>
                            <div className="text-sm text-gray-500">{doctor.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-700">{doctor.specialization}</td>
                      <td className="py-4 px-6 text-gray-700">{doctor.department}</td>
                      <td className="py-4 px-6 text-gray-700">{doctor.room_number}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(doctor.availability_status || 'unavailable')}`}>
                          {formatStatus(doctor.availability_status || 'unavailable')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end space-x-2">
                          <button
                            className={`p-2 ${getTableButtonColors(doctor.id || '').schedule} rounded-lg transition-colors`}
                            onClick={() => {
                              setSelectedDoctor(doctor);
                              setShowScheduleModal(true);
                            }}
                          >
                            <Calendar size={18} />
                          </button>
                          <button
                            className={`p-2 ${getTableButtonColors(doctor.id || '').edit} rounded-lg transition-colors`}
                            onClick={() => openEditModal(doctor)}
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => handleDeleteDoctor(doctor.id)}
                            title="Delete Doctor"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Doctor Modal */}
        <AnimatePresence>
          {(showAddModal || showEditModal) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
            >
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="inline-block align-bottom bg-white/95 backdrop-blur-sm rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
                >
                  <div className="bg-white/90 backdrop-blur-sm px-6 pt-5 pb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {showAddModal ? 'Add New Doctor' : 'Edit Doctor'}
                      </h3>
                      <button
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                        onClick={() => {
                          setShowAddModal(false);
                          setShowEditModal(false);
                          resetForm();
                          setSelectedDoctor(null);
                        }}
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <form className="space-y-6">
                      {/* Personal Information */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <User size={20} className="mr-2 text-blue-500" />
                          Personal Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                            <input
                              type="text"
                              value={formData.licenseNumber}
                              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                          />
                        </div>
                      </div>

                      {/* Professional Information */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <Stethoscope size={20} className="mr-2 text-purple-500" />
                          Professional Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                            <select
                              value={formData.specialization}
                              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                            >
                              <option value="">Select Specialization</option>
                              {specializations.map(spec => (
                                <option key={spec} value={spec}>{spec}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <div className="flex gap-2">
                              {isAddingDepartment ? (
                                <div className="flex-1 flex gap-2">
                                  <input
                                    type="text"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    placeholder="Dept Name"
                                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCreateDepartment}
                                    disabled={isSubmittingDept || !newDeptName.trim()}
                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                                    title="Save Department"
                                  >
                                    <Check size={20} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAddingDepartment(false);
                                      setNewDeptName('');
                                    }}
                                    className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                                    title="Cancel"
                                  >
                                    <X size={20} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <select
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                                  >
                                    <option value="">Select Department</option>
                                    {departments.filter(dept => dept !== 'All').map(dept => (
                                      <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => setIsAddingDepartment(true)}
                                    className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                    title="Add New Department"
                                  >
                                    <Plus size={20} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                            <input
                              type="text"
                              value={formData.qualification}
                              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                            <input
                              type="number"
                              value={formData.experienceYears}
                              onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee</label>
                            <input
                              type="number"
                              value={formData.consultationFee}
                              onChange={(e) => setFormData({ ...formData, consultationFee: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                            <input
                              type="text"
                              value={formData.roomNumber}
                              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Schedule Information */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <Clock size={20} className="mr-2 text-orange-500" />
                          Session-Based Availability
                        </h4>

                        {/* Session Selection */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-3">Available Sessions</label>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { key: 'morning', label: 'Morning', icon: '🌅', time: '9:00 AM - 12:00 PM' },
                              { key: 'afternoon', label: 'Afternoon', icon: '☀️', time: '2:00 PM - 5:00 PM' },
                              { key: 'evening', label: 'Evening', icon: '🌆', time: '6:00 PM - 9:00 PM' }
                            ].map((session) => (
                              <div key={session.key} className="relative">
                                <input
                                  type="checkbox"
                                  id={session.key}
                                  checked={formData.availableSessions.includes(session.key)}
                                  onChange={(e) => {
                                    const newSessions = e.target.checked
                                      ? [...formData.availableSessions, session.key]
                                      : formData.availableSessions.filter(s => s !== session.key);
                                    setFormData({ ...formData, availableSessions: newSessions });
                                  }}
                                  className="sr-only"
                                />
                                <label
                                  htmlFor={session.key}
                                  className={`block p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${formData.availableSessions.includes(session.key)
                                      ? 'border-orange-300 bg-gradient-to-br from-orange-50/80 to-orange-100/60 shadow-lg'
                                      : 'border-gray-200 bg-white/80 hover:border-orange-200 hover:bg-orange-50/40'
                                    }`}
                                >
                                  <div className="text-center">
                                    <div className="text-2xl mb-2">{session.icon}</div>
                                    <div className="font-medium text-gray-900">{session.label}</div>
                                    <div className="text-sm text-gray-600 mt-1">{session.time}</div>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Session Details */}
                        {formData.availableSessions.map((sessionKey) => (
                          <div key={sessionKey} className="mb-6 p-4 bg-gradient-to-r from-orange-50/50 to-orange-100/30 rounded-xl border border-orange-200/50">
                            <h5 className="font-medium text-gray-900 mb-3 capitalize flex items-center">
                              <span className="mr-2">
                                {sessionKey === 'morning' ? '🌅' : sessionKey === 'afternoon' ? '☀️' : '🌆'}
                              </span>
                              {sessionKey} Session Details
                            </h5>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                <input
                                  type="time"
                                  value={formData.sessions[sessionKey as keyof typeof formData.sessions].startTime}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    sessions: {
                                      ...formData.sessions,
                                      [sessionKey]: {
                                        ...formData.sessions[sessionKey as keyof typeof formData.sessions],
                                        startTime: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white/90 backdrop-blur-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                <input
                                  type="time"
                                  value={formData.sessions[sessionKey as keyof typeof formData.sessions].endTime}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    sessions: {
                                      ...formData.sessions,
                                      [sessionKey]: {
                                        ...formData.sessions[sessionKey as keyof typeof formData.sessions],
                                        endTime: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white/90 backdrop-blur-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Patients</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="30"
                                  value={formData.sessions[sessionKey as keyof typeof formData.sessions].maxPatients}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    sessions: {
                                      ...formData.sessions,
                                      [sessionKey]: {
                                        ...formData.sessions[sessionKey as keyof typeof formData.sessions],
                                        maxPatients: parseInt(e.target.value) || 1
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white/90 backdrop-blur-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Legacy Working Hours (Hidden but maintained for compatibility) */}
                        <div className="hidden">
                          <input type="time" value={formData.workingHoursStart} readOnly />
                          <input type="time" value={formData.workingHoursEnd} readOnly />
                        </div>
                        <div className="mt-6">
                          <label className="block text-sm font-medium text-gray-700 mb-3">Working Days</label>
                          <div className="grid grid-cols-7 gap-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                              <button
                                key={day}
                                type="button"
                                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 border-2 ${formData.workingDays.includes(index)
                                    ? 'border-orange-300 bg-gradient-to-br from-orange-50/80 to-orange-100/60 text-orange-700 shadow-lg'
                                    : 'border-gray-200 bg-white/80 text-gray-600 hover:border-orange-200 hover:bg-orange-50/40'
                                  }`}
                                onClick={() => {
                                  const newWorkingDays = formData.workingDays.includes(index)
                                    ? formData.workingDays.filter(d => d !== index)
                                    : [...formData.workingDays, index];
                                  setFormData({ ...formData, workingDays: newWorkingDays });
                                }}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center">
                          <input
                            type="checkbox"
                            id="emergencyAvailable"
                            checked={formData.emergencyAvailable}
                            onChange={(e) => setFormData({ ...formData, emergencyAvailable: e.target.checked })}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="emergencyAvailable" className="ml-2 text-sm text-gray-700">
                            Available for emergency calls
                          </label>
                        </div>
                      </div>
                    </form>
                  </div>

                  <div className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 flex justify-end space-x-3">
                    <button
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        resetForm();
                        setSelectedDoctor(null);
                      }}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center"
                      onClick={showAddModal ? handleAddDoctor : handleEditDoctor}
                    >
                      <Save size={16} className="mr-2" />
                      {showAddModal ? 'Add Doctor' : 'Update Doctor'}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schedule Modal */}
        <AnimatePresence>
          {showScheduleModal && selectedDoctor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
            >
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="inline-block align-bottom bg-white/95 backdrop-blur-sm rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full"
                >
                  <div className="bg-white/90 backdrop-blur-sm px-6 pt-5 pb-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                          {selectedDoctor.user?.name?.charAt(0) || 'D'}
                        </div>
                        <div className="ml-3">
                          <h3 className="text-xl font-semibold text-gray-900">{selectedDoctor.user?.name}</h3>
                          <p className="text-sm text-gray-600">{selectedDoctor.specialization} • {selectedDoctor.department}</p>
                        </div>
                      </div>
                      <button
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                        onClick={() => setShowScheduleModal(false)}
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-4">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, dayIndex) => {
                        const isWorkingDay = selectedDoctor.working_days?.includes(dayIndex + 1) || false;
                        return (
                          <div key={day} className="text-center">
                            <div className={`font-medium mb-3 p-2 rounded-lg ${isWorkingDay ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-50'
                              }`}>
                              {day.slice(0, 3)}
                            </div>
                            <div className="space-y-2">
                              {Array.from({ length: 9 }, (_, i) => {
                                const hour = 9 + i;
                                const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
                                const isAvailable = isWorkingDay &&
                                  selectedDoctor.working_hours_start &&
                                  selectedDoctor.working_hours_end &&
                                  hour >= parseInt(selectedDoctor.working_hours_start.split(':')[0]) &&
                                  hour < parseInt(selectedDoctor.working_hours_end.split(':')[0]);

                                return (
                                  <div
                                    key={i}
                                    className={`p-2 rounded-lg text-xs cursor-pointer transition-all duration-200 ${isAvailable
                                        ? Math.random() > 0.7
                                          ? 'bg-orange-100 text-orange-600 border border-orange-200'
                                          : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                                        : 'bg-gray-50 text-gray-400 border border-gray-200'
                                      }`}
                                  >
                                    {timeSlot}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center">
                          <div className="h-4 w-4 bg-green-100 border border-green-200 rounded mr-2"></div>
                          <span className="text-sm text-gray-600">Available</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-4 w-4 bg-orange-100 border border-orange-200 rounded mr-2"></div>
                          <span className="text-sm text-gray-600">Booked</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-4 w-4 bg-gray-50 border border-gray-200 rounded mr-2"></div>
                          <span className="text-sm text-gray-600">Unavailable</span>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center"
                      >
                        <Save size={16} className="mr-2" />
                        Save Schedule
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DoctorManagementDashboard;