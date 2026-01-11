'use client';

import React, { useState } from 'react';
import { Eye, Trash2, CreditCard, FileText, Filter } from 'lucide-react';
import { 
  type OtherBillWithPatient,
  type ChargeCategory,
  type PatientType,
  type PaymentStatus,
  CHARGE_CATEGORIES,
  cancelOtherBill
} from '../lib/otherBillsService';
import UniversalPaymentModal from './UniversalPaymentModal';
import type { PaymentRecord } from '../lib/universalPaymentService';

interface OtherBillsListProps {
  bills: OtherBillWithPatient[];
  onBillClick?: (bill: OtherBillWithPatient) => void;
  onRefresh?: () => void;
}

export default function OtherBillsList({ bills, onBillClick, onRefresh }: OtherBillsListProps) {
  const [filterPatientType, setFilterPatientType] = useState<PatientType | 'all'>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ChargeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<PaymentRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const filteredBills = bills.filter((bill) => {
    if (filterPatientType !== 'all' && bill.patient_type !== filterPatientType) return false;
    if (filterPaymentStatus !== 'all' && bill.payment_status !== filterPaymentStatus) return false;
    if (filterCategory !== 'all' && bill.charge_category !== filterCategory) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        bill.bill_number.toLowerCase().includes(query) ||
        bill.patient_name.toLowerCase().includes(query) ||
        bill.charge_description.toLowerCase().includes(query) ||
        (bill.patient_phone && bill.patient_phone.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  const handleCancelBill = async (billId: string) => {
    if (!confirm('Are you sure you want to cancel this bill?')) return;

    try {
      await cancelOtherBill(billId);
      onRefresh?.();
    } catch (error) {
      console.error('Error cancelling bill:', error);
      alert('Failed to cancel bill');
    }
  };

  const handlePaymentClick = (bill: OtherBillWithPatient) => {
    setSelectedBillForPayment({
      id: bill.id,
      bill_id: bill.bill_number,
      patient_id: bill.patient_id || '',
      bill_date: bill.bill_date,
      items: [{
        service_name: bill.charge_description,
        quantity: bill.quantity,
        unit_rate: bill.unit_price,
        total_amount: bill.total_amount,
        item_type: 'service',
      }],
      subtotal: bill.subtotal,
      tax_amount: bill.tax_amount,
      discount_amount: bill.discount_amount,
      total_amount: bill.total_amount,
      payment_status: bill.payment_status as 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled',
      created_at: bill.created_at,
      updated_at: bill.updated_at,
    });
    setShowPaymentModal(true);
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getCategoryLabel = (category: ChargeCategory) => {
    const cat = CHARGE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by bill number, patient name, phone, or description..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient Type</label>
            <select
              value={filterPatientType}
              onChange={(e) => setFilterPatientType(e.target.value as PatientType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="IP">Inpatient (IP)</option>
              <option value="OP">Outpatient (OP)</option>
              <option value="Emergency">Emergency</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value as PaymentStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Charge Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ChargeCategory | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {CHARGE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No bills found
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">{bill.bill_number}</div>
                      {bill.reference_number && (
                        <div className="text-xs text-gray-500">Ref: {bill.reference_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(bill.bill_date)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{bill.patient_name}</div>
                      {bill.patient_phone && (
                        <div className="text-xs text-gray-500">{bill.patient_phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {bill.patient_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{getCategoryLabel(bill.charge_category)}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {bill.charge_description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ₹{bill.total_amount.toLocaleString('en-IN')}
                      </div>
                      {bill.paid_amount > 0 && (
                        <div className="text-xs text-green-600">
                          Paid: ₹{bill.paid_amount.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{bill.balance_amount.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(bill.payment_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onBillClick?.(bill)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {bill.payment_status !== 'paid' && bill.payment_status !== 'cancelled' && (
                          <button
                            onClick={() => handlePaymentClick(bill)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Process Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        
                        {bill.status === 'active' && bill.payment_status !== 'paid' && (
                          <button
                            onClick={() => handleCancelBill(bill.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel Bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Showing {filteredBills.length} of {bills.length} bills
        </div>
        <div>
          Total: ₹{filteredBills.reduce((sum, bill) => sum + bill.total_amount, 0).toLocaleString('en-IN')}
        </div>
      </div>

      {showPaymentModal && selectedBillForPayment && (
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedBillForPayment(null);
          }}
          bill={selectedBillForPayment}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedBillForPayment(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
