'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    User,
    Phone,
    MapPin,
    Calendar,
    Heart,
    Activity,
    Stethoscope,
    IndianRupee,
    Save,
    X,
    ChevronRight,
    ChevronLeft,
    Clock,
    Hash,
    AlertCircle,
    ClipboardList,
    Printer,
    CheckCircle,
    Barcode,
    FileText,
    Upload,
    AlertTriangle,
    UserCheck,
    Eye,
    UserPlus,
    Loader2
} from 'lucide-react';
import { generateUHID, registerNewPatient, PatientRegistrationData } from '../src/lib/patientService';
import { getAllDoctorsSimple, Doctor } from '../src/lib/doctorService';
import { supabase } from '../src/lib/supabase';
import PatientRegistrationLabel from './PatientRegistrationLabel';
import BarcodeDisplay from './BarcodeDisplay';
import StaffSelect from '../src/components/StaffSelect';
import DocumentUpload from '../src/components/DocumentUpload';
import DocumentList from '../src/components/DocumentList';
import UniversalPaymentModal from '../src/components/UniversalPaymentModal';
import { createOPConsultationBill, type PaymentRecord } from '../src/lib/universalPaymentService';

interface OutpatientRegistrationFormProps {
    onComplete: (result: any) => void;
    onCancel: () => void;
}

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

