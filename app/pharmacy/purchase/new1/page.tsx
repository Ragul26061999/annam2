'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Plus, Trash2, Search, Package,
  Receipt, FileText, Calculator, RotateCcw
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { getSuppliers, Supplier } from '@/src/lib/enhancedPharmacyService'
import { getMedications } from '@/src/lib/pharmacyService'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillHeader {
  purchase_no: string
  search_bill_no: string
  supplier_id: string
  supplier_name: string
  purchase_account: string
  bill_no: string
  bill_amount: number
  gst_amt: number
  disc_amt: number
  grn_no: string
  bill_date: string
  received_date: string
  payment_mode: 'CASH' | 'CREDIT'
  remarks: string
}

interface DrugLineItem {
  key: string
  medication_id: string
  medication_name: string
  drug_return: boolean
  pack_size: number
  rate: number
  mrp: number
  expiry_date: string
  free_expiry_date?: string
  free_mrp?: number
  batch_number: string
  quantity: number
  free_quantity: number
  gst_percent: number
  discount_percent: number
  total_amount: number
  single_unit_rate: number
  profit_percent: number
  // computed
  cgst_amount: number
  sgst_amount: number
  tax_amount: number
  disc_amount: number
  flag: string
  drug_rate_id: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────--

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

const fmtNum = (n: number, decimals = 2) => Number(n).toFixed(decimals)

const genKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const emptyLine = (): DrugLineItem => ({
  key: genKey(),
  medication_id: '',
  medication_name: '',
  drug_return: false,
  pack_size: 1,
  rate: 0,
  mrp: 0,
  expiry_date: '',
  free_expiry_date: '',
  free_mrp: 0,
  batch_number: '',
  quantity: 0,
  free_quantity: 0,
  gst_percent: 5,
  discount_percent: 0,
  total_amount: 0,
  single_unit_rate: 0,
  profit_percent: 0,
  cgst_amount: 0,
  sgst_amount: 0,
  tax_amount: 0,
  disc_amount: 0,
  flag: 'Purchase',
  drug_rate_id: '',
})

function recalcLine(item: DrugLineItem): DrugLineItem {
  const qty = item.quantity || 0
  const rate = item.rate || 0
  const packSize = item.pack_size || 1
  const discPct = item.discount_percent || 0
  const gstPct = item.gst_percent || 0

  const subtotal = qty * rate
  const discAmt = subtotal * discPct / 100
  const taxable = subtotal - discAmt
  const taxAmt = taxable * gstPct / 100
  const cgst = taxAmt / 2
  const sgst = taxAmt / 2
  const total = taxable + taxAmt
  const singleUnitRate = packSize > 0 ? rate / packSize : rate
  const profitPct = item.mrp > 0 && rate > 0
    ? ((item.mrp - rate) / rate) * 100
    : item.profit_percent

  return {
    ...item,
    disc_amount: discAmt,
    tax_amount: taxAmt,
    cgst_amount: cgst,
    sgst_amount: sgst,
    total_amount: total,
    single_unit_rate: singleUnitRate,
    profit_percent: profitPct,
    flag: item.drug_return ? 'Return' : 'Purchase',
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EnhancedPurchaseEntryPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Drug search
  const [drugSearchTerm, setDrugSearchTerm] = useState('')
  const [activeDrugSearchIndex, setActiveDrugSearchIndex] = useState<number | null>(null)
  const [showDrugDropdown, setShowDrugDropdown] = useState(false)
  const [selectedDrugIndex, setSelectedDrugIndex] = useState(0)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const drugSearchRef = useRef<HTMLDivElement>(null)
  const drugInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [header, setHeader] = useState<BillHeader>({
    purchase_no: '(Auto)',
    search_bill_no: '',
    supplier_id: '',
    supplier_name: '',
    purchase_account: 'PURCHASE ACCOUNT',
    bill_no: '',
    bill_amount: 0,
    gst_amt: 0,
    disc_amt: 0,
    grn_no: '',
    bill_date: new Date().toISOString().split('T')[0],
    received_date: new Date().toISOString().split('T')[0],
    payment_mode: 'CREDIT',
    remarks: '',
  })

  const [items, setItems] = useState<DrugLineItem[]>([emptyLine()])

  // Scroll selected item into view
  const scrollSelectedIntoView = (selectedIndex: number) => {
    if (dropdownRef.current) {
      const selectedItem = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement
      if (selectedItem) {
        selectedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        })
      }
    }
  }

