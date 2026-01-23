'use client';

import React, { useState } from 'react';
import { X, Wallet, CreditCard } from 'lucide-react';
import { createAdvance } from '../../lib/ipFlexibleBillingService';

interface IPAdvanceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  bedAllocationId: string;
  patientId: string;
  patientName: string;
  onSuccess: () => void;
}

export default function IPAdvanceReceiptModal({
  isOpen,
  onClose,
  bedAllocationId,
  patientId,
  patientName,
  onSuccess
}: IPAdvanceReceiptModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<string>('cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [advanceDate, setAdvanceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);

  const paymentTypes = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'net_banking', label: 'Net Banking' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'insurance', label: 'Insurance' }
  ];

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amt);
  };

  const handleSave = async () => {
    if (amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsSaving(true);
    try {
      await createAdvance({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        amount,
        payment_type: paymentType as any,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        advance_date: new Date(advanceDate).toISOString()
      });

      alert('Advance received successfully!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save advance:', error);
      alert('Failed to save advance. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setAmount(0);
    setPaymentType('cash');
    setReferenceNumber('');
    setNotes('');
    setAdvanceDate(new Date().toISOString().slice(0, 10));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                Receive Advance
              </h2>
              <p className="text-purple-100 mt-1">Patient: {patientName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700">
              <strong>Note:</strong> Advance payments can be used later to pay bills. 
              The advance balance will be tracked and can be applied during bill payment.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advance Date
              </label>
              <input
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {paymentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Transaction ID / Cheque No."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Additional notes..."
            />
          </div>

          {/* Amount Display */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border-2 border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Advance Amount:</span>
              <span className="text-2xl font-bold text-purple-600">{formatCurrency(amount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 rounded-b-xl border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || amount <= 0}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              {isSaving ? 'Processing...' : 'Receive Advance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
