'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Plus, Trash2, Search, Package,
  Receipt, Calculator, RotateCcw, X
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

// Generate a short simple batch number (fallback) 6-char base36
const generateShortBatch = () => {
  const base = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Ensure at least 6 characters; slice will cap length
  const six = (base + base).slice(0, 6)
  return six
}

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

// ─── Shared input style ─────────────────────────────────────────────────────

const inputBase = 'w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[13px] bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all'
const inputReadonly = 'w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-[13px] bg-gray-50 text-gray-600 cursor-not-allowed'
const labelBase = 'block text-[11px] font-medium text-gray-500 mb-0.5 uppercase tracking-wider'

// ─── Component ───────────────────────────────────────────────────────────────

export default function EnhancedPurchaseEntryPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)

  // Drug search
  const [drugSearchTerm, setDrugSearchTerm] = useState('')
  const [activeDrugSearchIndex, setActiveDrugSearchIndex] = useState<number | null>(null)
  const [showDrugDropdown, setShowDrugDropdown] = useState(false)
  const [selectedDrugIndex, setSelectedDrugIndex] = useState(0)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const drugSearchRef = useRef<HTMLDivElement>(null)
  const drugInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-hide sidebar on mount
  useEffect(() => {
    const sidebar = document.querySelector('[class*="sidebar"]') || document.querySelector('aside') || document.querySelector('nav[class*="side"]')
    if (sidebar && sidebar instanceof HTMLElement) {
      sidebar.style.display = 'none'
    }

    // Restore sidebar on unmount
    return () => {
      if (sidebar && sidebar instanceof HTMLElement) {
        sidebar.style.display = ''
      }
    }
  }, [])

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
      // Check if click is outside any drug input AND outside the dropdown
      const clickedOutsideAllInputs = Object.values(drugInputRefs.current).every(
        ref => !ref || !ref.contains(e.target as Node)
      )
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(e.target as Node)

      if (clickedOutsideAllInputs && clickedOutsideDropdown) {
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
    setShowSearch(false)
  }

  // ─── Item helpers ──────────────────────────────────────────────────────────

  const addItem = () => setItems(prev => [...prev, emptyLine()])

  const removeItem = (key: string) => {
    if (items.length <= 1) {
      setItems([emptyLine()])
      return
    }
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
            disc_amount: header.disc_amt,
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  const validItemCount = items.filter(i => i.medication_id).length

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-gray-900">New Purchase Entry</h1>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                {header.purchase_no}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Load Bill
            </button>
            <button onClick={() => router.back()} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50 text-xs font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Inline summary bar */}
        <div className="px-4 py-1.5 bg-slate-50 border-t border-gray-100 flex items-center gap-6 text-xs overflow-x-auto">
          <span className="text-gray-500">Items: <strong className="text-gray-900">{validItemCount}</strong></span>
          <span className="text-gray-500">Disc: <strong className="text-red-600">{fmt(summary.total_discount)}</strong></span>
          <span className="text-gray-500">GST: <strong className="text-green-700">{fmt(summary.total_gst)}</strong></span>
          <span className="text-gray-500">Total: <strong className="text-gray-900">{fmt(summary.total_amount)}</strong></span>
          <span className="ml-auto text-gray-500">Net: <strong className="text-blue-700 text-sm">{fmt(summary.net_amount)}</strong></span>
        </div>
      </div>

      {/* ── Search Existing Bill (collapsible) ────────────────────────────── */}
      {showSearch && (
        <div className="mx-4 mt-3 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-3 flex items-center gap-2">
            <input
              type="text"
              value={header.search_bill_no}
              onChange={e => setH('search_bill_no', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchBill()}
              placeholder="Search by Bill No / Purchase No..."
              className={inputBase + ' flex-1'}
              autoFocus
            />
            <button
              onClick={handleSearchBill}
              disabled={searching}
              className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-900 disabled:opacity-50 whitespace-nowrap"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
            <button onClick={() => { setShowSearch(false); setSearchResults([]) }} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="border-t border-gray-100">
              {searchResults.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => loadSearchResult(r)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-50 text-xs border-b last:border-0 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-blue-600">{r.purchase_number}</span>
                    <span className="text-gray-600">{r.supplier?.name || 'N/A'}</span>
                    <span className="text-gray-400">{r.invoice_number || '-'}</span>
                  </div>
                  <span className="font-medium text-gray-900">{fmt(r.total_amount || 0)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3 space-y-3">

        {/* ── Bill Header ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-gray-700">Bill Information</span>
          </div>
          <div className="p-3">
            {/* Row 1: Supplier + Bill No + Dates */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              {/* Supplier - wider */}
              <div className="col-span-4">
                <label className={labelBase}>Supplier *</label>
                <select
                  value={header.supplier_id}
                  onChange={e => {
                    const s = suppliers.find(s => s.id === e.target.value)
                    setHeader(prev => ({ ...prev, supplier_id: e.target.value, supplier_name: s?.name || '' }))
                  }}
                  className={inputBase}
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className={labelBase}>Bill No</label>
                <input type="text" value={header.bill_no}
                  onChange={e => setH('bill_no', e.target.value)}
                  placeholder="049236"
                  className={inputBase} />
              </div>

              <div className="col-span-2">
                <label className={labelBase}>Bill Date</label>
                <input type="date" value={header.bill_date}
                  onChange={e => setH('bill_date', e.target.value)}
                  className={inputBase}
                  min="2000-01-01" max="2100-12-31" />
              </div>

              <div className="col-span-2">
                <label className={labelBase}>Received Date</label>
                <input type="date" value={header.received_date}
                  onChange={e => setH('received_date', e.target.value)}
                  className={inputBase}
                  min="2000-01-01" max="2100-12-31" />
              </div>

              <div className="col-span-2">
                <label className={labelBase}>Payment</label>
                <select value={header.payment_mode}
                  onChange={e => setH('payment_mode', e.target.value)}
                  className={inputBase}>
                  <option value="CASH">CASH</option>
                  <option value="CREDIT">CREDIT</option>
                </select>
              </div>
            </div>

            {/* Row 2: Computed totals + extras */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <label className={labelBase}>Purchase Ac</label>
                <input type="text" value={header.purchase_account}
                  onChange={e => setH('purchase_account', e.target.value)}
                  className={inputBase} />
              </div>

              <div className="col-span-2">
                <label className={labelBase}>GRN No</label>
                <input type="text" value={header.grn_no}
                  onChange={e => setH('grn_no', e.target.value)}
                  className={inputBase}
                  placeholder="GRN-001" />
              </div>

              <div className="col-span-2">
                <label className={labelBase}>Bill Amount</label>
                <input type="text" value={header.bill_amount ? fmtNum(header.bill_amount) : '0.00'}
                  readOnly className={inputReadonly + ' text-right font-medium text-blue-700'} />
              </div>

              <div className="col-span-2">
                <label className={labelBase}>GST Amount</label>
                <input type="text" value={summary.total_gst ? fmtNum(summary.total_gst) : '0.00'}
                  readOnly className={inputReadonly + ' text-right font-medium text-green-700'} />
              </div>

              <div className="col-span-2">
                <label className={labelBase}>Discount</label>
                <input type="text" value={header.disc_amt ? fmtNum(header.disc_amt) : '0.00'}
                  readOnly className={inputReadonly + ' text-right font-medium text-orange-600'} />
              </div>

              <div className="col-span-2">
                <label className={labelBase}>Remarks</label>
                <input type="text" value={header.remarks}
                  onChange={e => setH('remarks', e.target.value)}
                  className={inputBase}
                  placeholder="Notes..." />
              </div>
            </div>
          </div>
        </div>

        {/* ── Drug Entry Table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-gray-700">Drug Entry</span>
              <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5">{items.length} rows</span>
            </div>
            <button onClick={addItem}
              className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-medium flex items-center gap-1 hover:bg-emerald-700 transition-colors">
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          <div className="overflow-hidden">
            {/* Legend */}
            <div className="px-3 py-1.5 bg-slate-50 border-b border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
              <span><span className="font-semibold text-gray-500">RATE / MRP</span> = Pack price</span>
              <span className="text-gray-300">|</span>
              <span><span className="font-semibold text-blue-500">U.RATE / U.MRP</span> = Per unit (÷ pack size)</span>
              <span className="text-gray-300">|</span>
              <span><span className="font-semibold text-orange-500">FREE</span> = Free units from supplier</span>
            </div>
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '26px' }} />   {/* # */}
                <col style={{ width: '18%' }} />     {/* Drug Name */}
                <col style={{ width: '44px' }} />    {/* Pack */}
                <col style={{ width: '64px' }} />    {/* Rate */}
                <col style={{ width: '60px' }} />    {/* U.Rate */}
                <col style={{ width: '64px' }} />    {/* MRP */}
                <col style={{ width: '58px' }} />    {/* U.MRP */}
                <col style={{ width: '50px' }} />    {/* Qty */}
                <col style={{ width: '44px' }} />    {/* Free */}
                <col style={{ width: '92px' }} />    {/* Batch */}
                <col style={{ width: '106px' }} />   {/* Expiry */}
                <col style={{ width: '44px' }} />    {/* GST% */}
                <col style={{ width: '44px' }} />    {/* Disc% */}
                <col style={{ width: '68px' }} />    {/* Total */}
                <col style={{ width: '50px' }} />    {/* Profit */}
                <col style={{ width: '26px' }} />    {/* Del */}
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-center">#</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 text-left">DRUG NAME</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-center">PACK</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-right">RATE</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-blue-400 text-right">U.RATE</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-right">MRP</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-blue-400 text-right">U.MRP</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-center">QTY</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-orange-400 text-center">FREE</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-center">BATCH</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-center">EXPIRY</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-center">GST%</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-center">DISC%</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-right">TOTAL</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-center">P%</th>
                  <th className="px-1 py-2 text-[10px] font-semibold text-gray-500 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.key} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${item.drug_return ? 'bg-red-50/40' : ''}`}>
                    {/* # */}
                    <td className="px-1 py-1.5 text-center text-[11px] text-gray-400">{idx + 1}</td>

                    {/* Drug Name */}
                    <td className="px-1 py-1">
                      <div ref={activeDrugSearchIndex === idx ? drugSearchRef : undefined}>
                        {item.medication_id ? (
                          <div className="flex items-center gap-1 min-h-[28px]">
                            <span className="text-[12px] font-medium text-gray-900 truncate flex-1 leading-tight">{item.medication_name}</span>
                            <button onClick={() => updateItem(item.key, 'medication_id', '')}
                              className="text-gray-300 hover:text-red-500 shrink-0 p-0.5 rounded transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <input
                            ref={(el) => { drugInputRefs.current[item.key] = el }}
                            type="text"
                            value={activeDrugSearchIndex === idx ? drugSearchTerm : ''}
                            onChange={e => {
                              setDrugSearchTerm(e.target.value)
                              setActiveDrugSearchIndex(idx)
                              setShowDrugDropdown(true)
                              setSelectedDrugIndex(0)
                              const input = drugInputRefs.current[item.key]
                              if (input) {
                                const rect = input.getBoundingClientRect()
                                setDropdownPosition({
                                  top: rect.bottom + window.scrollY + 2,
                                  left: rect.left + window.scrollX,
                                  width: Math.max(rect.width, 320)
                                })
                              }
                            }}
                            onFocus={() => {
                              setActiveDrugSearchIndex(idx)
                              setShowDrugDropdown(true)
                              setSelectedDrugIndex(0)
                              const input = drugInputRefs.current[item.key]
                              if (input) {
                                const rect = input.getBoundingClientRect()
                                setDropdownPosition({
                                  top: rect.bottom + window.scrollY + 2,
                                  left: rect.left + window.scrollX,
                                  width: Math.max(rect.width, 320)
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
                            placeholder="Search drug..."
                            className="w-full border border-gray-200 rounded px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 placeholder-gray-400"
                          />
                        )}
                      </div>
                    </td>

                    {/* Pack Size */}
                    <td className="px-0.5 py-1">
                      <input type="number" value={item.pack_size || ''}
                        onChange={e => updateItem(item.key, 'pack_size', parseInt(e.target.value) || 1)}
                        className="w-full border border-gray-200 rounded px-1 py-1 text-[12px] text-center focus:ring-1 focus:ring-blue-500 outline-none"
                        min="1" />
                    </td>

                    {/* Rate */}
                    <td className="px-0.5 py-1">
                      <input type="number" value={item.rate || ''}
                        onChange={e => updateItem(item.key, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-[12px] text-right focus:ring-1 focus:ring-blue-500 outline-none"
                        step="0.01" min="0" />
                    </td>

                    {/* Unit Rate (computed) */}
                    <td className="px-1 py-1.5 text-right bg-blue-50/40">
                      <span className="text-[11px] font-medium text-blue-600">{fmtNum(item.single_unit_rate)}</span>
                    </td>

                    {/* MRP */}
                    <td className="px-0.5 py-1">
                      <input type="number" value={item.mrp || ''}
                        onChange={e => updateItem(item.key, 'mrp', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-[12px] text-right focus:ring-1 focus:ring-blue-500 outline-none"
                        step="0.01" min="0" />
                    </td>

                    {/* Unit MRP (computed) */}
                    <td className="px-1 py-1.5 text-right bg-blue-50/40">
                      <span className="text-[11px] font-medium text-blue-600">{fmtNum((item.mrp || 0) / (item.pack_size || 1))}</span>
                    </td>

                    {/* Qty */}
                    <td className="px-0.5 py-1">
                      <input type="number" value={item.quantity || ''}
                        onChange={e => updateItem(item.key, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded px-1 py-1 text-[12px] text-center font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                        min="0" placeholder="0" />
                    </td>

                    {/* Free */}
                    <td className="px-0.5 py-1">
                      <input type="number" value={item.free_quantity || ''}
                        onChange={e => updateItem(item.key, 'free_quantity', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded px-1 py-1 text-[12px] text-center focus:ring-1 focus:ring-blue-500 outline-none bg-orange-50/50"
                        min="0" placeholder="0" />
                    </td>

                    {/* Batch */}
                    <td className="px-0.5 py-1">
                      <div className="relative">
                        <input type="text" value={item.batch_number}
                          onChange={e => updateItem(item.key, 'batch_number', e.target.value.toUpperCase())}
                          className="w-full border border-gray-200 rounded px-1.5 py-1 text-[11px] font-mono uppercase focus:ring-1 focus:ring-blue-500 outline-none pr-5"
                          placeholder="BATCH"
                          maxLength={20} />
                        <button type="button"
                          onClick={() => updateItem(item.key, 'batch_number', generateShortBatch())}
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-blue-500 rounded"
                          title="Generate">
                          <RotateCcw className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </td>

                    {/* Expiry */}
                    <td className="px-0.5 py-1">
                      <input type="date" value={item.expiry_date || ''}
                        onChange={e => updateItem(item.key, 'expiry_date', e.target.value)}
                        className="w-full border border-gray-200 rounded px-1 py-1 text-[11px] focus:ring-1 focus:ring-blue-500 outline-none"
                        min="2000-01-01" max="2100-12-31" />
                    </td>

                    {/* GST% */}
                    <td className="px-0.5 py-1">
                      <input type="number" value={item.gst_percent || ''}
                        onChange={e => updateItem(item.key, 'gst_percent', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded px-1 py-1 text-[12px] text-center focus:ring-1 focus:ring-blue-500 outline-none"
                        min="0" max="28" step="0.01" />
                    </td>

                    {/* Disc% */}
                    <td className="px-0.5 py-1">
                      <input type="number" value={item.discount_percent || ''}
                        onChange={e => updateItem(item.key, 'discount_percent', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded px-1 py-1 text-[12px] text-center focus:ring-1 focus:ring-blue-500 outline-none"
                        min="0" max="100" step="0.01" />
                    </td>

                    {/* Total */}
                    <td className="px-1 py-1.5 text-right">
                      <span className="text-[12px] font-semibold text-gray-900">{fmtNum(item.total_amount)}</span>
                    </td>

                    {/* Profit% */}
                    <td className="px-1 py-1.5 text-center">
                      <span className={`text-[11px] font-medium ${item.profit_percent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmtNum(item.profit_percent, 1)}%
                      </span>
                    </td>

                    {/* Delete */}
                    <td className="px-0.5 py-1.5 text-center">
                      <button onClick={() => removeItem(item.key)}
                        className="text-gray-300 hover:text-red-500 p-0.5 rounded transition-colors"
                        title="Remove">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Free quantity details row - show below table when any item has free qty */}
            {items.some(i => i.free_quantity > 0) && (
              <div className="border-t border-orange-100 bg-orange-50/30 px-3 py-2">
                <p className="text-[10px] font-semibold text-orange-600 mb-1.5 uppercase tracking-wider">Free Qty Details</p>
                <div className="grid grid-cols-3 gap-2">
                  {items.filter(i => i.free_quantity > 0).map(item => (
                    <div key={item.key} className="flex items-center gap-2 text-[11px]">
                      <span className="text-gray-700 font-medium truncate">{item.medication_name}</span>
                      <span className="text-orange-600">Free: {item.free_quantity}</span>
                      <div className="flex items-center gap-1">
                        <input type="number" value={item.free_mrp || ''}
                          onChange={e => updateItem(item.key, 'free_mrp', parseFloat(e.target.value) || 0)}
                          className="w-16 border border-orange-200 rounded px-1 py-0.5 text-[11px] text-right bg-white focus:ring-1 focus:ring-orange-400 outline-none"
                          placeholder="F.MRP" step="0.01" min="0" />
                        <input type="date" value={item.free_expiry_date || ''}
                          onChange={e => updateItem(item.key, 'free_expiry_date', e.target.value)}
                          className="border border-orange-200 rounded px-1 py-0.5 text-[11px] bg-white focus:ring-1 focus:ring-orange-400 outline-none"
                          min="2000-01-01" max="2100-12-31" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Summary ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-gray-700">Bill Summary</span>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <SummaryCard label="Discount %" value={`${fmtNum(summary.discount_percent, 1)}%`} />
              <SummaryCard label="Total Discount" value={fmt(summary.total_discount)} valueColor="text-red-600" />
              <SummaryCard label="CGST" value={fmt(summary.total_cgst)} valueColor="text-green-700" />
              <SummaryCard label="SGST" value={fmt(summary.total_sgst)} valueColor="text-green-700" />
              <SummaryCard label="Total GST" value={fmt(summary.total_gst)} valueColor="text-green-700" />
              <SummaryCard label="Net Amount" value={fmt(summary.net_amount)} valueColor="text-blue-700" highlight />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Action Bar ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] z-30">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">{validItemCount} item{validItemCount !== 1 ? 's' : ''}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">GST: <strong className="text-green-700">{fmt(summary.total_gst)}</strong></span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">Disc: <strong className="text-red-600">{fmt(summary.total_discount)}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">Net: <span className="text-blue-700">{fmt(summary.net_amount)}</span></span>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </div>
      </div>

      {/* Portal-based dropdown for drug search */}
      {showDrugDropdown && activeDrugSearchIndex !== null && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-72 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {filteredDrugs.length === 0 ? (
            <div className="px-3 py-2 text-gray-400 text-xs">No drugs found</div>
          ) : (
            filteredDrugs.map((med, medIdx) => (
              <button
                key={med.id}
                data-index={medIdx}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  selectDrugForLine(activeDrugSearchIndex, med)
                  setShowDrugDropdown(false)
                  setActiveDrugSearchIndex(null)
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                }}
                className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-xs border-b last:border-0 flex justify-between items-center transition-colors ${
                  medIdx === selectedDrugIndex ? 'bg-blue-50 border-blue-100' : 'border-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{med.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {med.generic_name && <span>{med.generic_name}</span>}
                    {med.strength && <span className="ml-1">- {med.strength}</span>}
                  </div>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <div className="text-[10px] font-medium text-blue-600">{med.medication_code}</div>
                  {med.available_stock !== undefined && (
                    <div className="text-[10px] text-gray-400">Stk: {med.available_stock}</div>
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

// ─── Summary Card Component ──────────────────────────────────────────────────

function SummaryCard({ label, value, valueColor, highlight }: {
  label: string; value: string; valueColor?: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-md px-2.5 py-2 ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-100'}`}>
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${valueColor || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
