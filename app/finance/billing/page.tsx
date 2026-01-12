'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  Clock,
  IndianRupee,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Printer,
  ChevronDown
} from 'lucide-react';
import { getBillingRecords, type BillingRecord } from '../../../src/lib/financeService';
import TransactionViewModal from '../../../src/components/TransactionViewModal';

export default function BillingTransactionsPage() {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [allRecords, setAllRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 20;
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPrintDropdown, setShowPrintDropdown] = useState<string | null>(null);
  const printDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    // Apply client-side filtering
    const filteredRecords = allRecords.filter(record => {
      const matchesSearch = !searchTerm || 
        record.bill_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.patient?.patient_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || record.payment_status === statusFilter;
      
      // Date filtering
      let matchesDate = true;
      if (dateFromFilter) {
        matchesDate = matchesDate && new Date(record.bill_date) >= new Date(dateFromFilter);
      }
      if (dateToFilter) {
        matchesDate = matchesDate && new Date(record.bill_date) <= new Date(dateToFilter);
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });

    setRecords(filteredRecords);
    setTotalRecords(filteredRecords.length);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allRecords, searchTerm, statusFilter, dateFromFilter, dateToFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(event.target as Node)) {
        setShowPrintDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePrintDropdown = (record: BillingRecord) => {
    setShowPrintDropdown(showPrintDropdown === record.id ? null : record.id);
  };

  // Get department name from source
  const getDepartmentName = (source: string) => {
    switch (source) {
      case 'pharmacy': return 'Pharmacy';
      case 'lab': return 'Laboratory';
      case 'radiology': return 'Radiology';
      case 'diagnostic': return 'Diagnostic';
      case 'outpatient': return 'Outpatient';
      case 'billing': return 'Consultation';
      case 'other_bills': return 'Other';
      default: return 'General';
    }
  };

  // Get department color
  const getDepartmentColor = (source: string) => {
    switch (source) {
      case 'pharmacy': return 'bg-green-100 text-green-800';
      case 'lab': return 'bg-purple-100 text-purple-800';
      case 'radiology': return 'bg-orange-100 text-orange-800';
      case 'diagnostic': return 'bg-pink-100 text-pink-800';
      case 'outpatient': return 'bg-teal-100 text-teal-800';
      case 'billing': return 'bg-blue-100 text-blue-800';
      case 'other_bills': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      console.log('Loading billing records...');
      
      // Use the same approach as the working finance dashboard
      const result = await getBillingRecords(200); // Get more records for the billing page
      
      console.log('Billing records result:', result);
      console.log('Records count:', result.records?.length);
      console.log('Total count:', result.total);
      
      setAllRecords(result.records || []);
      setRecords(result.records || []);
      setTotalRecords(result.total || 0);
    } catch (error) {
      console.error('Error loading billing records:', error);
      setAllRecords([]);
      setRecords([]);
      setTotalRecords(0);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'partial': return <AlertCircle className="h-4 w-4" />;
      case 'overdue': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
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

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  const handleViewRecord = (record: BillingRecord) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
  };

  // Thermal printer function
  const showThermalPreview = (record: BillingRecord) => {
    const now = new Date();
    const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // Get patient UHID
    const patientUhid = record.patient?.patient_id || 'WALK-IN';
    
    // Get sales type
    let salesType = record.payment_method?.toUpperCase() || 'CASH';
    if (salesType === 'CREDIT') {
      salesType = 'CREDIT';
    }

    // Generate service-specific content
    const getServiceContent = () => {
      switch (record.source) {
        case 'pharmacy':
          return `
            <tr>
              <td class="items-8cm">1.</td>
              <td class="items-8cm">Medicines & Pharmacy Items</td>
              <td class="items-8cm text-center">1</td>
              <td class="items-8cm text-right">${record.total_amount.toFixed(2)}</td>
            </tr>
          `;
        case 'lab':
          return `
            <tr>
              <td class="items-8cm">1.</td>
              <td class="items-8cm">Laboratory Tests & Diagnostics</td>
              <td class="items-8cm text-center">1</td>
              <td class="items-8cm text-right">${record.total_amount.toFixed(2)}</td>
            </tr>
          `;
        case 'radiology':
          return `
            <tr>
              <td class="items-8cm">1.</td>
              <td class="items-8cm">Radiology Services & X-Ray</td>
              <td class="items-8cm text-center">1</td>
              <td class="items-8cm text-right">${record.total_amount.toFixed(2)}</td>
            </tr>
          `;
        case 'diagnostic':
          return `
            <tr>
              <td class="items-8cm">1.</td>
              <td class="items-8cm">Diagnostic Procedures</td>
              <td class="items-8cm text-center">1</td>
              <td class="items-8cm text-right">${record.total_amount.toFixed(2)}</td>
            </tr>
          `;
        case 'outpatient':
          return `
            <tr>
              <td class="items-8cm">1.</td>
              <td class="items-8cm">Outpatient Consultation</td>
              <td class="items-8cm text-center">1</td>
              <td class="items-8cm text-right">${record.total_amount.toFixed(2)}</td>
            </tr>
          `;
        case 'billing':
          return `
            <tr>
              <td class="items-8cm">1.</td>
              <td class="items-8cm">Medical Consultation & Services</td>
              <td class="items-8cm text-center">1</td>
              <td class="items-8cm text-right">${record.total_amount.toFixed(2)}</td>
            </tr>
          `;
        case 'other_bills':
          return `
            <tr>
              <td class="items-8cm">1.</td>
              <td class="items-8cm">Other Medical Services</td>
              <td class="items-8cm text-center">1</td>
              <td class="items-8cm text-right">${record.total_amount.toFixed(2)}</td>
            </tr>
          `;
        default:
          return `
            <tr>
              <td class="items-8cm">1.</td>
              <td class="items-8cm">Medical Services</td>
              <td class="items-8cm text-center">1</td>
              <td class="items-8cm text-right">${record.total_amount.toFixed(2)}</td>
            </tr>
          `;
      }
    };

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${record.bill_id}</title>
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
            <div class="header-14cm">ANNAM HOSPITAL</div>
            <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
            <div class="header-9cm">Phone- 04639 252592</div>
            <div class="header-10cm">Gst No: 33AJWPR2713G2ZZ</div>
            <div style="margin-top: 5px; font-weight: bold;">INVOICE</div>
          </div>
          
          <div style="margin-top: 10px;">
            <table class="table">
              <tr>
                <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${record.bill_id}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${patientUhid}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${record.patient?.name || 'Unknown Patient'}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${new Date(record.bill_date).toLocaleDateString()} ${new Date(record.bill_date).toLocaleTimeString()}</td>
              </tr>
              <tr>
                <td class="header-10cm">Sales Type&nbsp;:&nbsp;&nbsp;</td>
                <td class="header-10cm bill-info-bold">${salesType}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 10px;">
            <table class="table">
              <tr style="border-bottom: 1px dashed #000;">
                <td width="30%" class="items-8cm">S.No</td>
                <td width="40%" class="items-8cm">Description</td>
                <td width="15%" class="items-8cm text-center">Qty</td>
                <td width="15%" class="items-8cm text-right">Amt</td>
              </tr>
              ${getServiceContent()}
            </table>
          </div>

          <div style="margin-top: 10px;">
            <div class="totals-line items-8cm">
              <span>Taxable Amount</span>
              <span>${record.subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
              <span>${record.discount_amount.toFixed(2)}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
              <span>${(record.tax_amount / 2).toFixed(2)}</span>
            </div>
            <div class="totals-line header-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
              <span>${(record.tax_amount / 2).toFixed(2)}</span>
            </div>
            <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
              <span>Total Amount</span>
              <span>${record.total_amount.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <div class="totals-line footer-7cm">
              <span>Printed on ${printedDateTime}</span>
              <span>Pharmacist Sign</span>
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
  };

  // Normal print function
  const showNormalPrint = (record: BillingRecord) => {
    const printContent = `
      <html>
        <head>
          <title>Bill Receipt - ${record.bill_id}</title>
          <style>
            @page { margin: 20mm; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              line-height: 1.4;
            }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #333; margin-bottom: 10px; }
            .header p { color: #666; margin: 5px 0; }
            .bill-info { margin-bottom: 30px; }
            .bill-info table { width: 100%; border-collapse: collapse; }
            .bill-info td { padding: 8px; border-bottom: 1px solid #eee; }
            .bill-info td:first-child { font-weight: bold; width: 150px; }
            .amount-section { margin-bottom: 30px; }
            .amount-table { width: 100%; border-collapse: collapse; }
            .amount-table td { padding: 8px; border: 1px solid #ddd; text-align: right; }
            .amount-table .label { text-align: left; font-weight: bold; }
            .total-row { font-weight: bold; background: #f5f5f5; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BILL RECEIPT</h1>
            <p>ANNAM HOSPITAL</p>
            <p>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</p>
            <p>Phone: 04639 252592 | GST: 33AJWPR2713G2ZZ</p>
          </div>
          
          <div class="bill-info">
            <table>
              <tr>
                <td>Bill Number:</td>
                <td>${record.bill_id}</td>
              </tr>
              <tr>
                <td>Patient Name:</td>
                <td>${record.patient?.name || 'Unknown Patient'}</td>
              </tr>
              <tr>
                <td>Patient ID:</td>
                <td>${record.patient?.patient_id || 'N/A'}</td>
              </tr>
              <tr>
                <td>Bill Date:</td>
                <td>${new Date(record.bill_date).toLocaleDateString()} ${new Date(record.bill_date).toLocaleTimeString()}</td>
              </tr>
              <tr>
                <td>Payment Method:</td>
                <td>${record.payment_method || 'N/A'}</td>
              </tr>
              <tr>
                <td>Payment Status:</td>
                <td>${record.payment_status?.toUpperCase() || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <div class="amount-section">
            <table class="amount-table">
              <tr>
                <td class="label">Subtotal:</td>
                <td>₹${record.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="label">Discount:</td>
                <td>₹${record.discount_amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="label">Tax:</td>
                <td>₹${record.tax_amount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td class="label">Total Amount:</td>
                <td>₹${record.total_amount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Thank you for choosing ANNA HOSPITAL</p>
            <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing records...</p>
          <p className="text-sm text-gray-500 mt-2">Debug: Checking all service connections</p>
        </div>
      </div>
    );
  }

  // Debug information
  if (process.env.NODE_ENV === 'development') {
    console.log('Finance Billing Page Debug:', {
      recordsCount: records.length,
      totalRecords,
      loading,
      searchTerm,
      statusFilter,
      currentPage
    });
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Transactions</h1>
          <p className="text-gray-500 mt-1">View and manage all billing transactions</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by invoice number, patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * recordsPerPage + 1, records.length)} to {Math.min(currentPage * recordsPerPage, records.length)} of {records.length} transactions
          </p>
          <div className="flex gap-2">
            <span className="text-sm text-gray-500">Page {currentPage} of {Math.ceil(records.length / recordsPerPage)}</span>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage).map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{record.bill_id}</div>
                    <div className="text-sm text-gray-500">{record.source}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDepartmentColor(record.source)}`}>
                      {getDepartmentName(record.source)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.patient?.name || 'Unknown Patient'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.patient?.patient_id || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(record.bill_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(record.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatAmount(record.total_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.payment_status)}`}>
                      {getStatusIcon(record.payment_status)}
                      <span className="ml-1">{record.payment_status?.charAt(0).toUpperCase() + record.payment_status?.slice(1)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.payment_method || 'Pending'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleViewRecord(record)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => handlePrintDropdown(record)}
                          className="text-green-600 hover:text-green-900"
                          title="Print Options"
                        >
                          <Printer size={16} />
                        </button>
                        
                        {showPrintDropdown === record.id && (
                          <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  showThermalPreview(record);
                                  setShowPrintDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <Printer size={12} className="mr-2" />
                                Thermal
                              </button>
                              <button
                                onClick={() => {
                                  showNormalPrint(record);
                                  setShowPrintDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <Receipt size={12} className="mr-2" />
                                Normal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {records.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters</p>
            
            {/* Debug Information */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
                <h4 className="font-medium text-gray-900 mb-2">Debug Information:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Total Records: {totalRecords}</p>
                  <p>Current Page: {currentPage}</p>
                  <p>Search Term: "{searchTerm}"</p>
                  <p>Status Filter: "{statusFilter}"</p>
                  <p>Date From: "{dateFromFilter}"</p>
                  <p>Date To: "{dateToFilter}"</p>
                  <p>Records Per Page: {20}</p>
                  <p>Open browser console for detailed logs</p>
                </div>
                <button 
                  onClick={() => loadRecords()}
                  className="mt-3 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Retry Loading
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {Math.ceil(records.length / recordsPerPage) > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-700">
            Showing {Math.min((currentPage - 1) * recordsPerPage + 1, records.length)} to {Math.min(currentPage * recordsPerPage, records.length)} of {records.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {Math.ceil(records.length / recordsPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(Math.ceil(records.length / recordsPerPage), currentPage + 1))}
              disabled={currentPage === Math.ceil(records.length / recordsPerPage)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Transaction View Modal */}
      <TransactionViewModal 
        record={selectedRecord}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}
