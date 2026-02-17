'use client'

import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Package, Calendar, AlertTriangle, Filter, History, Layers, Clock, Eye, Printer, Info, RefreshCw, X, Truck, ArrowLeft } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { getBatchPurchaseHistory, getBatchStockStats, editStockTransaction, adjustExpiredStock, getBatchStockRobust, getMedicationStockRobust, getStockTruth, getMedicineStockSummary, reconcileStock, getComprehensiveMedicineData, getBatchReceivedTotal } from '@/src/lib/pharmacyService'
import { supabase } from '@/src/lib/supabase'
import type { BatchPurchaseHistoryEntry, StockTransaction, StockTruthRecord, MedicineStockSummary, ComprehensiveMedicineData } from '@/src/lib/pharmacyService'
import MedicineEntryForm from '@/src/components/MedicineEntryForm'

interface MedicineBatch {
  id: string
  medicine_id: string
  batch_number: string
  manufacturing_date: string
  expiry_date: string
  quantity: number
  unit_cost: number
  selling_price: number
  supplier: string
  status: 'active' | 'expired' | 'low_stock'
  received_date: string
  notes?: string
  total_medicine_count?: number
}

interface Medicine {
  id: string
  name: string
  nickname?: string
  category: string
  description?: string
  manufacturer: string
  unit: string
  total_stock: number
  total_medicine_count?: number
  final_total_stock?: number
  min_stock_level: number
  batches: MedicineBatch[]
  medication_code?: string
  combination?: string
  strength?: string
  dosage_form?: string
  generic_name?: string
}

interface NewMedicine {
  name: string
  category: string
  description: string
  manufacturer: string
  unit: string
  min_stock_level: number
}

