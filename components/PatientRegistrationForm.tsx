'use client';
import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Heart, 
  Shield, 
  AlertTriangle,
  Save,
  X,
  UserPlus,
  FileText,
  Users,
  Hash,
  CheckCircle,
  Clock,
  Stethoscope,
  Building,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { generateUHID } from '../src/lib/patientService';

interface PatientRegistrationData {
  // Personal Information (Mandatory)
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus?: string; // single, married, divorced, widowed, separated
  phone: string;
  email?: string;
  address: string;
  
  // Medical & Admission Information 
  bloodGroup: string;
  allergies: string;
  medicalHistory: string;
  currentMedications: string;
  chronicConditions: string;
  previousSurgeries: string;
  
  // Admission Details
  admissionDate?: string;
  admissionTime?: string;
  primaryComplaint: string;
  admissionType: string; // emergency, elective, referred
  referringDoctorFacility?: string;
  consultingDoctorName?: string;
  consultingDoctorId?: string;
  departmentWard?: string;
  roomNumber?: string;
  
  // Guardian/Attendant Details (Optional)
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianAddress?: string;
  
  // Emergency Contact (Optional)
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  
  // Insurance Information (Optional)
  insuranceProvider?: string;
  insuranceNumber?: string;
  
  // Initial Visit Information
  initialSymptoms?: string;
  referredBy?: string;
}

interface PatientRegistrationFormProps {
  onSubmit: (data: PatientRegistrationData, previewUHID?: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PatientRegistrationForm({ onSubmit, onCancel, isLoading = false }: PatientRegistrationFormProps) {
  const [formData, setFormData] = useState<PatientRegistrationData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    phone: '',
    email: '',
    address: '',
    bloodGroup: '',
    allergies: '',
    medicalHistory: '',
    currentMedications: '',
    chronicConditions: '',
    previousSurgeries: '',
    admissionDate: '',
    admissionTime: '',
    primaryComplaint: '',
    admissionType: '',
    referringDoctorFacility: '',
    consultingDoctorName: '',
    consultingDoctorId: '',
    departmentWard: '',
    roomNumber: '',
    guardianName: '',
    guardianRelationship: '',
    guardianPhone: '',
    guardianAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    insuranceProvider: '',
    insuranceNumber: '',
    initialSymptoms: '',
    referredBy: ''
  });

  const [errors, setErrors] = useState<Partial<PatientRegistrationData>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [previewUHID, setPreviewUHID] = useState<string>('');
  const [isGeneratingUHID, setIsGeneratingUHID] = useState(false);

  const handleInputChange = (field: keyof PatientRegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    // All fields are now optional - no validation needed
    return true;
  };

