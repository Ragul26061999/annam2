'use client';
import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  AlertTriangle,
  Save,
  X,
  UserPlus,
  Hash,
  CheckCircle,
  Clock,
  Stethoscope,
  Wallet
} from 'lucide-react';
import { generateUHID } from '../src/lib/patientService';

interface EmergencyPatientData {
  // Essential Information Only
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  
  // Critical Medical Information
  primaryComplaint: string;
  allergies?: string;
  bloodGroup?: string;
  
  // Emergency Contact (Optional but recommended)
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  
  // Auto-filled fields
  admissionType: string; // Always 'emergency'
  admissionDate: string;
  admissionTime: string;
  
  // Advance Payment fields
  advanceAmount?: string;
  advancePaymentMethod?: string;
  advanceReferenceNumber?: string;
  advanceNotes?: string;
}

interface EmergencyPatientRegistrationFormProps {
  onSubmit: (data: EmergencyPatientData, previewUHID?: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EmergencyPatientRegistrationForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: EmergencyPatientRegistrationFormProps) {
  const [formData, setFormData] = useState<EmergencyPatientData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    primaryComplaint: '',
    allergies: '',
    bloodGroup: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    admissionType: 'emergency',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionTime: new Date().toTimeString().slice(0, 5),
    // Advance Payment fields
    advanceAmount: '',
    advancePaymentMethod: 'cash',
    advanceReferenceNumber: '',
    advanceNotes: ''
  });

  const [errors, setErrors] = useState<Partial<EmergencyPatientData>>({});
  const [previewUHID, setPreviewUHID] = useState<string>('');
  const [isGeneratingUHID, setIsGeneratingUHID] = useState(false);

  const handleInputChange = (field: keyof EmergencyPatientData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Generate UHID if not already generated
      if (!previewUHID) {
        const uhidGenerated = await generatePreviewUHID();
        if (!uhidGenerated) {
          return;
        }
      }
      await onSubmit(formData, previewUHID);
    }
  };

  // Auto-generate UHID when any field is filled
  React.useEffect(() => {
    const hasAnyData = Object.values(formData).some(value => 
      typeof value === 'string' && value.trim() !== '' && value !== 'emergency'
    );
    if (hasAnyData && !previewUHID && !isGeneratingUHID) {
      generatePreviewUHID();
    }
  }, [formData, previewUHID, isGeneratingUHID]);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Emergency Header */}
      <div className="p-6 border-b border-gray-200 bg-red-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-red-900">Emergency Patient Registration</h2>
            <p className="text-sm text-red-700">Quick registration for emergency patients - only essential information required</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-red-700">
            <Clock className="h-4 w-4" />
            <span>Fast Track Registration</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* UHID Preview Section */}
        {previewUHID && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Hash className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900">Generated Patient UHID</h4>
                <p className="text-sm text-green-700">Emergency registration ID</p>
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

        {/* Essential Patient Information */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <User className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Essential Patient Information</h3>
              <p className="text-sm text-gray-500">All fields optional for emergency registration</p>
            </div>
          </div>

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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.firstName ? 'border-red-300' : 'border-gray-300'}`}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.lastName ? 'border-red-300' : 'border-gray-300'}`}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.dateOfBirth ? 'border-red-300' : 'border-gray-300'}`}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.gender ? 'border-red-300' : 'border-gray-300'}`}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.phone ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="Enter phone number"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700 mb-1">
                Blood Group <span className="text-gray-400">(if known)</span>
              </label>
              <select
                id="bloodGroup"
                value={formData.bloodGroup}
                onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select blood group</option>
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
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.address ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Enter complete address"
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          {/* Medical Information */}
          <div className="flex items-center gap-3 mb-4 mt-8">
            <div className="p-2 bg-red-100 rounded-lg">
              <Stethoscope className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Emergency Medical Information</h3>
              <p className="text-sm text-gray-500">Critical information for immediate care</p>
            </div>
          </div>

          <div>
            <label htmlFor="primaryComplaint" className="block text-sm font-medium text-gray-700 mb-1">
              Primary Complaint / Chief Complaint <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="primaryComplaint"
              value={formData.primaryComplaint}
              onChange={(e) => handleInputChange('primaryComplaint', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.primaryComplaint ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Describe the main reason for this emergency visit"
            />
            {errors.primaryComplaint && <p className="text-red-500 text-xs mt-1">{errors.primaryComplaint}</p>}
          </div>

          <div>
            <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
              Known Allergies <span className="text-gray-400">(if any)</span>
            </label>
            <textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="List any known allergies (medications, food, etc.) or type 'None'"
            />
          </div>

          {/* Emergency Contact */}
          <div className="flex items-center gap-3 mb-4 mt-8">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
              <p className="text-sm text-gray-500">Optional but recommended for emergency situations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Emergency contact name"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Emergency contact phone"
              />
            </div>

            <div>
              <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-700 mb-1">
                Relationship
              </label>
              <select
                id="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select relationship</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
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
              <label htmlFor="advanceAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Advance Amount
              </label>
              <input
                type="number"
                id="advanceAmount"
                value={formData.advanceAmount}
                onChange={(e) => handleInputChange('advanceAmount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="advancePaymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                id="advancePaymentMethod"
                value={formData.advancePaymentMethod}
                onChange={(e) => handleInputChange('advancePaymentMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="net_banking">Net Banking</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label htmlFor="advanceReferenceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                id="advanceReferenceNumber"
                value={formData.advanceReferenceNumber}
                onChange={(e) => handleInputChange('advanceReferenceNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Transaction ID / Cheque No."
              />
            </div>
            <div>
              <label htmlFor="advanceNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                id="advanceNotes"
                value={formData.advanceNotes}
                onChange={(e) => handleInputChange('advanceNotes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Additional notes"
              />
            </div>
          </div>
          {formData.advanceAmount && parseFloat(formData.advanceAmount) > 0 && (
            <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-300">
              <p className="text-sm text-green-800">
                <strong>Advance Payment:</strong> ₹{parseFloat(formData.advanceAmount || '0').toFixed(2)} via {formData.advancePaymentMethod ? formData.advancePaymentMethod.charAt(0).toUpperCase() + formData.advancePaymentMethod.slice(1) : 'Cash'}
                {formData.advanceReferenceNumber && ` (Ref: ${formData.advanceReferenceNumber})`}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 mt-8 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 flex items-center justify-center bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || isGeneratingUHID}
            className="flex-1 flex items-center justify-center bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Registering Emergency Patient...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Register Emergency Patient
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}