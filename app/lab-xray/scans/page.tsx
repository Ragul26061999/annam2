'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Hash,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';
import { SearchableSelect } from '../../../src/components/ui/SearchableSelect';
import StaffSelect from '../../../src/components/StaffSelect';
import UniversalPaymentModal from '../../../src/components/UniversalPaymentModal';
import ScanDocumentUpload from '../../../components/ScanDocumentUpload';
import { getAllDoctorsSimple } from '../../../src/lib/doctorService';
import {
  createScanOrder,
  createLegacyScanTestCatalogEntry,
  getLegacyScanTestCatalog,
  type ScanTestCatalogLegacy,
} from '../../../src/lib/labXrayService';
import { createScanBill, type PaymentRecord } from '../../../src/lib/universalPaymentService';

interface ScanSelection {
  catalogId: string;
  scanName: string;
  category: string;
  bodyPart: string;
  amount: number;
}

interface PatientSearchResult {
  id: string;
  patient_id: string;
  name: string;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
}

export default function ScanOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureTrailingEmptyRow = useCallback((rows: ScanSelection[]) => {
    const hasEmpty = rows.some(r => !r.catalogId);
    if (hasEmpty) return rows;
    return [...rows, { catalogId: '', scanName: '', category: '', bodyPart: '', amount: 0 }];
  }, []);

  const [scanCatalog, setScanCatalog] = useState<ScanTestCatalogLegacy[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [searchingPatient, setSearchingPatient] = useState(false);

  const [patientDetails, setPatientDetails] = useState({
    id: '',
    uhid: '',
    name: '',
    gender: '',
    age: '',
    phone: '',
  });

  const [orderingDoctorId, setOrderingDoctorId] = useState('');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'stat' | 'emergency'>('routine');
  const [staffId, setStaffId] = useState('');

  const [selectedScans, setSelectedScans] = useState<ScanSelection[]>([
    { catalogId: '', scanName: '', category: '', bodyPart: '', amount: 0 },
  ]);

  const totalAmount = useMemo(() => {
    return selectedScans.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [selectedScans]);

  const [showNewScanModal, setShowNewScanModal] = useState(false);
  const [creatingScan, setCreatingScan] = useState(false);
  const [newScanData, setNewScanData] = useState({
    scanName: '',
    category: 'Scans',
    bodyPart: '',
    amount: 0,
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<PaymentRecord | null>(null);
  const [createdOrders, setCreatedOrders] = useState<any[]>([]);

  const [uploadTargetOrder, setUploadTargetOrder] = useState<any | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [catalog, docs] = await Promise.all([getLegacyScanTestCatalog(), getAllDoctorsSimple()]);
        setScanCatalog((catalog || []).filter(c => String(c.category || '').toLowerCase() !== 'other'));
        setDoctors(docs || []);
      } catch (e) {
        console.error(e);
        setError('Failed to load scan catalog');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const searchPatients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPatientResults([]);
      setShowPatientDropdown(false);
      return;
    }

    setSearchingPatient(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_id, name, phone, gender, date_of_birth')
        .or(`patient_id.ilike.%${query.trim()}%,name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%`)
        .limit(10)
        .order('name');

      if (error) throw error;
      setPatientResults((data || []) as any);
      setShowPatientDropdown(true);
    } catch (e) {
      console.error('Patient search error:', e);
      setPatientResults([]);
    } finally {
      setSearchingPatient(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      searchPatients(patientSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch, searchPatients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.scan-patient-search')) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPatient = (p: PatientSearchResult) => {
    let age = '';
    if (p.date_of_birth) {
      const birthDate = new Date(p.date_of_birth);
      const today = new Date();
      let years = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) years--;
      age = String(years);
    }

    setPatientDetails({
      id: p.id,
      uhid: p.patient_id,
      name: p.name,
      gender: p.gender || '',
      age,
      phone: p.phone || '',
    });
    setPatientSearch(p.name);
    setShowPatientDropdown(false);
    setPatientResults([]);
    setError(null);
  };

  const addRow = () => {
    setSelectedScans([...selectedScans, { catalogId: '', scanName: '', category: '', bodyPart: '', amount: 0 }]);
  };

  const removeRow = (index: number) => {
    if (selectedScans.length === 1) return;
    const next = [...selectedScans];
    next.splice(index, 1);
    setSelectedScans(ensureTrailingEmptyRow(next));
  };

  const handleScanChange = (index: number, catalogId: string) => {
    const item = scanCatalog.find(c => c.id === catalogId);
    if (!item) return;

    const next = [...selectedScans];
    next[index] = {
      catalogId: item.id,
      scanName: item.scan_name,
      category: item.category || 'Scans/Other',
      bodyPart: item.body_part || '',
      amount: Number(item.test_cost || 0),
    };
    setSelectedScans(ensureTrailingEmptyRow(next));
  };

  const handleManualAmountChange = (index: number, amount: number) => {
    const next = [...selectedScans];
    next[index].amount = amount;
    setSelectedScans(ensureTrailingEmptyRow(next));
  };

  const getOrCreateEncounterId = async (patientId: string): Promise<string> => {
    const { data: encounter, error: encErr } = await supabase
      .from('encounter')
      .select('id')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!encErr && encounter?.id) return encounter.id;

    const { data: created, error: createErr } = await supabase
      .from('encounter')
      .insert([{ patient_id: patientId, start_at: new Date().toISOString() }])
      .select('id')
      .single();

    if (createErr || !created?.id) {
      throw new Error('Failed to resolve encounter for patient');
    }

    return created.id;
  };

  const handleCreateNewScanCatalog = async () => {
    if (!newScanData.scanName.trim()) {
      setError('Scan name is required');
      return;
    }

    try {
      setCreatingScan(true);
      const entry = await createLegacyScanTestCatalogEntry({
        scan_name: newScanData.scanName,
        category: 'Scans',
        body_part: newScanData.bodyPart || null,
        test_cost: Number(newScanData.amount || 0),
      } as any);

      setScanCatalog(prev => [...prev, entry]);

      setSelectedScans(prev => {
        const next = [...prev];
        const emptyIndex = next.findIndex(r => !r.catalogId);
        const row: ScanSelection = {
          catalogId: entry.id,
          scanName: entry.scan_name,
          category: entry.category,
          bodyPart: entry.body_part || '',
          amount: Number(entry.test_cost || 0),
        };

        if (emptyIndex !== -1) next[emptyIndex] = row;
        else next.push(row);

        return ensureTrailingEmptyRow(next);
      });

      setNewScanData({ scanName: '', category: 'Scans', bodyPart: '', amount: 0 });
      setShowNewScanModal(false);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to create scan catalog entry');
    } finally {
      setCreatingScan(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientDetails.id) {
      setError('Please select a patient');
      return;
    }
    if (!orderingDoctorId) {
      setError('Please select a doctor');
      return;
    }
    if (!staffId) {
      setError('Please select staff');
      return;
    }
    const filledScans = selectedScans.filter(s => s.catalogId);
    if (filledScans.length === 0) {
      setError('Please add at least one scan');
      return;
    }
    if (!clinicalIndication.trim()) {
      setError('Clinical indication is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const encounterId = await getOrCreateEncounterId(patientDetails.id);

      const orders = await Promise.all(
        filledScans.map(s =>
          createScanOrder({
            encounter_id: encounterId,
            patient_id: patientDetails.id,
            ordering_doctor_id: orderingDoctorId,
            scan_type: s.category || 'Scans/Other',
            scan_name: s.scanName,
            body_part: s.bodyPart || undefined,
            urgency,
            clinical_indication: clinicalIndication,
            status: 'ordered',
            scan_test_catalog_id: s.catalogId,
            amount: Number(s.amount || 0),
          })
        )
      );

      setCreatedOrders(orders);

      const bill = await createScanBill(patientDetails.id, orders, staffId);
      setGeneratedBill(bill);
      setShowPaymentModal(true);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to create scan orders');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSuccess(true);
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setSuccess(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-orange-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Preparing Scan Suite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/lab-xray" className="group flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors">
            <div className="p-2 rounded-lg bg-white border border-slate-200 group-hover:border-orange-200 transition-all">
              <ChevronLeft size={20} />
            </div>
            <span className="font-bold tracking-tight">Return to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl border border-orange-100">
              <Clock size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-gradient-to-br from-orange-600 to-orange-700 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Scan / Other</h2>
                    <p className="text-orange-100 text-xs">Order + Upload workflow</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-2 scan-patient-search">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">UHID / Patient Name</label>
                  <div className="relative group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchingPatient ? 'text-orange-500' : 'text-slate-400 group-focus-within:text-orange-500'}`} size={18} />
                    <input
                      type="text"
                      placeholder="Enter UHID or Patient Name..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      onFocus={() => setShowPatientDropdown(patientResults.length > 0)}
                      className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl transition-all outline-none text-sm font-semibold text-slate-700"
                    />
                    {patientSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setPatientSearch('');
                          setPatientResults([]);
                          setShowPatientDropdown(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}

                    {showPatientDropdown && patientResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg max-h-80 overflow-y-auto z-50">
                        {patientResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selectPatient(p)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                          >
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <Activity size={16} className="text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-2">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{p.patient_id}</span>
                                {p.phone ? <span>• {p.phone}</span> : null}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UHID</label>
                    <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-orange-700">
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
                </div>

                <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl flex gap-3">
                  <AlertCircle size={20} className="text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 mb-1">Billing Note</h4>
                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                      Scan orders will create a pending bill. Uploading documents is optional per order.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Scan / Other Selection</h2>
                    <p className="text-slate-400 text-xs font-medium">EEG, ECG, and other scans with pricing</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewScanModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-orange-600 text-orange-600 rounded-xl text-sm font-bold hover:bg-orange-50 transition-all"
                  >
                    <Plus size={18} />
                    New Catalog Entry
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-2 text-red-700">
                    <AlertCircle size={18} />
                    <span className="font-semibold text-sm">{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {selectedScans.map((row, index) => (
                    <div
                      key={`scan-${index}`}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group"
                    >
                      {selectedScans.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="absolute -top-2 -right-2 p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <div className="md:col-span-5 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Scan Name</label>
                        <SearchableSelect
                          value={row.catalogId}
                          onChange={(value: string) => handleScanChange(index, value)}
                          options={scanCatalog.map(item => ({
                            value: item.id,
                            label: item.scan_name,
                            group: item.category,
                            subLabel: `₹${item.test_cost}`,
                          }))}
                          placeholder="Search & Select Scan..."
                        />
                      </div>

                      <div className="md:col-span-3 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Category</label>
                        <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500">
                          {row.category || 'N/A'}
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Amount (₹)</label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) => handleManualAmountChange(index, parseFloat(e.target.value) || 0)}
                            className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-orange-700 focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Body Part (Optional)</label>
                        <input
                          type="text"
                          value={row.bodyPart}
                          onChange={(e) => {
                            const next = [...selectedScans];
                            next[index].bodyPart = e.target.value;
                            setSelectedScans(ensureTrailingEmptyRow(next));
                          }}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                          placeholder="e.g., Chest"
                        />
                      </div>

                      <div className="md:col-span-12 flex justify-end">
                        <button
                          type="button"
                          onClick={addRow}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-all"
                        >
                          <Plus size={16} />
                          Add Item
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Doctor</label>
                    <select
                      value={orderingDoctorId}
                      onChange={(e) => setOrderingDoctorId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="">Select Doctor...</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>Dr. {d.user?.name || d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <StaffSelect value={staffId} onChange={setStaffId} label="Processed By (Staff)" required />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Clinical Indication</label>
                    <textarea
                      rows={3}
                      value={clinicalIndication}
                      onChange={(e) => setClinicalIndication(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                      placeholder="Reason for scan..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Urgency</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                {createdOrders.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-sm font-bold text-slate-900">Upload Documents (Optional)</div>
                      <div className="flex gap-2 flex-wrap">
                        {createdOrders.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                              setUploadTargetOrder(o);
                              setShowUploadModal(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold flex items-center gap-2"
                          >
                            <Upload size={16} />
                            {o.scan_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all cursor-pointer group"
                  onClick={() => {
                    if (!createdOrders.length) {
                      setError('Please generate the bill first to create the scan order, then upload files.');
                      return;
                    }
                    setUploadTargetOrder(createdOrders[0]);
                    setShowUploadModal(true);
                  }}
                >
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 text-slate-400 group-hover:text-orange-500 group-hover:border-orange-200 shadow-sm transition-all">
                    <Upload size={26} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">Upload Scan Documents</p>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">PDF / IMAGE / DICOM</p>
                  </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-3xl">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Amount</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-slate-400 text-sm font-bold">₹</span>
                          <span className="text-4xl font-black text-white">{totalAmount.toLocaleString()}</span>
                          <span className="text-orange-400 text-xs font-black ml-2 uppercase">Gst Incl.</span>
                        </div>
                      </div>
                      <div className="h-10 w-[1px] bg-slate-700 hidden md:block"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tests Selected</span>
                        <span className="text-2xl font-black text-white">{selectedScans.filter(s => s.catalogId).length} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-1">Items</span></span>
                      </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => router.push('/lab-xray')}
                        className="flex-1 md:flex-none px-8 py-4 bg-slate-800 text-white rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all border border-slate-700"
                      >
                        Draft
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || success}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-orange-500 text-white rounded-2xl font-black text-lg hover:bg-orange-400 transition-all shadow-xl shadow-orange-900/40 disabled:opacity-50 min-w-[220px]"
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
              </form>
            </div>
          </div>
        </div>
      </div>

      {generatedBill && (
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentClose}
          bill={generatedBill}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showNewScanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Add New Scan Catalog</h3>
              <button type="button" onClick={() => setShowNewScanModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Scan Name</label>
                <input
                  type="text"
                  value={newScanData.scanName}
                  onChange={(e) => setNewScanData({ ...newScanData, scanName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="e.g., ECG"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Body Part (Optional)</label>
                <input
                  type="text"
                  value={newScanData.bodyPart}
                  onChange={(e) => setNewScanData({ ...newScanData, bodyPart: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Amount (₹)</label>
                <input
                  type="number"
                  value={newScanData.amount}
                  onChange={(e) => setNewScanData({ ...newScanData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowNewScanModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewScanCatalog}
                disabled={creatingScan}
                className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingScan ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={18} />}
                Save Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && uploadTargetOrder && patientDetails.id && (
        <ScanDocumentUpload
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setUploadTargetOrder(null);
          }}
          scanOrder={{
            id: uploadTargetOrder.id,
            scan_type: uploadTargetOrder.scan_type,
            scan_name: uploadTargetOrder.scan_name,
            body_part: uploadTargetOrder.body_part || '',
            clinical_indication: uploadTargetOrder.clinical_indication,
          }}
          patientId={patientDetails.id}
          encounterId={uploadTargetOrder.encounter_id}
          onSuccess={() => {
            setShowUploadModal(false);
            setUploadTargetOrder(null);
          }}
        />
      )}
    </div>
  );
}
