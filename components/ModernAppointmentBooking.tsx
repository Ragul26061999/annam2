'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Clock, User, Stethoscope, FileText, CheckCircle, AlertCircle, Search, Plus, MapPin, IndianRupee, Star, Phone, Mail, UserPlus, AlertTriangle } from 'lucide-react';
import { createAppointment, getAvailableSlots, AppointmentData, AppointmentSlot, extractTokenFromNotes } from '../src/lib/appointmentService';
import { getAllPatients, registerNewPatient } from '../src/lib/patientService';
import { getAllDoctorsSimple, Doctor, getDoctorAvailableSlots, isSlotAvailable } from '../src/lib/doctorService';
import EmergencyPatientRegistrationForm from './EmergencyPatientRegistrationForm';
import ModernCalendar from './ModernCalendar';
import { supabase } from '../src/lib/supabase';

// Patient interface for appointment booking
interface Patient {
  id: string;
  patient_id: string;
  name: string;
  phone: string;
  email?: string;
  date_of_birth: string;
  gender: string;
  status: string;
}

interface ModernAppointmentBookingProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (appointment: any) => void;
  preSelectedPatientId?: string;
  preSelectedDoctorId?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  type?: 'morning' | 'afternoon' | 'evening';
}

const STEPS = [
  { id: 1, title: 'Select Doctor', icon: Stethoscope },
  { id: 2, title: 'Choose Date & Time', icon: Calendar },
  { id: 3, title: 'Select Patient', icon: User },
  { id: 4, title: 'Appointment Details', icon: FileText },
  { id: 5, title: 'Confirmation', icon: CheckCircle }
];

const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Gynecology',
  'Dermatology',
  'Psychiatry',
  'Emergency Medicine',
  'Surgery'
];

const APPOINTMENT_TYPES = [
  { value: 'consultation', label: 'General Consultation', duration: 30 },
  { value: 'follow_up', label: 'Follow-up Visit', duration: 20 },
  { value: 'routine_checkup', label: 'Routine Checkup', duration: 45 },
  { value: 'emergency', label: 'Emergency Consultation', duration: 60 }
];

