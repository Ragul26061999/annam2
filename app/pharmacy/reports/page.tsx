'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, BarChart3, Package, Download, Calendar, 
  TrendingUp, TrendingDown, AlertTriangle, Filter, Pill,
  Activity, PieChart, ArrowUpDown, Search, Eye
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
  AreaChart,
  Area
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

interface MedicineAnalytics {
  id: string
  name: string
  category: string
  manufacturer: string
  total_sold: number
  total_revenue: number
  total_quantity: number
  average_price: number
  stock_level: number
  minimum_stock_level: number
  status: string
  growth_rate: number
  profit_margin: number
}

interface StockAlert {
  id: string
  name: string
  current_stock: number
  minimum_stock_level: number
  status: 'critical' | 'low' | 'out_of_stock'
  days_to_out: number
  value_at_risk: number
}

const MEDICINE_COLORS = {
  high_performer: '#10b981',
  moderate: '#3b82f6', 
  low_performer: '#f59e0b',
  critical: '#ef4444'
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
  { value: 'custom', label: 'Custom Range' }
]

const CATEGORIES = [
  'All Categories', 'Antibiotics', 'Pain Killers', 'Vitamins', 'Cardiac', 
  'Diabetes', 'Respiratory', 'Gastrointestinal', 'Dermatology', 'Neurology'
]