  const generatePreviewUHID = async () => {
    try {
      setIsGeneratingUHID(true);
      const uhid = await generateUHID();
      setPreviewUHID(uhid);
      return true;
    } catch (error) {
      console.error('Error generating UHID preview:', error);
      setErrors({ firstName: 'Failed to generate UHID. Please try again.' });
      return false;
    } finally {
      setIsGeneratingUHID(false);
    }
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      // Generate UHID when moving from step 1 to step 2
      if (currentStep === 1 && !previewUHID) {
        const uhidGenerated = await generatePreviewUHID();
        if (!uhidGenerated) {
          return; // Don't proceed if UHID generation failed
        }
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // No validation needed - all fields are optional
    // Ensure UHID is generated before submission
    if (!previewUHID) {
      const uhidGenerated = await generatePreviewUHID();
      if (!uhidGenerated) {
        return;
      }
    }
    await onSubmit(formData, previewUHID);
  };

  const renderPersonalInfoStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <User className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          <p className="text-sm text-gray-500">Basic patient details <span className="text-gray-400">(All fields optional)</span></p>
        </div>
      </div>

      {/* UHID Preview Section */}
      {previewUHID && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Hash className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Generated Patient UHID</h4>
              <p className="text-sm text-green-700">This will be the patient's unique hospital ID</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-green-300">
            <p className="font-mono text-xl font-bold text-green-900 text-center tracking-wider">
              {previewUHID}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className={`input-field ${errors.firstName ? 'border-red-300' : ''}`}
            placeholder="Enter first name"
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className={`input-field ${errors.lastName ? 'border-red-300' : ''}`}
            placeholder="Enter last name"
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="date"
            id="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            className={`input-field ${errors.dateOfBirth ? 'border-red-300' : ''}`}
          />
          {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gender <span className="text-gray-400">(Optional)</span>
          </label>
          <select
            id="gender"
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className={`input-field ${errors.gender ? 'border-red-300' : ''}`}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
        </div>

        <div>
          <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700 mb-1">
            Marital Status <span className="text-gray-400">(Optional)</span>
          </label>
          <select
            id="maritalStatus"
            value={formData.maritalStatus}
            onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
            className="input-field"
          >
            <option value="">Select Marital Status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="separated">Separated</option>
          </select>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`input-field ${errors.phone ? 'border-red-300' : ''}`}
            placeholder="+91-9876543210"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="input-field"
            placeholder="Enter email address"
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Complete Address <span className="text-gray-400">(Optional)</span>
        </label>
        <textarea
          id="address"
          rows={3}
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          className={`input-field ${errors.address ? 'border-red-300' : ''}`}
          placeholder="Enter complete address with city, state, and pincode"
        />
        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
      </div>
    </div>
  );

  const renderMedicalAdmissionStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Stethoscope className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🏥 Medical & Admission Information</h3>
          <p className="text-sm text-gray-500">Comprehensive medical details and admission information</p>
        </div>
      </div>

      {/* Show UHID Info */}
      {previewUHID && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Hash className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Patient UHID: {previewUHID}</h4>
                <p className="text-sm text-gray-600">Unique Hospital ID assigned to this patient</p>
              </div>
            </div>
            <button
              type="button"
              onClick={generatePreviewUHID}
              disabled={isGeneratingUHID}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {isGeneratingUHID ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}

      {/* Admission Information */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-medium text-purple-900 mb-4 flex items-center gap-2">
          <Building className="h-4 w-4" />
          Admission Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="admissionDate" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Admission <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="date"
              id="admissionDate"
              value={formData.admissionDate}
              onChange={(e) => handleInputChange('admissionDate', e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="admissionTime" className="block text-sm font-medium text-gray-700 mb-1">
              Time of Admission <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="time"
              id="admissionTime"
              value={formData.admissionTime}
              onChange={(e) => handleInputChange('admissionTime', e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="admissionType" className="block text-sm font-medium text-gray-700 mb-1">
              Type of Admission <span className="text-gray-400">(Optional)</span>
            </label>
            <select
              id="admissionType"
              value={formData.admissionType}
              onChange={(e) => handleInputChange('admissionType', e.target.value)}
              className={`input-field ${errors.admissionType ? 'border-red-300' : ''}`}
            >
              <option value="">Select Admission Type</option>
              <option value="emergency">Emergency</option>
              <option value="elective">Elective</option>
              <option value="referred">Referred</option>
            </select>
            {errors.admissionType && <p className="text-red-500 text-xs mt-1">{errors.admissionType}</p>}
          </div>

          <div>
            <label htmlFor="departmentWard" className="block text-sm font-medium text-gray-700 mb-1">
              Department / Ward <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              id="departmentWard"
              value={formData.departmentWard}
              onChange={(e) => handleInputChange('departmentWard', e.target.value)}
              className="input-field"
              placeholder="e.g., Cardiology, ICU, General Ward"
            />
          </div>

          <div>
            <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Room Number <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              id="roomNumber"
              value={formData.roomNumber}
              onChange={(e) => handleInputChange('roomNumber', e.target.value)}
              className="input-field"
              placeholder="e.g., ICU-04, Room 201"
            />
          </div>

          <div>
            <label htmlFor="referringDoctorFacility" className="block text-sm font-medium text-gray-700 mb-1">
              Referring Doctor/Facility <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              id="referringDoctorFacility"
              value={formData.referringDoctorFacility}
              onChange={(e) => handleInputChange('referringDoctorFacility', e.target.value)}
              className="input-field"
              placeholder="Doctor name or facility name"
            />
          </div>

          <div>
            <label htmlFor="consultingDoctorName" className="block text-sm font-medium text-gray-700 mb-1">
              Consulting Doctor's Name <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              id="consultingDoctorName"
              value={formData.consultingDoctorName}
              onChange={(e) => handleInputChange('consultingDoctorName', e.target.value)}
              className="input-field"
              placeholder="Name of the consulting doctor"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="primaryComplaint" className="block text-sm font-medium text-gray-700 mb-1">
            Primary Complaint / Reason for Visit <span className="text-gray-400">(Optional)</span>
          </label>
          <textarea
            id="primaryComplaint"
            rows={3}
            value={formData.primaryComplaint}
            onChange={(e) => handleInputChange('primaryComplaint', e.target.value)}
            className={`input-field ${errors.primaryComplaint ? 'border-red-300' : ''}`}
            placeholder="Describe the main reason for this visit or admission"
          />
          {errors.primaryComplaint && <p className="text-red-500 text-xs mt-1">{errors.primaryComplaint}</p>}
        </div>
      </div>

      {/* Medical History */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-medium text-green-900 mb-4 flex items-center gap-2">
          <Heart className="h-4 w-4" />
          🧬 Medical History (Short Summary at Admission)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700 mb-1">
              Blood Group <span className="text-gray-400">(Optional)</span>
            </label>
            <select
              id="bloodGroup"
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
            <label htmlFor="initialSymptoms" className="block text-sm font-medium text-gray-700 mb-1">
              Current Symptoms <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              id="initialSymptoms"
              value={formData.initialSymptoms}
              onChange={(e) => handleInputChange('initialSymptoms', e.target.value)}
              className="input-field"
              placeholder="Current symptoms being experienced"
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
              Allergies <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="allergies"
              rows={2}
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              className="input-field"
              placeholder="List any known allergies (e.g., Penicillin, Peanuts, etc.)"
            />
          </div>

          <div>
            <label htmlFor="currentMedications" className="block text-sm font-medium text-gray-700 mb-1">
              Current Medications <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="currentMedications"
              rows={2}
              value={formData.currentMedications}
              onChange={(e) => handleInputChange('currentMedications', e.target.value)}
              className="input-field"
              placeholder="List current medications with dosages"
            />
          </div>

          <div>
            <label htmlFor="chronicConditions" className="block text-sm font-medium text-gray-700 mb-1">
              Chronic Conditions <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              id="chronicConditions"
              value={formData.chronicConditions}
              onChange={(e) => handleInputChange('chronicConditions', e.target.value)}
              className="input-field"
              placeholder="e.g., Diabetes, Hypertension, Heart Disease"
            />
          </div>

          <div>
            <label htmlFor="previousSurgeries" className="block text-sm font-medium text-gray-700 mb-1">
              Previous Surgeries or Hospitalizations <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="previousSurgeries"
              rows={2}
              value={formData.previousSurgeries}
              onChange={(e) => handleInputChange('previousSurgeries', e.target.value)}
              className="input-field"
              placeholder="Previous surgeries, hospitalizations, and significant medical events"
            />
          </div>

          <div>
            <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Medical History <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="medicalHistory"
              rows={3}
              value={formData.medicalHistory}
              onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
              className="input-field"
              placeholder="Any other relevant medical history or family medical history"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderGuardianStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <UserCheck className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🧑‍🤝‍🧑 Guardian / Attendant / Next of Kin Details</h3>
          <p className="text-sm text-gray-500">Optional information for guardian or attendant <span className="text-gray-400">* All fields optional</span></p>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-medium text-purple-900 mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Guardian / Attendant Information (Optional)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700 mb-1">
              Name of Guardian / Attendant
            </label>
            <input
              type="text"
              id="guardianName"
              value={formData.guardianName}
              onChange={(e) => handleInputChange('guardianName', e.target.value)}
              className="input-field"
              placeholder="Full name of guardian or attendant"
            />
          </div>

          <div>
            <label htmlFor="guardianRelationship" className="block text-sm font-medium text-gray-700 mb-1">
              Relationship with Patient
            </label>
            <select
              id="guardianRelationship"
              value={formData.guardianRelationship}
              onChange={(e) => handleInputChange('guardianRelationship', e.target.value)}
              className="input-field"
            >
              <option value="">Select Relationship</option>
              <option value="spouse">Spouse</option>
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="sibling">Sibling</option>
              <option value="relative">Relative</option>
              <option value="guardian">Legal Guardian</option>
              <option value="attendant">Attendant</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              id="guardianPhone"
              value={formData.guardianPhone}
              onChange={(e) => handleInputChange('guardianPhone', e.target.value)}
              className="input-field"
              placeholder="+91-9876543210"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="guardianAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Address (if different from patient)
            </label>
            <textarea
              id="guardianAddress"
              rows={2}
              value={formData.guardianAddress}
              onChange={(e) => handleInputChange('guardianAddress', e.target.value)}
              className="input-field"
              placeholder="Complete address of guardian/attendant if different from patient"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmergencyContactStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <ClipboardList className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Emergency Contact & Insurance</h3>
          <p className="text-sm text-gray-500">Emergency contact and insurance details <span className="text-gray-400">* All fields optional</span></p>
        </div>
      </div>

      {/* Final UHID Confirmation */}
      {previewUHID && (
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Hash className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h4 className="font-semibold text-orange-900">Final Confirmation - Patient UHID</h4>
              <p className="text-sm text-orange-700">This UHID will be assigned to the patient</p>
            </div>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-orange-300">
            <p className="font-mono text-xl font-bold text-orange-900 text-center tracking-wider">
              {previewUHID}
            </p>
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <h4 className="font-medium text-red-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Emergency Contact Information (Optional)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              type="text"
              id="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
              className="input-field"
              placeholder="Full name"
            />
          </div>

          <div>
            <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              id="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
              className="input-field"
              placeholder="+91-9876543210"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-700 mb-1">
              Relationship
            </label>
            <select
              id="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
              className="input-field"
            >
              <option value="">Select Relationship</option>
              <option value="spouse">Spouse</option>
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="sibling">Sibling</option>
              <option value="relative">Relative</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Insurance Information */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Insurance Information (Optional)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="insuranceProvider" className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Provider
            </label>
            <input
              type="text"
              id="insuranceProvider"
              value={formData.insuranceProvider}
              onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
              className="input-field"
              placeholder="Insurance company name"
            />
          </div>

          <div>
            <label htmlFor="insuranceNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Policy Number
            </label>
            <input
              type="text"
              id="insuranceNumber"
              value={formData.insuranceNumber}
              onChange={(e) => handleInputChange('insuranceNumber', e.target.value)}
              className="input-field"
              placeholder="Policy/Member ID"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            step <= currentStep 
              ? 'bg-orange-500 border-orange-500 text-white' 
              : 'border-gray-300 text-gray-400'
          }`}>
            {step}
          </div>
          {step < 4 && (
            <div className={`w-12 h-0.5 mx-2 ${
              step < currentStep ? 'bg-orange-500' : 'bg-gray-300'
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
              <p className="text-sm text-gray-500">Comprehensive patient registration with medical and admission details</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {renderStepIndicator()}

        {currentStep === 1 && renderPersonalInfoStep()}
        {currentStep === 2 && renderMedicalAdmissionStep()}
        {currentStep === 3 && renderGuardianStep()}
        {currentStep === 4 && renderEmergencyContactStep()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="btn-secondary"
                disabled={isLoading}
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary flex items-center gap-2"
                disabled={isLoading || isGeneratingUHID}
              >
                {isGeneratingUHID ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating UHID...
                  </>
                ) : (
                  'Next'
                )}
              </button>
            ) : (
              <button
                type="submit"
                className="btn-primary flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Register Patient
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}