export default function OutpatientRegistrationForm({ onComplete, onCancel }: OutpatientRegistrationFormProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [previewUHID, setPreviewUHID] = useState('');
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [isSuccess, setIsSuccess] = useState(false);
    const [registrationResult, setRegistrationResult] = useState<any>(null);
    const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);
    const [temporaryDocuments, setTemporaryDocuments] = useState<any[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentBill, setCurrentBill] = useState<PaymentRecord | null>(null);
    const [checkingDuplicate, setCheckingDuplicate] = useState(false);
    const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
    const [duplicatePatient, setDuplicatePatient] = useState<any>(null);
    const [isDuplicateDetected, setIsDuplicateDetected] = useState(false);
    const [contactDuplicateAlert, setContactDuplicateAlert] = useState(false);
    const [contactValidationError, setContactValidationError] = useState('');
    const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([]);
    const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
    const [placeSearchTerm, setPlaceSearchTerm] = useState('');
    const [existingPlaces, setExistingPlaces] = useState<string[]>([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

    const [formData, setFormData] = useState({
        // Step 1: Patient Info
        registrationDate: new Date().toISOString().split('T')[0],
        registrationTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        uhid: '',
        firstName: '',
        lastName: '',
        age: '',
        dob: '',
        gender: '',
        contactNo: '',
        place: '',
        address: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: '',
        emergencyName: '',
        emergencyPhone: '',
        relationship: '',

        // Step 2: Vitals
        height: '',
        weight: '',
        bmi: '',
        temp: '',
        tempUnit: 'Fahrenheit',
        bpSystolic: '',
        bpDiastolic: '',
        pulse: '',
        spo2: '',
        respiratoryRate: '',
        randomBloodSugar: '',
        vitalNotes: '',

        // Visit Details
        doctorDept: '',
        doctorId: '',
        doctorName: '',
        diagnosis: '',
        consultationFee: '0',
        opCardAmount: '0',
        totalAmount: '0',
        paymentMode: 'Cash',
        staffId: '',
        // Advance Payment fields
        advanceAmount: '',
        advancePaymentMethod: 'cash',
        advanceReferenceNumber: '',
        advanceNotes: ''
    });

    const [dobInput, setDobInput] = useState('');

    // Sync dobInput with formData.dob
    useEffect(() => {
        if (formData.dob) {
            const [year, month, day] = formData.dob.split('-');
            if (year && month && day) {
                setDobInput(`${day}/${month}/${year}`);
            }
        } else {
            setDobInput('');
        }
    }, [formData.dob]);

    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow numbers and slashes
        if (/[^0-9/]/.test(val)) return;
        
        setDobInput(val);

        // Validate DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
            const [day, month, year] = val.split('/');
            const isoDate = `${year}-${month}-${day}`;
            
            // Validate date validity
            const date = new Date(isoDate);
            const isValidDate = date instanceof Date && !isNaN(date.getTime()) && 
                                date.getDate() === parseInt(day) && 
                                (date.getMonth() + 1) === parseInt(month) && 
                                date.getFullYear() === parseInt(year);
            
            if (isValidDate) {
                setFormData(prev => ({ ...prev, dob: isoDate }));
            }
        } else if (val === '') {
            setFormData(prev => ({ ...prev, dob: '' }));
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [uhid, allDoctors] = await Promise.all([
                    generateUHID(),
                    getAllDoctorsSimple()
                ]);
                setPreviewUHID(uhid);
                setFormData(prev => ({ ...prev, uhid }));
                setDoctors(allDoctors);

                const depts = Array.from(new Set(allDoctors.map(d => d.department))).filter(Boolean) as string[];
                setDepartments(depts);
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };
        fetchInitialData();
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

    // Auto-calculate BMI
    useEffect(() => {
        const h = parseFloat(formData.height) / 100; // cm to m
        const w = parseFloat(formData.weight);
        if (h > 0 && w > 0) {
            const bmi = (w / (h * h)).toFixed(1);
            setFormData(prev => ({ ...prev, bmi: bmi.toString() }));
        } else {
            setFormData(prev => ({ ...prev, bmi: '' }));
        }
    }, [formData.height, formData.weight]);

    // Handle consultation fee update when doctor is selected
    useEffect(() => {
        if (formData.doctorId) {
            const doctor = doctors.find(d => d.id === formData.doctorId);
            if (doctor) {
                const fee = doctor.consultation_fee || 0;
                setFormData(prev => ({
                    ...prev,
                    consultationFee: fee.toString(),
                    doctorName: doctor.user?.name || ''
                }));
            }
        }
    }, [formData.doctorId, doctors]);

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

    // Calculate total amount
    useEffect(() => {
        const fee = parseFloat(formData.consultationFee) || 0;
        const opAmount = parseFloat(formData.opCardAmount) || 0;
        setFormData(prev => ({ ...prev, totalAmount: (fee + opAmount).toString() }));
    }, [formData.consultationFee, formData.opCardAmount]);

    // Close place suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.place-input-container')) {
                setShowPlaceSuggestions(false);
                setSelectedSuggestionIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
            
            // Check for duplicate contact number when exactly 10 digits are entered
            if (truncatedValue.length === 10) {
                const existingPatient = await checkExistingContactNumber(truncatedValue);
                if (existingPatient) {
                    setContactDuplicateAlert(true);
                } else {
                    setContactDuplicateAlert(false);
                }
            } else {
                setContactDuplicateAlert(false);
            }
            
            return; // Don't continue with general handling
        }
        
        // General handling for other fields
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Handle place suggestions
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
            } else {
                setShowPlaceSuggestions(false);
                setPlaceSuggestions([]);
                setSelectedSuggestionIndex(-1);
            }
            
            // Check for duplicate patient when place field is filled
            if (value.trim() !== '') {
                setCheckingDuplicate(true);
                // Small delay to ensure state is updated
                setTimeout(async () => {
                    const existingPatient = await checkExistingPatientByNameGenderDOB();
                    if (existingPatient) {
                        setDuplicatePatient(existingPatient);
                        setIsDuplicateDetected(true);
                        setShowDuplicateAlert(true);
                    } else {
                        setIsDuplicateDetected(false);
                        setDuplicatePatient(null);
                        setShowDuplicateAlert(false);
                    }
                    setCheckingDuplicate(false);
                }, 100);
            }
        }
    };

    const nextStep = () => setStep(2);
    const prevStep = () => setStep(1);

    // Check for existing patient with same contact number
    const checkExistingContactNumber = async (contactNo: string) => {
        if (!contactNo || contactNo.length !== 10) {
            return null;
        }

        try {
            const { data: existingPatients, error } = await supabase
                .from('patients')
                .select('*')
                .eq('phone', contactNo)
                .limit(1);

            if (error) {
                console.error('Error checking existing contact number:', error);
                return null;
            }

            return existingPatients && existingPatients.length > 0 ? existingPatients[0] : null;
        } catch (error) {
            console.error('Error checking existing contact number:', error);
            return null;
        }
    };

    // Check for existing patient with same name, gender, and DOB
    const checkExistingPatientByNameGenderDOB = async () => {
        const { firstName, lastName, dob, gender } = formData;
        
        // Only validate if all required fields are filled
        if (!firstName.trim() || !lastName.trim() || !dob || !gender) {
            return null;
        }

        try {
            const fullName = `${firstName} ${lastName}`.trim();
            
            const { data: existingPatients, error } = await supabase
                .from('patients')
                .select('*')
                .eq('name', fullName)
                .eq('date_of_birth', dob)
                .eq('gender', gender.toLowerCase())
                .limit(1);

            if (error) {
                console.error('Error checking existing patient:', error);
                return null;
            }

            return existingPatients && existingPatients.length > 0 ? existingPatients[0] : null;
        } catch (error) {
            console.error('Error checking existing patient:', error);
            return null;
        }
    };

    // Check for existing patient with same details (original function for submit validation)
    const checkExistingPatient = async () => {
        const { firstName, lastName, dob, contactNo, place } = formData;
        
        // Only validate if all required fields are filled
        if (!firstName.trim() || !lastName.trim() || !dob || !contactNo.trim() || !place.trim()) {
            return null;
        }

        try {
            const { data: existingPatients, error } = await supabase
                .from('patients')
                .select('*')
                .eq('name', `${firstName} ${lastName}`.trim())
                .eq('date_of_birth', dob)
                .eq('phone', contactNo.trim())
                .eq('place', place.trim())
                .limit(1);

            if (error) {
                console.error('Error checking existing patient:', error);
                return null;
            }

            return existingPatients && existingPatients.length > 0 ? existingPatients[0] : null;
        } catch (error) {
            console.error('Error checking existing patient:', error);
            return null;
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
        const { firstName, lastName, gender, dob } = formData;
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName && gender && dob) {
            setCheckingDuplicate(true);
            setTimeout(async () => {
                const existingPatient = await checkExistingPatientByNameGenderDOB();
                if (existingPatient) {
                    setDuplicatePatient(existingPatient);
                    setIsDuplicateDetected(true);
                    setShowDuplicateAlert(true);
                } else {
                    setIsDuplicateDetected(false);
                    setDuplicatePatient(null);
                    setShowDuplicateAlert(false);
                }
                setCheckingDuplicate(false);
            }, 100);
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

    // Handle blur event for place field
    const handlePlaceBlur = () => {
        setShowPlaceSuggestions(false);
        setSelectedSuggestionIndex(-1);
    };

    // Function to proceed with registration after duplicate confirmation
    const proceedWithRegistration = async () => {
        setLoading(true);
        try {
            const registrationData: PatientRegistrationData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                dateOfBirth: formData.dob,
                age: formData.age,
                phone: formData.contactNo,
                place: formData.place,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                gender: formData.gender,
                admissionType: 'outpatient',
                primaryComplaint: formData.diagnosis,
                emergencyContactName: formData.emergencyName,
                emergencyContactPhone: formData.emergencyPhone,
                emergencyContactRelationship: formData.relationship,
                diagnosis: formData.diagnosis,
                height: formData.height,
                weight: formData.weight,
                bmi: formData.bmi,
                temperature: formData.temp,
                tempUnit: formData.tempUnit,
                bpSystolic: formData.bpSystolic,
                bpDiastolic: formData.bpDiastolic,
                pulse: formData.pulse,
                spo2: formData.spo2,
                respiratoryRate: formData.respiratoryRate,
                randomBloodSugar: formData.randomBloodSugar,
                vitalNotes: formData.vitalNotes,
                opCardAmount: formData.opCardAmount,
                consultationFee: formData.consultationFee,
                totalAmount: formData.totalAmount,
                paymentMode: formData.paymentMode,
                consultingDoctorId: formData.doctorId,
                consultingDoctorName: formData.doctorName,
                departmentWard: formData.doctorDept,
                bloodGroup: '',
                allergies: '',
                medicalHistory: '',
                currentMedications: '',
                chronicConditions: '',
                previousSurgeries: '',
                admissionDate: formData.registrationDate,
                admissionTime: formData.registrationTime,
                staffId: formData.staffId,
                advanceAmount: formData.advanceAmount,
                advancePaymentMethod: formData.advancePaymentMethod,
                advanceReferenceNumber: formData.advanceReferenceNumber,
                advanceNotes: formData.advanceNotes
            };

            const result = await registerNewPatient(registrationData, formData.uhid);

            if (result.success) {
                // Create OP consultation bill
                try {
                    const bill = await createOPConsultationBill(
                        result.patient.id,
                        null, // No appointment ID for direct OP registration
                        parseFloat(formData.consultationFee),
                        formData.doctorName,
                        formData.staffId
                    );
                    
                    setCurrentBill(bill);
                    setShowPaymentModal(true);
                } catch (billingError) {
                    console.error('Error creating bill:', billingError);
                    // Continue with registration even if billing fails
                }

                setRegistrationResult({
                    ...result,
                    patientName: `${formData.firstName} ${formData.lastName}`,
                    billNo: `BILL-${Date.now().toString().slice(-6)}`,
                    totalAmount: formData.totalAmount
                });
                setIsSuccess(true);
                if (onComplete) onComplete(result);
            } else {
                throw new Error(result.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Thermal print function
    const showThermalPreview = () => {
        if (!registrationResult) return;

        const now = new Date();
        const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        // Get sales type
        let salesType = formData.paymentMode?.toUpperCase() || 'CASH';
        if (salesType === 'CREDIT') {
            salesType = 'CREDIT';
        }

        const thermalContent = `
            <html>
                <head>
                    <title>Thermal Receipt - ${registrationResult.billNo}</title>
                    <style>
                        @page { margin: 1mm; size: 77mm 297mm; }
                        body { 
                            font-family: 'Verdana', sans-serif; 
                            font-weight: bold;
                            color: #000;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            margin: 0; 
                            padding: 2px;
                            font-size: 14px;
                            line-height: 1.2;
                            width: 77mm;
                        }
                        html, body { background: #fff; }
                        .header-14cm { font-size: 16pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
                        .header-9cm { font-size: 11pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
                        .header-10cm { font-size: 12pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
                        .header-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
                        .items-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
                        .bill-info-10cm { font-size: 12pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
                        .bill-info-bold { font-weight: bold; font-family: 'Verdana', sans-serif; }
                        .footer-7cm { font-size: 9pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
                        .center { text-align: center; font-family: 'Verdana', sans-serif; font-weight: bold; }
                        .right { text-align: right; font-family: 'Verdana', sans-serif; font-weight: bold; }
                        .table { width: 100%; border-collapse: collapse; font-family: 'Verdana', sans-serif; font-weight: bold; }
                        .table td { padding: 1px; font-family: 'Verdana', sans-serif; font-weight: bold; }
                        .totals-line { display: flex; justify-content: space-between; font-family: 'Verdana', sans-serif; font-weight: bold; }
                        .footer { margin-top: 15px; font-family: 'Verdana', sans-serif; font-weight: bold; }
                        .signature-area { margin-top: 25px; font-family: 'Verdana', sans-serif; font-weight: bold; }
                        .logo { width: 350px; height: auto; margin-bottom: 5px; }
                    </style>
                </head>
                <body>
                    <div class="center">
                        <img src="/logo/annamHospital-bk.png" alt="ANNAM LOGO" class="logo" />
                        <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
                        <div class="header-9cm">Phone- 04639 252592</div>
                        <div style="margin-top: 5px; font-weight: bold;">OUTPATIENT BILL</div>
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <table class="table">
                            <tr>
                                <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                <td class="bill-info-10cm bill-info-bold">${registrationResult.billNo}</td>
                            </tr>
                            <tr>
                                <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                <td class="bill-info-10cm bill-info-bold">${registrationResult.uhid}</td>
                            </tr>
                            <tr>
                                <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                                <td class="bill-info-10cm bill-info-bold">${registrationResult.patientName}</td>
                            </tr>
                            <tr>
                                <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                <td class="bill-info-10cm bill-info-bold">${formData.registrationDate} ${formData.registrationTime}</td>
                            </tr>
                            <tr>
                                <td class="header-10cm">Payment Type&nbsp;:&nbsp;&nbsp;</td>
                                <td class="header-10cm bill-info-bold">${salesType}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="margin-top: 10px;">
                        <table class="table">
                            <tr style="border-bottom: 1px dashed #000;">
                                <td width="30%" class="items-8cm">S.No</td>
                                <td width="40%" class="items-8cm">Service</td>
                                <td width="15%" class="items-8cm text-center">Qty</td>
                                <td width="15%" class="items-8cm text-right">Amt</td>
                            </tr>
                            <tr>
                                <td class="items-8cm">1.</td>
                                <td class="items-8cm">Consultation Fee</td>
                                <td class="items-8cm text-center">1</td>
                                <td class="items-8cm text-right">${Number(formData.consultationFee || 0).toFixed(0)}</td>
                            </tr>
                            ${formData.opCardAmount && parseFloat(formData.opCardAmount) > 0 ? `
                            <tr>
                                <td class="items-8cm">2.</td>
                                <td class="items-8cm">OP Card</td>
                                <td class="items-8cm text-center">1</td>
                                <td class="items-8cm text-right">${Number(formData.opCardAmount).toFixed(0)}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>

                    <div style="margin-top: 10px;">
                        <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
                            <span>Total Amount</span>
                            <span>${(parseFloat(formData.totalAmount || '0')).toFixed(0)}</span>
                        </div>
                    </div>

                    <div class="footer">
                        <div class="totals-line footer-7cm">
                            <span>Printed on ${printedDateTime}</span>
                            <span>Authorized Sign</span>
                        </div>
                    </div>

                    <script>
                        (function() {
                            function triggerPrint() {
                                try {
                                    window.print();
                                } catch (error) {
                                    console.error('Print failed:', error);
                                }
                            }
                            
                            // Auto-trigger print after content loads
                            setTimeout(triggerPrint, 500);
                        })();
                    </script>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(thermalContent);
            printWindow.document.close();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Check for existing patient
            const existingPatient = await checkExistingPatient();
            
            if (existingPatient) {
                // Show duplicate alert instead of modal
                setDuplicatePatient(existingPatient);
                setShowDuplicateAlert(true);
                setIsDuplicateDetected(true);
                setLoading(false);
                return;
            }
            const registrationData: PatientRegistrationData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                dateOfBirth: formData.dob,
                age: formData.age,
                phone: formData.contactNo,
                place: formData.place,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                gender: formData.gender,
                admissionType: 'outpatient',
                primaryComplaint: formData.diagnosis,
                emergencyContactName: formData.emergencyName,
                emergencyContactPhone: formData.emergencyPhone,
                emergencyContactRelationship: formData.relationship,
                diagnosis: formData.diagnosis,
                height: formData.height,
                weight: formData.weight,
                bmi: formData.bmi,
                temperature: formData.temp,
                tempUnit: formData.tempUnit,
                bpSystolic: formData.bpSystolic,
                bpDiastolic: formData.bpDiastolic,
                pulse: formData.pulse,
                spo2: formData.spo2,
                respiratoryRate: formData.respiratoryRate,
                randomBloodSugar: formData.randomBloodSugar,
                vitalNotes: formData.vitalNotes,
                opCardAmount: formData.opCardAmount,
                consultationFee: formData.consultationFee,
                totalAmount: formData.totalAmount,
                paymentMode: formData.paymentMode,
                consultingDoctorId: formData.doctorId,
                consultingDoctorName: formData.doctorName,
                departmentWard: formData.doctorDept,
                bloodGroup: '',
                allergies: '',
                medicalHistory: '',
                currentMedications: '',
                chronicConditions: '',
                previousSurgeries: '',
                admissionDate: formData.registrationDate,
                admissionTime: formData.registrationTime,
                staffId: formData.staffId,
                advanceAmount: formData.advanceAmount,
                advancePaymentMethod: formData.advancePaymentMethod,
                
                advanceReferenceNumber: formData.advanceReferenceNumber,
                advanceNotes: formData.advanceNotes            };

            const result = await registerNewPatient(registrationData, formData.uhid);

            if (result.success) {
                // Create OP consultation bill
                try {
                    const bill = await createOPConsultationBill(
                        result.patient.id,
                        null, // No appointment ID for direct OP registration
                        parseFloat(formData.consultationFee),
                        formData.doctorName,
                        formData.staffId
                    );
                    
                    setCurrentBill(bill);
                    setShowPaymentModal(true);
                } catch (billingError) {
                    console.error('Error creating bill:', billingError);
                    // Continue with registration even if billing fails
                }

                setRegistrationResult({
                    ...result,
                    patientName: `${formData.firstName} ${formData.lastName}`,
                    billNo: `BILL-${Date.now().toString().slice(-6)}`,
                    totalAmount: formData.totalAmount
                });
                setIsSuccess(true);
                if (onComplete) onComplete(result);
            } else {
                throw new Error(result.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 print:shadow-none print:border-none">
                <div className="bg-gradient-to-r from-green-400 to-green-400 p-8 text-white text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
                        <CheckCircle size={48} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Registration Complete!</h2>
                    <p className="text-white/90">Patient has been registered and bill has been generated.</p>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Patient Information</h3>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-gray-500">Name:</span>
                                <span className="font-medium text-gray-900">{registrationResult.patientName}</span>
                                <span className="text-gray-500">UHID:</span>
                                <span className="font-mono font-bold text-orange-600">{registrationResult.uhid}</span>
                                <span className="text-gray-500">Date:</span>
                                <span className="text-gray-900">{formData.registrationDate}</span>
                                <span className="text-gray-500">Doctor:</span>
                                <span className="text-gray-900">{formData.doctorName}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Billing Information</h3>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-gray-500">Bill No:</span>
                                <span className="font-mono text-gray-900">{registrationResult.billNo}</span>
                                <span className="text-gray-500">Payment Mode:</span>
                                <span className="text-gray-900">{formData.paymentMode}</span>
                                <span className="text-gray-500 font-bold">Total Amount:</span>
                                <span className="text-xl font-bold text-green-600">₹{registrationResult.totalAmount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-6 mb-8">
                        <BarcodeDisplay
                            uhid={registrationResult.uhid}
                            patientName={registrationResult.patientName}
                            size="medium"
                            className="w-full max-w-md shadow-sm"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={showThermalPreview}
                            className="flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-200"
                        >
                            <Printer size={18} className="mr-2" />
                            Print Bill & label
                        </button>
                        <button
                            onClick={onCancel}
                            className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>


                    {/* Hidden Label for Printing */}
                    <div className="hidden print:block">
                        <div className="p-4 border-2 border-black w-[80mm] h-[50mm] flex flex-col items-center justify-center text-center">
                            <div className="font-bold text-xl mb-1">ANNAM HOSPITAL</div>
                            <div className="text-sm font-mono">{registrationResult.uhid}</div>
                            <div className="font-bold">{registrationResult.patientName}</div>
                            <div className="text-xs">{formData.gender} / {formData.age} yrs</div>
                            <div className="mt-2 h-10 w-full flex items-center justify-center">
                                <Barcode size={32} />
                            </div>
                            <div className="text-[10px] mt-1 italic">Scan for Electronic Records</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 print:shadow-none print:border-none">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-400 to-orange-400 p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <User size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Outpatient Registration</h1>
                            <p className="text-white/80 text-sm">Step {step} of 2: {step === 1 ? 'Patient Information' : 'Vital Signs & Billing'}</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper */}
                <div className="mt-6 flex items-center gap-2">
                    <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/30'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/30'}`}></div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
                {/* Duplicate Patient Alert */}
                {showDuplicateAlert && duplicatePatient && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
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
                                            setIsDuplicateDetected(false);
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

                {step === 1 ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Registration Header Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Registration Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="date"
                                        name="registrationDate"
                                        value={formData.registrationDate}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Registration Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="time"
                                        name="registrationTime"
                                        value={formData.registrationTime}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Patient UHID</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" size={16} />
                                    <input
                                        type="text"
                                        value={formData.uhid}
                                        readOnly
                                        className="w-full pl-10 pr-4 py-2.5 bg-orange-50 border border-orange-100 text-orange-700 font-mono font-bold rounded-xl outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Patient Full Name</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        name="firstName"
                                        placeholder="First Name"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="lastName"
                                        placeholder="Last Name"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date of Birth</label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, dob: e.target.value }));
                                        // Update dobInput for display consistency
                                        if (e.target.value) {
                                            const [year, month, day] = e.target.value.split('-');
                                            setDobInput(`${day}/${month}/${year}`);
                                        } else {
                                            setDobInput('');
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Age (Auto)</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleInputChange}
                                    placeholder="Computed age"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact No</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="tel"
                                        name="contactNo"
                                        placeholder="Primary Number"
                                        value={formData.contactNo}
                                        onChange={handleInputChange}
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent ${contactValidationError ? 'border-red-300 bg-red-50' : contactDuplicateAlert ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}
                                        required
                                    />
                                </div>
                                
                                {/* Contact validation error */}
                                {contactValidationError && (
                                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        {contactValidationError}
                                    </div>
                                )}
                                
                                {/* Contact duplicate alert */}
                                {contactDuplicateAlert && (
                                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                            <span className="text-sm text-yellow-800 font-medium">
                                                Already existing contact patient
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Place</label>
                                <div className="relative place-input-container">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        name="place"
                                        placeholder="Enter Place/Locality"
                                        value={formData.place}
                                        onChange={handleInputChange}
                                        onKeyDown={handlePlaceKeyDown}
                                        onBlur={handlePlaceBlur}
                                        className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
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
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    placeholder="Enter City"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">State</label>
                                <select
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                >
                                    {INDIAN_STATES.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pincode</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    placeholder="6-digit Pincode"
                                    value={formData.pincode}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Complete Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                                <textarea
                                    name="address"
                                    rows={2}
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Street, locality, area details..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                ></textarea>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
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

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={isDuplicateDetected}
                                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDuplicateDetected ? 'Duplicate Patient Detected' : 'Proceed to Vitals'}
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Vitals Entry */}
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                            <h3 className="text-sm font-bold text-blue-800 mb-6 flex items-center gap-2">
                                <Activity size={18} />
                                Patient Vitals & Measurements
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Height (cm)</label>
                                    <input
                                        type="number"
                                        name="height"
                                        value={formData.height}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Weight (kg)</label>
                                    <input
                                        type="number"
                                        name="weight"
                                        value={formData.weight}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">BMI (Auto-calc)</label>
                                    <input
                                        type="text"
                                        name="bmi"
                                        value={formData.bmi}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-blue-100 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Temp</label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            name="temp"
                                            value={formData.temp}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-blue-200 rounded-l-lg text-sm"
                                        />
                                        <select
                                            name="tempUnit"
                                            value={formData.tempUnit}
                                            onChange={handleInputChange}
                                            className="border border-l-0 border-blue-200 rounded-r-lg bg-white text-xs px-1"
                                        >
                                            <option value="Fahrenheit">°F</option>
                                            <option value="Celsius">°C</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">BP (Sys/Dia)</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            name="bpSystolic"
                                            placeholder="Sys"
                                            value={formData.bpSystolic}
                                            onChange={handleInputChange}
                                            className="w-full px-2 py-2 border border-blue-200 rounded-lg text-sm"
                                        />
                                        <span className="text-blue-300">/</span>
                                        <input
                                            type="number"
                                            name="bpDiastolic"
                                            placeholder="Dia"
                                            value={formData.bpDiastolic}
                                            onChange={handleInputChange}
                                            className="w-full px-2 py-2 border border-blue-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Pulse</label>
                                    <input
                                        type="number"
                                        name="pulse"
                                        value={formData.pulse}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">SpO2 (%)</label>
                                    <input
                                        type="number"
                                        name="spo2"
                                        value={formData.spo2}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Resp. Rate</label>
                                    <input
                                        type="number"
                                        name="respiratoryRate"
                                        value={formData.respiratoryRate}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Random Blood Sugar</label>
                                    <input
                                        type="text"
                                        name="randomBloodSugar"
                                        value={formData.randomBloodSugar}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Vital Notes</label>
                                    <input
                                        type="text"
                                        name="vitalNotes"
                                        value={formData.vitalNotes}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Visit Details */}
                        <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
                            <h3 className="text-sm font-bold text-purple-800 mb-6 flex items-center gap-2">
                                <Stethoscope size={18} />
                                Visit & Consultation Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Department</label>
                                    <select
                                        name="doctorDept"
                                        value={formData.doctorDept}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-purple-200 rounded-xl bg-white"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Doctor Name</label>
                                    <select
                                        name="doctorId"
                                        value={formData.doctorId}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-purple-200 rounded-xl bg-white"
                                        required
                                    >
                                        <option value="">Select Doctor</option>
                                        {doctors
                                            .filter(d => !formData.doctorDept || d.department === formData.doctorDept)
                                            .map(doc => (
                                                <option key={doc.id} value={doc.id}>{doc.user?.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <StaffSelect
                                        value={formData.staffId}
                                        onChange={(val) => setFormData(prev => ({ ...prev, staffId: val }))}
                                        label="Registered By (Staff)"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Diagnosis / Consultation Notes</label>
                                    <div className="relative">
                                        <ClipboardList className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <textarea
                                            name="diagnosis"
                                            rows={1}
                                            value={formData.diagnosis}
                                            onChange={handleInputChange}
                                            placeholder="Primary diagnosis or reason for visit..."
                                            className="w-full pl-10 pr-4 py-2.5 border border-purple-200 rounded-xl bg-white"
                                        ></textarea>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-green-600">Consultation Fee (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" size={16} />
                                        <input
                                            type="number"
                                            name="consultationFee"
                                            value={formData.consultationFee}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Document Upload Section - Truly Optional */}
                        <div className="bg-gray-50/30 p-6 rounded-2xl border border-gray-100/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-600" />
                                    <h3 className="text-sm font-bold text-gray-900">Patient Documents (Optional)</h3>
                                </div>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Skip if not needed</span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Upload Section */}
                                <div className="bg-white rounded-xl p-4 border border-gray-100">
                                    <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Upload className="h-4 w-4 text-blue-600" />
                                        Upload New Documents
                                    </h4>
                                    <DocumentUpload
                                        patientId={registrationResult?.patient?.id}
                                        uhid={formData.uhid}
                                        staffId={formData.staffId}
                                        category="outpatient"
                                        disabled={false}
                                        onUploadComplete={(doc) => {
                                            setDocumentRefreshTrigger(prev => prev + 1);
                                            // Add to temporary documents if it's a temp file
                                            if (doc.id && doc.id.startsWith('temp-')) {
                                                setTemporaryDocuments(prev => [...prev, doc]);
                                            }
                                        }}
                                    />
                                    <p className="mt-2 text-[10px] text-gray-500 italic">
                                        You can upload documents now or after completing registration.
                                    </p>
                                </div>

                                {/* Documents List */}
                                <div className="bg-white rounded-xl p-4 border border-gray-100">
                                    <h4 className="text-xs font-semibold text-gray-700 mb-3">Uploaded Documents</h4>
                                    <DocumentList
                                        patientId={registrationResult?.patient?.id}
                                        showDelete={true}
                                        refreshTrigger={documentRefreshTrigger}
                                        temporaryFiles={temporaryDocuments}
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                <p className="text-xs text-blue-700">
                                    <strong>Note:</strong> Document upload is completely optional. You can complete patient registration without uploading any documents and upload them later if needed.
                                </p>
                            </div>
                        </div>

                        {/* Billing Section */}
                        <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                            <h3 className="text-sm font-bold text-orange-800 mb-6 flex items-center gap-2">
                                <IndianRupee size={18} />
                                Billing & Payment
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">OP Card Amount (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="number"
                                            name="opCardAmount"
                                            value={formData.opCardAmount}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Total Amount (₹) - Editable</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600" size={16} />
                                        <input
                                            type="number"
                                            name="totalAmount"
                                            value={formData.totalAmount}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-2.5 border-2 border-orange-500 rounded-xl bg-orange-100 text-orange-900 font-black text-lg"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Mode</label>
                                    <select
                                        name="paymentMode"
                                        value={formData.paymentMode}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-orange-200 rounded-xl bg-white"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI / QR">UPI / QR</option>
                                        <option value="Card">Card</option>
                                        <option value="Insurance">Insurance</option>
                                        <option value="Free">Free</option>
                                        <option value="Camp">Camp</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Advance Payment Section */}
                        <div className="mt-6 p-4 bg-green-50/50 rounded-xl border border-green-100">
                            <h4 className="text-sm font-bold text-green-800 mb-4 flex items-center gap-2">
                                <IndianRupee size={16} />
                                Advance Payment (Optional)
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Advance Amount (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" size={16} />
                                        <input
                                            type="number"
                                            name="advanceAmount"
                                            value={formData.advanceAmount}
                                            onChange={handleInputChange}
                                            placeholder="0.00"
                                            className="w-full pl-10 pr-4 py-2.5 border border-green-200 rounded-xl bg-white focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>
                                
                                {formData.advanceAmount && parseFloat(formData.advanceAmount) > 0 && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Payment Method</label>
                                        <select
                                            name="advancePaymentMethod"
                                            value={formData.advancePaymentMethod}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-green-200 rounded-xl bg-white focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="card">Card</option>
                                            <option value="upi">UPI</option>
                                            <option value="net_banking">Net Banking</option>
                                            <option value="cheque">Cheque</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {formData.advanceAmount && parseFloat(formData.advanceAmount) > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Reference Number (Optional)</label>
                                        <input
                                            type="text"
                                            name="advanceReferenceNumber"
                                            value={formData.advanceReferenceNumber}
                                            onChange={handleInputChange}
                                            placeholder="Transaction/Check number"
                                            className="w-full px-4 py-2.5 border border-green-200 rounded-xl bg-white focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Notes (Optional)</label>
                                        <textarea
                                            name="advanceNotes"
                                            value={formData.advanceNotes}
                                            onChange={handleInputChange}
                                            placeholder="Any additional notes about the advance payment"
                                            className="w-full px-4 py-2.5 border border-green-200 rounded-xl bg-white focus:ring-2 focus:ring-green-500"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.advanceAmount && parseFloat(formData.advanceAmount) > 0 && (
                                <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-300">
                                    <p className="text-sm text-green-800">
                                        <strong>Advance Payment:</strong> ₹{parseFloat(formData.advanceAmount || '0').toFixed(0)} via {formData.advancePaymentMethod?.charAt(0).toUpperCase() + formData.advancePaymentMethod?.slice(1) || 'Cash'}
                                        {formData.advanceReferenceNumber && ` (Ref: ${formData.advanceReferenceNumber})`}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-semibold px-4"
                            >
                                <ChevronLeft size={18} />
                                Back to Patient Info
                            </button>
                            <button
                                type="submit"
                                disabled={loading || isDuplicateDetected}
                                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-xl shadow-orange-200 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : isDuplicateDetected ? 'Duplicate Patient Detected' : 'Complete & Generate Bill'}
                                <Save size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );

    // Show success screen if registration is complete
    if (isSuccess) {
        return (
            <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 print:shadow-none print:border-none">
                <div className="bg-gradient-to-r from-green-400 to-green-400 p-8 text-white text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
                        <CheckCircle size={48} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Registration Complete!</h2>
                    <p className="text-white/90">Patient has been registered and bill has been generated.</p>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Patient Information</h3>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-gray-500">Name:</span>
                                <span className="font-medium text-gray-900">{registrationResult.patientName}</span>
                                <span className="text-gray-500">UHID:</span>
                                <span className="font-mono font-bold text-orange-600">{registrationResult.uhid}</span>
                                <span className="text-gray-500">Date:</span>
                                <span className="text-gray-900">{formData.registrationDate}</span>
                                <span className="text-gray-500">Doctor:</span>
                                <span className="text-gray-900">{formData.doctorName}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Billing Information</h3>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-gray-500">Bill No:</span>
                                <span className="font-mono text-gray-900">{registrationResult.billNo}</span>
                                <span className="text-gray-500">Payment Mode:</span>
                                <span className="text-gray-900">{formData.paymentMode}</span>
                                <span className="text-gray-500 font-bold">Total Amount:</span>
                                <span className="text-xl font-bold text-green-600">₹{registrationResult.totalAmount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-6 mb-8">
                        <BarcodeDisplay
                            uhid={registrationResult.uhid}
                            patientName={registrationResult.patientName}
                            size="medium"
                            className="w-full max-w-md shadow-sm"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={showThermalPreview}
                            className="flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-200"
                        >
                            <Printer size={18} className="mr-2" />
                            Print Bill & label
                        </button>
                        <button
                            onClick={onCancel}
                            className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>

                    {/* Hidden Label for Printing */}
                    <div className="hidden print:block">
                        <div className="p-4 border-2 border-black w-[80mm] h-[50mm] flex flex-col items-center justify-center text-center">
                            <div className="font-bold text-xl mb-1">ANNAM HOSPITAL</div>
                            <div className="text-sm font-mono">{registrationResult.uhid}</div>
                            <div className="font-bold">{registrationResult.patientName}</div>
                            <div className="text-xs">{formData.gender} / {formData.age} yrs</div>
                            <div className="mt-2 h-10 w-full flex items-center justify-center">
                                <Barcode size={32} />
                            </div>
                            <div className="text-[10px] mt-1 italic">Scan for Electronic Records</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const mainContent = (
        <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 print:shadow-none print:border-none">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-400 to-orange-400 p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <User size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Outpatient Registration</h1>
                            <p className="text-white/80 text-sm">Step {step} of 2: {step === 1 ? 'Patient Information' : 'Vital Signs & Billing'}</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper */}
                <div className="mt-6 flex items-center gap-2">
                    <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/30'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/30'}`}></div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
                {step === 1 ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Registration Header Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Registration Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="date"
                                        name="registrationDate"
                                        value={formData.registrationDate}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Registration Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="time"
                                        name="registrationTime"
                                        value={formData.registrationTime}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Patient UHID</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" size={16} />
                                    <input
                                        type="text"
                                        value={formData.uhid}
                                        readOnly
                                        className="w-full pl-10 pr-4 py-2.5 bg-orange-50 border border-orange-100 text-orange-700 font-mono font-bold rounded-xl outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Patient Full Name</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        name="firstName"
                                        placeholder="First Name"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="lastName"
                                        placeholder="Last Name"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date of Birth</label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Age (Auto)</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleInputChange}
                                    placeholder="Computed age"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact No</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="tel"
                                        name="contactNo"
                                        placeholder="Primary Number"
                                        value={formData.contactNo}
                                        onChange={handleInputChange}
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent ${contactValidationError ? 'border-red-300 bg-red-50' : contactDuplicateAlert ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}
                                        required
                                    />
                                </div>
                                
                                {/* Contact validation error */}
                                {contactValidationError && (
                                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        {contactValidationError}
                                    </div>
                                )}
                                
                                {/* Contact duplicate alert */}
                                {contactDuplicateAlert && (
                                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                            <span className="text-sm text-yellow-800 font-medium">
                                                Already existing contact patient
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Place</label>
                                <div className="relative place-input-container">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        name="place"
                                        placeholder="Enter Place/Locality"
                                        value={formData.place}
                                        onChange={handleInputChange}
                                        onKeyDown={handlePlaceKeyDown}
                                        onBlur={handlePlaceBlur}
                                        className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
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
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    placeholder="Enter City"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">State</label>
                                <select
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                >
                                    {INDIAN_STATES.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pincode</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    placeholder="6-digit Pincode"
                                    value={formData.pincode}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Complete Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                                <textarea
                                    name="address"
                                    rows={2}
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Street, locality, area details..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                ></textarea>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
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

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={isDuplicateDetected}
                                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDuplicateDetected ? 'Duplicate Patient Detected' : 'Proceed to Vitals'}
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Vitals Entry */}
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                            <h3 className="text-sm font-bold text-blue-800 mb-6 flex items-center gap-2">
                                <Activity size={18} />
                                Patient Vitals & Measurements
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Height (cm)</label>
                                    <input
                                        type="number"
                                        name="height"
                                        value={formData.height}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Weight (kg)</label>
                                    <input
                                        type="number"
                                        name="weight"
                                        value={formData.weight}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">BMI (Auto-calc)</label>
                                    <input
                                        type="text"
                                        name="bmi"
                                        value={formData.bmi}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-blue-100 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Temp</label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            name="temp"
                                            value={formData.temp}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-blue-200 rounded-l-lg text-sm"
                                        />
                                        <select
                                            name="tempUnit"
                                            value={formData.tempUnit}
                                            onChange={handleInputChange}
                                            className="border border-l-0 border-blue-200 rounded-r-lg bg-white text-xs px-1"
                                        >
                                            <option value="Fahrenheit">°F</option>
                                            <option value="Celsius">°C</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">BP (Sys/Dia)</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            name="bpSystolic"
                                            placeholder="Sys"
                                            value={formData.bpSystolic}
                                            onChange={handleInputChange}
                                            className="w-full px-2 py-2 border border-blue-200 rounded-lg text-sm"
                                        />
                                        <span className="text-blue-300">/</span>
                                        <input
                                            type="number"
                                            name="bpDiastolic"
                                            placeholder="Dia"
                                            value={formData.bpDiastolic}
                                            onChange={handleInputChange}
                                            className="w-full px-2 py-2 border border-blue-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Pulse</label>
                                    <input
                                        type="number"
                                        name="pulse"
                                        value={formData.pulse}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">SpO2 (%)</label>
                                    <input
                                        type="number"
                                        name="spo2"
                                        value={formData.spo2}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Resp. Rate</label>
                                    <input
                                        type="number"
                                        name="respiratoryRate"
                                        value={formData.respiratoryRate}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Random Blood Sugar</label>
                                    <input
                                        type="text"
                                        name="randomBloodSugar"
                                        value={formData.randomBloodSugar}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Vital Notes</label>
                                    <input
                                        type="text"
                                        name="vitalNotes"
                                        value={formData.vitalNotes}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Visit Details */}
                        <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
                            <h3 className="text-sm font-bold text-purple-800 mb-6 flex items-center gap-2">
                                <Stethoscope size={18} />
                                Visit & Consultation Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Department</label>
                                    <select
                                        name="doctorDept"
                                        value={formData.doctorDept}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-purple-200 rounded-xl bg-white"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Doctor Name</label>
                                    <select
                                        name="doctorId"
                                        value={formData.doctorId}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-purple-200 rounded-xl bg-white"
                                        required
                                    >
                                        <option value="">Select Doctor</option>
                                        {doctors
                                            .filter(d => !formData.doctorDept || d.department === formData.doctorDept)
                                            .map(doc => (
                                                <option key={doc.id} value={doc.id}>{doc.user?.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <StaffSelect
                                        value={formData.staffId}
                                        onChange={(val) => setFormData(prev => ({ ...prev, staffId: val }))}
                                        label="Registered By (Staff)"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Diagnosis / Consultation Notes</label>
                                    <div className="relative">
                                        <ClipboardList className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <textarea
                                            name="diagnosis"
                                            rows={1}
                                            value={formData.diagnosis}
                                            onChange={handleInputChange}
                                            placeholder="Primary diagnosis or reason for visit..."
                                            className="w-full pl-10 pr-4 py-2.5 border border-purple-200 rounded-xl bg-white"
                                        ></textarea>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-green-600">Consultation Fee (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" size={16} />
                                        <input
                                            type="number"
                                            name="consultationFee"
                                            value={formData.consultationFee}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-green-200 rounded-xl bg-green-50 font-bold text-green-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Document Upload Section - Truly Optional */}
                        <div className="bg-gray-50/30 p-6 rounded-2xl border border-gray-100/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-600" />
                                    <h3 className="text-sm font-bold text-gray-900">Patient Documents (Optional)</h3>
                                </div>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Skip if not needed</span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Upload Section */}
                                <div className="bg-white rounded-xl p-4 border border-gray-100">
                                    <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Upload className="h-4 w-4 text-blue-600" />
                                        Upload New Documents
                                    </h4>
                                    <DocumentUpload
                                        patientId={registrationResult?.patient?.id}
                                        uhid={formData.uhid}
                                        staffId={formData.staffId}
                                        category="outpatient"
                                        disabled={false}
                                        onUploadComplete={(doc) => {
                                            setDocumentRefreshTrigger(prev => prev + 1);
                                            // Add to temporary documents if it's a temp file
                                            if (doc.id && doc.id.startsWith('temp-')) {
                                                setTemporaryDocuments(prev => [...prev, doc]);
                                            }
                                        }}
                                    />
                                    <p className="mt-2 text-[10px] text-gray-500 italic">
                                        You can upload documents now or after completing registration.
                                    </p>
                                </div>

                                {/* Documents List */}
                                <div className="bg-white rounded-xl p-4 border border-gray-100">
                                    <h4 className="text-xs font-semibold text-gray-700 mb-3">Uploaded Documents</h4>
                                    <DocumentList
                                        patientId={registrationResult?.patient?.id}
                                        showDelete={true}
                                        refreshTrigger={documentRefreshTrigger}
                                        temporaryFiles={temporaryDocuments}
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                <p className="text-xs text-blue-700">
                                    <strong>Note:</strong> Document upload is completely optional. You can complete patient registration without uploading any documents and upload them later if needed.
                                </p>
                            </div>
                        </div>

                        {/* Billing Section */}
                        <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                            <h3 className="text-sm font-bold text-orange-800 mb-6 flex items-center gap-2">
                                <IndianRupee size={18} />
                                Billing & Payment
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">OP Card Amount (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="number"
                                            name="opCardAmount"
                                            value={formData.opCardAmount}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Total Amount (₹) - Editable</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600" size={16} />
                                        <input
                                            type="number"
                                            name="totalAmount"
                                            value={formData.totalAmount}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-2.5 border-2 border-orange-500 rounded-xl bg-orange-100 text-orange-900 font-black text-lg"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Mode</label>
                                    <select
                                        name="paymentMode"
                                        value={formData.paymentMode}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-orange-200 rounded-xl bg-white"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI / QR">UPI / QR</option>
                                        <option value="Card">Card</option>
                                        <option value="Insurance">Insurance</option>
                                        <option value="Free">Free</option>
                                        <option value="Camp">Camp</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-semibold px-4"
                            >
                                <ChevronLeft size={18} />
                                Back to Patient Info
                            </button>
                            <button
                                type="submit"
                                disabled={loading || isDuplicateDetected}
                                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-xl shadow-orange-200 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : isDuplicateDetected ? 'Duplicate Patient Detected' : 'Complete & Generate Bill'}
                                <Save size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );

    return (
        <>
            {mainContent}
            {currentBill && (
                <UniversalPaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    bill={currentBill}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        // Handle payment success if needed
                    }}
                />
            )}
        </>
    );
}
