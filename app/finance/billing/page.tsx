'use client';

import React, { useState, useEffect } from 'react';
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
  Receipt
} from 'lucide-react';
import { getBillingRecords, type BillingRecord } from '../../../src/lib/financeService';
import TransactionViewModal from '../../../src/components/TransactionViewModal';

export default function BillingTransactionsPage() {
  const [records, setRecords] = useState<BillingRecord[]>([]);
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

  useEffect(() => {
    loadRecords();
  }, [currentPage, searchTerm, statusFilter, dateFromFilter, dateToFilter]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * recordsPerPage;
      console.log('Loading billing records with filters:', {
        recordsPerPage,
        offset,
        filters: {
          search: searchTerm,
          status: statusFilter,
          dateFrom: dateFromFilter,
          dateTo: dateToFilter
        }
      });
      
      const result = await getBillingRecords(
        recordsPerPage, 
        offset, 
        {
          search: searchTerm,
          status: statusFilter,
          dateFrom: dateFromFilter,
          dateTo: dateToFilter
        }
      );
      
      console.log('Billing records result:', result);
      console.log('Records count:', result.records?.length);
      console.log('Total count:', result.total);
      
      // If no records found and no filters applied, add sample data for testing
      if ((!result.records || result.records.length === 0) && result.total === 0 && !searchTerm && statusFilter === 'all' && !dateFromFilter && !dateToFilter) {
        console.log('No records found, adding sample data for testing');
        const sampleData = [
          {
            id: 'sample-1',
            bill_id: 'SAMPLE-001',
            patient_id: 'patient-1',
            bill_date: new Date().toISOString(),
            total_amount: 1500,
            subtotal: 1500,
            tax_amount: 0,
            discount_amount: 0,
            payment_status: 'paid',
            payment_method: 'cash',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source: 'pharmacy' as const,
            patient: {
              name: 'Sample Patient 1',
              patient_id: 'UHID001',
              phone: '9876543210'
            }
          },
          {
            id: 'sample-2',
            bill_id: 'SAMPLE-002',
            patient_id: 'patient-2',
            bill_date: new Date().toISOString(),
            total_amount: 500,
            subtotal: 500,
            tax_amount: 0,
            discount_amount: 0,
            payment_status: 'pending',
            payment_method: 'card',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source: 'lab' as const,
            patient: {
              name: 'Sample Patient 2',
              patient_id: 'UHID002',
              phone: '9876543211'
            }
          }
        ];
        setRecords(sampleData);
        setTotalRecords(2);
        console.log('Sample data loaded:', sampleData);
      } else {
        setRecords(result.records || []);
        setTotalRecords(result.total || 0);
      }
    } catch (error) {
      console.error('Error loading billing records:', error);
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
            Showing {records.length} of {totalRecords} transactions
          </p>
          <div className="flex gap-2">
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
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
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{record.bill_id}</div>
                    <div className="text-sm text-gray-500">{record.source}</div>
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
                    <button 
                      onClick={() => handleViewRecord(record)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye size={16} />
                    </button>
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm font-medium text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
