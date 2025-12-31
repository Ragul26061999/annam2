'use client';

import React, { useState, useEffect } from 'react';
import {
    Search, User, Building, Stethoscope,
    CreditCard, FileText, Bed, CheckCircle,
    Loader2, AlertCircle, X, Hash, Phone, Upload, Plus, Check, Trash2,
    Calendar, Users, Activity, Info, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { getAllDoctorsSimple, type Doctor } from '../src/lib/doctorService';
import { getAvailableBeds, allocateBed, type Bed as BedType, getNextIPNumber } from '../src/lib/bedAllocationService';
import { updatePatientAdmissionStatus } from '../src/lib/patientService';
import StaffSelect from '../src/components/StaffSelect';
import DocumentUpload from '../src/components/DocumentUpload';
import DocumentList from '../src/components/DocumentList';

interface InpatientAdmissionFormProps {
    onComplete: (result: { uhid: string; patientName: string; qrCode?: string }) => void;
    onCancel: () => void;
}

export default function InpatientAdmissionForm({ onComplete, onCancel }: InpatientAdmissionFormProps) {
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [availableBeds, setAvailableBeds] = useState<BedType[]>([]);

    const [formData, setFormData] = useState({
        department: '',
        attendingDoctorId: '',
        admittingDoctorId: '',
        advanceAmount: '',
        reasonForAdmission: '',
        diagnosisAtAdmission: '',
        selectedBedId: '',
        admissionDate: new Date().toISOString().split('T')[0],
        staffId: '',
        admissionCategory: '',
        ipNumber: '' // Added IP Number
    });
    const [admissionCategories, setAdmissionCategories] = useState<string[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const doctorsList = await getAllDoctorsSimple();
            setDoctors(doctorsList);

            const beds = await getAvailableBeds();
            setAvailableBeds(beds);

            const ipNum = await getNextIPNumber();
            setFormData(prev => ({ ...prev, ipNumber: ipNum }));
        } catch (error) {
            console.error('Error loading initial data:', error);
        }

        fetchAdmissionCategories();
    };

    const fetchAdmissionCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('admission_categories')
                .select('name')
                .eq('status', 'active')
                .order('name');
            if (error) throw error;
            setAdmissionCategories(data.map(c => c.name));
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
        try {
            const { error } = await supabase
                .from('admission_categories')
                .insert([{ name: newCategory.trim() }]);
            if (error) throw error;
            setAdmissionCategories(prev => [...prev, newCategory.trim()].sort());
            setFormData(prev => ({ ...prev, admissionCategory: newCategory.trim() }));
            setNewCategory('');
            setIsAddingCategory(false);
        } catch (err) {
            console.error('Error adding category:', err);
            setMessage({ type: 'error', text: 'Failed to add category' });
        }
    };

    const handlePatientSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 3) {
            setPatients([]);
            return;
        }

        setSearching(true);
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .or(`patient_id.ilike.%${term}%,phone.ilike.%${term}%,name.ilike.%${term}%`)
                .limit(5);

            if (error) throw error;
            setPatients(data || []);
        } catch (error) {
            console.error('Error searching patients:', error);
        } finally {
            setSearching(false);
        }
    };

    const selectPatient = (patient: any) => {
        setSelectedPatient(patient);
        setSearchTerm(patient.name);
        setPatients([]);

        // Auto-fill diagnosis if available
        if (patient.diagnosis) {
            setFormData(prev => ({ ...prev, diagnosisAtAdmission: patient.diagnosis }));
        }
    };

    const departments = [
        'General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics',
        'Neurology', 'Gastroenterology', 'Oncology', 'Gynecology', 'Surgery'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) {
            setMessage({ type: 'error', text: 'Please select a patient' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            // 1. Create a specialized admission record or just handle bed allocation
            // For now, since "admissions" table doesn't exist, we use bed_allocations as the primary source of admission info

            // 2. Allocate bed if selected
            if (formData.selectedBedId) {
                await allocateBed({
                    patientId: selectedPatient.id,
                    bedId: formData.selectedBedId,
                    doctorId: formData.attendingDoctorId,
                    admissionDate: formData.admissionDate,
                    admissionType: 'inpatient',
                    reason: formData.reasonForAdmission || formData.diagnosisAtAdmission,
                    staffId: formData.staffId,
                    admissionCategory: formData.admissionCategory,
                    ipNumber: formData.ipNumber
                });
            }

            // 3. Update patient admission status with all details
            const patientUpdateData = {
                department_ward: formData.department,
                diagnosis: formData.diagnosisAtAdmission,
                primary_complaint: formData.reasonForAdmission,
                admission_date: formData.admissionDate,
                admission_category: formData.admissionCategory
            };

            await updatePatientAdmissionStatus(
                selectedPatient.patient_id,
                true,
                'inpatient',
                patientUpdateData
            );

            // 4. Record the advance amount (this would typically go to a billing/transaction table)
            // Since we don't have a specific table for this in the user request, we'll skip for now or use a metadata field if available

            onComplete({
                uhid: selectedPatient.patient_id,
                patientName: selectedPatient.name,
                qrCode: selectedPatient.qr_code
            });
        } catch (error: any) {
            console.error('Admission error:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to create admission' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Bed className="h-6 w-6 text-blue-600" />
                    Create Inpatient Admission
                </h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Patient Selection */}
                <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Patient (UHID / Mobile / Name)
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handlePatientSearch(e.target.value)}
                            placeholder="Search outpatient for admission..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                            required={!selectedPatient}
                        />
                        {searching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            </div>
                        )}
                    </div>

                    {patients.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {patients.map(patient => (
                                <button
                                    key={patient.id}
                                    type="button"
                                    onClick={() => selectPatient(patient)}
                                    className="w-full text-left p-3 hover:bg-blue-50 flex items-center justify-between border-b last:border-0 border-gray-100"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-900">{patient.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Hash size={12} /> {patient.patient_id} • <Phone size={12} /> {patient.phone}
                                        </p>
                                    </div>
                                    {patient.is_admitted ? (
                                        <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">ALREADY ADMITTED</span>
                                    ) : (
                                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold uppercase">{patient.admission_type || 'OUTPATIENT'}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedPatient && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full">
                                    <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-blue-900">{selectedPatient.name}</p>
                                    <p className="text-xs text-blue-700">{selectedPatient.patient_id} • {selectedPatient.gender} • {selectedPatient.age} Yrs</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedPatient(null);
                                    setSearchTerm('');
                                }}
                                className="text-xs text-red-600 hover:underline font-medium"
                            >
                                Change Patient
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Department */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" /> Department
                        </label>
                        <select
                            value={formData.department}
                            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select Department</option>
                            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                    </div>

                    {/* Advance Amount */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-gray-400" /> Advance Amount (₹)
                        </label>
                        <input
                            type="number"
                            value={formData.advanceAmount}
                            onChange={(e) => setFormData(prev => ({ ...prev, advanceAmount: e.target.value }))}
                            placeholder="e.g. 5000"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Inpatient Number (Automatic) */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-400" /> Inpatient Number (Automatic)
                        </label>
                        <input
                            type="text"
                            value={formData.ipNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, ipNumber: e.target.value }))}
                            className="w-full px-4 py-2 border border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-900"
                            placeholder="Generating..."
                            readOnly
                        />
                        <p className="text-[10px] text-blue-600 mt-1">This number is generated automatically for each admission.</p>
                    </div>

                    {/* Attending Doctor */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-gray-400" /> Attending Doctor
                        </label>
                        <select
                            value={formData.attendingDoctorId}
                            onChange={(e) => setFormData(prev => ({ ...prev, attendingDoctorId: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select Attending Doctor</option>
                            {doctors.map(doctor => (
                                <option key={doctor.id} value={doctor.id}>
                                    Dr. {doctor.user?.name} - {doctor.specialization}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Admitting Doctor */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-gray-400" /> Admitting Doctor
                        </label>
                        <select
                            value={formData.admittingDoctorId}
                            onChange={(e) => setFormData(prev => ({ ...prev, admittingDoctorId: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select Admitting Doctor</option>
                            {doctors.map(doctor => (
                                <option key={doctor.id} value={doctor.id}>
                                    Dr. {doctor.user?.name} - {doctor.specialization}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Admission Category */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-gray-400" /> Admission Category
                            </span>
                            {!isAddingCategory ? (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(true)}
                                    className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                                >
                                    <Plus size={14} /> Add Category
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(false)}
                                    className="text-gray-500 hover:text-gray-600 text-xs font-medium"
                                >
                                    Cancel
                                </button>
                            )}
                        </label>

                        {!isAddingCategory ? (
                            <select
                                value={formData.admissionCategory}
                                onChange={(e) => setFormData(prev => ({ ...prev, admissionCategory: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Admission Category</option>
                                {admissionCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="Enter new category..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCategory}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Check size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reason for Admission */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" /> Reason for Admission
                    </label>
                    <textarea
                        value={formData.reasonForAdmission}
                        onChange={(e) => setFormData(prev => ({ ...prev, reasonForAdmission: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Main reason for recommending admission"
                        required
                    ></textarea>
                </div>

                {/* Diagnosis at Admission */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" /> Diagnosis at Admission
                    </label>
                    <textarea
                        value={formData.diagnosisAtAdmission}
                        onChange={(e) => setFormData(prev => ({ ...prev, diagnosisAtAdmission: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Preliminary or final diagnosis"
                        required
                    ></textarea>
                </div>

                {/* Staff Selection */}
                <div>
                    <StaffSelect
                        value={formData.staffId}
                        onChange={(val) => setFormData(prev => ({ ...prev, staffId: val }))}
                        label="Admitted By (Staff)"
                        required
                    />
                </div>

                {/* Document Upload Section (Moved) */}
                {selectedPatient && (
                    <div className="bg-blue-50/30 p-6 rounded-xl border border-blue-100/50">
                        <div className="flex items-center gap-3 mb-4">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <h3 className="text-sm font-bold text-gray-900">Patient Documents (Optional)</h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Upload Section */}
                            <div className="bg-white rounded-lg p-4 border border-blue-100">
                                <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Upload className="h-4 w-4 text-blue-600" />
                                    Upload Documents
                                </h4>
                                <DocumentUpload
                                    patientId={selectedPatient.id}
                                    uhid={selectedPatient.patient_id}
                                    staffId={formData.staffId}
                                    category="general"
                                    onUploadComplete={(doc) => {
                                        setDocumentRefreshTrigger(prev => prev + 1);
                                    }}
                                />
                            </div>

                            {/* Documents List */}
                            <div className="bg-white rounded-lg p-4 border border-gray-100">
                                <DocumentList
                                    patientId={selectedPatient.id}
                                    showDelete={true}
                                    refreshTrigger={documentRefreshTrigger}
                                />
                            </div>
                        </div>
                    </div>
                )}


                {/* Bed Allocation (Optional) */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Bed className="h-5 w-5 text-gray-600" />
                            Allocate Bed Now (Optional)
                        </h3>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {availableBeds.length} Available
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                            value={formData.selectedBedId}
                            onChange={(e) => setFormData(prev => ({ ...prev, selectedBedId: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                        >
                            <option value="">Choose an available bed later</option>
                            {availableBeds.map(bed => (
                                <option key={bed.id} value={bed.id}>
                                    {bed.bed_number} ({bed.bed_type}) - Room {bed.room_number}, Floor {bed.floor_number}
                                </option>
                            ))}
                        </select>

                        <div className="text-xs text-gray-500 flex items-center italic">
                            * Bed can also be allocated after admission from the inpatient list.
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                        }`}>
                        {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                )}


                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md hover:shadow-lg disabled:bg-blue-300 flex items-center gap-2 transition-all"
                    >
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Admitting...</> : 'Create IP Admission'}
                    </button>
                </div>
            </form>
        </div>
    );
}