const ModernAppointmentBooking: React.FC<ModernAppointmentBookingProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedPatientId,
  preSelectedDoctorId
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [formData, setFormData] = useState<AppointmentData>({
    patientId: preSelectedPatientId || '',
    doctorId: preSelectedDoctorId || '',
    appointmentDate: '',
    appointmentTime: '',
    sessionType: undefined,
    durationMinutes: 30,
    type: 'consultation',
    symptoms: '',
    chiefComplaint: '',
    notes: '',
    isEmergency: false
  });

  // Data states
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [availableSlots, setAvailableSlots] = useState<{
    morning: string[];
    afternoon: string[];
    evening: string[];
  }>({ morning: [], afternoon: [], evening: [] });
  const [fullDates, setFullDates] = useState<string[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Filter states
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [isRegisteringPatient, setIsRegisteringPatient] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (preSelectedDoctorId) {
        setCurrentStep(2);
      }
      if (preSelectedPatientId) {
        setCurrentStep(preSelectedDoctorId ? 4 : 3);
      }
    }
  }, [isOpen, preSelectedDoctorId, preSelectedPatientId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [doctorsData, patientsData] = await Promise.all([
        getAllDoctorsSimple(),
        getAllPatients({ limit: 100 })
      ]);
      setDoctors(doctorsData || []);
      // Transform patient data to match our interface and remove duplicates
      const transformedPatients = (patientsData.patients || []).map((p: any) => ({
        id: p.id,
        patient_id: p.patient_id,
        name: p.name || '',
        phone: p.phone,
        email: p.email,
        date_of_birth: p.date_of_birth,
        gender: p.gender,
        status: p.status
      }));
      
      // Remove duplicates based on patient ID
      const uniquePatients = transformedPatients.filter((patient, index, self) => 
        index === self.findIndex(p => p.id === patient.id)
      );
      setPatients(uniquePatients);

      // Pre-select doctor if provided
      if (preSelectedDoctorId && doctorsData) {
        const doctor = doctorsData.find((d: Doctor) => d.id === preSelectedDoctorId);
        if (doctor) {
          setSelectedDoctor(doctor);
          setFormData(prev => ({ ...prev, doctorId: doctor.id }));
        }
      }

      // Pre-select patient if provided
      if (preSelectedPatientId) {
        const patient = transformedPatients.find((p: Patient) => p.id === preSelectedPatientId);
        if (patient) {
          setSelectedPatient(patient);
          setFormData(prev => ({ ...prev, patientId: patient.id }));
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (doctorId: string, date: string) => {
    try {
      setLoading(true);
      const slots = await getAvailableSlots(doctorId, date, formData.isEmergency);
      
      // Convert to grouped format by time of day
      const groupedSlots = {
        morning: [] as string[],
        afternoon: [] as string[],
        evening: [] as string[]
      };
      
      slots.forEach(slot => {
        if (slot.available) {
          const hour = parseInt(slot.time.split(':')[0]);
          if (hour < 12) {
            groupedSlots.morning.push(slot.time);
          } else if (hour < 17) {
            groupedSlots.afternoon.push(slot.time);
          } else {
            groupedSlots.evening.push(slot.time);
          }
        }
      });
      
      setAvailableSlots(groupedSlots);
    } catch (err) {
      console.error('Error loading slots:', err);
      setError('Failed to load available time slots.');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
  setSelectedDoctor(doctor);
  setFormData(prev => ({ ...prev, doctorId: doctor.id }));
  setError('');
  fetchFullDates(doctor.id);
};
const fetchFullDates = async (doctorId: string) => {
  const minDate = getMinDate();
  const maxDate = getMaxDate();
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('appointment_date')
    .eq('doctor_id', doctorId)
    .gte('appointment_date', minDate)
    .lte('appointment_date', maxDate)
    .in('status', ['scheduled', 'confirmed', 'in_progress']);
  if (error) return;
  const countByDate = appointments.reduce((acc: { [key: string]: number }, app) => {
    acc[app.appointment_date] = (acc[app.appointment_date] || 0) + 1;
    return acc;
  }, {});
  const maxPerDay = selectedDoctor?.max_patients_per_day || 20;
  const full = Object.keys(countByDate).filter(date => countByDate[date] >= maxPerDay);
  setFullDates(full);
};

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patientId: patient.id }));
    setError('');
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setFormData(prev => ({ ...prev, appointmentDate: date }));
    if (selectedDoctor) {
      loadAvailableSlots(selectedDoctor.id, date);
    }
  };

  const handlePeriodSelect = (period: 'morning' | 'afternoon' | 'evening') => {
    const slots = availableSlots[period];
    if (slots.length > 0) {
      setFormData(prev => ({ ...prev, sessionType: period, appointmentTime: slots[0] }));
    }
  };

  const handleNext = () => {
    // Clear any previous errors
    setError('');
    
    // Validation for each step
    if (currentStep === 1) {
      if (!selectedDoctor) {
        setError('Please select a doctor before proceeding to the next step.');
        return;
      }
    }
    
    if (currentStep === 2) {
      if (!formData.appointmentDate) {
        setError('Please select an appointment date.');
        return;
      }
      if (!formData.appointmentTime) {
        setError('Please select an appointment time.');
        return;
      }
    }
    
    if (currentStep === 3) {
      if (!selectedPatient) {
        setError('Please select a patient before proceeding.');
        return;
      }
    }
    
    if (currentStep === 4) {
      if (!formData.type) {
        setError('Please select an appointment type.');
        return;
      }
      if (!formData.chiefComplaint?.trim()) {
        setError('Please provide the chief complaint.');
        return;
      }
    }
    
    // Move to next step
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handlePrevious = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      const appointment = await createAppointment(formData);
      const token = extractTokenFromNotes(appointment?.notes);
      setSuccess(token ? `Appointment booked successfully! Your token number is ${token}.` : 'Appointment booked successfully!');
      
      setTimeout(() => {
        onSuccess?.(appointment);
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setError(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      patientId: '',
      doctorId: '',
      appointmentDate: '',
      appointmentTime: '',
      durationMinutes: 30,
      type: 'consultation',
      symptoms: '',
      chiefComplaint: '',
      notes: '',
      isEmergency: false
    });
    setSelectedDoctor(null);
    setSelectedPatient(null);
    setSelectedSpecialization('');
    setDoctorSearch('');
    setPatientSearch('');
    setSelectedDate('');
    setAvailableSlots({ morning: [], afternoon: [], evening: [] });
    setError('');
    setSuccess('');
    setShowNewPatientForm(false);
    onClose();
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate.toISOString().split('T')[0];
  };

  const getDisabledDates = () => {
    if (!selectedDoctor || !selectedDoctor.availability_hours) {
      return [];
    }

    try {
      const availability = typeof selectedDoctor.availability_hours === 'string' 
        ? JSON.parse(selectedDoctor.availability_hours)
        : selectedDoctor.availability_hours;
      
      const workingDays = availability.workingDays || [];
      
      if (workingDays.length === 0) {
        return [];
      }

      const disabledDates: string[] = [];
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      // Convert working days to numbers (0 = Sunday, 1 = Monday, etc.)
      const workingDayNumbers = workingDays.map((day: string | number) => {
        // If it's already a number, return it directly
        if (typeof day === 'number') {
          return day;
        }
        // If it's a string, convert it
        const dayMap: { [key: string]: number } = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        return dayMap[day.toLowerCase()];
      }).filter((day: number) => day !== undefined);

      // Generate all dates in the range and disable non-working days
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        if (!workingDayNumbers.includes(dayOfWeek)) {
          disabledDates.push(date.toISOString().split('T')[0]);
        }
      }

      const workingDisabled = disabledDates;
  return [...workingDisabled, ...fullDates];
    } catch (error) {
      console.error('Error parsing doctor availability:', error);
      return [];
    }
  };

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSpecialization = !selectedSpecialization || doctor.specialization === selectedSpecialization;
    const matchesSearch = !doctorSearch || 
      doctor.user?.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(doctorSearch.toLowerCase());
    return matchesSpecialization && matchesSearch;
  });

  const filteredPatients = patients.filter(patient => {
    if (!patientSearch) return true;
    const searchLower = patientSearch.toLowerCase();
    return (
      patient.name?.toLowerCase().includes(searchLower) ||
      patient.patient_id?.toLowerCase().includes(searchLower) ||
      patient.phone?.includes(patientSearch)
    );
  });



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Simplified Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Book Appointment</h2>
              <div className="text-sm text-blue-100">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
                {selectedPatient && currentStep >= 3 && (
                  <span className="ml-3 text-blue-100">• {selectedPatient.name}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Compact Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex items-center space-x-2">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300
                        ${
                          isCompleted
                            ? 'bg-white text-blue-600'
                            : isActive
                            ? 'bg-white text-blue-600 ring-2 ring-white/50'
                            : 'bg-blue-500 text-blue-200'
                        }
                      `}>
                        {isCompleted ? (
                          <CheckCircle size={14} />
                        ) : (
                          <Icon size={14} />
                        )}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${
                        isActive || isCompleted ? 'text-white' : 'text-blue-200'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`
                        w-8 h-0.5 mx-2 rounded-full transition-all duration-500
                        ${isCompleted ? 'bg-white' : 'bg-blue-400/30'}
                      `} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="text-red-500 mr-3" size={20} />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="text-green-500 mr-3" size={20} />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {/* Step 1: Select Doctor */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Choose Your Doctor</h3>
                <p className="text-sm text-gray-600">Select a doctor to proceed with your appointment booking</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Specialization
                  </label>
                  <select
                    value={selectedSpecialization}
                    onChange={(e) => setSelectedSpecialization(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm"
                  >
                    <option value="">All Specializations</option>
                    {SPECIALIZATIONS.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Search Doctor
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search by doctor name..."
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Available Doctors
                  </h4>
                  <p className="text-xs text-gray-600">{filteredDoctors.length} doctors found</p>
                </div>
                
                <div className="flex items-center bg-white px-3 py-1 rounded-lg shadow-sm">
                  <input
                    type="checkbox"
                    id="emergency"
                    checked={formData.isEmergency}
                    onChange={(e) => setFormData(prev => ({ ...prev, isEmergency: e.target.checked }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="emergency" className="ml-2 text-xs font-medium text-gray-700 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />
                    Emergency
                  </label>
                </div>
              </div>

              {!selectedDoctor && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                  <div className="flex">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    <div className="ml-2">
                      <p className="text-xs text-blue-700">
                        Please select a doctor to continue to the next step.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => handleDoctorSelect(doctor)}
                    className={`
                      group p-4 border rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md
                      ${
                        selectedDoctor?.id === doctor.id
                          ? 'border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50'
                      }
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm transition-all duration-300 ${
                        selectedDoctor?.id === doctor.id
                          ? 'bg-blue-600 shadow-sm'
                          : 'bg-gray-600 group-hover:bg-blue-500'
                      }`}>
                        {doctor.user?.name?.[0] || 'D'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 truncate">
                              {doctor.user?.name || 'Unknown Doctor'}
                            </h4>
                            <p className="text-blue-600 font-medium text-xs truncate">
                              {doctor.specialization}
                            </p>
                          </div>
                          {selectedDoctor?.id === doctor.id && (
                            <div className="bg-green-500 rounded-full p-0.5">
                              <CheckCircle className="text-white" size={14} />
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center text-xs text-gray-600">
                            <MapPin size={12} className="mr-1 text-gray-400" />
                            <span className="font-medium">Room {doctor.room_number}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs text-gray-600">
                              <IndianRupee size={12} className="mr-1 text-green-500" />
                              <span className="font-bold text-green-600">₹{doctor.consultation_fee}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredDoctors.length === 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                    <Stethoscope className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No doctors found</h3>
                  <p className="text-xs text-gray-600">Try adjusting your search criteria or specialization filter.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Choose Date & Time */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Select Date & Time</h3>
                <p className="text-sm text-gray-600">Choose your preferred appointment date and time with Dr. {selectedDoctor?.user?.name}</p>
              </div>

              {!selectedDoctor && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        Please go back and select a doctor first.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedDoctor && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {selectedDoctor.user?.name?.[0] || 'D'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Dr. {selectedDoctor.user?.name}
                      </h4>
                      <p className="text-blue-600 font-medium text-xs">{selectedDoctor.specialization}</p>
                      <p className="text-gray-600 text-xs">Room {selectedDoctor.room_number} • ₹{selectedDoctor.consultation_fee}</p>
                    </div>
                  </div>
                </div>
              )}
                
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-800">
                    Select Date
                  </label>
                  <ModernCalendar
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    minDate={getMinDate()}
                    maxDate={getMaxDate()}
                    disabledDates={getDisabledDates()}
                    className="w-full"
                  />
                  
                  {!selectedDate && (
                    <div className="bg-blue-50 border-l-2 border-blue-400 p-3 rounded-r-lg">
                      <div className="flex">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <div className="ml-2">
                          <p className="text-xs text-blue-700">
                            Please select a date to view available time slots.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-800">
                    Available Times
                  </label>
                  
                  {selectedDate ? (
                    loading ? (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full mb-3">
                          <Clock className="h-5 w-5 text-white animate-spin" />
                        </div>
                        <p className="text-gray-600 text-sm">Loading available slots...</p>
                      </div>
                    ) : (availableSlots.morning.length === 0 && availableSlots.afternoon.length === 0 && availableSlots.evening.length === 0) ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full mb-3">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-sm font-semibold">No available slots</p>
                        <p className="text-xs mt-1">Please try selecting a different date.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(availableSlots).map(([period, slots]) => {
                          if (slots.length === 0) return null;
                          
                          const periodConfig = {
                            morning: { icon: '🌅', label: 'Morning (9:00 AM - 12:00 PM)', color: 'from-blue-100 to-blue-50' },
                            afternoon: { icon: '☀️', label: 'Afternoon (2:00 PM - 5:00 PM)', color: 'from-blue-100 to-cyan-100' },
                            evening: { icon: '🌙', label: 'Evening (6:00 PM - 9:00 PM)', color: 'from-purple-100 to-indigo-100' }
                          };
                          
                          const config = periodConfig[period as keyof typeof periodConfig];
                          const isSelected = formData.sessionType === period;
                          
                          return (
                            <button
                              key={period}
                              type="button"
                              onClick={() => handlePeriodSelect(period as 'morning' | 'afternoon' | 'evening')}
                              disabled={slots.length === 0}
                              className={`p-4 rounded-lg text-center transition-all duration-200 shadow-sm hover:shadow-md
                                ${isSelected ? 'bg-blue-600 text-white ring-2 ring-blue-200' : `bg-gradient-to-r ${config.color} hover:opacity-90`} 
                                ${slots.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                              `}
                            >
                              <span className="text-2xl mb-1 block">{config.icon}</span>
                              <h5 className="font-bold text-sm mb-0.5">{config.label}</h5>
                              <span className="text-xs opacity-80 block">
                                {slots.length} slots available
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Select a date to view available time slots</p>
                    </div>
                  )}
                </div>
              </div>
              
              {!formData.appointmentTime && selectedDate && (availableSlots.morning.length > 0 || availableSlots.afternoon.length > 0 || availableSlots.evening.length > 0) && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
                  <div className="flex">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Please select a time slot to continue.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Patient */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Patient Information</h3>
                <p className="text-sm text-gray-600">Choose an existing patient or register a new one</p>
              </div>

              {/* Patient Search */}
              <div className="bg-blue-50 p-4 rounded-xl">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Search Patient
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search by name, ID, or phone number..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => setShowEmergencyForm(true)}
                    className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 text-xs font-medium"
                  >
                    <AlertTriangle size={14} className="mr-1" />
                    Emergency
                  </button>
                  <button
                    onClick={() => setShowNewPatientForm(true)}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-xs font-medium"
                  >
                    <UserPlus size={14} className="mr-1" />
                    New Patient
                  </button>
                </div>
              </div>

              {/* Patients List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800">Available Patients</h4>
                  <span className="text-xs text-gray-500">{filteredPatients.length} found</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                  {filteredPatients.map((patient, index) => (
                    <div
                      key={`patient-${patient.id}-${index}`}
                      onClick={() => handlePatientSelect(patient)}
                      className={`
                        group relative p-4 border rounded-xl cursor-pointer transition-all duration-200
                        ${selectedPatient?.id === patient.id
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-sm'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium text-sm ${
                            selectedPatient?.id === patient.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                          }`}>
                            {patient.name?.[0] || 'P'}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {patient.name}
                            </h4>
                            <div className="text-xs text-gray-500 mb-1">
                              ID: {patient.patient_id}
                            </div>
                            <div className="flex items-center mt-1 space-x-3">
                              <div className="flex items-center text-xs text-gray-500">
                                <Phone size={12} className="mr-1" />
                                {patient.phone}
                              </div>
                              {patient.email && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Mail size={12} className="mr-1" />
                                  {patient.email}
                                </div>
                              )}
                            </div>
                            {patient.date_of_birth && (
                              <div className="flex items-center mt-2">
                                <Calendar size={14} className="mr-1 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                  Age: {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {selectedPatient?.id === patient.id && (
                          <div className="absolute -top-2 -right-2">
                            <CheckCircle className="w-8 h-8 text-blue-500 bg-white rounded-full shadow-md" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredPatients.length === 0 && (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-semibold text-gray-600 mb-2">No patients found</p>
                    <p className="text-gray-500 mb-6">No patients match your search criteria. Register a new patient to continue.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => setShowEmergencyForm(true)}
                        className="inline-flex items-center px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                      >
                        <AlertTriangle size={20} className="mr-2" />
                        Emergency Registration
                      </button>
                      <button
                        onClick={() => setShowNewPatientForm(true)}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                      >
                        <UserPlus size={20} className="mr-2" />
                        Regular Registration
                      </button>
                    </div>
                  </div>
                )}
                
                {!selectedPatient && filteredPatients.length > 0 && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
                    <div className="flex">
                      <User className="h-5 w-5 text-blue-400" />
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Please select a patient to continue with the appointment booking.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Appointment Details */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Appointment Details</h3>
                <p className="text-gray-600">Provide additional information about your appointment</p>
              </div>

              {/* Selected Patient Info */}
              {selectedPatient && (
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        Appointment for: {selectedPatient.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Patient ID: {selectedPatient.patient_id} • Phone: {selectedPatient.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Appointment Type - Compact Design */}
              <div className="bg-blue-50 p-4 rounded-xl">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Appointment Type
                </label>
                <select
                  value={formData.type || ''}
                  onChange={(e) => {
                    const selectedType = APPOINTMENT_TYPES.find(t => t.value === e.target.value);
                    if (selectedType) {
                      setFormData(prev => ({ 
                        ...prev, 
                        type: selectedType.value as any,
                        durationMinutes: selectedType.duration
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select appointment type...</option>
                  {APPOINTMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.duration} min)
                    </option>
                  ))}
                </select>
                {!formData.type && (
                  <p className="text-xs text-red-600 mt-1">Please select an appointment type</p>
                )}
              </div>

              {/* Chief Complaint - Compact */}
              <div className="bg-orange-50 p-4 rounded-xl">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Primary Reason for Visit *
                </label>
                <textarea
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  placeholder="Describe the main reason for this appointment..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                  required
                />
                {!formData.chiefComplaint && (
                  <p className="text-xs text-red-600 mt-1">Please provide the primary reason for your visit</p>
                )}
              </div>

              {/* Symptoms & Notes - Combined and Compact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Current Symptoms
                  </label>
                  <textarea
                    value={formData.symptoms || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                    placeholder="List current symptoms..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Allergies, medications, special requests..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full mb-3">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Your Appointment</h3>
                <p className="text-sm text-gray-600">Please review the details below and confirm</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="space-y-4">
                  {/* Patient Info */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-700 font-medium text-sm">Patient</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 text-sm">
                        {selectedPatient?.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        ID: {selectedPatient?.patient_id}
                      </div>
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-700 font-medium text-sm">Doctor</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 text-sm">
                        Dr. {selectedDoctor?.user?.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {selectedDoctor?.specialization}
                      </div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-700 font-medium text-sm">Date & Time</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 text-sm">
                        {new Date(formData.appointmentDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center justify-end">
                        <Clock className="w-3 h-3 mr-1" />
                        {formData.appointmentTime}
                      </div>
                    </div>
                  </div>

                  {/* Appointment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-center">
                      <div className="text-xs text-gray-600 mb-1">Type</div>
                      <div className="font-semibold text-gray-900 text-sm capitalize">
                        {formData.type.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl shadow-sm text-center">
                      <div className="text-xs text-gray-600 mb-1">Duration</div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {formData.durationMinutes} min
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl shadow-sm text-center">
                      <div className="text-xs text-gray-600 mb-1">Fee</div>
                      <div className="font-semibold text-gray-900 text-sm text-green-600">
                        ₹{selectedDoctor?.consultation_fee}
                      </div>
                    </div>
                  </div>

                  {/* Chief Complaint */}
                  {formData.chiefComplaint && (
                    <div className="p-4 bg-white rounded-xl shadow-sm">
                      <div className="flex items-center mb-2">
                        <FileText className="w-4 h-4 text-orange-600 mr-2" />
                        <span className="text-gray-700 font-medium text-sm">Primary Reason</span>
                      </div>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border-l-2 border-orange-500 text-sm">
                        {formData.chiefComplaint}
                      </p>
                    </div>
                  )}

                  {/* Symptoms */}
                  {formData.symptoms && (
                    <div className="p-4 bg-white rounded-xl shadow-sm">
                      <div className="flex items-center mb-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 mr-2" />
                        <span className="text-gray-700 font-medium text-sm">Symptoms</span>
                      </div>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border-l-2 border-orange-500 text-sm">
                        {formData.symptoms}
                      </p>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {formData.notes && (
                    <div className="p-4 bg-white rounded-xl shadow-sm">
                      <div className="flex items-center mb-2">
                        <FileText className="w-4 h-4 text-orange-600 mr-2" />
                        <span className="text-gray-700 font-medium text-sm">Additional Notes</span>
                      </div>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border-l-2 border-orange-500 text-sm">
                        {formData.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmation Notice */}
                <div className="mt-8 p-6 bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl border border-orange-200">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-800 mb-2">Ready to Book?</h4>
                      <p className="text-orange-700 text-sm">
                        By confirming this appointment, you agree to arrive 15 minutes early and bring any relevant medical documents. 
                        You will receive a confirmation message with appointment details.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 flex items-center justify-between border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-xl hover:bg-gray-200 font-medium"
          >
            <ChevronLeft size={20} className="mr-2" />
            Previous
          </button>

          <div className="flex items-center space-x-3">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={`
                  w-3 h-3 rounded-full transition-all duration-300
                  ${index + 1 <= currentStep
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg'
                      : 'bg-gray-300'
                  }
                `}
              />
            ))}
          </div>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-lg font-semibold"
            >
              Next
              <ChevronRight size={20} className="ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle size={20} className="mr-3" />
                  Confirm Booking
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Emergency Patient Registration Form */}
       {showEmergencyForm && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <EmergencyPatientRegistrationForm
               onSubmit={async (data: any, previewUHID?: string) => {
                 try {
                   setIsRegisteringPatient(true);
                   const result = await registerNewPatient({
                     firstName: data.firstName,
                     lastName: data.lastName,
                     dateOfBirth: data.dateOfBirth,
                     age: '', // Will be calculated later if needed
                     diagnosis: '', // Will be added later by medical staff
                     gender: data.gender,
                     phone: data.phone,
                     email: '',
                     address: data.address,
                     bloodGroup: data.bloodGroup || '',
                     allergies: data.allergies || '',
                     medicalHistory: '',
                     currentMedications: '',
                     chronicConditions: '',
                     previousSurgeries: '',
                     admissionDate: data.admissionDate,
                     admissionTime: data.admissionTime,
                     primaryComplaint: data.primaryComplaint,
                     admissionType: 'emergency',
                     referringDoctorFacility: '',
                     consultingDoctorName: '',
                     consultingDoctorId: '',
                     departmentWard: '',
                     roomNumber: '',
                     guardianName: '',
                     guardianRelationship: '',
                     guardianPhone: '',
                     guardianAddress: '',
                     emergencyContactName: data.emergencyContactName || '',
                     emergencyContactPhone: data.emergencyContactPhone || '',
                     emergencyContactRelationship: data.emergencyContactRelationship || '',
                     insuranceProvider: '',
                     insuranceNumber: '',
                     initialSymptoms: '',
                     referredBy: ''
                   }, previewUHID);
                   
                   if (result.success) {
                     // Add the new patient to the list and select them
                     const transformedPatient = {
                       id: result.patient.id,
                       patient_id: result.patient.patient_id,
                       name: result.patient.name || '',
                       phone: result.patient.phone,
                       email: result.patient.email || '',
                       date_of_birth: result.patient.date_of_birth,
                       gender: result.patient.gender,
                       status: result.patient.status
                     };
                     setPatients(prev => [transformedPatient, ...prev]);
                     handlePatientSelect(transformedPatient);
                     setShowEmergencyForm(false);
                   }
                 } catch (error) {
                   console.error('Error registering patient:', error);
                 } finally {
                   setIsRegisteringPatient(false);
                 }
               }}
               onCancel={() => setShowEmergencyForm(false)}
               isLoading={isRegisteringPatient}
             />
           </div>
         </div>
       )}
    </div>
  );
};

export default ModernAppointmentBooking;