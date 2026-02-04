'use client';
import React, { useState, useEffect } from 'react';
import {
  User, Phone, Mail, MapPin, Calendar, Heart, Shield, AlertTriangle, AlertCircle,
  Save, X, UserPlus, Users, Hash, CheckCircle, Clock, Stethoscope, CalendarCheck, Printer, Wallet
} from 'lucide-react';
import { generateUHID, registerNewPatient } from '../src/lib/patientService';
import { getAllDoctorsSimple, getDoctorAvailableSlots, type Doctor } from '../src/lib/doctorService';
import { createAppointment } from '../src/lib/appointmentService';
import { supabase } from '../src/lib/supabase';
import PatientRegistrationLabel from './PatientRegistrationLabel';

interface RegistrationFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: string;
  gender: string;
  maritalStatus: string;
  phone: string;
  email: string;
  address: string;
  diagnosis: string;

  // Medical Information
  bloodGroup: string;
  allergies: string;
  hasDrugAllergy: boolean;
  drugAllergyNames: string;
  currentMedications: string;
  chronicConditions: string;

  // Guardian Information
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;

  // Appointment Information
  selectedDoctorId: string;
  primaryComplaint: string;
  appointmentDate: string;
  appointmentSession: 'morning' | 'afternoon' | 'evening' | '';
  appointmentTime: string;

  // Vitals
  temperature: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  height: string;

  // Advance Payment Information
  advanceAmount: string;
  advancePaymentMethod: string;
  advanceReferenceNumber: string;
  advanceNotes: string;
}

