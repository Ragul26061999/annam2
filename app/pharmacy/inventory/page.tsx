'use client'

import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Package, Calendar, AlertTriangle, Filter, History, Layers, Clock, Eye, Printer, Info, RefreshCw, X } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { getBatchPurchaseHistory, getBatchStockStats, editStockTransaction, adjustExpiredStock, getBatchStockRobust, getMedicationStockRobust, getStockTruth, getMedicineStockSummary, reconcileStock } from '@/src/lib/pharmacyService'
import { supabase } from '@/src/lib/supabase'
import type { BatchPurchaseHistoryEntry, StockTransaction, StockTruthRecord, MedicineStockSummary } from '@/src/lib/pharmacyService'
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
}

interface Medicine {
  id: string
  name: string
  category: string
  description?: string
  manufacturer: string
  unit: string
  total_stock: number
  min_stock_level: number
  batches: MedicineBatch[]
  medication_code?: string
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
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddMedicine, setShowAddMedicine] = useState(false)
  const [showAddBatch, setShowAddBatch] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyBatchNumber, setHistoryBatchNumber] = useState<string>('')
  const [historyEntries, setHistoryEntries] = useState<BatchPurchaseHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'this_month' | 'last_3_months'>('all')
  const [showMedicineDetail, setShowMedicineDetail] = useState(false)
  const [selectedMedicineDetail, setSelectedMedicineDetail] = useState<Medicine | null>(null)
  const [medicineStockSummary, setMedicineStockSummary] = useState<MedicineStockSummary | null>(null)
  const [batchStockTruth, setBatchStockTruth] = useState<StockTruthRecord[]>([])
  const [loadingMedicineDetail, setLoadingMedicineDetail] = useState(false)
  const [showEditBatch, setShowEditBatch] = useState(false)
  const [editingBatch, setEditingBatch] = useState<MedicineBatch | null>(null)
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
  const [expiredBatch, setExpiredBatch] = useState<{medicineId: string; batchNumber: string; medicineName: string} | null>(null)
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

  const categories = ['Analgesic', 'Antibiotic', 'Antacid', 'Vitamin', 'Antiseptic', 'Other']
  const units = ['tablets', 'capsules', 'ml', 'mg', 'bottles', 'tubes', 'sachets']

  useEffect(() => {
    loadMedicines()
  }, [])

  useEffect(() => {
    // Whenever medicines (and their batches) change, fetch per-batch stats from DB
    const batchNumbers = Array.from(new Set(
      medicines.flatMap(m => m.batches.map(b => b.batch_number))
    ))
    if (batchNumbers.length === 0) return
    ;(async () => {
      try {
        const results: Record<string, { remainingUnits: number; soldUnitsThisMonth: number; purchasedUnitsThisMonth: number }> = {}
        await Promise.all(batchNumbers.map(async (bn) => {
          try {
            const stats = await getBatchStockStats(bn)
            results[bn] = stats
          } catch (e) {
            console.error('Failed to load batch stats for', bn, e)
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
      // Fetch active medications
      const { data: meds, error: medsError } = await supabase
        .from('medications')
        .select('id, name, category, manufacturer, available_stock, minimum_stock_level, dosage_form')
        .eq('status', 'active')
        .order('name')

      if (medsError) throw medsError

      const medIds = (meds || []).map(m => m.id)
      // Fetch batches for these medications
      const { data: batches, error: batchesError } = await supabase
        .from('medicine_batches')
        .select('id, medicine_id, batch_number, manufacturing_date, expiry_date, current_quantity, purchase_price, selling_price, received_date, status, supplier_id')
        .in('medicine_id', medIds.length ? medIds : ['00000000-0000-0000-0000-000000000000'])

      if (batchesError) throw batchesError

      // Fetch suppliers referenced by batches
      const supplierIds = Array.from(new Set((batches || []).map(b => b.supplier_id).filter(Boolean))) as string[]
      let suppliersMap: Record<string, string> = {}
      if (supplierIds.length > 0) {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id, name')
          .in('id', supplierIds)
        suppliersMap = Object.fromEntries((suppliers || []).map(s => [s.id, s.name]))
      }

      const mapped: Medicine[] = (meds || []).map((m: any) => {
        const mBatches = (batches || []).filter(b => b.medicine_id === m.id)
        const batchesMapped: MedicineBatch[] = mBatches.map((b: any) => ({
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
          received_date: b.received_date || b.manufacturing_date || ''
        }))
        // Calculate total stock from batches to ensure consistency with modal
        const calculatedTotalStock = batchesMapped.reduce((sum, batch) => sum + batch.quantity, 0)
        return {
          id: m.id,
          name: m.name,
          category: m.category,
          description: '',
          manufacturer: m.manufacturer,
          unit: m.dosage_form || 'units',
          total_stock: calculatedTotalStock,
          min_stock_level: Number(m.minimum_stock_level ?? 0),
          batches: batchesMapped
        }
      })

      setMedicines(mapped)
    } catch (err) {
      console.error('loadMedicines failed', err)
      setError('Failed to load medicines')
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
          category: editingMedicine.category,
          manufacturer: editingMedicine.manufacturer,
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

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medicine.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medicine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !categoryFilter || medicine.category === categoryFilter
    
    const matchesStatus = statusFilter === '' || 
                         (statusFilter === 'low_stock' && medicine.total_stock <= medicine.min_stock_level && medicine.total_stock > 0) ||
                         (statusFilter === 'expired' && medicine.batches.some(batch => new Date(batch.expiry_date) < new Date())) ||
                         (statusFilter === 'active' && medicine.total_stock > medicine.min_stock_level) ||
                         (statusFilter === 'out_of_stock' && medicine.total_stock <= 0)
    
    return matchesSearch && matchesCategory && matchesStatus
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
      // Use definitive stock truth system
      const stockTruth = await getStockTruth(undefined, batchNumber)
      
      if (stockTruth && stockTruth.length > 0) {
        const batch = stockTruth[0]
        setBatchStatsMap(prev => ({
          ...prev,
          [batchNumber]: {
            remainingUnits: batch.current_quantity,
            soldUnitsThisMonth: batch.total_sold || 0,
            purchasedUnitsThisMonth: batch.total_purchased || 0
          }
        }))
      } else {
        // Fallback to legacy function if no truth data
        const legacyStats = await getBatchStockStats(batchNumber)
        setBatchStatsMap(prev => ({
          ...prev,
          [batchNumber]: legacyStats
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
      
      // Load definitive stock data
      const [stockSummary, stockTruth] = await Promise.all([
        getMedicineStockSummary(medicine.id),
        getStockTruth(medicine.id),
        loadPurchaseHistory(medicine.id)
      ])
      
      setMedicineStockSummary(stockSummary)
      setBatchStockTruth(stockTruth)
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
      setShowHistoryModal(true)
    } catch (error) {
      console.error('Error loading batch history:', error)
      setHistoryEntries([])
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

  const handleEditBatch = (batch: MedicineBatch) => {
    console.log('Edit batch clicked:', batch.batch_number)
    setEditingBatch(batch)
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
              Printed: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', {hour12: false})}
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
      
      // Format dates outside template literal to avoid parsing issues
      const expiryDate = new Date(batch.expiry_date).toLocaleDateString('en-GB')
      const printDate = new Date().toLocaleDateString('en-GB')
      const printTime = new Date().toLocaleTimeString('en-GB', {hour12: false, hour: '2-digit', minute: '2-digit'})
      
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
            
            <div class="medicine-name">${medicineName.length > 20 ? medicineName.substring(0, 20) + '...' : medicineName}</div>
            
            <div class="batch-info">
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header (hidden in embedded mode) */}
      {!embedded && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medicine Inventory</h1>
            <p className="text-gray-600 mt-1">Manage medicines with batch-wise tracking</p>
          </div>
          <button
            onClick={() => setShowAddMedicine(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medicine
          </button>
        </div>
      )}

  {/* Edit Medicine Modal */}
  {showEditMedicine && editingMedicine && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Edit Medicine</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editingMedicine.name}
              onChange={(e) => setEditingMedicine({ ...editingMedicine, name: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={editingMedicine.category}
              onChange={(e) => setEditingMedicine({ ...editingMedicine, category: e.target.value })}
              className="input"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <input
              type="text"
              value={editingMedicine.manufacturer}
              onChange={(e) => setEditingMedicine({ ...editingMedicine, manufacturer: e.target.value })}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
              <input
                type="number"
                value={editingMedicine.min_stock_level}
                onChange={(e) => setEditingMedicine({ ...editingMedicine, min_stock_level: parseInt(e.target.value) || 0 })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
              <select
                value={editingMedicine.unit}
                onChange={(e) => setEditingMedicine({ ...editingMedicine, unit: e.target.value })}
                className="input"
              >
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => { setShowEditMedicine(false); setEditingMedicine(null) }}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button onClick={saveEditedMedicine} className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
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

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search medicines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="expired">Expired</option>
          </select>
          
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="w-4 h-4 mr-1" />
            {filteredMedicines.length} medicines
          </div>
        </div>
      </div>

      {/* Dashboard KPIs (Patients page style using StatCard) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {(() => {
          const stats = dashboardStats()
          return (
            <>
              <StatCard title="Total Medicines" value={String(stats.totalMedicines)} icon={<Package className="w-5 h-5 text-gray-600" />} />
              <StatCard title="Total Batches" value={String(stats.totalBatches)} icon={<Layers className="w-5 h-5 text-gray-600" />} />
              <StatCard title="Low Stock" value={String(stats.lowStock)} icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />} />
              <StatCard title="Expiring Soon" value={String(stats.expiringSoon)} icon={<Clock className="w-5 h-5 text-orange-600" />} />
              <StatCard title="Expired" value={String(stats.expired)} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} />
            </>
          )
        })()}
      </div>

      {/* Overall Remaining Stock card removed per request */}

      {/* Medicines Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-pulse" />
            <p>Loading medicines...</p>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No medicines found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Medicine Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Manufacturer</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Stock</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Batches</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map((medicine) => {
                  const status = getStockStatus(medicine)
                  return (
                    <tr 
                      key={medicine.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => openMedicineDetail(medicine)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{medicine.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{medicine.category}</td>
                      <td className="py-4 px-4 text-gray-600">{medicine.manufacturer}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-sm">
                          <div className="font-semibold">{medicine.total_stock}</div>
                          <div className="text-gray-500">Min: {medicine.min_stock_level}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                          {medicine.batches.length}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditMedicine(medicine)
                            }}
                            className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
                            title="Edit Medicine"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="text-sm font-medium">Edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteMedicine(medicine)
                            }}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded flex items-center gap-1"
                            title="Delete Medicine"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add Batch Modal */}
      {showAddBatch && selectedMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Add New Batch - {selectedMedicine.name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={newBatch.batch_number}
                  onChange={(e) => setNewBatch({...newBatch, batch_number: e.target.value})}
                  className="input"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturing Date *
                  </label>
                  <input
                    type="date"
                    value={newBatch.manufacturing_date}
                    onChange={(e) => setNewBatch({...newBatch, manufacturing_date: e.target.value})}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={newBatch.expiry_date}
                    onChange={(e) => setNewBatch({...newBatch, expiry_date: e.target.value})}
                    className="input"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={newBatch.quantity}
                    onChange={(e) => setNewBatch({...newBatch, quantity: parseInt(e.target.value)})}
                    className="input"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBatch.unit_cost}
                    onChange={(e) => setNewBatch({...newBatch, unit_cost: parseFloat(e.target.value)})}
                    className="input"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBatch.selling_price}
                    onChange={(e) => setNewBatch({...newBatch, selling_price: parseFloat(e.target.value)})}
                    className="input"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                <input
                  type="text"
                  value={newBatch.supplier}
                  onChange={(e) => setNewBatch({...newBatch, supplier: e.target.value})}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newBatch.notes}
                  onChange={(e) => setNewBatch({...newBatch, notes: e.target.value})}
                  className="input"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddBatch(false)
                  setSelectedMedicine(null)
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBatch}
                className="btn-primary"
                disabled={loading || !newBatch.batch_number || !newBatch.manufacturing_date || !newBatch.expiry_date || !newBatch.supplier}
              >
                {loading ? 'Adding...' : 'Add Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Purchase History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Batch Purchase History - {historyBatchNumber}</h2>
              <button onClick={() => { setShowHistoryModal(false); setHistoryEntries([]); setHistoryBatchNumber(''); }} className="btn-secondary">Close</button>
            </div>
            
            {/* Time Filters */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  historyFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setHistoryFilter('this_month')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  historyFilter === 'this_month' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setHistoryFilter('last_3_months')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  historyFilter === 'last_3_months' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 3 Months
              </button>
            </div>

            {historyLoading ? (
              <div className="text-center py-8">Loading history...</div>
            ) : getFilteredHistoryEntries().length === 0 ? (
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
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        medicineStockSummary.overall_alert_level === 'CRITICAL' ? 'bg-red-600 text-white' :
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
                      <div className="text-slate-300 text-xs font-medium mb-1">Category</div>
                      <div className="text-white font-semibold">{selectedMedicineDetail.category}</div>
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
                        <div className="text-2xl font-bold text-white">₹{medicineStockSummary.total_cost_value}</div>
                        <div className="text-slate-300 text-xs mt-1">at purchase price</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                        <div className="text-slate-300 text-xs font-medium mb-2">Retail Value</div>
                        <div className="text-2xl font-bold text-white">₹{medicineStockSummary.total_retail_value}</div>
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
              ) : selectedMedicineDetail.batches.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg mb-2">No batches available</p>
                  <p className="text-sm">Add the first batch to start tracking inventory</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedMedicineDetail.batches.map((batch) => {
                    const isExpired = new Date(batch.expiry_date) < new Date()
                    const expSoon = isExpiringSoon(batch.expiry_date)
                    const batchStats = batchStatsMap[batch.batch_number]
                    const remaining = batchStats?.remainingUnits ?? batch.quantity
                    const derivedStatus = getBatchStatus(batch, remaining, selectedMedicineDetail?.min_stock_level || 0)
                    
                    return (
                      <div key={batch.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        {/* Batch Header */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{batch.batch_number}</h4>
                              <p className="text-sm text-gray-500">Supplier: {batch.supplier}</p>
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
                              <div className="text-xl font-bold text-gray-900">{batchStats?.remainingUnits ?? batch.quantity}</div>
                              <div className="text-xs text-gray-500">Purchased: {batchStats?.purchasedUnitsThisMonth ?? '—'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Selling Price</div>
                              <div className="text-xl font-bold text-green-600">₹{batch.selling_price}</div>
                              <div className="text-xs text-gray-500">Cost: ₹{batch.unit_cost}</div>
                            </div>
                          </div>

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
                              <div className="text-lg font-bold text-green-700">{batchStats?.remainingUnits ?? '—'}</div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t border-gray-100">
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
                              onClick={() => handleEditBatch(batch)}
                              className={`${isExpired ? 'flex-1' : 'flex-1'} bg-green-600 text-white px-2 py-2 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1`}
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
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
                                  onClick={() => printStandardLabel(batch, selectedMedicineDetail.name)}
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
                  <button
                    onClick={() => loadPurchaseHistory(selectedMedicineDetail.id)}
                    className="btn-secondary"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </button>
                </div>
                
                {loadingPurchases ? (
                  <div className="text-center py-8">Loading purchase history...</div>
                ) : purchaseHistory.length === 0 ? (
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
                          <th className="text-left py-3 px-2">Expiry</th>
                          <th className="text-left py-3 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseHistory.map((purchase) => (
                          <tr key={purchase.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2">
                              {new Date(purchase.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-2">{purchase.batch_number || '—'}</td>
                            <td className="py-3 px-2">{purchase.quantity}</td>
                            <td className="py-3 px-2">₹{purchase.unit_price}</td>
                            <td className="py-3 px-2">₹{(purchase.quantity * purchase.unit_price).toFixed(2)}</td>
                            <td className="py-3 px-2">
                              {purchase.expiry_date ? new Date(purchase.expiry_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-2">
                              <button
                                onClick={() => handleEditPurchase(purchase)}
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

      {/* Edit Batch Modal */}
      {showEditBatch && editingBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Edit Batch - {editingBatch.batch_number}</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturing Date *
                  </label>
                  <input
                    type="date"
                    value={editingBatch.manufacturing_date}
                    onChange={(e) => setEditingBatch({...editingBatch, manufacturing_date: e.target.value})}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={editingBatch.expiry_date}
                    onChange={(e) => setEditingBatch({...editingBatch, expiry_date: e.target.value})}
                    className="input"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={editingBatch.quantity}
                    onChange={(e) => setEditingBatch({...editingBatch, quantity: parseInt(e.target.value)})}
                    className="input"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingBatch.unit_cost}
                    onChange={(e) => setEditingBatch({...editingBatch, unit_cost: parseFloat(e.target.value)})}
                    className="input"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingBatch.selling_price}
                    onChange={(e) => setEditingBatch({...editingBatch, selling_price: parseFloat(e.target.value)})}
                    className="input"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                <input
                  type="text"
                  value={editingBatch.supplier}
                  onChange={(e) => setEditingBatch({...editingBatch, supplier: e.target.value})}
                  className="input"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditBatch(false)
                  setEditingBatch(null)
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    setLoading(true)
                    const { error } = await supabase
                      .from('medicine_batches')
                      .update({
                        manufacturing_date: editingBatch.manufacturing_date,
                        expiry_date: editingBatch.expiry_date,
                        current_quantity: editingBatch.quantity,
                        purchase_price: editingBatch.unit_cost,
                        selling_price: editingBatch.selling_price
                      })
                      .eq('id', editingBatch.id)
                    
                    if (error) throw error
                    
                    await loadMedicines()
                    setShowEditBatch(false)
                    setEditingBatch(null)
                    
                    // Update selected medicine detail
                    if (selectedMedicineDetail) {
                      const updatedMedicine = medicines.find(m => m.id === selectedMedicineDetail.id)
                      if (updatedMedicine) {
                        setSelectedMedicineDetail(updatedMedicine)
                      }
                    }
                    
                    alert('Batch updated successfully!')
                  } catch (error: any) {
                    alert('Failed to update batch: ' + error.message)
                  } finally {
                    setLoading(false)
                  }
                }}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Batch'}
              </button>
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
                  onChange={(e) => setEditingPurchase({...editingPurchase, batch_number: e.target.value})}
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
                  onChange={(e) => setEditingPurchase({...editingPurchase, quantity: parseInt(e.target.value) || 0})}
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
                  onChange={(e) => setEditingPurchase({...editingPurchase, unit_price: parseFloat(e.target.value) || 0})}
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
                  onChange={(e) => setEditingPurchase({...editingPurchase, expiry_date: e.target.value})}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editingPurchase.notes || ''}
                  onChange={(e) => setEditingPurchase({...editingPurchase, notes: e.target.value})}
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
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                        expiredAdjustmentType === 'delete'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Delete Entire Batch
                    </button>
                    <button
                      onClick={() => setExpiredAdjustmentType('adjust')}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                        expiredAdjustmentType === 'adjust'
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
  )
}