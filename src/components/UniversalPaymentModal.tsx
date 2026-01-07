'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Smartphone, Building, CheckCircle, AlertCircle } from 'lucide-react';
import { processSplitPayments, type PaymentRecord, type PaymentSplit } from '../lib/universalPaymentService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: PaymentRecord | null;
  onSuccess?: () => void;
}

interface Payment {
  method: 'cash' | 'card' | 'upi' | 'gpay' | 'ghpay' | 'insurance' | 'credit' | 'others';
  amount: number;
  transaction_reference?: string;
  notes?: string;
}

export default function UniversalPaymentModal({ isOpen, onClose, bill, onSuccess }: PaymentModalProps) {
  const [payments, setPayments] = useState<Payment[]>([
    { method: 'cash', amount: bill?.total_amount || 0 }
  ]);

  useEffect(() => {
    if (bill) {
      setPayments([{ method: 'cash', amount: bill.total_amount }]);
    }
  }, [bill]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = (bill?.total_amount || 0) - totalPaid;

  const addPaymentRow = () => {
    setPayments([...payments, { method: 'cash', amount: 0 }]);
  };

  const removePaymentRow = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const updatePayment = (index: number, field: keyof Payment, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bill || Math.abs(totalPaid - bill.total_amount) > 0.01) {
      setError('Payment amount must equal the total bill amount');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Convert Payment interface to PaymentSplit
      const paymentSplits: PaymentSplit[] = payments.map(p => ({
        method: p.method,
        amount: p.amount,
        transaction_reference: p.transaction_reference,
        notes: p.notes
      }));

      // Process split payments (writes to billing_payments + updates billing header)
      await processSplitPayments(bill.id, paymentSplits);

      setSuccess(true);
      onSuccess?.();
      
      // Close modal after success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <DollarSign className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'upi': return <Smartphone className="w-4 h-4" />;
      case 'insurance': return <Building className="w-4 h-4" />;
      case 'gpay': return <Smartphone className="w-4 h-4" />;
      case 'ghpay': return <Smartphone className="w-4 h-4" />;
      case 'credit': return <Building className="w-4 h-4" />;
      case 'others': return <DollarSign className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Process Payment</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Bill Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Bill Number:</span>
              <span className="font-semibold">{bill?.bill_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Total Amount:</span>
              <span className="text-xl font-bold text-gray-900">
                ₹{bill?.total_amount?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Payment Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                bill?.payment_status === 'paid' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {bill?.payment_status?.toUpperCase() || 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Payment has been processed successfully.</p>
            </div>
          ) : (
            <>
              {/* Payment Rows */}
              <div className="space-y-3 mb-6">
                {payments.map((payment, index) => (
                  <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-12 gap-3">
                      {/* Payment Method */}
                      <div className="col-span-4">
                        <select
                          value={payment.method}
                          onChange={(e) => updatePayment(index, 'method', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                          <option value="gpay">GPay</option>
                          <option value="ghpay">GHPay</option>
                          <option value="insurance">Insurance</option>
                          <option value="credit">Credit</option>
                          <option value="others">Others</option>
                        </select>
                      </div>

                      {/* Amount */}
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={payment.amount}
                          onChange={(e) => updatePayment(index, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>

                      {/* Reference */}
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={payment.transaction_reference || ''}
                          onChange={(e) => updatePayment(index, 'transaction_reference', e.target.value)}
                          placeholder="Reference (Optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1">
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePaymentRow(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Payment Row */}
                <button
                  type="button"
                  onClick={addPaymentRow}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                >
                  + Add Payment Method
                </button>
              </div>

              {/* Payment Summary */}
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Paid:</span>
                    <span className="font-semibold">₹{totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining:</span>
                    <span className={`font-semibold ${remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      ₹{Math.abs(remaining).toLocaleString()}
                      {remaining < 0 && ' (Overpaid)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !bill || Math.abs(totalPaid - bill.total_amount) > 0.01}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Complete Payment'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