interface RestructuredPatientRegistrationFormProps {
  onComplete: (result: { uhid: string; patientName: string; qrCode?: string; patientId?: string }) => void;
  onCancel: () => void;
  admissionType?: 'outpatient' | 'inpatient' | 'emergency';
  singlePageMode?: boolean;
}
export default function RestructuredPatientRegistrationForm({
  onComplete,
  onCancel,
  admissionType,
  singlePageMode = false
}: RestructuredPatientRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUHID, setPreviewUHID] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<{
    morning: string[];
    afternoon: string[];
    evening: string[];
  }>({ morning: [], afternoon: [], evening: [] });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [patientId, setPatientId] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    maritalStatus: '',
    phone: '',
    email: '',
    address: '',
    diagnosis: '',
    bloodGroup: '',
    allergies: '',
    hasDrugAllergy: false,
    drugAllergyNames: '',
    currentMedications: '',
    chronicConditions: '',
    guardianName: '',
    guardianRelationship: '',
    guardianPhone: '',
    selectedDoctorId: '',
    primaryComplaint: '',
    appointmentDate: '',
    appointmentSession: '',
    appointmentTime: '',
    temperature: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    advanceAmount: '',
    advancePaymentMethod: 'cash',
    advanceReferenceNumber: '',
    advanceNotes: ''
  });

  useEffect(() => {
    loadDoctors();
    generatePreviewUHID();
  }, []);

  useEffect(() => {
    if (formData.selectedDoctorId) {
      loadAvailableDates();
    }
  }, [formData.selectedDoctorId]);

  useEffect(() => {
    if (formData.selectedDoctorId && formData.appointmentDate) {
      loadAvailableSlots();
    }
  }, [formData.selectedDoctorId, formData.appointmentDate]);

  const loadDoctors = async () => {
    try {
      const doctorsList = await getAllDoctorsSimple();
      setDoctors(doctorsList);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadAvailableDates = () => {
    // Generate next 30 days as available dates
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    setAvailableDates(dates);
  };

  const loadAvailableSlots = async () => {
    if (!formData.selectedDoctorId || !formData.appointmentDate) return;

    try {
      const slots = await getDoctorAvailableSlots(
        formData.selectedDoctorId,
        formData.appointmentDate
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots({ morning: [], afternoon: [], evening: [] });
    }
  };

  const generatePreviewUHID = async () => {
    try {
      const uhid = await generateUHID();
      setPreviewUHID(uhid);
    } catch (error) {
      console.error('Error generating UHID:', error);
    }
  };

  const calculateAgeFromDOB = (dob: string): string => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const calculateDOBFromAge = (age: string): string => {
    if (!age || isNaN(parseInt(age)) || parseInt(age) < 0 || parseInt(age) > 150) return '';
    const today = new Date();
    const birthYear = today.getFullYear() - parseInt(age);
    // Format as YYYY-MM-DD with leading zeros
    return `${birthYear}-02-01`; // February 1st as per requirements
  };

  const handleInputChange = (field: keyof RegistrationFormData, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate age when DOB changes
      if (field === 'dateOfBirth' && typeof value === 'string' && value) {
        const calculatedAge = calculateAgeFromDOB(value);
        updated.age = calculatedAge || '';
      }

      // Auto-calculate DOB when age changes (and DOB is empty)
      if (field === 'age' && typeof value === 'string' && value && !prev.dateOfBirth) {
        const estimatedDOB = calculateDOBFromAge(value);
        updated.dateOfBirth = estimatedDOB;
      }

      // Don't auto-calculate DOB when age changes - user must click button
      // This prevents issues with partial input

      return updated;
    });
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleStep1Complete = async () => {
    // Save patient to database
    setIsLoading(true);
    try {
      const patientData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        age: formData.age,
        diagnosis: formData.diagnosis,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies,
        hasDrugAllergy: formData.hasDrugAllergy,
        drugAllergyNames: formData.drugAllergyNames,
        medicalHistory: '',
        currentMedications: formData.currentMedications,
        chronicConditions: formData.chronicConditions,
        previousSurgeries: '',
        primaryComplaint: formData.primaryComplaint,
        admissionType: admissionType || '',
        guardianName: formData.guardianName,
        guardianRelationship: formData.guardianRelationship,
        guardianPhone: formData.guardianPhone,
        guardianAddress: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        insuranceProvider: '',
        insuranceNumber: '',
        initialSymptoms: '',
        referredBy: '',
        advanceAmount: formData.advanceAmount,
        advancePaymentMethod: formData.advancePaymentMethod,
        advanceReferenceNumber: formData.advanceReferenceNumber,
        advanceNotes: formData.advanceNotes
      };

      const result = await registerNewPatient(patientData, previewUHID);
      if (result.success && result.patient) {
        setPatientId(result.patient.id);
        handleNext();
      } else {
        alert('Failed to register patient: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error registering patient:', error);
      alert('Failed to register patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    try {
      // Create appointment
      const appointmentData = {
        patientId: patientId,
        doctorId: formData.selectedDoctorId,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        durationMinutes: 30,
        type: 'consultation' as const,
        chiefComplaint: formData.primaryComplaint,
        symptoms: formData.primaryComplaint,
        notes: '',
        isEmergency: false,
        sessionType: formData.appointmentSession as 'morning' | 'afternoon' | 'evening',
        bookingMethod: 'walk_in' as const
      };

      await createAppointment(appointmentData);

      // Get patient data with QR code and name
      const { data: patientData } = await supabase
        .from('patients')
        .select('qr_code, name')
        .eq('id', patientId)
        .single();

      onComplete({
        uhid: previewUHID,
        patientName: patientData?.name || `${formData.firstName} ${formData.lastName}`.trim(),
        qrCode: patientData?.qr_code,
        patientId: patientId
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSinglePageSubmit = async () => {
    setIsLoading(true);
    try {
      // 1. Save Patient
      const patientData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        age: formData.age,
        diagnosis: formData.diagnosis,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies,
        hasDrugAllergy: formData.hasDrugAllergy,
        drugAllergyNames: formData.drugAllergyNames,
        medicalHistory: '',
        currentMedications: formData.currentMedications,
        chronicConditions: formData.chronicConditions,
        previousSurgeries: '',
        primaryComplaint: formData.primaryComplaint,
        admissionType: admissionType || '',
        guardianName: formData.guardianName,
        guardianRelationship: formData.guardianRelationship,
        guardianPhone: formData.guardianPhone,
        guardianAddress: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        insuranceProvider: '',
        insuranceNumber: '',
        initialSymptoms: '',
        referredBy: '',
        advanceAmount: formData.advanceAmount,
        advancePaymentMethod: formData.advancePaymentMethod,
        advanceReferenceNumber: formData.advanceReferenceNumber,
        advanceNotes: formData.advanceNotes
      };

      const result = await registerNewPatient(patientData, previewUHID);
      if (!result.success || !result.patient) {
        throw new Error(result.error || 'Failed to register patient');
      }

      const newPatientId = result.patient.id;
      setPatientId(newPatientId);

      // 2. Create Appointment (if doctor selected)
      if (formData.selectedDoctorId) {
        const appointmentData = {
          patientId: newPatientId,
          doctorId: formData.selectedDoctorId,
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
          durationMinutes: 30,
          type: 'consultation' as const,
          chiefComplaint: formData.primaryComplaint,
          symptoms: formData.primaryComplaint,
          notes: '',
          isEmergency: false,
          sessionType: formData.appointmentSession as 'morning' | 'afternoon' | 'evening',
          bookingMethod: 'walk_in' as const
        };

        await createAppointment(appointmentData);
      }

      // 3. Complete
      onComplete({
        uhid: previewUHID,
        patientName: `${formData.firstName} ${formData.lastName}`.trim(),
        qrCode: result.qrCode, // Assuming result contains QR code if generated or we fetch it
        patientId: newPatientId
      });

    } catch (error) {
      console.error('Error in single page registration:', error);
      alert('Failed to register patient: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <User className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Step 1: Patient Information & Medical History</h3>
          <p className="text-sm text-gray-500">Complete patient details and save to database</p>
        </div>
      </div>

      {/* UHID Preview */}
      {previewUHID && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <Hash className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Patient UHID: {previewUHID}</p>
              <p className="text-sm text-green-700">Sequential format (resets monthly)</p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Personal Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className="input-field"
              placeholder="Enter first name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="input-field"
              placeholder="Enter last name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              className="input-field"
              max={new Date().toISOString().split('T')[0]}
            />
            {formData.dateOfBirth && (
              <p className="text-xs text-green-600 mt-1">Age: {formData.age} years</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age (if DOB unknown)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="input-field flex-1"
                placeholder="Enter age"
                min="0"
                max="150"
              />
              {formData.age && !formData.dateOfBirth && (
                <button
                  type="button"
                  onClick={() => {
                    const estimatedDOB = calculateDOBFromAge(formData.age);
                    handleInputChange('dateOfBirth', estimatedDOB);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium whitespace-nowrap"
                >
                  Calculate DOB
                </button>
              )}
            </div>
            {formData.age && !formData.dateOfBirth && parseInt(formData.age) > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Estimated DOB: Feb 1, {new Date().getFullYear() - parseInt(formData.age || '0')}
                <br />
                <span className="text-gray-600">Click "Calculate DOB" to set it</span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="input-field"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
            <select
              value={formData.maritalStatus}
              onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
              className="input-field"
            >
              <option value="">Select Status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="input-field"
              placeholder="+91-9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="input-field"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="input-field"
              rows={2}
              placeholder="Complete address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
            <input
              type="text"
              value={formData.diagnosis}
              onChange={(e) => handleInputChange('diagnosis', e.target.value)}
              className="input-field"
              placeholder="Enter diagnosis"
            />
          </div>
        </div>
      </div>

      {/* Medical History */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-4 flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Medical History (Brief Summary)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
            <select
              value={formData.bloodGroup}
              onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
              className="input-field"
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">General Allergies</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              className="input-field"
              placeholder="Food, environmental allergies"
            />
          </div>
        </div>

        {/* Drug Allergy - VITAL */}
        <div className="mt-4">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <label className="block text-sm font-semibold text-red-900 mb-2">
                  ⚠️ VITAL: Drug Allergy Information
                </label>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={!formData.hasDrugAllergy}
                      onChange={() => handleInputChange('hasDrugAllergy', false)}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">No Drug Allergies</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.hasDrugAllergy}
                      onChange={() => handleInputChange('hasDrugAllergy', true)}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="ml-2 text-sm font-medium text-red-700">Has Drug Allergies</span>
                  </label>
                </div>
                {formData.hasDrugAllergy && (
                  <div>
                    <label className="block text-sm font-semibold text-red-900 mb-1">
                      Specify Drug Names (Required)
                    </label>
                    <textarea
                      value={formData.drugAllergyNames}
                      onChange={(e) => handleInputChange('drugAllergyNames', e.target.value)}
                      className="input-field border-red-300"
                      rows={2}
                      placeholder="e.g., Penicillin, Aspirin, Ibuprofen"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
            <textarea
              value={formData.currentMedications}
              onChange={(e) => handleInputChange('currentMedications', e.target.value)}
              className="input-field"
              rows={2}
              placeholder="List current medications"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chronic Conditions</label>
            <input
              type="text"
              value={formData.chronicConditions}
              onChange={(e) => handleInputChange('chronicConditions', e.target.value)}
              className="input-field"
              placeholder="Diabetes, Hypertension, etc."
            />
          </div>
        </div>
      </div>

      {/* Advance Payment Section */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-medium text-green-900 mb-4 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Advance Payment (Optional)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount</label>
            <input
              type="number"
              value={formData.advanceAmount}
              onChange={(e) => handleInputChange('advanceAmount', e.target.value)}
              className="input-field"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={formData.advancePaymentMethod}
              onChange={(e) => handleInputChange('advancePaymentMethod', e.target.value)}
              className="input-field"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="net_banking">Net Banking</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={formData.advanceReferenceNumber}
              onChange={(e) => handleInputChange('advanceReferenceNumber', e.target.value)}
              className="input-field"
              placeholder="Transaction ID / Cheque No."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={formData.advanceNotes}
              onChange={(e) => handleInputChange('advanceNotes', e.target.value)}
              className="input-field"
              placeholder="Additional notes"
            />
          </div>
        </div>
        {formData.advanceAmount && parseFloat(formData.advanceAmount) > 0 && (
          <div className="mt-3 p-3 bg-green-100 rounded-lg border border-green-300">
            <p className="text-sm text-green-800">
              <strong>Advance Payment:</strong> ₹{parseFloat(formData.advanceAmount || '0').toFixed(2)} via {formData.advancePaymentMethod?.charAt(0).toUpperCase() + formData.advancePaymentMethod?.slice(1) || 'Cash'}
              {formData.advanceReferenceNumber && ` (Ref: ${formData.advanceReferenceNumber})`}
            </p>
          </div>
        )}
      </div>

      {/* Guardian Information */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-medium text-purple-900 mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Guardian / Attendant (Optional)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
            <input
              type="text"
              value={formData.guardianName}
              onChange={(e) => handleInputChange('guardianName', e.target.value)}
              className="input-field"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
            <select
              value={formData.guardianRelationship}
              onChange={(e) => handleInputChange('guardianRelationship', e.target.value)}
              className="input-field"
            >
              <option value="">Select</option>
              <option value="spouse">Spouse</option>
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="sibling">Sibling</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Phone</label>
            <input
              type="tel"
              value={formData.guardianPhone}
              onChange={(e) => handleInputChange('guardianPhone', e.target.value)}
              className="input-field"
              placeholder="+91-9876543210"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        {!singlePageMode && (
          <div className="flex justify-between w-full">
            <button onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleStep1Complete}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Saving Patient...' : 'Save & Continue to Appointment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => {
    const selectedDoctor = doctors.find(d => d.id === formData.selectedDoctorId);
    const workingDays = selectedDoctor?.availability_hours?.workingDays || [];
    const availableSessions = selectedDoctor?.availability_hours?.availableSessions || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Stethoscope className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Step 2: Doctor, Date & Time Selection</h3>
            <p className="text-sm text-gray-500">Choose doctor, select date from calendar, and pick time slot</p>
          </div>
        </div>

        {/* Doctor Selection */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Select Doctor
          </h4>
          <select
            value={formData.selectedDoctorId}
            onChange={(e) => {
              handleInputChange('selectedDoctorId', e.target.value);
              // Reset date and time when doctor changes
              handleInputChange('appointmentDate', '');
              handleInputChange('appointmentTime', '');
              handleInputChange('appointmentSession', '');
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

        {/* Calendar Date Selection */}
        {formData.selectedDoctorId && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Select Date
            </h4>

            <div className="flex justify-center gap-4 mb-4">
              <button
                onClick={() => setCurrentMonth(new Date())}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${currentMonth.getMonth() === new Date().getMonth()
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
                className={`px-4 py-2 rounded-lg font-medium text-sm ${currentMonth.getMonth() !== new Date().getMonth()
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
                <span className="text-xs text-purple-700">Current Month</span>
              </div>

              {/* Calendar Grid - Smaller */}
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
                  const isSelected = formData.appointmentDate === dateStr;
                  const isAvailable = isWorkingDay && !isPast;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (isAvailable) {
                          handleInputChange('appointmentDate', dateStr);
                          handleInputChange('appointmentTime', '');
                          handleInputChange('appointmentSession', '');
                        }
                      }}
                      disabled={!isAvailable}
                      className={`aspect-square rounded-md text-xs font-medium transition-all ${isSelected
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

              <div className="flex items-center gap-3 mt-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-100 border-2 border-orange-400 rounded"></div>
                  <span className="text-gray-600">Today</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-gray-600">Selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-100 rounded"></div>
                  <span className="text-gray-600">Unavailable</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time Slot Selection */}
        {formData.appointmentDate && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Select Time Slot
            </h4>

            <p className="text-sm text-gray-600 mb-4">
              Selected Date: <strong>{new Date(formData.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
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
                        handleInputChange('appointmentTime', time);
                        handleInputChange('appointmentSession', session);
                      }}
                      className={`p-2 text-sm rounded-lg border transition-all ${formData.appointmentTime === time
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
            disabled={!formData.selectedDoctorId || !formData.appointmentDate || !formData.appointmentTime || !formData.primaryComplaint}
            className="btn-primary"
          >
            Continue to Vitals
          </button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Heart className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Step 3: Patient Vitals</h3>
            <p className="text-sm text-gray-500">Record vital signs and measurements</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">Vital Signs</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature (°F)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleInputChange('temperature', e.target.value)}
                className="input-field"
                placeholder="98.6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Pressure (mmHg)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={formData.bloodPressureSystolic}
                  onChange={(e) => handleInputChange('bloodPressureSystolic', e.target.value)}
                  className="input-field"
                  placeholder="120"
                />
                <span className="text-gray-500">/</span>
                <input
                  type="number"
                  value={formData.bloodPressureDiastolic}
                  onChange={(e) => handleInputChange('bloodPressureDiastolic', e.target.value)}
                  className="input-field"
                  placeholder="80"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                value={formData.heartRate}
                onChange={(e) => handleInputChange('heartRate', e.target.value)}
                className="input-field"
                placeholder="72"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Respiratory Rate (breaths/min)
              </label>
              <input
                type="number"
                value={formData.respiratoryRate}
                onChange={(e) => handleInputChange('respiratoryRate', e.target.value)}
                className="input-field"
                placeholder="16"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Oxygen Saturation (%)
              </label>
              <input
                type="number"
                value={formData.oxygenSaturation}
                onChange={(e) => handleInputChange('oxygenSaturation', e.target.value)}
                className="input-field"
                placeholder="98"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="input-field"
                placeholder="70"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                className="input-field"
                placeholder="170"
              />
            </div>

            {formData.weight && formData.height && (
              <div className="md:col-span-2">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>BMI:</strong> {(parseFloat(formData.weight) / Math.pow(parseFloat(formData.height) / 100, 2)).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
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
  };

  const renderStep4 = () => {
    const selectedDoctor = doctors.find(d => d.id === formData.selectedDoctorId);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Step 4: Review & Confirm</h3>
            <p className="text-sm text-gray-500">Review all details before confirming</p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Patient Information</h4>
          <div className="space-y-2 text-sm">
            <p><strong>UHID:</strong> {previewUHID}</p>
            <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
            <p><strong>Age:</strong> {formData.age} years</p>
            <p><strong>Gender:</strong> {formData.gender}</p>
            <p><strong>Phone:</strong> {formData.phone}</p>
            {formData.hasDrugAllergy && (
              <p className="text-red-600">
                <strong>⚠️ Drug Allergies:</strong> {formData.drugAllergyNames}
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
            <p><strong>Date:</strong> {new Date(formData.appointmentDate).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>Time:</strong> {formData.appointmentTime} ({formData.appointmentSession})</p>
            <p><strong>Type:</strong> New Patient</p>
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
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h4 className="font-medium text-purple-900 mb-3">Vital Signs</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {formData.temperature && (
              <div>
                <p className="text-gray-600">Temperature</p>
                <p className="font-semibold">{formData.temperature}°F</p>
              </div>
            )}
            {formData.bloodPressureSystolic && formData.bloodPressureDiastolic && (
              <div>
                <p className="text-gray-600">Blood Pressure</p>
                <p className="font-semibold">{formData.bloodPressureSystolic}/{formData.bloodPressureDiastolic} mmHg</p>
              </div>
            )}
            {formData.heartRate && (
              <div>
                <p className="text-gray-600">Heart Rate</p>
                <p className="font-semibold">{formData.heartRate} bpm</p>
              </div>
            )}
            {formData.oxygenSaturation && (
              <div>
                <p className="text-gray-600">SpO2</p>
                <p className="font-semibold">{formData.oxygenSaturation}%</p>
              </div>
            )}
            {formData.weight && (
              <div>
                <p className="text-gray-600">Weight</p>
                <p className="font-semibold">{formData.weight} kg</p>
              </div>
            )}
            {formData.height && (
              <div>
                <p className="text-gray-600">Height</p>
                <p className="font-semibold">{formData.height} cm</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          {!singlePageMode && (
            <div className="flex justify-between w-full">
              <button onClick={handlePrevious} className="btn-secondary">
                Previous
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? 'Creating Appointment...' : 'Confirm & Complete Registration'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex flex-col items-center ${step <= currentStep ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step <= currentStep
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
            <div className={`w-16 h-0.5 mx-2 ${step < currentStep ? 'bg-orange-500' : 'bg-gray-300'
              }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">New Patient Registration</h2>
              <p className="text-sm text-gray-500">
                {singlePageMode ? 'Complete inpatient registration' : 'Complete registration with appointment scheduling'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {!singlePageMode && renderStepIndicator()}

        {singlePageMode ? (
          <div className="space-y-8">
            {renderStep1()}
            {renderStep2()}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSinglePageSubmit}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Register Inpatient
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </>
        )}
      </div>
    </div>
  );
}
