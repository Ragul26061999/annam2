'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Plus, Search, Eye, Trash2, XCircle, RotateCcw, Save, Package, Receipt, Calculator, ArrowLeft
} from 'lucide-react'
import {
  getSuppliers,
  getPurchaseReturns,
  getPurchaseReturnById,
  createPurchaseReturn,
  getDrugPurchases,
  getDrugPurchaseById,
  Supplier,
  PurchaseReturn,
  PurchaseReturnItem,
  DrugPurchase
} from '@/src/lib/enhancedPharmacyService'
import { getMedications } from '@/src/lib/pharmacyService'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

const RETURN_REASONS = [
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'excess_stock', label: 'Excess Stock' },
  { value: 'other', label: 'Other' },
]

interface ReturnLineItem {
  key: string
  medication_id: string
  medication_name: string
  batch_number: string
  expiry_date: string
  quantity: number
  available_stock: number
  unit_price: number
  gst_percent: number
  discount_percent: number
  // computed
  gst_amount: number
  disc_amount: number
  total_amount: number
  reason: string
}

const genKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const emptyLine = (): ReturnLineItem => ({
  key: genKey(), medication_id: '', medication_name: '', batch_number: '', expiry_date: '',
  quantity: 0, available_stock: 0, unit_price: 0, gst_percent: 5, discount_percent: 0,
  gst_amount: 0, disc_amount: 0, total_amount: 0, reason: '',
})

