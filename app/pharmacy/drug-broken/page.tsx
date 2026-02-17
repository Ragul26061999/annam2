'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Plus, Search, Eye, Trash2, XCircle, AlertTriangle, Save, Package, Calculator, RotateCcw, ArrowLeft
} from 'lucide-react'
import {
  getDrugBrokenRecords,
  getDrugBrokenRecordById,
  createDrugBrokenRecord,
  DrugBrokenRecord
} from '@/src/lib/enhancedPharmacyService'
import { getMedications } from '@/src/lib/pharmacyService'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

const DAMAGE_TYPES = [
  { value: 'broken', label: 'Broken', color: 'bg-red-100 text-red-700' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-700' },
  { value: 'damaged', label: 'Damaged', color: 'bg-orange-100 text-orange-700' },
  { value: 'lost', label: 'Lost', color: 'bg-blue-100 text-blue-700' },
  { value: 'theft', label: 'Theft', color: 'bg-purple-100 text-purple-700' },
  { value: 'other', label: 'Other', color: 'bg-yellow-100 text-yellow-700' },
]


export default function DrugBrokenPage() {
  const [records, setRecords] = useState<DrugBrokenRecord[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Form
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    medication_id: '', medication_name: '', batch_number: '', expiry_date: '',
    quantity: 0, available_stock: 0, unit_price: 0,
    damage_type: 'damaged', damage_description: '', location: '',
    discoverer_name: '', remarks: '',
    record_date: new Date().toISOString().split('T')[0],
  })

  // Drug search
  const [drugSearch, setDrugSearch] = useState('')
  const [showDrugDD, setShowDrugDD] = useState(false)
  const [selectedDrugIdx, setSelectedDrugIdx] = useState(0)
  const drugRef = useRef<HTMLDivElement>(null)

  // Batch lookup
  const [batches, setBatches] = useState<any[]>([])

  // View detail
  const [selectedRecord, setSelectedRecord] = useState<DrugBrokenRecord | null>(null)

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    ;(async () => {
      try {
        const [r, m] = await Promise.all([getDrugBrokenRecords(), getMedications()])
        setRecords(r); setMedications(m)
      } catch (e) { console.error('Load error:', e) }
      finally { setLoading(false) }
    })()
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (drugRef.current && !drugRef.current.contains(e.target as Node)) setShowDrugDD(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ─── Drug search ──────────────────────────────────────────────────────────

  const filteredDrugs = useMemo(() => {
    if (!drugSearch.trim()) return medications.slice(0, 25)
    const t = drugSearch.toLowerCase()
    return medications.filter(m =>
      m.name?.toLowerCase().includes(t) || m.medication_code?.toLowerCase().includes(t) || m.generic_name?.toLowerCase().includes(t)
    ).slice(0, 25)
  }, [drugSearch, medications])

  const selectDrug = async (med: any) => {
    setFormData(p => ({
      ...p, medication_id: med.id, medication_name: med.name,
      unit_price: med.purchase_price || med.selling_price || 0,
      available_stock: med.available_stock || 0,
      batch_number: '', expiry_date: '',
    }))
    setShowDrugDD(false); setDrugSearch('')

    // Load batches for this medication
    const { supabase } = await import('@/src/lib/supabase')
    const { data } = await supabase
      .from('medicine_batches')
      .select('batch_number, current_quantity, expiry_date, purchase_price')
      .eq('medicine_id', med.id)
      .eq('status', 'active')
      .gt('current_quantity', 0)
      .order('expiry_date', { ascending: true })
    setBatches(data || [])
  }

  const selectBatch = (batch: any) => {
    setFormData(p => ({
      ...p, batch_number: batch.batch_number,
      expiry_date: batch.expiry_date || '',
      available_stock: batch.current_quantity || 0,
      unit_price: batch.purchase_price || p.unit_price,
    }))
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formData.medication_id) { alert('Please select a medicine'); return }
    if (!formData.batch_number) { alert('Please select or enter a batch number'); return }
    if (formData.quantity <= 0) { alert('Quantity must be greater than 0'); return }
    if (formData.available_stock > 0 && formData.quantity > formData.available_stock) {
      alert(`Damaged qty (${formData.quantity}) exceeds available stock (${formData.available_stock})`)
      return
    }

    setSubmitting(true)
    try {
      await createDrugBrokenRecord({
        medication_id: formData.medication_id,
        medication_name: formData.medication_name,
        batch_number: formData.batch_number,
        expiry_date: formData.expiry_date || undefined,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        damage_type: formData.damage_type as any,
        damage_description: formData.damage_description,
        location: formData.location,
        discoverer_name: formData.discoverer_name,
        record_date: formData.record_date,
        remarks: formData.remarks,
        status: 'reported',
      })

      alert('Drug damage reported! Stock has been reduced.')
      setShowForm(false)
      resetForm()
      const [r, m] = await Promise.all([getDrugBrokenRecords(), getMedications()])
      setRecords(r); setMedications(m)
    } catch (e: any) {
      console.error('Submit error:', e)
      alert(`Error: ${e.message}`)
    } finally { setSubmitting(false) }
  }

  const resetForm = () => {
    setFormData({
      medication_id: '', medication_name: '', batch_number: '', expiry_date: '',
      quantity: 0, available_stock: 0, unit_price: 0,
      damage_type: 'damaged', damage_description: '', location: '',
      discoverer_name: '', remarks: '',
      record_date: new Date().toISOString().split('T')[0],
    })
    setBatches([])
  }

  // ─── View detail ───────────────────────────────────────────────────────────

  const handleView = async (id: string) => {
    try {
      const r = await getDrugBrokenRecordById(id)
      if (r) setSelectedRecord(r)
    } catch (e) { console.error(e) }
  }

  // ─── Filtered list ─────────────────────────────────────────────────────────

  const filteredRecords = useMemo(() => {
    let list = records
    if (filterType) list = list.filter(r => r.damage_type === filterType)
    if (filterStatus) list = list.filter(r => r.status === filterStatus)
    if (searchTerm) {
      const t = searchTerm.toLowerCase()
      list = list.filter(r =>
        r.record_number?.toLowerCase().includes(t) ||
        r.medication_name?.toLowerCase().includes(t) ||
        r.batch_number?.toLowerCase().includes(t)
      )
    }
    return list
  }, [records, filterType, filterStatus, searchTerm])

  // ─── Summary stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalQty = records.reduce((s, r) => s + (r.quantity || 0), 0)
    const thisMonth = records.filter(r => {
      const d = new Date(r.record_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    return { totalQty, thisMonth }
  }, [records])

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const statusBadge = (status: string) => {
    const s: Record<string, string> = {
      reported: 'bg-yellow-100 text-yellow-800', verified: 'bg-blue-100 text-blue-800',
      disposed: 'bg-green-100 text-green-800', claimed: 'bg-purple-100 text-purple-800',
    }
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s[status] || s.reported}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  const damageBadge = (type: string) => {
    const dt = DAMAGE_TYPES.find(d => d.value === type)
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dt?.color || 'bg-gray-100 text-gray-700'}`}>{dt?.label || type}</span>
  }

  
  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
          <p className="text-gray-600">Loading drug breakage records...</p>
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
              <h1 className="text-xl font-bold text-gray-900">Drug Broken / Damaged</h1>
              <p className="text-xs text-gray-500">Track damaged, broken, or expired drugs &amp; update inventory</p>
            </div>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg flex items-center gap-2 hover:bg-amber-700 text-sm font-medium shadow-sm">
            <AlertTriangle className="w-4 h-4" /> Report Damage
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-5 space-y-5">
        {/* ── Summary Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">Total Records</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{records.length}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalQty} units damaged</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">This Month</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.thisMonth}</p>
            <p className="text-xs text-gray-400 mt-1">Records this month</p>
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border p-4 flex gap-3 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search by record #, medicine, batch..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500">
            <option value="">All Types</option>
            {DAMAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500">
            <option value="">All Status</option>
            <option value="reported">Reported</option>
            <option value="verified">Verified</option>
            <option value="disposed">Disposed</option>
            <option value="claimed">Claimed</option>
          </select>
        </div>

        {/* ── Records Table ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record #</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.map(rec => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-amber-600">{rec.record_number}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{fmtDate(rec.record_date)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{rec.medication_name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{rec.batch_number}</td>
                  <td className="px-5 py-3">{damageBadge(rec.damage_type)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-right">{rec.quantity}</td>
                  <td className="px-5 py-3">{statusBadge(rec.status)}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => handleView(rec.id)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">No drug breakage records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          REPORT DAMAGE FORM MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-xl w-full max-w-[900px] shadow-2xl mx-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Report Drug Damage</h2>
                <p className="text-xs text-gray-500">Stock will be reduced automatically upon submission</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-amber-700 disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4" />{submitting ? 'Saving...' : 'Submit Report'}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* ── Drug Selection ─────────────────────────────────────────── */}
              <div className="bg-white rounded-lg border">
                <div className="px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-white">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" /> Drug &amp; Batch Information
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Drug Search */}
                  <div className="col-span-2" ref={drugRef}>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Medicine *</label>
                    {formData.medication_id ? (
                      <div className="flex items-center gap-2 border rounded px-3 py-1.5 bg-amber-50">
                        <span className="text-sm font-medium text-gray-900 flex-1">{formData.medication_name}</span>
                        <span className="text-xs text-gray-400">Stock: {formData.available_stock}</span>
                        <button type="button" onClick={() => { setFormData(p => ({ ...p, medication_id: '', medication_name: '', batch_number: '', expiry_date: '', available_stock: 0 })); setBatches([]) }}
                          className="text-gray-400 hover:text-red-500"><RotateCcw className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input type="text" value={drugSearch}
                          onChange={e => { setDrugSearch(e.target.value); setShowDrugDD(true); setSelectedDrugIdx(0) }}
                          onFocus={() => { setShowDrugDD(true); setSelectedDrugIdx(0) }}
                          onKeyDown={e => {
                            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedDrugIdx(p => (p + 1) % filteredDrugs.length) }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedDrugIdx(p => (p - 1 + filteredDrugs.length) % filteredDrugs.length) }
                            else if (e.key === 'Enter') { e.preventDefault(); if (filteredDrugs[selectedDrugIdx]) selectDrug(filteredDrugs[selectedDrugIdx]) }
                            else if (e.key === 'Escape') setShowDrugDD(false)
                          }}
                          placeholder="Search medicine..."
                          className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500" />
                        {showDrugDD && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                            {filteredDrugs.length === 0 ? (
                              <div className="px-3 py-2 text-gray-400 text-xs">No medicines found</div>
                            ) : filteredDrugs.map((med, mi) => (
                              <button key={med.id} type="button" onClick={() => selectDrug(med)}
                                className={`w-full text-left px-3 py-2 hover:bg-amber-50 text-sm border-b last:border-0 flex justify-between ${mi === selectedDrugIdx ? 'bg-amber-100' : ''}`}>
                                <span className="font-medium text-gray-900">{med.name}</span>
                                <span className="text-[10px] text-gray-400">Stk: {med.available_stock || 0}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Batch */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Batch Number *</label>
                    {batches.length > 0 ? (
                      <select value={formData.batch_number} onChange={e => {
                        const b = batches.find((bt: any) => bt.batch_number === e.target.value)
                        if (b) selectBatch(b); else setFormData(p => ({ ...p, batch_number: e.target.value }))
                      }} className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500">
                        <option value="">-- Select Batch --</option>
                        {batches.map((b: any) => (
                          <option key={b.batch_number} value={b.batch_number}>
                            {b.batch_number} (Qty: {b.current_quantity}, Exp: {b.expiry_date ? fmtDate(b.expiry_date) : 'N/A'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={formData.batch_number}
                        onChange={e => setFormData(p => ({ ...p, batch_number: e.target.value }))}
                        className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500" placeholder="Enter batch" />
                    )}
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Expiry Date</label>
                    <input type="date" value={formData.expiry_date}
                      onChange={e => setFormData(p => ({ ...p, expiry_date: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 bg-gray-50" readOnly={!!formData.expiry_date && batches.length > 0} />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Damaged Quantity *</label>
                    <input type="number" value={formData.quantity || ''}
                      onChange={e => setFormData(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
                      className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 ${formData.available_stock > 0 && formData.quantity > formData.available_stock ? 'border-red-500 bg-red-50' : ''}`}
                      min="1" />
                    {formData.available_stock > 0 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Available: {formData.available_stock}</p>
                    )}
                  </div>

                  {/* Discovered Date */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Discovered Date *</label>
                    <input type="date" value={formData.record_date}
                      onChange={e => setFormData(p => ({ ...p, record_date: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
              </div>

              {/* ── Damage Details ─────────────────────────────────────────── */}
              <div className="bg-white rounded-lg border">
                <div className="px-4 py-3 border-b bg-gradient-to-r from-red-50 to-white">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> Damage Details
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Damage Type *</label>
                    <select value={formData.damage_type}
                      onChange={e => setFormData(p => ({ ...p, damage_type: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500">
                      {DAMAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Location</label>
                    <input type="text" value={formData.location}
                      onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500" placeholder="Storage location" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Discovered By</label>
                    <input type="text" value={formData.discoverer_name}
                      onChange={e => setFormData(p => ({ ...p, discoverer_name: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500" placeholder="Name" />
                  </div>
                                    <div className="col-span-2">
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Damage Description</label>
                    <textarea value={formData.damage_description}
                      onChange={e => setFormData(p => ({ ...p, damage_description: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500" rows={2}
                      placeholder="Describe how the damage occurred..." />
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Remarks</label>
                    <input type="text" value={formData.remarks}
                      onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500" placeholder="Additional notes..." />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW DETAIL MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Damage Report: {selectedRecord.record_number}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{statusBadge(selectedRecord.status)}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="p-6 overflow-auto space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Medicine</p>
                  <p className="font-medium text-sm">{selectedRecord.medication_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Batch</p>
                  <p className="font-medium text-sm">{selectedRecord.batch_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Expiry</p>
                  <p className="font-medium text-sm">{selectedRecord.expiry_date ? fmtDate(selectedRecord.expiry_date) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Discovered Date</p>
                  <p className="font-medium text-sm">{fmtDate(selectedRecord.record_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Damage Type</p>
                  <div className="mt-0.5">{damageBadge(selectedRecord.damage_type)}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Quantity Damaged</p>
                  <p className="font-bold text-lg text-red-600">{selectedRecord.quantity}</p>
                </div>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm">{selectedRecord.location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Discovered By</p>
                  <p className="text-sm">{selectedRecord.discoverer_name || 'N/A'}</p>
                </div>
                                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="mt-0.5">{statusBadge(selectedRecord.status)}</div>
                </div>
              </div>

              {selectedRecord.damage_description && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800">Damage Description</p>
                  <p className="text-sm text-yellow-900 mt-1">{selectedRecord.damage_description}</p>
                </div>
              )}

              {selectedRecord.remarks && (
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500">Remarks</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedRecord.remarks}</p>
                </div>
              )}
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-white border rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
