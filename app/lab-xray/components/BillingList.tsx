import { useMemo, useState } from 'react';
import { 
  Search, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  Printer, 
  Eye, 
  X,
  Calendar
} from 'lucide-react';
import UniversalPaymentModal from '../../../src/components/UniversalPaymentModal';
import type { PaymentRecord } from '../../../src/lib/universalPaymentService';
import { supabase } from '../../../src/lib/supabase';

interface BillingListProps {
  items: any[];
  onRefresh: () => void;
}

export default function BillingList({ items, onRefresh }: BillingListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const getBillingStatus = (bill: any): 'pending' | 'partial' | 'paid' => {
    const status = String(bill?.payment_status || '').toLowerCase();
    if (status === 'paid' || status === 'partial' || status === 'pending') return status;
    return 'pending';
  };

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (items || []).filter((bill: any) => {
      const billNo = String(bill.bill_no || bill.bill_number || '').toLowerCase();
      const patientName = String(bill.patient?.name || '').toLowerCase();
      const patientId = String(bill.patient?.patient_id || '').toLowerCase();

      const matchesSearch = !term || billNo.includes(term) || patientName.includes(term) || patientId.includes(term);
      const matchesStatus = statusFilter === 'all' || getBillingStatus(bill) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  const toPaymentRecord = (bill: any): PaymentRecord => {
    const billTotal = Number(bill.total ?? bill.subtotal ?? 0);
    const tax = Number(bill.tax ?? 0);
    const discount = Number(bill.discount ?? 0);
    const subtotal = Number(bill.subtotal ?? 0);
    const itemsForModal = (bill.items || []).map((it: any) => ({
      service_name: it.description,
      quantity: Number(it.qty) || 1,
      unit_rate: Number(it.unit_amount) || 0,
      total_amount: Number(it.total_amount) || 0,
      item_type: 'service' as const,
      reference_id: it.ref_id || null,
    }));

    return {
      id: bill.id,
      bill_id: bill.bill_no ?? bill.bill_number ?? bill.id,
      patient_id: bill.patient_id,
      bill_date: bill.issued_at ? String(bill.issued_at).split('T')[0] : new Date().toISOString().split('T')[0],
      items: itemsForModal,
      subtotal,
      tax_amount: tax,
      discount_amount: discount,
      total_amount: billTotal,
      payment_status: bill.payment_status || 'pending',
      payment_method: bill.payment_method || undefined,
      payment_date: bill.issued_at || undefined,
      created_at: bill.created_at || new Date().toISOString(),
      updated_at: bill.updated_at || new Date().toISOString(),
    };
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

  const openViewBill = async (bill: any) => {
    setSelectedBill(bill);
    setShowViewModal(true);
    setViewLoading(true);
    setViewItems([]);

    try {
      // Fetch bill items from billing_item table
      const { data: itemsData, error: itemsError } = await supabase
        .from('billing_item')
        .select('*')
        .eq('billing_id', bill.id)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Error fetching bill items:', itemsError);
        setViewItems([]);
      } else {
        setViewItems(itemsData || []);
      }
    } catch (error) {
      console.error('Failed to load bill data:', error);
      setViewItems([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handleThermalPrint = () => {
    if (!selectedBill) return;

    // If we don't have items yet, fetch them first
    if (viewItems.length === 0) {
      openViewBill(selectedBill);
      return;
    }

    const now = new Date();
    const billDate = selectedBill.created_at ? new Date(selectedBill.created_at) : now;

    const billNumber = selectedBill.bill_number || selectedBill.invoice_number || String(selectedBill.id || '').slice(0, 8).toUpperCase();
    const patientUhid = selectedBill.patient?.patient_id || selectedBill.patient?.uhid || selectedBill.patient_id || '';
    const patientName = selectedBill.patient?.name || '';
    const currentStatus = getBillingStatus(selectedBill);
    const displayPaymentMethod = selectedBill.payment_method;
    const salesType = currentStatus === 'paid' ? String(displayPaymentMethod || 'cash').toUpperCase() : 'CREDIT';

    const amount = Number(selectedBill.total ?? selectedBill.subtotal ?? 0);
    const cgstAmount = 0;
    const sgstAmount = 0;
    const discountAmount = Number(selectedBill.discount ?? 0);
    const taxableAmount = amount - discountAmount;
    const totalAmount = amount;

    // Use viewItems if available, otherwise fall back to selectedBill.items
    const lineItems = viewItems.length > 0 ? viewItems : (Array.isArray(selectedBill.items) ? selectedBill.items : []);
    const itemsHtml = lineItems
      .map((it: any, idx: number) => {
        const qty = Number(it.qty) || 1;
        const total = Number(it.total_amount) || 0;
        return `
          <tr>
            <td class="items-8cm">${idx + 1}.</td>
            <td class="items-8cm">${escapeHtml(it.description || it.test_name || it.service_name || 'Service')}</td>
            <td class="items-8cm text-center">${qty}</td>
            <td class="items-8cm text-right">${total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${escapeHtml(billNumber)}</title>
          <style>
            @page { margin: 1mm; size: 77mm 297mm; }
            body { 
              font-family: 'Verdana', sans-serif; 
              font-weight: bold;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0; 
              padding: 2px;
              font-size: 14px;
              line-height: 1.2;
              width: 77mm;
            }
            html, body { background: #fff; }
            .header-14cm { font-size: 16pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-9cm { font-size: 11pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-10cm { font-size: 12pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .items-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .bill-info-10cm { font-size: 12pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .bill-info-bold { font-weight: bold; font-family: 'Verdana', sans-serif; }
            .footer-7cm { font-size: 9pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .center { text-align: center; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .right { text-align: right; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table { width: 100%; border-collapse: collapse; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table td { padding: 1px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .totals-line { display: flex; justify-content: space-between; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .footer { margin-top: 15px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .signature-area { margin-top: 25px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .logo { width: 350px; height: auto; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="/logo/annamHospital-bk.png" alt="ANNAM LOGO" class="logo" />
            <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
            <div class="header-9cm">Phone- 04639 252592</div>
            <div style="margin-top: 5px; font-weight: bold;">LAB & RADIOLOGY BILL</div>
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
                <td class="header-10cm">Payment Type&nbsp;:&nbsp;&nbsp;</td>
                <td class="header-10cm bill-info-bold">${escapeHtml(salesType)}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 10px;">
            <table class="table">
              <tr style="border-bottom: 1px dashed #000;">
                <td width="30%" class="items-8cm">S.No</td>
                <td width="40%" class="items-8cm">Service</td>
                <td width="15%" class="items-8cm text-center">Qty</td>
                <td width="15%" class="items-8cm text-right">Amt</td>
              </tr>
              ${itemsHtml}
            </table>
          </div>

          <div style="margin-top: 10px;">
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
            (function() {
              function triggerPrint() {
                try {
                  window.focus();
                } catch (e) {}
                setTimeout(function() {
                  window.print();
                }, 250);
              }

              window.onafterprint = function() {
                try {
                  window.close();
                } catch (e) {}
              };

              if (document.readyState === 'complete' || document.readyState === 'interactive') {
                triggerPrint();
              } else {
                document.addEventListener('DOMContentLoaded', triggerPrint);
              }
            })();
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
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBillTypeColor = (billType: string) => {
    switch (billType?.toLowerCase()) {
      case 'lab':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'radiology':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'scan':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBillTypeIcon = (billType: string) => {
    switch (billType?.toLowerCase()) {
      case 'lab':
        return '🧪';
      case 'radiology':
        return '📷';
      case 'scan':
        return '📡';
      default:
        return '📄';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by bill no, patient, or UHID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-700"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredItems.map((bill: any) => {
            const status = getBillingStatus(bill);
            const total = Number(bill.total ?? bill.subtotal ?? 0);
            const billNo = bill.bill_no || bill.bill_number || String(bill.id).slice(0, 8).toUpperCase();
            return (
              <div key={bill.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-extrabold text-gray-900 truncate">Bill #{billNo}</div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getBillTypeColor(bill.bill_type)}`}>
                      {getBillTypeIcon(bill.bill_type)} {String(bill.bill_type || 'lab').toUpperCase()}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusColor(status)}`}>
                      {String(status).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{bill.patient?.name} • {bill.patient?.patient_id}</div>
                  <div className="text-xs text-gray-500 truncate">Items: {(bill.items || []).length} • Total: ₹{total.toFixed(2)}</div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedBill(bill);
                      setShowPaymentModal(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-black hover:bg-black inline-flex items-center gap-2"
                    title="Pay"
                  >
                    <CreditCard size={16} />
                    Pay
                  </button>
                  <button
                    onClick={() => openViewBill(bill)}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-xs font-black hover:bg-gray-200 inline-flex items-center gap-2"
                    title="View"
                  >
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBill(bill);
                      handleThermalPrint();
                    }}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-xs font-black hover:bg-gray-200 inline-flex items-center gap-2"
                    title="Print"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-sm text-gray-500">No bills found.</div>
          )}
        </div>

        {showPaymentModal && selectedBill && (
          <UniversalPaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedBill(null);
            }}
            bill={toPaymentRecord(selectedBill)}
            onSuccess={() => {
              setShowPaymentModal(false);
              setSelectedBill(null);
              onRefresh();
            }}
          />
        )}

        {/* View Modal */}
        {showViewModal && selectedBill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Bill Details</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedBill(null);
                    setViewItems([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {viewLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    <span className="ml-3 text-gray-600">Loading bill details...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Bill Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Bill Number</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedBill.bill_number || selectedBill.invoice_number || String(selectedBill.id).slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Bill Type</label>
                          <p className="text-lg font-semibold text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getBillTypeColor(selectedBill.bill_type)} mr-2`}>
                              {getBillTypeIcon(selectedBill.bill_type)} {String(selectedBill.bill_type || 'lab').toUpperCase()}
                            </span>
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Patient Name</label>
                          <p className="text-lg font-semibold text-gray-900">{selectedBill.patient?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">UHID</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedBill.patient?.patient_id || selectedBill.patient?.uhid || selectedBill.patient_id || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Bill Date</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedBill.created_at ? new Date(selectedBill.created_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Payment Status</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {getBillingStatus(selectedBill).toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Payment Method</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedBill.payment_method || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Services & Tests</h3>
                      {viewItems.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">S.No</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Service/Test Name</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Quantity</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewItems.map((item: any, index: number) => (
                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4 text-gray-900">{index + 1}</td>
                                  <td className="py-3 px-4 text-gray-900">
                                    {item.description || item.test_name || item.service_name || 'Unknown Service'}
                                  </td>
                                  <td className="py-3 px-4 text-center text-gray-900">{item.qty || 1}</td>
                                  <td className="py-3 px-4 text-right text-gray-900">
                                    ₹{Number(item.total_amount || 0).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-gray-300">
                                <td colSpan={3} className="py-3 px-4 text-right font-semibold text-gray-900">
                                  Total Amount:
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-lg text-gray-900">
                                  ₹{Number(selectedBill.total || selectedBill.subtotal || 0).toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-gray-500">No items found for this bill</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              {!viewLoading && (
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedBill(null);
                      setViewItems([]);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleThermalPrint();
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Printer size={16} />
                    Print Bill
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