  // ─── Load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    ;(async () => {
      try {
        const [s, m] = await Promise.all([
          getSuppliers({ status: 'active' }),
          getMedications(),
        ])
        setSuppliers(s)
        setMedications(m)
      } catch (e) {
        console.error('Load error:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Close drug dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is outside any drug input
      const clickedOutsideAllInputs = Object.values(drugInputRefs.current).every(
        ref => !ref || !ref.contains(e.target as Node)
      )
      
      if (clickedOutsideAllInputs) {
        setShowDrugDropdown(false)
        setActiveDrugSearchIndex(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Header helpers ────────────────────────────────────────────────────────

  const setH = useCallback((field: keyof BillHeader, value: any) => {
    setHeader(prev => ({ ...prev, [field]: value }))
  }, [])

  // ─── Search existing bill ──────────────────────────────────────────────────

  const handleSearchBill = async () => {
    if (!header.search_bill_no.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const res = await fetch(`/api/pharmacy/purchases/enhanced?bill_no=${encodeURIComponent(header.search_bill_no)}`)
      const json = await res.json()
      if (json.purchases?.length > 0) {
        setSearchResults(json.purchases)
      } else {
        alert('No purchase found with that bill number.')
      }
    } catch (e) {
      console.error('Search error:', e)
    } finally {
      setSearching(false)
    }
  }

  const loadSearchResult = (purchase: any) => {
    setHeader(prev => ({
      ...prev,
      purchase_no: purchase.purchase_number || '(Auto)',
      supplier_id: purchase.supplier_id || '',
      supplier_name: purchase.supplier?.name || '',
      bill_no: purchase.invoice_number || '',
      bill_amount: Number(purchase.bill_amount ?? purchase.total_amount ?? 0),
      gst_amt: Number(purchase.gst_amount ?? purchase.total_tax ?? 0),
      disc_amt: Number(purchase.disc_amount ?? purchase.discount_amount ?? 0),
      grn_no: purchase.grn_no || '',
      bill_date: purchase.bill_date || purchase.invoice_date || '',
      received_date: purchase.received_date || purchase.purchase_date || '',
      payment_mode: purchase.payment_mode || 'CREDIT',
      purchase_account: purchase.purchase_account || 'PURCHASE ACCOUNT',
      remarks: purchase.remarks || '',
    }))

    if (purchase.items?.length > 0) {
      setItems(purchase.items.map((it: any) => recalcLine({
        ...emptyLine(),
        medication_id: it.medication_id,
        medication_name: it.medication_name || it.medication?.name || '',
        batch_number: it.batch_number || '',
        expiry_date: it.expiry_date || '',
        quantity: Number(it.quantity ?? 0),
        free_quantity: Number(it.free_quantity ?? 0),
        rate: Number(it.purchase_rate ?? it.rate ?? 0),
        mrp: Number(it.mrp ?? 0),
        pack_size: Number(it.pack_size ?? 1),
        gst_percent: Number(it.gst_percent ?? 0),
        discount_percent: Number(it.discount_percent ?? 0),
        profit_percent: Number(it.profit_percent ?? 0),
        drug_return: it.drug_return || false,
        flag: it.flag || 'Purchase',
        drug_rate_id: it.drug_rate_id || '',
      })))
    }
    setSearchResults([])
  }

  // ─── Item helpers ──────────────────────────────────────────────────────────

  const addItem = () => setItems(prev => [...prev, emptyLine()])

  const removeItem = (key: string) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter(i => i.key !== key))
  }

  const updateItem = (key: string, field: keyof DrugLineItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.key !== key) return item
      const updated = { ...item, [field]: value }

      // Auto-fill from medication
      if (field === 'medication_id') {
        const med = medications.find(m => m.id === value)
        if (med) {
          updated.medication_name = med.name
          updated.rate = med.purchase_price || 0
          updated.mrp = med.mrp || med.selling_price || 0
          updated.gst_percent = med.gst_percent || 5
        }
      }

      return recalcLine(updated)
    }))
  }

  const selectDrugForLine = (index: number, med: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      return recalcLine({
        ...item,
        medication_id: med.id,
        medication_name: med.name,
        rate: med.purchase_price || 0,
        mrp: med.mrp || med.selling_price || 0,
        gst_percent: med.gst_percent || 5,
      })
    }))
    setShowDrugDropdown(false)
    setActiveDrugSearchIndex(null)
    setDrugSearchTerm('')
  }

  // ─── Summary calculations ──────────────────────────────────────────────────

  const summary = React.useMemo(() => {
    let totalDisc = 0, totalGst = 0, totalAmt = 0, totalCgst = 0, totalSgst = 0
    items.forEach(item => {
      totalDisc += item.disc_amount
      totalGst += item.tax_amount
      totalAmt += item.total_amount
      totalCgst += item.cgst_amount
      totalSgst += item.sgst_amount
    })
    const netAmount = totalAmt
    return {
      discount_percent: totalAmt > 0 ? (totalDisc / totalAmt * 100) : 0,
      total_discount: totalDisc,
      total_gst: totalGst,
      total_amount: totalAmt,
      paid_amount: header.bill_amount || 0,
      net_amount: netAmount,
      total_cgst: totalCgst,
      total_sgst: totalSgst,
    }
  }, [items])

  // ─── Auto-fill header fields from summary ───────────────────────────────────
  useEffect(() => {
    setHeader(prev => ({
      ...prev,
      gst_amount: summary.total_gst,
      bill_amount: summary.total_amount,
      disc_amt: summary.total_discount,
    }))
  }, [summary.total_gst, summary.total_amount, summary.total_discount])

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!header.supplier_id) {
      alert('Please select a supplier')
      return
    }
    const validItems = items.filter(i => i.medication_id && i.quantity > 0)
    if (validItems.length === 0) {
      alert('Please add at least one drug with quantity > 0')
      return
    }
    const missingBatch = validItems.find(i => !i.batch_number || !i.expiry_date)
    if (missingBatch) {
      alert('All items must have Batch Number and Expiry Date')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/pharmacy/purchases/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase: {
            supplier_id: header.supplier_id,
            bill_no: header.bill_no,
            bill_date: header.bill_date || null,
            received_date: header.received_date || null,
            bill_amount: header.bill_amount,
            grn_no: header.grn_no || null,
            disc_amt: header.disc_amt,
            purchase_account: header.purchase_account,
            cash_discount: header.disc_amt,
            paid_amount: summary.net_amount,
            payment_mode: header.payment_mode,
            remarks: header.remarks,
            status: 'received',
          },
          items: validItems.map(i => ({
            medication_id: i.medication_id,
            batch_number: i.batch_number,
            expiry_date: i.expiry_date,
            free_expiry_date: i.free_expiry_date,
            free_mrp: i.free_mrp,
            quantity: i.quantity,
            free_quantity: i.free_quantity,
            rate: i.rate,
            unit_price: i.rate,
            mrp: i.mrp,
            pack_size: i.pack_size,
            gst_percent: i.gst_percent,
            discount_percent: i.discount_percent,
            profit_percent: i.profit_percent,
            drug_return: i.drug_return,
          })),
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')

      alert(`Purchase saved! No: ${json.purchase?.purchase_number || 'N/A'}`)
      router.push('/pharmacy/purchase')
    } catch (e: any) {
      console.error('Submit error:', e)
      alert(`Error: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Filtered drugs for search ─────────────────────────────────────────────

  const filteredDrugs = React.useMemo(() => {
    if (!drugSearchTerm.trim()) return medications.slice(0, 20)
    const term = drugSearchTerm.toLowerCase()
    return medications.filter(m =>
      m.name?.toLowerCase().includes(term) ||
      m.medication_code?.toLowerCase().includes(term) ||
      m.generic_name?.toLowerCase().includes(term)
    ).slice(0, 20)
  }, [drugSearchTerm, medications])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-gray-600">Loading purchase entry...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Enhanced Purchase Entry</h1>
              <p className="text-xs text-gray-500">Purchase No: <span className="font-semibold text-blue-600">{header.purchase_no}</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.back()} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shadow-sm"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-5 space-y-5">

        {/* ── Search Existing Bill ─────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={header.search_bill_no}
              onChange={e => setH('search_bill_no', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchBill()}
              placeholder="Search existing bill by Bill No / Purchase No..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearchBill}
              disabled={searching}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-3 border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Purchase #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Supplier</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Bill No</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {searchResults.map((r: any) => (
                    <tr key={r.id} className="hover:bg-blue-50">
                      <td className="px-3 py-2 font-medium text-blue-600">{r.purchase_number}</td>
                      <td className="px-3 py-2">{r.supplier?.name || 'N/A'}</td>
                      <td className="px-3 py-2">{r.invoice_number || '-'}</td>
                      <td className="px-3 py-2 text-right">{fmt(r.total_amount || 0)}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => loadSearchResult(r)} className="text-blue-600 hover:underline text-xs font-medium">
                          Load
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Bill Header Fields ───────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-white">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              Bill Information
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {/* Purchase No */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Purchase No</label>
              <input type="text" value={header.purchase_no} readOnly
                className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed" />
            </div>

            {/* Supplier */}
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Supplier *</label>
              <select
                value={header.supplier_id}
                onChange={e => {
                  const s = suppliers.find(s => s.id === e.target.value)
                  setHeader(prev => ({ ...prev, supplier_id: e.target.value, supplier_name: s?.name || '' }))
                }}
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>
                ))}
              </select>
            </div>

            {/* Purchase Ac */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Purchase Ac</label>
              <input type="text" value={header.purchase_account}
                onChange={e => setH('purchase_account', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>

            {/* Bill No */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Bill No</label>
              <input type="text" value={header.bill_no}
                onChange={e => setH('bill_no', e.target.value)}
                placeholder="049236"
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Bill Amount */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Bill Amount</label>
              <input type="number" value={header.bill_amount ? fmtNum(header.bill_amount) : ''}
                readOnly
                className="w-full border rounded px-2 py-1.5 text-sm bg-blue-50 text-blue-800 cursor-not-allowed" />
            </div>

            {/* GST Amt */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">GST Amt</label>
              <input type="number" value={summary.total_gst ? fmtNum(summary.total_gst) : ''}
                readOnly
                className="w-full border rounded px-2 py-1.5 text-sm bg-green-50 text-green-800 cursor-not-allowed" />
            </div>

            {/* Disc Amt */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Disc Amt</label>
              <input type="number" value={header.disc_amt ? fmtNum(header.disc_amt) : ''}
                readOnly
                className="w-full border rounded px-2 py-1.5 text-sm bg-orange-50 text-orange-800 cursor-not-allowed" />
            </div>

            
            {/* GRN No */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">GRN No</label>
              <input type="text" value={header.grn_no}
                onChange={e => setH('grn_no', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="GRN-001" />
            </div>

            {/* Bill Date */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Bill Date</label>
              <input type="date" value={header.bill_date}
                onChange={e => setH('bill_date', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                min="2000-01-01" max="2100-12-31" />
            </div>

            {/* Rec Date */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Rec Date</label>
              <input type="date" value={header.received_date}
                onChange={e => setH('received_date', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                min="2000-01-01" max="2100-12-31" />
            </div>

            {/* Cash/Credit */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Cash/Credit</label>
              <select value={header.payment_mode}
                onChange={e => setH('payment_mode', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="CASH">CASH</option>
                <option value="CREDIT">CREDIT</option>
              </select>
            </div>

                      </div>
        </div>

        {/* ── Drug Entry Section ───────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-green-50 to-white flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-green-600" />
              Drug Entry
            </h2>
            <button onClick={addItem}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-green-700 shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          {/* Add a portal container for dropdowns */}
          <div id="dropdown-portal" className="relative" />

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs bg-white">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-3 py-3 text-left font-semibold text-gray-700 w-8 border-r border-gray-200">Sl</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700 min-w-[280px] border-r border-gray-200">Drug Name</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-16 border-r border-gray-200">Pack</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-20 border-r border-gray-200">Rate</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-20 border-r border-gray-200">M.R.P</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-28 border-r border-gray-200">Exp.Date</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-24 border-r border-gray-200">Batch</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-16 border-r border-gray-200">Qty</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-14 border-r border-gray-200">Free</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-16 border-r border-gray-200">GST%</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-16 border-r border-gray-200">Disc%</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 w-20 border-r border-gray-200">Total</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-20 border-r border-gray-200">Unit Rate</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-16 border-r border-gray-200">Profit%</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, idx) => (
                  <tr key={item.key} className={`hover:bg-blue-50/50 transition-colors ${item.drug_return ? 'bg-red-50/50' : ''}`}>
                    {/* Sl No */}
                    <td className="px-3 py-2 text-center text-gray-600 font-medium border-r border-gray-100">{idx + 1}</td>

                    {/* Drug Name with search */}
                    <td className="px-3 py-2 relative border-r border-gray-100">
                      <div ref={activeDrugSearchIndex === idx ? drugSearchRef : undefined}>
                      {item.medication_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate flex-1">{item.medication_name}</span>
                          <button onClick={() => updateItem(item.key, 'medication_id', '')}
                            className="text-gray-400 hover:text-red-500 shrink-0 p-1 hover:bg-red-50 rounded transition-colors">
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            ref={(el) => { drugInputRefs.current[item.key] = el }}
                            type="text"
                            value={activeDrugSearchIndex === idx ? drugSearchTerm : ''}
                            onChange={e => {
                              setDrugSearchTerm(e.target.value)
                              setActiveDrugSearchIndex(idx)
                              setShowDrugDropdown(true)
                              setSelectedDrugIndex(0)
                              
                              // Calculate dropdown position
                              const input = drugInputRefs.current[item.key]
                              if (input) {
                                const rect = input.getBoundingClientRect()
                                setDropdownPosition({
                                  top: rect.bottom + window.scrollY + 4,
                                  left: rect.left + window.scrollX,
                                  width: rect.width
                                })
                              }
                            }}
                            onFocus={() => {
                              setActiveDrugSearchIndex(idx)
                              setShowDrugDropdown(true)
                              setSelectedDrugIndex(0)
                              
                              // Calculate dropdown position on focus
                              const input = drugInputRefs.current[item.key]
                              if (input) {
                                const rect = input.getBoundingClientRect()
                                setDropdownPosition({
                                  top: rect.bottom + window.scrollY + 4,
                                  left: rect.left + window.scrollX,
                                  width: rect.width
                                })
                              }
                            }}
                            onKeyDown={e => {
                              const drugs = filteredDrugs
                              if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const newIndex = (selectedDrugIndex + 1) % drugs.length
                                setSelectedDrugIndex(newIndex)
                                setTimeout(() => scrollSelectedIntoView(newIndex), 0)
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const newIndex = (selectedDrugIndex - 1 + drugs.length) % drugs.length
                                setSelectedDrugIndex(newIndex)
                                setTimeout(() => scrollSelectedIntoView(newIndex), 0)
                              } else if (e.key === 'Enter') {
                                e.preventDefault()
                                if (drugs[selectedDrugIndex]) {
                                  selectDrugForLine(idx, drugs[selectedDrugIndex])
                                }
                              } else if (e.key === 'Escape') {
                                setShowDrugDropdown(false)
                                setActiveDrugSearchIndex(null)
                              }
                            }}
                            placeholder="Type to search drug..."
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                      )}
                      </div>
                    </td>

                    
                    {/* Pack */}
                    <td className="px-2 py-2 border-r border-gray-100">
                      <input type="number" value={item.pack_size || ''}
                        onChange={e => updateItem(item.key, 'pack_size', parseInt(e.target.value) || 1)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        min="1" />
                    </td>

                    {/* Rate */}
                    <td className="px-2 py-2 border-r border-gray-100">
                      <input type="number" value={item.rate || ''}
                        onChange={e => updateItem(item.key, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        step="0.01" min="0" />
                    </td>

                    {/* MRP */}
                    <td className="px-2 py-2 border-r border-gray-100">
                      <div className="space-y-1">
                        <div>
                          <label className="text-[10px] text-gray-500 block">MRP</label>
                          <input type="number" value={item.mrp || ''}
                            onChange={e => updateItem(item.key, 'mrp', parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            step="0.01" min="0" />
                        </div>
                        {item.free_quantity > 0 && (
                          <div>
                            <label className="text-[10px] text-orange-600 block">Free MRP</label>
                            <input type="number" value={item.free_mrp || ''}
                              onChange={e => updateItem(item.key, 'free_mrp', parseFloat(e.target.value) || 0)}
                              className="w-full border border-orange-200 rounded px-2 py-1 text-sm text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-orange-50 transition-colors"
                              step="0.01" min="0" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Exp Date */}
                    <td className="px-2 py-2 border-r border-gray-100">
                      <div className="space-y-1">
                        <div>
                          <label className="text-[10px] text-gray-500 block">Expiry</label>
                          <input type="date" value={item.expiry_date}
                            onChange={e => {
                              const d = e.target.value
                              if (d) {
                                const y = parseInt(d.split('-')[0])
                                if (y >= 2000 && y <= 2100) updateItem(item.key, 'expiry_date', d)
                              } else {
                                updateItem(item.key, 'expiry_date', '')
                              }
                            }}
                            className="w-full border border-gray-300 rounded px-1 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            min="2000-01-01" max="2100-12-31" />
                        </div>
                        {item.free_quantity > 0 && (
                          <div>
                            <label className="text-[10px] text-orange-600 block">Free Exp</label>
                            <input type="date" value={item.free_expiry_date || ''}
                              onChange={e => {
                                const d = e.target.value
                                if (d) {
                                  const y = parseInt(d.split('-')[0])
                                  if (y >= 2000 && y <= 2100) updateItem(item.key, 'free_expiry_date', d)
                                } else {
                                  updateItem(item.key, 'free_expiry_date', '')
                                }
                              }}
                              className="w-full border border-orange-200 rounded px-1 py-1 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-orange-50 transition-colors"
                              min="2000-01-01" max="2100-12-31" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="px-2 py-2 border-r border-gray-100">
                      <input type="text" value={item.batch_number}
                        onChange={e => updateItem(item.key, 'batch_number', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Batch" />
                    </td>

                    {/* Qty */}
                    <td className="px-2 py-2 border-r border-gray-100">
                      <input type="number" value={item.quantity || ''}
                        onChange={e => updateItem(item.key, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        min="0" />
                    </td>

                    {/* Free */}
                    <td className="px-2 py-2 border-r border-gray-100">
                      <input type="number" value={item.free_quantity || ''}
                        onChange={e => updateItem(item.key, 'free_quantity', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-orange-50 transition-colors"
                        min="0" />
                    </td>

                    {/* GST % */}
                    <td className="px-2 py-2 border-r border-gray-100">
                      <input type="number" value={item.gst_percent || ''}
                        onChange={e => updateItem(item.key, 'gst_percent', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        min="0" max="28" step="0.01" />
                    </td>

                    {/* Disc % */}
                    <td className="px-2 py-2 border-r border-gray-100">
                      <input type="number" value={item.discount_percent || ''}
                        onChange={e => updateItem(item.key, 'discount_percent', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        min="0" max="100" step="0.01" />
                    </td>

                    {/* Total */}
                    <td className="px-3 py-2 text-right font-semibold text-gray-900 text-sm border-r border-gray-100">
                      {fmtNum(item.total_amount)}
                    </td>

                    {/* Single Unit Rate */}
                    <td className="px-3 py-2 text-center text-gray-600 text-sm border-r border-gray-100">
                      {fmtNum(item.single_unit_rate)}
                    </td>

                    {/* Profit % */}
                    <td className="px-3 py-2 text-center border-r border-gray-100">
                      <span className={`text-sm font-medium ${item.profit_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmtNum(item.profit_percent, 1)}%
                      </span>
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => removeItem(item.key)}
                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Grid / Purchased Drugs List ───────────────────────────────────── */}
        {items.some(i => i.medication_id) && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-white">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Purchased Drugs List
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {['Sl', 'Drug Name', 'Pack', 'Rate', 'M.R.P', 'Exp.Date', 'Batch', 'Qty', 'Free', 'GST%', 'Tax', 'Disc%', 'Disc Amt', 'Total Amt', 'Profit%', 'CGST Amt', 'SGST Amt', 'Flag', 'DrugRateId'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.filter(i => i.medication_id).map((item, idx) => (
                    <tr key={item.key} className={`hover:bg-gray-50 ${item.drug_return ? 'bg-red-50/30' : ''}`}>
                      <td className="px-2 py-1.5 text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-1.5 font-medium text-gray-900">{item.medication_name}</td>
                      <td className="px-2 py-1.5 text-center">{item.pack_size}</td>
                      <td className="px-2 py-1.5 text-right">{fmtNum(item.rate)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtNum(item.mrp)}</td>
                      <td className="px-2 py-1.5">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td className="px-2 py-1.5">{item.batch_number || '-'}</td>
                      <td className="px-2 py-1.5 text-center">{item.quantity}</td>
                      <td className="px-2 py-1.5 text-center text-orange-600">{item.free_quantity || 0}</td>
                      <td className="px-2 py-1.5 text-center">{fmtNum(item.gst_percent)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtNum(item.tax_amount)}</td>
                      <td className="px-2 py-1.5 text-center">{fmtNum(item.discount_percent)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtNum(item.disc_amount)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{fmtNum(item.total_amount)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={item.profit_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {fmtNum(item.profit_percent, 1)}%
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">{fmtNum(item.cgst_amount)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtNum(item.sgst_amount)}</td>
                      <td className="px-2 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          item.flag === 'Return' ? 'bg-red-100 text-red-700' :
                          item.flag === 'Free' ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>{item.flag}</span>
                      </td>
                      <td className="px-2 py-1.5 text-gray-400 text-[10px]">{item.drug_rate_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Bottom Summary ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-white">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-600" />
              Bill Summary
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <SummaryField label="Discount %" value={`${fmtNum(summary.discount_percent, 1)}%`} />
              <SummaryField label="Total Discount" value={fmt(summary.total_discount)} color="text-red-600" />
              <SummaryField label="Total GST" value={fmt(summary.total_gst)} color="text-green-600" />
              <SummaryField label="Total Amount" value={fmt(summary.total_amount)} />
              <SummaryField label="Paid Amount" value={fmt(summary.paid_amount)} />
              <SummaryField label="Net Amount" value={fmt(summary.net_amount)} color="text-blue-700" highlight />
            </div>

            {/* Remarks */}
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Remarks</label>
              <textarea value={header.remarks}
                onChange={e => setH('remarks', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                rows={2} placeholder="Notes about this purchase..." />
            </div>
          </div>
        </div>

      </div>

      {/* Portal-based dropdown for drug search */}
      {showDrugDropdown && activeDrugSearchIndex !== null && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-2xl z-[9999] max-h-80 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {filteredDrugs.length === 0 ? (
            <div className="px-4 py-3 text-gray-400 text-sm">No drugs found</div>
          ) : (
            filteredDrugs.map((med, medIdx) => (
              <button
                key={med.id}
                data-index={medIdx}
                onClick={() => selectDrugForLine(activeDrugSearchIndex, med)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 text-sm border-b last:border-0 flex justify-between items-center transition-colors ${
                  medIdx === selectedDrugIndex ? 'bg-blue-100 border-blue-200' : 'border-gray-100'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{med.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {med.generic_name && <span>{med.generic_name}</span>}
                    {med.strength && <span className="ml-2">• {med.strength}</span>}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-xs font-medium text-blue-600">{med.medication_code}</div>
                  {med.available_stock !== undefined && (
                    <div className="text-xs text-gray-400">Stock: {med.available_stock}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── Summary Field Component ─────────────────────────────────────────────────

function SummaryField({ label, value, color, highlight }: {
  label: string; value: string; color?: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border'}`}>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
