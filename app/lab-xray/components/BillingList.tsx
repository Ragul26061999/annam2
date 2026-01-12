import { useState } from 'react';
import { 
  Search, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  Printer, 
  Eye, 
  X
} from 'lucide-react';
import { updateDiagnosticBillingStatus } from '../../../src/lib/labXrayService';

interface BillingListProps {
  items: any[];
  onRefresh: () => void;
}

export default function BillingList({ items, onRefresh }: BillingListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer' | 'insurance'>('cash');

  const getBillingStatus = (item: any): 'pending' | 'billed' | 'paid' => {
    const status = String(item?.billing_status || '').toLowerCase();
    if (status === 'paid' || status === 'billed' || status === 'pending') return status;
    if (item?.paid_at) return 'paid';
    if (item?.billed_at) return 'billed';
    return 'pending';
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.test_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.patient?.patient_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || getBillingStatus(item) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handlePayment = async () => {
    if (!selectedBill) return;

    try {
      setProcessingPayment(true);
      await updateDiagnosticBillingStatus(selectedBill.id, 'paid', paymentMethod);
      setShowPaymentModal(false);
      setSelectedBill(null);
      onRefresh();
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const escapeHtml = (value: any) => {
    const str = String(value ?? '');
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  const formatPrintedDateTime = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${mi}:${ss}`;
  };

  const formatBillDateTime = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mon = months[date.getMonth()];
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${dd}-${mon}-${yyyy} ${hh}:${mi}:${ss}`;
  };

  const handleThermalPrint = () => {
    if (!selectedBill) return;

    const now = new Date();
    const billDate = selectedBill.created_at ? new Date(selectedBill.created_at) : now;

    const billNumber = selectedBill.bill_number || selectedBill.invoice_number || String(selectedBill.id || '').slice(0, 8).toUpperCase();
    const patientUhid = selectedBill.patient?.patient_id || selectedBill.patient?.uhid || selectedBill.patient_id || '';
    const patientName = selectedBill.patient?.name || '';
    const currentStatus = getBillingStatus(selectedBill);
    const displayPaymentMethod = selectedBill.payment_method || paymentMethod;
    const salesType = currentStatus === 'paid' ? String(displayPaymentMethod || 'cash').toUpperCase() : 'CREDIT';

    const amount = Number(selectedBill.amount || 0);
    const cgstAmount = 0;
    const sgstAmount = 0;
    const discountAmount = 0;
    const taxableAmount = amount;
    const totalAmount = amount;

    const itemsHtml = `
      <tr>
        <td class="items-8cm">1.</td>
        <td class="items-8cm">${escapeHtml(selectedBill.test_name || selectedBill.service_name || 'Service')}</td>
        <td class="items-8cm text-center">1</td>
        <td class="items-8cm text-right">${totalAmount.toFixed(2)}</td>
      </tr>
    `;

    const thermalContent = `
      <html>
      <head>
        <title>Thermal Receipt - ${escapeHtml(billNumber)}</title>
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
          .header-14cm { font-size: 14pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
          .header-9cm { font-size: 9pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
          .header-10cm { font-size: 10pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
          .header-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
          .items-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
          .bill-info-10cm { font-size: 10pt; font-family: 'Times New Roman', Times, serif; }
          .bill-info-bold { font-weight: bold; font-family: 'Times New Roman', Times, serif; }
          .footer-7cm { font-size: 7pt; font-family: 'Times New Roman', Times, serif; }
          .center { text-align: center; font-family: 'Times New Roman', Times, serif; }
          .right { text-align: right; font-family: 'Times New Roman', Times, serif; }
          .table { width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; }
          .table td { padding: 2px; font-family: 'Times New Roman', Times, serif; }
          .totals-line { display: flex; justify-content: space-between; font-family: 'Times New Roman', Times, serif; }
          .footer { margin-top: 20px; font-family: 'Times New Roman', Times, serif; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="header-14cm">ANNAM DIAGNOSTICS</div>
          <div>Lab & Radiology Receipt</div>
          <div style="margin-top: 5px; font-weight: bold;">INVOICE</div>
        </div>

        <div style="margin-top: 10px;">
          <table class="table">
            <tr>
              <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
              <td class="bill-info-10cm bill-info-bold">${escapeHtml(billNumber)}</td>
            </tr>
            <tr>
              <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
              <td class="bill-info-10cm bill-info-bold">${escapeHtml(patientUhid)}</td>
            </tr>
            <tr>
              <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
              <td class="bill-info-10cm bill-info-bold">${escapeHtml(patientName)}</td>
            </tr>
            <tr>
              <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
              <td class="bill-info-10cm bill-info-bold">${escapeHtml(formatBillDateTime(billDate))}</td>
            </tr>
            <tr>
              <td class="header-10cm">Sales Type&nbsp;:&nbsp;&nbsp;</td>
              <td class="header-10cm bill-info-bold">${escapeHtml(salesType)}</td>
            </tr>
            <tr>
              <td class="header-10cm">Pay Status&nbsp;:&nbsp;&nbsp;</td>
              <td class="header-10cm bill-info-bold">${escapeHtml(String(currentStatus).toUpperCase())}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 10px;">
          <table class="table">
            <tr style="border-bottom: 1px dashed #000;">
              <td width="30%" class="items-8cm">S.No</td>
              <td width="40%" class="items-8cm">Test / Service</td>
              <td width="15%" class="items-8cm text-center">Qty</td>
              <td width="15%" class="items-8cm text-right">Amt</td>
            </tr>
            ${itemsHtml}
          </table>
        </div>

        <div style="margin-top: 10px;">
          <div class="totals-line items-8cm">
            <span>Taxable Amount</span>
            <span>${taxableAmount.toFixed(2)}</span>
          </div>
          <div class="totals-line items-8cm">
            <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
            <span>${discountAmount.toFixed(2)}</span>
          </div>
          <div class="totals-line items-8cm">
            <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
            <span>${cgstAmount.toFixed(2)}</span>
          </div>
          <div class="totals-line header-8cm">
            <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
            <span>${sgstAmount.toFixed(2)}</span>
          </div>
          <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
            <span>Total Amount</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <div class="totals-line footer-7cm">
            <span>Printed on ${escapeHtml(formatPrintedDateTime(now))}</span>
            <span>Authorized Sign</span>
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
    if (!printWindow) return;
    printWindow.document.write(thermalContent);
    printWindow.document.close();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'billed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentMethodLabel = (value: any) => {
    const v = String(value || '').toLowerCase();
    if (!v) return '—';
    if (v === 'cash') return 'CASH';
    if (v === 'card') return 'CARD';
    if (v === 'upi') return 'UPI';
    if (v === 'bank_transfer') return 'BANK';
    if (v === 'insurance') return 'INSURANCE';
    return v.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient, test, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="billed">Billed</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Test / Service</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Method</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{item.patient?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500">{item.patient?.patient_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.test_name}
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 uppercase">
                      {item.order_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    ₹{item.amount?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                    {getPaymentMethodLabel(item.payment_method)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(getBillingStatus(item))}`}>
                      {getBillingStatus(item).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedBill(item);
                          setPaymentMethod((item.payment_method || 'cash') as any);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      
                      {getBillingStatus(item) !== 'paid' && (
                        <button
                          onClick={() => {
                            setSelectedBill(item);
                            setPaymentMethod((item.payment_method || 'cash') as any);
                            setShowPaymentModal(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Make Payment"
                        >
                          <CreditCard size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No billing records found matching your criteria.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {selectedBill && !showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-teal-600" />
                Bill Details
              </h3>
              <button 
                onClick={() => setSelectedBill(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6" id="printable-bill">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">INVOICE</h4>
                  <p className="text-gray-500 text-sm mt-1">#{selectedBill.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(getBillingStatus(selectedBill))}`}>
                    {getBillingStatus(selectedBill).toUpperCase()}
                  </div>
                  <p className="text-gray-500 text-sm mt-2">
                    Date: {new Date(selectedBill.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Method: {getPaymentMethodLabel(selectedBill.payment_method)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 py-6 border-t border-b border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Billed To</p>
                  <p className="font-bold text-gray-900 text-lg">{selectedBill.patient?.name}</p>
                  <p className="text-gray-600">{selectedBill.patient?.patient_id}</p>
                  <p className="text-gray-600">{selectedBill.patient?.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Service Details</p>
                  <p className="font-bold text-gray-900">{selectedBill.test_name}</p>
                  <p className="text-gray-600 capitalize">{selectedBill.order_type} Service</p>
                </div>
              </div>

              <div className="flex justify-between items-center py-4">
                <span className="font-bold text-gray-900 text-lg">Total Amount</span>
                <span className="font-bold text-teal-600 text-2xl">₹{selectedBill.amount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleThermalPrint}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 flex items-center gap-2"
              >
                <Printer size={18} />
                Print (77mm)
              </button>
              {getBillingStatus(selectedBill) !== 'paid' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 text-white bg-teal-600 rounded-lg font-semibold hover:bg-teal-700 flex items-center gap-2 shadow-lg shadow-teal-200"
                >
                  <CreditCard size={18} />
                  Pay Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="text-teal-600" />
                Confirm Payment
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-semibold text-gray-900">{selectedBill.test_name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Patient:</span>
                  <span className="font-semibold text-gray-900">{selectedBill.patient?.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Payment Method:</span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={processingPayment}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                  <span className="font-bold text-gray-900">Total Amount:</span>
                  <span className="font-bold text-teal-600 text-lg">₹{selectedBill.amount?.toFixed(2)}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 text-center">
                Please confirm that you have received the payment from the patient.
              </p>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 px-4 py-3 text-white bg-teal-600 rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 flex justify-center items-center gap-2"
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>Processing...</>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
