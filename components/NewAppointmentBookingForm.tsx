'use client';
import React, { useState, useEffect } from 'react';
import { 
  User, Phone, Search, Calendar, Clock, Stethoscope, CheckCircle, ArrowRight, ArrowLeft,
  UserPlus, X, Hash, Heart, Activity, Thermometer, Droplet, Wind, Weight, Ruler
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../src/lib/supabase';
import { getAllDoctorsSimple, getDoctorAvailableSlots, type Doctor } from '../src/lib/doctorService';
import { createAppointment } from '../src/lib/appointmentService';

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  allergies?: string;
}

interface VitalsData {
  temperature: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
  notes: string;
}

interface AppointmentFormData {
  patient: Patient | null;
  doctor: Doctor | null;
  appointmentType: 'new_patient' | 'follow_up' | 'consultation' | 'emergency' | '';
  date: string;
  time: string;
  session: 'morning' | 'afternoon' | 'evening' | '';
  primaryComplaint: string;
  vitals: VitalsData;
}

interface NewAppointmentBookingFormProps {
  onComplete: (result: { appointmentId: string; patientName: string; uhid: string }) => void;
  onCancel: () => void;
}

export default function NewAppointmentBookingForm({ 
  onComplete, 
  onCancel 
}: NewAppointmentBookingFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<{
    morning: string[];
    afternoon: string[];
    evening: string[];
  }>({ morning: [], afternoon: [], evening: [] });
  
  const [formData, setFormData] = useState<AppointmentFormData>({
    patient: null,
    doctor: null,
    appointmentType: '',
    date: '',
    time: '',
    session: '',
    primaryComplaint: '',
    vitals: {
      temperature: '',
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: '',
      notes: ''
    }
  });

  useEffect(() => {
    if (currentStep === 1) loadPatients();
    if (currentStep === 2) loadDoctors();
    if (currentStep === 2 && formData.doctor && formData.date) loadAvailableSlots();
  }, [currentStep, formData.doctor, formData.date]);

  const loadPatients = async () => {
    try {
      setIsLoadingPatients(true);
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_id, name, phone, date_of_birth, gender, blood_group, allergies')
        .eq('status', 'active')
        .order('name');
      
      if (error) {
        console.error('Error loading patients:', error);
        throw error;
      }
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      alert('Failed to load patients. Please refresh the page.');
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const doctorsList = await getAllDoctorsSimple();
      setDoctors(doctorsList);
    } catch (error) {
      console.error('Error loading doctors:', error);
      alert('Failed to load doctors. Please try again.');
    }
  };

  const loadAvailableSlots = async () => {
    if (!formData.doctor || !formData.date) return;
    
    try {
      const slots = await getDoctorAvailableSlots(formData.doctor.id, formData.date);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots({ morning: [], afternoon: [], evening: [] });
    }
  };

  const handleInputChange = (field: keyof AppointmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVitalsChange = (field: keyof VitalsData, value: string) => {
    setFormData(prev => ({
      ...prev,
      vitals: { ...prev.vitals, [field]: value }
    }));
  };

  const handleNext = () => setCurrentStep(prev => prev + 1);
  const handlePrevious = () => setCurrentStep(prev => prev - 1);

  const handleFinalSubmit = async () => {
    if (!formData.patient || !formData.doctor || !formData.date || !formData.time || !formData.appointmentType) {
      alert('Please complete all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const appointmentData = {
        patientId: formData.patient.id,
        doctorId: formData.doctor.id,
        appointmentDate: formData.date,
        appointmentTime: formData.time,
        durationMinutes: 30,
        type: formData.appointmentType as 'new_patient' | 'follow_up' | 'emergency' | 'routine_checkup' | 'consultation',
        chiefComplaint: formData.primaryComplaint,
        symptoms: formData.primaryComplaint,
        notes: '',
        isEmergency: formData.appointmentType === 'emergency',
        sessionType: formData.session === '' ? undefined : formData.session as 'morning' | 'afternoon' | 'evening' | 'emergency'
      };

      const result = await createAppointment(appointmentData);
      
      // Record vitals if provided
      if (formData.vitals.temperature || formData.vitals.bloodPressureSystolic) {
        const { data: userData } = await supabase.auth.getUser();
        
        await supabase.from('vitals').insert({
          patient_id: formData.patient.id,
          encounter_id: result.encounter?.id,
          appointment_id: result.id,
          recorded_by: userData?.user?.id,
          temperature: formData.vitals.temperature ? parseFloat(formData.vitals.temperature) : null,
          blood_pressure_systolic: formData.vitals.bloodPressureSystolic ? parseInt(formData.vitals.bloodPressureSystolic) : null,
          blood_pressure_diastolic: formData.vitals.bloodPressureDiastolic ? parseInt(formData.vitals.bloodPressureDiastolic) : null,
          heart_rate: formData.vitals.heartRate ? parseInt(formData.vitals.heartRate) : null,
          respiratory_rate: formData.vitals.respiratoryRate ? parseInt(formData.vitals.respiratoryRate) : null,
          oxygen_saturation: formData.vitals.oxygenSaturation ? parseInt(formData.vitals.oxygenSaturation) : null,
          weight: formData.vitals.weight ? parseFloat(formData.vitals.weight) : null,
          height: formData.vitals.height ? parseFloat(formData.vitals.height) : null,
          notes: formData.vitals.notes || null,
          taken_at: new Date().toISOString()
        });
      }

      onComplete({
        appointmentId: result.id,
        patientName: formData.patient.name,
        uhid: formData.patient.patient_id
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.patient_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone || '').includes(searchTerm)
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex flex-col items-center ${step <= currentStep ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step <= currentStep 
                ? 'bg-orange-500 border-orange-500 text-white' 
                : 'border-gray-300 text-gray-400'
            }`}>
              {step}
            </div>
            <p className="text-xs mt-1 text-gray-600">
              {step === 1 && 'Patient'}
              {step === 2 && 'Appointment'}
              {step === 3 && 'Vitals'}
              {step === 4 && 'Review'}
            </p>
          </div>
          {step < 4 && (
            <div className={`w-16 h-0.5 mx-2 ${
              step < currentStep ? 'bg-orange-500' : 'bg-gray-300'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // Step 1: Patient Search
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <User className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Step 1: Select Patient</h3>
          <p className="text-sm text-gray-500">Search and select existing patient or register new patient</p>
        </div>
      </div>

      {/* Search and New Patient Button */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Patient
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, UHID, or phone..."
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => router.push('/patients/enhanced-register')}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
            >
              <UserPlus className="w-4 h-4" />
              New Patient
            </button>
          </div>
        </div>

        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {isLoadingPatients ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-600">Loading patients...</span>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No patients found matching your search.' : 'No active patients found.'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Click "New Patient" to register a new patient.
              </p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => handleInputChange('patient', patient)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  formData.patient?.id === patient.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                    <p className="text-sm text-gray-600">UHID: {patient.patient_id}</p>
                    <p className="text-sm text-gray-500">{patient.phone}</p>
                    {patient.allergies && patient.allergies.trim() !== '' && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        ⚠️ Allergies: {patient.allergies}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">{patient.gender}</span>
                    {patient.blood_group && (
                      <p className="text-xs text-blue-600">{patient.blood_group}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button 
          onClick={handleNext}
          disabled={!formData.patient}
          className="btn-primary"
        >
          Continue to Appointment Details
        </button>
      </div>
    </div>
  );

  // Step 2: Doctor Selection, Appointment Type, Date & Time
  const renderStep2 = () => {
    const selectedDoctor = doctors.find(d => d.id === formData.doctor?.id);
    const workingDays = selectedDoctor?.availability_hours?.workingDays || [];
    const availableSessions = selectedDoctor?.availability_hours?.availableSessions || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Stethoscope className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Step 2: Appointment Details</h3>
            <p className="text-sm text-gray-500">Select doctor, appointment type, date and time</p>
          </div>
        </div>

        {/* Doctor Selection */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Select Doctor
          </h4>
          <select
            value={formData.doctor?.id || ''}
            onChange={(e) => {
              const doctor = doctors.find(d => d.id === e.target.value);
              handleInputChange('doctor', doctor || null);
              handleInputChange('date', '');
              handleInputChange('time', '');
              handleInputChange('session', '');
            }}
            className="input-field"
          >
            <option value="">Choose a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.user?.name || 'Unknown'} - {doctor.specialization}
                {doctor.consultation_fee && ` (₹${doctor.consultation_fee})`}
              </option>
            ))}
          </select>
          
          {selectedDoctor && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Working Days:</strong> {workingDays.map((d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
              </p>
              <p className="text-sm text-blue-900 mt-1">
                <strong>Available Sessions:</strong> {availableSessions.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
              </p>
              <p className="text-sm text-blue-900 mt-1">
                <strong>Consultation Fee:</strong> ₹{selectedDoctor.consultation_fee}
              </p>
            </div>
          )}
        </div>

        {/* Appointment Type */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h4 className="font-medium text-purple-900 mb-4">Appointment Type</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'new_patient', label: 'New Patient', color: 'green' },
              { value: 'follow_up', label: 'Follow-up', color: 'blue' },
              { value: 'consultation', label: 'Consultation', color: 'orange' },
              { value: 'emergency', label: 'Emergency', color: 'red' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => handleInputChange('appointmentType', type.value)}
                className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  formData.appointmentType === type.value
                    ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar Date Selection */}
        {formData.doctor && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Select Date
            </h4>
            
            <div className="flex justify-center gap-4 mb-4">
              <button
                onClick={() => setCurrentMonth(new Date())}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  currentMonth.getMonth() === new Date().getMonth()
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => {
                  const next = new Date();
                  next.setMonth(next.getMonth() + 1);
                  setCurrentMonth(next);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  currentMonth.getMonth() !== new Date().getMonth()
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Next Month
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-base font-semibold text-purple-900">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h5>
              </div>
              
              <div className="grid grid-cols-7 gap-1.5">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center text-xs font-semibold text-gray-600 py-1">
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const dayOfWeek = date.getDay();
                  const isWorkingDay = workingDays.includes(dayOfWeek);
                  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = formData.date === dateStr;
                  const isAvailable = isWorkingDay && !isPast;
                  
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (isAvailable) {
                          handleInputChange('date', dateStr);
                          handleInputChange('time', '');
                          handleInputChange('session', '');
                        }
                      }}
                      disabled={!isAvailable}
                      className={`aspect-square rounded-md text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-500 text-white shadow-md'
                          : isToday
                          ? 'bg-orange-100 text-orange-900 border-2 border-orange-400'
                          : isAvailable
                          ? 'bg-white hover:bg-blue-50 border border-gray-300 text-gray-900'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Time Slot Selection */}
        {formData.date && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Select Time Slot
            </h4>
            
            <p className="text-sm text-gray-600 mb-4">
              Selected Date: <strong>{new Date(formData.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </p>
            
            {availableSessions.map((session: string) => (
              <div key={session} className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                  {session} Session
                </h5>
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots[session as keyof typeof availableSlots]?.map((time: string) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        handleInputChange('time', time);
                        handleInputChange('session', session);
                      }}
                      className={`p-2 text-sm rounded-lg border transition-all ${
                        formData.time === time
                          ? 'bg-orange-500 text-white border-orange-600 shadow-md'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      {time}
                    </button>
                  )) || (
                    <p className="col-span-4 text-sm text-gray-500 text-center py-2">
                      No slots available for this session
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Primary Complaint */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h4 className="font-medium text-orange-900 mb-4">Primary Complaint / Reason for Visit</h4>
          <textarea
            value={formData.primaryComplaint}
            onChange={(e) => handleInputChange('primaryComplaint', e.target.value)}
            className="input-field"
            rows={4}
            placeholder="Describe the main reason for this visit..."
          />
        </div>

        <div className="flex justify-between pt-4">
          <button onClick={handlePrevious} className="btn-secondary">
            Previous
          </button>
          <button 
            onClick={handleNext}
            disabled={!formData.doctor || !formData.appointmentType || !formData.date || !formData.time || !formData.primaryComplaint}
            className="btn-primary"
          >
            Continue to Vitals
          </button>
        </div>
      </div>
    );
  };

  // Step 3: Vitals Recording (Optional)
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Heart className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Step 3: Patient Vitals (Optional)</h3>
          <p className="text-sm text-gray-500">Record vital signs and measurements if available</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Vital Signs</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Thermometer className="w-4 h-4 inline mr-1" />
              Temperature (°F)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.vitals.temperature}
              onChange={(e) => handleVitalsChange('temperature', e.target.value)}
              className="input-field"
              placeholder="98.6"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Heart className="w-4 h-4 inline mr-1" />
              Heart Rate (bpm)
            </label>
            <input
              type="number"
              value={formData.vitals.heartRate}
              onChange={(e) => handleVitalsChange('heartRate', e.target.value)}
              className="input-field"
              placeholder="72"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Droplet className="w-4 h-4 inline mr-1" />
              BP Systolic (mmHg)
            </label>
            <input
              type="number"
              value={formData.vitals.bloodPressureSystolic}
              onChange={(e) => handleVitalsChange('bloodPressureSystolic', e.target.value)}
              className="input-field"
              placeholder="120"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Droplet className="w-4 h-4 inline mr-1" />
              BP Diastolic (mmHg)
            </label>
            <input
              type="number"
              value={formData.vitals.bloodPressureDiastolic}
              onChange={(e) => handleVitalsChange('bloodPressureDiastolic', e.target.value)}
              className="input-field"
              placeholder="80"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Wind className="w-4 h-4 inline mr-1" />
              Respiratory Rate
            </label>
            <input
              type="number"
              value={formData.vitals.respiratoryRate}
              onChange={(e) => handleVitalsChange('respiratoryRate', e.target.value)}
              className="input-field"
              placeholder="16"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Activity className="w-4 h-4 inline mr-1" />
              SpO2 (%)
            </label>
            <input
              type="number"
              value={formData.vitals.oxygenSaturation}
              onChange={(e) => handleVitalsChange('oxygenSaturation', e.target.value)}
              className="input-field"
              placeholder="98"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Weight className="w-4 h-4 inline mr-1" />
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.vitals.weight}
              onChange={(e) => handleVitalsChange('weight', e.target.value)}
              className="input-field"
              placeholder="70"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Ruler className="w-4 h-4 inline mr-1" />
              Height (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.vitals.height}
              onChange={(e) => handleVitalsChange('height', e.target.value)}
              className="input-field"
              placeholder="170"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.vitals.notes}
            onChange={(e) => handleVitalsChange('notes', e.target.value)}
            rows={3}
            placeholder="Additional observations..."
            className="input-field"
          />
        </div>

        {formData.vitals.weight && formData.vitals.height && (
          <div className="mt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>BMI:</strong> {(parseFloat(formData.vitals.weight) / Math.pow(parseFloat(formData.vitals.height) / 100, 2)).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={handlePrevious} className="btn-secondary">
          Previous
        </button>
        <button 
          onClick={handleNext}
          className="btn-primary"
        >
          Continue to Review
        </button>
      </div>
    </div>
  );

  // Step 4: Review & Confirm
  const renderStep4 = () => {
    const selectedDoctor = doctors.find(d => d.id === formData.doctor?.id);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Step 4: Review & Confirm</h3>
            <p className="text-sm text-gray-500">Review all details before confirming appointment</p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Patient Information</h4>
          <div className="space-y-2 text-sm">
            <p><strong>UHID:</strong> {formData.patient?.patient_id}</p>
            <p><strong>Name:</strong> {formData.patient?.name}</p>
            <p><strong>Phone:</strong> {formData.patient?.phone}</p>
            {formData.patient?.allergies && formData.patient.allergies.trim() !== '' && (
              <p className="text-red-600">
                <strong>⚠️ Allergies:</strong> {formData.patient.allergies}
              </p>
            )}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-3">Appointment Details</h4>
          <div className="space-y-2 text-sm">
            <p><strong>Doctor:</strong> {selectedDoctor?.user?.name}</p>
            <p><strong>Specialization:</strong> {selectedDoctor?.specialization}</p>
            <p><strong>Type:</strong> {formData.appointmentType?.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Date:</strong> {new Date(formData.date).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>Time:</strong> {formData.time} ({formData.session})</p>
            {selectedDoctor?.consultation_fee && (
              <p><strong>Consultation Fee:</strong> ₹{selectedDoctor.consultation_fee}</p>
            )}
          </div>
        </div>

        {/* Primary Complaint */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h4 className="font-medium text-orange-900 mb-3">Primary Complaint</h4>
          <p className="text-sm text-gray-700">{formData.primaryComplaint}</p>
        </div>

        {/* Vitals Summary */}
        {(formData.vitals.temperature || formData.vitals.bloodPressureSystolic) && (
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-3">Vital Signs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {formData.vitals.temperature && (
                <div>
                  <p className="text-gray-600">Temperature</p>
                  <p className="font-semibold">{formData.vitals.temperature}°F</p>
                </div>
              )}
              {formData.vitals.bloodPressureSystolic && formData.vitals.bloodPressureDiastolic && (
                <div>
                  <p className="text-gray-600">Blood Pressure</p>
                  <p className="font-semibold">{formData.vitals.bloodPressureSystolic}/{formData.vitals.bloodPressureDiastolic} mmHg</p>
                </div>
              )}
              {formData.vitals.heartRate && (
                <div>
                  <p className="text-gray-600">Heart Rate</p>
                  <p className="font-semibold">{formData.vitals.heartRate} bpm</p>
                </div>
              )}
              {formData.vitals.oxygenSaturation && (
                <div>
                  <p className="text-gray-600">SpO2</p>
                  <p className="font-semibold">{formData.vitals.oxygenSaturation}%</p>
                </div>
              )}
              {formData.vitals.weight && (
                <div>
                  <p className="text-gray-600">Weight</p>
                  <p className="font-semibold">{formData.vitals.weight} kg</p>
                </div>
              )}
              {formData.vitals.height && (
                <div>
                  <p className="text-gray-600">Height</p>
                  <p className="font-semibold">{formData.vitals.height} cm</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button onClick={handlePrevious} className="btn-secondary">
            Previous
          </button>
          <button 
            onClick={handleFinalSubmit}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Booking Appointment...' : 'Confirm & Book Appointment'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Book New Appointment</h2>
              <p className="text-sm text-gray-500">Schedule appointment for existing or new patients</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {renderStepIndicator()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>
    </div>
  );
}
