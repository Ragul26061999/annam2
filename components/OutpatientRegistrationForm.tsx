'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
    Upload
} from 'lucide-react';
import { generateUHID, registerNewPatient, PatientRegistrationData } from '../src/lib/patientService';
import { getAllDoctorsSimple, Doctor } from '../src/lib/doctorService';
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
        alternateNo: '',
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
        tempUnit: 'Celsius',
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
        staffId: ''
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

    // Calculate total amount
    useEffect(() => {
        const fee = parseFloat(formData.consultationFee) || 0;
        const opAmount = parseFloat(formData.opCardAmount) || 0;
        setFormData(prev => ({ ...prev, totalAmount: (fee + opAmount).toString() }));
    }, [formData.consultationFee, formData.opCardAmount]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => setStep(2);
    const prevStep = () => setStep(1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const registrationData: PatientRegistrationData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                dateOfBirth: formData.dob,
                age: formData.age,
                phone: formData.contactNo,
                alternatePhone: formData.alternateNo,
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
                staffId: formData.staffId
            };

            const result = await registerNewPatient(registrationData, formData.uhid);

            if (result.success) {
                // Create OP consultation bill
                try {
                    const bill = await createOPConsultationBill(
                        result.patient.id,
                        '', // No appointment ID for direct OP registration
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
                            onClick={() => window.print()}
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
                                    type="text"
                                    name="dob"
                                    placeholder="DD/MM/YYYY"
                                    maxLength={10}
                                    value={dobInput}
                                    onChange={handleDobChange}
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
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alternate Contact No</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="tel"
                                        name="alternateNo"
                                        placeholder="Optional Alternate Number"
                                        value={formData.alternateNo}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
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
                                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-orange-100"
                            >
                                Proceed to Vitals
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
                                            <option value="Celsius">°C</option>
                                            <option value="Fahrenheit">°F</option>
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
                                disabled={loading}
                                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-xl shadow-orange-200 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Complete & Generate Bill'}
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
                            onClick={() => window.print()}
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
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alternate Contact No</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="tel"
                                        name="alternateNo"
                                        placeholder="Optional Alternate Number"
                                        value={formData.alternateNo}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
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
                                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-orange-100"
                            >
                                Proceed to Vitals
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
                                            <option value="Celsius">°C</option>
                                            <option value="Fahrenheit">°F</option>
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
                                disabled={loading}
                                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-xl shadow-orange-200 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Complete & Generate Bill'}
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
