'use client';

import React from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CreditCard, 
  FileText, 
  IndianRupee,
  CheckCircle,
  AlertCircle,
  Clock as PendingIcon,
  XCircle
} from 'lucide-react';
import { type BillingRecord } from '../lib/financeService';

interface TransactionViewModalProps {
  record: BillingRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionViewModal({ record, isOpen, onClose }: TransactionViewModalProps) {
  if (!isOpen || !record) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending': return <PendingIcon className="h-5 w-5 text-orange-600" />;
      case 'partial': return <AlertCircle className="h-5 w-5 text-blue-600" />;
      case 'overdue': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-gray-600" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-600" />;
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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSourceConfig = (source: string) => {
    switch (source) {
      case 'billing': return { label: 'Consultation & Billing', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'pharmacy': return { label: 'Pharmacy', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'lab': return { label: 'Lab Test', color: 'text-purple-600', bgColor: 'bg-purple-100' };
      case 'radiology': return { label: 'Radiology', color: 'text-orange-600', bgColor: 'bg-orange-100' };
      case 'diagnostic': return { label: 'Diagnostic', color: 'text-pink-600', bgColor: 'bg-pink-100' };
      default: return { label: source, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const sourceConfig = getSourceConfig(record.source);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
              <p className="text-sm text-gray-500 mt-1">{record.bill_id}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Source */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(record.payment_status)}`}>
                {getStatusIcon(record.payment_status)}
                <span className="ml-1">{record.payment_status?.charAt(0).toUpperCase() + record.payment_status?.slice(1)}</span>
              </span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${sourceConfig.bgColor} ${sourceConfig.color}`}>
                {sourceConfig.label}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(record.total_amount)}</p>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Patient Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">
                  {record.patient?.name || 'Unknown Patient'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient ID</p>
                <p className="font-medium text-gray-900">
                  {record.patient?.patient_id || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">
                  {record.patient?.phone || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient ID</p>
                <p className="font-medium text-gray-900">
                  {record.patient_id || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Billing Details */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Billing Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Bill Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(record.bill_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created Time</p>
                <p className="font-medium text-gray-900">
                  {new Date(record.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-900 flex items-center">
                  {record.payment_method ? (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {record.payment_method?.charAt(0).toUpperCase() + record.payment_method?.slice(1)}
                    </>
                  ) : (
                    'Pending'
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Date</p>
                <p className="font-medium text-gray-900">
                  {record.payment_date ? new Date(record.payment_date).toLocaleDateString('en-IN') : 'Not paid yet'}
                </p>
              </div>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <IndianRupee className="h-4 w-4 mr-2" />
              Amount Breakdown
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatAmount(record.subtotal)}</span>
              </div>
              {record.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tax Amount</span>
                  <span className="font-medium text-gray-900">{formatAmount(record.tax_amount)}</span>
                </div>
              )}
              {record.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Discount</span>
                  <span className="font-medium text-red-600">-{formatAmount(record.discount_amount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total Amount</span>
                <span className="font-bold text-lg text-gray-900">{formatAmount(record.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Transaction Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Bill Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(record.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              {record.payment_status === 'paid' && record.payment_date && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Payment Completed</p>
                    <p className="text-xs text-gray-500">
                      {new Date(record.payment_date).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  record.payment_status === 'paid' ? 'bg-green-600' : 
                  record.payment_status === 'pending' ? 'bg-orange-600' : 
                  record.payment_status === 'overdue' ? 'bg-red-600' : 'bg-gray-600'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Current Status</p>
                  <p className="text-xs text-gray-500 capitalize">{record.payment_status}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
