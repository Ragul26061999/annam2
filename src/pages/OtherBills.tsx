'use client';

import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Download, TrendingUp, DollarSign, FileText, AlertCircle, Printer, CreditCard, X, ChevronDown, Eye } from 'lucide-react';
import OtherBillsForm from '../components/OtherBillsForm';
import OtherBillsList from '../components/OtherBillsList';
import OtherBillPrintTemplate from '../components/OtherBillPrintTemplate';
import OtherBillsPaymentModal from '../components/OtherBillsPaymentModal';
import { 
  getOtherBills, 
  getOtherBillsStats,
  CHARGE_CATEGORIES,
  type OtherBillWithPatient 
} from '../lib/otherBillsService';

export default function OtherBills() {
  const [bills, setBills] = useState<OtherBillWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<OtherBillWithPatient | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [billForPayment, setBillForPayment] = useState<OtherBillWithPatient | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showThermalModal, setShowThermalModal] = useState(false);
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);

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
    setBillForPayment(bill);
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
                    <div className="relative">
                      <button
                        onClick={() => setShowPrintDropdown(!showPrintDropdown)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      
                      {showPrintDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <button
                            onClick={() => {
                              setShowPrintDropdown(false);
                              setShowThermalModal(true);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 transition-colors rounded-t-lg"
                          >
                            <Printer className="w-4 h-4 text-blue-600" />
                            <span>Thermal Print</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowPrintDropdown(false);
                              handlePrint();
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 transition-colors rounded-b-lg"
                          >
                            <FileText className="w-4 h-4 text-gray-600" />
                            <span>Normal Print</span>
                          </button>
                        </div>
                      )}
                    </div>
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
        <OtherBillsPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setBillForPayment(null);
          }}
          bill={{
            id: billForPayment.id,
            bill_number: billForPayment.bill_number,
            total_amount: billForPayment.total_amount,
            balance_amount: billForPayment.balance_amount,
            payment_status: billForPayment.payment_status,
          }}
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

      {/* Thermal Print Modal */}
      {showThermalModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Thermal Print Preview</h3>
              <button
                onClick={() => setShowThermalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="bg-white p-4 border border-gray-200 rounded font-mono text-sm">
              {/* Thermal Print Content - Following exact format from guide */}
              <div className="center" style={{ textAlign: 'center', fontFamily: 'Times New Roman, Times, serif' }}>
                <div className="header-14cm" style={{ fontSize: '14pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>ANNAM HOSPITAL</div>
                <div style={{ fontFamily: 'Times New Roman, Times, serif' }}>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
                <div className="header-9cm" style={{ fontSize: '9pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>Phone- 04639 252592</div>
                <div className="header-10cm" style={{ fontSize: '10pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>Gst No: 33AJWPR2713G2ZZ</div>
                <div style={{ marginTop: '5px', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>INVOICE</div>
              </div>
              
              {/* Bill Information Section */}
              <div style={{ marginTop: '10px' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Times New Roman, Times, serif' }}>
                  <tbody>
                    <tr>
                      <td className="bill-info-10cm" style={{ fontSize: '10pt', fontFamily: 'Times New Roman, Times, serif' }}>Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                      <td className="bill-info-10cm bill-info-bold" style={{ fontSize: '10pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>{selectedBill.bill_number}</td>
                    </tr>
                    <tr>
                      <td className="bill-info-10cm" style={{ fontSize: '10pt', fontFamily: 'Times New Roman, Times, serif' }}>Patient Name&nbsp;:&nbsp;&nbsp;</td>
                      <td className="bill-info-10cm bill-info-bold" style={{ fontSize: '10pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>{selectedBill.patient_name}</td>
                    </tr>
                    <tr>
                      <td className="bill-info-10cm" style={{ fontSize: '10pt', fontFamily: 'Times New Roman, Times, serif' }}>Patient Type&nbsp;:&nbsp;&nbsp;</td>
                      <td className="bill-info-10cm bill-info-bold" style={{ fontSize: '10pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>{selectedBill.patient_type}</td>
                    </tr>
                    <tr>
                      <td className="bill-info-10cm" style={{ fontSize: '10pt', fontFamily: 'Times New Roman, Times, serif' }}>Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                      <td className="bill-info-10cm bill-info-bold" style={{ fontSize: '10pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>{new Date(selectedBill.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(selectedBill.bill_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</td>
                    </tr>
                    <tr>
                      <td className="header-10cm" style={{ fontSize: '10pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>Sales Type&nbsp;:&nbsp;&nbsp;</td>
                      <td className="header-10cm bill-info-bold" style={{ fontSize: '10pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>{selectedBill.payment_status === 'paid' ? 'PAID' : 'CASH'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Items Table Section */}
              <div style={{ marginTop: '10px' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Times New Roman, Times, serif' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #000' }}>
                      <td width="30%" className="items-8cm" style={{ fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>S.No</td>
                      <td width="40%" className="items-8cm" style={{ fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>Description</td>
                      <td width="15%" className="items-8cm text-center" style={{ fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', textAlign: 'center' }}>Qty</td>
                      <td width="15%" className="items-8cm text-right" style={{ fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', textAlign: 'right' }}>Amt</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="items-8cm" style={{ fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>1.</td>
                      <td className="items-8cm" style={{ fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>{selectedBill.charge_description}</td>
                      <td className="items-8cm text-center" style={{ fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', textAlign: 'center' }}>{selectedBill.quantity}</td>
                      <td className="items-8cm text-right" style={{ fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', textAlign: 'right' }}>{selectedBill.total_amount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div style={{ marginTop: '10px' }}>
                <div className="totals-line items-8cm" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                  <span>Taxable Amount</span>
                  <span>{selectedBill.subtotal.toFixed(2)}</span>
                </div>
                <div className="totals-line items-8cm" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                  <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
                  <span>{selectedBill.discount_amount.toFixed(2)}</span>
                </div>
                <div className="totals-line items-8cm" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                  <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
                  <span>{(selectedBill.tax_amount / 2).toFixed(2)}</span>
                </div>
                <div className="totals-line header-8cm" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                  <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
                  <span>{(selectedBill.tax_amount / 2).toFixed(2)}</span>
                </div>
                <div className="totals-line header-10cm" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', borderTop: '1px solid #000', paddingTop: '2px' }}>
                  <span>Total Amount</span>
                  <span>{selectedBill.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer Section */}
              <div className="footer" style={{ marginTop: '20px', fontFamily: 'Times New Roman, Times, serif' }}>
                <div className="totals-line footer-7cm" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7pt', fontFamily: 'Times New Roman, Times, serif' }}>
                  <span>Printed on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                  <span>Billing Sign</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowThermalModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Print functionality using exact thermal format
                  const now = new Date();
                  const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                  
                  const thermalContent = `
                    <html>
                    <head>
                      <title>Thermal Receipt - ${selectedBill.bill_number}</title>
                      <style>
                        @page { margin: 5mm; size: 77mm 297mm; }
                        body { 
                          font-family: 'Times New Roman', Times, serif; 
                          margin: 0; 
                          padding: 10px;
                          font-size: 12px;
                          line-height: 1.2;
                          width: 77mm;
                        }
                        .header-14cm { font-size: 14pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                        .header-9cm { font-size: 9pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                        .header-10cm { font-size: 10pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                        .header-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                        .items-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                        .bill-info-10cm { font-size: 10pt; font-family: 'Times New Roman, Times, serif; }
                        .bill-info-bold { font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                        .footer-7cm { font-size: 7pt; font-family: 'Times New Roman, Times, serif; }
                        .center { text-align: center; font-family: 'Times New Roman, Times, serif; }
                        .right { text-align: right; font-family: 'Times New Roman, Times, serif; }
                        .table { width: 100%; border-collapse: collapse; font-family: 'Times New Roman, Times, serif; }
                        .table td { padding: 2px; font-family: 'Times New Roman, Times, serif; }
                        .totals-line { display: flex; justify-content: space-between; font-family: 'Times New Roman, Times, serif; }
                        .footer { margin-top: 20px; font-family: 'Times New Roman, Times, serif; }
                      </style>
                    </head>
                    <body>
                      <!-- Header Section -->
                      <div class="center">
                        <div class="header-14cm">ANNAM HOSPITAL</div>
                        <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
                        <div class="header-9cm">Phone- 04639 252592</div>
                        <div class="header-10cm">Gst No: 33AJWPR2713G2ZZ</div>
                        <div style="margin-top: 5px; font-weight: bold;">INVOICE</div>
                      </div>
                      
                      <!-- Bill Information Section -->
                      <div style="margin-top: 10px;">
                        <table class="table">
                          <tbody>
                            <tr>
                              <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                              <td class="bill-info-10cm bill-info-bold">${selectedBill.bill_number}</td>
                            </tr>
                            <tr>
                              <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                              <td class="bill-info-10cm bill-info-bold">${selectedBill.patient_name}</td>
                            </tr>
                            <tr>
                              <td class="bill-info-10cm">Patient Type&nbsp;:&nbsp;&nbsp;</td>
                              <td class="bill-info-10cm bill-info-bold">${selectedBill.patient_type}</td>
                            </tr>
                            <tr>
                              <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                              <td class="bill-info-10cm bill-info-bold">${new Date(selectedBill.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(selectedBill.bill_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</td>
                            </tr>
                            <tr>
                              <td class="header-10cm">Sales Type&nbsp;:&nbsp;&nbsp;</td>
                              <td class="header-10cm bill-info-bold">${selectedBill.payment_status === 'paid' ? 'PAID' : 'CASH'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <!-- Items Table Section -->
                      <div style="margin-top: 10px;">
                        <table class="table">
                          <thead>
                            <tr style="border-bottom: 1px dashed #000;">
                              <td width="30%" class="items-8cm">S.No</td>
                              <td width="40%" class="items-8cm">Description</td>
                              <td width="15%" class="items-8cm text-center">Qty</td>
                              <td width="15%" class="items-8cm text-right">Amt</td>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td class="items-8cm">1.</td>
                              <td class="items-8cm">${selectedBill.charge_description}</td>
                              <td class="items-8cm text-center">${selectedBill.quantity}</td>
                              <td class="items-8cm text-right">${selectedBill.total_amount.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <!-- Totals Section -->
                      <div style="margin-top: 10px;">
                        <div class="totals-line items-8cm">
                          <span>Taxable Amount</span>
                          <span>${selectedBill.subtotal.toFixed(2)}</span>
                        </div>
                        <div class="totals-line items-8cm">
                          <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
                          <span>${selectedBill.discount_amount.toFixed(2)}</span>
                        </div>
                        <div class="totals-line items-8cm">
                          <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
                          <span>${(selectedBill.tax_amount / 2).toFixed(2)}</span>
                        </div>
                        <div class="totals-line header-8cm">
                          <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
                          <span>${(selectedBill.tax_amount / 2).toFixed(2)}</span>
                        </div>
                        <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
                          <span>Total Amount</span>
                          <span>${selectedBill.total_amount.toFixed(2)}</span>
                        </div>
                      </div>

                      <!-- Footer Section -->
                      <div class="footer">
                        <div class="totals-line footer-7cm">
                          <span>Printed on ${printedDateTime}</span>
                          <span>Billing Sign</span>
                        </div>
                      </div>

                      <script>
                        window.onload = function() {
                          window.print();
                        }
                      </script>
                    </body>
                    </html>
                  `;
                  
                  const printWindow = window.open('', '_blank', 'width=400,height=600');
                  if (printWindow) {
                    printWindow.document.write(thermalContent);
                    printWindow.document.close();
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Printer size={16} className="inline mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
