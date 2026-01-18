'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  User,
  Phone,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Stethoscope
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';
import { createAppointment, type AppointmentData } from '../../../src/lib/appointmentService';
import StaffSelect from '../../../src/components/StaffSelect';

type PatientSearchRow = {
  id: string;
  patient_id: string;
  name: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  admission_type?: string | null;
  is_admitted?: boolean | null;
};

type DoctorRow = {
  id: string;
  user_id: string | null;
  specialization: string | null;
  consultation_fee: number | null;
  status: string | null;
  users?: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export default function OutpatientRevisitPage() {
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  const [activeStep, setActiveStep] = useState<'search' | 'visit'>('search');

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<PatientSearchRow[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchRow | null>(null);

  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);

  const [form, setForm] = useState({
    complaints: '',
    notes: '',

    height: '',
    weight: '',
    bmi: '',
    temperature: '',
    bpSystolic: '',
    bpDiastolic: '',
    pulse: '',
    spo2: '',
    respiratoryRate: '',
    randomBloodSugar: '',

    consultingDoctorId: '',
    consultingDoctorName: '',
    consultationFee: '0',

    staffId: ''
  });

  const bmi = useMemo(() => {
    const h = Number(form.height) / 100;
    const w = Number(form.weight);
    if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return '';
    return (w / (h * h)).toFixed(1);
  }, [form.height, form.weight]);

  useEffect(() => {
    setForm(prev => ({ ...prev, bmi }));
  }, [bmi]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const { data, error: doctorsError } = await supabase
          .from('doctors')
          .select('id, user_id, specialization, consultation_fee, status')
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('specialization', { ascending: true });

        if (doctorsError) throw doctorsError;

        const base = (data || []) as DoctorRow[];
        const userIds = base.map(d => d.user_id).filter(Boolean) as string[];

        if (userIds.length === 0) {
          setDoctors(base);
          return;
        }

        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds);

        if (usersError) {
          setDoctors(base);
          return;
        }

        const userById = new Map((users || []).map((u: any) => [u.id, u]));
        setDoctors(
          base.map(d => ({
            ...d,
            users: d.user_id ? (userById.get(d.user_id) as any) : undefined
          }))
        );
      } catch (e: any) {
        console.error('Error loading doctors:', e);
        setDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, []);

  const handleSearch = async () => {
    setSearchError(null);
    setResults([]);

    const q = query.trim();
    if (!q) {
      setSearchError('Enter UHID or patient name to search');
      return;
    }

    setSearching(true);
    try {
      const looksLikeUhid = /^AH\d{2}\d{2}-\d{4}$/i.test(q) || q.toUpperCase().startsWith('AH');
      const orFilter = looksLikeUhid
        ? `patient_id.ilike.%${q}%,name.ilike.%${q}%,phone.ilike.%${q}%`
        : `name.ilike.%${q}%,patient_id.ilike.%${q}%,phone.ilike.%${q}%`;

      const { data, error: sErr } = await supabase
        .from('patients')
        .select('id, patient_id, name, phone, age, gender, admission_type, is_admitted')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(20);

      if (sErr) throw sErr;
      setResults((data || []) as PatientSearchRow[]);
      setShowDropdown(true);
    } catch (e: any) {
      console.error('Search error:', e);
      setSearchError(e?.message || 'Failed to search patients');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setResults([]);
      setSearchError(null);
      setShowDropdown(false);
      return;
    }

    const t = setTimeout(() => {
      handleSearch();
    }, 250);

    return () => clearTimeout(t);
  }, [query]);

  const updateDropdownPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width
    });
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    updateDropdownPosition();

    const onResize = () => updateDropdownPosition();
    const onScroll = () => updateDropdownPosition();

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [showDropdown, updateDropdownPosition]);

  const selectPatient = async (p: PatientSearchRow) => {
    try {
      // Source of truth for "currently inpatient" is an active bed allocation without discharge.
      const { data: bedAlloc, error: bedErr } = await supabase
        .from('bed_allocations')
        .select('id')
        .eq('patient_id', p.id)
        .eq('status', 'active')
        .is('discharge_date', null)
        .limit(1);

      if (bedErr) {
        console.warn('Bed allocation check failed, falling back to patient flags:', bedErr);
      }

      const isInpatient = (bedAlloc || []).length > 0;
      if (isInpatient) {
        setSearchError('Patient is currently Inpatient. Please use Inpatient module.');
        return;
      }

      setSearchError(null);
      setSelectedPatient(p);
      setActiveStep('visit');
      setError(null);
      setShowDropdown(false);
    } catch (e) {
      console.error('Error checking inpatient status:', e);
      // If the check fails unexpectedly, allow selecting but do not block workflow.
      setSearchError(null);
      setSelectedPatient(p);
      setActiveStep('visit');
      setError(null);
      setShowDropdown(false);
    }
  };

  const handleDoctorSelect = (doctorId: string) => {
    const d = doctors.find(x => x.id === doctorId);
    if (!d) return;

    setForm(prev => ({
      ...prev,
      consultingDoctorId: doctorId,
      consultingDoctorName: d.users?.name || `Dr. ID: ${doctorId}`,
      consultationFee: (d.consultation_fee ?? 0).toString()
    }));
  };

  const toNumberOrNull = (v: string) => {
    const trimmed = (v ?? '').toString().trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const toIntOrNull = (v: string) => {
    const n = toNumberOrNull(v);
    return n === null ? null : Math.trunc(n);
  };

  const getImmediateApptTime = () => {
    const now = new Date();
    const base = new Date(now);
    // Add a small buffer so "immediate" always lands in the future
    base.setMinutes(base.getMinutes() + 5);
    base.setSeconds(0, 0);

    // Round up to next 30-minute slot
    const minutes = base.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    if (roundedMinutes === 60) {
      base.setHours(base.getHours() + 1);
      base.setMinutes(0);
    } else {
      base.setMinutes(roundedMinutes);
    }

    const appointmentTimeObj = base;
    const finalDate = appointmentTimeObj.toISOString().split('T')[0];

    const appointmentTime = `${appointmentTimeObj.getHours().toString().padStart(2, '0')}:${appointmentTimeObj
      .getMinutes()
      .toString()
      .padStart(2, '0')}:00`;

    return { appointmentDate: finalDate, appointmentTime };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    if (!form.consultingDoctorId) {
      setError('Please select a doctor');
      return;
    }

    setSaving(true);

    try {
      // Update patient record with vitals + complaints/notes
      const vitalsUpdate: any = {
        height: toNumberOrNull(form.height),
        weight: toNumberOrNull(form.weight),
        bmi: toNumberOrNull(form.bmi),
        temperature: toNumberOrNull(form.temperature),
        bp_systolic: toIntOrNull(form.bpSystolic),
        bp_diastolic: toIntOrNull(form.bpDiastolic),
        pulse: toIntOrNull(form.pulse),
        spo2: toIntOrNull(form.spo2),
        respiratory_rate: toIntOrNull(form.respiratoryRate),
        random_blood_sugar: form.randomBloodSugar ? form.randomBloodSugar : null,
        vital_notes: [form.complaints, form.notes].filter(Boolean).join('\n').trim() || null,
        consulting_doctor_name: form.consultingDoctorName || null,
        consultation_fee: toNumberOrNull(form.consultationFee),
        staff_id: form.staffId || null,
        registration_status: 'completed',
        vitals_completed_at: new Date().toISOString()
      };

      const { error: updateErr } = await supabase
        .from('patients')
        .update(vitalsUpdate)
        .eq('id', selectedPatient.id);

      if (updateErr) throw updateErr;

      // Create appointment immediately (no date/time selection UI)
      const { appointmentDate, appointmentTime } = getImmediateApptTime();

      const appointmentData: AppointmentData = {
        patientId: selectedPatient.id,
        doctorId: form.consultingDoctorId,
        appointmentDate,
        appointmentTime,
        durationMinutes: 30,
        type: 'consultation',
        isEmergency: false,
        chiefComplaint: form.complaints || 'Revisit consultation',
        bookingMethod: 'walk_in'
      };

      const appointment = await createAppointment(appointmentData, form.staffId || undefined);
      setCreatedAppointmentId(appointment.id);

      setSuccess(true);

      setTimeout(() => {
        router.push('/outpatient?tab=appointments');
      }, 2000);
    } catch (e: any) {
      console.error('Revisit submission error:', e);
      setError(e?.message || 'Failed to complete revisit');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-blue-50/30 py-8 px-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Revisit Created</h2>
          <p className="text-gray-600 mb-4">Appointment created successfully.</p>
          {createdAppointmentId && (
            <p className="text-xs text-gray-500">Appointment ID: {createdAppointmentId}</p>
          )}
          <p className="text-sm text-gray-500 mt-4">Redirecting to appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50/30 py-8 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/outpatient"
            className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Outpatient
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <RefreshCw size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Outpatient Revisit</h1>
                <p className="text-white/80 text-sm">Search patient and create immediate appointment</p>
              </div>
            </div>
          </div>

          {activeStep === 'search' && (
            <div className="p-8 space-y-6">
              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                    <p className="text-sm text-red-700">{searchError}</p>
                  </div>
                </div>
              )}

              <div className="relative w-full">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Search UHID / Patient Name</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => {
                      if (results.length > 0) setShowDropdown(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowDropdown(false), 150);
                    }}
                    placeholder="Type UHID or patient name..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {showDropdown && dropdownStyle && (searching || results.length > 0 || searchError || query.trim()) && (
                <div
                  className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                  style={{
                    top: dropdownStyle.top,
                    left: dropdownStyle.left,
                    width: dropdownStyle.width
                  }}
                >
                  {searching && (
                    <div className="p-3 text-sm text-gray-600 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  )}

                  {!searching && searchError && (
                    <div className="p-3 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {searchError}
                    </div>
                  )}

                  {!searching && !searchError && results.length === 0 && (
                    <div className="p-3 text-sm text-gray-500">No matching patients.</div>
                  )}

                  {!searching && results.length > 0 && (
                    <div className="max-h-[60vh] overflow-auto divide-y">
                      {results.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectPatient(p)}
                          className="w-full text-left p-4 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="truncate">{p.name}</span>
                              </div>
                              <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-3">
                                <span className="font-mono">{p.patient_id}</span>
                                {p.phone && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {p.phone}
                                  </span>
                                )}
                                <span className="capitalize">{p.gender || 'n/a'}</span>
                                <span>{p.age ?? 'n/a'} yrs</span>
                              </div>
                            </div>
                            <span className="text-xs text-blue-700 font-semibold">Select</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeStep === 'visit' && selectedPatient && (
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{selectedPatient.name}</div>
                    <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-3">
                      <span className="font-mono">{selectedPatient.patient_id}</span>
                      {selectedPatient.phone && <span>{selectedPatient.phone}</span>}
                      <span className="capitalize">{selectedPatient.gender || 'n/a'}</span>
                      <span>{selectedPatient.age ?? 'n/a'} yrs</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep('search');
                      setSelectedPatient(null);
                      setError(null);
                      setSearchError(null);
                      setResults([]);
                    }}
                    className="text-sm text-blue-700 hover:text-blue-800 font-semibold"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Complaints</label>
                  <textarea
                    rows={2}
                    value={form.complaints}
                    onChange={(e) => setForm(prev => ({ ...prev, complaints: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Chief complaints..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Notes</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Height (cm)</label>
                  <input
                    value={form.height}
                    onChange={(e) => setForm(prev => ({ ...prev, height: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Weight (kg)</label>
                  <input
                    value={form.weight}
                    onChange={(e) => setForm(prev => ({ ...prev, weight: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">BMI</label>
                  <input
                    value={form.bmi}
                    readOnly
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Temperature</label>
                  <input
                    value={form.temperature}
                    onChange={(e) => setForm(prev => ({ ...prev, temperature: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">BP Systolic</label>
                  <input
                    value={form.bpSystolic}
                    onChange={(e) => setForm(prev => ({ ...prev, bpSystolic: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">BP Diastolic</label>
                  <input
                    value={form.bpDiastolic}
                    onChange={(e) => setForm(prev => ({ ...prev, bpDiastolic: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Pulse</label>
                  <input
                    value={form.pulse}
                    onChange={(e) => setForm(prev => ({ ...prev, pulse: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">SpO2</label>
                  <input
                    value={form.spo2}
                    onChange={(e) => setForm(prev => ({ ...prev, spo2: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Resp. Rate</label>
                  <input
                    value={form.respiratoryRate}
                    onChange={(e) => setForm(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">RBS</label>
                  <input
                    value={form.randomBloodSugar}
                    onChange={(e) => setForm(prev => ({ ...prev, randomBloodSugar: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Doctor *</label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      value={form.consultingDoctorId}
                      onChange={(e) => handleDoctorSelect(e.target.value)}
                      disabled={loadingDoctors}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">{loadingDoctors ? 'Loading doctors...' : 'Select Doctor...'}</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {(d.users?.name || 'Doctor')} {d.specialization ? `- ${d.specialization}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Consultation Fee</label>
                  <input
                    value={form.consultationFee}
                    onChange={(e) => setForm(prev => ({ ...prev, consultationFee: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <StaffSelect
                  value={form.staffId}
                  onChange={(staffId) => setForm(prev => ({ ...prev, staffId }))}
                  label="Staff Member (Optional)"
                />
              </div>

              <div className="flex gap-4 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep('search');
                    setSelectedPatient(null);
                    setError(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Save & Create Appointment
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
