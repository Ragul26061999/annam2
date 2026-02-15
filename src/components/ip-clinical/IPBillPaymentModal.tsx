'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Wallet, CreditCard, Smartphone, Building2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAvailableAdvances, getTotalAvailableAdvance } from '../../lib/ipFlexibleBillingService';

interface IPBillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bedAllocationId: string;
  patientId: string;
  patientName: string;
  bill: {
    id: string;
    bill_type: 'other_bill' | 'pharmacy' | 'lab' | 'radiology' | 'bed_charges' | 'doctor_consultation';
    bill_number?: string;
    description: string;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
  };
  onPaymentSuccess: () => void;
}

type PaymentMethod = 'cash' | 'card' | 'upi' | 'net_banking' | 'advance';

export default function IPBillPaymentModal({
  isOpen,
  onClose,
  bedAllocationId,
  patientId,
  patientName,
  bill,
  onPaymentSuccess
}: IPBillPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState<number>(Math.round(bill.pending_amount));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availableAdvance, setAvailableAdvance] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAmount(Math.round(bill.pending_amount));
      setPaymentMethod('cash');
      setReferenceNumber('');
      setNotes('');
      setError(null);
      setSuccess(false);
      loadAvailableAdvance();
    }
  }, [isOpen, bill.pending_amount]);

  const loadAvailableAdvance = async () => {
    try {
      const advance = await getTotalAvailableAdvance(bedAllocationId);
      setAvailableAdvance(Math.round(advance));
    } catch (err) {
      console.error('Error loading advance:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount));
  };

  const handlePayment = async () => {
    if (amount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    const roundedAmount = Math.round(amount);
    const roundedPending = Math.round(bill.pending_amount);

    if (roundedAmount > roundedPending) {
      setError(`Payment amount cannot exceed pending amount (${formatCurrency(roundedPending)})`);
      return;
    }

    if (paymentMethod === 'advance' && roundedAmount > availableAdvance) {
      setError(`Insufficient advance balance. Available: ${formatCurrency(availableAdvance)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (bill.bill_type === 'other_bill') {
        await processOtherBillPayment(roundedAmount);
      } else {
        await processGenericBillPayment(roundedAmount);
      }

      setSuccess(true);
      setTimeout(() => {
        onPaymentSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const processOtherBillPayment = async (paymentAmount: number) => {
    const currentPaid = Math.round(Number(bill.paid_amount) || 0);
    const totalAmount = Math.round(Number(bill.total_amount) || 0);
    const newPaidAmount = currentPaid + paymentAmount;
    const newBalanceAmount = Math.max(0, totalAmount - newPaidAmount);
    const newStatus = newBalanceAmount <= 0 ? 'paid' : 'pending';

    // Update the other_bills record
    const { error: updateError } = await supabase
      .from('other_bills')
      .update({
        paid_amount: newPaidAmount,
        balance_amount: newBalanceAmount,
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', bill.id);

    if (updateError) {
      throw new Error(`Failed to update bill: ${updateError.message}`);
    }

    // If using advance, deduct from advance
    if (paymentMethod === 'advance') {
      await deductFromAdvance(paymentAmount);
    }

    // Record the payment transaction
    await recordPaymentTransaction(paymentAmount, 'other_bills', bill.id);
  };

  const processGenericBillPayment = async (paymentAmount: number) => {
    // Handle pharmacy_bills table
    if (bill.bill_type === 'pharmacy') {
      const currentPaid = Math.round(Number(bill.paid_amount) || 0);
      const totalAmount = Math.round(Number(bill.total_amount) || 0);
      const newPaidAmount = currentPaid + paymentAmount;
      const newBalanceAmount = Math.max(0, totalAmount - newPaidAmount);
      const newStatus = newBalanceAmount <= 0 ? 'paid' : 'pending';

      const { error: updateError } = await supabase
        .from('pharmacy_bills')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalanceAmount,
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bill.id);

      if (updateError) {
        throw new Error(`Failed to update pharmacy bill: ${updateError.message}`);
      }
    }

    // Handle diagnostic_billing_items table (lab/radiology)
    if (bill.bill_type === 'lab' || bill.bill_type === 'radiology') {
      const newStatus = paymentAmount >= Math.round(bill.total_amount) ? 'paid' : 'partial';

      const { error: updateError } = await supabase
        .from('diagnostic_billing_items')
        .update({
          billing_status: newStatus,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', bill.id);

      if (updateError) {
        throw new Error(`Failed to update diagnostic billing item: ${updateError.message}`);
      }
    }

    // If using advance, deduct from advance
    if (paymentMethod === 'advance') {
      await deductFromAdvance(paymentAmount);
    }

    // Record the payment transaction
    await recordPaymentTransaction(paymentAmount, bill.bill_type, bill.id);
  };

  const deductFromAdvance = async (amountToDeduct: number) => {
    // Get available advances in FIFO order
    const advances = await getAvailableAdvances(bedAllocationId);
    let remainingAmount = amountToDeduct;

    for (const advance of advances) {
      if (remainingAmount <= 0) break;

      const availableInAdvance = Math.round(Number(advance.available_amount) || 0);
      const deductAmount = Math.min(remainingAmount, availableInAdvance);

      if (deductAmount > 0) {
        const newUsedAmount = Math.round(Number(advance.used_amount) || 0) + deductAmount;
        const newAvailableAmount = Math.round(Number(advance.amount) || 0) - newUsedAmount;
        const newStatus = newAvailableAmount <= 0 ? 'fully_used' : 'active';

        const { error: advanceError } = await supabase
          .from('ip_advances')
          .update({
            used_amount: newUsedAmount,
            available_amount: newAvailableAmount,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', advance.id);

        if (advanceError) {
          throw new Error(`Failed to update advance: ${advanceError.message}`);
        }

        remainingAmount -= deductAmount;
      }
    }

    if (remainingAmount > 0) {
      throw new Error('Insufficient advance balance');
    }
  };

  const recordPaymentTransaction = async (paymentAmount: number, sourceTable: string, sourceId: string) => {
    const { error: paymentError } = await supabase
      .from('ip_bill_payments')
      .insert({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        payment_date: new Date().toISOString(),
        payment_type: paymentMethod,
        total_amount: paymentAmount,
        reference_number: referenceNumber || null,
        notes: notes || `Payment for ${bill.description}`,
        receipt_number: `IPR-${Date.now()}`
      });

    if (paymentError) {
      console.error('Failed to record payment transaction:', paymentError);
    }
  };

  const paymentMethods = [
    { id: 'cash' as PaymentMethod, label: 'Cash', icon: DollarSign, color: 'green' },
    { id: 'card' as PaymentMethod, label: 'Card', icon: CreditCard, color: 'blue' },
    { id: 'upi' as PaymentMethod, label: 'UPI', icon: Smartphone, color: 'purple' },
    { id: 'net_banking' as PaymentMethod, label: 'Net Banking', icon: Building2, color: 'indigo' },
    { id: 'advance' as PaymentMethod, label: 'Advance', icon: Wallet, color: 'orange', disabled: availableAdvance <= 0 }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Receive Payment</h2>
              <p className="text-green-100 text-sm">{patientName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
              <p className="text-gray-600 mt-2">Payment of {formatCurrency(amount)} recorded</p>
            </div>
          ) : (
            <>
              {/* Bill Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Bill</span>
                  <span className="font-semibold text-gray-900">{bill.bill_number || bill.description}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(bill.total_amount)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Already Paid</span>
                  <span className="font-semibold text-green-600">{formatCurrency(bill.paid_amount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium text-gray-700">Pending Amount</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(bill.pending_amount)}</span>
                </div>
              </div>

              {/* Available Advance Info */}
              {availableAdvance > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-orange-600" />
                    <span className="text-sm text-orange-800">
                      Available Advance: <strong>{formatCurrency(availableAdvance)}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    const isDisabled = method.disabled;
                    return (
                      <button
                        key={method.id}
                        onClick={() => !isDisabled && setPaymentMethod(method.id)}
                        disabled={isDisabled}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          isDisabled
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? `border-${method.color}-500 bg-${method.color}-50 text-${method.color}-700`
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Math.round(Number(e.target.value) || 0))}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                    min="1"
                    max={Math.round(bill.pending_amount)}
                    step="1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Max: {formatCurrency(bill.pending_amount)}
                  {paymentMethod === 'advance' && ` | Advance Available: ${formatCurrency(availableAdvance)}`}
                </p>
              </div>

              {/* Reference Number (for non-cash payments) */}
              {paymentMethod !== 'cash' && paymentMethod !== 'advance' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Transaction ID / Reference"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading || amount <= 0}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-5 w-5" />
                      Pay {formatCurrency(amount)}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
