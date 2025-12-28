'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    RefreshCw,
    Search,
    User,
    Phone,
    Calendar,
    Clock,
    Stethoscope,
    FileText,
    DollarSign,
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';
import {
    searchPatientByUHID,
    createRevisit,
    getPatientVisitHistory,
    PatientDetails
} from '../../../src/lib/revisitService';
import { getAllDoctorsSimple, Doctor } from '../../../src/lib/doctorService';
import StaffSelect from '../../../src/components/StaffSelect';

export default function CreateRevisitPage() {
    const router = useRouter();
    const [uhidSearch, setUhidSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [patient, setPatient] = useState<PatientDetails | null>(null);
    const [visitHistory, setVisitHistory] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        visitDate: new Date().toISOString().split('T')[0],
        visitTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        department: '',
        doctorId: '',
        reasonForVisit: '',
        symptoms: '',
        previousDiagnosis: '',
        currentDiagnosis: '',
        consultationFee: '0',
        paymentMode: 'Cash',
        paymentStatus: 'pending',
        visitType: 'follow-up',
        staffId: '',
        notes: ''
    });

    useEffect(() => {
        loadDoctors();
    }, []);

    const loadDoctors = async () => {
        try {
            const doctorsList = await getAllDoctorsSimple();
            setDoctors(doctorsList);
        } catch (error) {
            console.error('Error loading doctors:', error);
        }
    };

    const handleUHIDSearch = async () => {
        if (!uhidSearch.trim()) {
            setError('Please enter a UHID');
            return;
        }

        setSearching(true);
        setError(null);
        try {
            const patientData = await searchPatientByUHID(uhidSearch);

            if (!patientData) {
                setError('Patient not found with this UHID');
                setPatient(null);
                setVisitHistory([]);
                return;
            }

            setPatient(patientData);

            // Load visit history
            const history = await getPatientVisitHistory(patientData.id);
            setVisitHistory(history);

            // Auto-fill previous diagnosis if available
            if (history.length > 0 && history[0].current_diagnosis) {
                setFormData(prev => ({
                    ...prev,
                    previousDiagnosis: history[0].current_diagnosis
                }));
            }
        } catch (err: any) {
            console.error('Search error:', err);
            setError('Error searching for patient');
        } finally {
            setSearching(false);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!patient) {
            setError('Please search and select a patient first');
            return;
        }

        if (!formData.reasonForVisit.trim()) {
            setError('Please enter the reason for visit');
            return;
        }

        if (!formData.staffId) {
            setError('Please select the staff member');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await createRevisit({
                patient_id: patient.id,
                uhid: patient.patient_id,
                visit_date: formData.visitDate,
                visit_time: formData.visitTime,
                department: formData.department || undefined,
                doctor_id: formData.doctorId || undefined,
                reason_for_visit: formData.reasonForVisit,
                symptoms: formData.symptoms || undefined,
                previous_diagnosis: formData.previousDiagnosis || undefined,
                current_diagnosis: formData.currentDiagnosis || undefined,
                consultation_fee: parseFloat(formData.consultationFee) || 0,
                payment_mode: formData.paymentMode,
                payment_status: formData.paymentStatus,
                visit_type: formData.visitType,
                staff_id: formData.staffId,
                notes: formData.notes || undefined
            });

            setSuccess(true);
            setTimeout(() => {
                router.push('/revisit');
            }, 2000);
        } catch (err: any) {
            console.error('Error creating revisit:', err);
            setError('Failed to create revisit record');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Revisit Created!</h2>
                    <p className="text-gray-600 mb-6">
                        Patient revisit has been recorded successfully.
                    </p>
                    <div className="text-sm text-gray-500">Redirecting to dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/revisit"
                            className="p-2 hover:bg-white rounded-xl transition-colors"
                        >
                            <ArrowLeft className="h-6 w-6 text-gray-600" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg">
                                <RefreshCw className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">New Revisit</h1>
                                <p className="text-gray-600">Record a patient's return visit</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        <p className="text-red-800 font-medium">{error}</p>
                    </div>
                )}

                {/* Patient Search */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Search Patient</h3>
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Enter patient UHID..."
                                value={uhidSearch}
                                onChange={(e) => setUhidSearch(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUHIDSearch()}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <button
                            onClick={handleUHIDSearch}
                            disabled={searching}
                            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {searching ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <Search size={20} />
                                    Search
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Patient Details */}
                {patient && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Patient Details</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">UHID</p>
                                <p className="font-mono font-bold text-cyan-600">{patient.patient_id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Name</p>
                                <p className="font-semibold text-gray-900">{patient.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Age / Gender</p>
                                <p className="text-gray-700">{patient.age} yrs / {patient.gender}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Contact</p>
                                <p className="text-gray-700">{patient.phone}</p>
                            </div>
                        </div>

                        {/* Visit History */}
                        {visitHistory.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3">Recent Visits ({visitHistory.length})</h4>
                                <div className="space-y-2">
                                    {visitHistory.slice(0, 3).map((visit, idx) => (
                                        <div key={idx} className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">{new Date(visit.visit_date).toLocaleDateString()}</span>
                                            <span className="text-gray-400">-</span>
                                            <span className="text-gray-700">{visit.reason_for_visit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Revisit Form */}
                {patient && (
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
                        <h3 className="text-lg font-bold text-gray-900">Visit Information</h3>

                        {/* Date and Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Visit Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.visitDate}
                                    onChange={(e) => handleInputChange('visitDate', e.target.value)}
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Visit Time *
                                </label>
                                <input
                                    type="time"
                                    value={formData.visitTime}
                                    onChange={(e) => handleInputChange('visitTime', e.target.value)}
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>

                        {/* Department and Doctor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Department
                                </label>
                                <select
                                    value={formData.department}
                                    onChange={(e) => handleInputChange('department', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                                >
                                    <option value="">Select Department</option>
                                    {Array.from(new Set(doctors.map(d => d.department))).filter(Boolean).map((dept) => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Consulting Doctor
                                </label>
                                <select
                                    value={formData.doctorId}
                                    onChange={(e) => handleInputChange('doctorId', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                                >
                                    <option value="">Select Doctor</option>
                                    {doctors
                                        .filter(d => !formData.department || d.department === formData.department)
                                        .map((doctor) => (
                                            <option key={doctor.id} value={doctor.id}>
                                                Dr. {doctor.user?.name || 'Unknown'}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {/* Reason for Visit */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reason for Visit *
                            </label>
                            <textarea
                                value={formData.reasonForVisit}
                                onChange={(e) => handleInputChange('reasonForVisit', e.target.value)}
                                required
                                rows={3}
                                placeholder="Enter the reason for this visit..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
                            />
                        </div>

                        {/* Current Symptoms */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Current Symptoms
                            </label>
                            <textarea
                                value={formData.symptoms}
                                onChange={(e) => handleInputChange('symptoms', e.target.value)}
                                rows={3}
                                placeholder="Describe current symptoms..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
                            />
                        </div>

                        {/* Diagnosis Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Previous Diagnosis
                                </label>
                                <textarea
                                    value={formData.previousDiagnosis}
                                    onChange={(e) => handleInputChange('previousDiagnosis', e.target.value)}
                                    rows={2}
                                    placeholder="Previous diagnosis (auto-filled if available)"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Current Diagnosis
                                </label>
                                <textarea
                                    value={formData.currentDiagnosis}
                                    onChange={(e) => handleInputChange('currentDiagnosis', e.target.value)}
                                    rows={2}
                                    placeholder="Enter current diagnosis..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Visit Type and Consultation Fee */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Visit Type
                                </label>
                                <select
                                    value={formData.visitType}
                                    onChange={(e) => handleInputChange('visitType', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                                >
                                    <option value="follow-up">Follow-up</option>
                                    <option value="emergency">Emergency</option>
                                    <option value="routine-checkup">Routine Checkup</option>
                                    <option value="consultation">Consultation</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Consultation Fee (₹)
                                </label>
                                <input
                                    type="number"
                                    value={formData.consultationFee}
                                    onChange={(e) => handleInputChange('consultationFee', e.target.value)}
                                    min="0"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Payment Mode
                                </label>
                                <select
                                    value={formData.paymentMode}
                                    onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Insurance">Insurance</option>
                                </select>
                            </div>
                        </div>

                        {/* Staff Selection */}
                        <div>
                            <StaffSelect
                                value={formData.staffId}
                                onChange={(val) => handleInputChange('staffId', val)}
                                label="Registered By (Staff)"
                                required
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Additional Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                rows={3}
                                placeholder="Any additional notes or observations..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => router.push('/revisit')}
                                className="flex-1 px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Creating Revisit...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        Create Revisit
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