function recalcLine(item: ReturnLineItem): ReturnLineItem {
  const sub = item.quantity * item.unit_price
  const disc = sub * (item.discount_percent || 0) / 100
  const taxable = sub - disc
  const gst = taxable * (item.gst_percent || 0) / 100
  return { ...item, disc_amount: disc, gst_amount: gst, total_amount: taxable + gst }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PurchaseReturnPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // List filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    supplier_id: '', purchase_id: '', return_date: new Date().toISOString().split('T')[0],
    reason: 'expired', reason_details: '', remarks: '',
  })
  const [items, setItems] = useState<ReturnLineItem[]>([])

  // Purchase lookup
  const [purchases, setPurchases] = useState<DrugPurchase[]>([])
  const [loadingPurchases, setLoadingPurchases] = useState(false)

  // Drug search
  const [drugSearchTerm, setDrugSearchTerm] = useState('')
  const [activeDrugIdx, setActiveDrugIdx] = useState<number | null>(null)
  const [showDrugDD, setShowDrugDD] = useState(false)
  const [selectedDrugIdx, setSelectedDrugIdx] = useState(0)
  const drugRef = useRef<HTMLDivElement>(null)

  // View detail modal
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    ;(async () => {
      try {
        const [r, s, m] = await Promise.all([
          getPurchaseReturns(), getSuppliers({ status: 'active' }), getMedications()
        ])
        setReturns(r); setSuppliers(s); setMedications(m)
      } catch (e) { console.error('Load error:', e) }
      finally { setLoading(false) }
    })()
  }, [])

  // Close drug dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (drugRef.current && !drugRef.current.contains(e.target as Node)) {
        setShowDrugDD(false); setActiveDrugIdx(null)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Load recent purchases when form is opened
  useEffect(() => {
    if (showForm && purchases.length === 0) {
      loadPurchasesForSupplier('')
    }
  }, [showForm])

  // ─── Load purchases for selected supplier ──────────────────────────────────

  const loadPurchasesForSupplier = async (supplierId: string) => {
    setLoadingPurchases(true)
    try {
      // If no supplier selected, show recent 50 purchases from all suppliers
      const data = supplierId 
        ? await getDrugPurchases({ supplier_id: supplierId })
        : await getDrugPurchases({})
      setPurchases(data.slice(0, 50)) // Limit to 50 most recent
    } catch (e) { console.error(e) }
    finally { setLoadingPurchases(false) }
  }

  const loadItemsFromPurchase = async (purchaseId: string) => {
    if (!purchaseId) return
    try {
      const purchase = await getDrugPurchaseById(purchaseId)
      if (purchase?.items?.length) {
        setItems(purchase.items.map((it: any) => recalcLine({
          ...emptyLine(),
          medication_id: it.medication_id,
          medication_name: it.medication_name || '',
          batch_number: it.batch_number || '',
          expiry_date: it.expiry_date || '',
          quantity: 0,
          available_stock: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || it.purchase_rate || 0),
          gst_percent: Number(it.gst_percent || 0),
        })))
      }
    } catch (e) { console.error(e) }
  }

  // ─── Item helpers ──────────────────────────────────────────────────────────

  const addItem = () => setItems(prev => [...prev, emptyLine()])

  const removeItem = (key: string) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter(i => i.key !== key))
  }

  const updateItem = (key: string, field: keyof ReturnLineItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.key !== key) return item
      const updated = { ...item, [field]: value }
      if (field === 'medication_id') {
        const med = medications.find(m => m.id === value)
        if (med) {
          updated.medication_name = med.name
          updated.unit_price = med.purchase_price || 0
          updated.gst_percent = med.gst_percent || 5
          updated.available_stock = med.available_stock || 0
        }
      }
      return recalcLine(updated)
    }))
  }

  const selectDrugForLine = (index: number, med: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      return recalcLine({
        ...item, medication_id: med.id, medication_name: med.name,
        unit_price: med.purchase_price || 0, gst_percent: med.gst_percent || 5,
        available_stock: med.available_stock || 0,
      })
    }))
    setShowDrugDD(false); setActiveDrugIdx(null); setDrugSearchTerm('')
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    let disc = 0, gst = 0, total = 0, qty = 0
    items.forEach(i => { disc += i.disc_amount; gst += i.gst_amount; total += i.total_amount; qty += i.quantity })
    return { disc, gst, total, qty }
  }, [items])

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formData.supplier_id) { alert('Please select a supplier'); return }
    const validItems = items.filter(i => i.medication_id && i.quantity > 0)
    if (validItems.length === 0) { alert('Add at least one item with quantity > 0'); return }
    const overStock = validItems.find(i => i.available_stock > 0 && i.quantity > i.available_stock)
    if (overStock) {
      alert(`Return qty for "${overStock.medication_name}" (${overStock.quantity}) exceeds available stock (${overStock.available_stock})`)
      return
    }
    const missingBatch = validItems.find(i => !i.batch_number)
    if (missingBatch) { alert('All items must have a Batch Number'); return }

    setSubmitting(true)
    try {
      const returnItems: PurchaseReturnItem[] = validItems.map(i => ({
        medication_id: i.medication_id,
        medication_name: i.medication_name,
        batch_number: i.batch_number,
        expiry_date: i.expiry_date,
        quantity: i.quantity,
        unit_price: i.unit_price,
        gst_percent: i.gst_percent,
        gst_amount: i.gst_amount,
        total_amount: i.total_amount,
        discount_percent: i.discount_percent,
        reason: i.reason || formData.reason,
      } as any))

      await createPurchaseReturn({
        supplier_id: formData.supplier_id,
        purchase_id: formData.purchase_id || undefined,
        return_date: formData.return_date,
        reason: formData.reason as any,
        reason_details: formData.reason_details,
        status: 'submitted',
      }, returnItems)

      alert('Purchase return created! Stock has been reduced.')
      setShowForm(false)
      resetForm()
      // Reload data
      const [r, m] = await Promise.all([getPurchaseReturns(), getMedications()])
      setReturns(r); setMedications(m)
    } catch (e: any) {
      console.error('Submit error:', e)
      alert(`Error: ${e.message}`)
    } finally { setSubmitting(false) }
  }

  const resetForm = () => {
    setFormData({ supplier_id: '', purchase_id: '', return_date: new Date().toISOString().split('T')[0], reason: 'expired', reason_details: '', remarks: '' })
    setItems([]); setPurchases([])
  }

  // ─── View detail ───────────────────────────────────────────────────────────

  const handleViewReturn = async (id: string) => {
    setLoadingDetail(true)
    try {
      const ret = await getPurchaseReturnById(id)
      if (ret) setSelectedReturn(ret)
    } catch (e) { console.error(e) }
    finally { setLoadingDetail(false) }
  }

  // ─── Filtered drugs ────────────────────────────────────────────────────────

  const filteredDrugs = useMemo(() => {
    if (!drugSearchTerm.trim()) return medications.slice(0, 25)
    const t = drugSearchTerm.toLowerCase()
    return medications.filter(m =>
      m.name?.toLowerCase().includes(t) || m.medication_code?.toLowerCase().includes(t) || m.generic_name?.toLowerCase().includes(t)
    ).slice(0, 25)
  }, [drugSearchTerm, medications])

  // ─── Filtered returns list ─────────────────────────────────────────────────

  const filteredReturns = useMemo(() => {
    let list = returns
    if (filterStatus) list = list.filter(r => r.status === filterStatus)
    if (searchTerm) {
      const t = searchTerm.toLowerCase()
      list = list.filter(r =>
        r.return_number?.toLowerCase().includes(t) ||
        (r.supplier as any)?.name?.toLowerCase().includes(t) ||
        r.reason?.toLowerCase().includes(t)
      )
    }
    return list
  }, [returns, filterStatus, searchTerm])

  // ─── Status badge ──────────────────────────────────────────────────────────

  const statusBadge = (status: string) => {
    const s: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700', submitted: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s[status] || s.draft}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
          <p className="text-gray-600">Loading purchase returns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Purchase Return</h1>
              <p className="text-xs text-gray-500">Return drugs to suppliers &amp; update inventory</p>
            </div>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); addItem() }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2 hover:bg-orange-700 text-sm font-medium shadow-sm">
            <RotateCcw className="w-4 h-4" /> New Return
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-5 space-y-5">
        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border p-4 flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search by return #, supplier, reason..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* ── Returns List ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return #</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReturns.map(ret => (
                <tr key={ret.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-orange-600">{ret.return_number}</td>
                  <td className="px-5 py-3 text-sm">{(ret.supplier as any)?.name || 'N/A'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{fmtDate(ret.return_date)}</td>
                  <td className="px-5 py-3 text-sm capitalize">{(ret.reason || '').replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3 text-sm text-right">{(ret as any).total_quantity || '-'}</td>
                  <td className="px-5 py-3 text-sm font-medium text-right">{fmt(ret.total_amount)}</td>
                  <td className="px-5 py-3">{statusBadge(ret.status)}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => handleViewReturn(ret.id)} disabled={loadingDetail}
                      className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReturns.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">No purchase returns found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NEW RETURN FORM MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-xl w-full max-w-[1200px] shadow-2xl mx-4">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">New Purchase Return</h2>
                <p className="text-xs text-gray-500">Return items to supplier — stock will be reduced automatically</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-orange-700 disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4" />{submitting ? 'Saving...' : 'Submit Return'}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* ── Return Info ──────────────────────────────────────────── */}
              <div className="bg-white rounded-lg border">
                <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-white">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-600" /> Return Information
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Supplier */}
                  <div className="col-span-2">
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Supplier *</label>
                    <select value={formData.supplier_id}
                      onChange={e => { setFormData(p => ({ ...p, supplier_id: e.target.value, purchase_id: '' })); loadPurchasesForSupplier(e.target.value) }}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500">
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>)}
                    </select>
                  </div>

                  {/* Purchase Bill (optional) */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Against Purchase Bill</label>
                    <select value={formData.purchase_id}
                      onChange={e => { setFormData(p => ({ ...p, purchase_id: e.target.value })); loadItemsFromPurchase(e.target.value) }}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500"
                      disabled={!formData.supplier_id || loadingPurchases}>
                      <option value="">{loadingPurchases ? 'Loading...' : '-- Optional --'}</option>
                      {purchases.map(p => <option key={p.id} value={p.id}>{p.purchase_number} ({fmtDate(p.purchase_date)})</option>)}
                    </select>
                  </div>

                  {/* Return Date */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Return Date *</label>
                    <input type="date" value={formData.return_date}
                      onChange={e => setFormData(p => ({ ...p, return_date: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500"
                      min="2000-01-01" max="2100-12-31" />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Reason *</label>
                    <select value={formData.reason}
                      onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500">
                      {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>

                  {/* Details */}
                  <div className="col-span-2 lg:col-span-3">
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Details / Remarks</label>
                    <input type="text" value={formData.reason_details}
                      onChange={e => setFormData(p => ({ ...p, reason_details: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500"
                      placeholder="Additional details about the return..." />
                  </div>
                </div>
              </div>

              {/* ── Return Items ─────────────────────────────────────────── */}
              <div className="bg-white rounded-lg border">
                <div className="px-4 py-3 border-b bg-gradient-to-r from-red-50 to-white flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Package className="w-4 h-4 text-red-600" /> Return Items
                  </h3>
                  <button type="button" onClick={addItem}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-green-700">
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 w-8">Sl</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 min-w-[200px]">Drug Name</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-24">Batch</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">Expiry</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-16">Stock</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-16">Ret Qty</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">Rate</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-16">GST%</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-16">Disc%</th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-600 w-24">Total</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 min-w-[100px]">Reason</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, idx) => (
                        <tr key={item.key} className="hover:bg-red-50/20">
                          <td className="px-2 py-1.5 text-center text-gray-500">{idx + 1}</td>

                          {/* Drug Name */}
                          <td className="px-2 py-1.5">
                            <div ref={activeDrugIdx === idx ? drugRef : undefined}>
                              {item.medication_id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium text-gray-900 truncate flex-1">{item.medication_name}</span>
                                  <button type="button" onClick={() => updateItem(item.key, 'medication_id', '')}
                                    className="text-gray-400 hover:text-red-500 shrink-0"><RotateCcw className="w-3 h-3" /></button>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input type="text" value={activeDrugIdx === idx ? drugSearchTerm : ''}
                                    onChange={e => { setDrugSearchTerm(e.target.value); setActiveDrugIdx(idx); setShowDrugDD(true); setSelectedDrugIdx(0) }}
                                    onFocus={() => { setActiveDrugIdx(idx); setShowDrugDD(true); setSelectedDrugIdx(0) }}
                                    onKeyDown={e => {
                                      const drugs = filteredDrugs
                                      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedDrugIdx(p => (p + 1) % drugs.length) }
                                      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedDrugIdx(p => (p - 1 + drugs.length) % drugs.length) }
                                      else if (e.key === 'Enter') { e.preventDefault(); if (drugs[selectedDrugIdx]) selectDrugForLine(idx, drugs[selectedDrugIdx]) }
                                      else if (e.key === 'Escape') { setShowDrugDD(false); setActiveDrugIdx(null) }
                                    }}
                                    placeholder="Search drug..."
                                    className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-500" />
                                  {showDrugDD && activeDrugIdx === idx && (
                                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                      {filteredDrugs.length === 0 ? (
                                        <div className="px-3 py-2 text-gray-400 text-xs">No drugs found</div>
                                      ) : filteredDrugs.map((med, mi) => (
                                        <button key={med.id} type="button" onClick={() => selectDrugForLine(idx, med)}
                                          className={`w-full text-left px-3 py-2 hover:bg-orange-50 text-sm border-b last:border-0 flex justify-between ${mi === selectedDrugIdx ? 'bg-orange-100' : ''}`}>
                                          <span className="font-medium text-gray-900">{med.name}</span>
                                          <span className="text-[10px] text-gray-400">Stk: {med.available_stock || 0}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-1 py-1.5">
                            <input type="text" value={item.batch_number}
                              onChange={e => updateItem(item.key, 'batch_number', e.target.value)}
                              className="w-full border rounded px-1.5 py-1 text-sm focus:ring-2 focus:ring-orange-500" placeholder="Batch" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="date" value={item.expiry_date}
                              onChange={e => updateItem(item.key, 'expiry_date', e.target.value)}
                              className="w-full border rounded px-1 py-1 text-sm focus:ring-2 focus:ring-orange-500" min="2000-01-01" max="2100-12-31" />
                          </td>
                          <td className="px-2 py-1.5 text-center text-sm text-gray-500">{item.available_stock}</td>
                          <td className="px-1 py-1.5">
                            <input type="number" value={item.quantity || ''}
                              onChange={e => updateItem(item.key, 'quantity', parseInt(e.target.value) || 0)}
                              className={`w-full border rounded px-1.5 py-1 text-sm text-center focus:ring-2 focus:ring-orange-500 ${item.available_stock > 0 && item.quantity > item.available_stock ? 'border-red-500 bg-red-50' : ''}`}
                              min="0" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" value={item.unit_price || ''}
                              onChange={e => updateItem(item.key, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full border rounded px-1.5 py-1 text-sm text-right focus:ring-2 focus:ring-orange-500" step="0.01" min="0" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" value={item.gst_percent || ''}
                              onChange={e => updateItem(item.key, 'gst_percent', parseFloat(e.target.value) || 0)}
                              className="w-full border rounded px-1.5 py-1 text-sm text-center focus:ring-2 focus:ring-orange-500" min="0" max="28" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" value={item.discount_percent || ''}
                              onChange={e => updateItem(item.key, 'discount_percent', parseFloat(e.target.value) || 0)}
                              className="w-full border rounded px-1.5 py-1 text-sm text-center focus:ring-2 focus:ring-orange-500" min="0" max="100" />
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold text-sm text-gray-900">{fmt(item.total_amount)}</td>
                          <td className="px-1 py-1.5">
                            <select value={item.reason} onChange={e => updateItem(item.key, 'reason', e.target.value)}
                              className="w-full border rounded px-1 py-1 text-[11px] focus:ring-2 focus:ring-orange-500">
                              <option value="">--</option>
                              {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button type="button" onClick={() => removeItem(item.key)}
                              className="text-red-400 hover:text-red-600 p-0.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Summary ──────────────────────────────────────────────── */}
              <div className="bg-white rounded-lg border">
                <div className="px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-white">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-amber-600" /> Return Summary
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryField label="Total Items" value={String(summary.qty)} />
                  <SummaryField label="Total Discount" value={fmt(summary.disc)} color="text-red-600" />
                  <SummaryField label="Total GST" value={fmt(summary.gst)} color="text-green-600" />
                  <SummaryField label="Net Return Amount" value={fmt(summary.total)} color="text-orange-700" highlight />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW RETURN DETAIL MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Return Details: {selectedReturn.return_number}</h2>
                <p className="text-xs text-gray-500">{statusBadge(selectedReturn.status)}</p>
              </div>
              <button onClick={() => setSelectedReturn(null)}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="p-6 overflow-auto space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Supplier</p>
                  <p className="font-medium text-sm">{(selectedReturn.supplier as any)?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Return Date</p>
                  <p className="font-medium text-sm">{fmtDate(selectedReturn.return_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="font-medium text-sm capitalize">{(selectedReturn.reason || '').replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="font-bold text-lg text-orange-600">{fmt(selectedReturn.total_amount)}</p>
                </div>
              </div>

              {/* Items */}
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">GST%</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedReturn.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.medication_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.batch_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.expiry_date ? fmtDate(item.expiry_date) : '-'}</td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">{fmt(item.unit_price || 0)}</td>
                        <td className="px-4 py-3 text-sm text-right">{item.gst_percent || 0}%</td>
                        <td className="px-4 py-3 text-sm font-medium text-right">{fmt(item.total_amount || 0)}</td>
                        <td className="px-4 py-3 text-sm capitalize text-gray-500">{(item.return_reason || item.reason || '-').replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-right font-medium text-gray-900">Subtotal</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(selectedReturn.subtotal || 0)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-right font-medium text-gray-900">Total GST</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(selectedReturn.gst_amount || 0)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-orange-50">
                      <td colSpan={6} className="px-4 py-3 text-right font-bold text-gray-900 text-lg">Grand Total</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600 text-lg">{fmt(selectedReturn.total_amount)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Remarks */}
              {(selectedReturn as any).remarks && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800">Remarks</p>
                  <p className="text-sm text-yellow-900 mt-1">{(selectedReturn as any).remarks}</p>
                </div>
              )}
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 bg-white border rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryField({ label, value, color, highlight }: { label: string; value: string; color?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-orange-50 border-2 border-orange-200' : 'bg-gray-50 border'}`}>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
