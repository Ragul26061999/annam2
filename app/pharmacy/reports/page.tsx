'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  FileText, BarChart3, Package, Download, Calendar, 
  TrendingUp, TrendingDown, AlertTriangle, Filter, Pill,
  Activity, PieChart, ArrowUpDown, Search, Eye, IndianRupee, Target, ArrowLeft, ChevronDown
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

const REPORT_OPTIONS = [
  { value: 'medical', label: 'Medical Report', icon: FileText },
  { value: 'gst', label: 'GST Report', icon: Activity },
  { value: 'stock', label: 'Stock Report', icon: Package },
  { value: 'drug_wise_stock', label: 'Drug Wise Stock Report', icon: Pill },
  { value: 'closing_drug_stock', label: 'Closing Drug Stock', icon: Package },
  { value: 'purchase_value', label: 'Purchase Value', icon: IndianRupee },
  { value: 'purchase_report', label: 'Purchase Report', icon: FileText },
  { value: 'intent_report', label: 'Intent Report', icon: Target }
]

const CATEGORIES = [
  'All Categories', 'Antibiotics', 'Pain Killers', 'Vitamins', 'Cardiac', 
  'Diabetes', 'Respiratory', 'Gastrointestinal', 'Dermatology', 'Neurology'
]

function PharmacyReportsContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'medical' | 'gst' | 'stock' | 'drug_wise_stock' | 'closing_drug_stock' | 'purchase_value' | 'purchase_report' | 'intent_report'>('medical')
  const [dropdownOpen, setDropdownOpen] = useState(false)
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

  // GST Report states
  const [gstData, setGstData] = useState<any[]>([])
  const [gstSummary, setGstSummary] = useState<any>({})

  // Stock Report states
  const [stockData, setStockData] = useState<any[]>([])
  const [stockSummary, setStockSummary] = useState<any>({})

  // Drug Wise Stock Report states
  const [drugWiseStockData, setDrugWiseStockData] = useState<any[]>([])
  const [drugWiseStockSummary, setDrugWiseStockSummary] = useState<any>({})

  // Closing Drug Stock Report states
  const [closingDrugStockData, setClosingDrugStockData] = useState<any[]>([])
  const [closingDrugStockSummary, setClosingDrugStockSummary] = useState<any>({})
  const [closingFilter, setClosingFilter] = useState({
    dateRange: 'this_month',
    category: 'All Categories',
    searchTerm: ''
  })

  // Purchase Value and Purchase Report states
  const [purchaseValueData, setPurchaseValueData] = useState<any[]>([])
  const [purchaseValueSummary, setPurchaseValueSummary] = useState<any>({})
  const [purchaseReportData, setPurchaseReportData] = useState<any[]>([])
  const [purchaseReportSummary, setPurchaseReportSummary] = useState<any>({})

  // Intent Report states
  const [intentReportData, setIntentReportData] = useState<any[]>([])
  const [intentReportSummary, setIntentReportSummary] = useState<any>({})

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('report-dropdown');
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchParams) {
      const tab = searchParams.get('tab')
      if (tab === 'gst' || tab === 'stock' || tab === 'drug_wise_stock' || tab === 'closing_drug_stock' || tab === 'purchase_value' || tab === 'purchase_report' || tab === 'intent_report') {
        setActiveTab(tab)
      } else {
        setActiveTab('medical')
      }
    }
  }, [searchParams])

  useEffect(() => {
    loadMedicineAnalytics()
  }, [selectedRange, customDateRange, selectedCategory, searchTerm])

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'gst') {
      loadGstData()
    } else if (activeTab === 'stock') {
      loadStockData()
    } else if (activeTab === 'drug_wise_stock') {
      loadDrugWiseStockData()
    } else if (activeTab === 'closing_drug_stock') {
      loadClosingDrugStockData()
    } else if (activeTab === 'purchase_value') {
      loadPurchaseValueData()
    } else if (activeTab === 'purchase_report') {
      loadPurchaseReportData()
    } else if (activeTab === 'intent_report') {
      loadIntentReportData()
    }
  }, [activeTab, selectedRange, customDateRange])

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

  const loadGstData = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange()
      
      const { data: gstLedger, error } = await supabase
        .from('pharmacy_gst_ledger')
        .select('*')
        .gte('transaction_date', dateRange.start)
        .lte('transaction_date', dateRange.end)
        .order('transaction_date', { ascending: false })

      if (error) {
        console.error('Error loading GST data:', error)
        return
      }

      setGstData(gstLedger || [])

      // Calculate GST summary
      const summary = (gstLedger || []).reduce((acc: any, item: any) => {
        acc.totalTaxableAmount = (acc.totalTaxableAmount || 0) + (item.taxable_amount || 0)
        acc.totalCGST = (acc.totalCGST || 0) + (item.cgst_amount || 0)
        acc.totalSGST = (acc.totalSGST || 0) + (item.sgst_amount || 0)
        acc.totalIGST = (acc.totalIGST || 0) + (item.igst_amount || 0)
        acc.totalGST = (acc.totalGST || 0) + (item.total_gst || 0)
        acc.totalAmount = (acc.totalAmount || 0) + (item.total_amount || 0)
        return acc
      }, {})

      setGstSummary(summary)

    } catch (error) {
      console.error('Error loading GST data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStockData = async () => {
    try {
      setLoading(true)
      
      // Get all medications with stock information
      const { data: medications, error } = await supabase
        .from('medications')
        .select(`
          id,
          name,
          category,
          manufacturer,
          available_stock,
          minimum_stock_level,
          selling_price,
          total_stock,
          medication_code,
          status
        `)
        .order('name')

      if (error) {
        console.error('Error loading stock data:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        return
      }

      if (!medications) {
        console.warn('No medications data returned')
        setStockData([])
        setStockSummary({})
        return
      }

      console.log(`Loaded ${medications.length} medications for stock report`)

      const stockItems = medications.map((med: any) => ({
        ...med,
        stock_value: (med.available_stock || 0) * (med.selling_price || 0),
        stock_status: (med.available_stock || 0) <= (med.minimum_stock_level || 0) ? 'low' : 'normal'
      }))

      setStockData(stockItems)

      // Calculate stock summary
      const summary = stockItems.reduce((acc: any, item: any) => {
        acc.totalItems = (acc.totalItems || 0) + 1
        acc.totalStock = (acc.totalStock || 0) + (item.available_stock || 0)
        acc.totalValue = (acc.totalValue || 0) + (item.stock_value || 0)
        acc.lowStockItems = (acc.lowStockItems || 0) + (item.stock_status === 'low' ? 1 : 0)
        return acc
      }, {})

      setStockSummary(summary)

    } catch (error) {
      console.error('Error in loadStockData:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDrugWiseStockData = async () => {
    try {
      setLoading(true)
      
      // Get all medications with detailed stock information
      const { data: medications, error } = await supabase
        .from('medications')
        .select(`
          id,
          name,
          generic_name,
          category,
          manufacturer,
          available_stock,
          minimum_stock_level,
          maximum_stock_level,
          selling_price,
          mrp,
          purchase_price,
          total_stock,
          medication_code,
          status,
          dosage_form,
          strength,
          combination,
          hsn_code,
          gst_percent,
          created_at,
          updated_at
        `)
        .order('name')

      if (error) {
        console.error('Error loading drug wise stock data:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        return
      }

      if (!medications) {
        console.warn('No medications data returned')
        setDrugWiseStockData([])
        setDrugWiseStockSummary({})
        return
      }

      console.log(`Loaded ${medications.length} medications for drug wise stock report`)

      // Get stock transactions to calculate purchase and sale quantities and get batch/expiry info
      const { data: stockTransactions, error: transactionError } = await supabase
        .from('stock_transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (transactionError) {
        console.error('Error loading stock transactions:', transactionError)
      }

      // Process each medication with detailed information
      const drugWiseData = medications.map((med: any, index: number) => {
        // Calculate quantities from stock transactions
        const medTransactions = (stockTransactions || []).filter((trans: any) => 
          trans.medication_id === med.id
        )
        
        const purchaseQty = medTransactions
          .filter((trans: any) => trans.transaction_type === 'purchase' || trans.transaction_type === 'stock_in')
          .reduce((sum: number, trans: any) => sum + Math.abs(trans.quantity || 0), 0)
        
        const saleQty = medTransactions
          .filter((trans: any) => trans.transaction_type === 'sale' || trans.transaction_type === 'stock_out')
          .reduce((sum: number, trans: any) => sum + Math.abs(trans.quantity || 0), 0)
        
        const returnQty = medTransactions
          .filter((trans: any) => trans.transaction_type === 'return')
          .reduce((sum: number, trans: any) => sum + Math.abs(trans.quantity || 0), 0)
        
        const indentQty = medTransactions
          .filter((trans: any) => trans.transaction_type === 'indent')
          .reduce((sum: number, trans: any) => sum + Math.abs(trans.quantity || 0), 0)

        // Get the most recent batch and expiry info from transactions
        const latestTransaction = medTransactions.length > 0 ? medTransactions[0] : null
        const batchInfo = latestTransaction?.batch_number || med.medication_code || `B${String(index + 1).padStart(4, '0')}`
        
        // Calculate expiry date - use transaction expiry if available, otherwise estimate
        let expiryDate = 'N/A'
        if (latestTransaction?.expiry_date) {
          expiryDate = new Date(latestTransaction.expiry_date).toISOString().split('T')[0]
        } else if (med.updated_at) {
          // Estimate 3 years from last update as a fallback
          const estimatedExpiry = new Date(med.updated_at)
          estimatedExpiry.setFullYear(estimatedExpiry.getFullYear() + 3)
          expiryDate = estimatedExpiry.toISOString().split('T')[0]
        }

        // Calculate stock value using selling price, fallback to MRP or purchase price
        const priceForCalculation = parseFloat(med.selling_price) || parseFloat(med.mrp) || parseFloat(med.purchase_price) || 0
        const stockValue = (med.available_stock || 0) * priceForCalculation
        
        return {
          sl_no: index + 1,
          drug_name: med.name,
          generic_name: med.generic_name || '',
          batch: batchInfo,
          expiry_date: expiryDate,
          pur_qty: purchaseQty,
          sale_qty: saleQty,
          r_qty: returnQty,
          sr_qty: 0, // Stock return quantity - would need additional logic
          ind_qty: indentQty,
          stock_qty: med.available_stock || 0,
          rate: parseFloat(med.selling_price) || parseFloat(med.purchase_price) || 0,
          mrp: parseFloat(med.mrp) || 0,
          packing: med.dosage_form || 'N/A',
          vat: parseFloat(med.gst_percent) || 0,
          value: stockValue,
          category: med.category,
          manufacturer: med.manufacturer,
          medication_code: med.medication_code,
          status: med.status,
          minimum_stock_level: med.minimum_stock_level || 0,
          stock_status: (med.available_stock || 0) <= (med.minimum_stock_level || 0) * 0.5 ? 'critical' : 
                        (med.available_stock || 0) <= (med.minimum_stock_level || 0) ? 'low' : 'normal'
        }
      })

      setDrugWiseStockData(drugWiseData)

      // Calculate summary
      const summary = drugWiseData.reduce((acc: any, item: any) => {
        acc.totalMedications = (acc.totalMedications || 0) + 1
        acc.totalStock = (acc.totalStock || 0) + item.stock_qty
        acc.totalValue = (acc.totalValue || 0) + item.value
        acc.totalPurchaseQty = (acc.totalPurchaseQty || 0) + item.pur_qty
        acc.totalSaleQty = (acc.totalSaleQty || 0) + item.sale_qty
        acc.criticalStock = (acc.criticalStock || 0) + (item.stock_status === 'critical' ? 1 : 0)
        acc.lowStock = (acc.lowStock || 0) + (item.stock_status === 'low' ? 1 : 0)
        return acc
      }, {})

      setDrugWiseStockSummary(summary)

    } catch (error) {
      console.error('Error in loadDrugWiseStockData:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClosingDrugStockData = async () => {
    try {
      setLoading(true)
      
      // Get all medications with detailed stock information
      const { data: medications, error } = await supabase
        .from('medications')
        .select(`
          id,
          name,
          generic_name,
          category,
          manufacturer,
          available_stock,
          minimum_stock_level,
          maximum_stock_level,
          selling_price,
          mrp,
          purchase_price,
          total_stock,
          medication_code,
          status,
          dosage_form,
          strength,
          combination,
          hsn_code,
          gst_percent,
          created_at,
          updated_at
        `)
        .order('name')

      if (error) {
        console.error('Error loading closing drug stock data:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        return
      }

      if (!medications) {
        console.warn('No medications data returned')
        setClosingDrugStockData([])
        setClosingDrugStockSummary({})
        return
      }

      console.log(`Loaded ${medications.length} medications for closing drug stock report`)

      // Get stock transactions to calculate purchase and sale quantities
      const { data: stockTransactions, error: transactionError } = await supabase
        .from('stock_transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (transactionError) {
        console.error('Error loading stock transactions:', transactionError)
      }

      // Process each medication with detailed information - focus on sold/closed stock
      const closingDrugData = medications.map((med: any, index: number) => {
        // Calculate quantities from stock transactions
        const medTransactions = (stockTransactions || []).filter((trans: any) => 
          trans.medication_id === med.id
        )
        
        const purchaseQty = medTransactions
          .filter((trans: any) => trans.transaction_type === 'purchase' || trans.transaction_type === 'stock_in')
          .reduce((sum: number, trans: any) => sum + Math.abs(trans.quantity || 0), 0)
        
        const saleQty = medTransactions
          .filter((trans: any) => trans.transaction_type === 'sale' || trans.transaction_type === 'stock_out')
          .reduce((sum: number, trans: any) => sum + Math.abs(trans.quantity || 0), 0)
        
        const returnQty = medTransactions
          .filter((trans: any) => trans.transaction_type === 'return')
          .reduce((sum: number, trans: any) => sum + Math.abs(trans.quantity || 0), 0)
        
        const indentQty = medTransactions
          .filter((trans: any) => trans.transaction_type === 'indent')
          .reduce((sum: number, trans: any) => sum + Math.abs(trans.quantity || 0), 0)

        // Get most recent batch and expiry info from transactions
        const latestTransaction = medTransactions.length > 0 ? medTransactions[0] : null
        const batchInfo = latestTransaction?.batch_number || med.medication_code || `B${String(index + 1).padStart(4, '0')}`
        
        // Calculate expiry date - use transaction expiry if available, otherwise estimate
        let expiryDate = 'N/A'
        if (latestTransaction?.expiry_date) {
          expiryDate = new Date(latestTransaction.expiry_date).toISOString().split('T')[0]
        } else if (med.updated_at) {
          // Estimate 3 years from last update as a fallback
          const estimatedExpiry = new Date(med.updated_at)
          estimatedExpiry.setFullYear(estimatedExpiry.getFullYear() + 3)
          expiryDate = estimatedExpiry.toISOString().split('T')[0]
        }

        // Calculate stock value using selling price, fallback to MRP or purchase price
        const priceForCalculation = parseFloat(med.selling_price) || parseFloat(med.mrp) || parseFloat(med.purchase_price) || 0
        
        // For closing stock report, show total sold value and remaining stock
        const soldValue = saleQty * priceForCalculation
        const remainingValue = (med.available_stock || 0) * priceForCalculation
        const totalValue = soldValue + remainingValue
        
        return {
          sl_no: index + 1,
          drug_name: med.name,
          generic_name: med.generic_name || '',
          batch: batchInfo,
          expiry_date: expiryDate,
          pur_qty: purchaseQty,
          sale_qty: saleQty,
          r_qty: returnQty,
          sr_qty: 0, // Stock return quantity - would need additional logic
          ind_qty: indentQty,
          stock_qty: med.available_stock || 0,
          rate: parseFloat(med.selling_price) || parseFloat(med.purchase_price) || 0,
          mrp: parseFloat(med.mrp) || 0,
          packing: med.dosage_form || 'N/A',
          vat: parseFloat(med.gst_percent) || 0,
          value: totalValue,
          sold_value: soldValue,
          remaining_value: remainingValue,
          category: med.category,
          manufacturer: med.manufacturer,
          medication_code: med.medication_code,
          status: med.status,
          minimum_stock_level: med.minimum_stock_level || 0,
          stock_status: (med.available_stock || 0) <= (med.minimum_stock_level || 0) * 0.5 ? 'critical' : 
                        (med.available_stock || 0) <= (med.minimum_stock_level || 0) ? 'low' : 'normal',
          // Additional fields for closed stock reporting
          total_moved: purchaseQty + saleQty + returnQty, // Total stock movement
          closing_balance: (purchaseQty || 0) - (saleQty || 0) + (returnQty || 0) // Closing balance calculation
        }
      })

      // Apply filters
      const filteredData = closingDrugData.filter((item: any) => {
        const matchesSearch = !closingFilter.searchTerm || 
          item.drug_name.toLowerCase().includes(closingFilter.searchTerm.toLowerCase()) ||
          item.generic_name.toLowerCase().includes(closingFilter.searchTerm.toLowerCase()) ||
          item.batch.toLowerCase().includes(closingFilter.searchTerm.toLowerCase())
        
        const matchesCategory = closingFilter.category === 'All Categories' || item.category === closingFilter.category
        
        // For closed stock report, show items with sales or stock movement
        const hasMovement = item.sale_qty > 0 || item.pur_qty > 0 || item.r_qty > 0
        
        return matchesSearch && matchesCategory && hasMovement
      })

      setClosingDrugStockData(filteredData)

      // Calculate summary for closed stock
      const summary = filteredData.reduce((acc: any, item: any) => {
        acc.totalMedications = (acc.totalMedications || 0) + 1
        acc.totalStock = (acc.totalStock || 0) + item.stock_qty
        acc.totalValue = (acc.totalValue || 0) + item.value
        acc.totalPurchaseQty = (acc.totalPurchaseQty || 0) + item.pur_qty
        acc.totalSaleQty = (acc.totalSaleQty || 0) + item.sale_qty
        acc.totalSoldValue = (acc.totalSoldValue || 0) + item.sold_value
        acc.criticalStock = (acc.criticalStock || 0) + (item.stock_status === 'critical' ? 1 : 0)
        acc.lowStock = (acc.lowStock || 0) + (item.stock_status === 'low' ? 1 : 0)
        return acc
      }, {})

      setClosingDrugStockSummary(summary)

    } catch (error) {
      console.error('Error in loadClosingDrugStockData:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPurchaseValueData = async () => {
    try {
      setLoading(true)

      // Get purchase transactions from stock_transactions table
      const { data: purchaseTransactions, error: purchaseError } = await supabase
        .from('stock_transactions')
        .select(`
          id,
          transaction_type,
          quantity,
          unit_price,
          total_amount,
          reference_id,
          reference_type,
          batch_number,
          expiry_date,
          supplier_id,
          transaction_date,
          created_at,
          medications (
            id,
            name,
            category,
            manufacturer,
            gst_percent
          )
        `)
        .in('transaction_type', ['purchase', 'stock_in'])
        .order('transaction_date', { ascending: false })

      if (purchaseError) {
        console.error('Error loading purchase transactions:', purchaseError)
        return
      }

      // Group transactions by date and supplier for bill-like aggregation
      const groupedPurchases = (purchaseTransactions || []).reduce((acc: any, transaction: any) => {
        const dateKey = new Date(transaction.transaction_date).toISOString().split('T')[0]
        const supplierKey = transaction.supplier_id || 'Unknown Supplier'
        
        if (!acc[supplierKey]) {
          acc[supplierKey] = {}
        }
        
        if (!acc[supplierKey][dateKey]) {
          acc[supplierKey][dateKey] = {
            transactions: [],
            total_amount: 0,
            total_quantity: 0,
            total_items: 0
          }
        }
        
        acc[supplierKey][dateKey].transactions.push(transaction)
        acc[supplierKey][dateKey].total_amount += Math.abs(transaction.total_amount || 0)
        acc[supplierKey][dateKey].total_quantity += Math.abs(transaction.quantity || 0)
        acc[supplierKey][dateKey].total_items += 1
        
        return acc
      }, {})

      // Convert grouped data to purchase value format
      const purchaseValueItems = Object.entries(groupedPurchases).flatMap(([supplier, dateGroups]: [string, any]) =>
        Object.entries(dateGroups).map(([date, data]: [string, any], index: number) => ({
          sl_no: index + 1,
          bill_number: `PUR-${date}-${supplier.slice(0, 8)}`,
          supplier_name: supplier,
          purchase_date: date,
          total_items: data.total_items,
          total_quantity: data.total_quantity,
          total_amount: data.total_amount,
          tax_amount: data.total_amount * 0.12, // Assuming 12% GST
          discount_amount: 0, // Not available in stock_transactions
          net_amount: data.total_amount + (data.total_amount * 0.12),
          status: 'completed',
          items_value: data.total_amount,
          gst_value: data.total_amount * 0.12,
          average_item_value: data.total_amount / data.total_items || 0
        }))
      ).sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())

      // Calculate purchase value summary
      const summary = purchaseValueItems.reduce((acc: any, item: any) => {
        acc.totalBills = (acc.totalBills || 0) + 1
        acc.totalPurchaseValue = (acc.totalPurchaseValue || 0) + item.net_amount
        acc.totalTaxValue = (acc.totalTaxValue || 0) + item.tax_amount
        acc.totalDiscountValue = (acc.totalDiscountValue || 0) + item.discount_amount
        acc.totalItems = (acc.totalItems || 0) + item.total_items
        acc.totalQuantity = (acc.totalQuantity || 0) + item.total_quantity
        acc.averageBillValue = acc.totalPurchaseValue / acc.totalBills
        return acc
      }, {})

      setPurchaseValueData(purchaseValueItems)
      setPurchaseValueSummary(summary)

    } catch (error) {
      console.error('Error in loadPurchaseValueData:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPurchaseReportData = async () => {
    try {
      setLoading(true)

      // Get detailed purchase report data from stock_transactions
      const { data: purchaseItems, error: itemsError } = await supabase
        .from('stock_transactions')
        .select(`
          id,
          transaction_type,
          quantity,
          unit_price,
          total_amount,
          reference_id,
          reference_type,
          batch_number,
          expiry_date,
          supplier_id,
          transaction_date,
          created_at,
          medications (
            id,
            name,
            category,
            manufacturer,
            dosage_form,
            strength
          )
        `)
        .in('transaction_type', ['purchase', 'stock_in'])
        .order('transaction_date', { ascending: false })

      if (itemsError) {
        console.error('Error loading purchase report items:', itemsError)
        return
      }

      // Process purchase report data
      const purchaseReportItems = (purchaseItems || []).map((item: any, index: number) => {
        const medication = item.medications || {}
        const gstAmount = (item.total_amount || 0) * (medication.gst_percent || 12) / 100
        
        return {
          sl_no: index + 1,
          bill_number: `PUR-${new Date(item.transaction_date).toISOString().split('T')[0]}-${(item.supplier_id || 'Unknown').slice(0, 8)}`,
          supplier_name: item.supplier_id || 'Unknown Supplier',
          purchase_date: new Date(item.transaction_date).toISOString().split('T')[0],
          medication_code: medication.id || item.reference_id || 'N/A',
          medication_name: medication.name || 'Unknown Medication',
          category: medication.category || 'N/A',
          manufacturer: medication.manufacturer || 'N/A',
          batch_number: item.batch_number || 'N/A',
          expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : 'N/A',
          quantity: Math.abs(item.quantity || 0),
          unit_price: item.unit_price || 0,
          total_amount: item.total_amount || 0,
          discount_percent: 0, // Not available in stock_transactions
          discount_amount: 0,
          gst_percent: medication.gst_percent || 12,
          gst_amount: gstAmount,
          net_amount: (item.total_amount || 0) + gstAmount,
          status: 'completed'
        }
      })

      // Calculate purchase report summary
      const summary = purchaseReportItems.reduce((acc: any, item: any) => {
        acc.totalItems = (acc.totalItems || 0) + 1
        acc.totalQuantity = (acc.totalQuantity || 0) + item.quantity
        acc.totalPurchaseValue = (acc.totalPurchaseValue || 0) + item.net_amount
        acc.totalGSTValue = (acc.totalGSTValue || 0) + item.gst_amount
        acc.totalDiscountValue = (acc.totalDiscountValue || 0) + item.discount_amount
        acc.averageItemValue = acc.totalPurchaseValue / acc.totalItems
        acc.averageQuantity = acc.totalQuantity / acc.totalItems
        return acc
      }, {})

      setPurchaseReportData(purchaseReportItems)
      setPurchaseReportSummary(summary)

    } catch (error) {
      console.error('Error in loadPurchaseReportData:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadIntentReportData = async () => {
    try {
      setLoading(true)

      // Get intent medicines data
      const { data: intentMedicines, error: intentError } = await supabase
        .from('intent_medicines')
        .select('*')
        .order('created_at', { ascending: false })

      if (intentError) {
        console.error('Error loading intent medicines:', intentError)
        return
      }

      // Get medication details for additional context
      const { data: medications, error: medError } = await supabase
        .from('medications')
        .select(`
          id,
          name,
          category,
          manufacturer,
          dosage_form,
          strength,
          gst_percent
        `)

      if (medError) {
        console.error('Error loading medications for intent report:', medError)
      }

      // Create medication lookup
      const medicationLookup = (medications || []).reduce((acc: any, med: any) => {
        acc[med.id] = med
        return acc
      }, {})

      // Process intent medicines data
      const intentReportItems = (intentMedicines || []).map((item: any, index: number) => {
        const medication = medicationLookup[item.medication_id] || {}
        const mrp = parseFloat(item.mrp) || 0
        const quantity = item.quantity || 0
        const totalValue = mrp * quantity

        return {
          sl_no: index + 1,
          intent_type: item.intent_type || 'N/A',
          medication_code: item.medicine_code || medication.id || 'N/A',
          medication_name: item.medication_name || medication.name || 'Unknown',
          category: item.intent_type || 'N/A', // Use intent type as category
          manufacturer: item.manufacturer || medication.manufacturer || 'N/A',
          dosage_type: item.dosage_type || medication.dosage_form || 'N/A',
          batch_number: item.batch_number || 'N/A',
          expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : 'N/A',
          quantity: quantity,
          mrp: mrp,
          total_value: totalValue,
          medicine_status: item.medicine_status || 'active',
          combination: item.combination || 'N/A',
          created_date: new Date(item.created_at).toISOString().split('T')[0],
          created_time: new Date(item.created_at).toLocaleTimeString('en-IN'),
          department: item.intent_type,
          status: item.medicine_status || 'active'
        }
      })

      // Calculate intent report summary
      const summary = intentReportItems.reduce((acc: any, item: any) => {
        acc.totalItems = (acc.totalItems || 0) + 1
        acc.totalQuantity = (acc.totalQuantity || 0) + item.quantity
        acc.totalValue = (acc.totalValue || 0) + item.total_value

        // Count by intent type
        if (!acc.intentTypes[item.intent_type]) {
          acc.intentTypes[item.intent_type] = 0
        }
        acc.intentTypes[item.intent_type] += 1

        // Count by status
        if (!acc.statusCount[item.status]) {
          acc.statusCount[item.status] = 0
        }
        acc.statusCount[item.status] += 1

        acc.averageItemValue = acc.totalValue / acc.totalItems
        acc.averageQuantity = acc.totalQuantity / acc.totalItems

        return acc
      }, { intentTypes: {}, statusCount: {} })

      // Find most common intent type
      const mostCommonIntentType = Object.entries(summary.intentTypes).reduce((a, b) =>
        summary.intentTypes[a[0]] > summary.intentTypes[b[0]] ? a : b
      )?.[0] || 'N/A'

      summary.mostCommonIntentType = mostCommonIntentType
      summary.intentTypeCount = Object.keys(summary.intentTypes).length

      setIntentReportData(intentReportItems)
      setIntentReportSummary(summary)

    } catch (error) {
      console.error('Error in loadIntentReportData:', error)
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
        med.total_revenue.toFixed(0),
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
          <div className="text-lg mb-2">
            {activeTab === 'drug_wise_stock' ? 'Loading drug wise stock data...' : 
             activeTab === 'stock' ? 'Loading stock data...' :
             activeTab === 'gst' ? 'Loading GST data...' :
             'Loading medicine analytics...'}
          </div>
          <div className="text-sm text-gray-500">
            {activeTab === 'drug_wise_stock' ? 'Analyzing inventory by drug groups' :
             activeTab === 'stock' ? 'Preparing stock report' :
             activeTab === 'gst' ? 'Calculating GST analytics' :
             'Analyzing medication performance'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Reports</h1>
            <p className="text-gray-600 mt-1">Medicine performance and inventory analytics</p>
          </div>
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        {/* Report Selection Dropdown */}
        <div id="report-dropdown" className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {(() => {
              const selectedReport = REPORT_OPTIONS.find(option => option.value === activeTab);
              const IconComponent = selectedReport?.icon || FileText;
              return (
                <>
                  <IconComponent className="w-4 h-4" />
                  <span>{selectedReport?.label || 'Select Report'}</span>
                </>
              );
            })()}
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              {REPORT_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setActiveTab(option.value as any);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      activeTab === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Tab Content */}
      {activeTab === 'medical' && (
        <>
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
                <button
                  onClick={() => {
                    const csv = [
                      ['Medicine Name', 'Category', 'Manufacturer', 'Total Sold', 'Total Revenue', 'Average Price', 'Stock Level', 'Profit Margin'],
                      ...medicineAnalytics.map((med) => [
                        med.name,
                        med.category,
                        med.manufacturer,
                        med.total_sold?.toString() || '0',
                        med.total_revenue?.toFixed(0) || '0',
                        med.average_price?.toFixed(0) || '0',
                        med.stock_level?.toString() || '0',
                        med.profit_margin?.toFixed(0) || '0'
                      ])
                    ].map(row => row.join(',')).join('\n')

                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `medical-report-${selectedRange}-${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                    window.URL.revokeObjectURL(url)
                  }}
                  className="btn-secondary flex items-center text-xs px-2 py-1"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </button>
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
        </>
      )}

      {activeTab === 'gst' && (
        <>
          {/* GST Report Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GST Report</h1>
              <p className="text-gray-600 mt-1">GST transactions and tax analytics</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const csv = [
                    ['Date', 'Type', 'Reference', 'Party', 'GSTIN', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total GST', 'Total Amount'],
                    ...gstData.map((item) => [
                      formatDate(item.transaction_date),
                      item.transaction_type,
                      item.reference_number || '',
                      item.party_name || '',
                      item.party_gstin || '',
                      item.taxable_amount?.toFixed(0) || '0',
                      item.cgst_amount?.toFixed(0) || '0',
                      item.sgst_amount?.toFixed(0) || '0',
                      item.igst_amount?.toFixed(0) || '0',
                      item.total_gst?.toFixed(0) || '0',
                      item.total_amount?.toFixed(0) || '0'
                    ])
                  ].map(row => row.join(',')).join('\n')

                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `gst-report-${selectedRange}-${new Date().toISOString().split('T')[0]}.csv`
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export GST Report
              </button>
            </div>
          </div>

          {/* Date Range Filter for GST */}
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
            </div>
          </div>

          {/* GST Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-blue-800">Total Transactions</h3>
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {gstData.length.toLocaleString()}
                </div>
                <p className="text-xs text-blue-700">
                  GST transactions
                </p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-green-800">Total Taxable Amount</h3>
                <div className="p-2 bg-green-500 rounded-lg">
                  <IndianRupee className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {formatIndianCurrency(gstSummary.totalTaxableAmount || 0)}
                </div>
                <p className="text-xs text-green-700">
                  Before GST
                </p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-orange-800">Total GST Amount</h3>
                <div className="p-2 bg-orange-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-900">
                  {formatIndianCurrency(gstSummary.totalGST || 0)}
                </div>
                <p className="text-xs text-orange-700">
                  CGST + SGST + IGST
                </p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-purple-800">Total Amount</h3>
                <div className="p-2 bg-purple-500 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-900">
                  {formatIndianCurrency(gstSummary.totalAmount || 0)}
                </div>
                <p className="text-xs text-purple-700">
                  Including GST
                </p>
              </div>
            </div>
          </div>

          {/* GST Data Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-500" />
                GST Transaction Details
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxable Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CGST</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SGST</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IGST</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total GST</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gstData.slice(0, 50).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.transaction_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.transaction_type === 'sale' ? 'bg-green-100 text-green-800' :
                          item.transaction_type === 'purchase' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.reference_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.party_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.party_gstin || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.taxable_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.cgst_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.sgst_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.igst_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.total_gst || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatIndianCurrency(item.total_amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {gstData.length === 0 && (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No GST transactions found for the selected period</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'stock' && (
        <>
          {/* Stock Report Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Report</h1>
              <p className="text-gray-600 mt-1">Inventory and stock level analytics</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const csv = [
                    ['Medicine Code', 'Medicine Name', 'Category', 'Manufacturer', 'Available Stock', 'Min Stock Level', 'Selling Price', 'Stock Value', 'Status'],
                    ...stockData.map((item) => [
                      item.medication_code || '',
                      item.name,
                      item.category,
                      item.manufacturer,
                      item.available_stock?.toString() || '0',
                      item.minimum_stock_level?.toString() || '0',
                      item.selling_price?.toFixed(0) || '0',
                      item.stock_value?.toFixed(0) || '0',
                      item.stock_status === 'low' ? 'Low Stock' : 'Normal'
                    ])
                  ].map(row => row.join(',')).join('\n')

                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Stock Report
              </button>
            </div>
          </div>

          {/* Stock Filters */}
          <div className="card">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Medicines</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name, code, or manufacturer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="All Categories">All Status</option>
                  <option value="Normal">Normal Stock</option>
                  <option value="Low">Low Stock</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stock Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-blue-800">Total Medicines</h3>
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {stockSummary.totalItems?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-blue-700">
                  In inventory
                </p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-green-800">Total Stock Units</h3>
                <div className="p-2 bg-green-500 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {stockSummary.totalStock?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-green-700">
                  Available units
                </p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-orange-800">Low Stock Items</h3>
                <div className="p-2 bg-orange-500 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-900">
                  {stockSummary.lowStockItems || 0}
                </div>
                <p className="text-xs text-orange-700">
                  Need attention
                </p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-purple-800">Total Stock Value</h3>
                <div className="p-2 bg-purple-500 rounded-lg">
                  <IndianRupee className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-900">
                  {formatIndianCurrency(stockSummary.totalValue || 0)}
                </div>
                <p className="text-xs text-purple-700">
                  Inventory value
                </p>
              </div>
            </div>
          </div>

          {/* Stock Data Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-500" />
                Medicine Stock Details
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Stock Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockData.filter((item) => {
                    const matchesSearch = !searchTerm || 
                      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (item.medication_code && item.medication_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())
                    
                    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory
                    
                    return matchesSearch && matchesCategory
                  }).slice(0, 50).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.medication_code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <Pill className="w-4 h-4 mr-2 text-gray-400" />
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.manufacturer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.available_stock?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.minimum_stock_level?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.selling_price || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.stock_value || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.stock_status === 'low' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.stock_status === 'low' ? 'Low Stock' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {stockData.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No stock data found</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'drug_wise_stock' && (
        <>
          {/* Drug Wise Stock Report Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Drug Wise Stock Report</h1>
              <p className="text-gray-600 mt-1">Inventory analysis grouped by drug names</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const csv = [
                    ['Sl.No.', 'Drug Name', 'Batch', 'Exp. Date', 'Pur Qty', 'SaleQty', 'R Qty', 'SRQty', 'IndQty', 'Stock_Qty', 'Rate', 'MRP', 'Packing', 'VAT', 'Value'],
                    ...drugWiseStockData.map((item) => [
                      item.sl_no || '',
                      item.drug_name || '',
                      item.batch || '',
                      item.expiry_date === 'N/A' ? 'N/A' : new Date(item.expiry_date).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: '2-digit' 
                      }),
                      item.pur_qty || 0,
                      item.sale_qty || 0,
                      item.r_qty || 0,
                      item.sr_qty || 0,
                      item.ind_qty || 0,
                      item.stock_qty || 0,
                      item.rate || 0,
                      item.mrp || 0,
                      item.packing || '',
                      item.vat || 0,
                      item.sold_value || 0,                      item.value || 0
                    ])
                  ].map(row => row.join(',')).join('\n')

                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `drug-wise-stock-report-${new Date().toISOString().split('T')[0]}.csv`
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Drug Wise Stock
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <Pill className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Medications</p>
                  <p className="text-2xl font-bold text-gray-900">{drugWiseStockSummary.totalMedications || 0}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{(drugWiseStockSummary.totalStock || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <IndianRupee className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatIndianCurrency(drugWiseStockSummary.totalValue || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Critical Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{drugWiseStockSummary.criticalStock || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Drug Wise Stock Table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sl.No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exp. Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pur Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SaleQty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">R Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SRQty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IndQty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock_Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packing</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VAT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drugWiseStockData.map((item) => (
                    <tr key={item.sl_no} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.sl_no}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <Pill className="w-4 h-4 mr-2 text-gray-400" />
                          {item.drug_name}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.batch}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.expiry_date === 'N/A' ? 'N/A' : new Date(item.expiry_date).toLocaleDateString('en-IN', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: '2-digit' 
                        })}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.pur_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.sale_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.r_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.sr_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.ind_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.stock_status === 'critical' ? 'bg-red-100 text-red-800' : 
                          item.stock_status === 'low' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.stock_qty || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.rate || 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.mrp || 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.packing}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.vat}%
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatIndianCurrency(item.value || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {drugWiseStockData.length === 0 && (
              <div className="text-center py-8">
                <Pill className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No drug wise stock data found</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'closing_drug_stock' && (
        <>
          {/* Closing Drug Stock Report Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Closing Drug Stock Report</h1>
              <p className="text-gray-600 mt-1">Drug stock analysis with filters</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const csv = [
                    ['Sl.No.', 'Drug Name', 'Batch', 'Exp. Date', 'Pur Qty', 'SaleQty', 'R Qty', 'SRQty', 'IndQty', 'Stock_Qty', 'Rate', 'MRP', 'Packing', 'VAT', 'Value'],
                    ...closingDrugStockData.map((item) => [
                      item.sl_no || '',
                      item.drug_name || '',
                      item.batch || '',
                      item.expiry_date === 'N/A' ? 'N/A' : new Date(item.expiry_date).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: '2-digit' 
                      }),
                      item.pur_qty || 0,
                      item.sale_qty || 0,
                      item.r_qty || 0,
                      item.sr_qty || 0,
                      item.ind_qty || 0,
                      item.stock_qty || 0,
                      item.rate || 0,
                      item.mrp || 0,
                      item.packing || '',
                      item.vat || 0,
                      item.sold_value || 0,                      item.value || 0
                    ])
                  ].map(row => row.join(',')).join('\n')

                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `closing-drug-stock-report-${new Date().toISOString().split('T')[0]}.csv`
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Closing Stock
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="card">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={closingFilter.searchTerm}
                  onChange={(e) => setClosingFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
                  placeholder="Search by drug name, batch, or generic name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={closingFilter.category}
                  onChange={(e) => setClosingFilter(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select
                  value={closingFilter.dateRange}
                  onChange={(e) => setClosingFilter(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DATE_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Medications</p>
                  <p className="text-2xl font-bold text-gray-900">{closingDrugStockSummary.totalMedications || 0}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Sold Qty</p>
                  <p className="text-2xl font-bold text-gray-900">{(closingDrugStockSummary.totalSaleQty || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <IndianRupee className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Sold Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatIndianCurrency(closingDrugStockSummary.totalSoldValue || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Remaining Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{(closingDrugStockSummary.totalStock || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Closing Drug Stock Table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sl.No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exp. Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pur Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SaleQty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">R Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SRQty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IndQty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock_Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packing</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VAT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sold Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {closingDrugStockData.map((item) => (
                    <tr key={item.sl_no} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.sl_no}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <Pill className="w-4 h-4 mr-2 text-gray-400" />
                          {item.drug_name}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.batch}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.expiry_date === 'N/A' ? 'N/A' : new Date(item.expiry_date).toLocaleDateString('en-IN', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: '2-digit' 
                        })}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.pur_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.sale_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.r_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.sr_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.ind_qty || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.stock_status === 'critical' ? 'bg-red-100 text-red-800' : 
                          item.stock_status === 'low' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.stock_qty || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.rate || 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.mrp || 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.packing}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.vat}%
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatIndianCurrency(item.sold_value || 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatIndianCurrency(item.value || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {closingDrugStockData.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No closing drug stock data found</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'purchase_value' && (
        <>
          {/* Purchase Value Report Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchase Value Report</h1>
              <p className="text-gray-600 mt-1">Analysis of purchase bills and values</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const csv = [
                    ['Sl.No.', 'Bill Number', 'Supplier Name', 'Purchase Date', 'Total Items', 'Total Quantity', 'Total Amount', 'Tax Amount', 'Discount Amount', 'Net Amount', 'Status'],
                    ...purchaseValueData.map((item) => [
                      item.sl_no || '',
                      item.bill_number || '',
                      item.supplier_name || '',
                      item.purchase_date || '',
                      item.total_items || 0,
                      item.total_quantity || 0,
                      item.total_amount || 0,
                      item.tax_amount || 0,
                      item.discount_amount || 0,
                      item.net_amount || 0,
                      item.status || ''
                    ])
                  ].map(row => row.join(',')).join('\n')

                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `purchase-value-report-${new Date().toISOString().split('T')[0]}.csv`
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Purchase Values
              </button>
            </div>
          </div>

          {/* Purchase Value Filters */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DATE_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              {showCustomDate && (
                <>
                  <div className="flex-1 min-w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by supplier or bill number..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Bills</p>
                  <p className="text-2xl font-bold text-gray-900">{purchaseValueSummary.totalBills || 0}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <IndianRupee className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Purchase Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatIndianCurrency(purchaseValueSummary.totalPurchaseValue || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Average Bill Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatIndianCurrency(purchaseValueSummary.averageBillValue || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Items Purchased</p>
                  <p className="text-2xl font-bold text-gray-900">{(purchaseValueSummary.totalItems || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Value Table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sl.No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseValueData.map((item) => (
                    <tr key={item.sl_no} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.sl_no}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.bill_number}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.supplier_name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.purchase_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.total_items}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.total_quantity}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.total_amount)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.tax_amount)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.discount_amount)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatIndianCurrency(item.net_amount)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {purchaseValueData.length === 0 && (
              <div className="text-center py-8">
                <IndianRupee className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No purchase value data found</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'purchase_report' && (
        <>
          {/* Purchase Report Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchase Report</h1>
              <p className="text-gray-600 mt-1">Detailed purchase transaction items</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const csv = [
                    ['Sl.No.', 'Bill Number', 'Supplier', 'Purchase Date', 'Medication Code', 'Medication Name', 'Batch', 'Expiry Date', 'Quantity', 'Unit Price', 'Total Amount', 'Discount %', 'GST %', 'Net Amount', 'Status'],
                    ...purchaseReportData.map((item) => [
                      item.sl_no || '',
                      item.bill_number || '',
                      item.supplier_name || '',
                      item.purchase_date || '',
                      item.medication_code || '',
                      item.medication_name || '',
                      item.batch_number || '',
                      item.expiry_date || '',
                      item.quantity || 0,
                      item.unit_price || 0,
                      item.total_amount || 0,
                      item.discount_percent || 0,
                      item.gst_percent || 0,
                      item.net_amount || 0,
                      item.status || ''
                    ])
                  ].map(row => row.join(',')).join('\n')

                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `purchase-report-${new Date().toISOString().split('T')[0]}.csv`
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Purchase Report
              </button>
            </div>
          </div>

          {/* Purchase Report Filters */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DATE_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              {showCustomDate && (
                <>
                  <div className="flex-1 min-w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by medication, supplier, or batch..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{purchaseReportSummary.totalItems || 0}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Quantity</p>
                  <p className="text-2xl font-bold text-gray-900">{(purchaseReportSummary.totalQuantity || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <IndianRupee className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Purchase Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatIndianCurrency(purchaseReportSummary.totalPurchaseValue || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Average Item Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatIndianCurrency(purchaseReportSummary.averageItemValue || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Report Table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sl.No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseReportData.slice(0, 100).map((item) => (
                    <tr key={item.sl_no} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.sl_no}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.bill_number}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.supplier_name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.purchase_date !== 'N/A' ? new Date(item.purchase_date).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.medication_name}</div>
                          <div className="text-xs text-gray-500">{item.medication_code}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.batch_number}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.expiry_date !== 'N/A' ? new Date(item.expiry_date).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.total_amount)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.gst_percent}%
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatIndianCurrency(item.net_amount)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {purchaseReportData.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No purchase report data found</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'intent_report' && (
        <>
          {/* Intent Report Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Intent Report</h1>
              <p className="text-gray-600 mt-1">Department-wise medicine intent analysis</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const csv = [
                    ['Sl.No.', 'Intent Type', 'Medication Name', 'Batch', 'Expiry Date', 'Quantity', 'MRP', 'Total Value', 'Department', 'Status', 'Created Date'],
                    ...intentReportData.map((item) => [
                      item.sl_no || '',
                      item.intent_type || '',
                      item.medication_name || '',
                      item.batch_number || '',
                      item.expiry_date || '',
                      item.quantity || 0,
                      item.mrp || 0,
                      item.total_value || 0,
                      item.department || '',
                      item.status || '',
                      item.created_date || ''
                    ])
                  ].map(row => row.join(',')).join('\n')

                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `intent-report-${new Date().toISOString().split('T')[0]}.csv`
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Intent Report
              </button>
            </div>
          </div>

          {/* Intent Report Filters */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DATE_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              {showCustomDate && (
                <>
                  <div className="flex-1 min-w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Intent Type</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="All Categories">All Intent Types</option>
                  <option value="icu">ICU</option>
                  <option value="nicu">NICU</option>
                  <option value="injection room">Injection Room</option>
                  <option value="general ward">General Ward</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by medication, batch, or department..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Intent Items</p>
                  <p className="text-2xl font-bold text-gray-900">{intentReportSummary.totalItems || 0}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Quantity</p>
                  <p className="text-2xl font-bold text-gray-900">{(intentReportSummary.totalQuantity || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <IndianRupee className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatIndianCurrency(intentReportSummary.totalValue || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Departments</p>
                  <p className="text-2xl font-bold text-gray-900">{intentReportSummary.intentTypeCount || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{intentReportSummary.mostCommonIntentType}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Intent Report Table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sl.No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intent Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dosage Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {intentReportData.slice(0, 100).map((item) => (
                    <tr key={item.sl_no} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.sl_no}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.intent_type === 'icu' ? 'bg-red-100 text-red-800' :
                          item.intent_type === 'nicu' ? 'bg-blue-100 text-blue-800' :
                          item.intent_type === 'injection room' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.intent_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.medication_name}</div>
                          <div className="text-xs text-gray-500">{item.medication_code}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.batch_number}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.expiry_date !== 'N/A' ? new Date(item.expiry_date).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatIndianCurrency(item.mrp)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatIndianCurrency(item.total_value)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.dosage_type}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'active' ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div>{item.created_date}</div>
                          <div className="text-xs text-gray-500">{item.created_time}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {intentReportData.length === 0 && (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No intent report data found</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function PharmacyReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Loading pharmacy reports...</div>
          <div className="text-sm text-gray-500">Please wait while we prepare your analytics</div>
        </div>
      </div>
    }>
      <PharmacyReportsContent />
    </Suspense>
  )
}
