'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Save, Printer, Loader2, AlertCircle,
    CheckCircle, User, Calendar, FileText, Stethoscope,
    Hash, MapPin, Heart, CalendarCheck, Building,
    Pencil, CreditCard, Plus, X
} from 'lucide-react';
import { supabase } from '../../../../src/lib/supabase';
import { getBedAllocationById } from '../../../../src/lib/bedAllocationService';
import { createDischargeSummary, getDischargeSummaryByAllocation, type DischargeSummaryData } from '../../../../src/lib/dischargeService';
import DischargeAttachments from '../../../../src/components/DischargeAttachments';

type StaffOption = {
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    role: string;
};

export default function DischargeSummaryPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const allocationId = params?.id as string;

    const viewMode = searchParams?.get('view') === '1';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [createdSummaryId, setCreatedSummaryId] = useState<string | null>(null);
    const [staffId, setStaffId] = useState<string>('');

    const [allocation, setAllocation] = useState<any | null>(null);

    const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
    const [staffSearch, setStaffSearch] = useState('');
    const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<DischargeSummaryData>>({
        discharge_date: new Date().toISOString().split('T')[0],
        diagnosis_category: 'Treatment',
        condition_at_discharge: 'Improved',
    });

    const [billingData, setBillingData] = useState({
        pharmacy: '',
        lab: '',
        procedure: '',
        other: '',
        discount: '',
        paid: ''
    });

    const [billingEditable, setBillingEditable] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentSplits, setPaymentSplits] = useState<Array<{ method: string; amount: string; reference: string }>>([
        { method: 'cash', amount: '', reference: '' }
    ]);

    const [discharging, setDischarging] = useState(false);
    const [dischargeError, setDischargeError] = useState<string | null>(null);
    const [dischargeSuccess, setDischargeSuccess] = useState(false);
    const [dischargeHistory, setDischargeHistory] = useState<any[]>([]);

    const mapToLedgerMethod = (method: string) => {
        const m = String(method || '').toLowerCase();
        if (m === 'cash') return 'cash';
        if (m === 'card') return 'card';
        if (m === 'upi') return 'upi';
        if (m === 'gpay') return 'gpay';
        if (m === 'ghpay') return 'ghpay';
        if (m === 'insurance') return 'insurance';
        if (m === 'credit') return 'credit';
        return 'others';
    };

    const mapToBillingPaymentMethod = (method: string | null) => {
        const m = String(method || '').toLowerCase();
        if (m === 'cash') return 'cash';
        if (m === 'card') return 'card';
        if (m === 'upi') return 'upi';
        if (m === 'credit') return 'credit';
        return null;
    };

    const mapFromLedgerMethod = (method: string) => {
        const m = String(method || '').toLowerCase();
        if (m === 'cash') return 'cash';
        if (m === 'card') return 'card';
        if (m === 'upi' || m === 'gpay' || m === 'ghpay') return 'upi';
        if (m === 'insurance') return 'insurance';
        if (m === 'credit') return 'cash';
        return 'cash';
    };

    useEffect(() => {
        const totalPaid = paymentSplits.reduce((sum, p) => {
            const n = Number(p.amount);
            return sum + (Number.isFinite(n) ? n : 0);
        }, 0);

        setBillingData(prev => ({
            ...prev,
            paid: totalPaid ? String(totalPaid) : ''
        }));
    }, [paymentSplits]);

    useEffect(() => {
        if (allocationId) {
            loadData();
        }
    }, [allocationId]);

    useEffect(() => {
        loadStaffOptions();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const allocation = await getBedAllocationById(allocationId);

            if (!allocation) {
                setError('Bed allocation not found.');
                return;
            }

            setAllocation(allocation);

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
                admission_date: allocation.admission_date ? new Date(allocation.admission_date).toISOString().split('T')[0] : '',
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

            const existing = await getDischargeSummaryByAllocation(allocation.id);
            if (existing) {
                setCreatedSummaryId(existing.id);
                setFormData(prev => ({
                    ...prev,
                    ...existing,
                    admission_date: existing.admission_date
                        ? new Date(existing.admission_date).toISOString().split('T')[0]
                        : prev.admission_date,
                    surgery_date: existing.surgery_date
                        ? new Date(existing.surgery_date).toISOString().split('T')[0]
                        : prev.surgery_date,
                    discharge_date: existing.discharge_date
                        ? new Date(existing.discharge_date).toISOString().split('T')[0]
                        : prev.discharge_date,
                    review_on: existing.review_on
                        ? new Date(existing.review_on).toISOString().split('T')[0]
                        : prev.review_on,
                }));

                setBillingData(prev => ({
                    ...prev,
                    pharmacy: existing.pharmacy_amount != null ? String(existing.pharmacy_amount) : prev.pharmacy,
                    lab: existing.lab_amount != null ? String(existing.lab_amount) : prev.lab,
                    procedure: existing.procedure_amount != null ? String(existing.procedure_amount) : prev.procedure,
                    other: existing.other_amount != null ? String(existing.other_amount) : prev.other,
                    discount: existing.discount_amount != null ? String(existing.discount_amount) : prev.discount,
                    paid: existing.paid_amount != null ? String(existing.paid_amount) : prev.paid,
                }));

                if (Array.isArray(existing.payment_splits) && existing.payment_splits.length) {
                    setPaymentSplits(
                        existing.payment_splits.map((p: any) => ({
                            method: String(p?.method || 'cash'),
                            amount: p?.amount != null ? String(p.amount) : '',
                            reference: String(p?.reference || p?.transaction_reference || '')
                        }))
                    );
                }

                // Prefer loading split payments from billing ledger if present
                try {
                    const { data: bill, error: billError } = await supabase
                        .from('billing')
                        .select('id, amount_paid, balance_due, total')
                        .eq('bed_allocation_id', allocation.id)
                        .order('issued_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (billError) {
                        console.error('Error loading billing ledger:', billError);
                    } else if (bill?.id) {
                        const { data: ledgerPays, error: ledgerPaysError } = await supabase
                            .from('billing_payments')
                            .select('method, amount, reference')
                            .eq('billing_id', bill.id)
                            .order('received_at', { ascending: true });

                        if (ledgerPaysError) {
                            console.error('Error loading billing payments:', ledgerPaysError);
                        } else if (ledgerPays && ledgerPays.length) {
                            const rowSplits = ledgerPays.map((p: any) => ({
                                method: mapFromLedgerMethod(p?.method),
                                amount: p?.amount != null ? String(p.amount) : '',
                                reference: String(p?.reference || '')
                            }));
                            setPaymentSplits(rowSplits);

                            const totalPaid = rowSplits.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
                            setBillingData(prev => ({
                                ...prev,
                                paid: totalPaid ? String(totalPaid) : ''
                            }));
                        }
                    }
                } catch (ledgerErr) {
                    console.error('Error loading billing ledger:', ledgerErr);
                }

                try {
                    const { data: paymentRows, error: paymentRowsError } = await supabase
                        .from('discharge_payments')
                        .select('method, amount, reference')
                        .eq('discharge_summary_id', existing.id)
                        .order('received_at', { ascending: true });

                    if (paymentRowsError) {
                        console.error('Error loading discharge payments:', paymentRowsError);
                    } else if (paymentRows && paymentRows.length) {
                        const rowSplits = paymentRows.map((p: any) => ({
                            method: String(p?.method || 'cash'),
                            amount: p?.amount != null ? String(p.amount) : '',
                            reference: String(p?.reference || '')
                        }));
                        setPaymentSplits(rowSplits);
                        const totalPaid = rowSplits.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
                        setBillingData(prev => ({
                            ...prev,
                            paid: totalPaid ? String(totalPaid) : ''
                        }));
                    }
                } catch (payErr) {
                    console.error('Error loading discharge payments:', payErr);
                }
            }

            try {
                const { data: history, error: historyError } = await supabase
                    .from('discharge_summaries')
                    .select('id, allocation_id, discharge_date, final_diagnosis, created_at, pending_amount')
                    .eq('patient_id', allocation.patient_id)
                    .order('discharge_date', { ascending: false })
                    .limit(10);

                if (historyError) {
                    console.error('Error loading discharge history:', historyError);
                } else {
                    setDischargeHistory(history || []);
                }
            } catch (historyErr) {
                console.error('Error loading discharge history:', historyErr);
            }

        } catch (err: any) {
            console.error('Error loading data:', err);
            setError(err.message || 'Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    const loadStaffOptions = async () => {
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('id, employee_id, first_name, last_name, role')
                .eq('is_active', true)
                .order('first_name', { ascending: true })
                .limit(200);

            if (error) {
                console.error('Error loading staff:', error);
                return;
            }

            setStaffOptions((data || []) as StaffOption[]);
        } catch (e) {
            console.error('Error loading staff:', e);
        }
    };

    const computeBedBilling = () => {
        const admission = formData.admission_date ? new Date(formData.admission_date) : null;
        const discharge = formData.discharge_date ? new Date(formData.discharge_date) : null;
        const dailyRateRaw = allocation?.bed?.daily_rate;
        const dailyRate = typeof dailyRateRaw === 'number' ? dailyRateRaw : Number(dailyRateRaw);

        let days = 0;
        if (admission && discharge && !Number.isNaN(admission.getTime()) && !Number.isNaN(discharge.getTime())) {
            const diffMs = discharge.getTime() - admission.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            days = Math.max(1, diffDays);
        }

        const rate = Number.isFinite(dailyRate) ? dailyRate : 0;
        const total = days * rate;

        return {
            bedNumber: allocation?.bed?.bed_number || 'N/A',
            roomNumber: allocation?.bed?.room_number || 'N/A',
            bedType: allocation?.bed?.bed_type || 'N/A',
            days,
            dailyRate: rate,
            total
        };
    };

    const computePendingBills = () => {
        const bed = computeBedBilling();

        const toNumber = (v: string) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        };

        const pharmacy = toNumber(billingData.pharmacy);
        const lab = toNumber(billingData.lab);
        const procedure = toNumber(billingData.procedure);
        const other = toNumber(billingData.other);
        const discount = toNumber(billingData.discount);
        const paid = toNumber(billingData.paid);

        const otherCharges = pharmacy + lab + procedure + other;
        const gross = bed.total + otherCharges;
        const net = Math.max(0, gross - discount);
        const pending = Math.max(0, net - paid);

        return {
            bed,
            pharmacy,
            lab,
            procedure,
            other,
            discount,
            paid,
            otherCharges,
            gross,
            net,
            pending
        };
    };

    const computeSplitPaid = () => {
        const total = paymentSplits.reduce((sum, p) => {
            const n = Number(p.amount);
            return sum + (Number.isFinite(n) ? n : 0);
        }, 0);
        return Math.max(0, total);
    };

    const handleDischargePatient = async () => {
        if (!allocationId) return;
        if (!allocation?.patient_id) {
            setDischargeError('Patient not found for this allocation.');
            return;
        }

        if (!allocation?.bed_id) {
            setDischargeError('Bed not found for this allocation.');
            return;
        }

        const bills = computePendingBills();
        if (bills.pending > 0) {
            const ok = window.confirm(`Pending balance is ₹${bills.pending}. Do you want to discharge anyway?`);
            if (!ok) return;
        }

        setDischarging(true);
        setDischargeError(null);
        setDischargeSuccess(false);

        try {
            const dischargeDateIso = formData.discharge_date
                ? new Date(formData.discharge_date).toISOString()
                : new Date().toISOString();

            // Mark bed allocation discharged (this table exists in your DB)
            const { error: bedAllocError } = await supabase
                .from('bed_allocations')
                .update({
                    discharge_date: dischargeDateIso,
                    status: 'discharged',
                    total_charges: bills.net,
                    updated_at: new Date().toISOString()
                })
                .eq('id', allocationId);

            if (bedAllocError) {
                const errAny: any = bedAllocError as any;
                throw new Error(errAny?.message || 'Failed to update bed allocation discharge.');
            }

            // Free up the bed
            const { error: bedError } = await supabase
                .from('beds')
                .update({ status: 'available', updated_at: new Date().toISOString() })
                .eq('id', allocation.bed_id);

            if (bedError) {
                const errAny: any = bedError as any;
                throw new Error(errAny?.message || 'Failed to update bed status.');
            }

            await supabase
                .from('patients')
                .update({ is_admitted: false })
                .eq('id', allocation.patient_id);

            setDischargeSuccess(true);
            await loadData();
        } catch (e: any) {
            console.error('Error discharging patient:', e);
            setDischargeError(e?.message || 'Failed to discharge patient.');
        } finally {
            setDischarging(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Get current authenticated user ID
            const { data: userData, error: userError } = await supabase.auth.getUser();
            
            if (userError || !userData.user) {
                throw new Error('User not authenticated. Please log in again.');
            }

            const authUserId = userData.user.id;

            const { data: appUser, error: appUserError } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', authUserId)
                .maybeSingle();

            if (appUserError) {
                throw new Error(appUserError.message || 'Failed to resolve application user.');
            }

            if (!appUser?.id) {
                throw new Error('No user profile found for this login. Please create a user with employee_id in Users table.');
            }

            const bedBill = computeBedBilling();
            const bills = computePendingBills();

            const paymentSplitsPayload = (paymentSplits || []).map(p => ({
                method: p.method,
                amount: Number(p.amount) || 0,
                reference: p.reference || ''
            }));

            const summary = await createDischargeSummary({
                ...formData as DischargeSummaryData,
                created_by: appUser.id,

                bed_days: bedBill.days,
                bed_daily_rate: bedBill.dailyRate,
                bed_total: bedBill.total,

                pharmacy_amount: bills.pharmacy,
                lab_amount: bills.lab,
                procedure_amount: bills.procedure,
                other_amount: bills.other,
                discount_amount: bills.discount,
                gross_amount: bills.gross,
                net_amount: bills.net,
                paid_amount: bills.paid,
                pending_amount: bills.pending,
                payment_splits: paymentSplitsPayload
            });

            // Update billing ledger + split payments
            try {
                const total = Number(bills.net) || 0;
                const paid = Number(bills.paid) || 0;
                const balance = Math.max(0, total - paid);
                const paymentStatus = paid <= 0 ? 'pending' : (balance <= 0 ? 'completed' : 'partial');

                const nonZeroSplits = (paymentSplits || [])
                    .map(p => ({
                        method: mapToLedgerMethod(p.method),
                        amount: Number(p.amount) || 0,
                        reference: p.reference || null
                    }))
                    .filter(p => (Number(p.amount) || 0) > 0);

                const derivedPaymentMethod = nonZeroSplits.length === 1
                    ? nonZeroSplits[0].method
                    : (nonZeroSplits.length > 1 ? 'others' : null);

                const billingPaymentMethod = mapToBillingPaymentMethod(derivedPaymentMethod);

                const { data: existingBill, error: existingBillError } = await supabase
                    .from('billing')
                    .select('id')
                    .eq('bed_allocation_id', allocationId)
                    .order('issued_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existingBillError) {
                    console.error('Error finding billing record:', existingBillError);
                }

                let billingId: string | null = existingBill?.id || null;
                if (!billingId) {
                    const { data: insertedBill, error: insertBillError } = await supabase
                        .from('billing')
                        .insert({
                            patient_id: allocation?.patient_id || null,
                            bed_allocation_id: allocationId,
                            subtotal: Number(bills.gross) || total,
                            discount: Number(bills.discount) || 0,
                            tax: 0,
                            amount_paid: paid,
                            balance_due: balance,
                            payment_status: paymentStatus,
                            payment_method: billingPaymentMethod,
                            staff_id: staffId || null,
                            issued_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .select('id')
                        .single();

                    if (insertBillError) {
                        const errAny: any = insertBillError as any;
                        console.error('Error creating billing record:', {
                            code: errAny?.code,
                            message: errAny?.message,
                            details: errAny?.details,
                            hint: errAny?.hint
                        });
                    } else {
                        billingId = insertedBill?.id || null;
                    }
                } else {
                    const { error: updateBillError } = await supabase
                        .from('billing')
                        .update({
                            subtotal: Number(bills.gross) || total,
                            discount: Number(bills.discount) || 0,
                            tax: 0,
                            amount_paid: paid,
                            balance_due: balance,
                            payment_status: paymentStatus,
                            payment_method: billingPaymentMethod,
                            staff_id: staffId || null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', billingId);

                    if (updateBillError) {
                        const errAny: any = updateBillError as any;
                        console.error('Error updating billing record:', {
                            code: errAny?.code,
                            message: errAny?.message,
                            details: errAny?.details,
                            hint: errAny?.hint
                        });
                    }
                }

                if (billingId) {
                    const { error: delPaysError } = await supabase
                        .from('billing_payments')
                        .delete()
                        .eq('billing_id', billingId);

                    if (delPaysError) {
                        console.error('Error clearing billing payments:', delPaysError);
                    }

                    if (nonZeroSplits.length) {
                        const { error: insPaysError } = await supabase
                            .from('billing_payments')
                            .insert(
                                nonZeroSplits.map(p => ({
                                    billing_id: billingId,
                                    amount: p.amount,
                                    method: p.method,
                                    reference: p.reference,
                                    received_at: new Date().toISOString(),
                                    received_by: authUserId
                                }))
                            );

                        if (insPaysError) {
                            console.error('Error saving billing payments:', insPaysError);
                        }
                    }
                }
            } catch (ledgerSaveErr) {
                console.error('Error saving billing ledger:', ledgerSaveErr);
            }

            try {
                await supabase
                    .from('discharge_payments')
                    .delete()
                    .eq('discharge_summary_id', summary.id);

                const rows = (paymentSplits || [])
                    .map(p => ({
                        method: String(p.method || 'cash'),
                        amount: Number(p.amount) || 0,
                        reference: p.reference || null,
                        discharge_summary_id: summary.id,
                        received_by: appUser.id
                    }))
                    .filter(r => (Number(r.amount) || 0) > 0);

                if (rows.length) {
                    const { error: insertPayError } = await supabase
                        .from('discharge_payments')
                        .insert(rows);

                    if (insertPayError) {
                        console.error('Error saving discharge payments:', insertPayError);
                    }
                }
            } catch (payErr) {
                console.error('Error saving discharge payments:', payErr);
            }

            setCreatedSummaryId(summary.id);
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
        <div className={`h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-gray-50 ${viewMode ? 'report-view' : ''}`}>
            <div className="screen-only h-full flex flex-col">
                <div className="z-40 bg-white/70 backdrop-blur-sm border-b border-gray-100 shrink-0">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Link href="/inpatient">
                                    <button className="p-2 bg-white text-gray-600 hover:text-gray-900 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>
                                </Link>
                                <div>
                                    <h1 className="text-xl font-semibold text-gray-900">Patient Discharge Summary</h1>
                                    <p className="text-xs text-gray-600">Complete medical record for patient discharge</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                                    In Progress
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1">
                            <div className="flex-1 h-0.5 bg-blue-300 rounded-full"></div>
                            <div className="flex-1 h-0.5 bg-blue-300 rounded-full"></div>
                            <div className="flex-1 h-0.5 bg-blue-300 rounded-full"></div>
                            <div className="flex-1 h-0.5 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 h-0.5 bg-gray-200 rounded-full"></div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700 shadow-sm">
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {dischargeError && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700 shadow-sm">
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <span className="text-sm font-medium">{dischargeError}</span>
                    </div>
                )}

                {dischargeSuccess && (
                    <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3 text-green-700 shadow-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium">Patient discharged successfully. Bed has been freed.</span>
                    </div>
                )}

                <form
                    onSubmit={(e) => {
                        if (viewMode) {
                            e.preventDefault();
                            return;
                        }
                        handleSubmit(e);
                    }}
                    className="space-y-6"
                >
                    <fieldset disabled={viewMode} className="space-y-6">
                    {/* Patient Information Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 text-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                    <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">Patient Information</h2>
                                    <p className="text-blue-600 text-xs">Basic patient details and demographics</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                        <Hash className="h-3 w-3" />
                                        UHID
                                    </label>
                                    <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                                        <p className="font-mono text-sm font-semibold text-gray-900">{formData.uhid}</p>
                                    </div>
                                </div>
                                <div className="lg:col-span-2 space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        Patient Name
                                    </label>
                                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                        <p className="text-lg font-semibold text-gray-900">{formData.patient_name}</p>
                                    </div>
                                </div>
                                <div className="lg:col-span-3 space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        Address
                                    </label>
                                    <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                                        <p className="text-gray-900 text-sm">{formData.address || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        Gender
                                    </label>
                                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                                        <p className="text-sm font-medium text-gray-900 capitalize">{formData.gender}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Age
                                    </label>
                                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                                        <p className="text-sm font-medium text-gray-900">{formData.age} Years</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        IP Number
                                    </label>
                                    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
                                        <p className="font-mono text-sm font-semibold text-blue-600">{formData.ip_number || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Admission Details Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 text-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                    <Calendar className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">Admission Details</h2>
                                    <p className="text-purple-600 text-xs">Timeline and key dates during hospital stay</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Calendar className="h-3 w-3 text-purple-500" />
                                        Date of Admission
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={formData.admission_date}
                                            readOnly
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium cursor-not-allowed"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Stethoscope className="h-3 w-3 text-purple-500" />
                                        Date of Surgery (If any)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={formData.surgery_date || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, surgery_date: e.target.value }))}
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-300 outline-none transition-all"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <Stethoscope className="h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <CheckCircle className="h-3 w-3 text-blue-500" />
                                        Date of Discharge *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={formData.discharge_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, discharge_date: e.target.value }))}
                                            className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none bg-blue-50/50 font-medium transition-all"
                                            required
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <CheckCircle className="h-4 w-4 text-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Medical Records Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-100 text-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                    <FileText className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">Medical Records</h2>
                                    <p className="text-orange-600 text-xs">Clinical findings and medical history</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Stethoscope className="h-3 w-3 text-orange-500" />
                                        Anesthesiologist
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.anesthesiologist || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, anesthesiologist: e.target.value }))}
                                        placeholder="Enter anesthesiologist name..."
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Heart className="h-3 w-3 text-orange-500" />
                                        Past History
                                    </label>
                                    <textarea
                                        value={formData.past_history || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, past_history: e.target.value }))}
                                        rows={2}
                                        placeholder="Patient's medical history..."
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3 text-orange-500" />
                                    Presenting Complaints *
                                </label>
                                <textarea
                                    value={formData.presenting_complaint || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, presenting_complaint: e.target.value }))}
                                    rows={3}
                                    placeholder="Describe the patient's main complaints and symptoms..."
                                    className="w-full p-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none bg-orange-50/50 transition-all resize-none"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Stethoscope className="h-3 w-3 text-orange-500" />
                                    Physical Findings
                                </label>
                                <textarea
                                    value={formData.physical_findings || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, physical_findings: e.target.value }))}
                                    rows={3}
                                    placeholder="Physical examination findings..."
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <FileText className="h-3 w-3 text-orange-500" />
                                    Investigations
                                </label>
                                <textarea
                                    value={formData.investigations || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, investigations: e.target.value }))}
                                    rows={3}
                                    placeholder="Lab results, imaging studies, and other investigations..."
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Final Diagnosis & Condition Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 text-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                    <Stethoscope className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">Final Diagnosis & Condition</h2>
                                    <p className="text-green-600 text-xs">Diagnosis details and discharge condition</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Stethoscope className="h-3 w-3 text-green-500" />
                                        Final Diagnosis *
                                    </label>
                                    <textarea
                                        value={formData.final_diagnosis || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, final_diagnosis: e.target.value }))}
                                        rows={4}
                                        placeholder="Enter the final diagnosis..."
                                        className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-300 focus:border-green-300 outline-none bg-green-50/50 transition-all resize-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FileText className="h-3 w-3 text-green-500" />
                                            Diagnosis Type *
                                        </label>
                                        <select
                                            value={formData.diagnosis_category || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, diagnosis_category: e.target.value }))}
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-300 focus:border-green-300 outline-none transition-all appearance-none bg-white"
                                            required
                                        >
                                            <option value="">Select diagnosis type...</option>
                                            <option value="Management">Management</option>
                                            <option value="Procedure">Procedure</option>
                                            <option value="Treatment">Treatment</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                            Condition at Discharge *
                                        </label>
                                        <select
                                            value={formData.condition_at_discharge || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, condition_at_discharge: e.target.value }))}
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-300 focus:border-green-300 outline-none transition-all appearance-none bg-white"
                                            required
                                        >
                                            <option value="">Select condition...</option>
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

                    {/* Follow-up Advice & Prescription Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 text-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">Follow-up Advice & Prescription</h2>
                                    <p className="text-blue-600 text-xs">Post-discharge care instructions and medications</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Calendar className="h-3 w-3 text-blue-500" />
                                        Follow-up Advice
                                    </label>
                                    <textarea
                                        value={formData.follow_up_advice || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, follow_up_advice: e.target.value }))}
                                        rows={4}
                                        placeholder="Provide follow-up instructions and care advice..."
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none transition-all resize-none"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <CalendarCheck className="h-3 w-3 text-blue-500" />
                                            Review Date
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={formData.review_on || ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, review_on: e.target.value }))}
                                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none transition-all"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                <CalendarCheck className="h-4 w-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                        <p className="text-xs text-blue-700 flex items-center gap-2">
                                            <AlertCircle className="h-3 w-3" />
                                            Schedule a review date for the patient's follow-up visit
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <FileText className="h-3 w-3 text-blue-500" />
                                    Prescription / Medication at Discharge
                                </label>
                                <textarea
                                    value={formData.prescription || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, prescription: e.target.value }))}
                                    rows={5}
                                    placeholder="Enter discharge medications, dosage instructions, and other prescriptions..."
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bed Billing Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-emerald-100 text-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                    <FileText className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">Bed Billing</h2>
                                    <p className="text-emerald-600 text-xs">Automatic calculation of bed charges</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            {(() => {
                                const bill = computeBedBilling();
                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                                            <div className="lg:col-span-2 space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                    <Building className="h-3 w-3" />
                                                    Bed / Room
                                                </label>
                                                <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                                                    <p className="font-mono text-sm font-semibold text-gray-900">
                                                        {bill.bedNumber} / {bill.roomNumber}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="lg:col-span-2 space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                    <Building className="h-3 w-3" />
                                                    Bed Type
                                                </label>
                                                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                                    <p className="text-sm font-medium text-gray-900 capitalize">
                                                        {String(bill.bedType).replace(/_/g, ' ')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Days
                                                </label>
                                                <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                                                    <p className="text-sm font-semibold text-gray-900">{bill.days || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                    <Hash className="h-3 w-3" />
                                                    Daily Rate
                                                </label>
                                                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                                                    <p className="text-sm font-semibold text-gray-900">₹{bill.dailyRate}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                Total Bed Charges
                                            </label>
                                            <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                                                <p className="text-xl font-semibold text-emerald-700">₹{bill.total}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                            <p className="text-xs text-amber-700 flex items-center gap-2">
                                                <AlertCircle className="h-3 w-3" />
                                                Days are calculated from Admission Date to Discharge Date (minimum 1 day). Rate is taken from the assigned bed's daily rate.
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    </fieldset>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-100 text-gray-700">
                            <div className="flex items-center justify-between gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                    <FileText className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="font-semibold text-lg">Pending Bills</h2>
                                    <p className="text-amber-600 text-xs">Collect pending charges before discharge</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBillingEditable(v => !v)}
                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 ${billingEditable ? 'bg-amber-200/60 text-amber-900 border-amber-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <Pencil className="h-3 w-3" />
                                        {billingEditable ? 'Lock Bills' : 'Edit Bills'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPaymentModal(true);
                                            const pending = computePendingBills().pending;
                                            if (pending > 0 && !paymentSplits.some(p => Number(p.amount) > 0)) {
                                                setPaymentSplits([{ method: 'cash', amount: String(pending), reference: '' }]);
                                            }
                                        }}
                                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                                    >
                                        <CreditCard className="h-3 w-3" />
                                        Payment Details
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            {(() => {
                                const bills = computePendingBills();
                                return (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                <div className="text-xs font-medium text-emerald-700">Bed Charges</div>
                                                <div className="text-lg font-semibold text-emerald-900">₹{bills.bed.total}</div>
                                                <div className="text-[11px] text-emerald-700">{bills.bed.days} day(s) × ₹{bills.bed.dailyRate}</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs font-medium text-slate-600">Other Charges</div>
                                                <div className="text-lg font-semibold text-slate-900">₹{bills.otherCharges}</div>
                                                <div className="text-[11px] text-slate-500">Pharmacy + Lab + Procedure + Other</div>
                                            </div>
                                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                <div className="text-xs font-medium text-amber-700">Pending Amount</div>
                                                <div className="text-lg font-semibold text-amber-900">₹{bills.pending}</div>
                                                <div className="text-[11px] text-amber-700">Net ₹{bills.net} − Paid ₹{bills.paid}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pharmacy</label>
                                                <input
                                                    type="number"
                                                    value={billingData.pharmacy}
                                                    onChange={(e) => setBillingData(prev => ({ ...prev, pharmacy: e.target.value }))}
                                                    disabled={!billingEditable}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300 outline-none transition-all"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lab</label>
                                                <input
                                                    type="number"
                                                    value={billingData.lab}
                                                    onChange={(e) => setBillingData(prev => ({ ...prev, lab: e.target.value }))}
                                                    disabled={!billingEditable}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300 outline-none transition-all"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Procedure</label>
                                                <input
                                                    type="number"
                                                    value={billingData.procedure}
                                                    onChange={(e) => setBillingData(prev => ({ ...prev, procedure: e.target.value }))}
                                                    disabled={!billingEditable}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300 outline-none transition-all"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Other</label>
                                                <input
                                                    type="number"
                                                    value={billingData.other}
                                                    onChange={(e) => setBillingData(prev => ({ ...prev, other: e.target.value }))}
                                                    disabled={!billingEditable}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300 outline-none transition-all"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Discount</label>
                                                <input
                                                    type="number"
                                                    value={billingData.discount}
                                                    onChange={(e) => setBillingData(prev => ({ ...prev, discount: e.target.value }))}
                                                    disabled={!billingEditable}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300 outline-none transition-all"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paid</label>
                                                <input
                                                    type="number"
                                                    value={billingData.paid}
                                                    onChange={(e) => setBillingData(prev => ({ ...prev, paid: e.target.value }))}
                                                    disabled
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 rounded-lg outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="text-[11px] text-gray-500 uppercase tracking-wide">Gross</div>
                                                <div className="text-sm font-semibold text-gray-900">₹{bills.gross}</div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="text-[11px] text-gray-500 uppercase tracking-wide">Discount</div>
                                                <div className="text-sm font-semibold text-gray-900">₹{bills.discount}</div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="text-[11px] text-gray-500 uppercase tracking-wide">Net</div>
                                                <div className="text-sm font-semibold text-gray-900">₹{bills.net}</div>
                                            </div>
                                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                <div className="text-[11px] text-amber-700 uppercase tracking-wide">Pending</div>
                                                <div className="text-sm font-semibold text-amber-900">₹{bills.pending}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            <span>Ready to save discharge summary</span>
                        </div>
                        <div className="flex gap-3">
                            <Link href="/inpatient">
                                <button
                                    type="button"
                                    className="px-6 py-3 bg-white border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                                >
                                    Back
                                </button>
                            </Link>
                            {viewMode ? (
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-200/50 flex items-center gap-2"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleDischargePatient}
                                        disabled={discharging}
                                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-200/50 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {discharging ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Discharging...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4" />
                                                Discharge Patient
                                            </>
                                        )}
                                    </button>
                                    <Link href={`/inpatient/discharge/${allocationId}?view=1`}>
                                        <button
                                            type="button"
                                            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                                        >
                                            <Printer className="h-4 w-4" />
                                            Print Preview
                                        </button>
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-200/50 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Save Discharge Summary
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </form>

                {!viewMode && dischargeHistory.length > 0 && (
                    <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 text-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">Discharge History</h2>
                                    <p className="text-slate-600 text-xs">Recent discharge summaries for this patient</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-3">
                                {dischargeHistory.map((h: any) => (
                                    <div key={h.id} className="p-4 border border-gray-200 rounded-xl bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">{h.discharge_date ? new Date(h.discharge_date).toLocaleDateString() : '—'}</div>
                                            <div className="text-xs text-gray-600">Diagnosis: {h.final_diagnosis || '—'}</div>
                                            <div className="text-xs text-gray-600">Balance: ₹{h.pending_amount ?? 0}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Link href={`/inpatient/discharge/${h.allocation_id}?view=1`}>
                                                <button type="button" className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs flex items-center gap-2">
                                                    <Printer className="h-4 w-4" />
                                                    View / Print
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowPaymentModal(false)}
                        ></div>
                        <div className="relative bg-white w-full max-w-2xl mx-auto rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold">Payment Details</h3>
                                        <p className="text-blue-100 text-xs mt-1">Split payments supported</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentModal(false)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
                                {(() => {
                                    const bills = computePendingBills();
                                    const totalPaid = computeSplitPaid();
                                    const remaining = Math.max(0, bills.net - totalPaid);
                                    return (
                                        <div className="space-y-4">
                                            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-semibold text-gray-900">Bill Summary</div>
                                                    <div className="text-lg font-semibold text-green-700">₹{bills.net}</div>
                                                </div>
                                                <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                                                    <div className="text-center p-2 bg-white rounded-lg border">
                                                        <div className="text-gray-500">Bed</div>
                                                        <div className="font-semibold text-gray-900">₹{bills.bed.total}</div>
                                                    </div>
                                                    <div className="text-center p-2 bg-white rounded-lg border">
                                                        <div className="text-gray-500">Other</div>
                                                        <div className="font-semibold text-gray-900">₹{bills.otherCharges}</div>
                                                    </div>
                                                    <div className="text-center p-2 bg-white rounded-lg border">
                                                        <div className="text-gray-500">Discount</div>
                                                        <div className="font-semibold text-gray-900">₹{bills.discount}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-semibold text-gray-900">Payment Methods</div>
                                                {paymentSplits.length < 3 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentSplits(prev => [...prev, { method: 'cash', amount: '', reference: '' }])}
                                                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Add Payment
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                {paymentSplits.map((p, idx) => (
                                                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                        <div className="grid grid-cols-12 gap-3 items-center">
                                                            <div className="col-span-4">
                                                                <label className="block text-[11px] text-gray-500 mb-1">Method</label>
                                                                <select
                                                                    value={p.method}
                                                                    onChange={(e) => setPaymentSplits(prev => prev.map((x, i) => i === idx ? { ...x, method: e.target.value } : x))}
                                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                                >
                                                                    <option value="cash">Cash</option>
                                                                    <option value="card">Card</option>
                                                                    <option value="upi">UPI</option>
                                                                    <option value="bank_transfer">Bank Transfer</option>
                                                                </select>
                                                            </div>
                                                            <div className="col-span-3">
                                                                <label className="block text-[11px] text-gray-500 mb-1">Amount</label>
                                                                <input
                                                                    type="number"
                                                                    value={p.amount}
                                                                    onChange={(e) => setPaymentSplits(prev => prev.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))}
                                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            <div className="col-span-4">
                                                                <label className="block text-[11px] text-gray-500 mb-1">Reference (Optional)</label>
                                                                <input
                                                                    type="text"
                                                                    value={p.reference}
                                                                    onChange={(e) => setPaymentSplits(prev => prev.map((x, i) => i === idx ? { ...x, reference: e.target.value } : x))}
                                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                                    placeholder="Txn ID / last 4 digits"
                                                                />
                                                            </div>
                                                            <div className="col-span-1 flex justify-end">
                                                                {paymentSplits.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPaymentSplits(prev => prev.filter((_, i) => i !== idx))}
                                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                                        title="Remove"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="border-t border-gray-200 pt-4">
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Total Paid</span>
                                                        <span className="font-semibold">₹{totalPaid}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Remaining Balance</span>
                                                        <span className={`font-semibold ${remaining > 0 ? 'text-amber-700' : 'text-green-700'}`}>₹{remaining}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="p-4 border-t border-gray-200 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const paid = computeSplitPaid();
                                        setBillingData(prev => ({ ...prev, paid: paid ? String(paid) : '' }));
                                        setShowPaymentModal(false);
                                    }}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Apply Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff Selection Card */}
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-indigo-100 text-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white/50 rounded-lg">
                                <User className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-lg">Staff Verification</h2>
                                <p className="text-indigo-600 text-xs">Select the staff member responsible for this discharge</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <User className="h-3 w-3 text-indigo-500" />
                                Staff Member (Optional)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={staffSearch}
                                    onChange={(e) => {
                                        setStaffSearch(e.target.value);
                                        setStaffDropdownOpen(true);
                                        setStaffId('');
                                    }}
                                    onFocus={() => setStaffDropdownOpen(true)}
                                    placeholder="Type staff name / employee ID to search..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none transition-all"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                {staffDropdownOpen && (
                                    <div className="absolute z-50 mt-2 w-full max-h-72 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                                        {(staffOptions
                                            .filter(s => {
                                                const q = staffSearch.trim().toLowerCase();
                                                if (!q) return true;
                                                const full = `${s.first_name} ${s.last_name}`.toLowerCase();
                                                return (
                                                    full.includes(q) ||
                                                    String(s.employee_id || '').toLowerCase().includes(q) ||
                                                    String(s.role || '').toLowerCase().includes(q)
                                                );
                                            })
                                            .slice(0, 50)
                                        ).map(s => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => {
                                                    setStaffId(s.id);
                                                    setStaffSearch(`${s.first_name} ${s.last_name} (${s.employee_id})`);
                                                    setStaffDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</div>
                                                        <div className="text-xs text-gray-600">{s.employee_id} • {s.role}</div>
                                                    </div>
                                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                                                        <User className="h-3 w-3 text-indigo-600" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        {staffOptions.length === 0 && (
                                            <div className="px-4 py-3 text-xs text-gray-500 text-center">No staff members found.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="text-xs text-blue-700 flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3" />
                                    Staff selection is optional. The discharge summary will be created under your account.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attachments Section */}
                {createdSummaryId && (
                    <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-teal-100 text-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                    <FileText className="h-4 w-4 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">Discharge Summary Attachments</h2>
                                    <p className="text-teal-600 text-xs">Upload supporting documents and reports</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <DischargeAttachments
                                dischargeSummaryId={createdSummaryId}
                                uploadedBy={staffId || undefined}
                                onAttachmentChange={() => {
                                    // Optional: Refresh data or show notification
                                }}
                            />
                        </div>
                    </div>
                )}
                    </div>
                </div>
            </div>

            <div className="print-only">
                {(() => {
                    const bills = computePendingBills();
                    return (
                        <div className="print-report">
                            {viewMode && (
                                <div className="print-toolbar no-print">
                                    <div className="print-toolbar-inner">
                                        <div className="print-toolbar-title">Discharge Report Preview</div>
                                        <div className="print-toolbar-actions">
                                            <Link href={`/inpatient/discharge/${allocationId}`}>
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                                >
                                                    Back to Edit
                                                </button>
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => window.print()}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                                            >
                                                <Printer className="h-4 w-4" />
                                                Print (A4)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="print-header">
                                <div>
                                    <div className="print-title">Discharge Report</div>
                                    <div className="print-subtitle">Annam Hospital • Inpatient Discharge Summary</div>
                                </div>
                                <div className="print-meta">
                                    <div><span>UHID:</span> {formData.uhid || ''}</div>
                                    <div><span>IP No:</span> {formData.ip_number || ''}</div>
                                    <div><span>Date:</span> {formData.discharge_date || ''}</div>
                                </div>
                            </div>

                            <div className="print-grid">
                                <div className="print-card">
                                    <div className="print-card-title">Patient</div>
                                    <div className="print-row"><span>Name</span><span>{formData.patient_name || ''}</span></div>
                                    <div className="print-row"><span>Gender</span><span>{formData.gender || ''}</span></div>
                                    <div className="print-row"><span>Age</span><span>{String(formData.age ?? '')}</span></div>
                                    <div className="print-row"><span>Address</span><span>{formData.address || ''}</span></div>
                                </div>
                                <div className="print-card">
                                    <div className="print-card-title">Admission</div>
                                    <div className="print-row"><span>Admission Date</span><span>{formData.admission_date || ''}</span></div>
                                    <div className="print-row"><span>Surgery Date</span><span>{formData.surgery_date || ''}</span></div>
                                    <div className="print-row"><span>Discharge Date</span><span>{formData.discharge_date || ''}</span></div>
                                    <div className="print-row"><span>Condition</span><span>{formData.condition_at_discharge || ''}</span></div>
                                </div>
                            </div>

                            <div className="print-grid">
                                <div className="print-card">
                                    <div className="print-card-title">Clinical</div>
                                    <div className="print-row"><span>Diagnosis Category</span><span>{formData.diagnosis_category || ''}</span></div>
                                    <div className="print-row"><span>Final Diagnosis</span><span>{formData.final_diagnosis || ''}</span></div>
                                </div>
                                <div className="print-card">
                                    <div className="print-card-title">Follow Up</div>
                                    <div className="print-row"><span>Review On</span><span>{formData.review_on || ''}</span></div>
                                    <div className="print-row"><span>Advice</span><span>{formData.follow_up_advice || ''}</span></div>
                                </div>
                            </div>

                            <div className="print-section">
                                <div className="print-section-title">Clinical Summary</div>
                                <div className="print-block">
                                    <div className="print-label">Presenting Complaint</div>
                                    <div className="print-text">{formData.presenting_complaint || ''}</div>
                                </div>
                                <div className="print-block">
                                    <div className="print-label">Physical Findings</div>
                                    <div className="print-text">{formData.physical_findings || ''}</div>
                                </div>
                                <div className="print-block">
                                    <div className="print-label">Investigations</div>
                                    <div className="print-text">{formData.investigations || ''}</div>
                                </div>
                            </div>

                            <div className="print-section">
                                <div className="print-section-title">Advice</div>
                                <div className="print-block">
                                    <div className="print-label">Prescription</div>
                                    <div className="print-text">{formData.prescription || ''}</div>
                                </div>
                            </div>

                            <div className="print-section">
                                <div className="print-section-title">Billing Summary</div>
                                <div className="print-bill-grid">
                                    <div className="print-row"><span>Bed Charges</span><span>₹{bills.bed.total}</span></div>
                                    <div className="print-row"><span>Pharmacy</span><span>₹{bills.pharmacy}</span></div>
                                    <div className="print-row"><span>Lab</span><span>₹{bills.lab}</span></div>
                                    <div className="print-row"><span>Procedure</span><span>₹{bills.procedure}</span></div>
                                    <div className="print-row"><span>Other</span><span>₹{bills.other}</span></div>
                                    <div className="print-row"><span>Gross</span><span>₹{bills.gross}</span></div>
                                    <div className="print-row"><span>Discount</span><span>₹{bills.discount}</span></div>
                                    <div className="print-row"><span>Net</span><span>₹{bills.net}</span></div>
                                    <div className="print-row print-total"><span>Received</span><span>₹{bills.paid}</span></div>
                                    <div className="print-row print-total"><span>Balance</span><span>₹{bills.pending}</span></div>
                                </div>
                                {paymentSplits?.some(p => Number(p.amount) > 0) && (
                                    <div className="print-splits">
                                        <div className="print-label">Payment Details</div>
                                        <div className="print-splits-grid">
                                            {(paymentSplits || []).filter(p => Number(p.amount) > 0).map((p, idx) => (
                                                <div key={idx} className="print-split-row">
                                                    <span className="print-split-method">{String(p.method || '').toUpperCase()}</span>
                                                    <span className="print-split-ref">{p.reference || ''}</span>
                                                    <span className="print-split-amt">₹{Number(p.amount) || 0}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="print-footer">
                                <div>
                                    <div className="print-sign-line"></div>
                                    <div className="print-sign-label">Signature (Doctor)</div>
                                </div>
                                <div>
                                    <div className="print-sign-line"></div>
                                    <div className="print-sign-label">Signature (Patient/Attender)</div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            <style jsx global>{`
                @media print {
                    .screen-only {
                        display: none !important;
                    }
                    .print-only {
                        display: block !important;
                    }
                    .no-print, nav, button, .flex.justify-end {
                        display: none !important;
                    }
                    body {
                        background: white;
                        margin: 0;
                        padding: 0;
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

                .print-only {
                    display: none;
                }

                .report-view .screen-only {
                    display: none;
                }

                .report-view .print-only {
                    display: block;
                    background: white;
                    height: 100vh;
                    overflow: auto;
                }

                .print-report {
                    padding: 18px;
                    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
                    color: #111827;
                }

                .print-toolbar {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    padding: 10px 0 14px;
                    background: white;
                    border-bottom: 1px solid #e5e7eb;
                    margin-bottom: 14px;
                }

                .print-toolbar-inner {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    max-width: 980px;
                    margin: 0 auto;
                }

                .print-toolbar-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #111827;
                }

                .print-toolbar-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .print-header {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #e5e7eb;
                    margin-bottom: 12px;
                }

                .print-title {
                    font-size: 18px;
                    font-weight: 700;
                    letter-spacing: 0.2px;
                }

                .print-subtitle {
                    font-size: 12px;
                    color: #4b5563;
                    margin-top: 2px;
                }

                .print-meta {
                    font-size: 12px;
                    color: #374151;
                    text-align: right;
                    line-height: 1.5;
                }

                .print-meta span {
                    color: #6b7280;
                    margin-right: 6px;
                }

                .print-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 12px;
                }

                .print-card {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 10px;
                }

                .print-card-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 8px;
                }

                .print-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                    font-size: 12px;
                    padding: 3px 0;
                    border-bottom: 1px dashed #f3f4f6;
                }

                .print-row span:first-child {
                    color: #6b7280;
                    min-width: 120px;
                }

                .print-row span:last-child {
                    color: #111827;
                    text-align: right;
                    flex: 1;
                }

                .print-section {
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid #e5e7eb;
                }

                .print-section-title {
                    font-size: 12px;
                    font-weight: 700;
                    margin-bottom: 8px;
                }

                .print-block {
                    margin-bottom: 8px;
                }

                .print-label {
                    font-size: 11px;
                    color: #6b7280;
                    margin-bottom: 2px;
                }

                .print-text {
                    font-size: 12px;
                    white-space: pre-wrap;
                    line-height: 1.45;
                    color: #111827;
                }

                .print-bill-grid {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 8px 10px;
                }

                .print-splits {
                    margin-top: 10px;
                }

                .print-splits-grid {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 8px 10px;
                }

                .print-split-row {
                    display: grid;
                    grid-template-columns: 90px 1fr 90px;
                    gap: 8px;
                    font-size: 12px;
                    padding: 4px 0;
                    border-bottom: 1px dashed #f3f4f6;
                }

                .print-split-row:last-child {
                    border-bottom: none;
                }

                .print-split-method {
                    font-weight: 700;
                    color: #111827;
                }

                .print-split-ref {
                    color: #6b7280;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .print-split-amt {
                    text-align: right;
                    font-weight: 700;
                    color: #111827;
                }

                .print-total {
                    border-bottom: none;
                    font-weight: 700;
                }

                .print-footer {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-top: 18px;
                    padding-top: 18px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 12px;
                    color: #111827;
                }

                .print-sign-line {
                    height: 28px;
                    border-bottom: 1px solid #9ca3af;
                    margin-bottom: 6px;
                }

                .print-sign-label {
                    color: #374151;
                    font-size: 12px;
                }

                @media print {
                    @page {
                        size: A4;
                        margin: 12mm;
                    }
                }
            `}</style>
        </div>
    );
}
    