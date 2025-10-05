'use client';
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Heart, 
  Shield, 
  AlertTriangle,
  AlertCircle,
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
  ClipboardList,
  CalendarCheck,
  Printer
} from 'lucide-react';
import { generateUHID } from '../src/lib/patientService';
import { getAllDoctorsSimple } from '../src/lib/doctorService';
import PatientRegistrationLabel from './PatientRegistrationLabel';

interface PatientRegistrationData {
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: string; // Can be entered directly if DOB unknown
  gender: string;
  maritalStatus?: string;
  phone: string;
  email?: string;
  address: string;
  
  // Medical Information
  bloodGroup: string;
  allergies: string;
  hasDrugAllergy: boolean;
  drugAllergyNames: string; // Specific drug names if allergic
  medicalHistory: string;
  currentMedications: string;
  chronicConditions: string;
  previousSurgeries: string;
  
  // Appointment Information (replacing admission)
  appointmentDoctorId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  primaryComplaint: string;
  appointmentType: string; // new_patient, follow_up, consultation
  
  // Guardian/Attendant Details
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianAddress?: string;
  
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  
  // Insurance Information
  insuranceProvider?: string;
  insuranceNumber?: string;
  
  // Initial Visit Information
  initialSymptoms?: string;
  referredBy?: string;
}

