'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Clock,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Printer,
  AlertTriangle,
  Stethoscope,
  IndianRupee
} from 'lucide-react';
import { generateUHID, registerNewPatient, PatientRegistrationData } from '../../../src/lib/patientService';
import { addToQueue } from '../../../src/lib/outpatientQueueService';
import StaffSelect from '../../../src/components/StaffSelect';
import BarcodeModal from '../../../src/components/BarcodeModal';
import { supabase } from '../../../src/lib/supabase';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Common places/areas for typeahead suggestions
const COMMON_PLACES = [
  'T. Nagar', 'Anna Nagar', 'Adyar', 'Mylapore', 'Velachery', 'Tambaram',
  'Chromepet', 'Pallavaram', 'Guindy', 'Nungambakkam', 'Kodambakkam',
  'Teynampet', 'Alwarpet', 'Royapettah', 'Triplicane', 'Chepauk',
  'Egmore', 'Park Town', 'George Town', 'Parrys', 'Saidapet',
  'Mambalam', 'Ashok Nagar', 'K.K. Nagar', 'Vadapalani', 'Saligramam',
  'Porur', 'Poonamallee', 'Avadi', 'Ambattur', 'Madhavaram',
  'Red Hills', 'Thiruvanmiyur', 'Besant Nagar', 'Thiruvanmiyur', 'Sholinganallur',
  'Medavakkam', 'Keelkattalai', 'Kovilambakkam', 'Pallikaranai', 'Velachery',
  'Thoraipakkam', 'Karapakkam', 'Navalur', 'Kelambakkam', 'Siruseri',
  'OMR', 'ECR', 'GST Road', 'Arcot Road', 'Poonamallee High Road'
];

