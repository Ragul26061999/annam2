'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, Package, AlertTriangle, ShoppingCart, DollarSign, IndianRupee, Filter, Eye, Edit, Trash2, FileText, Users, Receipt, BarChart3, History, RefreshCw, X, TrendingUp, TrendingDown, Calendar, PieChart, Activity, RotateCcw, Building2, Wallet } from 'lucide-react'
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
import {
  getPharmacyDashboardStats,
  getMedications,
  getPharmacyBills,
  getMedicineStockSummary,
  getStockTruth,
  getBatchPurchaseHistory,
  getMedicationStockRobust,
  getBatchStockRobust,
  getComprehensiveMedicineData,
  getInventoryAnalytics
} from '@/src/lib/pharmacyService'
import MedicineEntryForm from '@/src/components/MedicineEntryForm'
import { supabase } from '@/src/lib/supabase'
// Do not import page modules for embedding; navigate to their routes instead

// Indian Currency Formatter
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
  const [bills, setBills] = useState<PharmacyBill[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalMedications: 0,
    lowStockCount: 0,
    todaysSales: 0,
    pendingOrders: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showMedicineModal, setShowMedicineModal] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailSummary, setDetailSummary] = useState<any | null>(null)
  const [detailHistory, setDetailHistory] = useState<any[]>([])
  const [comprehensiveData, setComprehensiveData] = useState<any | null>(null)
  const [inventoryAnalytics, setInventoryAnalytics] = useState<any | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // Interactive modals state
  const [showExpiryModal, setShowExpiryModal] = useState(false)
  const [showStockAlertsModal, setShowStockAlertsModal] = useState(false)
  const [expiryDetails, setExpiryDetails] = useState<any[]>([])
  const [stockAlertDetails, setStockAlertDetails] = useState<any[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    loadData()
    loadAnalytics()
  }, [])

  useEffect(() => {
    if (activeTab !== 'dashboard') return

    const interval = setInterval(() => {
      loadData()
      loadAnalytics()
    }, 30000)

    return () => clearInterval(interval)
  }, [activeTab])

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const analyticsData = await getInventoryAnalytics()
      setInventoryAnalytics(analyticsData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  // Fetch detailed expiry information
  const loadExpiryDetails = async (period: string) => {
    try {
      setDetailsLoading(true)
      console.log('Loading expiry details for period:', period)

      // First, let's see what the analytics data shows for comparison
      console.log('Current analytics expiry analysis:', inventoryAnalytics?.expiryAnalysis)

      // Try without any filters first to see all batches
      const { data: allBatches, error: allError } = await supabase
        .from('medicine_batches')
        .select(`
          id,
          batch_number,
          expiry_date,
          current_quantity,
          selling_price,
          medicine_id
        `)

      console.log('All batches fetched (simple query):', allBatches?.length || 0, 'Error:', allError)

      if (allError || !allBatches || allBatches.length === 0) {
        console.log('Trying with inner join...')

        // Try with inner join as fallback
        const { data: joinedBatches, error: joinError } = await supabase
          .from('medicine_batches')
          .select(`
            id,
            batch_number,
            expiry_date,
            current_quantity,
            selling_price,
            medications!inner (
              id,
              name,
              category,
              manufacturer
            )
          `)

        console.log('Joined batches fetched:', joinedBatches?.length || 0, 'Error:', joinError)

        if (joinError || !joinedBatches) {
          console.error('Both queries failed')
          setExpiryDetails([])
          setShowExpiryModal(true)
          return
        }

        processBatchData(joinedBatches, period)
        return
      }

      processBatchData(allBatches, period)
    } catch (error) {
      console.error('Error loading expiry details:', error)
      setExpiryDetails([])
      setShowExpiryModal(true)
    } finally {
      setDetailsLoading(false)
    }
  }

  const processBatchData = async (batches: any[], period: string) => {
    try {
      console.log('Sample batch data:', batches.slice(0, 3))

      // Filter manually for current_quantity > 0
      const batchesWithStock = batches.filter(batch => batch.current_quantity > 0)
      console.log('Batches with stock > 0:', batchesWithStock.length)

      // If we don't have medication info, fetch it separately
      let batchesWithMedInfo = batchesWithStock
      if (!batchesWithStock[0]?.medications) {
        console.log('Fetching medication info separately...')
        const medicineIds = [...new Set(batchesWithStock.map(b => b.medicine_id).filter(id => id))]

        if (medicineIds.length > 0) {
          const { data: medicines, error: medError } = await supabase
            .from('medications')
            .select('id, name, category, manufacturer')
            .in('id', medicineIds)

          if (!medError && medicines) {
            batchesWithMedInfo = batchesWithStock.map(batch => ({
              ...batch,
              medications: medicines.find(med => med.id === batch.medicine_id) || {
                id: batch.medicine_id,
                name: 'Unknown Medicine',
                category: 'Unknown',
                manufacturer: 'Unknown'
              }
            }))
          }
        }
      }

      // Now filter by expiry period
      const now = new Date()
      let filtered: any[] = []

      console.log('Filtering for period:', period)
      console.log('Current date:', now.toISOString())

      if (period === 'Expired') {
        filtered = batchesWithMedInfo.filter(batch => {
          const expiry = new Date(batch.expiry_date)
          return expiry < now
        })
      } else if (period === 'Expiring in 30 days') {
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
        console.log('30 days from now:', thirtyDaysFromNow.toISOString())
        filtered = batchesWithMedInfo.filter(batch => {
          const expiry = new Date(batch.expiry_date)
          return expiry >= now && expiry <= thirtyDaysFromNow
        })
      } else if (period === 'Expiring in 31-60 days') {
        const thirtyOneDaysFromNow = new Date(now.getTime() + (31 * 24 * 60 * 60 * 1000))
        const sixtyDaysFromNow = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000))
        console.log('31 days from now:', thirtyOneDaysFromNow.toISOString())
        console.log('60 days from now:', sixtyDaysFromNow.toISOString())
        filtered = batchesWithMedInfo.filter(batch => {
          const expiry = new Date(batch.expiry_date)
          return expiry >= thirtyOneDaysFromNow && expiry <= sixtyDaysFromNow
        })
      } else if (period === 'Expiring in 61-90 days') {
        const sixtyOneDaysFromNow = new Date(now.getTime() + (61 * 24 * 60 * 60 * 1000))
        const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000))
        console.log('61 days from now:', sixtyOneDaysFromNow.toISOString())
        console.log('90 days from now:', ninetyDaysFromNow.toISOString())
        filtered = batchesWithMedInfo.filter(batch => {
          const expiry = new Date(batch.expiry_date)
          return expiry >= sixtyOneDaysFromNow && expiry <= ninetyDaysFromNow
        })
      } else if (period === 'Expiring in 90+ days') {
        const ninetyOneDaysFromNow = new Date(now.getTime() + (91 * 24 * 60 * 60 * 1000))
        console.log('91 days from now:', ninetyOneDaysFromNow.toISOString())
        filtered = batchesWithMedInfo.filter(batch => new Date(batch.expiry_date) >= ninetyOneDaysFromNow)
      }

      console.log('Filtered batches:', filtered.length)

      // Log filtered batches for debugging
      if (filtered.length > 0) {
        console.log('Sample filtered batch:', filtered[0])
      } else {
        console.log('No batches found in this period. Checking expiry dates of all batches...')
        batchesWithMedInfo.forEach((batch, index) => {
          if (index < 5) { // Show first 5 for debugging
            const expiry = new Date(batch.expiry_date)
            const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            console.log(`Batch ${batch.batch_number}: Expiry ${batch.expiry_date}, Days to expiry: ${daysToExpiry}, Stock: ${batch.current_quantity}`)
          }
        })
      }

      const processedDetails = filtered.map(batch => {
        const daysToExpiry = Math.ceil((new Date(batch.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const value = batch.current_quantity * (batch.selling_price || 0)

        return {
          ...batch,
          medications: batch.medications,
          days_to_expiry: daysToExpiry,
          total_value: value,
          status: daysToExpiry < 0 ? 'expired' : daysToExpiry <= 30 ? 'critical' : daysToExpiry <= 60 ? 'warning' : 'normal'
        }
      }).sort((a, b) => a.days_to_expiry - b.days_to_expiry)

      console.log('Processed details:', processedDetails.length)
      setExpiryDetails(processedDetails)
      setShowExpiryModal(true)
    } catch (error) {
      console.error('Error processing batch data:', error)
      setExpiryDetails([])
      setShowExpiryModal(true)
    }
  }

  // Fetch detailed stock alert information
  const loadStockAlertDetails = async (alertType: string) => {
    try {
      setDetailsLoading(true)

      if (alertType === 'low') {
        // Try simple query first
        const { data: medications, error: medError } = await supabase
          .from('medications')
          .select(`
            id,
            name,
            category,
            manufacturer,
            available_stock,
            minimum_stock_level,
            unit_price,
            medicine_code
          `)

        console.log('Low stock medications fetched (simple):', medications?.length || 0, 'Error:', medError)

        if (medError) {
          console.error('Error fetching low stock medications:', medError)
          setStockAlertDetails([])
          setShowStockAlertsModal(true)
          return
        }

        // Filter manually for low stock items
        const lowStockMeds = medications?.filter(med =>
          med.available_stock > 0 && med.available_stock <= med.minimum_stock_level
        ) || []

        console.log('Low stock medications after filtering:', lowStockMeds.length)

        if (lowStockMeds.length > 0) {
          const processedDetails = lowStockMeds.map(med => ({
            ...med,
            alert_type: 'low_stock',
            shortage_quantity: Math.max(0, med.minimum_stock_level - med.available_stock),
            reorder_value: med.minimum_stock_level * 2 * (med.unit_price || 0)
          })).sort((a, b) => (a.available_stock / a.minimum_stock_level) - (b.available_stock / b.minimum_stock_level))

          setStockAlertDetails(processedDetails)
          setShowStockAlertsModal(true)
        } else {
          setStockAlertDetails([])
          setShowStockAlertsModal(true)
        }
      } else if (alertType === 'expired') {
        // Try simple query first
        const { data: batches, error: batchError } = await supabase
          .from('medicine_batches')
          .select(`
            id,
            batch_number,
            expiry_date,
            current_quantity,
            selling_price,
            medicine_id
          `)

        console.log('Expired batches fetched (simple):', batches?.length || 0, 'Error:', batchError)

        if (batchError) {
          console.error('Error fetching expired batches:', batchError)
          setStockAlertDetails([])
          setShowStockAlertsModal(true)
          return
        }

        // Filter manually for expired batches with stock
        const now = new Date()
        const expiredBatches = batches?.filter(batch =>
          batch.current_quantity > 0 && new Date(batch.expiry_date) < now
        ) || []

        console.log('Expired batches after filtering:', expiredBatches.length)

        if (expiredBatches.length > 0) {
          // Fetch medication info separately
          const medicineIds = [...new Set(expiredBatches.map(b => b.medicine_id).filter(id => id))]
          let medicines: any[] = []

          if (medicineIds.length > 0) {
            const { data: medData } = await supabase
              .from('medications')
              .select('id, name, category, manufacturer')
              .in('id', medicineIds)
            medicines = medData || []
          }

          const processedDetails = expiredBatches.map(batch => ({
            ...batch,
            medications: medicines.find(med => med.id === batch.medicine_id) || {
              id: batch.medicine_id,
              name: 'Unknown Medicine',
              category: 'Unknown',
              manufacturer: 'Unknown'
            },
            alert_type: 'expired',
            total_value: batch.current_quantity * (batch.selling_price || 0),
            days_expired: Math.ceil((now.getTime() - new Date(batch.expiry_date).getTime()) / (1000 * 60 * 60 * 24))
          })).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())

          setStockAlertDetails(processedDetails)
          setShowStockAlertsModal(true)
        } else {
          setStockAlertDetails([])
          setShowStockAlertsModal(true)
        }
      } else if (alertType === 'expiring') {
        // Try simple query for expiring soon (next 30 days)
        const { data: batches, error: batchError } = await supabase
          .from('medicine_batches')
          .select(`
            id,
            batch_number,
            expiry_date,
            current_quantity,
            selling_price,
            medicine_id
          `)

        console.log('Expiring batches fetched (simple):', batches?.length || 0, 'Error:', batchError)

        if (batchError) {
          console.error('Error fetching expiring batches:', batchError)
          setStockAlertDetails([])
          setShowStockAlertsModal(true)
          return
        }

        // Filter manually for expiring batches (next 30 days)
        const now = new Date()
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
        const expiringBatches = batches?.filter(batch =>
          batch.current_quantity > 0 &&
          new Date(batch.expiry_date) >= now &&
          new Date(batch.expiry_date) <= thirtyDaysFromNow
        ) || []

        console.log('Expiring batches after filtering:', expiringBatches.length)

        if (expiringBatches.length > 0) {
          // Fetch medication info separately
          const medicineIds = [...new Set(expiringBatches.map(b => b.medicine_id).filter(id => id))]
          let medicines: any[] = []

          if (medicineIds.length > 0) {
            const { data: medData } = await supabase
              .from('medications')
              .select('id, name, category, manufacturer')
              .in('id', medicineIds)
            medicines = medData || []
          }

          const processedDetails = expiringBatches.map(batch => ({
            ...batch,
            medications: medicines.find(med => med.id === batch.medicine_id) || {
              id: batch.medicine_id,
              name: 'Unknown Medicine',
              category: 'Unknown',
              manufacturer: 'Unknown'
            },
            alert_type: 'expiring_soon',
            total_value: batch.current_quantity * (batch.selling_price || 0),
            days_to_expiry: Math.ceil((new Date(batch.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          })).sort((a, b) => a.days_to_expiry - b.days_to_expiry)

          setStockAlertDetails(processedDetails)
          setShowStockAlertsModal(true)
        } else {
          setStockAlertDetails([])
          setShowStockAlertsModal(true)
        }
      }
    } catch (error) {
      console.error('Error loading stock alert details:', error)
      setStockAlertDetails([])
      setShowStockAlertsModal(true)
    } finally {
      setDetailsLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [dashboardData, billsData] = await Promise.all([
        getPharmacyDashboardStats(),
        getPharmacyBills()
      ])

      // Map dashboard data to match our interface
      setStats({
        totalMedications: dashboardData.totalMedications || 0,
        lowStockCount: dashboardData.lowStockCount || 0,
        todaysSales: dashboardData.todaySales || 0,
        pendingOrders: dashboardData.pendingBills || 0
      })

      // Map bills data
      const mappedBills = billsData.map((bill: any) => ({
        id: bill.id,
        bill_number: bill.bill_number,
        patient_id: bill.patient_id,
        total_amount: bill.total_amount,
        payment_status: bill.payment_status,
        created_at: bill.created_at
      }))
      setBills(mappedBills)
    } catch (err) {
      setError('Failed to load pharmacy data')
      console.error('Error loading pharmacy data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Chart colors
  const CHART_COLORS = {
    primary: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
    pie: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'],
    gradient: {
      blue: { start: '#3b82f6', end: '#1d4ed8' },
      green: { start: '#10b981', end: '#059669' },
      orange: { start: '#f59e0b', end: '#d97706' },
      red: { start: '#ef4444', end: '#dc2626' },
      purple: { start: '#8b5cf6', end: '#7c3aed' }
    }
  }

  if (loading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Loading pharmacy data...</div>
          {analyticsLoading && <div className="text-sm text-gray-500">Preparing analytics and charts...</div>}
        </div>
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

      {/* Quick Access Cards - All Pharmacy Modules */}
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
        <Link href="/pharmacy/purchase" className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-3 text-center transition-colors">
          <ShoppingCart className="w-6 h-6 mx-auto text-blue-600 mb-1" />
          <div className="text-xs font-medium text-blue-800">Drug Purchase</div>
        </Link>
        <Link href="/pharmacy/purchase-return" className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg p-3 text-center transition-colors">
          <RotateCcw className="w-6 h-6 mx-auto text-orange-600 mb-1" />
          <div className="text-xs font-medium text-orange-800">Purchase Return</div>
        </Link>
        <Link href="/pharmacy/department-issue" className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-3 text-center transition-colors">
          <Building2 className="w-6 h-6 mx-auto text-purple-600 mb-1" />
          <div className="text-xs font-medium text-purple-800">Dept Issue</div>
        </Link>
        <Link href="/pharmacy/newbilling" className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-3 text-center transition-colors">
          <Receipt className="w-6 h-6 mx-auto text-green-600 mb-1" />
          <div className="text-xs font-medium text-green-800">Drug Sales</div>
        </Link>
        <Link href="/pharmacy/sales-return-v2" className="bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-3 text-center transition-colors">
          <RotateCcw className="w-6 h-6 mx-auto text-red-600 mb-1" />
          <div className="text-xs font-medium text-red-800">Sales Return</div>
        </Link>
        <Link href="/pharmacy/drug-broken" className="bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg p-3 text-center transition-colors">
          <AlertTriangle className="w-6 h-6 mx-auto text-amber-600 mb-1" />
          <div className="text-xs font-medium text-amber-800">Drug Broken</div>
        </Link>
        <Link href="/pharmacy/reports" className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg p-3 text-center transition-colors">
          <FileText className="w-6 h-6 mx-auto text-indigo-600 mb-1" />
          <div className="text-xs font-medium text-indigo-800">Medical Report</div>
        </Link>
        <Link href="/pharmacy/reports?tab=gst" className="bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg p-3 text-center transition-colors">
          <IndianRupee className="w-6 h-6 mx-auto text-teal-600 mb-1" />
          <div className="text-xs font-medium text-teal-800">GST Report</div>
        </Link>
        <Link href="/pharmacy/reports?tab=stock" className="bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg p-3 text-center transition-colors">
          <Package className="w-6 h-6 mx-auto text-cyan-600 mb-1" />
          <div className="text-xs font-medium text-cyan-800">Stock Report</div>
        </Link>
        <Link href="/pharmacy/cash-collection" className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg p-3 text-center transition-colors">
          <Wallet className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
          <div className="text-xs font-medium text-emerald-800">Cash Collection</div>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'dashboard'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => router.push('/pharmacy/prescribed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'prescribed'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Prescribed List
          </button>
          <button
            onClick={() => setActiveTab('newbilling')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'newbilling'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Receipt className="w-4 h-4 inline mr-2" />
            New Billing
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'billing'
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
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-blue-800">Total Stock Value</h3>
                <div className="p-2 bg-blue-500 rounded-lg">
                  <IndianRupee className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatIndianCurrency(inventoryAnalytics?.totalStockValue?.retailValue || 0)}
                </div>
                <div className="flex items-center space-x-2 text-xs text-blue-700">
                  <span>Cost: {formatIndianCurrency(inventoryAnalytics?.totalStockValue?.costValue || 0)}</span>
                  <span>•</span>
                  <span>Margin: {inventoryAnalytics?.totalStockValue?.profitMargin?.toFixed(1) || '0'}%</span>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-green-800">Total Units</h3>
                <div className="p-2 bg-green-500 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {inventoryAnalytics?.stockSummary?.totalUnits?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-green-700">
                  {inventoryAnalytics?.stockSummary?.totalMedicines || '0'} medicines • {inventoryAnalytics?.stockSummary?.totalBatches || '0'} batches
                </p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-orange-800">Stock Alerts</h3>
                <div className="p-2 bg-orange-500 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-900">
                  {(inventoryAnalytics?.stockSummary?.lowStockItems || 0) + (inventoryAnalytics?.stockSummary?.expiredItems || 0)}
                </div>
                <div className="flex items-center space-x-2 text-xs text-orange-700">
                  <span>Low: {inventoryAnalytics?.stockSummary?.lowStockItems || 0}</span>
                  <span>•</span>
                  <span>Expired: {inventoryAnalytics?.stockSummary?.expiredItems || 0}</span>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-purple-800">Today's Sales</h3>
                <div className="p-2 bg-purple-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-900">{formatIndianCurrency(stats.todaysSales)}</div>
                <p className="text-xs text-purple-700">Revenue today</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trends Chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-500" />
                  Monthly Trends
                </h3>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                    <span>Purchases</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                    <span>Sales</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
                    <span>Revenue</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={inventoryAnalytics?.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    itemStyle={{ color: '#f3f4f6' }}
                  />
                  <Line type="monotone" dataKey="purchases" stroke={CHART_COLORS.primary[0]} strokeWidth={2} dot={{ fill: CHART_COLORS.primary[0], r: 4 }} />
                  <Line type="monotone" dataKey="sales" stroke={CHART_COLORS.primary[1]} strokeWidth={2} dot={{ fill: CHART_COLORS.primary[1], r: 4 }} />
                  <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary[4]} strokeWidth={2} dot={{ fill: CHART_COLORS.primary[4], r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown Pie Chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-green-500" />
                  Category Breakdown
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={inventoryAnalytics?.categoryBreakdown?.slice(0, 8) || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalValue"
                  >
                    {(inventoryAnalytics?.categoryBreakdown?.slice(0, 8) || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    itemStyle={{ color: '#f3f4f6' }}
                    formatter={(value: number) => [formatIndianCurrency(value), 'Value']}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Selling Medicines */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                  Top Selling Medicines
                </h3>
              </div>
              <div className="space-y-3">
                {inventoryAnalytics?.topSellingMedicines?.slice(0, 5).map((med: any, index: number) => (
                  <div key={med.medicationId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{med.medicationName}</div>
                        <div className="text-xs text-gray-500">{med.totalSold} units sold</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatIndianCurrency(med.revenue)}</div>
                      <div className="text-xs text-gray-500">Revenue</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expiry Analysis */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-red-500" />
                  Expiry Analysis
                </h3>
              </div>
              <div className="space-y-3">
                {inventoryAnalytics?.expiryAnalysis?.map((expiry: any, index: number) => (
                  <div
                    key={expiry.period}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => loadExpiryDetails(expiry.period)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${expiry.period.includes('Expired') ? 'bg-red-500' :
                        expiry.period.includes('30 days') ? 'bg-orange-500' :
                          expiry.period.includes('31-60') ? 'bg-yellow-500' :
                            expiry.period.includes('61-90') ? 'bg-blue-500' : 'bg-green-500'
                        }`}></div>
                      <div>
                        <div className="font-medium text-sm">{expiry.period}</div>
                        <div className="text-xs text-gray-500">{expiry.count} batches</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatIndianCurrency(expiry.totalValue)}</div>
                      <div className="text-xs text-gray-500">Value at risk</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                  Quick Stats
                </h3>
              </div>
              <div className="space-y-4">
                <div
                  className="flex justify-between items-center p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => loadStockAlertDetails('expiring')}
                >
                  <span className="text-sm font-medium text-blue-800">Expiring Soon</span>
                  <span className="text-lg font-bold text-blue-900">{inventoryAnalytics?.stockSummary?.expiringSoonItems || 0}</span>
                </div>
                <div
                  className="flex justify-between items-center p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => loadStockAlertDetails('low')}
                >
                  <span className="text-sm font-medium text-green-800">Low Stock Items</span>
                  <span className="text-lg font-bold text-green-900">{inventoryAnalytics?.stockSummary?.lowStockItems || 0}</span>
                </div>
                <div
                  className="flex justify-between items-center p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => loadStockAlertDetails('expired')}
                >
                  <span className="text-sm font-medium text-red-800">Expired Items</span>
                  <span className="text-lg font-bold text-red-900">{inventoryAnalytics?.stockSummary?.expiredItems || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-purple-800">Profit Margin</span>
                  <span className="text-lg font-bold text-purple-900">{inventoryAnalytics?.totalStockValue?.profitMargin?.toFixed(1) || '0'}%</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
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
            await loadAnalytics()
          }}
        />
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
                  <div><div className="text-slate-300 text-xs">Price</div><div className="font-semibold">{formatIndianCurrency(selectedMedicine.unit_price)}</div></div>
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
                            <div className="text-2xl font-bold text-purple-800">{formatIndianCurrency(detailSummary.total_retail_value || 0)}</div>
                            <div className="text-xs text-purple-500 mt-1">Current inventory value</div>
                          </div>
                          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                            <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">Cost Value</div>
                            <div className="text-2xl font-bold text-orange-800">{formatIndianCurrency(detailSummary.total_cost_value || 0)}</div>
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
                                    <td className="py-2 px-3">{formatIndianCurrency(h.unit_price || 0)}</td>
                                    <td className="py-2 px-3 font-medium text-green-600">{formatIndianCurrency(h.total_amount || 0)}</td>
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

      {/* Expiry Details Modal */}
      {showExpiryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 shadow-lg flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  <Calendar className="w-6 h-6 mr-2" />
                  Expiry Details
                </h2>
                <p className="text-red-100 mt-1">Batch expiry information and value at risk</p>
              </div>
              <button onClick={() => setShowExpiryModal(false)} className="text-white hover:bg-white/20 rounded-full p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
              {detailsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading expiry details...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="text-sm text-red-600 font-medium">Total Batches</div>
                      <div className="text-2xl font-bold text-red-800">{expiryDetails.length}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <div className="text-sm text-orange-600 font-medium">Total Quantity</div>
                      <div className="text-2xl font-bold text-orange-800">
                        {expiryDetails.reduce((sum, item) => sum + item.current_quantity, 0)}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="text-sm text-purple-600 font-medium">Value at Risk</div>
                      <div className="text-2xl font-bold text-purple-800">
                        {formatIndianCurrency(expiryDetails.reduce((sum, item) => sum + item.total_value, 0))}
                      </div>
                    </div>
                  </div>

                  {expiryDetails.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Expiring Batches Found</h3>
                      <p className="text-gray-600">Great! No medicines are expiring in this period.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left p-3 font-semibold text-gray-700">Medicine</th>
                            <th className="text-left p-3 font-semibold text-gray-700">Batch</th>
                            <th className="text-left p-3 font-semibold text-gray-700">Expiry Date</th>
                            <th className="text-left p-3 font-semibold text-gray-700">Days</th>
                            <th className="text-left p-3 font-semibold text-gray-700">Quantity</th>
                            <th className="text-right p-3 font-semibold text-gray-700">Value</th>
                            <th className="text-center p-3 font-semibold text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expiryDetails.map((item, index) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <div>
                                  <div className="font-medium">{item.medications.name}</div>
                                  <div className="text-xs text-gray-500">{item.medications.category}</div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                  {item.batch_number}
                                </span>
                              </td>
                              <td className="p-3">{new Date(item.expiry_date).toLocaleDateString()}</td>
                              <td className="p-3">
                                <span className={`font-medium ${item.days_to_expiry < 0 ? 'text-red-600' :
                                  item.days_to_expiry <= 30 ? 'text-orange-600' :
                                    item.days_to_expiry <= 60 ? 'text-yellow-600' : 'text-blue-600'
                                  }`}>
                                  {item.days_to_expiry < 0 ? `${Math.abs(item.days_to_expiry)} days ago` : `${item.days_to_expiry} days`}
                                </span>
                              </td>
                              <td className="p-3 font-medium">{item.current_quantity}</td>
                              <td className="p-3 text-right font-medium">{formatIndianCurrency(item.total_value)}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'expired' ? 'bg-red-100 text-red-800' :
                                  item.status === 'critical' ? 'bg-orange-100 text-orange-800' :
                                    item.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-blue-100 text-blue-800'
                                  }`}>
                                  {item.status === 'expired' ? 'Expired' :
                                    item.status === 'critical' ? 'Critical' :
                                      item.status === 'warning' ? 'Warning' : 'Normal'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stock Alerts Modal */}
      {showStockAlertsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 shadow-lg flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2" />
                  Stock Alert Details
                </h2>
                <p className="text-orange-100 mt-1">Medicines requiring immediate attention</p>
              </div>
              <button onClick={() => setShowStockAlertsModal(false)} className="text-white hover:bg-white/20 rounded-full p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
              {detailsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading stock alert details...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <div className="text-sm text-orange-600 font-medium">Total Items</div>
                      <div className="text-2xl font-bold text-orange-800">{stockAlertDetails.length}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="text-sm text-red-600 font-medium">Alert Type</div>
                      <div className="text-lg font-bold text-red-800 capitalize">
                        {stockAlertDetails[0]?.alert_type?.replace('_', ' ') || 'Unknown'}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="text-sm text-purple-600 font-medium">Total Value</div>
                      <div className="text-2xl font-bold text-purple-800">
                        {formatIndianCurrency(stockAlertDetails.reduce((sum, item) =>
                          sum + (item.total_value || item.reorder_value || 0), 0
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-3 font-semibold text-gray-700">Medicine</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Code</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Category</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Current Stock</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Min Level</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Value</th>
                          <th className="text-center p-3 font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockAlertDetails.map((item, index) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.manufacturer || 'N/A'}</div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-mono">
                                {item.medicine_code || 'N/A'}
                              </span>
                            </td>
                            <td className="p-3">{item.category || 'N/A'}</td>
                            <td className="p-3">
                              <span className={`font-medium ${item.alert_type === 'expired' ? 'text-red-600' :
                                item.available_stock === 0 ? 'text-red-600' : 'text-orange-600'
                                }`}>
                                {item.alert_type === 'expired' ? item.current_quantity : item.available_stock}
                              </span>
                            </td>
                            <td className="p-3">{item.minimum_stock_level || 'N/A'}</td>
                            <td className="p-3 text-right font-medium">
                              {formatIndianCurrency(item.total_value || item.reorder_value || 0)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedMedicine({
                                    id: item.id,
                                    name: item.name,
                                    category: item.category,
                                    stock_quantity: item.available_stock || item.current_quantity,
                                    unit_price: item.unit_price,
                                    expiry_date: item.expiry_date,
                                    manufacturer: item.manufacturer,
                                    batch_number: item.batch_number,
                                    minimum_stock_level: item.minimum_stock_level,
                                    medicine_code: item.medicine_code
                                  })
                                  setShowMedicineModal(true)
                                }}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}