'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Receipt, 
  DollarSign, 
  ArrowLeft,
  Calendar,
  CreditCard,
  TrendingUp,
  IndianRupee,
  CheckCircle,
  Eye,
  Download,
  Edit,
  X
} from 'lucide-react'
import { supabase } from '@/src/lib/supabase'

interface PharmacyBill {
  id: string
  bill_number: string
  customer_name: string
  patient_uhid: string
  customer_type: string
  subtotal: number
  discount: number
  tax: number
  total_amount: number
  payment_method: string
  payment_status: string
  created_at: string
}

interface DashboardStats {
  todaysSales: number
  pendingOrders: number
  monthlyCollection: number
  totalPayments: number
}

export default function PharmacyBillingPage() {
  const [bills, setBills] = useState<PharmacyBill[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [showPaymentEditModal, setShowPaymentEditModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<PharmacyBill | null>(null)
  const [newPaymentMethod, setNewPaymentMethod] = useState('')
  const [updatingPayment, setUpdatingPayment] = useState(false)
  const embedded = false
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewItems, setViewItems] = useState<any[]>([])
  const [viewLoading, setViewLoading] = useState(false)
  // Payment details for split payments
  const [paymentDetails, setPaymentDetails] = useState<any[]>([])
  const [paymentDetailsLoading, setPaymentDetailsLoading] = useState(false)
  // Hospital settings
  const [hospital, setHospital] = useState({
    name: 'ANNAM PHARMACY',
    department: 'Pharmacy Department',
    address: '2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur - 628002',
    contact_number: 'Ph.No: 04639-252592',
    gst_number: 'GST29ABCDE1234F1Z5'
  })

  useEffect(() => {
    loadBillingData()
    ;(async () => {
      try {
        const { data } = await supabase.from('hospital_settings').select('*').eq('id', 1).maybeSingle()
        if (data) {
          setHospital({
            name: data.name,
            department: data.department,
            address: data.address,
            contact_number: data.contact_number,
            gst_number: data.gst_number
          })
        }
      } catch {}
    })()
  }, [])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      
      // Fetch billing data first (no join to avoid FK/join errors)
      const { data: billsData, error: billsError } = await supabase
        .from('billing')
        .select(`
          id,
          bill_number,
          customer_name,
          customer_type,
          patient_id,
          subtotal,
          discount,
          tax,
          total,
          payment_method,
          payment_status,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (billsError) throw billsError

      // Resolve patient UHIDs in a separate safe query
      const patientIds = Array.from(new Set((billsData || [])
        .map((b: any) => b.patient_id)
        .filter((id: string | null) => !!id)))

      let patientsMap: Record<string, { patient_id: string }> = {}
      if (patientIds.length > 0) {
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('id, patient_id')
          .in('id', patientIds as string[])

        if (!patientsError && patientsData) {
          patientsMap = patientsData.reduce((acc: any, p: any) => {
            acc[p.id] = { patient_id: p.patient_id }
            return acc
          }, {})
        } else {
          console.warn('Patients lookup skipped due to error:', patientsError)
        }
      }

      // Map bills data with proper formatting and resolved UHIDs
      const mappedBills = (billsData || []).map((bill: any) => ({
        id: bill.id,
        bill_number: bill.bill_number || `#${bill.id.slice(-8)}`,
        customer_name: bill.customer_name || 'Unknown',
        patient_uhid: bill.customer_type === 'patient'
          ? (patientsMap[bill.patient_id]?.patient_id || 'Unknown')
          : '',
        customer_type: bill.customer_type || 'patient',
        subtotal: bill.subtotal || 0,
        discount: bill.discount || 0,
        tax: bill.tax || 0,
        total_amount: bill.total || 0,
        payment_method: bill.payment_method || 'cash',
        payment_status: bill.payment_status || 'completed',
        created_at: bill.created_at
      }))
      
      setBills(mappedBills)
      
      // Calculate KPI stats from the bills data
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      const todaysCollection = mappedBills
        .filter(bill => new Date(bill.created_at) >= startOfToday && bill.payment_status === 'completed')
        .reduce((sum, bill) => sum + bill.total_amount, 0)
      
      const monthlyCollection = mappedBills
        .filter(bill => new Date(bill.created_at) >= startOfMonth && bill.payment_status === 'completed')
        .reduce((sum, bill) => sum + bill.total_amount, 0)
      
      const pendingDue = mappedBills
        .filter(bill => bill.payment_status === 'pending')
        .reduce((sum, bill) => sum + bill.total_amount, 0)
      
      const totalPayments = mappedBills
        .filter(bill => bill.payment_status === 'completed')
        .reduce((sum, bill) => sum + bill.total_amount, 0)
      
      setDashboardStats({
        todaysSales: todaysCollection,
        pendingOrders: pendingDue,
        monthlyCollection: monthlyCollection,
        totalPayments: totalPayments
      })
    } catch (err) {
      setError('Failed to load billing data')
      console.error('Error loading billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSettlePayment = async (billId: string) => {
    if (!confirm('Mark this bill as paid? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('billing')
        .update({ payment_status: 'completed' })
        .eq('id', billId)

      if (error) throw error

      await loadBillingData()
      alert('Payment settled successfully!')
    } catch (err: any) {
      setError('Failed to settle payment: ' + (err?.message || 'Unknown error'))
      console.error('Error settling payment:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditPaymentMethod = (bill: PharmacyBill) => {
    setSelectedBill(bill)
    setNewPaymentMethod(bill.payment_method)
    setShowPaymentEditModal(true)
  }

  const openViewBill = async (bill: PharmacyBill) => {
    setSelectedBill(bill)
    setShowViewModal(true)
    setViewLoading(true)
    setPaymentDetailsLoading(true)
    
    try {
      // Fetch bill items
      const { data: itemsData, error: itemsError } = await supabase
        .from('billing_item')
        .select('*')
        .eq('billing_id', bill.id)
      if (itemsError) throw itemsError
      setViewItems(itemsData || [])

      // Fetch payment details for split payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('billing_payments')
        .select('*')
        .eq('billing_id', bill.id)
        .order('created_at', { ascending: true })

      if (paymentError) {
        console.warn('Failed to load payment details:', paymentError)
        setPaymentDetails([])
      } else {
        setPaymentDetails(paymentData || [])
      }
    } catch (e) {
      console.error('Failed to load bill data', e)
      setViewItems([])
      setPaymentDetails([])
    } finally {
      setViewLoading(false)
      setPaymentDetailsLoading(false)
    }
  }

  const printBill = () => {
    if (!selectedBill) return
    
    // Generate payment details HTML
    const paymentDetailsHtml = paymentDetails.length > 0 ? `
      <div style="margin: 16px 0; padding: 12px; background: #f9fafb; border-radius: 6px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #111827;">Payment Details</h4>
        ${paymentDetails.map(payment => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 500;">${payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}</span>
              ${payment.reference ? `<span style="color: #6b7280;">(${payment.reference})</span>` : ''}
            </div>
            <span style="font-weight: 600; color: #059669;">₹${Number(payment.amount || 0).toFixed(2)}</span>
          </div>
        `).join('')}
        ${paymentDetails.length > 1 ? `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; margin-top: 4px; border-top: 1px solid #e5e7eb; font-weight: 600; font-size: 13px;">
            <span>Total Paid</span>
            <span style="color: #2563eb;">₹${paymentDetails.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}</span>
          </div>
        ` : ''}
      </div>
    ` : '';

    const itemsHtml = viewItems.map((it: any, idx: number) => `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:6px">${idx + 1}</td>
        <td style="padding:6px">
          <div style="font-weight:500">${it.description || ''}</div>
        </td>
        <td style="padding:6px;text-align:center">${it.qty}</td>
        <td class="amount-cell" style="padding:6px;text-align:right;padding-right:4mm">₹${Number(it.total_amount || 0).toFixed(2)}</td>
      </tr>
    `).join('')
    
    const subtotal = selectedBill.subtotal ?? viewItems.reduce((s: number, it: any) => s + Number(it.total_amount || 0), 0)
    const discount = selectedBill.discount || 0
    const tax = selectedBill.tax ?? Math.max(selectedBill.total_amount - (subtotal - discount), 0)
    
    const w = window.open('', 'printwin')
    if (!w) return
    w.document.write(`
      <html>
        <head>
          <title>Bill ${selectedBill.bill_number}</title>
          <style>
            @page{margin:5mm}
            body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#111827}
            table{border-collapse:collapse;width:100%}
            .invoice-header{line-height:1.3;margin-bottom:6px;text-align:center}
            .bill-info td{word-break:break-all}
            .amount-cell{text-align:right;padding-right:4mm}
            .label{font-weight:400;color:#333}
            .value{font-weight:600}
            .totals{page-break-inside:avoid;margin-bottom:5mm;border-top:2px solid #d1d5db;padding-top:8px}
            .invoice-footer{position:relative;margin-top:10mm;text-align:center;font-size:10pt}
            th{padding:6px;text-align:left}
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h2 style="margin:0;font-size:22px;font-weight:700">${hospital.name}</h2>
            <div>${hospital.department}</div>
            <div style="font-size:12px;color:#4b5563">${hospital.address}</div>
            <div style="font-size:12px;color:#4b5563">${hospital.contact_number}</div>
            <div style="font-size:12px;color:#6b7280">GST No: ${hospital.gst_number}</div>
            <div style="margin-top:2px;font-weight:600">INVOICE</div>
          </div>

          <table class="bill-info" style="margin-bottom:8px;font-size:14px">
            <tr>
              <td><strong>Bill No:</strong> ${selectedBill.bill_number}</td>
              <td><strong>To:</strong> ${selectedBill.customer_name}</td>
            </tr>
            <tr>
              <td><strong>Date:</strong> ${new Date(selectedBill.created_at).toLocaleString()}</td>
              <td><strong>Status:</strong> ${selectedBill.payment_status}</td>
            </tr>
          </table>

          ${paymentDetailsHtml}

          <table style="font-size:14px;margin-bottom:10px">
            <thead>
              <tr style="border-bottom:2px solid #d1d5db">
                <th style="padding:6px;width:40px">S.No</th>
                <th style="padding:6px">Drug Name</th>
                <th style="padding:6px;text-align:center">Qty</th>
                <th style="padding:6px;text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="totals" style="font-size:14px">
            <div style="display:flex;justify-content:space-between"><span class="label">Taxable Amt</span><span class="value">₹${subtotal.toFixed(2)}</span></div>
            ${discount > 0 ? `<div style="display:flex;justify-content:space-between"><span class="label">Disc Amt</span><span class="value">-₹${discount.toFixed(2)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between"><span class="label">CGST Amt</span><span class="value">₹${(tax/2).toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between"><span class="label">SGST Amt</span><span class="value">₹${(tax/2).toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-weight:600;border-top:1px solid #e5e7eb;padding-top:6px"><span>Total Net Amt</span><span>₹${selectedBill.total_amount.toFixed(2)}</span></div>
          </div>

          <div class="invoice-footer">
            <div style="display:flex;justify-content:space-between;align-items:flex-end">
              <div>
                <div>Printed Date: ${new Date().toLocaleDateString()}</div>
                <div>Printed Time: ${new Date().toLocaleTimeString()}</div>
              </div>
              <div>
                <div style="height:40px"></div>
                <div style="border-top:1px solid #d1d5db;padding-top:4px">Pharmacist Signature</div>
              </div>
            </div>
          </div>
          <script>window.onload=() => {window.print(); setTimeout(()=>window.close(), 300);}</script>
        </body>
      </html>
    `)
    w.document.close()
  }

  const handleUpdatePaymentMethod = async () => {
    if (!selectedBill || !newPaymentMethod) return

    if (!confirm(`Change payment method from ${selectedBill.payment_method} to ${newPaymentMethod}?`)) {
      return
    }

    try {
      setUpdatingPayment(true)
      const { error } = await supabase
        .from('billing')
        .update({ 
          payment_method: newPaymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBill.id)

      if (error) throw error

      await loadBillingData()
      setShowPaymentEditModal(false)
      setSelectedBill(null)
      setNewPaymentMethod('')
      alert('Payment method updated successfully!')
    } catch (err: any) {
      setError('Failed to update payment method: ' + (err?.message || 'Unknown error'))
      console.error('Error updating payment method:', err)
    } finally {
      setUpdatingPayment(false)
    }
  }

  const filteredBills = bills.filter(bill => {
    const matchesSearch = (bill.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (bill.patient_uhid || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (bill.bill_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || bill.payment_status === statusFilter
    const matchesPayment = paymentFilter === 'all' || bill.payment_method === paymentFilter
    
    return matchesSearch && matchesStatus && matchesPayment
  })

  const getStatusBadge = (status: string) => {
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
      case 'upi':
        return <Receipt className="w-4 h-4 text-purple-600" />
      case 'split':
        return <Receipt className="w-4 h-4 text-indigo-600" />
      case 'credit':
        return <DollarSign className="w-4 h-4 text-orange-600" />
      case 'others':
        return <DollarSign className="w-4 h-4 text-gray-600" />
      default:
        return <Receipt className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading billing data...</div>
      </div>
    )
  }

  return (
    <div className={embedded ? "space-y-6" : "container mx-auto p-6 space-y-6"}>
      {/* Header (hidden when embedded) */}
      {!embedded && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/pharmacy">
              <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pharmacy Billing History</h1>
              <p className="text-gray-600 mt-1">Manage bills and payment records</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Collection</p>
                <p className="text-2xl font-bold text-green-600">₹{dashboardStats.todaysSales.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Collection</p>
                <p className="text-2xl font-bold text-blue-600">₹{dashboardStats.monthlyCollection.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Due</p>
                <p className="text-2xl font-bold text-orange-600">₹{dashboardStats.pendingOrders.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-purple-600">₹{dashboardStats.totalPayments.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search bills or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="split">Split</option>
            <option value="credit">Credit</option>
            <option value="others">Others</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            Showing {filteredBills.length} of {bills.length} bills
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UHID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openViewBill(bill)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {bill.bill_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{bill.customer_name}</div>
                      <div className="text-xs text-gray-500 capitalize">{bill.customer_type}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bill.patient_uhid || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    ₹{bill.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(bill.payment_method)}
                      <span className="capitalize">
                        {bill.payment_method === 'split' ? 'Split Payment' : bill.payment_method}
                      </span>
                      {bill.payment_method === 'split' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          Multiple
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(bill.payment_status)}>
                      {bill.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800" onClick={(e) => { e.stopPropagation(); openViewBill(bill) }} title="View Bill">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800" onClick={(e) => { e.stopPropagation(); (async () => { await openViewBill(bill); setTimeout(() => printBill(), 150); })(); }} title="Download / Print">
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditPaymentMethod(bill) }}
                        className="text-purple-600 hover:text-purple-800"
                        title="Edit Payment Method"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {bill.payment_status === 'pending' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSettlePayment(bill.id) }}
                          className="text-orange-600 hover:text-orange-800"
                          title="Settle Payment"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBills.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Bill View Modal */}
      {showViewModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Bill {selectedBill.bill_number}</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowViewModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-gray-700 mb-4 grid grid-cols-2 gap-2">
              <div><span className="font-medium">Customer:</span> {selectedBill.customer_name}</div>
              {selectedBill.patient_uhid && (
                <div><span className="font-medium">UHID:</span> {selectedBill.patient_uhid}</div>
              )}
              <div><span className="font-medium">Date:</span> {new Date(selectedBill.created_at).toLocaleString()}</div>
              <div><span className="font-medium">Payment Status:</span> <span className={getStatusBadge(selectedBill.payment_status)}>{selectedBill.payment_status}</span></div>
            </div>

            {/* Payment Details */}
            {paymentDetails.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Details</h4>
                <div className="space-y-2">
                  {paymentDetails.map((payment, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm">
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(payment.method)}
                        <span className="capitalize">{payment.method}</span>
                        {payment.reference && (
                          <span className="text-gray-500">({payment.reference})</span>
                        )}
                      </div>
                      <span className="font-medium text-green-600">₹{Number(payment.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  {paymentDetails.length > 1 && (
                    <div className="flex items-center justify-between bg-blue-50 rounded p-2 text-sm font-medium">
                      <span>Total Paid</span>
                      <span className="text-blue-600">₹{paymentDetails.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Item</th>
                    <th className="px-3 py-2 border-b">Qty</th>
                    <th className="text-right px-3 py-2 border-b">Rate</th>
                    <th className="text-right px-3 py-2 border-b">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLoading ? (
                    <tr><td className="px-3 py-3 text-center" colSpan={4}>Loading items...</td></tr>
                  ) : viewItems.length === 0 ? (
                    <tr><td className="px-3 py-3 text-center" colSpan={4}>No items</td></tr>
                  ) : (
                    viewItems.map((it: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2">{it.description}</td>
                        <td className="px-3 py-2 text-center">{it.qty}</td>
                        <td className="px-3 py-2 text-right">₹{Number(it.unit_amount || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">₹{Number(it.total_amount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="text-gray-600 text-sm">Total</div>
              <div className="font-semibold text-lg">₹{selectedBill.total_amount.toLocaleString()}</div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={printBill} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Download / Print</button>
              <button onClick={() => setShowViewModal(false)} className="px-4 py-2 border rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Edit Modal */}
      {showPaymentEditModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Payment Method</h3>
              <button
                onClick={() => {
                  setShowPaymentEditModal(false)
                  setSelectedBill(null)
                  setNewPaymentMethod('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Bill: <span className="font-medium">{selectedBill.bill_number}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Current Method: <span className="font-medium capitalize">{selectedBill.payment_method}</span>
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Payment Method
              </label>
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select payment method</option>
                <option value="cash">Cash</option>
                <option value="gpay">GPay</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="credit">Credit</option>
                <option value="others">Others</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentEditModal(false)
                  setSelectedBill(null)
                  setNewPaymentMethod('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePaymentMethod}
                disabled={!newPaymentMethod || updatingPayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingPayment ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
