'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar, Filter, Download, TrendingUp, TrendingDown, DollarSign, 
  CreditCard, Smartphone, Building, AlertTriangle, CheckCircle, Clock,
  BarChart3, PieChart, Activity, RefreshCw, IndianRupee, Wallet,
  FileText, Eye, ArrowUpDown
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { supabase } from '@/src/lib/supabase'

const formatIndianCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface CollectionReport {
  id: string
  bill_number: string
  bill_date: string
  total_amount: number
  payment_method: string
  payment_status: string
  patient_name?: string
  customer_name?: string
  created_at: string
  amount_paid?: number
  subtotal?: number
  discount?: number
  tax?: number
}

interface PaymentSummary {
  cash: number
  card: number
  upi: number
  online: number
  insurance: number
  pending: number
  total: number
}

interface DateRange {
  start: string
  end: string
}

const COLLECTION_REPORT_COLORS = {
  cash: '#10b981',
  card: '#3b82f6', 
  upi: '#8b5cf6',
  online: '#f59e0b',
  insurance: '#ef4444',
  pending: '#6b7280'
}

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'financial_year', label: 'Financial Year (Apr-Mar)' },
  { value: 'custom', label: 'Custom Range' }
]

export default function CollectionReportPage() {
  const [reports, setReports] = useState<CollectionReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState('this_month')
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    cash: 0,
    card: 0,
    upi: 0,
    online: 0,
    insurance: 0,
    pending: 0,
    total: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'method'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadCollectionReports()
  }, [selectedRange, customDateRange])

  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (selectedRange) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        }
      
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        }
      
      case 'this_week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return {
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0]
        }
      
      case 'last_week':
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7)
        const lastWeekEnd = new Date(lastWeekStart)
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6)
        return {
          start: lastWeekStart.toISOString().split('T')[0],
          end: lastWeekEnd.toISOString().split('T')[0]
        }
      
      case 'this_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        }
      
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        return {
          start: lastMonth.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0]
        }
      
      case 'this_quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)
        return {
          start: quarterStart.toISOString().split('T')[0],
          end: quarterEnd.toISOString().split('T')[0]
        }
      
      case 'this_year':
        return {
          start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
        }
      
      case 'last_year':
        return {
          start: new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
        }
      
      case 'financial_year':
        const financialYearStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1)
        const financialYearEnd = new Date(now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear(), 2, 31)
        return {
          start: financialYearStart.toISOString().split('T')[0],
          end: financialYearEnd.toISOString().split('T')[0]
        }
      
      case 'custom':
        return customDateRange
      
      default:
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        }
    }
  }

  const loadCollectionReports = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange()
      
      // Query the billing table for pharmacy bills (pharmacy bills have bill_type as NULL)
      const { data, error } = await supabase
        .from('billing')
        .select('*')
        .is('bill_type', null) // Pharmacy bills have bill_type as NULL
        .gte('issued_at', dateRange.start)
        .lte('issued_at', dateRange.end + 'T23:59:59.999Z')
        .order('issued_at', { ascending: false })

      if (error) {
        console.error('Error loading collection reports:', error)
        return
      }

      // Transform the data to match the expected interface
      const transformedData = (data || []).map((bill: any) => ({
        id: bill.id,
        bill_number: bill.bill_number || bill.bill_no,
        bill_date: bill.issued_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        total_amount: bill.total || 0,
        payment_method: bill.payment_method || 'cash',
        payment_status: bill.payment_status || 'pending',
        patient_name: bill.customer_name,
        customer_name: bill.customer_name,
        created_at: bill.created_at,
        amount_paid: bill.amount_paid || 0,
        subtotal: bill.subtotal || 0,
        discount: bill.discount || 0,
        tax: bill.tax || 0
      }))

      setReports(transformedData)
      processPaymentData(transformedData)
      generateChartData(transformedData)
      generateMonthlyTrends(transformedData)
    } catch (error) {
      console.error('Error loading collection reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const processPaymentData = (data: CollectionReport[]) => {
    const summary: PaymentSummary = {
      cash: 0,
      card: 0,
      upi: 0,
      online: 0,
      insurance: 0,
      pending: 0,
      total: 0
    }

    data.forEach(bill => {
      const amount = bill.total_amount || 0
      const paymentMethod = (bill.payment_method || '').toLowerCase().trim()
      
      switch (paymentMethod) {
        case 'cash':
          summary.cash += amount
          break
        case 'card':
          summary.card += amount
          break
        case 'upi':
        case 'gpay':
        case 'phonepe':
          summary.upi += amount
          break
        case 'online':
          summary.online += amount
          break
        case 'insurance':
          summary.insurance += amount
          break
        case 'credit':
          // Credit bills are typically pending until paid
          summary.pending += amount
          break
        default:
          // Handle null or unknown payment methods as cash
          summary.cash += amount
      }

      if (bill.payment_status === 'pending' || bill.payment_status === 'partial') {
        summary.pending += amount
      }

      summary.total += amount
    })

    setPaymentSummary(summary)
  }

  const generateChartData = (data: CollectionReport[]) => {
    const paymentMethods = ['cash', 'card', 'upi', 'online', 'insurance']
    const chartData = paymentMethods.map(method => {
      const amount = data
        .filter(bill => {
          const paymentMethod = (bill.payment_method || '').toLowerCase().trim()
          return paymentMethod === method
        })
        .reduce((sum, bill) => sum + (bill.total_amount || 0), 0)
      
      return {
        name: method.charAt(0).toUpperCase() + method.slice(1),
        value: amount,
        percentage: data.length > 0 ? (amount / data.reduce((sum, bill) => sum + (bill.total_amount || 0), 0)) * 100 : 0
      }
    }).filter(item => item.value > 0)

    setChartData(chartData)
  }

  const generateMonthlyTrends = (data: CollectionReport[]) => {
    const monthlyData: Record<string, { cash: number; card: number; upi: number; total: number }> = {}
    
    data.forEach(bill => {
      const month = new Date(bill.bill_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      if (!monthlyData[month]) {
        monthlyData[month] = { cash: 0, card: 0, upi: 0, total: 0 }
      }
      
      const amount = bill.total_amount || 0
      const paymentMethod = (bill.payment_method || '').toLowerCase().trim()
      monthlyData[month].total += amount
      
      switch (paymentMethod) {
        case 'cash':
          monthlyData[month].cash += amount
          break
        case 'card':
          monthlyData[month].card += amount
          break
        case 'upi':
        case 'gpay':
        case 'phonepe':
          monthlyData[month].upi += amount
          break
      }
    })

    const trends = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-12) // Last 12 months

    setMonthlyTrends(trends)
  }

  const sortReports = (reports: CollectionReport[]) => {
    return [...reports].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime()
          break
        case 'amount':
          comparison = (a.total_amount || 0) - (b.total_amount || 0)
          break
        case 'method':
          comparison = (a.payment_method || '').localeCompare(b.payment_method || '')
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  const exportToCSV = () => {
    const sortedReports = sortReports(reports)
    
    // Helper function to format amount without currency symbol for CSV
    const formatAmountForCSV = (amount: number | string): string => {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(num)) return '0';
      return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const csv = [
      ['Bill Number', 'Date', 'Patient/Customer', 'Payment Method', 'Payment Status', 'Amount (INR)'],
      ...sortedReports.map(report => [
        report.bill_number,
        formatDate(report.bill_date),
        report.patient_name || report.customer_name || 'Walk-in',
        report.payment_method || 'Cash',
        report.payment_status || 'Pending',
        formatAmountForCSV(report.total_amount || 0)
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `collection-report-${selectedRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-orange-100 text-orange-800',
      refunded: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    }
    const icons: Record<string, React.ReactNode> = {
      paid: <CheckCircle className="w-3 h-3 mr-1" />,
      pending: <Clock className="w-3 h-3 mr-1" />,
      partial: <AlertTriangle className="w-3 h-3 mr-1" />,
      refunded: <AlertTriangle className="w-3 h-3 mr-1" />,
      completed: <CheckCircle className="w-3 h-3 mr-1" />
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getPaymentMethodIcon = (method: string) => {
    const paymentMethod = (method || '').toLowerCase().trim()
    const icons: Record<string, React.ReactNode> = {
      cash: <DollarSign className="w-4 h-4" />,
      card: <CreditCard className="w-4 h-4" />,
      upi: <Smartphone className="w-4 h-4" />,
      online: <Building className="w-4 h-4" />,
      insurance: <FileText className="w-4 h-4" />
    }
    return icons[paymentMethod] || <DollarSign className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Loading collection reports...</div>
          <div className="text-sm text-gray-500">Preparing your financial data</div>
        </div>
      </div>
    )
  }

  const sortedReports = sortReports(reports)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collection Report</h1>
          <p className="text-gray-600 mt-1">Comprehensive payment collection analysis and reporting</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={loadCollectionReports}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={selectedRange}
              onChange={(e) => {
                setSelectedRange(e.target.value)
                setShowCustomDate(e.target.value === 'custom')
              }}
              className="w-full border rounded-lg px-3 py-2"
            >
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>
          
          {showCustomDate && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-green-800">Cash Collections</h3>
            <div className="p-2 bg-green-500 rounded-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-900">{formatIndianCurrency(paymentSummary.cash)}</div>
            <p className="text-xs text-green-700">
              {((paymentSummary.cash / paymentSummary.total) * 100).toFixed(1)}% of total
            </p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-blue-800">Card Collections</h3>
            <div className="p-2 bg-blue-500 rounded-lg">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{formatIndianCurrency(paymentSummary.card)}</div>
            <p className="text-xs text-blue-700">
              {((paymentSummary.card / paymentSummary.total) * 100).toFixed(1)}% of total
            </p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-purple-800">UPI/Online</h3>
            <div className="p-2 bg-purple-500 rounded-lg">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-900">{formatIndianCurrency(paymentSummary.upi + paymentSummary.online)}</div>
            <p className="text-xs text-purple-700">
              {(((paymentSummary.upi + paymentSummary.online) / paymentSummary.total) * 100).toFixed(1)}% of total
            </p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-orange-800">Pending Amount</h3>
            <div className="p-2 bg-orange-500 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-900">{formatIndianCurrency(paymentSummary.pending)}</div>
            <p className="text-xs text-orange-700">
              {paymentSummary.pending > 0 ? `${reports.filter(r => r.payment_status === 'pending').length} bills` : 'All cleared'}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Pie Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-blue-500" />
              Payment Methods Distribution
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(COLLECTION_REPORT_COLORS)[index % Object.values(COLLECTION_REPORT_COLORS).length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trends */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-500" />
              Monthly Collection Trends
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
                itemStyle={{ color: '#f3f4f6' }}
                formatter={(value: number) => formatIndianCurrency(value)}
              />
              <Line type="monotone" dataKey="cash" stroke={COLLECTION_REPORT_COLORS.cash} strokeWidth={2} />
              <Line type="monotone" dataKey="card" stroke={COLLECTION_REPORT_COLORS.card} strokeWidth={2} />
              <Line type="monotone" dataKey="upi" stroke={COLLECTION_REPORT_COLORS.upi} strokeWidth={2} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Total Summary */}
      <div className="card bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-indigo-800">Total Collections Summary</h3>
            <p className="text-sm text-indigo-600">
              {reports.length} bills • {selectedRange === 'custom' ? `${customDateRange.start} to ${customDateRange.end}` : DATE_RANGES.find(r => r.value === selectedRange)?.label}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-900">{formatIndianCurrency(paymentSummary.total)}</div>
            <div className="flex items-center justify-end gap-4 mt-2 text-sm">
              <span className="text-green-600">{reports.filter(r => r.payment_status === 'paid').length} Paid</span>
              <span className="text-yellow-600">{reports.filter(r => r.payment_status === 'pending').length} Pending</span>
              <span className="text-red-600">{reports.filter(r => r.payment_status === 'refunded').length} Refunded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Reports Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
            Detailed Collection Reports
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="method">Payment Method</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 border rounded text-sm"
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient/Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {report.bill_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(report.bill_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.patient_name || report.customer_name || 'Walk-in'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      {getPaymentMethodIcon(report.payment_method || '')}
                      <span className="ml-2">{report.payment_method || 'Cash'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusBadge(report.payment_status || 'pending')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatIndianCurrency(report.total_amount || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reports.length === 0 && (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No collection data found for the selected period</p>
          </div>
        )}
      </div>
    </div>
  )
}
