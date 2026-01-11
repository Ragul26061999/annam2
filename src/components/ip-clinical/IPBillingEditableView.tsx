'use client';

import React, { useState } from 'react';
import { Edit2, Save, X, Printer } from 'lucide-react';
import { IPComprehensiveBilling } from '../../lib/ipBillingService';
import { IPBillingMultiPagePrint } from './IPBillingMultiPagePrint';

interface IPBillingEditableViewProps {
  billing: IPComprehensiveBilling;
  onSave: (updatedBilling: IPComprehensiveBilling) => Promise<void>;
}

export default function IPBillingEditableView({ billing: initialBilling, onSave }: IPBillingEditableViewProps) {
  const [billing, setBilling] = useState<IPComprehensiveBilling>(initialBilling);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleFieldUpdate = (section: string, field: string, value: any) => {
    setBilling(prev => {
      const updated = { ...prev };
      
      if (section === 'bed_charges') {
        updated.bed_charges = { ...updated.bed_charges, [field]: value };
        if (field === 'daily_rate' || field === 'days') {
          updated.bed_charges.total_amount = updated.bed_charges.daily_rate * updated.bed_charges.days;
        }
      } else if (section === 'doctor_consultation') {
        updated.doctor_consultation = { ...updated.doctor_consultation, [field]: value };
        if (field === 'consultation_fee' || field === 'days') {
          updated.doctor_consultation.total_amount = updated.doctor_consultation.consultation_fee * updated.doctor_consultation.days;
        }
      } else if (section === 'summary') {
        updated.summary = { ...updated.summary, [field]: parseFloat(value) || 0 };
      }

      // Recalculate summary
      updated.summary.bed_charges_total = updated.bed_charges.total_amount;
      updated.summary.doctor_consultation_total = updated.doctor_consultation.total_amount;
      
      updated.summary.gross_total = 
        updated.summary.bed_charges_total +
        updated.summary.doctor_consultation_total +
        updated.summary.doctor_services_total +
        updated.summary.prescribed_medicines_total +
        updated.summary.pharmacy_total +
        updated.summary.lab_total +
        updated.summary.radiology_total +
        updated.summary.other_charges_total;

      updated.summary.net_payable = 
        updated.summary.gross_total - 
        updated.summary.advance_paid - 
        updated.summary.discount;

      return updated;
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSave(billing);
      setIsEditing(false);
      alert('Billing updated successfully!');
    } catch (error) {
      console.error('Error saving billing:', error);
      alert('Failed to save billing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setShowPrint(false);
    }, 100);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 print:hidden">
        {/* Header with Actions */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">IP Billing Details</h2>
              <p className="text-sm text-gray-500 mt-1">
                Bill Number: {billing.bill_number} | Patient: {billing.patient.name}
              </p>
            </div>
            <div className="flex gap-3">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Billing
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    Print Bill
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save All Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setBilling(initialBilling);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Patient Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Patient Name</p>
              <p className="font-semibold text-gray-900">{billing.patient.name}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">IP Number</p>
              <p className="font-semibold text-gray-900">{billing.admission.ip_number}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Admission Date</p>
              <p className="font-semibold text-gray-900">{new Date(billing.admission.admission_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Total Days</p>
              <p className="font-semibold text-gray-900">{billing.admission.total_days} days</p>
            </div>
          </div>
        </div>

        {/* Bed Charges - Editable */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Bed Charges</h3>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(billing.summary.bed_charges_total)}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type</label>
              {isEditing ? (
                <input
                  type="text"
                  value={billing.bed_charges.bed_type}
                  onChange={(e) => handleFieldUpdate('bed_charges', 'bed_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <p className="text-gray-900">{billing.bed_charges.bed_type}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (₹)</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.bed_charges.daily_rate}
                  onChange={(e) => handleFieldUpdate('bed_charges', 'daily_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <p className="text-gray-900">{formatCurrency(billing.bed_charges.daily_rate)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.bed_charges.days}
                  onChange={(e) => handleFieldUpdate('bed_charges', 'days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <p className="text-gray-900">{billing.bed_charges.days}</p>
              )}
            </div>
          </div>
        </div>

        {/* Doctor Consultation - Editable */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Doctor Consultation</h3>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(billing.summary.doctor_consultation_total)}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={billing.doctor_consultation.doctor_name}
                  onChange={(e) => handleFieldUpdate('doctor_consultation', 'doctor_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <p className="text-gray-900">{billing.doctor_consultation.doctor_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (₹/day)</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.doctor_consultation.consultation_fee}
                  onChange={(e) => handleFieldUpdate('doctor_consultation', 'consultation_fee', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <p className="text-gray-900">{formatCurrency(billing.doctor_consultation.consultation_fee)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.doctor_consultation.days}
                  onChange={(e) => handleFieldUpdate('doctor_consultation', 'days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <p className="text-gray-900">{billing.doctor_consultation.days}</p>
              )}
            </div>
          </div>
        </div>

        {/* Other Charges Summary - Editable */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Other Charges Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Doctor Services Total</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.summary.doctor_services_total}
                  onChange={(e) => handleFieldUpdate('summary', 'doctor_services_total', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
              ) : (
                <span className="font-semibold text-gray-900">{formatCurrency(billing.summary.doctor_services_total)}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Prescribed Medicines Total</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.summary.prescribed_medicines_total}
                  onChange={(e) => handleFieldUpdate('summary', 'prescribed_medicines_total', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
              ) : (
                <span className="font-semibold text-gray-900">{formatCurrency(billing.summary.prescribed_medicines_total)}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Pharmacy Total</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.summary.pharmacy_total}
                  onChange={(e) => handleFieldUpdate('summary', 'pharmacy_total', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
              ) : (
                <span className="font-semibold text-gray-900">{formatCurrency(billing.summary.pharmacy_total)}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Lab Tests Total</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.summary.lab_total}
                  onChange={(e) => handleFieldUpdate('summary', 'lab_total', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
              ) : (
                <span className="font-semibold text-gray-900">{formatCurrency(billing.summary.lab_total)}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Radiology Total</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.summary.radiology_total}
                  onChange={(e) => handleFieldUpdate('summary', 'radiology_total', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
              ) : (
                <span className="font-semibold text-gray-900">{formatCurrency(billing.summary.radiology_total)}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Other Charges Total</label>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.summary.other_charges_total}
                  onChange={(e) => handleFieldUpdate('summary', 'other_charges_total', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
              ) : (
                <span className="font-semibold text-gray-900">{formatCurrency(billing.summary.other_charges_total)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-base">
              <span className="text-gray-700">Gross Total</span>
              <span className="font-semibold text-gray-900">{formatCurrency(billing.summary.gross_total)}</span>
            </div>
            <div className="flex justify-between text-base items-center">
              <span className="text-gray-700">Advance Paid</span>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.summary.advance_paid}
                  onChange={(e) => handleFieldUpdate('summary', 'advance_paid', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
              ) : (
                <span className="font-semibold text-green-600">- {formatCurrency(billing.summary.advance_paid)}</span>
              )}
            </div>
            <div className="flex justify-between text-base items-center">
              <span className="text-gray-700">Discount</span>
              {isEditing ? (
                <input
                  type="number"
                  value={billing.summary.discount}
                  onChange={(e) => handleFieldUpdate('summary', 'discount', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-right"
                />
              ) : (
                billing.summary.discount > 0 && (
                  <span className="font-semibold text-green-600">- {formatCurrency(billing.summary.discount)}</span>
                )
              )}
            </div>
            <div className="border-t-2 border-blue-300 pt-3 flex justify-between text-xl">
              <span className="font-bold text-gray-900">Net Payable</span>
              <span className="font-bold text-blue-600">{formatCurrency(billing.summary.net_payable)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Page Print Template */}
      {showPrint && <IPBillingMultiPagePrint billing={billing} />}
    </>
  );
}
