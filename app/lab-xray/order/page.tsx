'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Microscope,
    Radiation,
    ChevronLeft,
    Search,
    User,
    Stethoscope,
    FileText,
    Clock,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Info,
    Beaker,
    Zap,
    Save,
    Trash2,
    Plus,
    X
} from 'lucide-react';
import {
    getLabTestCatalog,
    getRadiologyTestCatalog,
    createLabTestOrder,
    createRadiologyTestOrder,
    LabTestCatalog,
    RadiologyTestCatalog
} from '../../../src/lib/labXrayService';
import { getAllPatients } from '../../../src/lib/patientService';
import { getAllDoctorsSimple } from '../../../src/lib/doctorService';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewOrderPage() {
    const router = useRouter();
    const [orderType, setOrderType] = useState<'lab' | 'radiology'>('lab');
    const [patients, setPatients] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [labCatalog, setLabCatalog] = useState<LabTestCatalog[]>([]);
    const [radCatalog, setRadCatalog] = useState<RadiologyTestCatalog[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [selectedPatient, setSelectedPatient] = useState<string>('');
    const [selectedDoctor, setSelectedDoctor] = useState<string>('');
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [clinicalIndication, setClinicalIndication] = useState('');
    const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'stat' | 'emergency'>('routine');

    // Search states for dropdowns
    const [patientSearch, setPatientSearch] = useState('');
    const [doctorSearch, setDoctorSearch] = useState('');
    const [testSearch, setTestSearch] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [patientsData, doctorsData, labCat, radCat] = await Promise.all([
                getAllPatients({ limit: 100 }),
                getAllDoctorsSimple(),
                getLabTestCatalog(),
                getRadiologyTestCatalog()
            ]);

            setPatients(patientsData.patients || []);
            setDoctors(doctorsData || []);
            setLabCatalog(labCat || []);
            setRadCatalog(radCat || []);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to initialize form data. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = (patients || []).filter(p => {
        if (!p) return false;
        const search = (patientSearch || '').toLowerCase();
        const name = (p.name?.toLowerCase() || '');
        const id = (p.patient_id?.toLowerCase() || '');
        return name.includes(search) || id.includes(search);
    });

    const filteredDoctors = (doctors || []).filter(d => {
        if (!d) return false;
        const search = (doctorSearch || '').toLowerCase();
        const name = (d.name?.toLowerCase() || '');
        const spec = (d.specialization?.toLowerCase() || '');
        return name.includes(search) || spec.includes(search);
    });

    const currentCatalog = orderType === 'lab' ? labCatalog : radCatalog;
    const filteredCatalog = (currentCatalog || []).filter(t => {
        if (!t) return false;
        const search = (testSearch || '').toLowerCase();
        const name = (t.test_name?.toLowerCase() || '');
        const code = (t.test_code?.toLowerCase() || '');
        return name.includes(search) || code.includes(search);
    });

    const patientData = patients.find(p => p.id === selectedPatient);
    const doctorData = doctors.find(d => d.id === selectedDoctor);

    const toggleTest = (id: string) => {
        setSelectedTests(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const removeTest = (id: string) => {
        setSelectedTests(prev => prev.filter(t => t !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalPatient = selectedPatient;
        let finalDoctor = selectedDoctor;

        // Auto-select if name exactly matches and nothing is selected (prevents common user error)
        if (!finalPatient && patientSearch) {
            const exactMatch = (patients || []).find(p => (p.name?.toLowerCase() || '') === patientSearch.toLowerCase());
            if (exactMatch) finalPatient = exactMatch.id;
        }

        if (!finalDoctor && doctorSearch) {
            const exactMatch = (doctors || []).find(d => (d.name?.toLowerCase() || '') === doctorSearch.toLowerCase());
            if (exactMatch) finalDoctor = exactMatch.id;
        }

        console.log('Finalizing Selection:', { finalPatient, finalDoctor, testCount: selectedTests.length });

        const missing = [];
        if (!finalPatient) missing.push('a patient (click result from search list)');
        if (!finalDoctor) missing.push('an ordering doctor (click result from search list)');
        if (selectedTests.length === 0) missing.push('at least one diagnostic test');

        if (missing.length > 0) {
            setError(`Incomplete Form: Please select ${missing.join(', ')}.`);
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const promises = selectedTests.map(testId => {
                if (orderType === 'lab') {
                    return createLabTestOrder({
                        patient_id: finalPatient,
                        ordering_doctor_id: finalDoctor,
                        test_catalog_id: testId,
                        clinical_indication: clinicalIndication,
                        urgency: urgency,
                        status: 'ordered'
                    });
                } else {
                    return createRadiologyTestOrder({
                        patient_id: finalPatient,
                        ordering_doctor_id: finalDoctor,
                        test_catalog_id: testId,
                        clinical_indication: clinicalIndication,
                        urgency: urgency,
                        status: 'ordered'
                    });
                }
            });

            await Promise.all(promises);
            setSuccess(true);
            setTimeout(() => router.push('/lab-xray'), 2000);
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to create orders. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-[#fcfcfd] min-h-screen">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Breadcrumbs & Header */}
                <div className="flex items-center justify-between">
                    <Link href="/lab-xray" className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors">
                        <ChevronLeft size={20} />
                        <span className="font-medium">Back to Management</span>
                    </Link>
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                        <button
                            onClick={() => { setOrderType('lab'); setSelectedTests([]); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${orderType === 'lab' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Lab Order
                        </button>
                        <button
                            onClick={() => { setOrderType('radiology'); setSelectedTests([]); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${orderType === 'radiology' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Radiology Order
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                    <div className={`p-8 bg-gradient-to-r ${orderType === 'lab' ? 'from-teal-600 to-emerald-600' : 'from-cyan-600 to-blue-600'} text-white`}>
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
                                {orderType === 'lab' ? <Beaker size={32} /> : <Radiation size={32} />}
                            </div>
                            <div>
                                <h1 className="text-3xl font-black">Create Diagnostic Order</h1>
                                <p className="text-white/80 font-medium">Step-by-step clinical request initiation</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3">
                                <AlertCircle size={20} />
                                <span className="text-sm font-bold">{error}</span>
                            </motion.div>
                        )}

                        {success && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-3xl text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Orders Created Successfully!</h3>
                                    <p className="text-sm">Generating billing items and notifying laboratory... Redirecting now.</p>
                                </div>
                            </motion.div>
                        )}

                        {!success && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Patient & Doctor */}
                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <User size={16} /> Patient Selection <span className="text-red-500">*</span>
                                            </label>

                                            {selectedPatient && patientData && (
                                                <div className="flex items-center gap-2 mb-2 p-2 bg-teal-50 border border-teal-200 rounded-lg animate-in fade-in slide-in-from-top-1">
                                                    <CheckCircle2 size={14} className="text-teal-600" />
                                                    <span className="text-xs font-bold text-teal-800">Selected: {patientData.name}</span>
                                                    <button onClick={() => setSelectedPatient('')} className="ml-auto text-teal-400 hover:text-teal-600"><X size={14} /></button>
                                                </div>
                                            )}

                                            <div className="relative group">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                                                <input
                                                    type="text"
                                                    placeholder="Search patient by name or ID..."
                                                    value={patientSearch || ''}
                                                    onChange={(e) => {
                                                        setPatientSearch(e.target.value);
                                                        if (selectedPatient) setSelectedPatient('');
                                                    }}
                                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 ${selectedPatient ? 'border-teal-500' : 'border-transparent'} focus:border-teal-500 focus:bg-white rounded-xl transition-all outline-none text-sm`}
                                                />
                                            </div>
                                            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white">
                                                {filteredPatients.map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => { setSelectedPatient(p.id); setPatientSearch(p.name || ''); }}
                                                        className={`p-3 cursor-pointer text-sm transition-colors flex items-center justify-between ${selectedPatient === p.id ? 'bg-teal-50 text-teal-700 font-bold' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <span>{p.name} <span className="text-xs text-gray-400 ml-2">{p.patient_id}</span></span>
                                                        {selectedPatient === p.id && <CheckCircle2 size={16} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Stethoscope size={16} /> Ordering Doctor <span className="text-red-500">*</span>
                                            </label>

                                            {selectedDoctor && doctorData && (
                                                <div className="flex items-center gap-2 mb-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg animate-in fade-in slide-in-from-top-1">
                                                    <CheckCircle2 size={14} className="text-indigo-600" />
                                                    <span className="text-xs font-bold text-indigo-800">Selected: Dr. {doctorData.name}</span>
                                                    <button onClick={() => setSelectedDoctor('')} className="ml-auto text-indigo-400 hover:text-indigo-600"><X size={14} /></button>
                                                </div>
                                            )}

                                            <div className="relative group">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                                                <input
                                                    type="text"
                                                    placeholder="Search doctor..."
                                                    value={doctorSearch || ''}
                                                    onChange={(e) => {
                                                        setDoctorSearch(e.target.value);
                                                        if (selectedDoctor) setSelectedDoctor('');
                                                    }}
                                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 ${selectedDoctor ? 'border-indigo-500' : 'border-transparent'} focus:border-teal-500 focus:bg-white rounded-xl transition-all outline-none text-sm`}
                                                />
                                            </div>
                                            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white">
                                                {filteredDoctors.map(d => (
                                                    <div
                                                        key={d.id}
                                                        onClick={() => { setSelectedDoctor(d.id); setDoctorSearch(d.name || ''); }}
                                                        className={`p-3 cursor-pointer text-sm transition-colors flex items-center justify-between ${selectedDoctor === d.id ? 'bg-teal-50 text-teal-700 font-bold' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <span>Dr. {d.name} <span className="text-xs text-gray-400 ml-2">{d.specialization}</span></span>
                                                        {selectedDoctor === d.id && <CheckCircle2 size={16} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                Priority & Urgency
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['routine', 'urgent', 'stat', 'emergency'].map(level => (
                                                    <button
                                                        key={level}
                                                        type="button"
                                                        onClick={() => setUrgency(level as any)}
                                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all border-2 ${urgency === level
                                                            ? (level === 'routine' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-red-50 border-red-300 text-red-700')
                                                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                            }`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Tests & Details */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Plus size={16} /> Select Tests <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative group mb-3">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                                                <input
                                                    type="text"
                                                    placeholder={`Search ${orderType === 'lab' ? 'lab' : 'radiology'} tests...`}
                                                    value={testSearch || ''}
                                                    onChange={(e) => setTestSearch(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-xl transition-all outline-none text-sm"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto p-1">
                                                {filteredCatalog.map(t => (
                                                    <div
                                                        key={t.id}
                                                        onClick={() => toggleTest(t.id)}
                                                        className={`p-4 cursor-pointer border-2 rounded-2xl transition-all flex items-center justify-between group ${selectedTests.includes(t.id)
                                                            ? 'bg-teal-50 border-teal-500 shadow-sm'
                                                            : 'bg-white border-gray-100 hover:border-teal-200'
                                                            }`}
                                                    >
                                                        <div>
                                                            <p className={`text-sm font-black ${selectedTests.includes(t.id) ? 'text-teal-900' : 'text-gray-700'}`}>{t.test_name}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{t.test_code} • ₹{t.test_cost}</p>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedTests.includes(t.id) ? 'bg-teal-500 border-teal-500' : 'border-gray-200 group-hover:border-teal-300'}`}>
                                                            {selectedTests.includes(t.id) && <CheckCircle2 size={14} className="text-white" />}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <FileText size={16} /> Clinical Indication
                                            </label>
                                            <textarea
                                                rows={4}
                                                placeholder="Reason for test, brief history..."
                                                value={clinicalIndication}
                                                onChange={(e) => setClinicalIndication(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl transition-all outline-none text-sm resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Selection Summary */}
                                <div className="mt-8 pt-8 border-t border-gray-100">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {selectedTests.length > 0 ? (
                                                selectedTests.map(id => {
                                                    const test = currentCatalog.find(c => c.id === id);
                                                    return (
                                                        <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 whitespace-nowrap">
                                                            {test?.test_name}
                                                            <button onClick={() => removeTest(id)} className="hover:text-red-500"><X size={14} /></button>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">No tests selected yet...</span>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className={`flex items-center gap-3 px-10 py-4 ${orderType === 'lab' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-cyan-600 hover:bg-cyan-700'} text-white rounded-2xl font-black text-lg transition-all shadow-xl disabled:opacity-50 transform active:scale-95`}
                                        >
                                            {submitting ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={24} />
                                                    Finalize Order
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </form>
                </div>

                {/* Help Tip */}
                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex gap-4">
                    <Info className="text-blue-500 shrink-0" size={24} />
                    <div>
                        <h4 className="text-sm font-bold text-blue-900 mb-1">Electronic Diagnostic Ordering Workflow</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Orders created here will automatically create a billing transaction for the patient.
                            Laboratory technicians and Radiologists will receive real-time notifications in their respective dashboards
                            to begin sample collection or procedure scheduling.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
