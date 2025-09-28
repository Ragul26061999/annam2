'use client';
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  MapPin,
  IndianRupee,
  Save,
  X,
  Search,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { getAllDoctors, getAllSpecializations, Doctor } from '../src/lib/doctorService';
import { createAppointment, getAvailableSlots, AppointmentData, extractTokenFromNotes } from '../src/lib/appointmentService';
import { getAllPatients } from '../src/lib/patientService';

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  phone: string;
  email?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  appointment_id?: string;
}

interface AppointmentBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (appointment: any) => void;
  patientId?: string;
  doctorId?: string;
}

const AppointmentBookingForm: React.FC<AppointmentBookingFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  doctorId
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [formData, setFormData] = useState<AppointmentData>({
    patientId: patientId || '',
    doctorId: doctorId || '',
    appointmentDate: '',
    appointmentTime: '',
    durationMinutes: 30,
    type: 'consultation',
    symptoms: '',
    notes: '',
    isEmergency: false,
    sessionType: 'morning'
  });

  // Data states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Search states
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.doctorId && formData.appointmentDate) {
      loadAvailableSlots();
    }
  }, [formData.doctorId, formData.appointmentDate, formData.isEmergency]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [patientsData, doctorsData, specializationsData] = await Promise.all([
        getAllPatients({ limit: 100 }),
        getAllDoctors(),
        getAllSpecializations()
      ]);

      setPatients(patientsData.patients || []);
      setDoctors(doctorsData.doctors || []);
      setSpecializations(specializationsData || []);

      // Pre-select patient if provided
      if (patientId) {
        const patient = patientsData.patients?.find(p => p.id === patientId);
        if (patient) {
          setSelectedPatient(patient);
        }
      }

      // Pre-select doctor if provided
      if (doctorId) {
        const doctor = doctorsData.doctors?.find((d: Doctor) => d.id === doctorId);
        if (doctor) {
          setSelectedDoctor(doctor);
          setSelectedSpecialization(doctor.specialization);
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const slots = await getAvailableSlots(
        formData.doctorId,
        formData.appointmentDate,
        formData.isEmergency
      );
      setAvailableSlots(slots.map((slot: any) => ({
        time: slot.time,
        available: slot.available
      })));
    } catch (err) {
      console.error('Error loading available slots:', err);
      setError('Failed to load available time slots.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.doctorId || !formData.appointmentDate || !formData.appointmentTime) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const appointment = await createAppointment(formData);
      const token = extractTokenFromNotes(appointment?.notes);
      setSuccess(token ? `Appointment for ${selectedPatient?.name} booked successfully! Your token number is ${token}.` : `Appointment for ${selectedPatient?.name} booked successfully!`);
      
      setTimeout(() => {
        onSuccess?.(appointment);
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setError(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      patientId: '',
      doctorId: '',
      appointmentDate: '',
      appointmentTime: '',
      durationMinutes: 30,
      type: 'consultation',
      symptoms: '',
      notes: '',
      isEmergency: false,
      sessionType: 'morning'
    });
    setError('');
    setSuccess('');
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedSpecialization('');
    setPatientSearch('');
    setDoctorSearch('');
    setIsEmergency(false);
    onClose();
  };

  const filteredPatients = patients.filter((patient: any) =>
    `${patient.name}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.patient_id.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.phone.includes(patientSearch)
  );

  const filteredDoctors = doctors.filter((doctor: Doctor) => {
    const matchesSearch = doctor.user?.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doctor.license_number.toLowerCase().includes(doctorSearch.toLowerCase());
    const matchesSpecialization = !selectedSpecialization || doctor.specialization === selectedSpecialization;
    return matchesSearch && matchesSpecialization;
  });

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3); // 3 months ahead
    return maxDate.toISOString().split('T')[0];
  };

  // Filter out past time slots for today
  const getAvailableTimeSlotsForToday = (slots: TimeSlot[]) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (formData.appointmentDate !== today) {
      return slots; // Not today, return all slots
    }
    
    // For today, filter out past times (allow up to 5 minutes before)
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const currentTimeString = `${fiveMinutesFromNow.getHours().toString().padStart(2, '0')}:${fiveMinutesFromNow.getMinutes().toString().padStart(2, '0')}`;
    
    return slots.filter(slot => {
      if (!slot.available) return true; // Show unavailable slots for reference
      return slot.time >= currentTimeString;
    });
  };

  // Get available dates for selected doctor
  const getAvailableDatesForDoctor = () => {
    if (!selectedDoctor) return [];
    
    const dates = [];
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    
    // Get doctor's working days
    const workingDays = selectedDoctor.availability_hours?.workingDays || [1, 2, 3, 4, 5, 6]; // Default Mon-Sat
    
    for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (workingDays.includes(dayOfWeek)) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-white px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Book New Appointment</h2>
                <p className="text-gray-500 mt-1 text-sm">Step {step} of 4: {['Select Patient', 'Select Doctor', 'Select Date & Time', 'Confirm Details'][step - 1]}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            {/* Progress Bar */}
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(step / 4) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
                <AlertCircle className="text-red-500 mr-3" size={20} />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center">
                <CheckCircle className="text-green-500 mr-3" size={20} />
                <span className="text-green-700">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Select Patient */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <User className="mx-auto h-12 w-12 text-orange-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900">Select Patient</h3>
                    <p className="text-gray-500 mt-2">Choose the patient for this appointment</p>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by name, patient ID, or phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setFormData(prev => ({ ...prev, patientId: patient.id }));
                        }}
                        className={`p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedPatient?.id === patient.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {patient.name}
                            </h4>
                            <p className="text-sm text-gray-500">ID: {patient.patient_id}</p>
                            <p className="text-sm text-gray-500">Phone: {patient.phone}</p>
                          </div>
                          {selectedPatient?.id === patient.id && (
                            <CheckCircle className="text-orange-500" size={20} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!selectedPatient}
                      className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next: Select Doctor
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Select Doctor */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Stethoscope className="mx-auto h-12 w-12 text-orange-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900">Select Doctor</h3>
                    <p className="text-gray-500 mt-2">Choose a doctor for the consultation</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Search doctors..."
                        value={doctorSearch}
                        onChange={(e) => setDoctorSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <select
                      value={selectedSpecialization}
                      onChange={(e) => setSelectedSpecialization(e.target.value)}
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">All Specializations</option>
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {filteredDoctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setFormData(prev => ({ ...prev, doctorId: doctor.id }));
                        }}
                        className={`p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedDoctor?.id === doctor.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{doctor.user?.name || 'Unknown Doctor'}</h4>
                            <p className="text-sm text-gray-600">{doctor.specialization}</p>
                            <p className="text-sm text-gray-500">{doctor.qualification}</p>
                            <div className="flex items-center mt-2 space-x-4">
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin size={14} className="mr-1" />
                                {doctor.room_number}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <IndianRupee size={14} className="mr-1" />
                                ₹{doctor.consultation_fee}
                              </div>
                            </div>
                          </div>
                          {selectedDoctor?.id === doctor.id && (
                            <CheckCircle className="text-orange-500" size={20} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!selectedDoctor}
                      className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next: Select Date & Time
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Select Date & Time */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Calendar className="mx-auto h-12 w-12 text-orange-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900">Select Date & Time</h3>
                    {selectedPatient && <p className="text-gray-500 mt-2">For: {selectedPatient.name}</p>}
                  </div>

                  {/* Emergency Booking Toggle */}
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Zap className="text-red-500" size={20} />
                        <div>
                          <h4 className="font-medium text-gray-900">Emergency Appointment</h4>
                          <p className="text-sm text-gray-500">Available 24/7 with flexible scheduling</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEmergency}
                          onChange={(e) => {
                            setIsEmergency(e.target.checked);
                            setFormData(prev => ({ ...prev, isEmergency: e.target.checked }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  </div>

                  {/* Session Type Selection (for regular appointments) */}
                  {!isEmergency && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Preferred Session
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['morning', 'afternoon', 'evening'].map((session) => (
                          <button
                            key={session}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, sessionType: session as 'morning' | 'afternoon' | 'evening' }))}
                            className={`p-3 border rounded-xl text-center transition-all ${
                              formData.sessionType === session
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            <div className="font-medium capitalize">{session}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {session === 'morning' && '9:00 AM - 12:00 PM'}
                              {session === 'afternoon' && '2:00 PM - 5:00 PM'}
                              {session === 'evening' && '6:00 PM - 9:00 PM'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Appointment Date
                        {selectedDoctor && (
                           <span className="text-xs text-gray-500 ml-2">
                             (Available on: {selectedDoctor.availability_hours?.workingDays?.map((day: number) => 
                               ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
                             ).join(', ') || 'Mon-Sat'})
                           </span>
                         )}
                      </label>
                      <input
                        type="date"
                        min={getMinDate()}
                        max={getMaxDate()}
                        value={formData.appointmentDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                      {selectedDoctor && formData.appointmentDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          {getAvailableDatesForDoctor().includes(formData.appointmentDate) 
                            ? '✓ Doctor available on this date' 
                            : '⚠️ Doctor may not be available on this date'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Appointment Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="consultation">Consultation</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="routine_checkup">Routine Checkup</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>

                  {formData.appointmentDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Available Time Slots
                        <span className="text-xs text-gray-500 ml-2">
                          (Real-time availability - can book up to 5 minutes before)
                        </span>
                      </label>
                      {availableSlots.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="mx-auto h-8 w-8 mb-2" />
                          <p>Loading available time slots...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                          {getAvailableTimeSlotsForToday(availableSlots).map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setFormData(prev => ({ ...prev, appointmentTime: slot.time }))}
                              className={`p-3 text-sm font-medium rounded-xl transition-all ${
                                formData.appointmentTime === slot.time
                                  ? 'bg-orange-500 text-white'
                                  : slot.available
                                  ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <Clock size={14} className="inline mr-1" />
                              {slot.time}
                              {!slot.available && (
                                <div className="text-xs mt-1">Booked</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {formData.appointmentDate === new Date().toISOString().split('T')[0] && (
                        <p className="text-xs text-blue-600 mt-2">
                          ℹ️ For today's appointments, only future time slots (5+ minutes from now) are shown
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      disabled={!formData.appointmentDate || !formData.appointmentTime}
                      className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next: Additional Details
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Additional Details */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-orange-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900">Additional Details</h3>
                    {selectedPatient && <p className="text-gray-500 mt-2">For: {selectedPatient.name}</p>}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Symptoms or Chief Complaint
                      </label>
                      <textarea
                        value={formData.symptoms}
                        onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Describe the main symptoms or reason for visit..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Any additional information or special requests..."
                      />
                    </div>
                  </div>

                  {/* Appointment Summary */}
                  <div className="bg-gray-50 p-6 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-4">Appointment Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Patient:</span>
                        <span className="font-medium">
                          {selectedPatient?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Doctor:</span>
                        <span className="font-medium">{selectedDoctor?.user?.name || 'Unknown Doctor'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Specialization:</span>
                        <span className="font-medium">{selectedDoctor?.specialization}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date & Time:</span>
                        <span className="font-medium">
                          {new Date(formData.appointmentDate).toLocaleDateString()} at {formData.appointmentTime}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium capitalize">{formData.type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Consultation Fee:</span>
                        <span className="font-medium">₹{selectedDoctor?.consultation_fee}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={20} />
                          Booking...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2" size={20} />
                          Book Appointment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBookingForm;