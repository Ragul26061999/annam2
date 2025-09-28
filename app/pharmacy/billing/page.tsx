'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Plus, 
  Receipt, 
  DollarSign, 
  Filter,
  Eye,
  Download,
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  TrendingUp,
  IndianRupee
} from 'lucide-react'
import { 
  getPharmacyBills,
  createPharmacyBill,
  getPharmacyDashboardStats
} from '@/src/lib/pharmacyService'

interface PharmacyBill {
  id: string
  patient_name: string
  patient_id: string
  total_amount: number
  payment_method: string
  created_at: string
  status: string
  items?: Array<{
    medicine_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>
}

interface DashboardStats {
  totalMedications: number
  lowStockCount: number
  todaysSales: number
  pendingOrders: number
}

export default function PharmacyBillingPage() {
  const [bills, setBills] = useState<PharmacyBill[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showCreateBillModal, setShowCreateBillModal] = useState(false)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      const [billsData, statsData] = await Promise.all([
        getPharmacyBills(),
        getPharmacyDashboardStats()
      ])

      // Map bills data
      const mappedBills = billsData.map((bill: any) => ({
        id: bill.id,
        patient_name: bill.patient_name,
        patient_id: bill.patient_id,
        total_amount: bill.total_amount,
        payment_method: bill.payment_method,
        created_at: bill.created_at,
        status: bill.status || 'completed',
        items: bill.items || []
      }))
      
      setBills(mappedBills)
      
      // Map dashboard stats
      setDashboardStats({
        totalMedications: statsData.totalMedications || 0,
        lowStockCount: statsData.lowStockCount || 0,
        todaysSales: statsData.todaySales || 0,
        pendingOrders: statsData.pendingBills || 0
      })
    } catch (err) {
      setError('Failed to load billing data')
      console.error('Error loading billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter
    const matchesPayment = paymentFilter === 'all' || bill.payment_method === paymentFilter
    
    let matchesDate = true
    if (dateFilter !== 'all') {
      const billDate = new Date(bill.created_at)
      const today = new Date()
      
      switch (dateFilter) {
        case 'today':
          matchesDate = billDate.toDateString() === today.toDateString()
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = billDate >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = billDate >= monthAgo
          break
      }
    }
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate
  })

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium'
      case 'cancelled':
        return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium'
      default:
        return 'bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium'
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <IndianRupee className="w-4 h-4 text-green-600" />
      case 'card':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      default:
        return <Receipt className="w-4 h-4 text-gray-600" />
    }
  }

  const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total_amount, 0)
  const todaysBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at)
    const today = new Date()
    return billDate.toDateString() === today.toDateString()
  })
  const todaysRevenue = todaysBills.reduce((sum, bill) => sum + bill.total_amount, 0)
  const averageBillAmount = filteredBills.length > 0 ? totalRevenue / filteredBills.length : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading billing data...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/pharmacy">
            <button className="btn-icon">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Billing</h1>
            <p className="text-gray-600 mt-1">Manage bills and payment records</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCreateBillModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Bill
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Bills</h3>
            <Receipt className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{filteredBills.length}</div>
            <p className="text-xs text-gray-500">All time records</p>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Today's Revenue</h3>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">₹{todaysRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">{todaysBills.length} bills today</p>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Revenue</h3>
            <IndianRupee className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">From filtered bills</p>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Average Bill</h3>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">₹{averageBillAmount.toFixed(0)}</div>
            <p className="text-xs text-gray-500">Per transaction</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by patient name, ID, or bill number..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            className="select"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentFilter(e.target.value)}
            className="select"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="insurance">Insurance</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateFilter(e.target.value)}
            className="select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button className="btn-icon">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Bills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBills.map((bill) => (
          <div key={bill.id} className="card hover:shadow-md transition-shadow">
            <div className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">Bill #{bill.id.slice(-8)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{bill.patient_name}</span>
                  </div>
                  <p className="text-xs text-gray-500">ID: {bill.patient_id}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className={getStatusBadgeClass(bill.status)}>
                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                  </span>
                  <div className="flex items-center gap-1">
                    {getPaymentMethodIcon(bill.payment_method)}
                    <span className="text-xs text-gray-600 capitalize">{bill.payment_method}</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-green-600 text-lg">₹{bill.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">
                    {new Date(bill.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                {bill.items && bill.items.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-600">Items: </span>
                    <span className="font-medium">{bill.items.length} medicine(s)</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn-secondary text-sm flex-1 flex items-center justify-center">
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </button>
                <button className="btn-secondary text-sm flex-1 flex items-center justify-center">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}