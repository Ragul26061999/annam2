'use client';
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import { validateAppointmentWithSuggestions, createAppointment, AppointmentData, AppointmentSlot } from '../lib/appointmentService';
import { getAllDoctors, Doctor } from '../lib/doctorService';
import { getAllPatients } from '../lib/patientService';

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

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: any) => void;
}

export default function AppointmentBookingModal({ isOpen, onClose, onSuccess }: AppointmentBookingModalProps) {
  const [formData, setFormData] = useState<AppointmentData>({
    patientId: '',
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    durationMinutes: 30,
    type: 'consultation',
    symptoms: '',
    chiefComplaint: '',
    notes: '',
    bookingMethod: 'walk_in'
  });
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<AppointmentSlot[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDoctorsAndPatients();
    }
  }, [isOpen]);

  const loadDoctorsAndPatients = async () => {
    try {
      const [doctorsResponse, patientsResponse] = await Promise.all([
        getAllDoctors(),
        getAllPatients({ limit: 100 })
      ]);
      setDoctors(doctorsResponse.doctors || []);
      setPatients(patientsResponse.patients || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleInputChange = (field: keyof AppointmentData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user makes changes
    if (validationErrors.length > 0) {
      setValidationErrors([]);
      setValidationWarnings([]);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const validateForm = async () => {
    if (!formData.patientId || !formData.doctorId || !formData.appointmentDate || !formData.appointmentTime) {
      setValidationErrors(['Please fill in all required fields']);
      return false;
    }

    try {
      const validation = await validateAppointmentWithSuggestions(formData);
      
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      
      if (validation.suggestions && validation.suggestions.length > 0) {
        setSuggestions(validation.suggestions);
        setShowSuggestions(true);
      }
      
      return validation.isValid;
    } catch (error) {
      console.error('Validation error:', error);
      setValidationErrors(['Validation failed. Please try again.']);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isValid = await validateForm();
      
      if (!isValid) {
        setLoading(false);
        return;
      }

      const newAppointment = await createAppointment(formData);
      onSuccess(newAppointment);
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      setValidationErrors([error.message || 'Failed to create appointment']);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: AppointmentSlot) => {
    setFormData(prev => ({
      ...prev,
      appointmentDate: suggestion.date,
      appointmentTime: suggestion.time
    }));
    setShowSuggestions(false);
    setValidationErrors([]);
    setValidationWarnings([]);
    setSuggestions([]);
  };

  const resetForm = () => {
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
      bookingMethod: 'walk_in'
    });
    setValidationErrors([]);
    setValidationWarnings([]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Book New Appointment</h2>
            <p className="text-gray-500 text-sm mt-1">Schedule a new patient appointment</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start">
                <AlertTriangle className="text-red-500 mt-0.5 mr-3" size={16} />
                <div>
                  <h4 className="text-red-800 font-medium text-sm">Validation Errors</h4>
                  <ul className="text-red-700 text-sm mt-1 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start">
                <AlertTriangle className="text-yellow-500 mt-0.5 mr-3" size={16} />
                <div>
                  <h4 className="text-yellow-800 font-medium text-sm">Warnings</h4>
                  <ul className="text-yellow-700 text-sm mt-1 space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Smart Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start">
                <Lightbulb className="text-blue-500 mt-0.5 mr-3" size={16} />
                <div className="flex-1">
                  <h4 className="text-blue-800 font-medium text-sm">Alternative Time Slots</h4>
                  <p className="text-blue-700 text-sm mt-1 mb-3">Here are some available alternatives:</p>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-blue-900 text-sm">
                              {formatDate(suggestion.date)}
                            </div>
                            <div className="text-blue-700 text-sm">
                              {formatTime(suggestion.time)}
                            </div>
                          </div>
                          <CheckCircle className="text-blue-500" size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User size={16} className="inline mr-2" />
                Patient *
              </label>
              <select
                value={formData.patientId}
                onChange={(e) => handleInputChange('patientId', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - {patient.patient_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User size={16} className="inline mr-2" />
                Doctor *
              </label>
              <select
                value={formData.doctorId}
                onChange={(e) => handleInputChange('doctorId', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Select a doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.user?.name || 'Unknown'} - {doctor.specialization}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-2" />
                Date *
              </label>
              <input
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={16} className="inline mr-2" />
                Time *
              </label>
              <input
                type="time"
                value={formData.appointmentTime}
                onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <select
                value={formData.durationMinutes}
                onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            {/* Booking Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Method *
              </label>
              <select
                value={formData.bookingMethod}
                onChange={(e) => handleInputChange('bookingMethod', e.target.value as 'call' | 'walk_in')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                required
              >
                <option value="walk_in">Walk In</option>
                <option value="call">Phone Call</option>
              </select>
            </div>

            {/* Appointment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appointment Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              >
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="routine_checkup">Routine Checkup</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chief Complaint
            </label>
            <input
              type="text"
              value={formData.chiefComplaint || ''}
              onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
              placeholder="Brief description of the main concern"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symptoms
            </label>
            <textarea
              value={formData.symptoms || ''}
              onChange={(e) => handleInputChange('symptoms', e.target.value)}
              placeholder="Describe any symptoms the patient is experiencing"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional information or special instructions"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Appointment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}