export default function QuickRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewUHID, setPreviewUHID] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [registeredPatient, setRegisteredPatient] = useState<any>(null);
  const [contactExists, setContactExists] = useState(false);
  const [checkingContact, setCheckingContact] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([]);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [placeSearchTerm, setPlaceSearchTerm] = useState('');
  const [existingPlaces, setExistingPlaces] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [duplicatePatient, setDuplicatePatient] = useState<any | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [contactValidationError, setContactValidationError] = useState('');

  const [formData, setFormData] = useState({
    registrationDate: new Date().toISOString().split('T')[0],
    registrationTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    uhid: '',
    firstName: '',
    lastName: '',
    age: '',
    dob: '',
    gender: '',
    contactNo: '',
    alternateNo: '',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    place: '',
    emergencyName: '',
    emergencyPhone: '',
    relationship: '',
    primaryComplaint: '',
    priority: '0',
    staffId: '',
    // Consultation Details
    consultingDoctorId: '',
    consultingDoctorName: '',
    diagnosis: '',
    // Billing Information
    consultationFee: '',
    opCardAmount: '',
    totalAmount: '',
    paymentMode: 'Cash'
  });

  useEffect(() => {
    const fetchUHID = async () => {
      try {
        const uhid = await generateUHID();
        setPreviewUHID(uhid);
        setFormData(prev => ({ ...prev, uhid }));
      } catch (error) {
        console.error('Error generating UHID:', error);
      }
    };
    fetchUHID();
  }, []);

  // Load existing places from database
  useEffect(() => {
    const loadExistingPlaces = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('place')
          .not('place', 'is', null)
          .not('place', 'eq', '')
          .limit(100);
        
        if (error) {
          console.error('Error loading existing places:', error);
          return;
        }
        
        const places = data?.map((p: any) => p.place).filter(Boolean) || [];
        setExistingPlaces(places);
      } catch (error) {
        console.error('Error loading existing places:', error);
      }
    };
    loadExistingPlaces();
  }, []);

  // Load doctors for consultation
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select(`
            id,
            users(name),
            specialization,
            consultation_fee,
            department
          `)
          .eq('status', 'active');
        
        if (error) {
          console.error('Error loading doctors:', error);
          return;
        }
        
        setDoctors(data || []);
      } catch (error) {
        console.error('Error loading doctors:', error);
      }
    };
    loadDoctors();
  }, []);

  // Close place suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.place-input-container')) {
        setShowPlaceSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-calculate age from DOB
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  }, [formData.dob]);

  // Function to handle doctor selection
  const handleDoctorSelect = (doctorId: string) => {
    const selectedDoctor = doctors.find(doc => doc.id === doctorId);
    setFormData(prev => {
      const consultationFee = selectedDoctor?.consultation_fee ? selectedDoctor.consultation_fee.toString() : prev.consultationFee;
      const opCardAmount = parseFloat(prev.opCardAmount) || 0;
      const total = parseFloat(consultationFee) + opCardAmount;
      
      return {
        ...prev,
        consultingDoctorId: doctorId,
        consultingDoctorName: selectedDoctor?.users?.name || '',
        consultationFee,
        totalAmount: total.toString()
      };
    });
  };

  // Function to calculate total amount
  const calculateTotalAmount = () => {
    const consultationFee = parseFloat(formData.consultationFee) || 0;
    const opCardAmount = parseFloat(formData.opCardAmount) || 0;
    const total = consultationFee + opCardAmount;
    setFormData(prev => ({ ...prev, totalAmount: total.toString() }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for contact number field
    if (name === 'contactNo') {
      // Only allow digits
      const digitsOnly = value.replace(/\D/g, '');
      
      // Limit to 10 digits
      const truncatedValue = digitsOnly.slice(0, 10);
      
      // Update form data
      setFormData(prev => ({ ...prev, [name]: truncatedValue }));
      
      // Validate 10-digit requirement
      if (truncatedValue.length > 0 && truncatedValue.length < 10) {
        setContactValidationError('Contact number must be exactly 10 digits');
      } else {
        setContactValidationError('');
      }
      
      // Check if contact number exists when exactly 10 digits are entered
      if (truncatedValue.length === 10) {
        checkContactExists(truncatedValue);
      } else {
        setContactExists(false);
      }
      
      return; // Don't continue with general handling
    }
    
    // General handling for other fields
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Recalculate total when consultation fee or OP card amount changes
    if (name === 'consultationFee' || name === 'opCardAmount') {
      const consultationFee = name === 'consultationFee' ? parseFloat(value) || 0 : parseFloat(formData.consultationFee) || 0;
      const opCardAmount = name === 'opCardAmount' ? parseFloat(value) || 0 : parseFloat(formData.opCardAmount) || 0;
      const total = consultationFee + opCardAmount;
      setFormData(prev => ({ ...prev, totalAmount: total.toString() }));
    }
    
    // Check if contact number exists when it changes (for non-contact fields)
    if (name === 'contactNo' && value.length >= 10) {
      checkContactExists(value);
    } else if (name === 'contactNo' && value.length < 10) {
      setContactExists(false);
    }
    
    // Handle place suggestions and trigger duplicate check
    if (name === 'place') {
      setPlaceSearchTerm(value);
      if (value.length >= 2) {
        // Combine common places with existing places from database
        const allPlaces = [...COMMON_PLACES, ...existingPlaces];
        const uniquePlaces = [...new Set(allPlaces)]; // Remove duplicates
        
        const filteredPlaces = uniquePlaces.filter(place =>
          place.toLowerCase().includes(value.toLowerCase())
        );
        
        // Sort: exact matches first, then alphabetical
        const sortedPlaces = filteredPlaces.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const searchLower = value.toLowerCase();
          
          // Exact match first
          if (aLower === searchLower) return -1;
          if (bLower === searchLower) return 1;
          
          // Starts with search term next
          if (aLower.startsWith(searchLower) && !bLower.startsWith(searchLower)) return -1;
          if (bLower.startsWith(searchLower) && !aLower.startsWith(searchLower)) return 1;
          
          // Then alphabetical
          return a.localeCompare(b);
        });
        
        setPlaceSuggestions(sortedPlaces.slice(0, 8)); // Limit to 8 suggestions
        setShowPlaceSuggestions(true);
        setSelectedSuggestionIndex(-1); // Reset selection
        
        // Trigger duplicate patient check when place field is filled
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        if (fullName && formData.gender && formData.dob) {
          checkDuplicatePatient(fullName, formData.gender, formData.dob);
        }
      } else {
        setShowPlaceSuggestions(false);
        setPlaceSuggestions([]);
        setSelectedSuggestionIndex(-1);
      }
    }
  };

  // Function to select a place from suggestions
  const selectPlace = (place: string) => {
    setFormData(prev => ({ ...prev, place }));
    setPlaceSearchTerm(place);
    setShowPlaceSuggestions(false);
    setPlaceSuggestions([]);
    setSelectedSuggestionIndex(-1);
    
    // Trigger duplicate patient check when place is selected
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    if (fullName && formData.gender && formData.dob) {
      checkDuplicatePatient(fullName, formData.gender, formData.dob);
    }
  };

  // Handle keyboard navigation for place suggestions
  const handlePlaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (showPlaceSuggestions && placeSuggestions.length > 0) {
          setSelectedSuggestionIndex(prev => 
            prev < placeSuggestions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (showPlaceSuggestions && placeSuggestions.length > 0) {
          setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        const currentValue = formData.place;
        
        // If we have suggestions and one is selected, use it
        if (selectedSuggestionIndex >= 0 && placeSuggestions[selectedSuggestionIndex]) {
          selectPlace(placeSuggestions[selectedSuggestionIndex]);
        } 
        // If we have suggestions but none selected, use the first one
        else if (placeSuggestions.length > 0) {
          selectPlace(placeSuggestions[0]);
        }
        // If no suggestions exist yet, try to generate them and select the first one
        else if (currentValue.length >= 2) {
          // Generate suggestions on the fly
          const allPlaces = [...COMMON_PLACES, ...existingPlaces];
          const uniquePlaces = [...new Set(allPlaces)];
          
          const filteredPlaces = uniquePlaces.filter(place =>
            place.toLowerCase().includes(currentValue.toLowerCase())
          );
          
          const sortedPlaces = filteredPlaces.sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            const searchLower = currentValue.toLowerCase();
            
            if (aLower === searchLower) return -1;
            if (bLower === searchLower) return 1;
            
            if (aLower.startsWith(searchLower) && !bLower.startsWith(searchLower)) return -1;
            if (bLower.startsWith(searchLower) && !aLower.startsWith(searchLower)) return 1;
            
            return a.localeCompare(b);
          });
          
          if (sortedPlaces.length > 0) {
            selectPlace(sortedPlaces[0]);
          } else {
            // No suggestions found, just trigger duplicate check if applicable
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            if (fullName && formData.gender && formData.dob && currentValue) {
              checkDuplicatePatient(fullName, formData.gender, formData.dob);
            }
          }
        } else {
          // Trigger duplicate check if applicable
          const fullName = `${formData.firstName} ${formData.lastName}`.trim();
          if (fullName && formData.gender && formData.dob && currentValue) {
            checkDuplicatePatient(fullName, formData.gender, formData.dob);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowPlaceSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Handle blur event for place field to trigger duplicate check
  const handlePlaceBlur = () => {
    setShowPlaceSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // Trigger duplicate check when place field loses focus
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    if (fullName && formData.gender && formData.dob && formData.place) {
      checkDuplicatePatient(fullName, formData.gender, formData.dob);
    }
  };

  // Function to check if contact number already exists
  const checkContactExists = async (contactNo: string) => {
    if (!contactNo || contactNo.length < 10) return;
    
    setCheckingContact(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('patient_id, name')
        .eq('phone', contactNo)
        .limit(1);
      
      if (error) {
        console.error('Error checking contact:', error);
        return;
      }
      
      setContactExists(data && data.length > 0);
    } catch (error) {
      console.error('Error checking contact:', error);
    } finally {
      setCheckingContact(false);
    }
  };

  // Function to check for duplicate patients
  const checkDuplicatePatient = async (fullName: string, gender: string, dob: string) => {
    if (!fullName.trim() || !gender || !dob) return;
    
    setCheckingDuplicate(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('name', fullName.trim())
        .eq('gender', gender.toLowerCase())
        .eq('date_of_birth', dob)
        .limit(1);
      
      if (error) {
        console.error('Error checking duplicate patient:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setDuplicatePatient(data[0]);
        setShowDuplicateAlert(true);
      } else {
        setDuplicatePatient(null);
        setShowDuplicateAlert(false);
      }
    } catch (error) {
      console.error('Error checking duplicate patient:', error);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check for duplicate patient before proceeding
      if (duplicatePatient && showDuplicateAlert) {
        throw new Error('This patient already exists. Please check the existing patient record or use a different name/gender/date of birth combination.');
      }

      // Validate required fields
      if (!formData.firstName.trim()) {
        throw new Error('First name is required');
      }
      if (!formData.gender) {
        throw new Error('Gender is required');
      }
      // Validate gender value
      const validGenders = ['male', 'female', 'other'];
      if (!validGenders.includes(formData.gender.toLowerCase())) {
        throw new Error('Invalid gender value. Please select Male, Female, or Other');
      }
      if (!formData.uhid.trim()) {
        throw new Error('Patient ID is required');
      }

      // Direct patient registration without appointment creation for quick registration
      const { supabase } = await import('../../../src/lib/supabase');
      
      // Debug log the form data
      console.log('Form data being submitted:', {
        uhid: formData.uhid,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        gender: formData.gender,
        primaryComplaint: formData.primaryComplaint,
        registrationDate: formData.registrationDate
      });

      // Create patient record directly
      const patientData = {
        patient_id: formData.uhid,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        date_of_birth: formData.dob || null,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender.toLowerCase(),
        phone: formData.contactNo || null,
        email: null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        place: formData.place || null,
        emergency_contact_name: formData.emergencyName || null,
        emergency_contact_phone: formData.emergencyPhone || null,
        emergency_contact_relationship: formData.relationship || null,
        blood_group: null,
        allergies: null,
        medical_history: null,
        admission_type: 'outpatient',
        primary_complaint: formData.primaryComplaint || null,
        admission_date: formData.registrationDate,
        admission_time: formData.registrationTime,
        staff_id: formData.staffId && formData.staffId.trim() !== '' ? formData.staffId : null,
        registration_status: 'pending_vitals',
        status: 'active',
        // Consultation Details
        consulting_doctor_id: formData.consultingDoctorId || null,
        consulting_doctor_name: formData.consultingDoctorName || null,
        diagnosis: formData.diagnosis || null,
        // Billing Information
        consultation_fee: formData.consultationFee ? parseFloat(formData.consultationFee) : null,
        op_card_amount: formData.opCardAmount ? parseFloat(formData.opCardAmount) : null,
        total_amount: formData.totalAmount ? parseFloat(formData.totalAmount) : null,
        payment_mode: formData.paymentMode || null
      };

      console.log('Patient data to insert:', patientData);

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert(patientData)
        .select()
        .single();

      console.log('Patient insertion result:', { patient, patientError });

      if (patientError) {
        console.error('Patient insertion error details:', patientError);
        throw new Error(`Database error: ${patientError.message || JSON.stringify(patientError)}`);
      }
      
      const result = { success: true, patient, uhid: formData.uhid };

      if (result.success && result.patient) {
        // Add to queue
        console.log('Adding patient to queue with params:', {
          patientId: result.patient.id,
          registrationDate: formData.registrationDate,
          priority: parseInt(formData.priority),
          notes: formData.primaryComplaint,
          staffId: formData.staffId
        });
        
        const queueResult = await addToQueue(
          result.patient.id,
          formData.registrationDate,
          parseInt(formData.priority),
          formData.primaryComplaint,
          formData.staffId && formData.staffId.trim() !== '' ? formData.staffId : undefined
        );
        
        console.log('Queue result:', queueResult);

        if (queueResult.success && queueResult.queueEntry) {
          setQueueNumber(queueResult.queueEntry.queue_number);
          setRegisteredPatient(result.patient);
          setIsSuccess(true);
          
          // No auto-redirect to allow printing
        } else {
          throw new Error('Failed to add patient to queue');
        }
      } else {
        throw new Error('Registration failed');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      console.error('Error details:', {
        message: (err as Error).message,
        stack: (err as Error).stack,
        name: (err as Error).name,
        cause: (err as Error).cause
      });
      
      // Provide more detailed error message
      const errorMessage = (err as Error).message || 'Unknown error occurred during registration';
      setError(`Registration failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-orange-50/30 py-8 px-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Registered!</h2>
          <p className="text-gray-600 mb-4">Patient has been added to the vitals queue.</p>
          {queueNumber && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-orange-600 font-medium mb-1">Queue Token Number</p>
              <p className="text-4xl font-bold text-orange-600">{queueNumber}</p>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowBarcodeModal(true)}
              className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="h-5 w-5" />
              Print Barcode
            </button>
            
            <button
              onClick={() => router.push('/outpatient?tab=queue')}
              className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go to Queue
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 text-orange-600 font-semibold hover:bg-orange-50 rounded-lg transition-colors"
            >
              Register Another Patient
            </button>
          </div>
        </div>
        
        {showBarcodeModal && registeredPatient && (
          <BarcodeModal
            patient={registeredPatient}
            onClose={() => setShowBarcodeModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50/30 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/outpatient"
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Outpatient
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <User size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Quick Patient Registration</h1>
                <p className="text-white/80 text-sm">Register patient details - vitals will be entered later</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Duplicate Patient Alert */}
            {showDuplicateAlert && duplicatePatient && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-800 mb-2">This patient already exists!</h4>
                    <div className="bg-white rounded-lg p-3 border border-yellow-200 mb-3">
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Patient ID:</strong> {duplicatePatient.patient_id}
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Name:</strong> {duplicatePatient.name}
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Gender:</strong> {duplicatePatient.gender?.charAt(0).toUpperCase() + duplicatePatient.gender?.slice(1)}
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Date of Birth:</strong> {new Date(duplicatePatient.date_of_birth).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Contact:</strong> {duplicatePatient.phone || 'Not provided'}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Place:</strong> {duplicatePatient.place || 'Not provided'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDuplicateAlert(false);
                          setDuplicatePatient(null);
                        }}
                        className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        I Understand - Continue Registration
                      </button>
                      <Link
                        href="/outpatient"
                        className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Go to Patient Search
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Registration Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Registration Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    name="registrationDate"
                    value={formData.registrationDate}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Registration Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="time"
                    name="registrationTime"
                    value={formData.registrationTime}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Patient UHID</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" size={16} />
                  <input
                    type="text"
                    value={formData.uhid}
                    readOnly
                    className="w-full pl-10 pr-4 py-2.5 bg-orange-50 border border-orange-100 text-orange-700 font-mono font-bold rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Patient Full Name *</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name (Optional)"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Age (Optional)</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Age (Optional)"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Contact No</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="tel"
                    name="contactNo"
                    placeholder="Primary Number"
                    value={formData.contactNo}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 ${
                      contactExists ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {checkingContact && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    </div>
                  )}
                  {contactExists && !checkingContact && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
                {contactValidationError && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {contactValidationError}
                  </p>
                )}
                {contactExists && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    This number is already registered with a patient
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Place</label>
                <div className="relative place-input-container">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    name="place"
                    placeholder="Enter Place/Area"
                    value={formData.place}
                    onChange={handleInputChange}
                    onKeyDown={handlePlaceKeyDown}
                    onBlur={handlePlaceBlur}
                    className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 ${
                      checkingDuplicate ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                    }`}
                  />
                  {checkingDuplicate && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
                    </div>
                  )}
                  {showPlaceSuggestions && placeSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                      {placeSuggestions.map((place, index) => {
                        const isExistingPlace = existingPlaces.includes(place);
                        const isCommonPlace = COMMON_PLACES.includes(place);
                        
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectPlace(place)}
                            className={`w-full px-4 py-2 text-left hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center justify-between group ${
                              index === selectedSuggestionIndex ? 'bg-orange-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-700">{place}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {isExistingPlace && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  Used
                                </span>
                              )}
                              {isCommonPlace && !isExistingPlace && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  Common
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="Enter City"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">State</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                >
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  placeholder="6-digit Pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Complete Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street, locality, area details..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                ></textarea>
              </div>
            </div>

            {/* Primary Complaint */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Primary Complaint / Reason for Visit</label>
              <textarea
                name="primaryComplaint"
                rows={2}
                value={formData.primaryComplaint}
                onChange={handleInputChange}
                placeholder="Brief description of symptoms or reason for visit..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
              ></textarea>
            </div>

            {/* Emergency Contact */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="text-orange-500" />
                Emergency Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  name="emergencyName"
                  placeholder="Emergency Contact Name"
                  value={formData.emergencyName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white"
                />
                <input
                  type="tel"
                  name="emergencyPhone"
                  placeholder="Emergency Phone No"
                  value={formData.emergencyPhone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white"
                />
                <input
                  type="text"
                  name="relationship"
                  placeholder="Relationship"
                  value={formData.relationship}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white"
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Priority Level</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
              >
                <option value="0">Normal</option>
                <option value="1">High Priority</option>
                <option value="2">Urgent</option>
              </select>
            </div>

            {/* Staff Selection */}
            <div>
              <StaffSelect
                value={formData.staffId}
                onChange={(staffId) => setFormData(prev => ({ ...prev, staffId }))}
                label="Registered By (Optional)"
              />
            </div>

            {/* Consultation Details */}
            <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100">
              <h3 className="text-sm font-bold text-purple-800 mb-6 flex items-center gap-2">
                <Stethoscope size={18} />
                Consultation Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-purple-600 uppercase mb-2">Consulting Doctor</label>
                  <select
                    value={formData.consultingDoctorId}
                    onChange={(e) => handleDoctorSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.users?.name || 'Unknown'} {doctor.specialization ? `- ${doctor.specialization}` : ''}
                        {doctor.consultation_fee ? ` (₹${doctor.consultation_fee})` : ''}
                      </option>
                    ))}
                  </select>
                  {formData.consultingDoctorName && (
                    <p className="text-xs text-purple-600 mt-1">
                      Selected: Dr. {formData.consultingDoctorName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-600 uppercase mb-2">Diagnosis / Complaint</label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="Brief diagnosis"
                  />
                </div>
              </div>
            </div>

            {/* Billing Information */}
            <div className="bg-green-50/50 p-6 rounded-xl border border-green-100">
              <h3 className="text-sm font-bold text-green-800 mb-6 flex items-center gap-2">
                <IndianRupee size={18} />
                Billing Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-2">Consultation Fee</label>
                  <input
                    type="number"
                    name="consultationFee"
                    value={formData.consultationFee}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter consultation fee"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-2">OP Card Amount</label>
                  <input
                    type="number"
                    name="opCardAmount"
                    value={formData.opCardAmount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-2">Total Amount</label>
                  <input
                    type="text"
                    value={formData.totalAmount}
                    readOnly
                    className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-bold text-green-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-2">Payment Mode</label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Fee">Fee</option>
                    <option value="Camp">Camp</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4 border-t">
              <Link href="/outpatient">
                <button
                  type="button"
                  className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Register & Add to Queue</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
