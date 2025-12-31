'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Save, Printer, Loader2, AlertCircle,
    CheckCircle, User, Calendar, FileText, Stethoscope
} from 'lucide-react';
import { supabase } from '../../../../src/lib/supabase';
import { getBedAllocationById } from '../../../../src/lib/bedAllocationService';
import { createDischargeSummary, type DischargeSummaryData } from '../../../../src/lib/dischargeService';

export default function DischargeSummaryPage() {
    const router = useRouter();
    const params = useParams();
    const allocationId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<Partial<DischargeSummaryData>>({
        discharge_date: new Date().toISOString().split('T')[0],
        diagnosis_category: 'Treatment',
        condition_at_discharge: 'Improved',
    });

    useEffect(() => {
        if (allocationId) {
            loadData();
        }
    }, [allocationId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const allocation = await getBedAllocationById(allocationId);

            if (!allocation) {
                setError('Bed allocation not found.');
                return;
            }

            // Pre-fill form data
            setFormData(prev => ({
                ...prev,
                allocation_id: allocation.id,
                patient_id: allocation.patient_id,
                uhid: allocation.patient?.uhid || '',
                patient_name: allocation.patient?.name || '',
                address: (allocation.patient as any)?.address || '',
                gender: allocation.patient?.gender || '',
                age: allocation.patient?.age || 0,
                ip_number: (allocation as any).ip_number || '',
                admission_date: allocation.allocated_at ? new Date(allocation.allocated_at).toISOString().split('T')[0] : '',
                consultant_id: allocation.doctor_id,
                presenting_complaint: allocation.reason || '',
                physical_findings: '',
                investigations: '',
                anesthesiologist: '',
                past_history: (allocation.patient as any)?.medical_history || '',
                final_diagnosis: allocation.patient?.diagnosis || '',
                follow_up_advice: '',
                prescription: '',
            }));

        } catch (err: any) {
            console.error('Error loading data:', err);
            setError(err.message || 'Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await createDischargeSummary(formData as DischargeSummaryData);
            setSuccess(true);
            // Optional: Redirect or show print option
        } catch (err: any) {
            console.error('Error saving summary:', err);
            setError(err.message || 'Failed to save discharge summary.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Discharge Summary Saved!</h2>
                    <p className="text-gray-600 mb-6">The patient has been successfully discharged and the summary has been recorded.</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => window.print()}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                        >
                            <Printer size={20} /> Print Summary
                        </button>
                        <Link href="/inpatient" className="w-full">
                            <button className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all">
                                Back to Inpatient Dashboard
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/inpatient">
                            <button className="p-2 bg-white text-gray-400 hover:text-gray-600 rounded-lg shadow-sm border border-gray-200 transition-all">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Patient Discharge Summary</h1>
                            <p className="text-gray-600">Final medical record for patient discharge</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Patient Information (Pre-filled) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            <h2 className="font-bold text-gray-900 text-lg">Patient Information</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">UHID</label>
                                <p className="font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">{formData.uhid}</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Patient Name</label>
                                <p className="font-bold text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">{formData.patient_name}</p>
                            </div>
                            <div className="md:col-span-3 text-sm">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                                <p className="text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">{formData.address || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                                <p className="text-gray-900 bg-gray-50 p-2 rounded border border-gray-100 capitalize">{formData.gender}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age</label>
                                <p className="text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">{formData.age} Yrs</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inpatient Number</label>
                                <p className="font-bold text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 font-mono">{formData.ip_number || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Admission Details (Pre-filled) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-purple-600" />
                            <h2 className="font-bold text-gray-900 text-lg">Admission Details</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date of Admission</label>
                                <input
                                    type="date"
                                    value={formData.admission_date}
                                    readOnly
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date of Surgery (If any)</label>
                                <input
                                    type="date"
                                    value={formData.surgery_date || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, surgery_date: e.target.value }))}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date of Discharge</label>
                                <input
                                    type="date"
                                    value={formData.discharge_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, discharge_date: e.target.value }))}
                                    className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/50"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Medical Records */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-600" />
                            <h2 className="font-bold text-gray-900 text-lg">Medical Records</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Anesthesiologist</label>
                                    <input
                                        type="text"
                                        value={formData.anesthesiologist || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, anesthesiologist: e.target.value }))}
                                        placeholder="Enter name..."
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Past History</label>
                                    <textarea
                                        value={formData.past_history || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, past_history: e.target.value }))}
                                        rows={2}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Presenting Complaints</label>
                                <textarea
                                    value={formData.presenting_complaint || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, presenting_complaint: e.target.value }))}
                                    rows={3}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Physical Findings</label>
                                <textarea
                                    value={formData.physical_findings || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, physical_findings: e.target.value }))}
                                    rows={3}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Investigations</label>
                                <textarea
                                    value={formData.investigations || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, investigations: e.target.value }))}
                                    rows={3}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Diagnosis & Condition */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-green-50 border-b border-green-100 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-green-600" />
                            <h2 className="font-bold text-gray-900 text-lg">Final Diagnosis & Condition</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Final Diagnosis</label>
                                    <textarea
                                        value={formData.final_diagnosis || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, final_diagnosis: e.target.value }))}
                                        rows={3}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Diagnosis Type (Dropdown)</label>
                                        <select
                                            value={formData.diagnosis_category || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, diagnosis_category: e.target.value }))}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                            required
                                        >
                                            <option value="Management">Management</option>
                                            <option value="Procedure">Procedure</option>
                                            <option value="Treatment">Treatment</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Condition at Discharge</label>
                                        <select
                                            value={formData.condition_at_discharge || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, condition_at_discharge: e.target.value }))}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                            required
                                        >
                                            <option value="cured">Cured</option>
                                            <option value="improved">Improved</option>
                                            <option value="referred">Referred</option>
                                            <option value="dis at request">Dis at Request</option>
                                            <option value="lama">LAMA</option>
                                            <option value="absconed">Absconed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advice & Prescription */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <h2 className="font-bold text-gray-900 text-lg">Follow-up Advice & Prescription</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Follow-up Advice</label>
                                    <textarea
                                        value={formData.follow_up_advice || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, follow_up_advice: e.target.value }))}
                                        rows={4}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Review On (Date)</label>
                                        <input
                                            type="date"
                                            value={formData.review_on || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, review_on: e.target.value }))}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 italic">Schedule a review date for the patient to return.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Prescription / Medication at Discharge</label>
                                <textarea
                                    value={formData.prescription || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, prescription: e.target.value }))}
                                    rows={5}
                                    placeholder="Enter discharge medications and instructions..."
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-4 pb-12">
                        <Link href="/inpatient">
                            <button type="button" className="px-8 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                                Cancel
                            </button>
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-10 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-70"
                        >
                            {saving ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : <><Save size={20} /> Save Discharge Summary</>}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print, nav, button, .flex.justify-end {
                        display: none !important;
                    }
                    body {
                        background: white;
                        margin: 0;
                        padding: 0;
                    }
                    .max-w-5xl {
                        max-width: 100% !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .bg-gray-50 {
                        background: white !important;
                    }
                    .shadow-sm, .shadow-xl {
                        box-shadow: none !important;
                    }
                    .border {
                        border-color: #eee !important;
                    }
                    input, textarea, select {
                        border: none !important;
                        background: transparent !important;
                        padding: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}
