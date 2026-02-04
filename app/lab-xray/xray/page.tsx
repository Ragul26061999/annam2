'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Radiation,
    ChevronLeft,
    Search,
    User,
    CreditCard,
    Plus,
    Trash2,
    FileText,
    Upload,
    Clock,
    CheckCircle2,
    AlertCircle,
    Hash,
    Stethoscope,
    ChevronDown,
    X,
    Printer,
    Loader2,
    Zap,
    Activity,
    Monitor,
    Save,
    Beaker
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';
import { SearchableSelect } from '../../../src/components/ui/SearchableSelect';
import {
    getRadiologyTestCatalog,
    createRadiologyTestOrder,
    createRadiologyTestCatalogEntry,
    getDiagnosticGroups,
    getDiagnosticGroupItems,
    RadiologyTestCatalog
} from '../../../src/lib/labXrayService';
import { createRadiologyBill, type PaymentRecord } from '../../../src/lib/universalPaymentService';
import StaffSelect from '../../../src/components/StaffSelect';
import UniversalPaymentModal from '../../../src/components/UniversalPaymentModal';
import { getAllDoctorsSimple } from '../../../src/lib/doctorService';
import { motion, AnimatePresence } from 'framer-motion';

interface TestSelection {
    testId: string;
    testName: string;
    groupName: string; // Modality for X-ray
    bodyPart: string;
    amount: number;
}

