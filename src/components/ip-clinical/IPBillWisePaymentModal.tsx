'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CreditCard, Wallet, Check, AlertCircle } from 'lucide-react';
import {
  IPBillItem,
  IPAdvance,
  getBillItems,
  getAvailableAdvances,
  getTotalAvailableAdvance,
  createPaymentWithAllocations,
  payWithAdvance,
  BillCategory
} from '../../lib/ipFlexibleBillingService';

interface IPBillWisePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bedAllocationId: string;
  patientId: string;
  patientName: string;
  onPaymentSuccess: () => void;
}

interface BillItemSelection {
  billItem: IPBillItem;
  selected: boolean;
  payAmount: number;
}

const CATEGORY_LABELS: Record<BillCategory, string> = {
  bed_charges: 'Bed Charges',
  doctor_consultation: 'Doctor Consultation',
  doctor_services: 'Doctor Services',
  surgery: 'Surgery',
  pharmacy: 'Pharmacy',
  lab: 'Lab Tests',
  radiology: 'Radiology',
  nursing: 'Nursing',
  equipment: 'Equipment',
  consumables: 'Consumables',
  other: 'Other Charges'
};

export default function IPBillWisePaymentModal({
  isOpen,
  onClose,
  bedAllocationId,
  patientId,
  patientName,
  onPaymentSuccess
}: IPBillWisePaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [billItems, setBillItems] = useState<BillItemSelection[]>([]);
  const [availableAdvances, setAvailableAdvances] = useState<IPAdvance[]>([]);
  const [totalAvailableAdvance, setTotalAvailableAdvance] = useState(0);
  
  const [paymentType, setPaymentType] = useState<string>('cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [useAdvance, setUseAdvance] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  
  const [isSaving, setIsSaving] = useState(false);

  const paymentTypes = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'net_banking', label: 'Net Banking' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'insurance', label: 'Insurance' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, bedAllocationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [items, advances, totalAdvance] = await Promise.all([
        getBillItems(bedAllocationId),
        getAvailableAdvances(bedAllocationId),
        getTotalAvailableAdvance(bedAllocationId)
      ]);

      // Filter to only pending/partial items
      const pendingItems = items.filter(i => 
        i.payment_status === 'pending' || i.payment_status === 'partial'
      );

      setBillItems(pendingItems.map(item => ({
        billItem: item,
        selected: false,
        payAmount: item.pending_amount || 0
      })));

      setAvailableAdvances(advances);
      setTotalAvailableAdvance(totalAdvance);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleSelectItem = (index: number, selected: boolean) => {
    setBillItems(prev => prev.map((item, i) => 
      i === index ? { ...item, selected } : item
    ));
  };

  const handleSelectAll = (selected: boolean) => {
    setBillItems(prev => prev.map(item => ({ ...item, selected })));
  };

  const handlePayAmountChange = (index: number, amount: number) => {
    setBillItems(prev => prev.map((item, i) => {
      if (i === index) {
        const maxAmount = item.billItem.pending_amount || 0;
        return { ...item, payAmount: Math.min(amount, maxAmount) };
      }
      return item;
    }));
  };

  const handlePayFullAmount = (index: number) => {
    setBillItems(prev => prev.map((item, i) => 
      i === index ? { ...item, payAmount: item.billItem.pending_amount || 0 } : item
    ));
  };

  const getSelectedItems = () => billItems.filter(i => i.selected);
  
  const getTotalSelectedAmount = () => {
    return getSelectedItems().reduce((sum, i) => sum + i.payAmount, 0);
  };

  const getTotalPendingAmount = () => {
    return billItems.reduce((sum, i) => sum + (i.billItem.pending_amount || 0), 0);
  };

  const handleSavePayment = async () => {
    const selectedItems = getSelectedItems();
    
    if (selectedItems.length === 0) {
      alert('Please select at least one bill item to pay');
      return;
    }

    const totalPayment = getTotalSelectedAmount();
    if (totalPayment <= 0) {
      alert('Please enter valid payment amounts');
      return;
    }

    // Validate advance usage
    if (useAdvance && advanceAmount > 0) {
      if (advanceAmount > totalAvailableAdvance) {
        alert(`Advance amount cannot exceed available balance (${formatCurrency(totalAvailableAdvance)})`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const allocations = selectedItems.map(item => ({
        bill_item_id: item.billItem.id!,
        amount: item.payAmount
      }));

      // If using advance
      if (useAdvance && advanceAmount > 0) {
        // Split: advance portion
        const advanceAllocations = allocations.map(a => ({
          ...a,
          amount: Math.min(a.amount, (a.amount / totalPayment) * advanceAmount)
        }));

        await payWithAdvance(bedAllocationId, patientId, advanceAllocations);

        // Remaining portion with regular payment
        const remainingAmount = totalPayment - advanceAmount;
        if (remainingAmount > 0) {
          const remainingAllocations = allocations.map(a => ({
            ...a,
            amount: a.amount - (a.amount / totalPayment) * advanceAmount
          })).filter(a => a.amount > 0);

          if (remainingAllocations.length > 0) {
            await createPaymentWithAllocations({
              payment: {
                bed_allocation_id: bedAllocationId,
                patient_id: patientId,
                payment_type: paymentType as any,
                total_amount: remainingAmount,
                reference_number: referenceNumber || undefined,
                notes: notes || undefined,
                payment_date: new Date(paymentDate).toISOString()
              },
              allocations: remainingAllocations
            });
          }
        }
      } else {
        // Regular payment only
        await createPaymentWithAllocations({
          payment: {
            bed_allocation_id: bedAllocationId,
            patient_id: patientId,
            payment_type: paymentType as any,
            total_amount: totalPayment,
            reference_number: referenceNumber || undefined,
            notes: notes || undefined,
            payment_date: new Date(paymentDate).toISOString()
          },
          allocations
        });
      }

      alert('Payment recorded successfully!');
      onPaymentSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save payment:', error);
      alert('Failed to save payment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group items by category
  const groupedItems = billItems.reduce((acc, item) => {
    const cat = item.billItem.bill_category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<BillCategory, BillItemSelection[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Bill-wise Payment
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-600">Loading bills...</span>
            </div>
          ) : billItems.length === 0 ? (
            <div className="text-center py-12">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900">All Bills Paid!</h3>
              <p className="text-gray-600 mt-2">There are no pending bills for this patient.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600">Total Pending</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(getTotalPendingAmount())}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">Selected to Pay</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(getTotalSelectedAmount())}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600">Available Advance</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(totalAvailableAdvance)}</p>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={billItems.every(i => i.selected)}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="font-medium text-gray-700">Select All Bills</span>
                </label>
                <span className="text-sm text-gray-500">
                  ({getSelectedItems().length} of {billItems.length} selected)
                </span>
              </div>

              {/* Bill Items by Category */}
              <div className="space-y-4">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-800">
                      {CATEGORY_LABELS[category as BillCategory] || category}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({items.length} items)
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {items.map((item, idx) => {
                        const globalIndex = billItems.findIndex(b => b.billItem.id === item.billItem.id);
                        return (
                          <div 
                            key={item.billItem.id} 
                            className={`p-4 ${item.selected ? 'bg-green-50' : 'bg-white'} transition-colors`}
                          >
                            <div className="flex items-start gap-4">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={(e) => handleSelectItem(globalIndex, e.target.checked)}
                                className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500"
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900">{item.billItem.description}</p>
                                    <p className="text-sm text-gray-500">
                                      {item.billItem.quantity} × {formatCurrency(item.billItem.unit_price)}
                                      {item.billItem.discount_amount && item.billItem.discount_amount > 0 && (
                                        <span className="ml-2 text-green-600">
                                          (Discount: {formatCurrency(item.billItem.discount_amount)})
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">Net: {formatCurrency(item.billItem.net_amount || 0)}</p>
                                    <p className="text-sm text-gray-500">Paid: {formatCurrency(item.billItem.paid_amount || 0)}</p>
                                    <p className="font-bold text-red-600">Pending: {formatCurrency(item.billItem.pending_amount || 0)}</p>
                                  </div>
                                </div>
                                
                                {item.selected && (
                                  <div className="mt-3 flex items-center gap-3">
                                    <label className="text-sm text-gray-600">Pay Amount:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={item.billItem.pending_amount || 0}
                                      step="0.01"
                                      value={item.payAmount}
                                      onChange={(e) => handlePayAmountChange(globalIndex, parseFloat(e.target.value) || 0)}
                                      className="w-32 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                    <button
                                      onClick={() => handlePayFullAmount(globalIndex)}
                                      className="text-sm text-green-600 hover:text-green-800 underline"
                                    >
                                      Pay Full
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Method Section */}
              {getSelectedItems().length > 0 && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Payment Method</h3>
                  
                  {/* Use Advance Option */}
                  {totalAvailableAdvance > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useAdvance}
                          onChange={(e) => {
                            setUseAdvance(e.target.checked);
                            if (e.target.checked) {
                              setAdvanceAmount(Math.min(totalAvailableAdvance, getTotalSelectedAmount()));
                            } else {
                              setAdvanceAmount(0);
                            }
                          }}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <Wallet className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-purple-800">Use Advance Balance</span>
                        <span className="text-purple-600">({formatCurrency(totalAvailableAdvance)} available)</span>
                      </label>
                      
                      {useAdvance && (
                        <div className="mt-3 ml-8">
                          <label className="text-sm text-gray-600">Amount from Advance:</label>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(totalAvailableAdvance, getTotalSelectedAmount())}
                            step="0.01"
                            value={advanceAmount}
                            onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                            className="ml-3 w-40 px-3 py-1 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => setAdvanceAmount(Math.min(totalAvailableAdvance, getTotalSelectedAmount()))}
                            className="ml-2 text-sm text-purple-600 hover:text-purple-800 underline"
                          >
                            Use Max
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Regular Payment */}
                  {(!useAdvance || advanceAmount < getTotalSelectedAmount()) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={paymentType}
                          onChange={(e) => setPaymentType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                          Reference Number
                        </label>
                        <input
                          type="text"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Transaction ID / Cheque No."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {billItems.length > 0 && (
          <div className="sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">Total Payment:</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(getTotalSelectedAmount())}</span>
                </div>
                {useAdvance && advanceAmount > 0 && (
                  <div className="text-sm text-purple-600">
                    From Advance: {formatCurrency(advanceAmount)} | 
                    Cash/Card: {formatCurrency(getTotalSelectedAmount() - advanceAmount)}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePayment}
                  disabled={isSaving || getSelectedItems().length === 0 || getTotalSelectedAmount() <= 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CreditCard className="h-5 w-5" />
                  {isSaving ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