interface EnhancedPatientRegistrationFormProps {
  onSubmit: (data: PatientRegistrationData, previewUHID?: string) => Promise<{ qrCode?: string }>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EnhancedPatientRegistrationForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: EnhancedPatientRegistrationFormProps) {
  const [formData, setFormData] = useState<PatientRegistrationData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    maritalStatus: '',
    phone: '',
    email: '',
    address: '',
    bloodGroup: '',
    allergies: '',
    hasDrugAllergy: false,
    drugAllergyNames: '',
    medicalHistory: '',
    currentMedications: '',
    chronicConditions: '',
    previousSurgeries: '',
    appointmentDoctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    primaryComplaint: '',
    appointmentType: 'new_patient',
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
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [showPrintLabel, setShowPrintLabel] = useState(false);
  const [registeredPatient, setRegisteredPatient] = useState<any>(null);

  // Load doctors on component mount
  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const doctorsList = await getAllDoctorsSimple();
      setDoctors(doctorsList);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Calculate age from DOB
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

  // Calculate DOB from age (assumes birthday is 1st January of calculated year)
  const calculateDOBFromAge = (age: string): string => {
    if (!age || isNaN(parseInt(age))) return '';
    const today = new Date();
    const birthYear = today.getFullYear() - parseInt(age);
    // Set to 1st January of the calculated year
    return `${birthYear}-01-01`;
  };

  const handleInputChange = (field: keyof PatientRegistrationData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate age when DOB changes
      if (field === 'dateOfBirth' && value) {
        updated.age = calculateAgeFromDOB(value);
      }
      
      // Auto-calculate DOB when age changes (and DOB is empty)
      if (field === 'age' && value && !prev.dateOfBirth) {
        updated.dateOfBirth = calculateDOBFromAge(value);
      }
      
      return updated;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    // All fields are optional - no validation needed
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
          return;
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
    
    // Ensure UHID is generated before submission
    if (!previewUHID) {
      const uhidGenerated = await generatePreviewUHID();
      if (!uhidGenerated) {
        return;
      }
    }
    
    const result = await onSubmit(formData, previewUHID);
    
    // After successful registration, show print label option
    setRegisteredPatient({
      uhid: previewUHID,
      name: `${formData.firstName} ${formData.lastName}`.trim() || `Patient ${previewUHID}`,
      dateOfVisit: new Date().toISOString(),
      qrCode: result?.qrCode
    });
    setShowPrintLabel(true);
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
              <p className="text-sm text-green-700">Format: AH{'{YY}{MM}'}-{'{XXXX}'} (Sequential, resets monthly)</p>
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
            className="input-field"
            placeholder="Enter first name"
          />
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
            className="input-field"
            placeholder="Enter last name"
          />
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
            className="input-field"
            max={new Date().toISOString().split('T')[0]}
          />
          {formData.dateOfBirth && (
            <p className="text-xs text-green-600 mt-1">
              Auto-calculated age: {formData.age} years
            </p>
          )}
        </div>

        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
            Age (Years) <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="number"
            id="age"
            value={formData.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            className="input-field"
            placeholder="Enter age if DOB unknown"
            min="0"
            max="150"
          />
          {formData.age && !formData.dateOfBirth && (
            <p className="text-xs text-blue-600 mt-1">
              Estimated DOB: 1st Jan {new Date().getFullYear() - parseInt(formData.age)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gender <span className="text-gray-400">(Optional)</span>
          </label>
          <select
            id="gender"
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
            className="input-field"
            placeholder="+91-9876543210"
          />
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
          className="input-field"
          placeholder="Enter complete address with city, state, and pincode"
        />
      </div>
    </div>
  );

  const renderAppointmentStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <CalendarCheck className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Appointment Registration</h3>
          <p className="text-sm text-gray-500">Schedule an appointment with a doctor</p>
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
          </div>
        </div>
      )}

      {/* Appointment Information */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-medium text-purple-900 mb-4 flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Appointment Details
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="appointmentDoctorId" className="block text-sm font-medium text-gray-700 mb-1">
              Select Doctor <span className="text-gray-400">(Optional)</span>
            </label>
            <select
              id="appointmentDoctorId"
              value={formData.appointmentDoctorId}
              onChange={(e) => handleInputChange('appointmentDoctorId', e.target.value)}
              className="input-field"
              disabled={loadingDoctors}
            >
              <option value="">Select a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user?.name || 'Unknown'} - {doctor.specialization} 
                  {doctor.consultation_fee ? ` (₹${doctor.consultation_fee})` : ''}
                </option>
              ))}
            </select>
            {loadingDoctors && (
              <p className="text-xs text-gray-500 mt-1">Loading doctors...</p>
            )}
          </div>

          <div>
            <label htmlFor="appointmentDate" className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Date <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="date"
              id="appointmentDate"
              value={formData.appointmentDate}
              onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
              className="input-field"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label htmlFor="appointmentTime" className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Time <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="time"
              id="appointmentTime"
              value={formData.appointmentTime}
              onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
              className="input-field"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="appointmentType" className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Type <span className="text-gray-400">(Optional)</span>
            </label>
            <select
              id="appointmentType"
              value={formData.appointmentType}
              onChange={(e) => handleInputChange('appointmentType', e.target.value)}
              className="input-field"
            >
              <option value="new_patient">New Patient</option>
              <option value="follow_up">Follow-up</option>
              <option value="consultation">Consultation</option>
              <option value="routine_checkup">Routine Checkup</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="primaryComplaint" className="block text-sm font-medium text-gray-700 mb-1">
              Primary Complaint / Reason for Visit <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="primaryComplaint"
              rows={3}
              value={formData.primaryComplaint}
              onChange={(e) => handleInputChange('primaryComplaint', e.target.value)}
              className="input-field"
              placeholder="Describe the main reason for this visit"
            />
          </div>
        </div>
      </div>

      {/* Medical History */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-medium text-green-900 mb-4 flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Medical History (Brief Summary)
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
              General Allergies <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="allergies"
              rows={2}
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              className="input-field"
              placeholder="List any known allergies (e.g., Peanuts, Dust, Pollen, etc.)"
            />
          </div>

          {/* Drug Allergy - Critical Vital Information */}
          <div className="md:col-span-2">
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-red-900 mb-2">
                    ⚠️ VITAL: Drug Allergy Information
                  </label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="hasDrugAllergy"
                          checked={!formData.hasDrugAllergy}
                          onChange={() => {
                            setFormData(prev => ({ ...prev, hasDrugAllergy: false, drugAllergyNames: '' }));
                          }}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">No Drug Allergies</span>
                      </label>
                      
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="hasDrugAllergy"
                          checked={formData.hasDrugAllergy}
                          onChange={() => {
                            setFormData(prev => ({ ...prev, hasDrugAllergy: true }));
                          }}
                          className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="ml-2 text-sm font-medium text-red-700">Has Drug Allergies</span>
                      </label>
                    </div>
                    
                    {formData.hasDrugAllergy && (
                      <div className="mt-3">
                        <label htmlFor="drugAllergyNames" className="block text-sm font-semibold text-red-900 mb-1">
                          Specify Drug Names <span className="text-red-700">(Required if allergic)</span>
                        </label>
                        <textarea
                          id="drugAllergyNames"
                          rows={3}
                          value={formData.drugAllergyNames}
                          onChange={(e) => handleInputChange('drugAllergyNames', e.target.value)}
                          className="input-field border-red-300 focus:ring-red-500 focus:border-red-500"
                          placeholder="List specific drug names (e.g., Penicillin, Aspirin, Ibuprofen, Sulfa drugs, etc.)"
                          required={formData.hasDrugAllergy}
                        />
                        <p className="text-xs text-red-700 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Please list all drugs the patient is allergic to. This is critical for safe treatment.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
          <h3 className="text-lg font-semibold text-gray-900">Guardian / Attendant Details</h3>
          <p className="text-sm text-gray-500">Optional information for guardian or attendant</p>
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
          <p className="text-sm text-gray-500">Emergency contact and insurance details</p>
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

  // If registration is complete and showing print label
  if (showPrintLabel && registeredPatient) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600">Patient has been registered with UHID: <span className="font-mono font-bold text-green-600">{registeredPatient.uhid}</span></p>
        </div>

        <PatientRegistrationLabel
          uhid={registeredPatient.uhid}
          patientName={registeredPatient.name}
          dateOfVisit={registeredPatient.dateOfVisit}
          qrCode={registeredPatient.qrCode}
        />

        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => {
              setShowPrintLabel(false);
              setRegisteredPatient(null);
              setCurrentStep(1);
              setPreviewUHID('');
              setFormData({
                firstName: '',
                lastName: '',
                dateOfBirth: '',
                age: '',
                gender: '',
                maritalStatus: '',
                phone: '',
                email: '',
                address: '',
                bloodGroup: '',
                allergies: '',
                hasDrugAllergy: false,
                drugAllergyNames: '',
                medicalHistory: '',
                currentMedications: '',
                chronicConditions: '',
                previousSurgeries: '',
                appointmentDoctorId: '',
                appointmentDate: '',
                appointmentTime: '',
                primaryComplaint: '',
                appointmentType: 'new_patient',
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
            }}
            className="btn-primary"
          >
            Register Another Patient
          </button>
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

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
              <p className="text-sm text-gray-500">Enhanced registration with appointment scheduling</p>
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
        {currentStep === 2 && renderAppointmentStep()}
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
