'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Paperclip, Printer, RefreshCw, Search, Trash2, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';

interface OrdersFromBillingProps {
  items: any[];
  onRefresh?: () => void;
}

type PaymentStatus = 'pending' | 'partial' | 'paid';

type AttachmentMap = Record<string, any[]>;

export default function OrdersFromBilling({ items, onRefresh }: OrdersFromBillingProps) {
  console.log('OrdersFromBilling component - items received:', items);
  console.log('OrdersFromBilling component - items length:', items?.length);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [attachmentsByBillId, setAttachmentsByBillId] = useState<AttachmentMap>({});
  const [uploadingBillId, setUploadingBillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragOverBillId, setDragOverBillId] = useState<string | null>(null);
  const [lastDeletedAttachmentId, setLastDeletedAttachmentId] = useState<string | null>(null);

  const getBillingStatus = (bill: any): PaymentStatus => {
    const status = String(bill?.payment_status || '').toLowerCase();
    if (status === 'paid' || status === 'partial' || status === 'pending') return status;
    return 'pending';
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'pending':
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
 
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, bill: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragOverBillId(null);

    const files = e.dataTransfer.files;
    if (files && files.length) {
      void handleUpload(bill, files);
    }
  };

  const getAppUserId = async (): Promise<string> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error('User not authenticated');
    }

    const { data: appUser, error: appUserError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authData.user.id)
      .maybeSingle();

    if (appUserError) throw appUserError;
    if (!appUser?.id) throw new Error('No user profile found');
    return appUser.id;
  };

  const fetchAttachments = async (billIds: string[]) => {
    if (!billIds.length) {
      console.log('fetchAttachments: No bill IDs provided');
      setAttachmentsByBillId({});
      return;
    }

    console.log('fetchAttachments: Querying for bill IDs:', billIds);
    const { data, error: fetchError } = await supabase
      .from('lab_xray_attachments')
      .select('*')
      .in('billing_id', billIds)
      .order('uploaded_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching attachments:', fetchError);
      setAttachmentsByBillId({});
      return;
    }

    console.log('fetchAttachments: Raw data from Supabase:', data);
    const byBill: AttachmentMap = {};
    (data || []).forEach((row: any) => {
      const id = row.billing_id;
      if (!id) return;
      byBill[id] = byBill[id] || [];
      byBill[id].push(row);
    });
    console.log('fetchAttachments: Processed byBill map:', byBill);
    setAttachmentsByBillId(byBill);
  };

  const handleDeleteAttachment = async (attachment: any) => {
    console.log('Attempting to delete attachment:', attachment);
    
    if (!window.confirm(`Are you sure you want to delete "${attachment.file_name}"?`)) {
      console.log('User cancelled deletion');
      return;
    }

    try {
      console.log('Starting deletion process for attachment:', attachment.id);
      
      // Delete from Supabase Storage first
      if (attachment.file_path) {
        console.log('Deleting from storage:', attachment.file_path);
        const { error: storageError } = await supabase.storage
          .from('lab-xray-attachments')
          .remove([attachment.file_path]);
        
        if (storageError) {
          console.warn('Failed to delete from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        } else {
          console.log('Successfully deleted from storage');
        }
      }

      // Delete from database
      console.log('Deleting from database:', attachment.id);
      const { error: dbError, data } = await supabase
        .from('lab_xray_attachments')
        .delete()
        .eq('id', attachment.id)
        .select();

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw dbError;
      }

      if (!data || data.length === 0) {
        throw new Error('Not permitted to delete this attachment (permission policy)');
      }

      console.log('Successfully deleted from database:', data);

      // Immediately update local state to remove the deleted attachment
      setAttachmentsByBillId(prev => {
        const newAttachments = { ...prev };
        if (newAttachments[attachment.billing_id]) {
          newAttachments[attachment.billing_id] = newAttachments[attachment.billing_id].filter(
            (att: any) => att.id !== attachment.id
          );
          // If no attachments left for this bill, remove the entry
          if (newAttachments[attachment.billing_id].length === 0) {
            delete newAttachments[attachment.billing_id];
          }
        }
        console.log('Updated local attachments state:', newAttachments);
        return newAttachments;
      });
      
      // Track this attachment as recently deleted
      setLastDeletedAttachmentId(attachment.id);
      
      // Show success message immediately
      alert('Attachment deleted successfully!');

      // Refetch from DB to ensure refresh shows correct data
      const billIds = (items || []).map((b: any) => b.id).filter(Boolean);
      await fetchAttachments(billIds);
    } catch (e: any) {
      console.error('Delete attachment error:', e);
      setError(e?.message || 'Failed to delete attachment');
      alert(`Failed to delete attachment: ${e?.message || 'Unknown error'}`);
    }
  };

  const filteredBills = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (items || []).filter((bill: any) => {
      const billNo = String(bill.bill_no || bill.bill_number || String(bill.id).slice(0, 8)).toLowerCase();
      const patientName = String(bill.patient?.name || '').toLowerCase();
      const patientId = String(bill.patient?.patient_id || '').toLowerCase();

      const matchesSearch = !term || billNo.includes(term) || patientName.includes(term) || patientId.includes(term);
      const matchesStatus = statusFilter === 'all' || getBillingStatus(bill) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  useEffect(() => {
    const billIds = (items || []).map((b: any) => b.id).filter(Boolean);
    console.log('Loading attachments for bill IDs:', billIds);
    console.log('Items received:', items);
    
    if (!billIds.length) {
      console.log('No bill IDs found, clearing attachments');
      setAttachmentsByBillId({});
      return;
    }

    void fetchAttachments(billIds);
  }, [items]);

  const openViewBill = async (bill: any) => {
    setSelectedBill(bill);
    setShowViewModal(true);
    setViewLoading(true);
    setError(null);

    try {
      if (!Array.isArray(bill.items) || bill.items.length === 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('billing_item')
          .select('*')
          .eq('billing_id', bill.id)
          .order('created_at', { ascending: true });

        if (itemsError) throw itemsError;
        setSelectedBill({ ...bill, items: itemsData || [] });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load bill items');
    } finally {
      setViewLoading(false);
    }
  };

  const handleUpload = async (bill: any, files: FileList) => {
    if (!files?.length) return;
    setUploadingBillId(bill.id);
    setError(null);

    try {
      const uploadedBy = await getAppUserId();
      const patientId: string | undefined = bill.patient?.id;
      if (!patientId) throw new Error('Missing patient on bill');

      const billNo = String(bill.bill_no || bill.bill_number || String(bill.id).slice(0, 8));
      const testName = (bill.items || []).map((it: any) => it.description).filter(Boolean).join(', ') || `Bill ${billNo}`;
      const testType = String(bill.bill_type || 'lab');

      // Try to find associated lab orders for this billing
      let labOrderId: string | null = null;
      try {
        const { data: labOrders } = await supabase
          .from('lab_test_orders')
          .select('id')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (labOrders && labOrders.length > 0) {
          labOrderId = labOrders[0].id;
        }
      } catch (err) {
        console.warn('Could not fetch lab order ID:', err);
      }

      for (const file of Array.from(files)) {
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
        const ts = Date.now();
        const rand = Math.random().toString(36).slice(2);
        const filePath = `billing/${bill.id}/${ts}-${rand}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('lab-xray-attachments')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('lab-xray-attachments')
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from('lab_xray_attachments')
          .insert({
            patient_id: patientId,
            billing_id: bill.id,
            lab_order_id: labOrderId, // Link to lab order if found
            test_name: testName,
            test_type: testType as 'lab' | 'radiology',
            file_name: file.name,
            file_path: filePath,
            file_type: file.type || 'application/pdf',
            file_size: file.size,
            file_url: urlData?.publicUrl || null,
            uploaded_by: uploadedBy,
          });
        if (insertError) throw insertError;
      }

      const billIds = (items || []).map((b: any) => b.id).filter(Boolean);
      await fetchAttachments(billIds);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setUploadingBillId(null);
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
    return `${dd}-${mon}-${yyyy} ${hh}:${mi}`;
  };

  const handleThermalPrint = (bill: any) => {
    const now = new Date();
    const billDate = bill.created_at ? new Date(bill.created_at) : now;

    const billNumber = bill.bill_no || bill.bill_number || String(bill.id || '').slice(0, 8).toUpperCase();
    const patientUhid = bill.patient?.patient_id || bill.patient?.uhid || bill.patient_id || '';
    const patientName = bill.patient?.name || '';
    const currentStatus = getBillingStatus(bill);
    const displayPaymentMethod = bill.payment_method;
    const salesType = currentStatus === 'paid' ? String(displayPaymentMethod || 'cash').toUpperCase() : 'CREDIT';

    const amount = Number(bill.total ?? bill.subtotal ?? 0);
    const cgstAmount = 0;
    const sgstAmount = 0;
    const discountAmount = Number(bill.discount ?? 0);
    const taxableAmount = amount - discountAmount;
    const totalAmount = amount;

    // Use bill.items for line items
    const lineItems = Array.isArray(bill.items) ? bill.items : [];
    const itemsHtml = lineItems
      .map((it: any, idx: number) => {
        const qty = Number(it.qty) || 1;
        const total = Number(it.total_amount) || Number(it.amount) || Number(it.rate) || 0;
        return `
          <tr>
            <td class="items-8cm">${idx + 1}.</td>
            <td class="items-8cm">${escapeHtml(it.description || it.test_name || it.service_name || it.item_name || 'Service')}</td>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Orders</h2>
          <p className="text-gray-600 mt-1">Same list as Billing + services list + file upload</p>
        </div>
        <button
          onClick={() => onRefresh && onRefresh()}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-red-800 text-sm">{error}</span>
            <button className="text-red-700" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Bill No, Patient Name, or UHID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">Any Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filteredBills.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-gray-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No Orders Found</h3>
            <p className="text-gray-500 mt-1">Adjust your filters or create a new order.</p>
          </div>
        ) : (
          filteredBills.map((bill: any) => {
            const status = getBillingStatus(bill);
            const total = Number(bill.total ?? bill.subtotal ?? 0);
            const billNo = bill.bill_no || bill.bill_number || String(bill.id).slice(0, 8).toUpperCase();
            const attCount = (attachmentsByBillId[bill.id] || []).length;

            return (
              <div
                key={bill.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-extrabold text-gray-900 truncate">Order #{billNo}</div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getBillTypeColor(bill.bill_type)}`}>
                      {getBillTypeIcon(bill.bill_type)} {String(bill.bill_type || 'lab').toUpperCase()}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusColor(status)}`}>
                      {String(status).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {bill.patient?.name} • {bill.patient?.patient_id}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    Services: {(bill.items || []).length} • Total: ₹{total.toFixed(2)}
                  </div>
                  {attCount > 0 && (
                    <div className="text-xs text-gray-500 truncate inline-flex items-center gap-1">
                      <Paperclip size={14} />
                      Files: {attCount}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => openViewBill(bill)}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-xs font-black hover:bg-gray-200 inline-flex items-center gap-2"
                    title="View"
                  >
                    <Eye size={16} />
                    View
                  </button>

                  <button
                    onClick={() => handleThermalPrint(bill)}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-xs font-black hover:bg-gray-200 inline-flex items-center gap-2"
                    title="Print"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showViewModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div
              className="p-6"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, selectedBill)}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Order #{selectedBill.bill_no || selectedBill.bill_number || String(selectedBill.id).slice(0, 8).toUpperCase()}
                  </h3>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedBill.patient?.name} ({selectedBill.patient?.patient_id})
                  </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Drag & Drop Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 mb-6 transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="application/pdf,.pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadingBillId === selectedBill.id}
                  onChange={(e) => {
                    const f = e.target.files;
                    if (f) void handleUpload(selectedBill, f);
                    e.currentTarget.value = '';
                  }}
                />
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {uploadingBillId === selectedBill.id ? 'Uploading...' : 'Drop PDFs here or click to select'}
                  </p>
                  <p className="text-xs text-gray-500">Multiple PDF files accepted</p>
                </div>
              </div>

              {viewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Services</h4>
                    <div className="space-y-3">
                      {(selectedBill.items || []).map((it: any) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{it.description}</p>
                            <p className="text-sm text-gray-600">Qty: {it.qty} • Unit: ₹{Number(it.unit_amount || 0).toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">₹{Number(it.total_amount || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Paperclip className="w-5 h-5 text-blue-600" />
                      Documents & Attachments
                      <span className="text-sm font-normal text-gray-500">
                        ({(attachmentsByBillId[selectedBill.id] || []).length} files)
                      </span>
                    </h4>

                    {/* Upload Status Indicator */}
                    {uploadingBillId === selectedBill.id && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span className="text-sm text-blue-700 font-medium">Uploading documents...</span>
                        </div>
                      </div>
                    )}

                    <div className="mb-4 flex items-center gap-3">
                      <button
                        onClick={() => {
                          console.log('Force refreshing attachments...');
                          setLastDeletedAttachmentId(null);
                          const billIds = (items || []).map((b: any) => b.id).filter(Boolean);
                          if (billIds.length && selectedBill) {
                            (async () => {
                              const { data, error: fetchError } = await supabase
                                .from('lab_xray_attachments')
                                .select('*')
                                .in('billing_id', billIds)
                                .order('uploaded_at', { ascending: false });

                              if (!fetchError) {
                                console.log('Fetched attachments data:', data);
                                console.log('Selected bill ID:', selectedBill.id);
                                const byBill: AttachmentMap = {};
                                (data || []).forEach((row: any) => {
                                  const id = row.billing_id;
                                  if (!id) return;
                                  byBill[id] = byBill[id] || [];
                                  byBill[id].push(row);
                                });
                                setAttachmentsByBillId(byBill);
                                console.log('Force refreshed attachments:', byBill);
                              }
                            })();
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-bold hover:bg-indigo-200 inline-flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw size={14} />
                        Refresh Files
                      </button>

                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span>Files uploaded: {(attachmentsByBillId[selectedBill.id] || []).length}</span>
                        {lastDeletedAttachmentId && (
                          <span className="text-green-600 font-medium">✓ Last file deleted</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(attachmentsByBillId[selectedBill.id] || []).length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <div className="text-sm text-gray-500 font-medium">No documents uploaded yet</div>
                          <div className="text-xs text-gray-400 mt-1">Use the upload area above to add files</div>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {(attachmentsByBillId[selectedBill.id] || [])
                            .sort((a: any, b: any) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
                            .map((att: any) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate text-sm">
                                    {att.file_name}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                                    <span>{(Number(att.file_size || 0) / 1024).toFixed(1)} KB</span>
                                    <span>•</span>
                                    <span>{att.file_type || 'Unknown type'}</span>
                                    <span>•</span>
                                    <span>Uploaded {new Date(att.uploaded_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1 font-mono">
                                    ID: {att.id?.slice(0, 8)}...{att.id?.slice(-4)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {att.file_url ? (
                                  <a
                                    href={att.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-2 transition-colors"
                                    title="Open document in new tab"
                                  >
                                    <Eye size={14} />
                                    View
                                  </a>
                                ) : (
                                  <span className="px-3 py-2 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium">
                                    No URL
                                  </span>
                                )}

                                <button
                                  onClick={() => void handleDeleteAttachment(att)}
                                  className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 inline-flex items-center gap-2 transition-colors"
                                  title="Delete this document"
                                  disabled={uploadingBillId === selectedBill.id}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
