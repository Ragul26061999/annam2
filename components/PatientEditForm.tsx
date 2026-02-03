'use client';
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Save, 
  X, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Heart, 
  AlertTriangle,
  FileText,
  Users,
  Shield,
  Stethoscope,
  Activity,
  Pill,
  ClipboardList
} from 'lucide-react';

interface PatientEditData {
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  maritalStatus: string;
  
  // Medical Information
  bloodGroup: string;
  allergies: string;
  medicalHistory: string;
  currentMedications: string;
  chronicConditions: string;
  previousSurgeries: string;
  
  // Current Health Status
  primaryComplaint: string;
  initialSymptoms: string;
  
  // Guardian/Attendant Details
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianAddress: string;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  
  // Insurance Information
  insuranceProvider: string;
  insuranceNumber: string;
  
  // Additional Information
  referredBy: string;
  status: string;
}

interface PatientEditFormProps {
  patient: any;
  onSave: (data: PatientEditData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PatientEditForm({ patient, onSave, onCancel, isLoading = false }: PatientEditFormProps) {
  const [formData, setFormData] = useState<PatientEditData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    maritalStatus: '',
    bloodGroup: '',
    allergies: '',
    medicalHistory: '',
    currentMedications: '',
    chronicConditions: '',
    previousSurgeries: '',
    primaryComplaint: '',
    initialSymptoms: '',
    guardianName: '',
    guardianRelationship: '',
    guardianPhone: '',
    guardianAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    insuranceProvider: '',
    insuranceNumber: '',
    referredBy: '',
    status: ''
  });
  
  const [activeTab, setActiveTab] = useState('personal');
  const [errors, setErrors] = useState<Partial<PatientEditData>>({});

