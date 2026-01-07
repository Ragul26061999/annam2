'use client';

import React, { useState } from 'react';
import { X, Download, Printer, FileText, Calendar, Clock, User, IndianRupee, CreditCard, Building, Smartphone } from 'lucide-react';
import { getPaymentHistory } from '../lib/financeService';

interface BillingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingRecord: any;
}

export default function BillingDetailsModal({ isOpen, onClose, billingRecord }: BillingDetailsModalProps) {
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'receipt'>('details');

  React.useEffect(() => {
    if (isOpen && billingRecord?.bill_id) {
      loadPaymentHistory();
    }
  }, [isOpen, billingRecord]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const history = await getPaymentHistory(billingRecord.bill_id);
      setPaymentHistory(history);
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash': return <IndianRupee className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'upi': return <Smartphone className="h-4 w-4" />;
      case 'bank_transfer': return <Building className="h-4 w-4" />;
      case 'insurance': return <Building className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    // Create a simple printable version
    const printContent = `
      BILL DETAILS
      ==============
      
      Bill Number: ${billingRecord.bill_id}
      Bill Date: ${formatDate(billingRecord.bill_date)}
      Patient: ${billingRecord.patient?.first_name} ${billingRecord.patient?.last_name}
      UHID: ${billingRecord.patient?.uhid}
      
      Amount Details:
      ==============
      Subtotal: ${formatAmount(billingRecord.subtotal || 0)}
      Tax Amount: ${formatAmount(billingRecord.tax_amount || 0)}
      Discount: ${formatAmount(billingRecord.discount_amount || 0)}
      Total Amount: ${formatAmount(billingRecord.total_amount)}
      
      Payment Status: ${billingRecord.payment_status?.toUpperCase()}
      Payment Method: ${billingRecord.payment_method || 'Pending'}
      
      Payment History:
      ==============
      ${paymentHistory.map(payment => `
      Date: ${formatDate(payment.payment_date)}
      Time: ${payment.payment_time}
      Amount: ${formatAmount(payment.amount_paid)}
      Method: ${payment.payment_method}
      Reference: ${payment.transaction_reference || 'N/A'}
      `).join('')}
    `;

    const blob = new Blob([printContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-${billingRecord.bill_id}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Billing Details</h2>
              <p className="text-white/80">{billingRecord.bill_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Printer size={20} />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Download size={20} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'details'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={16} className="mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'payments'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CreditCard size={16} className="mr-2" />
              Payments
            </button>
            <button
              onClick={() => setActiveTab('receipt')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'receipt'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={16} className="mr-2" />
              Receipt
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <User size={16} className="mr-2" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">
                      {billingRecord.patient?.first_name} {billingRecord.patient?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">UHID</p>
                    <p className="font-medium text-gray-900">{billingRecord.patient?.uhid}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{billingRecord.patient?.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bill Date</p>
                    <p className="font-medium text-gray-900">{formatDate(billingRecord.bill_date)}</p>
                  </div>
                </div>
              </div>

              {/* Billing Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText size={16} className="mr-2" />
                  Billing Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">{formatAmount(billingRecord.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax Amount</span>
                    <span className="font-medium text-gray-900">{formatAmount(billingRecord.tax_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Discount</span>
                    <span className="font-medium text-gray-900">{formatAmount(billingRecord.discount_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-sm font-semibold text-gray-900">Total Amount</span>
                    <span className="font-bold text-lg text-gray-900">{formatAmount(billingRecord.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard size={16} className="mr-2" />
                  Payment Status
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(billingRecord.payment_status)}`}>
                      {billingRecord.payment_status?.charAt(0).toUpperCase() + billingRecord.payment_status?.slice(1)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium text-gray-900">{billingRecord.payment_method || 'Pending'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : paymentHistory.length > 0 ? (
                paymentHistory.map((payment, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-lg">
                          {getPaymentMethodIcon(payment.payment_method)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{formatAmount(payment.amount_paid)}</p>
                          <p className="text-sm text-gray-600">{payment.payment_method?.charAt(0).toUpperCase() + payment.payment_method?.slice(1)}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar size={12} className="mr-1" />
                            {formatDate(payment.payment_date)}
                            <Clock size={12} className="ml-2 mr-1" />
                            {payment.payment_time}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Reference</p>
                        <p className="font-medium text-gray-900">{payment.transaction_reference || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No payment history available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'receipt' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">PAYMENT RECEIPT</h2>
                  <p className="text-gray-600">Receipt #REC-{Date.now().toString().slice(-6)}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bill Number:</span>
                    <span className="font-medium">{billingRecord.bill_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Patient:</span>
                    <span className="font-medium">
                      {billingRecord.patient?.first_name} {billingRecord.patient?.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">UHID:</span>
                    <span className="font-medium">{billingRecord.patient?.uhid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(billingRecord.bill_date)}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-lg">{formatAmount(billingRecord.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-medium">{formatAmount(billingRecord.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Balance:</span>
                      <span className="font-medium">₹0</span>
                    </div>
                  </div>
                  <div className="border-t pt-4 mt-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(billingRecord.payment_status)}`}>
                        {billingRecord.payment_status?.charAt(0).toUpperCase() + billingRecord.payment_status?.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
