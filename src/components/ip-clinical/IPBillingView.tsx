import React, { useState, useEffect } from 'react';
import { Loader2, Printer, DollarSign, Edit2, Save, X, Wallet } from 'lucide-react';
import { 
  getIPComprehensiveBilling, 
  saveIPBilling,
  saveIPPrescribedMedicines,
  IPComprehensiveBilling,
  IPPrescribedMedicine
} from '../../lib/ipBillingService';
import {
  getBillingSummary,
  getTotalAvailableAdvance
} from '../../lib/ipFlexibleBillingService';
import IPBillingMedicinesEditor from './IPBillingMedicinesEditor';
import IPBillingLabEditor from './IPBillingLabEditor';
import IPPaymentReceiptModal from './IPPaymentReceiptModal';
import IPAdvanceReceiptModal from './IPAdvanceReceiptModal';
import IPBillWisePaymentModal from './IPBillWisePaymentModal';
import OtherBillsPaymentModal from '../OtherBillsPaymentModal';
import { IPBillingMultiPagePrint } from './IPBillingMultiPagePrint';
import IPSurgeryChargesEditor from './IPSurgeryChargesEditor';
import IPDoctorConsultationsEditor from './IPDoctorConsultationsEditor';

interface IPBillingViewProps {
  bedAllocationId: string;
  patient: any;
  bedAllocation: any;
}

