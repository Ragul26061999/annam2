'use client';

import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Download, TrendingUp, DollarSign, FileText, AlertCircle, Printer, CreditCard, X } from 'lucide-react';
import OtherBillsForm from '../components/OtherBillsForm';
import OtherBillsList from '../components/OtherBillsList';
import OtherBillPrintTemplate from '../components/OtherBillPrintTemplate';
import UniversalPaymentModal from '../components/UniversalPaymentModal';
import { 
  getOtherBills, 
  getOtherBillsStats,
  CHARGE_CATEGORIES,
  type OtherBillWithPatient 
} from '../lib/otherBillsService';
import type { PaymentRecord } from '../lib/universalPaymentService';

export default function OtherBills() {
  const [bills, setBills] = useState<OtherBillWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<OtherBillWithPatient | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [billForPayment, setBillForPayment] = useState<PaymentRecord | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  };
  const [stats, setStats] = useState({
    total_bills: 0,
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
  });

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await getOtherBills({ status: 'active' });
      setBills(data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await getOtherBillsStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchBills();
    fetchStats();
  }, []);

  const handleRefresh = () => {
    fetchBills();
    fetchStats();
  };

  const handleBillClick = (bill: OtherBillWithPatient) => {
    setSelectedBill(bill);
  };

  const handlePaymentClick = (bill: OtherBillWithPatient) => {
    setBillForPayment({
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

  const getCategoryLabel = (category: string) => {
    const cat = CHARGE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Other Bills</h1>
            <p className="text-gray-600 mt-1">
              Manage miscellaneous hospital charges for IP, OP, and general patients
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Bill
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total_bills}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ₹{stats.total_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ₹{stats.paid_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  ₹{stats.pending_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Bills List</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <OtherBillsList 
                bills={bills} 
                onBillClick={handleBillClick}
                onRefresh={handleRefresh}
              />
            )}
          </div>
        </div>

        {selectedBill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Bill Details</h2>
                  <div className="flex items-center gap-2">
                    {selectedBill.payment_status !== 'paid' && selectedBill.payment_status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          handlePaymentClick(selectedBill);
                          setSelectedBill(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Payment
                      </button>
                    )}
                    <button
                      onClick={handlePrint}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <button
                      onClick={() => setSelectedBill(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Bill Number</p>
                      <p className="text-2xl font-bold text-blue-900">{selectedBill.bill_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600 font-medium">Payment Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${
                        selectedBill.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedBill.payment_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                        selectedBill.payment_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedBill.payment_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Date & Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(selectedBill.bill_date).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedBill.bill_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Charge Category</p>
                    <p className="text-lg font-semibold text-gray-900">{getCategoryLabel(selectedBill.charge_category)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Patient Name</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedBill.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Patient Type</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedBill.patient_type}</p>
                  </div>
                  {selectedBill.patient_phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedBill.patient_phone}</p>
                    </div>
                  )}
                  {selectedBill.reference_number && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Reference Number</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedBill.reference_number}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Charge Description</p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-900">{selectedBill.charge_description}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{selectedBill.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit Price:</span>
                    <span className="font-medium">₹{selectedBill.unit_price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{selectedBill.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedBill.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount ({selectedBill.discount_percent}%):</span>
                      <span className="font-medium text-red-600">-₹{selectedBill.discount_amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedBill.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax ({selectedBill.tax_percent}%):</span>
                      <span className="font-medium">₹{selectedBill.tax_amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Total Amount:</span>
                    <span className="font-bold text-xl text-blue-600">₹{selectedBill.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid Amount:</span>
                    <span className="font-medium text-green-600">₹{selectedBill.paid_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Balance:</span>
                    <span className="font-medium text-orange-600">₹{selectedBill.balance_amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {selectedBill.remarks && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Remarks</p>
                    <p className="text-gray-900">{selectedBill.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <OtherBillsForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleRefresh}
        />
      )}

      {showPaymentModal && billForPayment && (
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setBillForPayment(null);
          }}
          bill={billForPayment}
          onSuccess={() => {
            setShowPaymentModal(false);
            setBillForPayment(null);
            handleRefresh();
          }}
        />
      )}

      {showPrintView && selectedBill && (
        <div className="hidden print:block">
          <OtherBillPrintTemplate bill={selectedBill} />
        </div>
      )}
    </div>
  );
}