interface NewBatch {
  batch_number: string
  manufacturing_date: string
  expiry_date: string
  quantity: number
  unit_cost: number
  selling_price: number
  supplier: string
  notes: string
}

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dosageFilter, setDosageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc') // Add sorting state
  const [showAddMedicine, setShowAddMedicine] = useState(false)
  const [showAddBatch, setShowAddBatch] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyBatchNumber, setHistoryBatchNumber] = useState<string>('')
  const [historyEntries, setHistoryEntries] = useState<BatchPurchaseHistoryEntry[]>([])
  const [salesHistoryEntries, setSalesHistoryEntries] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyTab, setHistoryTab] = useState<'purchases' | 'sales'>('purchases')
  const [historyFilter, setHistoryFilter] = useState<'all' | 'this_month' | 'last_3_months'>('all')
  const [showMedicineDetail, setShowMedicineDetail] = useState(false)
  const [selectedMedicineDetail, setSelectedMedicineDetail] = useState<Medicine | null>(null)
  const [medicineStockSummary, setMedicineStockSummary] = useState<MedicineStockSummary | null>(null)
  const [batchStockTruth, setBatchStockTruth] = useState<StockTruthRecord[]>([])
  const [receivedTotalsMap, setReceivedTotalsMap] = useState<Record<string, number>>({})
  const [soldTotalsMap, setSoldTotalsMap] = useState<Record<string, number>>({})
  const [loadingMedicineDetail, setLoadingMedicineDetail] = useState(false)
  const [comprehensiveMedicineData, setComprehensiveMedicineData] = useState<ComprehensiveMedicineData | null>(null)
  const [showEditBatch, setShowEditBatch] = useState(false)
  const [editingBatch, setEditingBatch] = useState<MedicineBatch | null>(null)
  const [editBatchForm, setEditBatchForm] = useState({
    batch_number: '',
    purchase_price: 0,
    selling_price: 0,
    supplier_id: '',
    supplier_name: '',
    manufacturing_date: '',
    expiry_date: '',
    received_date: '',
    current_quantity: 0,
    received_quantity: 0,
    status: 'active',
    notes: '',
    batch_barcode: ''
  })
  const [editBatchError, setEditBatchError] = useState('')
  const [editBatchSuccess, setEditBatchSuccess] = useState('')
  const [supplierOptions, setSupplierOptions] = useState<{ id: string; name: string }[]>([])
  const [loadingEditBatch, setLoadingEditBatch] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null)
  const [showDeleteMedicineConfirm, setShowDeleteMedicineConfirm] = useState(false)
  const [medicineToDelete, setMedicineToDelete] = useState<Medicine | null>(null)
  const [showEditMedicine, setShowEditMedicine] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
  const [showEditPurchase, setShowEditPurchase] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<StockTransaction | null>(null)
  const [purchaseHistory, setPurchaseHistory] = useState<StockTransaction[]>([])
  const [loadingPurchases, setLoadingPurchases] = useState(false)
  const [showExpiredStockModal, setShowExpiredStockModal] = useState(false)
  const [expiredBatch, setExpiredBatch] = useState<{ medicineId: string; batchNumber: string; medicineName: string } | null>(null)
  const [expiredAdjustmentType, setExpiredAdjustmentType] = useState<'delete' | 'adjust'>('delete')
  const [expiredAdjustmentQuantity, setExpiredAdjustmentQuantity] = useState(0)
  const [expiredNotes, setExpiredNotes] = useState('')
  const [newMedicine, setNewMedicine] = useState<NewMedicine>({
    name: '',
    category: '',
    description: '',
    manufacturer: '',
    unit: 'tablets',
    min_stock_level: 10
  })
  const [newBatch, setNewBatch] = useState<NewBatch>({
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    quantity: 0,
    unit_cost: 0,
    selling_price: 0,
    supplier: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchStatsMap, setBatchStatsMap] = useState<Record<string, { remainingUnits: number; soldUnitsThisMonth: number; purchasedUnitsThisMonth: number }>>({})
  const embedded = false

  // Advanced Filters
  const [attrFilterCategory, setAttrFilterCategory] = useState('') // 'name', 'combination', 'unit', 'manufacturer'
  const [attrFilterValue, setAttrFilterValue] = useState('')
  const [timeframeType, setTimeframeType] = useState('all') // 'all', 'daily', 'weekly', 'monthly', 'yearly'
  const [timeframeValue, setTimeframeValue] = useState('')
  const [timeframeMode, setTimeframeMode] = useState<'expiry' | 'received'>('expiry')

  const dosageTypes = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Powder', 'Drops']
  const units = ['tablets', 'capsules', 'ml', 'mg', 'bottles', 'tubes', 'sachets']

  useEffect(() => {
    loadMedicines()


  }, [])

  // Consume deferred action from dashboard (view/edit medicine)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const raw = localStorage.getItem('pharmacy:deferredAction')
      if (!raw) return
      localStorage.removeItem('pharmacy:deferredAction')
      const action = JSON.parse(raw)
      if (!action?.medicineId) return
      // Find medicine after medicines state is set; if not yet loaded, poll briefly
      const tryOpen = () => {
        const med = medicines.find(m => m.id === action.medicineId)
        if (!med) return false
        if (action.type === 'view_medicine') {
          openMedicineDetail(med)
        } else if (action.type === 'edit_medicine') {
          setSelectedMedicine({ ...med, total_stock: med.total_stock ?? 0, min_stock_level: med.min_stock_level ?? 0, batches: (med as any).batches || [] } as any)
          setShowAddBatch(false)
          setShowAddMedicine(true)
        }

        // Helpers for date formatting/defaults used in edit modal
        const fmtDate = (d: Date) => {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }
        const defaultExpiry = () => {
          const d = new Date()
          d.setMonth(d.getMonth() + 12)
          return fmtDate(d)
        }
        const sanitizeDate = (val?: string) => (val && val.trim() ? val : null)

        // Load batch details and suppliers when opening edit modal
        useEffect(() => {
          const loadEditBatchData = async () => {
            if (!showEditBatch || !editingBatch) return
            try {
              setLoadingEditBatch(true)
              setEditBatchError('')
              setEditBatchSuccess('')
              const [{ data: b, error: bErr }, { data: suppliers }] = await Promise.all([
                supabase
                  .from('medicine_batches')
                  .select('batch_number, purchase_price, selling_price, supplier_id, manufacturing_date, expiry_date, received_date, current_quantity, received_quantity, status, notes, batch_barcode')
                  .eq('id', editingBatch.id)
                  .single(),
                supabase
                  .from('suppliers')
                  .select('id, name')
                  .eq('status', 'active')
                  .order('name')
              ])
              const suppliersArr = (suppliers || []).map((s: any) => ({ id: s.id, name: s.name }))
              setSupplierOptions(suppliersArr)
              if (!bErr && b) {
                console.log('DB fetched batch row:', JSON.stringify(b, null, 2))
                const supplierName = suppliersArr.find((s: any) => s.id === b.supplier_id)?.name || ''
                setEditBatchForm({
                  batch_number: b.batch_number || '',
                  purchase_price: Number(b.purchase_price ?? 0),
                  selling_price: Number(b.selling_price ?? 0),
                  supplier_id: b.supplier_id || '',
                  supplier_name: supplierName,
                  manufacturing_date: b.manufacturing_date || '',
                  expiry_date: b.expiry_date || '',
                  received_date: b.received_date || '',
                  current_quantity: Number(b.current_quantity ?? 0),
                  received_quantity: Number(b.received_quantity ?? 0),
                  status: b.status || 'active',
                  notes: b.notes || '',
                  batch_barcode: b.batch_barcode || ''
                })
                console.log('Set form after DB fetch:', JSON.stringify({
                  current_quantity: Number(b.current_quantity ?? 0),
                  received_quantity: Number(b.received_quantity ?? 0),
                  status: b.status || 'active'
                }, null, 2))

                // Fallback: use robust stock sources if quantities look missing/zero
                const needQtyFallback = !(Number(b.current_quantity) > 0 || Number(b.received_quantity) > 0)
                if (needQtyFallback && (b.batch_number || editingBatch.batch_number)) {
                  try {
                    const bn = b.batch_number || editingBatch.batch_number
                    // 1) Service fallback (preferred)
                    try {
                      const robustAny: any = await getBatchStockRobust(bn)
                      console.log('getBatchStockRobust:', robustAny)
                      if (robustAny) {
                        const cq1 = Number(
                          robustAny.remaining_units ?? robustAny.remainingUnits ?? robustAny.current_quantity ?? robustAny.current_stock ?? 0
                        )
                        const rq1 = Number(
                          robustAny.purchased_units ?? robustAny.purchasedUnits ?? robustAny.received_quantity ?? robustAny.total_received ?? 0
                        )
                        if (Number.isFinite(cq1) || Number.isFinite(rq1)) {
                          setEditBatchForm(f => ({
                            ...f,
                            current_quantity: Number.isFinite(cq1) ? cq1 : f.current_quantity,
                            received_quantity: Number.isFinite(rq1) ? rq1 : f.received_quantity
                          }))
                        }
                      }
                    } catch (e) {
                      console.warn('getBatchStockRobust fallback failed', e)
                    }
                    // 2) View fallback
                    try {
                      const { data: sv } = await supabase
                        .from('batch_stock_v')
                        .select('*')
                        .eq('batch_number', bn)
                        .maybeSingle()
                      console.log('batch_stock_v row:', sv)
                      if (sv) {
                        const cq = Number(
                          sv.current_quantity ?? sv.remainingUnits ?? sv.remaining_units ?? sv.current_stock ?? sv.stock_remaining ?? 0
                        )
                        const rq = Number(
                          sv.received_quantity ?? sv.purchasedUnits ?? sv.purchased_units ?? sv.total_received ?? 0
                        )
                        setEditBatchForm(f => ({
                          ...f,
                          current_quantity: Number.isFinite(cq) ? cq : f.current_quantity,
                          received_quantity: Number.isFinite(rq) ? rq : f.received_quantity
                        }))
                      }
                    } catch (e) {
                      console.warn('batch_stock_v fallback failed', e)
                    }

                    // 3) Transactions fallback (purchase - sale)
                    try {
                      const { data: txs } = await supabase
                        .from('stock_transactions')
                        .select('transaction_type, quantity, transaction_date')
                        .eq('batch_number', bn)
                        .order('transaction_date', { ascending: true })
                      console.log('stock_transactions rows:', txs?.length || 0)
                      if (txs && txs.length) {
                        const firstTx = txs[0] as any
                        let received = 0
                        let balance = 0
                        // Use transaction_date as received_date if it's the first purchase
                        const receivedDate = firstTx.transaction_type === 'purchase' ? firstTx.transaction_date?.split('T')[0] : ''
                        for (const t of txs as any[]) {
                          const q = Number(t.quantity) || 0
                          if ((t.transaction_type || '').toLowerCase() === 'purchase') {
                            received += q
                            balance += q
                          } else if ((t.transaction_type || '').toLowerCase() === 'sale') {
                            balance -= q
                          }
                        }
                        if (Number.isFinite(received) || Number.isFinite(balance)) {
                          setEditBatchForm(f => ({
                            ...f,
                            current_quantity: Number.isFinite(balance) ? Math.max(balance, 0) : f.current_quantity,
                            received_quantity: Number.isFinite(received) ? received : f.received_quantity,
                            received_date: receivedDate || f.received_date
                          }))
                        }
                      }
                    } catch (e) {
                      console.warn('transactions fallback failed', e)
                    }
                  } catch (e) {
                    console.warn('Fallback batch_stock_v query failed', e)
                  }
                }
              } else {
                setEditBatchForm({
                  batch_number: editingBatch.batch_number || '',
                  purchase_price: 0,
                  selling_price: 0,
                  supplier_id: '',
                  supplier_name: '',
                  manufacturing_date: '',
                  expiry_date: '',
                  received_date: '',
                  current_quantity: 0,
                  received_quantity: 0,
                  status: 'active',
                  notes: '',
                  batch_barcode: ''
                })
              }
            } catch (e) {
              console.error('Failed to load batch/suppliers for edit', e)
              setEditBatchError('Failed to load batch details')
            } finally {
              setLoadingEditBatch(false)
            }
          }
          loadEditBatchData()
        }, [showEditBatch, editingBatch])

        const saveEditedBatch = React.useCallback(async () => {
          if (!editingBatch) return
          try {
            setLoading(true)
            const payload: any = {
              purchase_price: Number.isFinite(editBatchForm.purchase_price) ? editBatchForm.purchase_price : null,
              selling_price: Number.isFinite(editBatchForm.selling_price) ? editBatchForm.selling_price : null,
              supplier_id: editBatchForm.supplier_id || null,
              manufacturing_date: sanitizeDate(editBatchForm.manufacturing_date),
              expiry_date: sanitizeDate(editBatchForm.expiry_date) ?? defaultExpiry(),
              received_date: sanitizeDate(editBatchForm.received_date),
              notes: editBatchForm.notes?.trim() || null
            }
            const { error } = await supabase
              .from('medicine_batches')
              .update(payload)
              .eq('id', editingBatch.id)
            if (error) throw error
            await loadMedicines()
            if (selectedMedicineDetail) {
              const updatedMed = medicines.find(m => m.id === selectedMedicineDetail.id)
              if (updatedMed) setSelectedMedicineDetail(updatedMed)
            }
            setShowEditBatch(false)
            setEditingBatch(null)
            alert('Batch updated successfully!')
          } catch (err: any) {
            console.error('Failed to update batch', err)
            alert('Failed to update batch: ' + (err?.message || 'Unknown error'))
          } finally {
            setLoading(false)
          }
        }, [editingBatch, editBatchForm, medicines, selectedMedicineDetail])

        // Total units sold for this batch from MCP (stock_transactions sales)
        const loadBatchSoldTotal = async (batchNumber: string) => {
          try {
            const { data, error } = await supabase
              .from('stock_transactions')
              .select('quantity')
              .eq('batch_number', batchNumber)
              .eq('transaction_type', 'sale')
            if (error) throw error
            // Some schemas store sales as positive quantities; take absolute and sum
            const total = (data || []).reduce((sum: number, r: any) => sum + Math.abs(Number(r.quantity) || 0), 0)
            setSoldTotalsMap(prev => ({ ...prev, [batchNumber]: Math.max(0, total) }))
          } catch {
            setSoldTotalsMap(prev => ({ ...prev, [batchNumber]: 0 }))
          }
        }

        return true
      }
      // Attempt immediately, else retry after medicines load
      if (!tryOpen()) {
        const id = setInterval(() => {
          if (tryOpen()) clearInterval(id)
        }, 200)
        setTimeout(() => clearInterval(id), 4000)
      }
    } catch { }
  }, [medicines])

  useEffect(() => {
    // Whenever medicines (and their batches) change, fetch per-batch stats from DB
    const batchNumbers = Array.from(new Set(
      medicines.flatMap(m => m.batches.map(b => b.batch_number))
    )).filter(batchNumber => batchNumber && batchNumber.trim() !== ''); // Filter out invalid batch numbers
    
    if (batchNumbers.length === 0) return
      ; (async () => {
        try {
          const results: Record<string, { remainingUnits: number; soldUnitsThisMonth: number; purchasedUnitsThisMonth: number }> = {}
          await Promise.all(batchNumbers.map(async (bn) => {
            try {
              const stats = await getBatchStockStats(bn)
              results[bn] = stats
            } catch (e) {
              console.error('Failed to load batch stats for', bn, e)
              // Set default values for failed batches
              results[bn] = {
                remainingUnits: 0,
                soldUnitsThisMonth: 0,
                purchasedUnitsThisMonth: 0
              }
            }
          }))
          setBatchStatsMap(results)
        } catch (e) {
          console.error('Failed to load batch stats', e)
        }
      })()
  }, [medicines])

  const loadMedicines = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Testing Supabase client...')
      const chunk = <T,>(arr: T[], size: number) => {
        const out: T[][] = []
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
        return out
      }

      // Test with a simple query to see if the client works
      const { data: test, error: testError } = await supabase
        .from('medications')
        .select('id')
        .eq('is_active', true)
        .limit(1)

      console.log('testError:', testError)
      console.log('test:', test)

      if (testError) {
        console.error('Supabase client test failed:', testError)
        throw testError
      }

      // If test passes, proceed with full query
      const { data: meds, error: medsError } = await supabase
        .from('medications')
        .select('id, name, nickname, category, manufacturer, dosage_form, minimum_stock_level, combination')
        .eq('is_active', true)
        .order('name')

      console.log('medsError:', medsError)
      console.log('meds:', meds)

      if (medsError) {
        console.error('Supabase medsError:', medsError)
        throw medsError
      }

      const medIds = (meds || []).map((m: any) => m.id)
      // Fetch batches for these medications
      let batches: any[] = []
      const idChunks = chunk(medIds, 200)
      if (idChunks.length === 0) {
        batches = []
      } else {
        // Fetch batches with unit selling prices using RPC function
        const { data: allBatches, error: rpcErr } = await supabase.rpc('get_batches_with_unit_price')
        if (rpcErr) throw rpcErr
        
        // Filter batches by medicine IDs for each chunk
        for (const ids of idChunks) {
          const chunkBatches = allBatches.filter((b: any) => ids.includes(b.medicine_id))
          if (chunkBatches && chunkBatches.length) batches = batches.concat(chunkBatches)
        }
      }

      // Fetch suppliers referenced by batches
      const supplierIds = Array.from(new Set((batches || []).map((b: any) => b.supplier_id).filter(Boolean))) as string[]
      let suppliersMap: Record<string, string> = {}
      if (supplierIds.length > 0) {
        let suppliers: any[] = []
        for (const ids of chunk(supplierIds, 200)) {
          const { data: s, error: sErr } = await supabase
            .from('suppliers')
            .select('id, name')
            .in('id', ids)
          if (sErr) throw sErr
          if (s && s.length) suppliers = suppliers.concat(s)
        }
        suppliersMap = Object.fromEntries((suppliers || []).map((s: any) => [s.id, s.name]))
      }




      // Fetch purchase data for pack size calculations
      const batchNumbers = (batches || []).map((b: any) => b.batch_number).filter(Boolean)
      let purchaseDataMap: Record<string, { quantity: number; pack_size: number }> = {}
      
      if (batchNumbers.length > 0) {
        const chunk = <T,>(arr: T[], size: number) => {
          const out: T[][] = []
          for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
          return out
        }
        const numberChunks = chunk(batchNumbers, 200)
        
        for (const numbers of numberChunks) {
          const { data: purchaseItems } = await supabase
            .from('drug_purchase_items')
            .select('batch_number, quantity, pack_size')
            .in('batch_number', numbers)
          
          if (purchaseItems) {
            purchaseItems.forEach((item: any) => {
              if (item.batch_number) {
                purchaseDataMap[item.batch_number] = {
                  quantity: item.quantity || 0,
                  pack_size: item.pack_size || 1
                }
              }
            })
          }
        }
      }

      const mapped: Medicine[] = (meds || []).map((m: any) => {
        const mBatches = (batches || []).filter((b: any) => b.medicine_id === m.id)
        const batchesMapped: MedicineBatch[] = mBatches.map((b: any) => {
          const purchaseInfo = purchaseDataMap[b.batch_number] || { quantity: 0, pack_size: 1 }
          const totalMedicineCount = purchaseInfo.quantity * purchaseInfo.pack_size
          
          return {
            id: b.id,
            medicine_id: b.medicine_id,
            batch_number: b.batch_number,
            manufacturing_date: b.manufacturing_date,
            expiry_date: b.expiry_date,
            quantity: b.current_quantity ?? 0,
            unit_cost: Number(b.purchase_price ?? 0),
            selling_price: Number(b.selling_price ?? 0),
            supplier: suppliersMap[b.supplier_id] || '-',
            status: (b.status as any) || 'active',
            received_date: b.received_date || b.manufacturing_date || '',
            total_medicine_count: totalMedicineCount
          }
        })
        
        // Calculate total stock from batches (current stock) and total medicine count
        const calculatedTotalStock = batchesMapped.reduce((sum, batch) => sum + batch.quantity, 0)
        const totalMedicineCount = batchesMapped.reduce((sum, batch) => sum + (batch.total_medicine_count || 0), 0)
        const finalTotalStock = calculatedTotalStock + totalMedicineCount
        
        return {
          id: m.id,
          name: m.name,
          nickname: m.nickname || null,
          category: m.category || 'Uncategorized',
          description: '',
          manufacturer: m.manufacturer || 'Unknown',
          unit: m.dosage_form || 'units',
          total_stock: calculatedTotalStock,
          total_medicine_count: totalMedicineCount,
          final_total_stock: finalTotalStock,
          min_stock_level: Number(m.minimum_stock_level ?? 0),
          batches: batchesMapped
        }
      })

      setMedicines(mapped)
      console.log('Successfully loaded', mapped.length, 'medicines')
    } catch (err: any) {
      console.error('loadMedicines failed', err)
      try {
        console.error('Error props:', Object.getOwnPropertyNames(err || {}))
      } catch { }
      console.error('Error details:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      })
      setError('Failed to load medicines: ' + (err?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const confirmDeleteMedicine = async () => {
    if (!medicineToDelete) return
    try {
      setLoading(true)
      // Delete all batches first
      const { error: batchErr } = await supabase
        .from('medicine_batches')
        .delete()
        .eq('medicine_id', medicineToDelete.id)
      if (batchErr) throw batchErr

      // Then delete medicine
      const { error: medErr } = await supabase
        .from('medications')
        .delete()
        .eq('id', medicineToDelete.id)
      if (medErr) throw medErr

      await loadMedicines()
      setShowDeleteMedicineConfirm(false)
      setMedicineToDelete(null)
    } catch (err: any) {
      console.error('Error deleting medicine:', err)
      alert('Failed to delete medicine: ' + (err?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  async function saveEditedMedicine() {
    if (!editingMedicine) return
    try {
      setLoading(true)
      const { error } = await supabase
        .from('medications')
        .update({
          name: editingMedicine.name,
          nickname: editingMedicine.nickname || null,
          category: editingMedicine.category,
          manufacturer: editingMedicine.manufacturer,
          combination: editingMedicine.combination || null,
          minimum_stock_level: editingMedicine.min_stock_level,
          dosage_form: editingMedicine.unit
        })
        .eq('id', editingMedicine.id)
      if (error) throw error
      await loadMedicines()
      setShowEditMedicine(false)
      setEditingMedicine(null)
    } catch (err: any) {
      alert('Failed to update medicine: ' + (err?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  // Removed overall stock summary fetch per request

  const getUniqueAttrValues = (category: string) => {
    if (!category) return []
    const key = category === 'unit' ? 'unit' : category
    const vals = medicines.map((m: any) => m[key]).filter(v => v !== null && v !== undefined && v !== '')
    return Array.from(new Set(vals)).sort()
  }

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = (medicine.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medicine.nickname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medicine.combination || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medicine.manufacturer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medicine.unit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medicine.final_total_stock?.toString() || '').includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === '' ||
      (statusFilter === 'low_stock' && medicine.total_stock <= medicine.min_stock_level && medicine.total_stock > 0) ||
      (statusFilter === 'expired' && medicine.batches.some(batch => new Date(batch.expiry_date) < new Date())) ||
      (statusFilter === 'active' && medicine.total_stock > medicine.min_stock_level) ||
      (statusFilter === 'out_of_stock' && medicine.total_stock <= 0)

    // New Attribute Filter
    const matchesAttr = !attrFilterCategory || !attrFilterValue || (
      attrFilterCategory === 'name' ? medicine.name === attrFilterValue :
        attrFilterCategory === 'combination' ? medicine.combination === attrFilterValue :
          attrFilterCategory === 'unit' ? medicine.unit === attrFilterValue :
            attrFilterCategory === 'manufacturer' ? medicine.manufacturer === attrFilterValue :
              true
    )

    // Legacy Dosage Filter (keep for backward compatibility or remove if replaced)
    const matchesDosage = !dosageFilter || medicine.unit === dosageFilter

    // Timeframe Filter logic
    let matchesTimeframe = true
    if (timeframeType !== 'all' && timeframeValue) {
      const selectedDate = new Date(timeframeValue)
      const relevantBatches = medicine.batches.filter(batch => {
        const batchDate = timeframeMode === 'expiry' ? new Date(batch.expiry_date) : new Date(batch.received_date)

        if (timeframeType === 'daily') {
          return batchDate.toDateString() === selectedDate.toDateString()
        } else if (timeframeType === 'weekly') {
          const start = new Date(selectedDate)
          start.setDate(selectedDate.getDate() - selectedDate.getDay())
          const end = new Date(start)
          end.setDate(start.getDate() + 6)
          return batchDate >= start && batchDate <= end
        } else if (timeframeType === 'monthly') {
          return batchDate.getMonth() === selectedDate.getMonth() &&
            batchDate.getFullYear() === selectedDate.getFullYear()
        } else if (timeframeType === 'yearly') {
          return batchDate.getFullYear() === selectedDate.getFullYear()
        }
        return true
      })
      matchesTimeframe = relevantBatches.length > 0
    }

    return matchesSearch && matchesStatus && matchesAttr && matchesDosage && matchesTimeframe
  }).sort((a, b) => {
    // Sort by medicine name
    const nameA = (a.name || '').toLowerCase()
    const nameB = (b.name || '').toLowerCase()
    if (sortOrder === 'asc') {
      return nameA.localeCompare(nameB)
    } else {
      return nameB.localeCompare(nameA)
    }
  })

  const getStockStatus = (medicine: Medicine) => {
    const hasExpiredBatches = medicine.batches.some(batch => new Date(batch.expiry_date) < new Date())
    if (hasExpiredBatches) return 'expired'
    if (medicine.total_stock <= 0) return 'out_of_stock'
    if (medicine.total_stock <= medicine.min_stock_level) return 'low_stock'
    return 'active'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return 'bg-red-100 text-red-800'
      case 'out_of_stock': return 'bg-red-100 text-red-800'
      case 'low_stock': return 'bg-yellow-100 text-yellow-800'
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800'
      case 'active': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAddMedicine = async () => {
    try {
      setLoading(true)
      const medicine: Medicine = {
        id: Date.now().toString(),
        ...newMedicine,
        total_stock: 0,
        batches: []
      }

      setMedicines([...medicines, medicine])
      setNewMedicine({
        name: '',
        category: '',
        description: '',
        manufacturer: '',
        unit: 'tablets',
        min_stock_level: 10
      })
      setShowAddMedicine(false)
    } catch (err) {
      setError('Failed to add medicine')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBatch = async () => {
    if (!selectedMedicine) return

    try {
      setLoading(true)
      const batch: MedicineBatch = {
        id: Date.now().toString(),
        medicine_id: selectedMedicine.id,
        ...newBatch,
        status: 'active',
        received_date: new Date().toISOString().split('T')[0]
      }

      const updatedMedicines = medicines.map(medicine => {
        if (medicine.id === selectedMedicine.id) {
          return {
            ...medicine,
            batches: [...medicine.batches, batch],
            total_stock: medicine.total_stock + newBatch.quantity
          }
        }
        return medicine
      })

      setMedicines(updatedMedicines)
      setNewBatch({
        batch_number: '',
        manufacturing_date: '',
        expiry_date: '',
        quantity: 0,
        unit_cost: 0,
        selling_price: 0,
        supplier: '',
        notes: ''
      })
      setShowAddBatch(false)
      setSelectedMedicine(null)
    } catch (err) {
      setError('Failed to add batch')
    } finally {
      setLoading(false)
    }
  }

  // Functions moved below to avoid duplicates

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(today.getMonth() + 3)

    return expiry <= threeMonthsFromNow && expiry > today
  }

  // Derive per-batch status dynamically instead of relying on stored status
  const getBatchStatus = (batch: MedicineBatch, remainingUnits: number, medicineMinStock: number) => {
    const expired = new Date(batch.expiry_date) < new Date()
    if (expired) return 'expired'
    if (remainingUnits <= 0) return 'out_of_stock'
    if (isExpiringSoon(batch.expiry_date)) return 'expiring_soon'
    const batchesCount = selectedMedicineDetail?.batches?.length || 1
    const perBatchThreshold = Math.max(1, Math.ceil((medicineMinStock || 0) / batchesCount))
    if (medicineMinStock > 0 && remainingUnits <= perBatchThreshold) return 'low_stock'
    return 'active'
  }

  const dashboardStats = () => {
    const totalMedicines = medicines.length
    const totalBatches = medicines.reduce((sum, m) => sum + m.batches.length, 0)
    const lowStock = medicines.filter(m => m.total_stock <= m.min_stock_level).length
    const expired = medicines.reduce((sum, m) => sum + m.batches.filter(b => new Date(b.expiry_date) < new Date()).length, 0)
    const expiringSoon = medicines.reduce((sum, m) => sum + m.batches.filter(b => {
      const isExpired = new Date(b.expiry_date) < new Date()
      return !isExpired && isExpiringSoon(b.expiry_date)
    }).length, 0)
    return { totalMedicines, totalBatches, lowStock, expiringSoon, expired }
  }

  const safeFormatDateTime = (value?: string) => {
    if (!value) return '—'
    const d = new Date(value)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString()
  }

  const safeText = (value?: string) => (value && value !== 'Unknown' && value !== 'N/A') ? value : '—'

  const loadBatchStats = async (batchNumber: string) => {
    try {
      // Use robust batch stock function that prevents negative values
      const robustStats = await getBatchStockRobust(batchNumber)

      if (robustStats) {
        setBatchStatsMap(prev => ({
          ...prev,
          [batchNumber]: {
            remainingUnits: Math.max(0, robustStats.current_stock || 0),
            soldUnitsThisMonth: Math.max(0, robustStats.sold_this_month || 0),
            purchasedUnitsThisMonth: Math.max(0, robustStats.purchased_this_month || 0)
          }
        }))
      } else {
        // Fallback to legacy function if robust function fails
        const legacyStats = await getBatchStockStats(batchNumber)
        setBatchStatsMap(prev => ({
          ...prev,
          [batchNumber]: {
            remainingUnits: Math.max(0, legacyStats.remainingUnits),
            soldUnitsThisMonth: Math.max(0, legacyStats.soldUnitsThisMonth),
            purchasedUnitsThisMonth: Math.max(0, legacyStats.purchasedUnitsThisMonth)
          }
        }))
      }
    } catch (error) {
      console.error('Error loading batch stats:', error)
      setBatchStatsMap(prev => ({
        ...prev,
        [batchNumber]: { remainingUnits: 0, soldUnitsThisMonth: 0, purchasedUnitsThisMonth: 0 }
      }))
    }
  }

  const loadBatchReceivedTotal = async (batchNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('quantity')
        .eq('batch_number', batchNumber)
        .eq('transaction_type', 'purchase')
      if (error) throw error
      const total = (data || []).reduce((sum: number, r: any) => sum + (Number(r.quantity) || 0), 0)
      setReceivedTotalsMap(prev => ({ ...prev, [batchNumber]: Math.max(0, total) }))
    } catch {
      setReceivedTotalsMap(prev => ({ ...prev, [batchNumber]: 0 }))
    }
  }

  // Total units sold for this batch from MCP (stock_transactions sales)
  const loadBatchSoldTotal = async (batchNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('quantity')
        .eq('batch_number', batchNumber)
        .eq('transaction_type', 'sale')
      if (error) throw error
      // Some schemas store sales as positive quantities; take absolute and sum
      const total = (data || []).reduce((sum: number, r: any) => sum + Math.abs(Number(r.quantity) || 0), 0)
      setSoldTotalsMap(prev => ({ ...prev, [batchNumber]: Math.max(0, total) }))
    } catch {
      setSoldTotalsMap(prev => ({ ...prev, [batchNumber]: 0 }))
    }
  }

  const loadPurchaseHistory = async (medicineId: string) => {
    try {
      setLoadingPurchases(true)
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('*')
        .eq('medication_id', medicineId)
        .eq('transaction_type', 'purchase')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPurchaseHistory(data || [])
    } catch (error) {
      console.error('Failed to load purchase history:', error)
      setPurchaseHistory([])
    } finally {
      setLoadingPurchases(false)
    }
  }

  const handleEditPurchase = (purchase: StockTransaction) => {
    setEditingPurchase(purchase)
    setShowEditPurchase(true)
  }

  const handleUpdatePurchase = async (updates: {
    quantity?: number;
    unit_price?: number;
    batch_number?: string;
    expiry_date?: string;
    notes?: string;
  }) => {
    if (!editingPurchase) return

    try {
      setLoading(true)
      await editStockTransaction(editingPurchase.id, updates, 'current-user') // TODO: Get actual user ID
      await loadMedicines() // Reload medicines to update stock
      setShowEditPurchase(false)
      setEditingPurchase(null)
      alert('Purchase entry updated successfully!')
    } catch (error: any) {
      setError('Failed to update purchase: ' + (error?.message || 'Unknown error'))
      console.error('Error updating purchase:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExpiredStockAdjustment = (medicineId: string, batchNumber: string, medicineName: string) => {
    setExpiredBatch({ medicineId, batchNumber, medicineName })
    setExpiredAdjustmentType('delete')
    setExpiredAdjustmentQuantity(0)
    setExpiredNotes('')
    setShowExpiredStockModal(true)
  }

  const handleProcessExpiredStock = async () => {
    if (!expiredBatch) return

    try {
      setLoading(true)
      const result = await adjustExpiredStock(
        expiredBatch.medicineId,
        expiredBatch.batchNumber,
        expiredAdjustmentType,
        'current-user', // TODO: Get actual user ID
        expiredAdjustmentType === 'adjust' ? expiredAdjustmentQuantity : undefined,
        expiredNotes
      )

      if (result.success) {
        await loadMedicines() // Reload medicines to update stock
        setShowExpiredStockModal(false)
        setExpiredBatch(null)
        alert(result.message)
      } else {
        setError('Failed to process expired stock: ' + result.message)
      }
    } catch (error: any) {
      setError('Failed to process expired stock: ' + (error?.message || 'Unknown error'))
      console.error('Error processing expired stock:', error)
    } finally {
      setLoading(false)
    }
  }

  const openMedicineDetail = async (medicine: Medicine) => {
    try {
      setLoadingMedicineDetail(true)
      setSelectedMedicineDetail(medicine)
      setShowMedicineDetail(true)

      // Load comprehensive medicine data using MCP
      const comprehensiveData = await getComprehensiveMedicineData(medicine.id)

      if (comprehensiveData) {
        setComprehensiveMedicineData(comprehensiveData)
        // Trigger robust per-batch stats load for monthly sold/purchased metrics
        try {
          const batchesToLoad = (comprehensiveData.batches || []).map(b => b.batch_number)
          await Promise.all(batchesToLoad.map(async (bn) => {
            await loadBatchStats(bn)
            await loadBatchReceivedTotal(bn)
            await loadBatchSoldTotal(bn)
          }))
        } catch (e) {
          console.error('Failed to load robust batch stats for medicine detail:', e)
        }

        // Convert to legacy format for backward compatibility
        const convertedSummary: MedicineStockSummary = {
          medication_id: comprehensiveData.medication_info.id,
          medication_code: comprehensiveData.medication_info.medication_code,
          medication_name: comprehensiveData.medication_info.name,
          total_batches: comprehensiveData.stock_summary.total_batches,
          total_quantity: comprehensiveData.stock_summary.total_stock,
          total_cost_value: comprehensiveData.stock_summary.total_cost_value,
          total_retail_value: comprehensiveData.stock_summary.total_retail_value,
          critical_low_batches: comprehensiveData.stock_summary.low_stock_batches,
          expired_batches: comprehensiveData.stock_summary.expired_stock,
          expiring_soon_batches: comprehensiveData.stock_summary.expiring_soon_stock,
          needs_reconciliation: false,
          overall_alert_level: comprehensiveData.stock_summary.expired_stock > 0 ? 'CRITICAL' :
            comprehensiveData.stock_summary.low_stock_batches > 0 ? 'WARNING' : 'NORMAL'
        }
        setMedicineStockSummary(convertedSummary)

        // Set empty stock truth data since we have comprehensive data
        setBatchStockTruth([])
      } else {
        // Fallback to original functions
        const [robustSummary, stockTruth] = await Promise.all([
          getMedicationStockRobust(medicine.id),
          getStockTruth(medicine.id),
          loadPurchaseHistory(medicine.id)
        ])

        if (robustSummary) {
          const convertedSummary = {
            medication_id: robustSummary.medication_id,
            medication_code: '',
            medication_name: medicine.name,
            total_batches: Math.max(0, robustSummary.total_batches || 0),
            total_quantity: Math.max(0, robustSummary.current_stock || 0),
            total_cost_value: 0,
            total_retail_value: 0,
            critical_low_batches: 0,
            expired_batches: Math.max(0, robustSummary.expired_units || 0),
            expiring_soon_batches: 0,
            needs_reconciliation: false,
            overall_alert_level: 'NORMAL' as const
          }
          setMedicineStockSummary(convertedSummary)
        }
        setBatchStockTruth(stockTruth)
      }
    } catch (error) {
      console.error('Error loading medicine detail:', error)
    } finally {
      setLoadingMedicineDetail(false)
    }
  }

  const openBatchHistory = async (batchNumber: string) => {
    try {
      setHistoryLoading(true)
      setHistoryBatchNumber(batchNumber)
      const history = await getBatchPurchaseHistory(batchNumber)
      setHistoryEntries(history)
      // Also fetch sales history for this batch
      try {
        const { data: sales, error: salesErr } = await supabase
          .from('stock_transactions')
          .select('id, created_at, batch_number, quantity, unit_price, total_amount, reference_id')
          .eq('batch_number', batchNumber)
          .eq('transaction_type', 'sale')
          .order('created_at', { ascending: false })
        if (!salesErr) setSalesHistoryEntries(sales || [])
        else setSalesHistoryEntries([])
      } catch {
        setSalesHistoryEntries([])
      }
      setShowHistoryModal(true)
    } catch (error) {
      console.error('Error loading batch history:', error)
      setHistoryEntries([])
      setSalesHistoryEntries([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const getFilteredHistoryEntries = () => {
    if (historyFilter === 'all') return historyEntries

    const now = new Date()
    let cutoffDate: Date

    if (historyFilter === 'this_month') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else { // last_3_months
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    }

    return historyEntries.filter(entry => {
      const entryDate = new Date(entry.purchased_at)
      return entryDate >= cutoffDate
    })
  }

  const getFilteredSalesEntries = () => {
    if (historyFilter === 'all') return salesHistoryEntries

    const now = new Date()
    let cutoffDate: Date

    if (historyFilter === 'this_month') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    }

    return (salesHistoryEntries || []).filter((e: any) => {
      const d = new Date(e.created_at)
      return d >= cutoffDate
    })
  }

  const handleEditBatch = (batch: MedicineBatch) => {
    console.log('Edit batch clicked:', batch.batch_number, JSON.stringify(batch, null, 2))
    setEditingBatch(batch)
    // Prefill form immediately so UI shows existing values without waiting for DB
    setEditBatchForm(f => {
      const b: any = batch as any
      console.log('Prefill raw batch object:', JSON.stringify(b, null, 2))
      const currentQty = Number.isFinite(Number(b.current_stock))
        ? Number(b.current_stock)
        : (Number.isFinite(Number(b.current_quantity)) ? Number(b.current_quantity) : (Number.isFinite(Number(b.quantity)) ? Number(b.quantity) : f.current_quantity))
      const receivedQty = Number.isFinite(Number(b.original_quantity))
        ? Number(b.original_quantity)
        : (Number.isFinite(Number(b.received_quantity)) ? Number(b.received_quantity) : (Number.isFinite(Number(b.received)) ? Number(b.received) : f.received_quantity))
      const purchase = Number.isFinite(Number(b.purchase_price))
        ? Number(b.purchase_price)
        : (Number.isFinite(Number(b.unit_cost)) ? Number(b.unit_cost) : f.purchase_price)
      const selling = Number.isFinite(Number(b.selling_price)) ? Number(b.selling_price) : f.selling_price
      console.log('Prefilled values:', JSON.stringify({ currentQty, receivedQty, purchase, selling }, null, 2))
      return {
        batch_number: batch.batch_number || f.batch_number,
        purchase_price: purchase,
        selling_price: selling,
        supplier_id: b.supplier_id || '',
        supplier_name: '',
        manufacturing_date: batch.manufacturing_date || '',
        expiry_date: batch.expiry_date || '',
        received_date: batch.received_date || '',
        current_quantity: currentQty,
        received_quantity: receivedQty,
        status: b.status || f.status || 'active',
        notes: f.notes || '',
        batch_barcode: b.batch_barcode || f.batch_barcode || ''
      }
    })
    setShowEditBatch(true)
  }

  const handleDeleteBatch = (batchId: string) => {
    console.log('Delete batch clicked:', batchId)
    setBatchToDelete(batchId)
    setShowDeleteConfirm(true)
  }

  const handleDeleteMedicine = (medicine: Medicine) => {
    setMedicineToDelete(medicine)
    setShowDeleteMedicineConfirm(true)
  }

  const handleEditMedicine = (medicine: Medicine) => {
    setEditingMedicine(medicine)
    setShowEditMedicine(true)
  }

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('medicine_batches')
        .delete()
        .eq('id', batchToDelete)

      if (error) throw error

      // Refresh the medicines list
      await loadMedicines()

      // Update the selected medicine detail
      if (selectedMedicineDetail) {
        const updatedMedicine = medicines.find(m => m.id === selectedMedicineDetail.id)
        if (updatedMedicine) {
          setSelectedMedicineDetail(updatedMedicine)
        }
      }

      alert('Batch deleted successfully!')

      setShowDeleteConfirm(false)
      setBatchToDelete(null)
    } catch (error: any) {
      console.error('Error deleting batch:', error)
      alert('Failed to delete batch: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const printBatchLabel = async (batch: MedicineBatch, medicineName: string) => {
    try {
      // Fetch the actual batch barcode from database
      const { data: batchData, error } = await supabase
        .from('medicine_batches')
        .select('batch_barcode')
        .eq('id', batch.id)
        .single()

      const barcode = batchData?.batch_barcode || 'N/A'
      // Use definitive stock truth for accurate quantity on label
      const stockTruth = await getStockTruth(undefined, batch.batch_number)
      const quantity = stockTruth && stockTruth.length > 0 ? stockTruth[0].current_quantity : batch.quantity

      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const labelContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Medicine Batch Label</title>
            <style>
              @page { 
                size: 2in 1in; 
                margin: 0.1in; 
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body { 
                font-family: 'Arial', sans-serif;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 4px;
                font-size: 8px;
                line-height: 1.2;
              }
              .header {
                text-align: center;
                border-bottom: 1px solid #000;
                padding-bottom: 2px;
                margin-bottom: 3px;
              }
              .hospital-name {
                font-size: 10px;
                font-weight: bold;
                color: #000;
              }
              .label-type {
                font-size: 7px;
                color: #666;
                margin-top: 1px;
              }
              .content {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .medicine-info {
                margin-bottom: 3px;
              }
              .medicine-name {
                font-size: 9px;
                font-weight: bold;
                margin-bottom: 2px;
                text-align: center;
              }
              .batch-details {
                display: flex;
                justify-content: space-between;
                font-size: 7px;
                margin-bottom: 2px;
              }
              .barcode-section {
                text-align: center;
                margin: 2px 0;
                border: 1px solid #ddd;
                padding: 2px;
                background: #f9f9f9;
              }
              .barcode-lines {
                font-family: 'Courier New', monospace;
                font-size: 6px;
                letter-spacing: 0.5px;
                margin: 1px 0;
              }
              .barcode-number {
                font-family: 'Courier New', monospace;
                font-size: 6px;
                font-weight: bold;
                margin-top: 1px;
              }
              .expiry-section {
                text-align: center;
                background: #ffe6e6;
                border: 1px solid #ff9999;
                padding: 2px;
                margin-top: 2px;
              }
              .expiry-label {
                font-size: 6px;
                color: #cc0000;
                font-weight: bold;
              }
              .expiry-date {
                font-size: 8px;
                color: #cc0000;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                font-size: 6px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 2px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="hospital-name">HMS PHARMACY</div>
              <div class="label-type">MEDICINE BATCH LABEL</div>
            </div>
            
            <div class="content">
              <div class="medicine-info">
                <div class="medicine-name">${medicineName}</div>
                <div class="batch-details">
                  <span><strong>Batch:</strong> ${batch.batch_number}</span>
                  <span><strong>Qty:</strong> ${quantity}</span>
                </div>
              </div>
              
              <div class="barcode-section">
                <div class="barcode-lines">||||| |||| | ||| |||| | |||| |||||</div>
                <div class="barcode-number">${barcode}</div>
              </div>
              
              <div class="expiry-section">
                <div class="expiry-label">EXPIRY DATE</div>
                <div class="expiry-date">${new Date(batch.expiry_date).toLocaleDateString('en-GB')}</div>
              </div>
            </div>
            
            <div class="footer">
              Printed: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour12: false })}
            </div>
          </body>
        </html>
      `

      printWindow.document.write(labelContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    } catch (error) {
      console.error('Error printing batch label:', error)
      alert('Failed to print label. Please try again.')
    }
  }

  const printStandardLabel = async (batch: MedicineBatch, medicineName: string) => {
    try {
      // Fetch the actual batch barcode from database
      const { data: batchData, error } = await supabase
        .from('medicine_batches')
        .select('batch_barcode')
        .eq('id', batch.id)
        .single()

      const barcode = batchData?.batch_barcode || batch.batch_number

      // Get definitive stock data from the stock truth system
      const stockTruth = await getStockTruth(undefined, batch.batch_number)
      const quantity = stockTruth && stockTruth.length > 0 ? stockTruth[0].current_quantity : batch.quantity

      // Prepare safe medicine name so label always shows something readable
      const safeMedicineName = (medicineName || '').trim() || 'Unknown Medicine'
      const shortMedicineName = safeMedicineName.length > 20
        ? safeMedicineName.substring(0, 20) + '...'
        : safeMedicineName

      // Format dates outside template literal to avoid parsing issues
      const expiryDate = new Date(batch.expiry_date).toLocaleDateString('en-GB')
      const printDate = new Date().toLocaleDateString('en-GB')
      const printTime = new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })

      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const labelContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Standard Medicine Label</title>
            <style>
              @page { 
                size: 50mm 25mm; 
                margin: 1mm; 
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body { 
                font-family: 'Arial', sans-serif;
                width: 48mm;
                height: 23mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 1mm;
                font-size: 8px;
                line-height: 1.1;
                background: white;
              }
              .header {
                text-align: center;
                font-size: 10px;
                font-weight: bold;
                color: #000;
                margin-bottom: 1mm;
              }
              .medicine-name {
                text-align: center;
                font-size: 10px;
                font-weight: bold;
                color: #000;
                margin-bottom: 1mm;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .medicine-name-full {
                text-align: center;
                font-size: 7px;
                color: #333;
                margin-top: -0.5mm;
                margin-bottom: 0.5mm;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .batch-info {
                display: flex;
                justify-content: space-between;
                font-size: 6px; /* reduced per request */
                color: #000;
                margin-bottom: 0.8mm;
              }
              .barcode-section {
                text-align: center;
                margin: 1mm 0;
                height: 10mm; /* fixed height per spec */
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                border: 0.5px solid #ddd;
                background: #f9f9f9;
              }
              #barcode {
                width: 30mm;   /* exact width per spec */
                height: 10mm;  /* exact height per spec */
                display: block;
              }
              .footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 6px;
                color: #000; /* black per request */
              }
            </style>
          </head>
          <body>
            <div class="header">ANNAM HOSPITAL</div>
            
            <div class="medicine-name" title="${safeMedicineName}">
              ${shortMedicineName}
            </div>
            <div class="medicine-name-full">${safeMedicineName}</div>
            
            <div class="batch-info">
              <span>Med: ${shortMedicineName}</span>
              <span>Batch: ${batch.batch_number}</span>
              <span>Qty: ${quantity}</span>
            </div>
            
            <div class="barcode-section">
              <svg id="barcode"></svg>
            </div>
            
            <div class="footer">
              <span>Exp: ${expiryDate}</span>
              <span>Printed: ${printDate} ${printTime}</span>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
            <script>
              (function() {
                function render() {
                  try {
                    var value = ${JSON.stringify(barcode)};
                    // Use CODE128 for alphanumeric; EAN-13 if numeric length 13
                    var isNumeric = /^\d+$/.test(value);
                    var fmt = (isNumeric && value.length === 13) ? 'EAN13' : 'CODE128';
                    JsBarcode('#barcode', value, {
                      format: fmt,
                      displayValue: true,
                      fontSize: 8,
                      textMargin: 1,
                      margin: 2,      // quiet zone
                      lineColor: '#000',
                      background: '#f9f9f9'
                    });
                    // Wait a tick for layout, then print
                    setTimeout(function(){ window.print(); window.close(); }, 200);
                  } catch (e) {
                    console.error('Barcode render error', e);
                    setTimeout(function(){ window.print(); window.close(); }, 200);
                  }
                }
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  render();
                } else {
                  window.addEventListener('load', render);
                }
              })();
            </script>
          </body>
        </html>
      `

      printWindow.document.write(labelContent)
      printWindow.document.close()
      printWindow.focus()
      // Printing is triggered inside the popup after the barcode renders
    } catch (error) {
      console.error('Error printing standard label:', error)
      alert('Failed to print label. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Modern Header */}
      {!embedded && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Pharmacy Inventory Management
                  </h1>
                  <p className="text-gray-600 mt-1">Manage medicines with batch-wise tracking and real-time stock monitoring</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMedicine(true)}
                className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                Add Medicine
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-8 space-y-8">

        {/* Edit Batch Modal - Modern Stunning UI */}
        {showEditBatch && editingBatch && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col"
            >
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Edit Batch Details</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {selectedMedicineDetail?.name ? (
                        <><span className="font-semibold">{selectedMedicineDetail.name}</span> — Batch <span className="font-mono">{editBatchForm.batch_number || editingBatch.batch_number}</span></>
                      ) : (
                        <>Batch <span className="font-mono">{editBatchForm.batch_number || editingBatch.batch_number}</span></>
                      )}
                    </p>
                  </div>
                  <button
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    onClick={() => { setShowEditBatch(false); setEditingBatch(null); setEditBatchError(''); setEditBatchSuccess(''); }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {loadingEditBatch ? (
                <div className="p-12 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500">Loading batch details...</p>
                </div>
              ) : (
                <>
                  {/* Batch Info Header Card */}
                  <div className="mx-6 mt-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Package className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Batch Number</div>
                          <div className="text-xl font-bold text-slate-800 font-mono">{editBatchForm.batch_number || editingBatch.batch_number || '—'}</div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Current Stock</div>
                          <div className="text-2xl font-bold text-emerald-600">{Number.isFinite(editBatchForm.current_quantity) ? editBatchForm.current_quantity : 0}</div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200">
                            Received: {Number.isFinite(editBatchForm.received_quantity) ? editBatchForm.received_quantity : 0}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${editBatchForm.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {editBatchForm.status || 'active'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {editBatchForm.batch_barcode && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="text-xs text-slate-500">Barcode: <span className="font-mono text-slate-700">{editBatchForm.batch_barcode}</span></div>
                      </div>
                    )}
                  </div>

                  {/* Error/Success Messages */}
                  {editBatchError && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-red-700 text-sm">{editBatchError}</p>
                    </div>
                  )}
                  {editBatchSuccess && (
                    <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                      <Package className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <p className="text-emerald-700 text-sm">{editBatchSuccess}</p>
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Pricing Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs">₹</span>
                        Pricing Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Purchase Price (Cost)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={Number.isFinite(editBatchForm.purchase_price) ? editBatchForm.purchase_price : ''}
                              onChange={e => setEditBatchForm(f => ({ ...f, purchase_price: Number(e.target.value) }))}
                              className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Selling Price (MRP)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={Number.isFinite(editBatchForm.selling_price) ? editBatchForm.selling_price : ''}
                              onChange={e => setEditBatchForm(f => ({ ...f, selling_price: Number(e.target.value) }))}
                              className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Quantity */}
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Received Quantity</label>
                          <input
                            type="number"
                            value={Number.isFinite(editBatchForm.received_quantity) ? editBatchForm.received_quantity : 0}
                            readOnly
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Quantity (Units in this batch)</label>
                          <input
                            type="number"
                            min="0"
                            value={Number.isFinite(editBatchForm.current_quantity) ? editBatchForm.current_quantity : ''}
                            onChange={e => setEditBatchForm(f => ({ ...f, current_quantity: Number(e.target.value) }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Supplier Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <Truck className="w-3 h-3 text-purple-600" />
                        </span>
                        Supplier
                      </h3>
                      <select
                        value={editBatchForm.supplier_id || ''}
                        onChange={e => {
                          const selectedSupplier = supplierOptions.find(s => s.id === e.target.value);
                          setEditBatchForm(f => ({ ...f, supplier_id: e.target.value, supplier_name: selectedSupplier?.name || '' }));
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white appearance-none cursor-pointer"
                      >
                        <option value="">— Select Supplier —</option>
                        {supplierOptions.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Dates Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-3 h-3 text-amber-600" />
                        </span>
                        Important Dates
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Manufacturing</label>
                          <input
                            type="date"
                            value={editBatchForm.manufacturing_date || ''}
                            onChange={e => setEditBatchForm(f => ({ ...f, manufacturing_date: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Received</label>
                          <input
                            type="date"
                            value={editBatchForm.received_date || ''}
                            onChange={e => setEditBatchForm(f => ({ ...f, received_date: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Expiry Date <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            value={editBatchForm.expiry_date || ''}
                            onChange={e => setEditBatchForm(f => ({ ...f, expiry_date: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                          <Info className="w-3 h-3 text-slate-600" />
                        </span>
                        Additional Notes
                      </h3>
                      <textarea
                        value={editBatchForm.notes || ''}
                        onChange={e => setEditBatchForm(f => ({ ...f, notes: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white resize-none"
                        rows={3}
                        placeholder="Add any additional notes about this batch..."
                      />
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-3xl">
                    <button
                      className="px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-all font-medium"
                      onClick={() => { setShowEditBatch(false); setEditingBatch(null); setEditBatchError(''); setEditBatchSuccess(''); }}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      onClick={async () => {
                        if (!editingBatch) return;
                        setEditBatchError('');
                        setEditBatchSuccess('');
                        try {
                          setLoading(true);
                          // basic validation
                          if (Number(editBatchForm.current_quantity) < 0) {
                            setEditBatchError('Quantity cannot be negative');
                            setLoading(false);
                            return;
                          }
                          const payload: any = {
                            purchase_price: Number.isFinite(editBatchForm.purchase_price) ? editBatchForm.purchase_price : null,
                            selling_price: Number.isFinite(editBatchForm.selling_price) ? editBatchForm.selling_price : null,
                            supplier_id: editBatchForm.supplier_id || null,
                            manufacturing_date: (editBatchForm.manufacturing_date && editBatchForm.manufacturing_date.trim()) ? editBatchForm.manufacturing_date : null,
                            expiry_date: (editBatchForm.expiry_date && editBatchForm.expiry_date.trim()) ? editBatchForm.expiry_date : (() => { const d = new Date(); d.setMonth(d.getMonth() + 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(),
                            received_date: (editBatchForm.received_date && editBatchForm.received_date.trim()) ? editBatchForm.received_date : null,
                            current_quantity: Number.isFinite(editBatchForm.current_quantity) ? editBatchForm.current_quantity : null,
                            notes: editBatchForm.notes?.trim() || null,
                          };
                          const { error } = await supabase
                            .from('medicine_batches')
                            .update(payload)
                            .eq('id', editingBatch.id);
                          if (error) throw error;
                          await loadMedicines();
                          if (selectedMedicineDetail) {
                            const updatedMed = medicines.find(m => m.id === selectedMedicineDetail.id);
                            if (updatedMed) setSelectedMedicineDetail(updatedMed);
                          }
                          setEditBatchSuccess('Batch updated successfully!');
                          setTimeout(() => {
                            setShowEditBatch(false);
                            setEditingBatch(null);
                            setEditBatchError('');
                            setEditBatchSuccess('');
                          }, 1500);
                        } catch (err: any) {
                          console.error('Failed to update batch', err);
                          setEditBatchError('Failed to update batch: ' + (err?.message || 'Unknown error'));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Edit Medicine Modal */}
        {showEditMedicine && editingMedicine && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
            >
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-8 py-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Edit Medicine</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Update medicine information and formulation details
                    </p>
                  </div>
                  <button
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    onClick={() => { setShowEditMedicine(false); setEditingMedicine(null) }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                {/* Medicine Icon and Name */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-blue-600 uppercase tracking-wider font-medium">Medicine Name</div>
                    <div className="text-lg font-bold text-blue-900">{editingMedicine.name}</div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Field */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Medicine Name
                    </label>
                    <input
                      type="text"
                      value={editingMedicine.name}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                      placeholder="Enter medicine name"
                    />
                  </div>

                  {/* Combination Field */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Combination / Formulation
                    </label>
                    <input
                      type="text"
                      value={editingMedicine.combination || ''}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, combination: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                      placeholder="e.g., Paracetamol 500mg + Caffeine 65mg"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      💡 Enter the medicine combination, dosage strength, or formulation details
                    </p>
                  </div>

                  {/* Nickname Field */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      Nickname / Short Name
                    </label>
                    <input
                      type="text"
                      value={editingMedicine.nickname || ''}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, nickname: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                      placeholder="e.g., PCM, Para"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      🏷️ Short form or alias for quick search
                    </p>
                  </div>

                  {/* Manufacturer */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={editingMedicine.manufacturer}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, manufacturer: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                      placeholder="Enter manufacturer name"
                    />
                  </div>

                  {/* Dosage Form */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Dosage Form
                    </label>
                    <select
                      value={editingMedicine.unit}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, unit: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/50 backdrop-blur-sm appearance-none cursor-pointer transition-all duration-200"
                    >
                      <option value="">Select dosage form</option>
                      {dosageTypes.map((dt) => (
                        <option key={dt} value={dt}>{dt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Minimum Stock Level */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Minimum Stock Level
                    </label>
                    <input
                      type="number"
                      value={editingMedicine.min_stock_level}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, min_stock_level: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      ⚠️ Alert when stock falls below this level
                    </p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      Category
                    </label>
                    <input
                      type="text"
                      value={editingMedicine.category || ''}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                      placeholder="e.g., Antibiotics, Pain Relief"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">💡 Tip:</span> All fields are optional except the medicine name
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowEditMedicine(false); setEditingMedicine(null) }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={saveEditedMedicine}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Medicine Confirmation Modal */}
        {showDeleteMedicineConfirm && medicineToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Delete Medicine</h2>
              </div>
              <p className="text-gray-600 mb-4">
                This will permanently delete <span className="font-semibold">{medicineToDelete.name}</span> and all its batches. This action cannot be undone.
              </p>
              <div className="bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm mb-6">
                Warning: If this medicine is referenced in bills or prescriptions, the delete may fail due to database constraints.
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowDeleteMedicineConfirm(false); setMedicineToDelete(null) }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMedicine}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Medicine
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Enhanced Search and Filter Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search medicines by name, manufacturer, or dosage type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
              />
            </div>

            {/* Filter Dropdowns - Row 1 */}
            <div className="flex gap-3">
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm appearance-none cursor-pointer transition-all duration-200"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Sorting Controls */}
              <div className="flex items-center bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    sortOrder === 'asc'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                  }`}
                  title="Sort A-Z (Ascending)"
                >
                  <span className="text-xs">A-Z</span>
                  {sortOrder === 'asc' && <span className="text-xs">↑</span>}
                </button>
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    sortOrder === 'desc'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                  }`}
                  title="Sort Z-A (Descending)"
                >
                  <span className="text-xs">Z-A</span>
                  {sortOrder === 'desc' && <span className="text-xs">↓</span>}
                </button>
              </div>

              {/* Results Counter */}
              <div className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 min-w-[140px] justify-center">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {filteredMedicines.length} medicines
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Advanced Dynamic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Attribute Type</label>
              <select
                value={attrFilterCategory}
                onChange={(e) => {
                  setAttrFilterCategory(e.target.value)
                  setAttrFilterValue('')
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-medium text-sm"
              >
                <option value="">-- Select --</option>
                <option value="name">Medicine Name</option>
                <option value="combination">Combination</option>
                <option value="unit">Dosage Type</option>
                <option value="manufacturer">Manufacturer</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Value</label>
              <select
                value={attrFilterValue}
                onChange={(e) => setAttrFilterValue(e.target.value)}
                disabled={!attrFilterCategory}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-medium text-sm disabled:bg-gray-50"
              >
                <option value="">All {attrFilterCategory ? (attrFilterCategory === 'unit' ? 'Dosages' : attrFilterCategory.charAt(0).toUpperCase() + attrFilterCategory.slice(1) + 's') : 'Values'}</option>
                {getUniqueAttrValues(attrFilterCategory).map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Date Filter For</label>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setTimeframeMode('expiry')}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${timeframeMode === 'expiry' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  EXPIRY
                </button>
                <button
                  onClick={() => setTimeframeMode('received')}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${timeframeMode === 'received' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  RECEIVED
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Timeframe Range</label>
              <select
                value={timeframeType}
                onChange={(e) => {
                  setTimeframeType(e.target.value)
                  setTimeframeValue('')
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-medium text-sm"
              >
                <option value="all">Any Date</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Select {timeframeType === 'weekly' ? 'Week' : timeframeType === 'all' ? 'Date' : timeframeType.charAt(0).toUpperCase() + timeframeType.slice(1)}</label>
              <input
                type={timeframeType === 'monthly' ? 'month' : timeframeType === 'yearly' ? 'number' : 'date'}
                value={timeframeValue}
                onChange={(e) => setTimeframeValue(e.target.value)}
                disabled={timeframeType === 'all'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-medium text-sm disabled:bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Enhanced Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {(() => {
            const stats = dashboardStats()
            return (
              <>
                <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full">Total</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">{stats.totalMedicines}</div>
                    <div className="text-sm text-gray-600">Medicines</div>
                  </div>
                </div>

                <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Layers className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full">Batches</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">{stats.totalBatches}</div>
                    <div className="text-sm text-gray-600">Total Batches</div>
                  </div>
                </div>

                <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full">Warning</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">{stats.lowStock}</div>
                    <div className="text-sm text-gray-600">Low Stock</div>
                  </div>
                </div>

                <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full">Alert</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">{stats.expiringSoon}</div>
                    <div className="text-sm text-gray-600">Expiring Soon</div>
                  </div>
                </div>

                <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded-full">Critical</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">{stats.expired}</div>
                    <div className="text-sm text-gray-600">Expired</div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>

        {/* Overall Remaining Stock card removed per request */}

        {/* Enhanced Medicines Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
              <p className="text-gray-600 font-medium">Loading medicines...</p>
              <p className="text-gray-500 text-sm mt-1">Fetching inventory data</p>
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 font-medium text-lg">No medicines found</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Medicine Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Combination</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Dosage Type</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Manufacturer</th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-900">Stock</th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-900">Batches</th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-900">Status</th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicines.map((medicine) => {
                    const status = getStockStatus(medicine)
                    return (
                      <tr
                        key={medicine.id}
                        className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 group"
                        onClick={() => openMedicineDetail(medicine)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                              <Package className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{medicine.name}</span>
                              {medicine.nickname && (
                                <div className="text-xs text-pink-600 font-medium mt-0.5">
                                  🏷️ {medicine.nickname}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-700">
                            {medicine.combination || <span className="text-gray-400 italic">-</span>}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            {medicine.unit}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-700">{medicine.manufacturer}</td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <div className={`text-lg font-bold ${(medicine.final_total_stock || medicine.total_stock) <= medicine.min_stock_level ? 'text-red-600' : (medicine.final_total_stock || medicine.total_stock) <= medicine.min_stock_level * 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {medicine.final_total_stock || medicine.total_stock}
                            </div>
                            <div className="text-xs text-gray-500">Min: {medicine.min_stock_level}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {medicine.batches.length}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
                            {status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditMedicine(medicine)
                              }}
                              className="group/edit p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center gap-2"
                              title="Edit Medicine"
                            >
                              <Edit className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />
                              <span className="text-sm font-medium">Edit</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteMedicine(medicine)
                              }}
                              className="group/delete p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center gap-2"
                              title="Delete Medicine"
                            >
                              <Trash2 className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
                              <span className="text-sm font-medium">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modern Medicine Entry Form */}
        {showAddMedicine && (
          <MedicineEntryForm
            onClose={() => setShowAddMedicine(false)}
            onSuccess={() => {
              setShowAddMedicine(false);
              // Refresh the medicines list
              window.location.reload();
            }}
          />
        )}

        {/* Add Batch Modal (Full Form) */}
        {showAddBatch && selectedMedicine && (
          <MedicineEntryForm
            preselectedMedicine={{
              id: selectedMedicine.id,
              name: selectedMedicine.name,
              medication_code: selectedMedicine.medication_code,
            }}
            initialTab="batch"
            onClose={() => {
              setShowAddBatch(false)
              setSelectedMedicine(null)
            }}
            onSuccess={() => {
              setShowAddBatch(false)
              setSelectedMedicine(null)
              // Refresh data to reflect new batch
              window.location.reload()
            }}
          />
        )}

        {/* Batch Purchase History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Batch History - {historyBatchNumber}</h2>
                <button onClick={() => { setShowHistoryModal(false); setHistoryEntries([]); setSalesHistoryEntries([]); setHistoryBatchNumber(''); }} className="btn-secondary">Close</button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setHistoryTab('purchases')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${historyTab === 'purchases' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Purchases
                </button>
                <button
                  onClick={() => setHistoryTab('sales')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${historyTab === 'sales' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Sales
                </button>
              </div>

              {/* Time Filters */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${historyFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setHistoryFilter('this_month')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${historyFilter === 'this_month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setHistoryFilter('last_3_months')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${historyFilter === 'last_3_months'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Last 3 Months
                </button>
              </div>

              {historyLoading ? (
                <div className="text-center py-8">Loading history...</div>
              ) : (
                <>
                  {/* Totals */}
                  <div className="flex items-center gap-4 mb-3 text-sm">
                    {historyTab === 'purchases' ? (
                      <>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg">Total Purchased Qty: <span className="font-semibold">{getFilteredHistoryEntries().reduce((s, e) => s + (e.quantity || 0), 0)}</span></div>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg">Total Amount: <span className="font-semibold">₹{getFilteredHistoryEntries().reduce((s, e) => s + (e.total_amount || 0), 0)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg">Total Sold Qty: <span className="font-semibold">{getFilteredSalesEntries().reduce((s, e) => s + Math.abs(e.quantity || 0), 0)}</span></div>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg">Total Sales: <span className="font-semibold">₹{getFilteredSalesEntries().reduce((s, e) => s + (e.total_amount || 0), 0)}</span></div>
                      </>
                    )}
                  </div>

                  {/* Tables */}
                  {historyTab === 'purchases' ? (
                    getFilteredHistoryEntries().length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg mb-2">No purchases found</p>
                        <p className="text-sm">No purchase history for this batch in the selected time period.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm table-auto">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-2">Date</th>
                              <th className="text-left py-3 px-2">Bill #</th>
                              <th className="text-left py-3 px-2">Patient</th>
                              <th className="text-left py-3 px-2">Medicine</th>
                              <th className="text-left py-3 px-2">Qty</th>
                              <th className="text-left py-3 px-2">Amount</th>
                              <th className="text-left py-3 px-2">Payment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredHistoryEntries().map((entry) => (
                              <tr key={`${entry.bill_id}-${entry.medication_id}`} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-2">{safeFormatDateTime(entry.purchased_at)}</td>
                                <td className="py-3 px-2">{safeText(entry.bill_number)}</td>
                                <td className="py-3 px-2">
                                  <div className="leading-tight">
                                    <div className="text-gray-900">{safeText(entry.patient_name)}</div>
                                    {entry.patient_uhid && (
                                      <div className="text-xs text-gray-500">UHID: {safeText(entry.patient_uhid)}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-2">{safeText(entry.medication_name)}</td>
                                <td className="py-3 px-2">{entry.quantity}</td>
                                <td className="py-3 px-2">₹{entry.total_amount}</td>
                                <td className="py-3 px-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${entry.payment_status === 'paid' ? 'bg-green-100 text-green-800' : entry.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {entry.payment_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    getFilteredSalesEntries().length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg mb-2">No sales found</p>
                        <p className="text-sm">No sales history for this batch in the selected time period.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm table-auto">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-2">Date</th>
                              <th className="text-left py-3 px-2">Bill #</th>
                              <th className="text-left py-3 px-2">Qty</th>
                              <th className="text-left py-3 px-2">Unit Price</th>
                              <th className="text-left py-3 px-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredSalesEntries().map((row: any) => (
                              <tr key={row.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-2">{safeFormatDateTime(row.created_at)}</td>
                                <td className="py-3 px-2">{safeText(row.reference_id)}</td>
                                <td className="py-3 px-2">{Math.abs(row.quantity || 0)}</td>
                                <td className="py-3 px-2">₹{row.unit_price}</td>
                                <td className="py-3 px-2">₹{row.total_amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Medicine Detail Modal */}
        {showMedicineDetail && selectedMedicineDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 shadow-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-3xl font-bold text-white tracking-tight">{selectedMedicineDetail.name}</h2>
                      {medicineStockSummary?.overall_alert_level && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${medicineStockSummary.overall_alert_level === 'CRITICAL' ? 'bg-red-600 text-white' :
                          medicineStockSummary.overall_alert_level === 'WARNING' ? 'bg-amber-500 text-white' :
                            medicineStockSummary.overall_alert_level === 'INFO' ? 'bg-blue-600 text-white' :
                              'bg-emerald-500 text-white'
                          }`}>
                          {medicineStockSummary.overall_alert_level}
                        </span>
                      )}
                    </div>

                    {/* Medicine Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm mb-4">
                      <div>
                        <div className="text-slate-300 text-xs font-medium mb-1">Code</div>
                        <div className="text-white font-semibold">{selectedMedicineDetail.medication_code || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-slate-300 text-xs font-medium mb-1">Dosage Type</div>
                        <div className="text-white font-semibold">{selectedMedicineDetail.unit}</div>
                      </div>
                      <div>
                        <div className="text-slate-300 text-xs font-medium mb-1">Manufacturer</div>
                        <div className="text-white font-semibold">{selectedMedicineDetail.manufacturer}</div>
                      </div>
                      <div>
                        <div className="text-slate-300 text-xs font-medium mb-1">Strength</div>
                        <div className="text-white font-semibold">{selectedMedicineDetail.strength || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-slate-300 text-xs font-medium mb-1">Form</div>
                        <div className="text-white font-semibold">{selectedMedicineDetail.dosage_form || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-slate-300 text-xs font-medium mb-1">Generic</div>
                        <div className="text-white font-semibold">{selectedMedicineDetail.generic_name || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Stock Summary Cards */}
                    {medicineStockSummary && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                          <div className="text-slate-300 text-xs font-medium mb-2">Total Stock</div>
                          <div className="text-2xl font-bold text-white">{medicineStockSummary.total_quantity}</div>
                          <div className="text-slate-300 text-xs mt-1">{medicineStockSummary.total_batches} batches</div>
                        </div>
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                          <div className="text-slate-300 text-xs font-medium mb-2">Cost Value</div>
                          <div className="text-2xl font-bold text-white">₹{(medicineStockSummary.total_cost_value || 0).toLocaleString()}</div>
                          <div className="text-slate-300 text-xs mt-1">at purchase price</div>
                        </div>
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                          <div className="text-slate-300 text-xs font-medium mb-2">Retail Value</div>
                          <div className="text-2xl font-bold text-white">₹{(medicineStockSummary.total_retail_value || 0).toLocaleString()}</div>
                          <div className="text-slate-300 text-xs mt-1">at selling price</div>
                        </div>
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                          <div className="text-slate-300 text-xs font-medium mb-2">Critical Batches</div>
                          <div className="text-2xl font-bold text-red-300">{medicineStockSummary.critical_low_batches}</div>
                          <div className="text-slate-300 text-xs mt-1">low stock</div>
                        </div>
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                          <div className="text-slate-300 text-xs font-medium mb-2">Expiry Issues</div>
                          <div className="text-2xl font-bold text-amber-300">{medicineStockSummary.expired_batches + medicineStockSummary.expiring_soon_batches}</div>
                          <div className="text-slate-300 text-xs mt-1">expired/expiring</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions on right: Add Batch + Close */}
                  <button
                    onClick={() => {
                      setSelectedMedicine(selectedMedicineDetail)
                      setShowAddBatch(true)
                    }}
                    className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Batch
                  </button>
                  <button
                    onClick={() => {
                      setShowMedicineDetail(false)
                      setSelectedMedicineDetail(null)
                      setMedicineStockSummary(null)
                      setBatchStockTruth([])
                    }}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors ml-4"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
                {loadingMedicineDetail ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading medicine details...</p>
                  </div>
                ) : (comprehensiveMedicineData?.batches || selectedMedicineDetail.batches || []).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg mb-2">No batches available</p>
                    <p className="text-sm">Add the first batch to start tracking inventory</p>
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          setSelectedMedicine(selectedMedicineDetail)
                          setShowAddBatch(true)
                        }}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Batch
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(comprehensiveMedicineData?.batches || selectedMedicineDetail.batches || []).map((batch: any) => {
                      const isExpired = new Date(batch.expiry_date) < new Date()
                      const expSoon = isExpiringSoon(batch.expiry_date)
                      const batchStats = batchStatsMap[batch.batch_number]
                      // Use comprehensive current_stock for truth; fallback to legacy quantity
                      const remaining = (typeof batch.current_stock === 'number' ? batch.current_stock : batch.quantity) ?? 0
                      const derivedStatus = getBatchStatus(batch as any, remaining, selectedMedicineDetail?.min_stock_level || 0)

                      return (
                        <div key={batch.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          {/* Batch Header */}
                          <div className="p-4 border-b border-gray-100">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">{batch.batch_number}</h4>
                                <p className="text-sm text-gray-500">Supplier: {batch.supplier_name || batch.supplier}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(derivedStatus)}`}>
                                {derivedStatus.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Batch Details */}
                          <div className="p-4 space-y-4">
                            {/* Quantity & Pricing */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Current Stock</div>
                                <div className="text-xl font-bold text-gray-900">{remaining}</div>
                                {(() => {
                                  const receivedFromLedger = receivedTotalsMap[batch.batch_number]
                                  const totalSoldLedger = soldTotalsMap[batch.batch_number] || 0
                                  const current = typeof batch.current_stock === 'number' ? batch.current_stock : (typeof batch.quantity === 'number' ? batch.quantity : 0)
                                  const derivedFromLedger = current + totalSoldLedger
                                  const receivedFallback = (typeof batch.received_quantity === 'number' ? batch.received_quantity :
                                    typeof batch.original_quantity === 'number' ? batch.original_quantity : undefined)
                                  const receivedTotal = (typeof receivedFromLedger === 'number' && receivedFromLedger > 0)
                                    ? receivedFromLedger
                                    : (typeof receivedFallback === 'number' && receivedFallback > 0)
                                      ? receivedFallback
                                      : derivedFromLedger
                                  return (
                                    <div className="text-xs text-gray-500">
                                      Received: {Math.max(0, receivedTotal)}
                                    </div>
                                  )
                                })()}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Unit Selling Price</div>
                                <div className="text-xl font-bold text-green-600">₹{Number(batch.selling_price).toFixed(2)}</div>
                                <div className="text-xs text-gray-500">Unit Cost: ₹{Number(batch.unit_purchase_price || batch.purchase_price || batch.unit_cost).toFixed(2)}</div>
                              </div>
                            </div>

                            {/* Pack Information */}
                            {batch.pack_size && batch.pack_size > 1 && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <div className="text-xs text-blue-600 uppercase tracking-wide font-medium">Pack Size</div>
                                  <div className="text-lg font-bold text-blue-700">{batch.pack_size} units</div>
                                  <div className="text-xs text-blue-600 mt-1">
                                    Pack Count: {Math.floor(remaining / batch.pack_size)}
                                  </div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                  <div className="text-xs text-purple-600 uppercase tracking-wide font-medium">Pack Prices</div>
                                  <div className="text-sm font-semibold text-purple-700">
                                    MRP: ₹{Number(batch.pack_mrp || batch.selling_price * batch.pack_size).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-purple-600">
                                    Cost: ₹{Number(batch.pack_purchase_price || batch.purchase_price * batch.pack_size).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Dates */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Manufacturing:</span>
                                <span className="text-sm font-medium">{new Date(batch.manufacturing_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Received:</span>
                                <span className="text-sm font-medium">{new Date(batch.received_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Expiry:</span>
                                <span className={`text-sm font-medium flex items-center gap-1 ${isExpired ? 'text-red-600' : expSoon ? 'text-yellow-600' : 'text-gray-900'}`}>
                                  {(isExpired || expSoon) && (
                                    <AlertTriangle className={`w-4 h-4 ${isExpired ? 'text-red-500' : 'text-yellow-500'}`} />
                                  )}
                                  {new Date(batch.expiry_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-blue-50 rounded-lg p-2">
                                <div className="text-xs text-blue-600 font-medium">Sold This Month</div>
                                <div className="text-lg font-bold text-blue-700">{batchStats?.soldUnitsThisMonth ?? '—'}</div>
                              </div>
                              <div className="bg-green-50 rounded-lg p-2">
                                <div className="text-xs text-green-600 font-medium">Available</div>
                                <div className="text-lg font-bold text-green-700">{remaining}</div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                              <button
                                onClick={() => handleEditBatch(batch)}
                                className="flex-1 bg-slate-700 text-white px-2 py-2 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                                title="Edit Batch"
                              >
                                <Edit className="w-3 h-3" />
                                Edit
                              </button>
                              {isExpired && (
                                <button
                                  onClick={() => handleExpiredStockAdjustment(selectedMedicineDetail.id, batch.batch_number, selectedMedicineDetail.name)}
                                  className="flex-1 bg-orange-600 text-white px-2 py-2 rounded-lg text-xs font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-1"
                                  title="Adjust Expired Stock"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  Expired
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteBatch(batch.id)}
                                className={`${isExpired ? 'flex-1' : 'flex-1'} bg-red-600 text-white px-2 py-2 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1`}
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                              {!isExpired && (
                                <>
                                  <button
                                    onClick={() => printStandardLabel(batch as any, selectedMedicineDetail.name)}
                                    className="flex-1 bg-blue-600 text-white px-2 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    title="Print Standard Label"
                                  >
                                    <Printer className="w-3 h-3" />
                                    Print Label
                                  </button>
                                  <button
                                    onClick={() => {
                                      openBatchHistory(batch.batch_number)
                                      setShowMedicineDetail(false)
                                    }}
                                    className="flex-1 bg-gray-100 text-gray-700 px-2 py-2 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <History className="w-3 h-3" />
                                    History
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Purchase History Section */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Purchase History
                    </h3>
                  </div>

                  {loadingPurchases ? (
                    <div className="text-center py-8">Loading purchase history...</div>
                  ) : (comprehensiveMedicineData?.purchase_history || purchaseHistory).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg mb-2">No purchase history found</p>
                      <p className="text-sm">Purchase entries will appear here</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2">Date</th>
                            <th className="text-left py-3 px-2">Batch</th>
                            <th className="text-left py-3 px-2">Quantity</th>
                            <th className="text-left py-3 px-2">Unit Price</th>
                            <th className="text-left py-3 px-2">Total</th>
                            <th className="text-left py-3 px-2">Supplier</th>
                            <th className="text-left py-3 px-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(comprehensiveMedicineData?.purchase_history || purchaseHistory).map((purchase: any) => (
                            <tr key={purchase.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2">
                                {new Date(purchase.created_at || purchase.purchase_date).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-2">{purchase.batch_number || '—'}</td>
                              <td className="py-3 px-2">{purchase.quantity}</td>
                              <td className="py-3 px-2">₹{purchase.unit_price}</td>
                              <td className="py-3 px-2">₹{(purchase.quantity * purchase.unit_price).toFixed(0)}</td>
                              <td className="py-3 px-2">{purchase.supplier_name || '—'}</td>
                              <td className="py-3 px-2">
                                <button
                                  onClick={() => handleEditPurchase(purchase as any)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit Purchase"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Confirm Delete</h2>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this batch? This action cannot be undone and will remove all associated data.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setBatchToDelete(null)
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteBatch}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Batch
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Purchase Modal */}
        {showEditPurchase && editingPurchase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Purchase Entry</h2>
                <button
                  onClick={() => {
                    setShowEditPurchase(false)
                    setEditingPurchase(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={editingPurchase.batch_number || ''}
                    onChange={(e) => setEditingPurchase({ ...editingPurchase, batch_number: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={editingPurchase.quantity}
                    onChange={(e) => setEditingPurchase({ ...editingPurchase, quantity: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    value={editingPurchase.unit_price}
                    onChange={(e) => setEditingPurchase({ ...editingPurchase, unit_price: parseFloat(e.target.value) || 0 })}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editingPurchase.expiry_date || ''}
                    onChange={(e) => setEditingPurchase({ ...editingPurchase, expiry_date: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editingPurchase.notes || ''}
                    onChange={(e) => setEditingPurchase({ ...editingPurchase, notes: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowEditPurchase(false)
                      setEditingPurchase(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdatePurchase({
                      quantity: editingPurchase.quantity,
                      unit_price: editingPurchase.unit_price,
                      batch_number: editingPurchase.batch_number || undefined,
                      expiry_date: editingPurchase.expiry_date || undefined,
                      notes: editingPurchase.notes || undefined
                    })}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Purchase'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expired Stock Adjustment Modal */}
        {showExpiredStockModal && expiredBatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-orange-600">Adjust Expired Stock</h2>
                <button
                  onClick={() => {
                    setShowExpiredStockModal(false)
                    setExpiredBatch(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Medicine: <span className="font-medium">{expiredBatch.medicineName}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Batch: <span className="font-medium">{expiredBatch.batchNumber}</span>
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adjustment Type
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setExpiredAdjustmentType('delete')}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${expiredAdjustmentType === 'delete'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Delete Entire Batch
                      </button>
                      <button
                        onClick={() => setExpiredAdjustmentType('adjust')}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${expiredAdjustmentType === 'adjust'
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        Adjust Quantity
                      </button>
                    </div>
                  </div>

                  {expiredAdjustmentType === 'adjust' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Quantity
                      </label>
                      <input
                        type="number"
                        value={expiredAdjustmentQuantity}
                        onChange={(e) => setExpiredAdjustmentQuantity(parseInt(e.target.value) || 0)}
                        className="input"
                        min="0"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={expiredNotes}
                      onChange={(e) => setExpiredNotes(e.target.value)}
                      className="input"
                      rows={3}
                      placeholder="Reason for expired stock adjustment..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowExpiredStockModal(false)
                    setExpiredBatch(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessExpiredStock}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  disabled={loading || (expiredAdjustmentType === 'adjust' && expiredAdjustmentQuantity === 0)}
                >
                  {loading ? 'Processing...' : 'Process Adjustment'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}