export default function IPBillingView({ bedAllocationId, patient, bedAllocation }: IPBillingViewProps) {
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<IPComprehensiveBilling | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showBillWisePaymentModal, setShowBillWisePaymentModal] = useState(false);
  const [showOtherBillPaymentModal, setShowOtherBillPaymentModal] = useState(false);
  const [selectedOtherBill, setSelectedOtherBill] = useState<any | null>(null);
  const [availableAdvance, setAvailableAdvance] = useState(0);
  const [flexibleBillingSummary, setFlexibleBillingSummary] = useState<any>(null);

  const [editingBedCharges, setEditingBedCharges] = useState(false);
  const [editingDoctorConsultation, setEditingDoctorConsultation] = useState(false);
  const [bedChargesDraft, setBedChargesDraft] = useState<{ daily_rate: number; days: number } | null>(null);
  const [doctorConsultDraft, setDoctorConsultDraft] = useState<{ consultation_fee: number; days: number } | null>(null);

  useEffect(() => {
    loadBillingData();
    loadFlexibleBillingData();
  }, [bedAllocationId]);

  const loadFlexibleBillingData = async () => {
    try {
      const [summary, advance] = await Promise.all([
        getBillingSummary(bedAllocationId),
        getTotalAvailableAdvance(bedAllocationId)
      ]);
      setFlexibleBillingSummary(summary);
      setAvailableAdvance(advance);
    } catch (err) {
      console.error('Error loading flexible billing data:', err);
      // Don't show error - new system might not be active yet
    }
  };

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const billingData = await getIPComprehensiveBilling(bedAllocationId);
      setBilling(billingData);
    } catch (err) {
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBilling = async (updatedBilling: IPComprehensiveBilling) => {
    try {
      await saveIPBilling(bedAllocationId, updatedBilling);
      setBilling(updatedBilling);
      await loadFlexibleBillingData();
    } catch (err) {
      console.error('Failed to save billing:', err);
      throw err;
    }
  };

  const handleSaveMedicines = async (medicines: IPPrescribedMedicine[]) => {
    if (!billing) return;
    try {
      await saveIPPrescribedMedicines(
        bedAllocationId,
        billing.patient.id,
        medicines
      );
      await loadBillingData();
      await loadFlexibleBillingData();
    } catch (err) {
      console.error('Failed to save medicines:', err);
      throw err;
    }
  };

  const handleSaveLabTests = async (updatedLabOrders: any[]) => {
    if (!billing) return;
    try {
      // Update billing with new lab data
      const updatedBilling = {
        ...billing,
        lab_billing: updatedLabOrders,
        summary: {
          ...billing.summary,
          lab_total: updatedLabOrders.reduce((sum: number, order: any) => 
            sum + order.tests.reduce((orderSum: number, test: any) => orderSum + test.test_cost, 0), 0
          )
        }
      };
      
      // Recalculate gross total
      updatedBilling.summary.gross_total = 
        updatedBilling.summary.bed_charges_total +
        updatedBilling.summary.doctor_consultation_total +
        updatedBilling.summary.doctor_services_total +
        updatedBilling.summary.prescribed_medicines_total +
        updatedBilling.summary.pharmacy_total +
        updatedBilling.summary.lab_total +
        updatedBilling.summary.radiology_total +
        updatedBilling.summary.other_charges_total +
        (updatedBilling.summary.other_bills_total || 0);

      // Recalculate net payable
      updatedBilling.summary.net_payable = 
        updatedBilling.summary.gross_total - 
        updatedBilling.summary.advance_paid - 
        updatedBilling.summary.discount;

      // Just update local state - lab data is already in database
      setBilling(updatedBilling);
    } catch (err) {
      console.error('Failed to save lab tests:', err);
      throw err;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const recalculateBillingTotals = (b: IPComprehensiveBilling): IPComprehensiveBilling => {
    const bedTotal = Number(b.bed_charges.daily_rate || 0) * Number(b.bed_charges.days || 0);
    const docTotal = Number(b.doctor_consultation.consultation_fee || 0) * Number(b.doctor_consultation.days || 0);

    const bed_charges = { ...b.bed_charges, total_amount: bedTotal };
    const doctor_consultation = { ...b.doctor_consultation, total_amount: docTotal };

    const otherBillsTotal = (b.other_bills || []).reduce(
      (sum: number, ob: any) => sum + Number(ob.total_amount || 0),
      0
    );
    const otherBillsPaidTotal = (b.other_bills || []).reduce(
      (sum: number, ob: any) => sum + Number(ob.paid_amount || 0),
      0
    );
    const receiptsTotal = (b.payment_receipts || []).reduce(
      (sum: number, r: any) => sum + Number(r.amount || 0),
      0
    );

    const summary = {
      ...b.summary,
      bed_charges_total: bedTotal,
      doctor_consultation_total: docTotal,
      other_bills_total: otherBillsTotal,
      other_bills_paid_total: otherBillsPaidTotal,
    };

    const grossTotal =
      (summary.bed_charges_total || 0) +
      (summary.doctor_consultation_total || 0) +
      (summary.doctor_services_total || 0) +
      (summary.prescribed_medicines_total || 0) +
      (summary.pharmacy_total || 0) +
      (summary.lab_total || 0) +
      (summary.radiology_total || 0) +
      (summary.other_charges_total || 0) +
      (summary.other_bills_total || 0);

    const paidTotal =
      (summary.advance_paid || 0) +
      receiptsTotal +
      (summary.other_bills_paid_total || 0);

    const pendingAmount = Math.max(0, grossTotal - (summary.discount || 0) - paidTotal);
    const netPayable = grossTotal - (summary.advance_paid || 0) - (summary.discount || 0);

    const updatedSummary = {
      ...summary,
      gross_total: grossTotal,
      paid_total: paidTotal,
      net_payable: netPayable,
      pending_amount: pendingAmount,
    };

    const status: IPComprehensiveBilling['status'] =
      pendingAmount <= 0 ? 'paid' : paidTotal > 0 ? 'partial' : 'pending';

    return {
      ...b,
      bed_charges,
      doctor_consultation,
      summary: updatedSummary,
      status,
    };
  };

  const handleStartEditBedCharges = () => {
    if (!billing) return;
    setBedChargesDraft({
      daily_rate: Number(billing.bed_charges.daily_rate || 0),
      days: Number(billing.bed_charges.days || 0),
    });
    setEditingBedCharges(true);
  };

  const handleCancelEditBedCharges = () => {
    setEditingBedCharges(false);
    setBedChargesDraft(null);
  };

  const handleSaveBedCharges = async () => {
    if (!billing || !bedChargesDraft) return;
    const updatedBilling = recalculateBillingTotals({
      ...billing,
      bed_charges: {
        ...billing.bed_charges,
        daily_rate: Number(bedChargesDraft.daily_rate || 0),
        days: Number(bedChargesDraft.days || 0),
      },
    });

    await handleSaveBilling(updatedBilling);
    setEditingBedCharges(false);
    setBedChargesDraft(null);
    await loadBillingData();
  };

  const handleStartEditDoctorConsultation = () => {
    if (!billing) return;
    setDoctorConsultDraft({
      consultation_fee: Number(billing.doctor_consultation.consultation_fee || 0),
      days: Number(billing.doctor_consultation.days || 0),
    });
    setEditingDoctorConsultation(true);
  };

  const handleCancelEditDoctorConsultation = () => {
    setEditingDoctorConsultation(false);
    setDoctorConsultDraft(null);
  };

  const handleSaveDoctorConsultation = async () => {
    if (!billing || !doctorConsultDraft) return;
    const updatedBilling = recalculateBillingTotals({
      ...billing,
      doctor_consultation: {
        ...billing.doctor_consultation,
        consultation_fee: Number(doctorConsultDraft.consultation_fee || 0),
        days: Number(doctorConsultDraft.days || 0),
      },
    });

    await handleSaveBilling(updatedBilling);
    setEditingDoctorConsultation(false);
    setDoctorConsultDraft(null);
    await loadBillingData();
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        <span className="ml-3 text-gray-600">Loading billing details...</span>
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'No billing data available'}</p>
          <button
            onClick={loadBillingData}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 print:hidden p-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">IP Billing</h1>
              <p className="text-blue-100 mt-2">
                Patient: {billing.patient.name} | IP#: {billing.admission.ip_number}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBillWisePaymentModal(true)}
                className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-md"
              >
                <DollarSign className="h-5 w-5" />
                Pay Bills
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
              >
                <DollarSign className="h-5 w-5" />
                Quick Payment
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-md"
              >
                <Printer className="h-5 w-5" />
                Print Bill
              </button>
            </div>
          </div>
        </div>

        {/* Patient & Admission Info */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Patient Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Patient Name</p>
              <p className="text-lg font-bold text-gray-900">{billing.patient.name}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">IP Number</p>
              <p className="text-lg font-bold text-gray-900">{billing.admission.ip_number}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Admission Date</p>
              <p className="text-lg font-bold text-gray-900">{new Date(billing.admission.admission_date).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Days</p>
              <p className="text-lg font-bold text-gray-900">{billing.admission.total_days} days</p>
            </div>
          </div>
        </div>

        {/* Surgery Charges */}
        <IPSurgeryChargesEditor
          bedAllocationId={bedAllocationId}
          patientId={billing.patient.id}
          isEditable={true}
          onUpdate={loadBillingData}
        />

        {/* Bed Charges */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Bed Charges</h2>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.bed_charges_total)}</span>
              {!editingBedCharges ? (
                <button
                  onClick={handleStartEditBedCharges}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white text-blue-600 rounded-lg shadow-sm border border-gray-200 hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveBedCharges}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditBedCharges}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Bed Type</p>
                <p className="font-semibold text-gray-900">{billing.bed_charges.bed_type}</p>
              </div>
              <div>
                <p className="text-gray-600">Daily Rate</p>
                {editingBedCharges ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bedChargesDraft?.daily_rate ?? 0}
                    onChange={(e) => setBedChargesDraft(prev => ({ daily_rate: Number(e.target.value || 0), days: prev?.days ?? billing.bed_charges.days }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{formatCurrency(billing.bed_charges.daily_rate)}/day</p>
                )}
              </div>
              <div>
                <p className="text-gray-600">Days</p>
                {editingBedCharges ? (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={bedChargesDraft?.days ?? 0}
                    onChange={(e) => setBedChargesDraft(prev => ({ daily_rate: prev?.daily_rate ?? billing.bed_charges.daily_rate, days: Number(e.target.value || 0) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{billing.bed_charges.days} days</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Consultation */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Doctor Consultation</h2>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.doctor_consultation_total)}</span>
              {!editingDoctorConsultation ? (
                <button
                  onClick={handleStartEditDoctorConsultation}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white text-blue-600 rounded-lg shadow-sm border border-gray-200 hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDoctorConsultation}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditDoctorConsultation}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Doctor Name</p>
                <p className="font-semibold text-gray-900">{billing.doctor_consultation.doctor_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Fee / Day</p>
                {editingDoctorConsultation ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={doctorConsultDraft?.consultation_fee ?? 0}
                    onChange={(e) => setDoctorConsultDraft(prev => ({ consultation_fee: Number(e.target.value || 0), days: prev?.days ?? billing.doctor_consultation.days }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{formatCurrency(billing.doctor_consultation.consultation_fee)}</p>
                )}
              </div>
              <div>
                <p className="text-gray-600">Days</p>
                {editingDoctorConsultation ? (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={doctorConsultDraft?.days ?? 0}
                    onChange={(e) => setDoctorConsultDraft(prev => ({ consultation_fee: prev?.consultation_fee ?? billing.doctor_consultation.consultation_fee, days: Number(e.target.value || 0) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{billing.doctor_consultation.days}</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex justify-end text-sm">
              <span className="text-gray-600 mr-2">Total:</span>
              <span className="font-bold text-green-700">{formatCurrency(billing.doctor_consultation.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Doctor Services & Additional Consultations */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Doctor Services & Consultations</h2>
            <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.doctor_services_total)}</span>
          </div>
          
          {billing.doctor_services.length > 0 && (
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase">Professional Services</h3>
              {billing.doctor_services.map((service, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{service.doctor_name}</p>
                    <p className="text-sm text-gray-600">{service.service_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(service.total_amount)}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(service.fee)} × {service.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Additional Doctor Consultations</h3>
            <IPDoctorConsultationsEditor
              bedAllocationId={bedAllocationId}
              patientId={billing.patient.id}
              isEditable={true}
              onUpdate={loadBillingData}
            />
          </div>
        </div>

        {/* Other Bills */}
        {billing.other_bills?.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Other Bills</h2>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.other_bills_total || 0)}</span>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-center">Qty</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Paid</th>
                    <th className="px-4 py-2 text-right">Balance</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.other_bills.map((b: any) => (
                    <tr key={b.id} className="border-t">
                      <td className="px-4 py-2">{b.charge_category || '-'}</td>
                      <td className="px-4 py-2">{b.charge_description || '-'}</td>
                      <td className="px-4 py-2 text-center">{b.quantity ?? '-'}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(Number(b.unit_price || 0))}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatCurrency(Number(b.total_amount || 0))}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(Number(b.paid_amount || 0))}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(Number(b.balance_amount ?? (Number(b.total_amount || 0) - Number(b.paid_amount || 0))))}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          b.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          b.payment_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                          b.payment_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(b.payment_status || 'pending').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {b.payment_status !== 'paid' && b.payment_status !== 'cancelled' && Number(b.balance_amount ?? (Number(b.total_amount || 0) - Number(b.paid_amount || 0))) > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedOtherBill(b);
                              setShowOtherBillPaymentModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <DollarSign className="h-4 w-4" />
                            Receive
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={4} className="px-4 py-2 text-right">Total Other Bills:</td>
                    <td className="px-4 py-2 text-right text-blue-600">{formatCurrency(billing.summary.other_bills_total || 0)}</td>
                    <td className="px-4 py-2 text-right text-green-700">{formatCurrency(billing.summary.other_bills_paid_total || 0)}</td>
                    <td className="px-4 py-2 text-right text-orange-700">
                      {formatCurrency(Math.max(0, (billing.summary.other_bills_total || 0) - (billing.summary.other_bills_paid_total || 0)))}
                    </td>
                    <td colSpan={2} className="px-4 py-2" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Prescribed Medicines */}
        <IPBillingMedicinesEditor
          medicines={billing.prescribed_medicines}
          onSave={handleSaveMedicines}
          isEditable={true}
        />

        {/* Pharmacy Bills */}
        {billing.pharmacy_billing.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Pharmacy Bills</h2>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.pharmacy_total)}</span>
            </div>
            <div className="space-y-3">
              {billing.pharmacy_billing.map((pb, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center p-4 bg-white">
                    <div className="flex items-center gap-6 flex-1">
                      {/* Bill Number */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-700">#</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Bill</p>
                          <p className="font-semibold text-gray-900">{pb.bill_number}</p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Date</p>
                          <p className="font-medium text-gray-900">
                            {new Date(pb.bill_date).toLocaleDateString('en-IN', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Medicines */}
                      <div className="flex-1 max-w-md">
                        <p className="text-xs text-gray-500 uppercase mb-1">Medicines</p>
                        <div className="flex flex-wrap gap-2">
                          {pb.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-sm">
                              <span className="font-medium text-gray-700 text-xs">{item.medicine_name}</span>
                              <span className="text-gray-500 text-xs">×{item.quantity}</span>
                              <span className="text-blue-600 font-semibold text-xs">{formatCurrency(item.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Item Count */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Items</p>
                        <div className="bg-purple-100 px-3 py-1 rounded-full inline-block mt-1">
                          <span className="text-sm font-bold text-purple-800">
                            {pb.items.length} item{pb.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bill Total */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Total</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(pb.total_amount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Laboratory Tests */}
        <IPBillingLabEditor
          labOrders={billing.lab_billing}
          onSave={handleSaveLabTests}
          isEditable={true}
        />

        {/* Radiology/X-Ray */}
        {billing.radiology_billing.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Radiology / X-Ray</h2>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.radiology_total)}</span>
            </div>
            <div className="space-y-3">
              {billing.radiology_billing.map((rb, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center p-4 bg-white">
                    <div className="flex items-center gap-6 flex-1">
                      {/* Order Number */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-700">#</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Order</p>
                          <p className="font-semibold text-gray-900">{rb.order_number}</p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Date</p>
                          <p className="font-medium text-gray-900">
                            {new Date(rb.order_date).toLocaleDateString('en-IN', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Scans */}
                      <div className="flex-1 max-w-md">
                        <p className="text-xs text-gray-500 uppercase mb-1">Scans</p>
                        <div className="flex flex-wrap gap-2">
                          {rb.scans.map((scan, scanIdx) => (
                            <div key={scanIdx} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-sm">
                              <span className="font-medium text-gray-700 text-xs">{scan.scan_name}</span>
                              <span className="text-blue-600 font-semibold text-xs">{formatCurrency(scan.scan_cost)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scan Count */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Count</p>
                        <div className="bg-indigo-100 px-3 py-1 rounded-full inline-block mt-1">
                          <span className="text-sm font-bold text-indigo-800">
                            {rb.scans.length} scan{rb.scans.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order Total */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Total</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(rb.scans.reduce((sum, scan) => sum + scan.scan_cost, 0))}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Charges */}
        {billing.other_charges.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Other Charges</h2>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.other_charges_total)}</span>
            </div>
            <div className="space-y-3">
              {billing.other_charges.map((charge, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center p-4 bg-white">
                    <div className="flex items-center gap-6 flex-1">
                      {/* Service Name */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-orange-700">$</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Service</p>
                          <p className="font-semibold text-gray-900">{charge.service_name}</p>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-700">#</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Quantity</p>
                          <p className="font-medium text-gray-900">{charge.quantity}</p>
                        </div>
                      </div>

                      {/* Rate */}
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Rate</p>
                          <p className="font-medium text-gray-900">{formatCurrency(charge.rate)}</p>
                        </div>
                      </div>

                      {/* Calculation */}
                      <div className="flex-1 max-w-xs">
                        <p className="text-xs text-gray-500 uppercase mb-1">Calculation</p>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded">
                          <span className="text-sm text-gray-600">{charge.quantity}</span>
                          <span className="text-gray-400">×</span>
                          <span className="text-sm text-gray-600">{formatCurrency(charge.rate)}</span>
                          <span className="text-gray-400">=</span>
                          <span className="text-blue-600 font-bold text-sm">{formatCurrency(charge.amount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Amount</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(charge.amount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing Summary - Final Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing Summary</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Gross Total</span>
              <span className="font-semibold text-gray-900">{formatCurrency(billing.summary.gross_total)}</span>
            </div>

            {billing.summary.other_bills_total > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Other Bills Included</span>
                <span className="font-semibold">{formatCurrency(billing.summary.other_bills_total)}</span>
              </div>
            )}

            {/* Advance Amount Display */}
            {(availableAdvance > 0 || billing.summary.advance_paid > 0) && (
              <div className="flex justify-between text-lg">
                <span className="text-purple-700 font-semibold">Advance Amount</span>
                <span className="font-semibold text-purple-700">- {formatCurrency(availableAdvance || billing.summary.advance_paid)}</span>
              </div>
            )}

            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Total Paid</span>
              <span className="font-semibold text-green-700">{formatCurrency(billing.summary.paid_total)}</span>
            </div>
            
            {billing.summary.discount > 0 && (
              <div className="flex justify-between text-lg">
                <span className="text-gray-700">Discount</span>
                <span className="font-semibold text-green-600">- {formatCurrency(billing.summary.discount)}</span>
              </div>
            )}
            
            <div className="border-t-2 border-blue-300 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">Pending Amount</span>
                <span className="text-3xl font-bold text-blue-600">{formatCurrency(billing.summary.pending_amount)}</span>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Payment Status: </span>
                <span className={`font-bold ${
                  billing.status === 'paid' ? 'text-green-600' :
                  billing.status === 'partial' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {billing.status.toUpperCase()}
                </span>
              </p>
            </div>

            {billing.payment_receipts.length > 0 && (
              <div className="mt-4 bg-white rounded-lg border border-blue-200 overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
                  <h3 className="font-bold text-gray-900">Payment Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Ref</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.payment_receipts.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-4 py-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2 capitalize">{p.payment_type.replace('_', ' ')}</td>
                          <td className="px-4 py-2">{p.reference_number || '-'}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Flexible Billing Summary (if available) */}
            {flexibleBillingSummary && (
              <div className="mt-4 bg-purple-50 rounded-lg border border-purple-200 overflow-hidden">
                <div className="px-4 py-3 bg-purple-100 border-b border-purple-200">
                  <h3 className="font-bold text-purple-900">Bill-wise Payment Summary</h3>
                </div>
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Advance:</span>
                      <span className="ml-2 font-semibold text-purple-700">{formatCurrency(flexibleBillingSummary.total_advance)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Available Advance:</span>
                      <span className="ml-2 font-semibold text-purple-700">{formatCurrency(flexibleBillingSummary.available_advance)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Gross Total:</span>
                      <span className="ml-2 font-semibold text-gray-900">{formatCurrency(flexibleBillingSummary.gross_total)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Paid Total:</span>
                      <span className="ml-2 font-semibold text-green-700">{formatCurrency(flexibleBillingSummary.paid_total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Page Print Template */}
      <IPBillingMultiPagePrint billing={billing} />

      {/* Payment Receipt Modal */}
      <IPPaymentReceiptModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        bedAllocationId={bedAllocationId}
        patientId={billing.patient.id}
        patientName={billing.patient.name}
        totalAmount={billing.summary.gross_total}
        pendingAmount={billing.summary.pending_amount}
        onPaymentSuccess={() => {
          loadBillingData();
          loadFlexibleBillingData();
        }}
      />

      {/* Advance Receipt Modal */}
      <IPAdvanceReceiptModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        bedAllocationId={bedAllocationId}
        patientId={billing.patient.id}
        patientName={billing.patient.name}
        onSuccess={() => {
          loadFlexibleBillingData();
        }}
      />

      {/* Bill-wise Payment Modal */}
      <IPBillWisePaymentModal
        isOpen={showBillWisePaymentModal}
        onClose={() => setShowBillWisePaymentModal(false)}
        bedAllocationId={bedAllocationId}
        patientId={billing.patient.id}
        patientName={billing.patient.name}
        onPaymentSuccess={() => {
          loadBillingData();
          loadFlexibleBillingData();
        }}
      />

      {showOtherBillPaymentModal && selectedOtherBill && (
        <OtherBillsPaymentModal
          isOpen={showOtherBillPaymentModal}
          onClose={() => {
            setShowOtherBillPaymentModal(false);
            setSelectedOtherBill(null);
          }}
          bill={{
            id: selectedOtherBill.id,
            bill_number: selectedOtherBill.bill_number,
            total_amount: Number(selectedOtherBill.total_amount || 0),
            balance_amount: Number(selectedOtherBill.balance_amount ?? (Number(selectedOtherBill.total_amount || 0) - Number(selectedOtherBill.paid_amount || 0))),
            payment_status: selectedOtherBill.payment_status,
          }}
          onSuccess={() => {
            setShowOtherBillPaymentModal(false);
            setSelectedOtherBill(null);
            loadBillingData();
          }}
        />
      )}
    </>
  );
}
