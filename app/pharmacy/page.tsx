'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  DollarSign,
  IndianRupee,
  Filter,
  Eye,
  Edit,
  Trash2,
  FileText,
  Users,
  Receipt,
  BarChart3
} from 'lucide-react'
import { 
  getPharmacyDashboardStats, 
  getMedications, 
  getPharmacyBills 
} from '@/src/lib/pharmacyService'
import MedicineEntryForm from '@/src/components/MedicineEntryForm'
// Do not import page modules for embedding; navigate to their routes instead

interface Medicine {
  id: string
  medicine_code?: string
  name: string
  category: string
  stock_quantity: number
  unit_price: number
  expiry_date?: string
  manufacturer: string
  batch_number: string
  minimum_stock_level: number
}

interface PharmacyBill {
  id: string
  bill_number: string
  patient_id: string
  total_amount: number
  payment_status: string
  created_at: string
}

interface DashboardStats {
  totalMedications: number
  lowStockCount: number
  todaysSales: number
  pendingOrders: number
}

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [bills, setBills] = useState<PharmacyBill[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalMedications: 0,
    lowStockCount: 0,
    todaysSales: 0,
    pendingOrders: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showMedicineModal, setShowMedicineModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [dashboardData, medicinesData, billsData] = await Promise.all([
        getPharmacyDashboardStats(),
        getMedications(),
        getPharmacyBills()
      ])

      // Map dashboard data to match our interface
       setStats({
         totalMedications: dashboardData.totalMedications || 0,
         lowStockCount: dashboardData.lowStockCount || 0,
         todaysSales: dashboardData.todaySales || 0,
         pendingOrders: dashboardData.pendingBills || 0
       })
      
      // Map medicines data
      const mappedMedicines = medicinesData.map((med: any) => ({
        id: med.id,
        medicine_code: med.medicine_code,
        name: med.name,
        category: med.category,
        stock_quantity: med.available_stock ?? med.stock_quantity ?? 0,
        unit_price: med.unit_price,
        expiry_date: med.expiry_date,
        manufacturer: med.manufacturer,
        batch_number: med.batch_number,
        minimum_stock_level: med.minimum_stock_level
      }))
      setMedicines(mappedMedicines)
      
      // Map bills data
      const mappedBills = billsData.map((bill: any) => ({
        id: bill.id,
        bill_number: bill.bill_number,
        patient_id: bill.patient_id,
        total_amount: bill.total_amount,
        payment_status: bill.payment_status,
        created_at: bill.created_at
      }))
      // Store all bills; we'll limit to 5 only in the dashboard "Recent Bills" view
      setBills(mappedBills)
    } catch (err) {
      setError('Failed to load pharmacy data')
      console.error('Error loading pharmacy data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = (medicine.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (medicine.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (medicine.manufacturer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (medicine.batch_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (medicine.medicine_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || medicine.category === categoryFilter
    return matchesSearch && matchesCategory
  }).slice(0, 6) // Show only first 6 medicines

  const categories = Array.from(new Set(medicines.map(m => m.category)))

  const getStockStatus = (medicine: Medicine) => {
    if (medicine.stock_quantity <= 0) {
      return { status: 'Out of Stock', variant: 'destructive' as const }
    } else if (medicine.stock_quantity <= medicine.minimum_stock_level) {
      return { status: 'Low Stock', variant: 'destructive' as const }
    } else if (medicine.stock_quantity <= medicine.minimum_stock_level * 2) {
      return { status: 'Medium Stock', variant: 'secondary' as const }
    }
    return { status: 'In Stock', variant: 'default' as const }
  }

  const getBadgeClass = (variant: string) => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium'
      case 'secondary':
        return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium'
      default:
        return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading pharmacy data...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pharmacy Management</h1>
          <p className="text-gray-600 mt-1">Manage medicines, inventory, and billing</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pharmacy/newbilling" className="btn-primary flex items-center">
            <Receipt className="w-4 h-4 mr-2" />
            New Billing
          </Link>
          <button 
            className="btn-primary flex items-center"
            onClick={() => setShowMedicineModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medicine
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('prescribed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'prescribed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Prescribed List
          </button>
          <button
            onClick={() => setActiveTab('newbilling')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'newbilling'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Receipt className="w-4 h-4 inline mr-2" />
            New Billing
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'billing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <IndianRupee className="w-4 h-4 inline mr-2" />
            Billing History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Total Medicines</h3>
                <Package className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalMedications}</div>
                <p className="text-xs text-gray-500">Active inventory items</p>
              </div>
            </div>

            <div className="card">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Low Stock Items</h3>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
                <p className="text-xs text-gray-500">Need restocking</p>
              </div>
            </div>

            <div className="card">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Today's Sales</h3>
                <IndianRupee className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">₹{stats.todaysSales.toLocaleString()}</div>
                <p className="text-xs text-gray-500">Revenue today</p>
              </div>
            </div>

            <div className="card">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Pending Orders</h3>
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.pendingOrders}</div>
                <p className="text-xs text-gray-500">Awaiting processing</p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
                className="select"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
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

          {/* Recent Medicines */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Medicines</h2>
              <button 
                onClick={() => setActiveTab('inventory')}
                className="btn-secondary text-sm"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedicines.map((medicine) => {
                const stockStatus = getStockStatus(medicine)
                return (
                  <div key={medicine.id} className="card hover:shadow-md transition-shadow">
                    <div className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            {medicine.name}
                            {medicine.medicine_code && (
                              <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                {medicine.medicine_code}
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">{medicine.category}</p>
                        </div>
                        <span className={getBadgeClass(stockStatus.variant)}>
                          {stockStatus.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Stock:</span>
                          <span className="font-medium">{medicine.stock_quantity} units</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-medium">₹{medicine.unit_price}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Batch:</span>
                          <span className="font-medium">{medicine.batch_number}</span>
                        </div>
                        {medicine.expiry_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Expiry:</span>
                            <span className="font-medium">
                              {new Date(medicine.expiry_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button className="btn-secondary text-sm flex-1 flex items-center justify-center">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </button>
                        <button className="btn-secondary text-sm flex-1 flex items-center justify-center">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Bills */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Bills</h2>
              <button 
                onClick={() => setActiveTab('billing')}
                className="btn-secondary text-sm"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bills.slice(0, 5).map((bill) => (
                <div key={bill.id} className="card hover:shadow-md transition-shadow">
                  <div className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">#{bill.bill_number}</h3>
                        <p className="text-sm text-gray-600">Patient ID: {bill.patient_id}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bill.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bill.payment_status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium text-green-600">₹{bill.total_amount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">
                          {new Date(bill.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setActiveTab('billing')} className="btn-secondary text-sm flex-1 flex items-center justify-center">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prescribed' && (
        <div className="space-y-6">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Prescribed List</h3>
            <p className="text-gray-600">Manage patient prescriptions and medicine dispensing</p>
            <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
          </div>
        </div>
      )}

      {activeTab === 'newbilling' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 text-center">
            <p className="mb-4 text-gray-700">Open the New Billing flow in its dedicated page.</p>
            <Link href="/pharmacy/newbilling" className="btn-primary inline-flex items-center">
              <Receipt className="w-4 h-4 mr-2" />
              Go to New Billing
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 text-center">
            <p className="mb-4 text-gray-700">Open the Inventory view in its dedicated page.</p>
            <Link href="/pharmacy/inventory" className="btn-primary inline-flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Go to Inventory
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 text-center">
            <p className="mb-4 text-gray-700">Open the Billing History in its dedicated page.</p>
            <Link href="/pharmacy/billing" className="btn-primary inline-flex items-center">
              <IndianRupee className="w-4 h-4 mr-2" />
              Go to Billing History
            </Link>
          </div>
        </div>
      )}
      {showMedicineModal && (
        <MedicineEntryForm
          onClose={() => setShowMedicineModal(false)}
          onSuccess={async () => {
            setShowMedicineModal(false)
            await loadData()
          }}
        />
      )}
    </div>
  )
}