export default function PharmacyReportsPage() {
  const [loading, setLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState('this_month')
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Data states
  const [medicineAnalytics, setMedicineAnalytics] = useState<MedicineAnalytics[]>([])
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([])
  const [topPerformers, setTopPerformers] = useState<MedicineAnalytics[]>([])
  const [lowPerformers, setLowPerformers] = useState<MedicineAnalytics[]>([])

  useEffect(() => {
    loadMedicineAnalytics()
  }, [selectedRange, customDateRange, selectedCategory, searchTerm])

  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (selectedRange) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        }
      case 'this_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        }
      case 'custom':
        return customDateRange
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        }
    }
  }

  const loadMedicineAnalytics = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange()
      
      // First get pharmacy billing IDs
      const { data: pharmacyBills, error: billsError } = await supabase
        .from('billing')
        .select('id, issued_at, bill_no, bill_number')
        .is('bill_type', null) // Pharmacy bills have bill_type as NULL
        .gte('issued_at', dateRange.start)
        .lte('issued_at', dateRange.end + 'T23:59:59.999Z')

      if (billsError) {
        console.error('Error loading pharmacy bills:', billsError)
        return
      }

      if (!pharmacyBills || pharmacyBills.length === 0) {
        console.log('No pharmacy bills found for the selected period')
        setMedicineAnalytics([])
        setTopPerformers([])
        setLowPerformers([])
        setCategoryPerformance([])
        return
      }

      const pharmacyBillIds = pharmacyBills.map((bill: any) => bill.id)

      // Get billing items for pharmacy bills
      const { data: billItems, error: billError } = await supabase
        .from('billing_item')
        .select(`
          id,
          billing_id,
          medicine_id,
          description,
          qty,
          unit_amount,
          total_amount,
          batch_number,
          expiry_date,
          created_at
        `)
        .in('billing_id', pharmacyBillIds)

      if (billError) {
        console.error('Error loading bill items:', billError)
        return
      }

      // Get medication details
      const medicineIds = [...new Set((billItems || []).map((item: any) => item.medicine_id).filter(Boolean))]
      let medicationsMap: Record<string, any> = {}
      
      if (medicineIds.length > 0) {
        const { data: medications } = await supabase
          .from('medications')
          .select('*')
          .in('id', medicineIds)
        
        medicationsMap = (medications || []).reduce((acc: any, med: any) => {
          acc[med.id] = med
          return acc
        }, {})
      }

      console.log('Found pharmacy bills:', pharmacyBills.length)
      console.log('Found bill items:', billItems?.length)
      console.log('Found medications:', Object.keys(medicationsMap).length)

      // Process analytics data
      const analyticsMap: Record<string, MedicineAnalytics> = {} as Record<string, MedicineAnalytics>
      
      (billItems || []).forEach((item: any) => {
        const medId = item.medicine_id
        const medInfo = medicationsMap[medId]
        
        if (!analyticsMap[medId]) {
          analyticsMap[medId] = {
            id: medId,
            name: medInfo?.name || item.description || 'Unknown',
            category: medInfo?.category || 'Uncategorized',
            manufacturer: medInfo?.manufacturer || 'Unknown',
            total_sold: 0,
            total_revenue: 0,
            total_quantity: 0,
            average_price: 0,
            stock_level: medInfo?.available_stock || 0,
            minimum_stock_level: medInfo?.minimum_stock_level || 0,
            status: medInfo?.status || 'active',
            growth_rate: 0,
            profit_margin: 0
          }
        }
        
        const analytics = analyticsMap[medId]
        analytics.total_sold += Math.abs(item.qty || 0)
        analytics.total_revenue += Math.abs(item.total_amount || 0)
        analytics.total_quantity += Math.abs(item.qty || 0)
      })

      console.log('Processed analytics for medicines:', Object.keys(analyticsMap).length)

      // Calculate derived metrics and filter out medicines with zero sales
      const analyticsData = Object.values(analyticsMap)
        .map((med: any) => ({
          ...med,
          average_price: med.total_sold > 0 ? med.total_revenue / med.total_sold : 0
        }))
        .filter((med: any) => med.total_sold > 0) // Only include medicines with actual sales

      console.log('Filtered analytics (with sales):', analyticsData.length)

      // Filter and sort
      let filteredData = analyticsData
      if (selectedCategory !== 'All Categories') {
        filteredData = filteredData.filter((med: any) => med.category === selectedCategory)
      }
      if (searchTerm) {
        filteredData = filteredData.filter((med: any) => 
          med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          med.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Sort data
      filteredData.sort((a: any, b: any) => {
        let comparison = 0
        switch (sortBy) {
          case 'revenue':
            comparison = a.total_revenue - b.total_revenue
            break
          case 'quantity':
            comparison = a.total_sold - b.total_sold
            break
        }
        return sortOrder === 'asc' ? comparison : -comparison
      })

      setMedicineAnalytics(filteredData)
      
      // Set top and low performers
      const sortedByRevenue = [...filteredData].sort((a: any, b: any) => b.total_revenue - a.total_revenue)
      setTopPerformers(sortedByRevenue.slice(0, 10))
      setLowPerformers(sortedByRevenue.slice(-10).reverse())

      // Generate category performance
      const categoryMap: Record<string, { revenue: number; quantity: number; count: number }> = {}
      filteredData.forEach((med: any) => {
        if (!categoryMap[med.category]) {
          categoryMap[med.category] = { revenue: 0, quantity: 0, count: 0 }
        }
        categoryMap[med.category].revenue += med.total_revenue
        categoryMap[med.category].quantity += med.total_sold
        categoryMap[med.category].count += 1
      })

      const categoryData = Object.entries(categoryMap).map(([category, data]) => ({
        category,
        revenue: data.revenue,
        quantity: data.quantity,
        count: data.count,
        avg_revenue: data.revenue / data.count
      })).sort((a, b) => b.revenue - a.revenue)

      setCategoryPerformance(categoryData)

    } catch (error) {
      console.error('Error loading medicine analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const csv = [
      ['Medicine Name', 'Category', 'Manufacturer', 'Quantity Sold', 'Revenue', 'Stock Level'],
      ...medicineAnalytics.map((med) => [
        med.name,
        med.category,
        med.manufacturer,
        med.total_sold.toString(),
        med.total_revenue.toFixed(2),
        med.stock_level.toString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medicine-analytics-${selectedRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Loading medicine analytics...</div>
          <div className="text-sm text-gray-500">Analyzing medication performance</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pharmacy Reports</h1>
          <p className="text-gray-600 mt-1">Medicine performance and inventory analytics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Analytics
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
              {DATE_RANGES.map((range) => (
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
                  onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-green-800">Total Medicines Sold</h3>
            <div className="p-2 bg-green-500 rounded-lg">
              <Pill className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-900">
              {medicineAnalytics.reduce((sum, med) => sum + med.total_sold, 0).toLocaleString()}
            </div>
            <p className="text-xs text-green-700">
              {medicineAnalytics.length} unique medicines
            </p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-blue-800">Total Revenue</h3>
            <div className="p-2 bg-blue-500 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">
              {formatIndianCurrency(medicineAnalytics.reduce((sum, med) => sum + med.total_revenue, 0))}
            </div>
            <p className="text-xs text-blue-700">
              From medicine sales
            </p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-purple-800">Categories</h3>
            <div className="p-2 bg-purple-500 rounded-lg">
              <Package className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-900">{categoryPerformance.length}</div>
            <p className="text-xs text-purple-700">
              Medicine categories
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-blue-500" />
              Category Performance
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={categoryPerformance.slice(0, 8)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => `${category}: ${percentage?.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
              >
                {categoryPerformance.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(MEDICINE_COLORS)[index % Object.values(MEDICINE_COLORS).length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatIndianCurrency(value)} />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performers */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              Top Performing Medicines
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPerformers.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
                itemStyle={{ color: '#f3f4f6' }}
                formatter={(value: number) => formatIndianCurrency(value)}
              />
              <Bar dataKey="total_revenue" fill={MEDICINE_COLORS.high_performer} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Analytics Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
            Medicine Performance Analytics
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="revenue">Revenue</option>
              <option value="quantity">Quantity</option>
              <option value="margin">Profit Margin</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Level</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {medicineAnalytics.slice(0, 20).map((medicine) => (
                <tr key={medicine.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <Pill className="w-4 h-4 mr-2 text-gray-400" />
                      {medicine.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicine.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicine.manufacturer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {medicine.total_sold.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatIndianCurrency(medicine.total_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      medicine.stock_level <= medicine.minimum_stock_level ? 'text-red-600' : 
                      medicine.stock_level <= medicine.minimum_stock_level * 2 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {medicine.stock_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {medicineAnalytics.length === 0 && (
          <div className="text-center py-8">
            <Pill className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No medicine data found for the selected period</p>
          </div>
        )}
      </div>
    </div>
  )
}