export default function XrayOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ensureTrailingEmptyRow = useCallback((tests: TestSelection[]) => {
        const hasEmpty = tests.some(t => !t.testId);
        if (hasEmpty) return tests;
        return [...tests, { testId: '', testName: '', groupName: '', bodyPart: '', amount: 0 }];
    }, []);

    // Master Data
    const [radCatalog, setRadCatalog] = useState<RadiologyTestCatalog[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);

    // Group Selection
    const [useGroup, setUseGroup] = useState(false);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [groupLoading, setGroupLoading] = useState(false);

    // Search States
    const [uhidSearch, setUhidSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchingPatient, setSearchingPatient] = useState(false);

    // New Test State
    const [showNewTestModal, setShowNewTestModal] = useState(false);
    const [newTestData, setNewTestData] = useState({
        testName: '',
        groupName: '', // Modality
        amount: 0
    });
    const [creatingTest, setCreatingTest] = useState(false);

    // Patient Details
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
        { testId: '', testName: '', groupName: '', bodyPart: '', amount: 0 }
    ]);
    const [orderingDoctorId, setOrderingDoctorId] = useState('');
    const [clinicalIndication, setClinicalIndication] = useState('');
    const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'stat' | 'emergency'>('routine');
    const [totalAmount, setTotalAmount] = useState(0);
    const [staffId, setStaffId] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [generatedBill, setGeneratedBill] = useState<PaymentRecord | null>(null);
    const [createdOrders, setCreatedOrders] = useState<any[]>([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!useGroup) return;
        (async () => {
            setGroupLoading(true);
            try {
                const groups = await getDiagnosticGroups({ is_active: true });
                const radGroups = (groups || []).filter((g: any) => {
                    const serviceTypes: string[] = Array.isArray(g.service_types) ? g.service_types : [];
                    if (serviceTypes.length === 0) {
                        return String(g.category || '').toLowerCase() === 'radiology' || String(g.category || '').toLowerCase() === 'mixed';
                    }
                    return serviceTypes.includes('radiology') || serviceTypes.includes('xray');
                });
                setAvailableGroups(radGroups);
            } catch {
                setAvailableGroups([]);
            } finally {
                setGroupLoading(false);
            }
        })();
    }, [useGroup]);

    useEffect(() => {
        const total = selectedTests.reduce((sum, test) => sum + test.amount, 0);
        setTotalAmount(total);
    }, [selectedTests]);

    // Real-time search with debouncing
    const searchPatients = useCallback(async (searchTerm: string) => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        setSearchingPatient(true);
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .or(`patient_id.ilike.%${searchTerm.trim()}%,name.ilike.%${searchTerm.trim()}%,phone.ilike.%${searchTerm.trim()}%`)
                .limit(10)
                .order('name');

            if (error) throw error;
            setSearchResults(data || []);
            setShowSearchDropdown(true);
        } catch (err) {
            console.error('Search error:', err);
            setSearchResults([]);
        } finally {
            setSearchingPatient(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            searchPatients(uhidSearch);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [uhidSearch, searchPatients]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.search-container')) {
                setShowSearchDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [catalog, doctorsList] = await Promise.all([
                getRadiologyTestCatalog(),
                getAllDoctorsSimple()
            ]);
            setRadCatalog(catalog || []);
            setDoctors(doctorsList || []);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load radiology catalog.');
        } finally {
            setLoading(false);
        }
    };

    const handlePatientSelect = (patient: any) => {
        // Calculate age
        let age = '';
        if (patient.date_of_birth) {
            const birthDate = new Date(patient.date_of_birth);
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                years--;
            }
            age = years.toString();
        }

        setPatientDetails({
            id: patient.id,
            uhid: patient.patient_id,
            name: patient.name,
            gender: patient.gender || '',
            age: age,
            contactNo: patient.phone || '',
            emailId: patient.email || ''
        });

        setUhidSearch(patient.name); // Show selected patient name
        setShowSearchDropdown(false);
        setSearchResults([]);
        setError(null);
    };

    const handleUHIDSearch = async () => {
        if (!uhidSearch.trim()) return;

        setSearchingPatient(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .or(`patient_id.ilike.%${uhidSearch.trim()}%,name.ilike.%${uhidSearch.trim()}%`)
                .limit(1);

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                setError('Patient not found with this UHID or name.');
                return;
            }

            const patient = data[0];
            handlePatientSelect(patient);
        } catch (err: any) {
            console.error('Patient search error:', err);
            setError('An error occurred while searching for the patient.');
        } finally {
            setSearchingPatient(false);
        }
    };

    const handleCreateNewTest = async () => {
        if (!newTestData.testName || !newTestData.groupName) {
            setError('Test name and modality are required.');
            return;
        }

        try {
            setCreatingTest(true);
            const newEntry = await createRadiologyTestCatalogEntry({
                test_name: newTestData.testName,
                modality: newTestData.groupName,
                test_cost: newTestData.amount
            });

            // Update master data
            setRadCatalog(prev => [...prev, newEntry]);

            // Success!
            setNewTestData({ testName: '', groupName: '', amount: 0 });
            setShowNewTestModal(false);
        } catch (err: any) {
            console.error('Error creating test:', err);
            setError('Failed to create new radiology catalog entry.');
        } finally {
            setCreatingTest(false);
        }
    };

    const addTest = () => {
        setSelectedTests([...selectedTests, { testId: '', testName: '', groupName: '', bodyPart: '', amount: 0 }]);
    };

    const removeTest = (index: number) => {
        if (selectedTests.length === 1) return;
        const newTests = [...selectedTests];
        newTests.splice(index, 1);
        setSelectedTests(ensureTrailingEmptyRow(newTests));
    };

    const applyGroupToSelection = async (groupId: string) => {
        if (!groupId) return;
        setGroupLoading(true);
        setError(null);
        try {
            const groupItems = await getDiagnosticGroupItems(groupId);
            const radItems = (groupItems || []).filter((it: any) => {
                const t = String(it.service_type);
                return t === 'radiology' || t === 'xray';
            });

            const selections: TestSelection[] = radItems
                .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((it: any) => {
                    const test = radCatalog.find(t => t.id === it.catalog_id);
                    return {
                        testId: it.catalog_id,
                        testName: test?.test_name || '',
                        groupName: test?.modality || 'X-Ray',
                        bodyPart: test?.body_part || '',
                        amount: test?.test_cost || 0
                    };
                })
                .filter(s => Boolean(s.testId));

            setSelectedTests(ensureTrailingEmptyRow(selections.length ? selections : [{ testId: '', testName: '', groupName: '', bodyPart: '', amount: 0 }]));
        } catch (e: any) {
            setError(e?.message || 'Failed to load group items');
        } finally {
            setGroupLoading(false);
        }
    };

    const clearGroupSelection = () => {
        setSelectedGroupId('');
        setUseGroup(false);
        setSelectedTests([{ testId: '', testName: '', groupName: '', bodyPart: '', amount: 0 }]);
    };

    const handleTestChange = (index: number, testId: string) => {
        const test = radCatalog.find(t => t.id === testId);
        if (!test) return;

        const newTests = [...selectedTests];
        newTests[index] = {
            testId: test.id,
            testName: test.test_name,
            groupName: test.modality || 'X-Ray',
            bodyPart: test.body_part || '',
            amount: test.test_cost || 0
        };
        setSelectedTests(ensureTrailingEmptyRow(newTests));
    };

    const handleManualAmountChange = (index: number, amount: number) => {
        const newTests = [...selectedTests];
        newTests[index].amount = amount;
        setSelectedTests(ensureTrailingEmptyRow(newTests));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientDetails.id) {
            setError('Please search and select a patient first.');
            return;
        }
        // Remove required validation for ordering doctor and staff - make them optional
        const filledTests = selectedTests.filter(t => t.testId);
        if (filledTests.length === 0) {
            setError('Please add at least one radiology scan.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // Create radiology test orders
            const orderPromises = filledTests.map(test =>
                createRadiologyTestOrder({
                    patient_id: patientDetails.id,
                    ordering_doctor_id: orderingDoctorId || undefined, // Make optional
                    test_catalog_id: test.testId,
                    clinical_indication: clinicalIndication,
                    urgency: urgency,
                    status: 'ordered',
                    body_part: test.bodyPart,
                    staff_id: staffId || undefined // Make optional
                })
            );

            const orders = await Promise.all(orderPromises);
            setCreatedOrders(orders);

            // Create bill for the radiology tests
            const bill = await createRadiologyBill(patientDetails.id, orders, staffId);
            setGeneratedBill(bill);

            // Show payment modal
            setShowPaymentModal(true);
            setSuccess(true);
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to create radiology orders.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePaymentSuccess = () => {
        // Reset form and redirect
        setTimeout(() => {
            router.push('/lab-xray');
        }, 1000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-12 w-12 text-cyan-600 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Calibrating Radiology Suite...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link href="/lab-xray" className="group flex items-center gap-2 text-slate-500 hover:text-cyan-600 transition-colors">
                        <div className="p-2 rounded-lg bg-white border border-slate-200 group-hover:border-cyan-200 transition-all">
                            <ChevronLeft size={20} />
                        </div>
                        <span className="font-bold tracking-tight text-sm uppercase">Diagnostics Central</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-xl border border-cyan-100 shadow-sm">
                            <Clock size={16} />
                            <span className="text-xs font-black uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">UHID / Patient Name</label>
                                    <div className="relative group search-container">
                                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchingPatient ? 'text-teal-500' : 'text-slate-400 group-focus-within:text-teal-500'}`} size={18} />
                                        <input
                                            type="text"
                                            placeholder="Enter UHID or Patient Name..."
                                            value={uhidSearch}
                                            onChange={(e) => setUhidSearch(e.target.value)}
                                            onFocus={() => setShowSearchDropdown(searchResults.length > 0)}
                                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl transition-all outline-none text-sm font-semibold text-slate-700"
                                        />
                                        {uhidSearch && (
                                            <button
                                                onClick={() => {
                                                    setUhidSearch('');
                                                    setSearchResults([]);
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                        
                                        {/* Search Results Dropdown */}
                                        {showSearchDropdown && searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg max-h-80 overflow-y-auto z-50">
                                                {searchResults.map((patient) => (
                                                    <button
                                                        key={patient.id}
                                                        onClick={() => handlePatientSelect(patient)}
                                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                                                    >
                                                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                                            <User size={16} className="text-teal-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-slate-900 truncate">
                                                                {patient.name}
                                                            </div>
                                                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                                                    {patient.patient_id}
                                                                </span>
                                                                <span>{patient.gender}</span>
                                                                {patient.phone && <span>• {patient.phone}</span>}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
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
                                        <h2 className="text-lg font-bold text-slate-900">X-Ray Test Selection</h2>
                                        <p className="text-slate-400 text-xs font-medium">Add required diagnostics for clinical analysis</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
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
                                {/* Group selector (optional) */}
                                <div className="mb-5 p-4 bg-white border border-slate-200 rounded-2xl">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                            <input
                                                type="checkbox"
                                                checked={useGroup}
                                                onChange={(e) => {
                                                    const next = e.target.checked;
                                                    setUseGroup(next);
                                                    if (!next) {
                                                        setSelectedGroupId('');
                                                    }
                                                }}
                                            />
                                            Use Group
                                        </label>

                                        {useGroup && (
                                            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                                <select
                                                    value={selectedGroupId}
                                                    onChange={async (e) => {
                                                        const id = e.target.value;
                                                        setSelectedGroupId(id);
                                                        await applyGroupToSelection(id);
                                                    }}
                                                    className="w-full md:w-80 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                                                >
                                                    <option value="">Select Group...</option>
                                                    {availableGroups.map((g: any) => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={clearGroupSelection}
                                                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-700 hover:bg-slate-200 transition-all"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {selectedTests.map((test, index) => (
                                        <motion.div
                                            key={`rad-test-${index}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="relative grid grid-cols-1 md:grid-cols-12 gap-5 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:border-cyan-200 transition-all group shadow-sm"
                                        >
                                            <div className="md:col-span-4 space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Procedure Name</label>
                                                <SearchableSelect
                                                    value={test.testId}
                                                    onChange={(value: string) => handleTestChange(index, value)}
                                                    options={radCatalog.map(item => ({
                                                        value: item.id,
                                                        label: item.test_name,
                                                        group: item.modality,
                                                        subLabel: `₹${item.test_cost}`
                                                    }))}
                                                    placeholder="CHOOSE SCAN..."
                                                />
                                            </div>

                                            <div className="md:col-span-3 space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Modality</label>
                                                <div className="px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest text-center shadow-inner">
                                                    {test.groupName || 'IMAGE'}
                                                </div>
                                            </div>

                                            <div className="md:col-span-3 space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cost / Amount (₹)</label>
                                                <div className="relative">
                                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                    <input
                                                        type="number"
                                                        value={test.amount}
                                                        onChange={(e) => handleManualAmountChange(index, parseFloat(e.target.value) || 0)}
                                                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-black text-cyan-700 focus:ring-2 focus:ring-cyan-500 outline-none tracking-tighter"
                                                    />
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 flex justify-end items-end">
                                                <button
                                                    onClick={addTest}
                                                    className="flex items-center gap-2 px-3 py-3.5 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-100"
                                                    title="Add Procedure"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            {/* Region Input - Extra field for Xray */}
                                            <div className="md:col-span-12 space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Specific Region / View Details</label>
                                                <input
                                                    type="text"
                                                    placeholder="E.g. AP & LATERAL, OBLIQUE VIEW, CONTRAST REQUIRED"
                                                    value={test.bodyPart}
                                                    onChange={(e) => {
                                                        const newTests = [...selectedTests];
                                                        newTests[index].bodyPart = e.target.value;
                                                        setSelectedTests(newTests);
                                                    }}
                                                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 placeholder:text-slate-300 outline-none focus:border-cyan-300 transition-all"
                                                />
                                            </div>

                                            {selectedTests.length > 1 && (
                                                <button
                                                    onClick={() => removeTest(index)}
                                                    className="absolute -top-3 -right-3 p-2 bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-100 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Secondary Form Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referring Physician (Optional)</label>
                                            <select
                                                value={orderingDoctorId}
                                                onChange={(e) => setOrderingDoctorId(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                                            >
                                                <option value="">SELECT INTERNAL DOCTOR...</option>
                                                {doctors.map(d => (
                                                    <option key={d.id} value={d.id}>Dr. {d.user?.name || d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <StaffSelect
                                                value={staffId}
                                                onChange={setStaffId}
                                                label="Ordered By (Staff) (Optional)"
                                                required={false}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Instruction</label>
                                            <textarea
                                                rows={3}
                                                value={clinicalIndication}
                                                onChange={(e) => setClinicalIndication(e.target.value)}
                                                placeholder="INDICATIONS FOR SCAN..."
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Radiation Safety / Consents</label>
                                            <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 bg-slate-50 hover:bg-cyan-50 hover:border-cyan-200 transition-all cursor-pointer group">
                                                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-slate-400 group-hover:text-cyan-500 group-hover:border-cyan-200 shadow-sm transition-all animate-none group-hover:animate-bounce">
                                                    <Upload size={26} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">Attach Clinical Report</p>
                                                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">PDF, DICOM OR IMG MAX 25MB</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Billing Action Section */}
                            <div className="p-7 bg-slate-900 border-t border-slate-800 rounded-b-[2rem]">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="flex items-center gap-10">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Total Estimated Bill</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-cyan-500 text-xl font-black">₹</span>
                                                <span className="text-5xl font-black text-white tracking-tighter">{totalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col border-l border-slate-800 pl-10">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Priority Scan</span>
                                            <div className="flex gap-2">
                                                {['routine', 'stat'].map(level => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setUrgency(level as any)}
                                                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${urgency === level ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-900/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button
                                            onClick={() => router.push('/lab-xray')}
                                            className="flex-1 md:flex-none px-4 py-2 bg-slate-800 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest hover:text-white transition-all border border-slate-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting || success}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-cyan-500 text-white rounded-xl font-black text-xs hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-900/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="animate-spin h-3 w-3" />
                                                    <span className="uppercase tracking-widest text-xs">Transmitting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Zap size={12} />
                                                    <span className="uppercase tracking-widest text-xs">Generate Bill</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Floating Notifications */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            key="error-toast"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed bottom-10 left-1/2 -translate-x-1/2 p-5 bg-white border border-red-100 rounded-[2rem] shadow-2xl flex items-center gap-4 z-[100] max-w-md w-full"
                        >
                            <div className="p-3 bg-red-100 rounded-2xl text-red-600 shadow-sm">
                                <AlertCircle size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">System Error</p>
                                <p className="text-xs text-slate-500 font-bold leading-tight">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="p-2 text-slate-300 hover:text-slate-500">
                                <X size={20} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Success Modal Overlay */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        key="success-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-6"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center space-y-8 shadow-2xl border border-white/20"
                        >
                            <div className="w-28 h-28 bg-cyan-100 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner relative overflow-hidden">
                                <CheckCircle2 size={56} className="text-cyan-600 relative z-10" />
                                <div className="absolute inset-x-0 bottom-0 h-2 bg-cyan-200"></div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Order Locked!</h3>
                                <p className="text-slate-500 font-bold text-sm tracking-wide">Procedure request generated and billing initiated for {patientDetails.name}.</p>
                            </div>

                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4 shadow-inner">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>BILL ID</span>
                                    <span className="text-slate-900 text-xs">{generatedBill?.bill_id || 'PENDING'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Charged</span>
                                    <span className="text-2xl font-black text-cyan-600 tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => router.push('/lab-xray')}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-[900] text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Confirm & Close
                                </button>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => window.print()}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Print Slip
                                    </button>
                                    <button className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                                        Send SMS
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Test Catalog Modal */}
            <AnimatePresence>
                {showNewTestModal && (
                    <motion.div
                        key="new-radiology-test-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[210] p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add New Radiology Catalog</h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Register new procedure type</p>
                                </div>
                                <button onClick={() => setShowNewTestModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Procedure Name</label>
                                    <input
                                        type="text"
                                        value={newTestData.testName}
                                        onChange={(e) => setNewTestData({ ...newTestData, testName: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none"
                                        placeholder="e.g., Chest X-Ray Lateral"
                                    />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modality (CR, DR, CT, etc.)</label>
                                    <input
                                        type="text"
                                        value={newTestData.groupName}
                                        onChange={(e) => setNewTestData({ ...newTestData, groupName: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none"
                                        placeholder="e.g., CR"
                                    />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Scan Cost (₹)</label>
                                    <input
                                        type="number"
                                        value={newTestData.amount}
                                        onChange={(e) => setNewTestData({ ...newTestData, amount: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowNewTestModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateNewTest}
                                    disabled={creatingTest}
                                    className="flex-1 py-4 bg-cyan-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-cyan-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-cyan-100"
                                >
                                    {creatingTest ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={18} />}
                                    Save Scan
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Payment Modal */}
            {generatedBill && (
                <UniversalPaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    bill={generatedBill}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
