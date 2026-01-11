'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, DollarSign, CreditCard, Smartphone, Building, CheckCircle } from 'lucide-react';
import { recordPayment } from '../lib/otherBillsService';

interface OtherBillsPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    id: string;
    bill_number: string;
    total_amount: number;
    balance_amount: number;
    payment_status: string;
  };
  onSuccess?: () => void;
}

interface PaymentSplit {
  method: 'cash' | 'card' | 'upi' | 'gpay' | 'phonepe' | 'paytm' | 'net_banking' | 'cheque' | 'insurance' | 'credit' | 'others';
  amount: number;
  transaction_reference?: string;
  bank_name?: string;
  cheque_number?: string;
  cheque_date?: string;
  notes?: string;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: <DollarSign className="w-4 h-4" /> },
  { value: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'upi', label: 'UPI', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'gpay', label: 'Google Pay', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'phonepe', label: 'PhonePe', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'paytm', label: 'Paytm', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'net_banking', label: 'Net Banking', icon: <Building className="w-4 h-4" /> },
  { value: 'cheque', label: 'Cheque', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'insurance', label: 'Insurance', icon: <Building className="w-4 h-4" /> },
  { value: 'credit', label: 'Credit', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'others', label: 'Others', icon: <DollarSign className="w-4 h-4" /> },
];

export default function OtherBillsPaymentModal({ isOpen, onClose, bill, onSuccess }: OtherBillsPaymentModalProps) {
  const [payments, setPayments] = useState<PaymentSplit[]>([
    { method: 'cash', amount: bill.balance_amount }
  ]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = bill.balance_amount - totalPaid;

  const addPaymentRow = () => {
    setPayments([...payments, { method: 'cash', amount: 0 }]);
  };

  const removePaymentRow = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePayment = (index: number, field: keyof PaymentSplit, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Math.abs(totalPaid - bill.balance_amount) > 0.01) {
      setError('Payment amount must equal the balance amount');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Process each payment
      for (const payment of payments) {
        await recordPayment(bill.id, {
          payment_method: payment.method,
          payment_amount: payment.amount,
          transaction_reference: payment.transaction_reference,
          bank_name: payment.bank_name,
          cheque_number: payment.cheque_number,
          cheque_date: payment.cheque_date,
          notes: payment.notes,
        });
      }

      setSuccess(true);
      onSuccess?.();
      
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setPayments([{ method: 'cash', amount: bill.balance_amount }]);
      }, 2000);
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Process Payment</h2>
              <p className="text-sm text-gray-600 mt-1">Bill: {bill.bill_number}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">The payment has been processed successfully.</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Amount:</span>
                  <span className="text-lg font-bold text-gray-900">₹{bill.total_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Balance Due:</span>
                  <span className="text-lg font-bold text-orange-600">₹{bill.balance_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Total Payment:</span>
                  <span className={`text-lg font-bold ${remaining === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    ₹{totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>
                {remaining !== 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Remaining:</span>
                    <span className={`text-lg font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{Math.abs(remaining).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                  <button
                    type="button"
                    onClick={addPaymentRow}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment
                  </button>
                </div>

                {payments.map((payment, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Payment {index + 1}</h4>
                      {payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePaymentRow(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method *
                        </label>
                        <select
                          value={payment.method}
                          onChange={(e) => updatePayment(index, 'method', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount (₹) *
                        </label>
                        <input
                          type="number"
                          value={payment.amount}
                          onChange={(e) => updatePayment(index, 'amount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {(payment.method === 'card' || payment.method === 'net_banking') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={payment.bank_name || ''}
                            onChange={(e) => updatePayment(index, 'bank_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {payment.method === 'cheque' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Cheque Number
                            </label>
                            <input
                              type="text"
                              value={payment.cheque_number || ''}
                              onChange={(e) => updatePayment(index, 'cheque_number', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Cheque Date
                            </label>
                            <input
                              type="date"
                              value={payment.cheque_date || ''}
                              onChange={(e) => updatePayment(index, 'cheque_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Transaction Reference
                        </label>
                        <input
                          type="text"
                          value={payment.transaction_reference || ''}
                          onChange={(e) => updatePayment(index, 'transaction_reference', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>
                        <textarea
                          value={payment.notes || ''}
                          onChange={(e) => updatePayment(index, 'notes', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || remaining !== 0}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Process Payment'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
