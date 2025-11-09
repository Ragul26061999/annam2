'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, Package, AlertTriangle, ShoppingCart, DollarSign, IndianRupee, Filter, Eye, Edit, Trash2, FileText, Users, Receipt, BarChart3, History, RefreshCw, X } from 'lucide-react'
import { 
  getPharmacyDashboardStats, 
  getMedications, 
  getPharmacyBills,
  getMedicineStockSummary,
  getStockTruth,
  getBatchPurchaseHistory,
  getMedicationStockRobust,
  getBatchStockRobust,
  getComprehensiveMedicineData
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
  const router = useRouter()
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
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailSummary, setDetailSummary] = useState<any | null>(null)
  const [detailHistory, setDetailHistory] = useState<any[]>([])
  const [comprehensiveData, setComprehensiveData] = useState<any | null>(null)

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
                <h3 className="text-sm font-medium">Pending Payments</h3>
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.pendingOrders}</div>
                <p className="text-xs text-gray-500">Awaiting payment</p>
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
                        <button
                          className="btn-secondary text-sm flex-1 flex items-center justify-center"
                          onClick={async () => {
                            setSelectedMedicine(medicine)
                            setShowDetailModal(true)
                            setLoadingDetail(true)
                            try {
                              // Load comprehensive medicine data using MCP
                              const comprehensiveData = await getComprehensiveMedicineData(medicine.id)
                              
                              if (comprehensiveData) {
                                setComprehensiveData(comprehensiveData)
                                
                                const convertedSummary = {
                                  medication_id: comprehensiveData.medication_info.id,
                                  total_quantity: comprehensiveData.stock_summary.total_stock,
                                  total_batches: comprehensiveData.stock_summary.total_batches,
                                  total_retail_value: comprehensiveData.stock_summary.total_retail_value,
                                  total_cost_value: comprehensiveData.stock_summary.total_cost_value,
                                  expired_quantity: comprehensiveData.stock_summary.expired_stock,
                                  expiring_soon_quantity: comprehensiveData.stock_summary.expiring_soon_stock,
                                  low_stock_batches: comprehensiveData.stock_summary.low_stock_batches,
                                  out_of_stock_batches: comprehensiveData.stock_summary.out_of_stock_batches
                                }
                                setDetailSummary(convertedSummary)
                                
                                // Set purchase history from comprehensive data
                                setDetailHistory(comprehensiveData.purchase_history.slice(0, 10))
                              } else {
                                // Fallback to robust functions
                                const [robustSummary, stockTruth] = await Promise.all([
                                  getMedicationStockRobust(medicine.id),
                                  getStockTruth(medicine.id)
                                ])
                                
                                if (robustSummary) {
                                  const convertedSummary = {
                                    medication_id: robustSummary.medication_id,
                                    total_quantity: Math.max(0, robustSummary.current_stock || 0),
                                    total_batches: Math.max(0, robustSummary.total_batches || 0),
                                    total_retail_value: 0,
                                    total_cost_value: 0,
                                    expired_quantity: Math.max(0, robustSummary.expired_units || 0),
                                    expiring_soon_quantity: 0,
                                    low_stock_batches: 0,
                                    out_of_stock_batches: 0
                                  }
                                  setDetailSummary(convertedSummary)
                                }
                                setDetailHistory([])
                              }
                            } catch (e) {
                              console.error('detail load failed', e)
                              setDetailSummary(null)
                              setDetailHistory([])
                            } finally {
                              setLoadingDetail(false)
                            }
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </button>
                        <button
                          className="btn-secondary text-sm flex-1 flex items-center justify-center"
                          onClick={() => {
                            setSelectedMedicine(medicine)
                            setShowMedicineModal(true)
                          }}
                        >
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
          preselectedMedicine={selectedMedicine ? { id: selectedMedicine.id, name: selectedMedicine.name, medication_code: selectedMedicine.medicine_code } : undefined}
          initialTab={selectedMedicine ? 'batch' : undefined}
          onClose={() => setShowMedicineModal(false)}
          onSuccess={async () => {
            setShowMedicineModal(false)
            await loadData()
          }}
        />
      )}

      {/* Lightweight Medicine View Modal */}
      {showViewModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">{selectedMedicine.name}</h3>
                <p className="text-slate-300 text-sm">{selectedMedicine.category}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="hover:bg-white/20 rounded-full p-2">
                <Eye className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Code</span><span className="font-medium">{selectedMedicine.medicine_code || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Manufacturer</span><span className="font-medium">{selectedMedicine.manufacturer || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Category</span><span className="font-medium">{selectedMedicine.category || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Stock</span><span className="font-medium">{selectedMedicine.stock_quantity} units</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Price</span><span className="font-medium">₹{selectedMedicine.unit_price}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Batch</span><span className="font-medium">{selectedMedicine.batch_number || '—'}</span></div>
              {selectedMedicine.expiry_date && (
                <div className="flex justify-between"><span className="text-gray-600">Expiry</span><span className="font-medium">{new Date(selectedMedicine.expiry_date).toLocaleDateString()}</span></div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowViewModal(false)} className="btn-secondary">Close</button>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedMedicine(selectedMedicine)
                  setShowMedicineModal(true)
                }}
                className="btn-primary"
              >
                + Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Medicine modal similar to inventory */}
      {showDetailModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 shadow-lg flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{selectedMedicine.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                  <div><div className="text-slate-300 text-xs">Code</div><div className="font-semibold">{selectedMedicine.medicine_code || 'N/A'}</div></div>
                  <div><div className="text-slate-300 text-xs">Category</div><div className="font-semibold">{selectedMedicine.category}</div></div>
                  <div><div className="text-slate-300 text-xs">Manufacturer</div><div className="font-semibold">{selectedMedicine.manufacturer || 'N/A'}</div></div>
                  <div><div className="text-slate-300 text-xs">Price</div><div className="font-semibold">₹{selectedMedicine.unit_price}</div></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedMedicine(selectedMedicine)
                    setShowMedicineModal(true)
                  }}
                  className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Batch
                </button>
                <button onClick={() => setShowDetailModal(false)} className="text-white hover:bg-white/20 rounded-full p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
              {loadingDetail ? (
                <div className="text-center py-12">Loading medicine details...</div>
              ) : (
                <>
                  {!detailSummary ? (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg mb-2">No batches available</p>
                      <p className="text-sm">Add the first batch to start tracking inventory</p>
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            setShowDetailModal(false)
                            setSelectedMedicine(selectedMedicine)
                            setShowMedicineModal(true)
                          }}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Batch
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Stock Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Stock</div>
                            <div className="text-2xl font-bold text-blue-800">{detailSummary.total_quantity || 0}</div>
                            <div className="text-xs text-blue-500 mt-1">Units available</div>
                          </div>
                          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                            <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Batches</div>
                            <div className="text-2xl font-bold text-green-800">{detailSummary.total_batches || 0}</div>
                            <div className="text-xs text-green-500 mt-1">Active batches</div>
                          </div>
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                            <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">Retail Value</div>
                            <div className="text-2xl font-bold text-purple-800">₹{(detailSummary.total_retail_value || 0).toLocaleString()}</div>
                            <div className="text-xs text-purple-500 mt-1">Current inventory value</div>
                          </div>
                          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                            <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">Cost Value</div>
                            <div className="text-2xl font-bold text-orange-800">₹{(detailSummary.total_cost_value || 0).toLocaleString()}</div>
                            <div className="text-xs text-orange-500 mt-1">Investment value</div>
                          </div>
                          {detailSummary.expired_quantity > 0 && (
                            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                              <div className="text-xs text-red-600 font-medium uppercase tracking-wide">Expired Stock</div>
                              <div className="text-2xl font-bold text-red-800">{detailSummary.expired_quantity}</div>
                              <div className="text-xs text-red-500 mt-1">Needs attention</div>
                            </div>
                          )}
                          {detailSummary.expiring_soon_quantity > 0 && (
                            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                              <div className="text-xs text-yellow-600 font-medium uppercase tracking-wide">Expiring Soon</div>
                              <div className="text-2xl font-bold text-yellow-800">{detailSummary.expiring_soon_quantity}</div>
                              <div className="text-xs text-yellow-500 mt-1">Within 90 days</div>
                            </div>
                          )}
                          {detailSummary.low_stock_batches > 0 && (
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                              <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Low Stock Batches</div>
                              <div className="text-2xl font-bold text-amber-800">{detailSummary.low_stock_batches}</div>
                              <div className="text-xs text-amber-500 mt-1">Need restocking</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-semibold">Purchase History</h3>
                          <button className="btn-secondary text-sm" onClick={async () => {
                            // No batch specified; keep simple refresh
                            setLoadingDetail(true)
                            try {
                              // We don't have a single batch; keep empty or fetch latest by service if needed
                              setDetailHistory([])
                            } finally { setLoadingDetail(false) }
                          }}>
                            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                          </button>
                        </div>
                        {detailHistory.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                            <p className="text-sm">No purchase history found</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-gray-50">
                                  <th className="text-left py-2 px-3 font-medium">Date</th>
                                  <th className="text-left py-2 px-3 font-medium">Batch</th>
                                  <th className="text-left py-2 px-3 font-medium">Qty</th>
                                  <th className="text-left py-2 px-3 font-medium">Rate</th>
                                  <th className="text-left py-2 px-3 font-medium">Amount</th>
                                  <th className="text-left py-2 px-3 font-medium">Supplier</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailHistory.map((h, index) => (
                                  <tr key={h.id || index} className="border-b hover:bg-gray-50">
                                    <td className="py-2 px-3">{new Date(h.purchase_date || h.purchased_at).toLocaleDateString()}</td>
                                    <td className="py-2 px-3">
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                        {h.batch_number || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-medium">{h.quantity}</td>
                                    <td className="py-2 px-3">₹{(h.unit_price || 0).toFixed(2)}</td>
                                    <td className="py-2 px-3 font-medium text-green-600">₹{(h.total_amount || 0).toLocaleString()}</td>
                                    <td className="py-2 px-3 text-gray-600">{h.supplier_name || 'Unknown'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}