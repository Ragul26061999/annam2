'use client';
import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Clock, Stethoscope, CheckCircle, ArrowRight, ArrowLeft,
  Search, Activity, Heart, Thermometer, Droplet, Wind, Weight, Ruler
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
}

interface Doctor {
  id: string;
  user_id: string;
  users: { name: string };
  specialization: string;
  consultation_fee: number;
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

interface AppointmentData {
  patient: Patient | null;
  doctor: Doctor | null;
  date: string;
  time: string;
  vitals: VitalsData;
}

export default function EnhancedAppointmentBooking({ onClose, onSuccess }: { 
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  const [appointmentData, setAppointmentData] = useState<AppointmentData>({
    patient: null,
    doctor: null,
    date: '',
    time: '',
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
    if (currentStep === 3 && appointmentData.doctor && appointmentData.date) loadAvailableSlots();
  }, [currentStep, appointmentData.doctor, appointmentData.date]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_id, name, phone, date_of_birth, gender')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, user_id, specialization, consultation_fee, users!inner(name)')
        .eq('status', 'active')
        .order('users(name)');
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadAvailableSlots = () => {
    // Generate time slots (9 AM to 5 PM, 30-minute intervals)
    const slots: string[] = [];
    for (let hour = 9; hour < 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    setAvailableSlots(slots);
  };

  const handleSubmit = async () => {
    if (!appointmentData.patient || !appointmentData.doctor || !appointmentData.date || !appointmentData.time) {
      alert('Please complete all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create encounter
      const { data: encounterData, error: encounterError } = await supabase
        .from('encounter')
        .insert({
          patient_id: appointmentData.patient.id,
          clinician_id: appointmentData.doctor.id,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (encounterError) throw encounterError;

      // 2. Create appointment
      const scheduledAt = `${appointmentData.date}T${appointmentData.time}:00`;
      const { data: appointmentRecord, error: appointmentError } = await supabase
        .from('appointment')
        .insert({
          encounter_id: encounterData.id,
          scheduled_at: scheduledAt,
          duration_minutes: 30
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // 3. Create vitals if provided
      if (appointmentData.vitals.temperature || appointmentData.vitals.bloodPressureSystolic) {
        const { data: userData } = await supabase.auth.getUser();
        
        await supabase.from('vitals').insert({
          patient_id: appointmentData.patient.id,
          encounter_id: encounterData.id,
          appointment_id: appointmentRecord.id,
          recorded_by: userData?.user?.id,
          temperature: appointmentData.vitals.temperature ? parseFloat(appointmentData.vitals.temperature) : null,
          blood_pressure_systolic: appointmentData.vitals.bloodPressureSystolic ? parseInt(appointmentData.vitals.bloodPressureSystolic) : null,
          blood_pressure_diastolic: appointmentData.vitals.bloodPressureDiastolic ? parseInt(appointmentData.vitals.bloodPressureDiastolic) : null,
          heart_rate: appointmentData.vitals.heartRate ? parseInt(appointmentData.vitals.heartRate) : null,
          respiratory_rate: appointmentData.vitals.respiratoryRate ? parseInt(appointmentData.vitals.respiratoryRate) : null,
          oxygen_saturation: appointmentData.vitals.oxygenSaturation ? parseInt(appointmentData.vitals.oxygenSaturation) : null,
          weight: appointmentData.vitals.weight ? parseFloat(appointmentData.vitals.weight) : null,
          height: appointmentData.vitals.height ? parseFloat(appointmentData.vitals.height) : null,
          notes: appointmentData.vitals.notes || null,
          taken_at: new Date().toISOString()
        });
      }

      alert('Appointment booked successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to book appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

  const steps = [
    { number: 1, title: 'Select Patient', icon: User },
    { number: 2, title: 'Select Doctor', icon: Stethoscope },
    { number: 3, title: 'Date & Time', icon: Calendar },
    { number: 4, title: 'Vitals', icon: Activity },
    { number: 5, title: 'Confirm', icon: CheckCircle }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
          <h2 className="text-2xl font-bold">Book Appointment</h2>
          <p className="text-orange-100 mt-1">Complete all steps to schedule an appointment</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    currentStep >= step.number 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step.number ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${
                    currentStep >= step.number ? 'text-orange-600' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded transition-all ${
                    currentStep > step.number ? 'bg-orange-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Patient Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setAppointmentData({ ...appointmentData, patient })}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      appointmentData.patient?.id === patient.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                        <p className="text-sm text-gray-600">UHID: {patient.patient_id}</p>
                        <p className="text-sm text-gray-500">{patient.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">{patient.gender}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Doctor Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Doctor</h3>
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => setAppointmentData({ ...appointmentData, doctor })}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      appointmentData.doctor?.id === doctor.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Dr. {doctor.users.name}</h3>
                        <p className="text-sm text-gray-600">{doctor.specialization}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange-600">₹{doctor.consultation_fee}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Date & Time Selection */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={appointmentData.date}
                  onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {appointmentData.date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Time Slot
                  </label>
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setAppointmentData({ ...appointmentData, time: slot })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          appointmentData.time === slot
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <Clock className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-sm font-medium">{slot}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Vitals Entry */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Enter Vitals (Optional)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Thermometer className="w-4 h-4 inline mr-1" />
                    Temperature (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={appointmentData.vitals.temperature}
                    onChange={(e) => setAppointmentData({
                      ...appointmentData,
                      vitals: { ...appointmentData.vitals, temperature: e.target.value }
                    })}
                    placeholder="98.6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Heart className="w-4 h-4 inline mr-1" />
                    Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    value={appointmentData.vitals.heartRate}
                    onChange={(e) => setAppointmentData({
                      ...appointmentData,
                      vitals: { ...appointmentData.vitals, heartRate: e.target.value }
                    })}
                    placeholder="72"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Droplet className="w-4 h-4 inline mr-1" />
                    BP Systolic (mmHg)
                  </label>
                  <input
                    type="number"
                    value={appointmentData.vitals.bloodPressureSystolic}
                    onChange={(e) => setAppointmentData({
                      ...appointmentData,
                      vitals: { ...appointmentData.vitals, bloodPressureSystolic: e.target.value }
                    })}
                    placeholder="120"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Droplet className="w-4 h-4 inline mr-1" />
                    BP Diastolic (mmHg)
                  </label>
                  <input
                    type="number"
                    value={appointmentData.vitals.bloodPressureDiastolic}
                    onChange={(e) => setAppointmentData({
                      ...appointmentData,
                      vitals: { ...appointmentData.vitals, bloodPressureDiastolic: e.target.value }
                    })}
                    placeholder="80"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Wind className="w-4 h-4 inline mr-1" />
                    Respiratory Rate
                  </label>
                  <input
                    type="number"
                    value={appointmentData.vitals.respiratoryRate}
                    onChange={(e) => setAppointmentData({
                      ...appointmentData,
                      vitals: { ...appointmentData.vitals, respiratoryRate: e.target.value }
                    })}
                    placeholder="16"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Activity className="w-4 h-4 inline mr-1" />
                    SpO2 (%)
                  </label>
                  <input
                    type="number"
                    value={appointmentData.vitals.oxygenSaturation}
                    onChange={(e) => setAppointmentData({
                      ...appointmentData,
                      vitals: { ...appointmentData.vitals, oxygenSaturation: e.target.value }
                    })}
                    placeholder="98"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Weight className="w-4 h-4 inline mr-1" />
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={appointmentData.vitals.weight}
                    onChange={(e) => setAppointmentData({
                      ...appointmentData,
                      vitals: { ...appointmentData.vitals, weight: e.target.value }
                    })}
                    placeholder="70"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Ruler className="w-4 h-4 inline mr-1" />
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={appointmentData.vitals.height}
                    onChange={(e) => setAppointmentData({
                      ...appointmentData,
                      vitals: { ...appointmentData.vitals, height: e.target.value }
                    })}
                    placeholder="170"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={appointmentData.vitals.notes}
                  onChange={(e) => setAppointmentData({
                    ...appointmentData,
                    vitals: { ...appointmentData.vitals, notes: e.target.value }
                  })}
                  rows={3}
                  placeholder="Additional observations..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Appointment Details</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm font-medium text-gray-600">Patient</span>
                  <span className="text-sm font-semibold text-gray-900">{appointmentData.patient?.name}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm font-medium text-gray-600">UHID</span>
                  <span className="text-sm font-semibold text-gray-900">{appointmentData.patient?.patient_id}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm font-medium text-gray-600">Doctor</span>
                  <span className="text-sm font-semibold text-gray-900">Dr. {appointmentData.doctor?.users.name}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm font-medium text-gray-600">Specialization</span>
                  <span className="text-sm font-semibold text-gray-900">{appointmentData.doctor?.specialization}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm font-medium text-gray-600">Date</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(appointmentData.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm font-medium text-gray-600">Time</span>
                  <span className="text-sm font-semibold text-gray-900">{appointmentData.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Consultation Fee</span>
                  <span className="text-sm font-semibold text-orange-600">₹{appointmentData.doctor?.consultation_fee}</span>
                </div>
              </div>

              {(appointmentData.vitals.temperature || appointmentData.vitals.bloodPressureSystolic) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Vitals Recorded</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {appointmentData.vitals.temperature && (
                      <div className="text-gray-700">Temp: {appointmentData.vitals.temperature}°F</div>
                    )}
                    {appointmentData.vitals.bloodPressureSystolic && (
                      <div className="text-gray-700">
                        BP: {appointmentData.vitals.bloodPressureSystolic}/{appointmentData.vitals.bloodPressureDiastolic}
                      </div>
                    )}
                    {appointmentData.vitals.heartRate && (
                      <div className="text-gray-700">HR: {appointmentData.vitals.heartRate} bpm</div>
                    )}
                    {appointmentData.vitals.oxygenSaturation && (
                      <div className="text-gray-700">SpO2: {appointmentData.vitals.oxygenSaturation}%</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {currentStep < 5 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 1 && !appointmentData.patient) ||
                  (currentStep === 2 && !appointmentData.doctor) ||
                  (currentStep === 3 && (!appointmentData.date || !appointmentData.time))
                }
                className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:opacity-50"
              >
                {isLoading ? 'Booking...' : 'Confirm Booking'}
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
