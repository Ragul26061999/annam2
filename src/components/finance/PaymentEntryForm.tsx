'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, IndianRupee, CreditCard, Smartphone, Wallet, Building, Check } from 'lucide-react';

interface PaymentSplit {
  id: string;
  mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque';
  amount: number;
  reference?: string;
  bankName?: string;
  chequeNumber?: string;
}

interface PaymentEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: PaymentData) => void;
  totalAmount: number;
  patientId?: string;
  patientName?: string;
  billId?: string;
}

interface PaymentData {
  totalAmount: number;
  splits: PaymentSplit[];
  paymentDate: string;
  notes?: string;
  patientId?: string;
  patientName?: string;
  billId?: string;
}

const paymentModes = [
  { value: 'cash', label: 'Cash', icon: Wallet, color: 'bg-green-100 text-green-600' },
  { value: 'card', label: 'Card', icon: CreditCard, color: 'bg-blue-100 text-blue-600' },
  { value: 'upi', label: 'UPI', icon: Smartphone, color: 'bg-purple-100 text-purple-600' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building, color: 'bg-orange-100 text-orange-600' },
  { value: 'cheque', label: 'Cheque', icon: CreditCard, color: 'bg-gray-100 text-gray-600' }
];

export default function PaymentEntryForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  totalAmount, 
  patientId, 
  patientName, 
  billId 
}: PaymentEntryFormProps) {
  const [splits, setSplits] = useState<PaymentSplit[]>([
    { id: '1', mode: 'cash', amount: totalAmount }
  ]);
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTotalSplitAmount = () => {
    return splits.reduce((sum, split) => sum + split.amount, 0);
  };

  const getRemainingAmount = () => {
    return totalAmount - getTotalSplitAmount();
  };

  const addSplit = () => {
    const newSplit: PaymentSplit = {
      id: Date.now().toString(),
      mode: 'cash',
      amount: getRemainingAmount() > 0 ? getRemainingAmount() : 0
    };
    setSplits([...splits, newSplit]);
  };

  const removeSplit = (id: string) => {
    if (splits.length > 1) {
      setSplits(splits.filter(split => split.id !== id));
    }
  };

  const updateSplit = (id: string, field: keyof PaymentSplit, value: any) => {
    setSplits(splits.map(split => 
      split.id === id ? { ...split, [field]: value } : split
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalSplitAmount = getTotalSplitAmount();
    if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
      alert(`Total split amount (${formatCurrency(totalSplitAmount)}) must equal total amount (${formatCurrency(totalAmount)})`);
      return;
    }

    const paymentData: PaymentData = {
      totalAmount,
      splits,
      paymentDate,
      notes,
      patientId,
      patientName,
      billId
    };

    onSubmit(paymentData);
    onClose();
    
    // Reset form
    setSplits([{ id: '1', mode: 'cash', amount: totalAmount }]);
    setNotes('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Payment Entry</h2>
              <p className="text-blue-100 mt-1">Record payment with split modes</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Patient and Bill Info */}
          {(patientId || patientName || billId) && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Transaction Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {patientName && (
                  <div>
                    <span className="text-gray-500">Patient:</span>
                    <p className="font-medium text-gray-900">{patientName}</p>
                  </div>
                )}
                {patientId && (
                  <div>
                    <span className="text-gray-500">Patient ID:</span>
                    <p className="font-medium text-gray-900">{patientId}</p>
                  </div>
                )}
                {billId && (
                  <div>
                    <span className="text-gray-500">Bill ID:</span>
                    <p className="font-medium text-gray-900">{billId}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-gray-600 text-sm">Total Amount</span>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Split Total</span>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalSplitAmount())}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Remaining</span>
                <p className={`text-2xl font-bold ${getRemainingAmount() === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatCurrency(getRemainingAmount())}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Splits */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Splits</h3>
              <button
                type="button"
                onClick={addSplit}
                disabled={getRemainingAmount() <= 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={16} />
                Add Split
              </button>
            </div>

            <div className="space-y-4">
              {splits.map((split, index) => (
                <div key={split.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Payment {index + 1}</h4>
                    {splits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSplit(split.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Payment Mode */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Mode
                      </label>
                      <select
                        value={split.mode}
                        onChange={(e) => updateSplit(split.id, 'mode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {paymentModes.map(mode => (
                          <option key={mode.value} value={mode.value}>
                            {mode.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={split.amount}
                        onChange={(e) => updateSplit(split.id, 'amount', parseFloat(e.target.value) || 0)}
                        min="0"
                        max={getRemainingAmount() + split.amount}
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Reference Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={split.reference || ''}
                        onChange={(e) => updateSplit(split.id, 'reference', e.target.value)}
                        placeholder={split.mode === 'cash' ? 'Optional' : 'Required'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={split.mode !== 'cash'}
                      />
                    </div>

                    {/* Conditional Fields */}
                    {split.mode === 'bank_transfer' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={split.bankName || ''}
                          onChange={(e) => updateSplit(split.id, 'bankName', e.target.value)}
                          placeholder="Bank name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}

                    {split.mode === 'cheque' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={split.bankName || ''}
                            onChange={(e) => updateSplit(split.id, 'bankName', e.target.value)}
                            placeholder="Bank name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cheque Number
                          </label>
                          <input
                            type="text"
                            value={split.chequeNumber || ''}
                            onChange={(e) => updateSplit(split.id, 'chequeNumber', e.target.value)}
                            placeholder="Cheque number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Math.abs(getTotalSplitAmount() - totalAmount) > 0.01}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={16} />
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
