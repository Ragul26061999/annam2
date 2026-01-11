'use client';

import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Receipt,
  PieChart,
  BarChart3,
  Calendar,
  Clock,
  Download,
  Building,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pill,
  TestTube,
  Scan,
  Stethoscope,
  User
} from 'lucide-react';
import { 
  getFinanceStats, 
  getBillingRecords, 
  getRevenueBreakdown, 
  getPaymentMethodStats,
  getMonthlyRevenueTrend,
  type BillingRecord,
  type FinanceStats,
  type RevenueBreakdown,
  type PaymentMethodStats
} from '../lib/financeService';
import TransactionViewModal from './TransactionViewModal';

interface FinanceDashboardProps {
  className?: string;
}

export default function FinanceDashboard({ className }: FinanceDashboardProps) {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStats[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Source colors and icons for different billing types
  const sourceConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
    billing: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Stethoscope, label: 'Consultation' },
    pharmacy: { color: 'text-green-600', bgColor: 'bg-green-100', icon: Pill, label: 'Pharmacy' },
    lab: { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: TestTube, label: 'Lab Test' },
    radiology: { color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Scan, label: 'Radiology' },
    diagnostic: { color: 'text-pink-600', bgColor: 'bg-pink-100', icon: FileText, label: 'Diagnostic' },
    outpatient: { color: 'text-teal-600', bgColor: 'bg-teal-100', icon: User, label: 'Outpatient' },
    other_bills: { color: 'text-cyan-600', bgColor: 'bg-cyan-100', icon: Receipt, label: 'Other Bills' }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      
      const [
        statsData,
        billingData,
        revenueData,
        paymentData,
        trendData
      ] = await Promise.all([
        getFinanceStats(),
        getBillingRecords(10),
        getRevenueBreakdown(),
        getPaymentMethodStats(),
        getMonthlyRevenueTrend()
      ]);

      setStats(statsData);
      setBillingRecords(billingData.records);
      setRevenueBreakdown(revenueData);
      setPaymentMethods(paymentData);
      setMonthlyTrend(trendData);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter records based on search, status, type, and date range
  const filteredRecords = billingRecords.filter(record => {
    const matchesSearch = !searchTerm || 
      record.bill_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patient?.patient_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record.payment_status === statusFilter;
    const matchesType = typeFilter === 'all' || record.source === typeFilter;
    
    // Date filtering
    let matchesDate = true;
    if (dateFromFilter) {
      matchesDate = matchesDate && new Date(record.bill_date) >= new Date(dateFromFilter);
    }
    if (dateToFilter) {
      matchesDate = matchesDate && new Date(record.bill_date) <= new Date(dateToFilter);
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const handleExport = async () => {
    try {
      const data = await import('../lib/financeService').then(module => 
        module.exportFinancialData('billing', {
          search: searchTerm,
          status: statusFilter,
          type: typeFilter
        })
      );
      
      // Create CSV content
      const csvContent = data.map((row: any) => row.join(',')).join('\n');
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleViewRecord = (record: BillingRecord) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-500 mt-2">Complete financial overview and transaction management</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Download size={16} className="mr-2" />
            Export Report
          </button>
        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatAmount(stats?.totalRevenue || 0)}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+{stats?.revenueGrowth || 0}% from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <IndianRupee className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatAmount(stats?.outstandingAmount || 0)}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">{stats?.pendingTransactions || 0} pending invoices</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Receipt className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatAmount(stats?.totalExpenses || 0)}</p>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-600">-8% from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Net Profit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatAmount(stats?.netProfit || 0)}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+{stats?.profitGrowth || 0}% from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <PieChart className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Source Breakdown Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div 
          onClick={() => window.open('/finance/billing', '_blank')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Stethoscope className="text-blue-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Consultations</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(stats?.billingRevenue || 0)}</p>
              <p className="text-xs text-gray-400">{stats?.billingCount || 0} records</p>
            </div>
          </div>
        </div>
        <div 
          onClick={() => window.open('/finance/pharmacy', '_blank')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Pill className="text-green-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pharmacy</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(stats?.pharmacyRevenue || 0)}</p>
              <p className="text-xs text-gray-400">{stats?.pharmacyCount || 0} records</p>
            </div>
          </div>
        </div>
        <div 
          onClick={() => window.open('/finance/lab', '_blank')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TestTube className="text-purple-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Lab Tests</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(stats?.labRevenue || 0)}</p>
              <p className="text-xs text-gray-400">{stats?.labCount || 0} records</p>
            </div>
          </div>
        </div>
        <div 
          onClick={() => window.open('/finance/radiology', '_blank')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Scan className="text-orange-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Radiology</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(stats?.radiologyRevenue || 0)}</p>
              <p className="text-xs text-gray-400">{stats?.radiologyCount || 0} records</p>
            </div>
          </div>
        </div>
        <div 
          onClick={() => window.open('/finance/outpatient', '_blank')}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <User className="text-teal-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Outpatient</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(stats?.outpatientRevenue || 0)}</p>
              <p className="text-xs text-gray-400">{stats?.outpatientCount || 0} records</p>
            </div>
          </div>
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
              placeholder="Search by invoice number, patient name, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Sources</option>
              <option value="billing">Consultations & Billing</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="lab">Lab Tests</option>
              <option value="radiology">Radiology & Scans</option>
              <option value="outpatient">Outpatient</option>
            </select>
          </div>
        </div>
        
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setDateFromFilter('');
                    setDateToFilter('');
                  }}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Overview and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <button 
              onClick={() => window.open('/finance/billing', '_blank')}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              View All Billing
            </button>
          </div>
          
          <div className="space-y-3">
            {filteredRecords.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
                <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500">No transactions found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : null}
            {filteredRecords.map((record) => (
              <div key={record.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sourceConfig[record.source]?.bgColor || 'bg-gray-100'}`}>
                      {(() => {
                        const IconComponent = sourceConfig[record.source]?.icon || Receipt;
                        return <IconComponent className={`${sourceConfig[record.source]?.color || 'text-gray-600'}`} size={20} />;
                      })()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {record.patient?.name || 'Unknown Patient'}
                      </h3>
                      <p className="text-sm text-gray-500">{record.bill_id} • {record.patient?.patient_id || 'N/A'}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sourceConfig[record.source]?.bgColor || 'bg-gray-100'} ${sourceConfig[record.source]?.color || 'text-gray-600'}`}>
                        {sourceConfig[record.source]?.label || record.source}
                      </span>
                      <div className="flex items-center mt-1 space-x-4">
                        <div className="flex items-center text-xs text-gray-600">
                          <Calendar size={12} className="mr-1" />
                          {new Date(record.bill_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <Clock size={12} className="mr-1" />
                          {record.payment_method || 'Pending'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatAmount(record.total_amount)}</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.payment_status)}`}>
                        {getStatusIcon(record.payment_status)}
                        <span className="ml-1">{record.payment_status?.charAt(0).toUpperCase() + record.payment_status?.slice(1)}</span>
                      </span>
                    </div>
                    <button 
                      onClick={() => handleViewRecord(record)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Financial Summary</h2>
          
          {/* Revenue Breakdown */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
            <div className="space-y-3">
              {revenueBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 ${item.color} rounded-full mr-3`}></div>
                    <span className="text-sm text-gray-700">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatAmount(item.amount)}</p>
                    <p className="text-xs text-gray-500">{item.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
            <div className="space-y-3">
              {paymentMethods.map((method, index) => {
                const IconComponent = method.icon === 'IndianRupee' ? IndianRupee : 
                                   method.icon === 'CreditCard' ? CreditCard :
                                   method.icon === 'Building' ? Building :
                                   method.icon === 'Smartphone' ? CreditCard :
                                   CreditCard;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <IconComponent className={`h-4 w-4 ${method.color} mr-3`} />
                      <span className="text-sm text-gray-700">{method.method}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{method.percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center">
                <FileText size={14} className="mr-2" />
                Generate Monthly Report
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center">
                <AlertCircle size={14} className="mr-2" />
                Send Payment Reminders
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center">
                <Download size={14} className="mr-2" />
                Export Tax Records
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center">
                <BarChart3 size={14} className="mr-2" />
                View Expense Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Transactions
        </button>
      </div>

      {/* Transaction View Modal */}
      <TransactionViewModal 
        record={selectedRecord}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}
