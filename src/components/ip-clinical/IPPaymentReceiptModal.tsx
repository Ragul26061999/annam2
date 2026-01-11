'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PaymentSplit {
  id: string;
  payment_type: string;
  amount: number;
  reference_number?: string;
  notes?: string;
  payment_date?: string;
}

interface IPPaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  bedAllocationId: string;
  patientId: string;
  patientName: string;
  totalAmount: number;
  pendingAmount: number;
  onPaymentSuccess: () => void;
}

export default function IPPaymentReceiptModal({
  isOpen,
  onClose,
  bedAllocationId,
  patientId,
  patientName,
  totalAmount,
  pendingAmount,
  onPaymentSuccess
}: IPPaymentReceiptModalProps) {
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([
    {
      id: '1',
      payment_type: 'cash',
      amount: 0,
      reference_number: '',
      notes: '',
      payment_date: new Date().toISOString().slice(0, 10)
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const paymentTypes = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'net_banking', label: 'Net Banking' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'insurance', label: 'Insurance' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateTotalPayment = () => {
    return paymentSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
  };

  const handleAddSplit = () => {
    const newSplit: PaymentSplit = {
      id: Date.now().toString(),
      payment_type: 'cash',
      amount: 0,
      reference_number: '',
      notes: '',
      payment_date: new Date().toISOString().slice(0, 10)
    };
    setPaymentSplits([...paymentSplits, newSplit]);
  };

  const handleRemoveSplit = (id: string) => {
    if (paymentSplits.length > 1) {
      setPaymentSplits(paymentSplits.filter(split => split.id !== id));
    }
  };

  const handleUpdateSplit = (id: string, field: keyof PaymentSplit, value: any) => {
    setPaymentSplits(paymentSplits.map(split => {
      if (split.id === id) {
        return {
          ...split,
          [field]: field === 'amount' ? (parseFloat(value) || 0) : value
        };
      }
      return split;
    }));
  };

  const handleSavePayment = async () => {
    const totalPayment = calculateTotalPayment();
    
    if (totalPayment <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (totalPayment > pendingAmount) {
      alert(`Payment amount (${formatCurrency(totalPayment)}) cannot exceed pending amount (${formatCurrency(pendingAmount)})`);
      return;
    }

    setIsSaving(true);
    try {
      // Save each payment split
      const paymentRecords = paymentSplits.map(split => ({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        payment_type: split.payment_type,
        amount: split.amount,
        reference_number: split.reference_number || null,
        notes: split.notes || null,
        payment_date: split.payment_date ? new Date(split.payment_date).toISOString() : new Date().toISOString(),
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('ip_payment_receipts')
        .insert(paymentRecords);

      if (error) {
        console.error('Error saving payment:', error);
        throw error;
      }

      alert('Payment recorded successfully!');
      setPaymentSplits([
        {
          id: '1',
          payment_type: 'cash',
          amount: 0,
          reference_number: '',
          notes: '',
          payment_date: new Date().toISOString().slice(0, 10)
        }
      ]);
      onPaymentSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save payment:', error);
      alert('Failed to save payment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Receive Payment
              </h2>
              <p className="text-green-100 mt-1">Patient: {patientName}</p>
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
        <div className="p-6 space-y-6">
          {/* Payment Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Bill Amount</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Amount</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </div>

          {/* Payment Splits */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Payment Details</h3>
              <button
                onClick={handleAddSplit}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Split Payment
              </button>
            </div>

            <div className="space-y-4">
              {paymentSplits.map((split, index) => (
                <div key={split.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900">Payment {index + 1}</h4>
                    {paymentSplits.length > 1 && (
                      <button
                        onClick={() => handleRemoveSplit(split.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={split.payment_date || new Date().toISOString().slice(0, 10)}
                        onChange={(e) => handleUpdateSplit(split.id, 'payment_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={split.payment_type}
                        onChange={(e) => handleUpdateSplit(split.id, 'payment_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {paymentTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={split.amount}
                        onChange={(e) => handleUpdateSplit(split.id, 'amount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={split.reference_number}
                        onChange={(e) => handleUpdateSplit(split.id, 'reference_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Transaction ID / Cheque No."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={split.notes}
                        onChange={(e) => handleUpdateSplit(split.id, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Total */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Payment Amount:</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotalPayment())}</span>
            </div>
            {calculateTotalPayment() > pendingAmount && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Payment amount exceeds pending amount
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-xl border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePayment}
              disabled={isSaving || calculateTotalPayment() <= 0 || calculateTotalPayment() > pendingAmount}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              {isSaving ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