  // Initialize form data with patient information
  useEffect(() => {
    if (patient) {
      // Split name into first and last name
      const nameParts = patient.name?.split(' ') || ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        firstName,
        lastName,
        dateOfBirth: patient.date_of_birth || '',
        gender: patient.gender || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        maritalStatus: patient.marital_status || '',
        bloodGroup: patient.blood_group || '',
        allergies: patient.allergies || '',
        medicalHistory: patient.medical_history || '',
        currentMedications: patient.current_medications || '',
        chronicConditions: patient.chronic_conditions || '',
        previousSurgeries: patient.previous_surgeries || '',
        primaryComplaint: patient.primary_complaint || '',
        initialSymptoms: patient.initial_symptoms || '',
        guardianName: patient.guardian_name || '',
        guardianRelationship: patient.guardian_relationship || '',
        guardianPhone: patient.guardian_phone || '',
        guardianAddress: patient.guardian_address || '',
        emergencyContactName: patient.emergency_contact_name || '',
        emergencyContactPhone: patient.emergency_contact_phone || '',
        emergencyContactRelationship: patient.emergency_contact_relationship || '',
        insuranceProvider: patient.insurance_provider || '',
        insuranceNumber: patient.insurance_number || '',
        referredBy: patient.referred_by || '',
        status: patient.status || 'active'
      });
    }
  }, [patient]);

  const handleInputChange = (field: keyof PatientEditData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PatientEditData> = {};

    // Only firstName is mandatory
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      return;
    }

    console.log('Submitting form data:', JSON.stringify(formData, null, 2));

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving patient data:', error);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'medical', label: 'Medical Info', icon: Heart },
    { id: 'health', label: 'Health Status', icon: Activity },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'insurance', label: 'Insurance', icon: Shield }
  ];

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.firstName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter first name"
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter last name"
          />
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            id="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            id="gender"
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter email address"
          />
        </div>

        <div>
          <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700 mb-1">
            Marital Status
          </label>
          <select
            id="maritalStatus"
            value={formData.maritalStatus}
            onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="separated">Separated</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter full address"
        />
      </div>
    </div>
  );

  const renderMedicalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700 mb-1">
            Blood Group
          </label>
          <select
            id="bloodGroup"
            value={formData.bloodGroup}
            onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      </div>

      <div>
        <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
          Known Allergies
        </label>
        <textarea
          id="allergies"
          value={formData.allergies}
          onChange={(e) => handleInputChange('allergies', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="List any known allergies (medications, food, environmental, etc.)"
        />
      </div>

      <div>
        <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-1">
          Medical History
        </label>
        <textarea
          id="medicalHistory"
          value={formData.medicalHistory}
          onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Previous medical conditions, hospitalizations, treatments, etc."
        />
      </div>

      <div>
        <label htmlFor="currentMedications" className="block text-sm font-medium text-gray-700 mb-1">
          Current Medications
        </label>
        <textarea
          id="currentMedications"
          value={formData.currentMedications}
          onChange={(e) => handleInputChange('currentMedications', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="List all current medications with dosages"
        />
      </div>

      <div>
        <label htmlFor="chronicConditions" className="block text-sm font-medium text-gray-700 mb-1">
          Chronic Conditions
        </label>
        <textarea
          id="chronicConditions"
          value={formData.chronicConditions}
          onChange={(e) => handleInputChange('chronicConditions', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ongoing medical conditions (diabetes, hypertension, etc.)"
        />
      </div>

      <div>
        <label htmlFor="previousSurgeries" className="block text-sm font-medium text-gray-700 mb-1">
          Previous Surgeries
        </label>
        <textarea
          id="previousSurgeries"
          value={formData.previousSurgeries}
          onChange={(e) => handleInputChange('previousSurgeries', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="List previous surgeries with dates"
        />
      </div>
    </div>
  );

  const renderHealthStatus = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="primaryComplaint" className="block text-sm font-medium text-gray-700 mb-1">
          Primary Complaint
        </label>
        <textarea
          id="primaryComplaint"
          value={formData.primaryComplaint}
          onChange={(e) => handleInputChange('primaryComplaint', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Main reason for current visit or ongoing care"
        />
      </div>

      <div>
        <label htmlFor="initialSymptoms" className="block text-sm font-medium text-gray-700 mb-1">
          Current Symptoms
        </label>
        <textarea
          id="initialSymptoms"
          value={formData.initialSymptoms}
          onChange={(e) => handleInputChange('initialSymptoms', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe current symptoms, duration, severity, etc."
        />
      </div>

      <div>
        <label htmlFor="referredBy" className="block text-sm font-medium text-gray-700 mb-1">
          Referred By
        </label>
        <input
          type="text"
          id="referredBy"
          value={formData.referredBy}
          onChange={(e) => handleInputChange('referredBy', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Doctor or facility that referred the patient"
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Patient Status
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="active">Active</option>
          <option value="stable">Stable</option>
          <option value="critical">Critical</option>
          <option value="recovering">Recovering</option>
          <option value="discharged">Discharged</option>
        </select>
      </div>
    </div>
  );

  const renderContactsInfo = () => (
    <div className="space-y-8">
      {/* Guardian/Attendant Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Guardian/Attendant Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700 mb-1">
              Guardian Name
            </label>
            <input
              type="text"
              id="guardianName"
              value={formData.guardianName}
              onChange={(e) => handleInputChange('guardianName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter guardian's full name"
            />
          </div>

          <div>
            <label htmlFor="guardianRelationship" className="block text-sm font-medium text-gray-700 mb-1">
              Relationship
            </label>
            <select
              id="guardianRelationship"
              value={formData.guardianRelationship}
              onChange={(e) => handleInputChange('guardianRelationship', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Relationship</option>
              <option value="parent">Parent</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="sibling">Sibling</option>
              <option value="relative">Relative</option>
              <option value="friend">Friend</option>
              <option value="caregiver">Caregiver</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Guardian Phone
            </label>
            <input
              type="tel"
              id="guardianPhone"
              value={formData.guardianPhone}
              onChange={(e) => handleInputChange('guardianPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter guardian's phone number"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="guardianAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Guardian Address
          </label>
          <textarea
            id="guardianAddress"
            value={formData.guardianAddress}
            onChange={(e) => handleInputChange('guardianAddress', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter guardian's address"
          />
        </div>
      </div>

      {/* Emergency Contact Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Emergency Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact Name
            </label>
            <input
              type="text"
              id="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter emergency contact's name"
            />
          </div>

          <div>
            <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              id="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter emergency contact's phone"
            />
          </div>

          <div>
            <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-700 mb-1">
              Relationship to Patient
            </label>
            <select
              id="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Relationship</option>
              <option value="parent">Parent</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="sibling">Sibling</option>
              <option value="relative">Relative</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsuranceInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="insuranceProvider" className="block text-sm font-medium text-gray-700 mb-1">
            Insurance Provider
          </label>
          <input
            type="text"
            id="insuranceProvider"
            value={formData.insuranceProvider}
            onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter insurance company name"
          />
        </div>

        <div>
          <label htmlFor="insuranceNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Insurance Number
          </label>
          <input
            type="text"
            id="insuranceNumber"
            value={formData.insuranceNumber}
            onChange={(e) => handleInputChange('insuranceNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter insurance policy number"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Softer Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Patient Information</h2>
                <p className="text-gray-600 text-sm">
                  {patient?.name} • {patient?.patient_id}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content with Proper Scrolling */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'personal' && renderPersonalInfo()}
            {activeTab === 'medical' && renderMedicalInfo()}
            {activeTab === 'health' && renderHealthStatus()}
            {activeTab === 'contacts' && renderContactsInfo()}
            {activeTab === 'insurance' && renderInsuranceInfo()}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex-shrink-0">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}