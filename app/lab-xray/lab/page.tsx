'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Microscope,
    ChevronLeft,
    Search,
    User,
    Phone,
    Mail,
    Calendar,
    CreditCard,
    Plus,
    Trash2,
    FileText,
    Upload,
    Clock,
    CheckCircle2,
    AlertCircle,
    Hash,
    Beaker,
    Stethoscope,
    ChevronDown,
    X,
    Printer,
    Save,
    Loader2
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';
import {
    getLabTestCatalog,
    createLabTestOrder,
    createLabTestCatalogEntry,
    LabTestCatalog
} from '../../../src/lib/labXrayService';
import StaffSelect from '../../../src/components/StaffSelect';
import { getAllDoctorsSimple } from '../../../src/lib/doctorService';
import { motion, AnimatePresence } from 'framer-motion';

interface TestSelection {
    testId: string;
    testName: string;
    groupName: string;
    amount: number;
}

export default function LabOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [searchingPatient, setSearchingPatient] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Master Data
    const [labCatalog, setLabCatalog] = useState<LabTestCatalog[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);

    // Search States
    const [uhidSearch, setUhidSearch] = useState('');

    // New Test State
    const [showNewTestModal, setShowNewTestModal] = useState(false);
    const [newTestData, setNewTestData] = useState({
        testName: '',
        groupName: '',
        amount: 0
    });
    const [creatingTest, setCreatingTest] = useState(false);

    // Patient Details (Auto-filled)
    const [patientDetails, setPatientDetails] = useState({
        id: '',
        uhid: '',
        name: '',
        gender: '',
        age: '',
        contactNo: '',
        emailId: ''
    });

    // Order Details
    const [selectedTests, setSelectedTests] = useState<TestSelection[]>([
        { testId: '', testName: '', groupName: '', amount: 0 }
    ]);
    const [orderingDoctorId, setOrderingDoctorId] = useState('');
    const [clinicalIndication, setClinicalIndication] = useState('');
    const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'stat' | 'emergency'>('routine');
    const [totalAmount, setTotalAmount] = useState(0);
    const [staffId, setStaffId] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        const total = selectedTests.reduce((sum, test) => sum + test.amount, 0);
        setTotalAmount(total);
    }, [selectedTests]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [catalog, doctorsList] = await Promise.all([
                getLabTestCatalog(),
                getAllDoctorsSimple()
            ]);
            setLabCatalog(catalog || []);
            setDoctors(doctorsList || []);
        } catch (err) {
            console.error('Error loading initial data:', err);
            setError('Failed to load catalog data.');
        } finally {
            setLoading(false);
        }
    };

    const handleUHIDSearch = async () => {
        if (!uhidSearch.trim()) return;

        setSearchingPatient(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .ilike('patient_id', uhidSearch.trim())
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    setError('Patient not found with this UHID.');
                } else {
                    throw error;
                }
                return;
            }

            if (data) {
                // Calculate age
                let age = '';
                if (data.date_of_birth) {
                    const birthDate = new Date(data.date_of_birth);
                    const today = new Date();
                    let years = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        years--;
                    }
                    age = years.toString();
                }

                setPatientDetails({
                    id: data.id,
                    uhid: data.patient_id,
                    name: data.name,
                    gender: data.gender || '',
                    age: age,
                    contactNo: data.phone || '',
                    emailId: data.email || ''
                });
            }
        } catch (err: any) {
            console.error('Patient search error:', err);
            setError('An error occurred while searching for the patient.');
        } finally {
            setSearchingPatient(false);
        }
    };

    const handleCreateNewTest = async () => {
        if (!newTestData.testName || !newTestData.groupName) {
            setError('Test name and group name are required.');
            return;
        }

        try {
            setCreatingTest(true);
            const newEntry = await createLabTestCatalogEntry({
                test_name: newTestData.testName,
                category: newTestData.groupName,
                test_cost: newTestData.amount
            });

            // Update master data
            setLabCatalog(prev => [...prev, newEntry]);

            // Automatically select this new test in the current list
            setSelectedTests(prev => {
                const newTests = [...prev];
                // Find first empty row or the last row if it's empty
                const emptyIndex = newTests.findIndex(t => !t.testId);

                const selection = {
                    testId: newEntry.id,
                    testName: newEntry.test_name,
                    groupName: newEntry.category || 'N/A',
                    amount: newEntry.test_cost || 0
                };

                if (emptyIndex !== -1) {
                    newTests[emptyIndex] = selection;
                } else {
                    newTests.push(selection);
                }
                return newTests;
            });

            // Success!
            setNewTestData({ testName: '', groupName: '', amount: 0 });
            setShowNewTestModal(false);
        } catch (err: any) {
            console.error('Error creating test:', err);
            setError('Failed to create new test catalog entry.');
        } finally {
            setCreatingTest(false);
        }
    };

    const addTest = () => {
        setSelectedTests([...selectedTests, { testId: '', testName: '', groupName: '', amount: 0 }]);
    };

    const removeTest = (index: number) => {
        if (selectedTests.length === 1) return;
        const newTests = [...selectedTests];
        newTests.splice(index, 1);
        setSelectedTests(newTests);
    };

    const handleTestChange = (index: number, testId: string) => {
        const test = labCatalog.find(t => t.id === testId);
        if (!test) return;

        const newTests = [...selectedTests];
        newTests[index] = {
            testId: test.id,
            testName: test.test_name,
            groupName: test.category || 'N/A',
            amount: test.test_cost || 0
        };
        setSelectedTests(newTests);
    };

    const handleManualAmountChange = (index: number, amount: number) => {
        const newTests = [...selectedTests];
        newTests[index].amount = amount;
        setSelectedTests(newTests);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientDetails.id) {
            setError('Please search and select a patient first.');
            return;
        }
        if (!orderingDoctorId) {
            setError('Please select an ordering doctor.');
            return;
        }
        if (selectedTests.some(t => !t.testId)) {
            setError('Please select all tests or remove empty rows.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const promises = selectedTests.map(test =>
                createLabTestOrder({
                    patient_id: patientDetails.id,
                    ordering_doctor_id: orderingDoctorId,
                    test_catalog_id: test.testId,
                    clinical_indication: clinicalIndication,
                    urgency: urgency,
                    status: 'ordered',
                    staff_id: staffId
                })
            );

            await Promise.all(promises);
            setSuccess(true);
            setTimeout(() => router.push('/lab-xray'), 2000);
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to create orders.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-12 w-12 text-teal-600 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Preparing Lab Suite...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link href="/lab-xray" className="group flex items-center gap-2 text-slate-500 hover:text-teal-600 transition-colors">
                        <div className="p-2 rounded-lg bg-white border border-slate-200 group-hover:border-teal-200 transition-all">
                            <ChevronLeft size={20} />
                        </div>
                        <span className="font-bold tracking-tight">Return to Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
                            <Clock size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Patient and Details (1/3) */}
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                            <div className="p-6 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">Patient Information</h2>
                                        <p className="text-teal-100 text-xs">Register diagnostic clinical order</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* UHID Search */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">UHID / Patient ID</label>
                                    <div className="relative group">
                                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchingPatient ? 'text-teal-500' : 'text-slate-400 group-focus-within:text-teal-500'}`} size={18} />
                                        <input
                                            type="text"
                                            placeholder="Enter UHID..."
                                            value={uhidSearch}
                                            onChange={(e) => setUhidSearch(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleUHIDSearch()}
                                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl transition-all outline-none text-sm font-semibold text-slate-700"
                                        />
                                        <button
                                            onClick={handleUHIDSearch}
                                            disabled={searchingPatient}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-teal-600 hover:bg-teal-50 rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            {searchingPatient ? <Loader2 className="animate-spin h-5 w-5" /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Auto-filled Fields */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UHID</label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-teal-700">
                                            {patientDetails.uhid || '--'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700">
                                            {patientDetails.name || '--'}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                                            <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 capitalize">
                                                {patientDetails.gender || '--'}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age</label>
                                            <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700">
                                                {patientDetails.age ? `${patientDetails.age} Years` : '--'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700">
                                            {patientDetails.contactNo || '--'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email ID</label>
                                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 truncate">
                                            {patientDetails.emailId || '--'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl flex gap-3">
                            <AlertCircle size={20} className="text-amber-500 shrink-0" />
                            <div>
                                <h4 className="text-xs font-bold text-amber-900 mb-1">Billing Note</h4>
                                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">Once generated, this bill will create a pending transaction in the patient's account. This cannot be undone easily.</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Test Selection & Billing (2/3) */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600">
                                        <Beaker size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">Lab Test Selection</h2>
                                        <p className="text-slate-400 text-xs font-medium">Add required diagnostics for clinical analysis</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={addTest}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-100"
                                    >
                                        <Plus size={18} />
                                        Add Test
                                    </button>
                                    <button
                                        onClick={() => setShowNewTestModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 border-2 border-teal-600 text-teal-600 rounded-xl text-sm font-bold hover:bg-teal-50 transition-all"
                                    >
                                        <Beaker size={18} />
                                        New Catalog Entry
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {selectedTests.map((test, index) => (
                                            <motion.div
                                                key={`test-${index}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group"
                                            >
                                                {selectedTests.length > 1 && (
                                                    <button
                                                        onClick={() => removeTest(index)}
                                                        className="absolute -top-2 -right-2 p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}

                                                <div className="md:col-span-5 space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Test Name</label>
                                                    <select
                                                        value={test.testId}
                                                        onChange={(e) => handleTestChange(index, e.target.value)}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Select Test...</option>
                                                        {labCatalog.map(item => (
                                                            <option key={item.id} value={item.id}>{item.test_name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="md:col-span-4 space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Group Name</label>
                                                    <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500">
                                                        {test.groupName || 'N/A'}
                                                    </div>
                                                </div>

                                                <div className="md:col-span-3 space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Amount (₹)</label>
                                                    <div className="relative">
                                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                        <input
                                                            type="number"
                                                            value={test.amount}
                                                            onChange={(e) => handleManualAmountChange(index, parseFloat(e.target.value) || 0)}
                                                            className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-teal-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ordering Doctor</label>
                                            <select
                                                value={orderingDoctorId}
                                                onChange={(e) => setOrderingDoctorId(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                            >
                                                <option value="">Select Doctor...</option>
                                                {doctors.map(d => (
                                                    <option key={d.id} value={d.id}>Dr. {d.user?.name || d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <StaffSelect
                                                value={staffId}
                                                onChange={setStaffId}
                                                label="Ordered By (Staff)"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Clinical Indication</label>
                                            <textarea
                                                rows={3}
                                                value={clinicalIndication}
                                                onChange={(e) => setClinicalIndication(e.target.value)}
                                                placeholder="Reason for test..."
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Documentation</label>
                                            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 transition-all cursor-pointer group">
                                                <div className="p-3 bg-white rounded-2xl border border-slate-200 group-hover:border-teal-200 text-slate-400 group-hover:text-teal-600 transition-all">
                                                    <Upload size={24} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-slate-700">Upload Clinical File</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">PDF, PNG or JPG max 10MB</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Total Billing Footer */}
                            <div className="p-6 bg-slate-900 rounded-b-3xl mt-6">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Amount</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-slate-400 text-sm font-bold">₹</span>
                                                <span className="text-4xl font-black text-white">{totalAmount.toLocaleString()}</span>
                                                <span className="text-teal-400 text-xs font-black ml-2 uppercase">Gst Incl.</span>
                                            </div>
                                        </div>
                                        <div className="h-10 w-[1px] bg-slate-700 hidden md:block"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tests Selected</span>
                                            <span className="text-2xl font-black text-white">{selectedTests.filter(t => t.testId).length} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-1">Items</span></span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 w-full md:w-auto">
                                        <button
                                            onClick={() => router.push('/lab-xray')}
                                            className="flex-1 md:flex-none px-8 py-4 bg-slate-800 text-white rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all border border-slate-700"
                                        >
                                            Draft
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting || success}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-teal-500 text-white rounded-2xl font-black text-lg hover:bg-teal-400 transition-all shadow-xl shadow-teal-900/40 disabled:opacity-50 min-w-[220px]"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="animate-spin h-5 w-5" />
                                                    Processing...
                                                </>
                                            ) : success ? (
                                                <>
                                                    <CheckCircle2 size={24} />
                                                    Success
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard size={24} />
                                                    Generate Bill
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div >

                {/* Status Messages */}
                <AnimatePresence>
                    {
                        error && (
                            <motion.div
                                key="error-toast"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="fixed bottom-8 right-8 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl shadow-xl flex items-center gap-3 z-50 max-w-md"
                            >
                                <div className="p-2 bg-red-100 rounded-xl text-red-600">
                                    <AlertCircle size={20} />
                                </div>
                                <p className="text-sm font-bold">{error}</p>
                                <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-md transition-colors">
                                    <X size={16} />
                                </button>
                            </motion.div>
                        )
                    }

                    {
                        success && (
                            <motion.div
                                key="success-modal"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                            >
                                <div className="bg-white rounded-[40px] p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
                                    <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                        <CheckCircle2 size={48} className="text-teal-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Orders Generated!</h3>
                                        <p className="text-slate-500 font-medium mt-2">Laboratory clinical request initiated and billing data transmitted.</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                            <span>Invoice Ref</span>
                                            <span className="text-slate-900">LAB-GEN-{Math.floor(Math.random() * 100000)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                            <span>Total Bill</span>
                                            <span className="text-teal-600">₹{totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => router.push('/lab-xray')} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
                                            Dashboard
                                        </button>
                                        <button className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all">
                                            <Printer size={20} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    }

                    {
                        showNewTestModal && (
                            <motion.div
                                key="new-test-modal-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-black text-slate-900">Add New Test Catalog</h3>
                                        <button onClick={() => setShowNewTestModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Test Name</label>
                                            <input
                                                type="text"
                                                value={newTestData.testName}
                                                onChange={(e) => setNewTestData({ ...newTestData, testName: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                                placeholder="e.g., Blood Sugar"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Group Name</label>
                                            <input
                                                type="text"
                                                value={newTestData.groupName}
                                                onChange={(e) => setNewTestData({ ...newTestData, groupName: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                                placeholder="e.g., Biochemistry"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Base Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={newTestData.amount}
                                                onChange={(e) => setNewTestData({ ...newTestData, amount: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowNewTestModal(false)}
                                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateNewTest}
                                            disabled={creatingTest}
                                            className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {creatingTest ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={18} />}
                                            Save Catalog
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >
            </div >
        </div >
    );
}
