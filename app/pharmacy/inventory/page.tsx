'use client'

import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Package, Calendar, AlertTriangle, Filter, History, Layers, Clock, Eye, Printer, Info } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { getBatchPurchaseHistory, getBatchStockStats } from '@/src/lib/pharmacyService'
import { supabase } from '@/src/lib/supabase'
import type { BatchPurchaseHistoryEntry } from '@/src/lib/pharmacyService'
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

export default function InventoryPage({ embedded = false }: { embedded?: boolean }) {
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
  const [showMedicineDetail, setShowMedicineDetail] = useState(false)
  const [selectedMedicineDetail, setSelectedMedicineDetail] = useState<Medicine | null>(null)
  const [showEditBatch, setShowEditBatch] = useState(false)
  const [editingBatch, setEditingBatch] = useState<MedicineBatch | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null)
  const [showDeleteMedicineConfirm, setShowDeleteMedicineConfirm] = useState(false)
  const [medicineToDelete, setMedicineToDelete] = useState<Medicine | null>(null)
  const [showEditMedicine, setShowEditMedicine] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
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
        return {
          id: m.id,
          name: m.name,
          category: m.category,
          description: '',
          manufacturer: m.manufacturer,
          unit: m.dosage_form || 'units',
          total_stock: Number(m.available_stock ?? 0),
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
    
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'low_stock' && medicine.total_stock <= medicine.min_stock_level) ||
                         (statusFilter === 'expired' && medicine.batches.some(batch => new Date(batch.expiry_date) < new Date())) ||
                         (statusFilter === 'active' && medicine.total_stock > medicine.min_stock_level)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const getStockStatus = (medicine: Medicine) => {
    const hasExpiredBatches = medicine.batches.some(batch => new Date(batch.expiry_date) < new Date())
    if (hasExpiredBatches) return 'expired'
    if (medicine.total_stock <= medicine.min_stock_level) return 'low_stock'
    return 'active'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return 'bg-red-100 text-red-800'
      case 'low_stock': return 'bg-yellow-100 text-yellow-800'
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

  const openBatchHistory = async (batchNumber: string) => {
    try {
      setShowHistoryModal(true)
      setHistoryBatchNumber(batchNumber)
      setHistoryLoading(true)
      const entries = await getBatchPurchaseHistory(batchNumber)
      setHistoryEntries(entries)
    } catch (e) {
      console.error('Failed to load batch history', e)
      setHistoryEntries([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const openMedicineDetail = (medicine: Medicine) => {
    setSelectedMedicineDetail(medicine)
    setShowMedicineDetail(true)
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
                  <span><strong>Qty:</strong> ${batch.quantity}</span>
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
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Batch Purchase History - {historyBatchNumber}</h2>
              <button onClick={() => { setShowHistoryModal(false); setHistoryEntries([]); setHistoryBatchNumber(''); }} className="btn-secondary">Close</button>
            </div>
            {historyLoading ? (
              <div className="text-center py-8">Loading history...</div>
            ) : historyEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No purchases found for this batch.</div>
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
                    {historyEntries.map((entry) => (
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
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedMedicineDetail.name}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-blue-100">
                    <div>Category: {selectedMedicineDetail.category}</div>
                    <div>Manufacturer: {selectedMedicineDetail.manufacturer}</div>
                    <div>Total Stock: {selectedMedicineDetail.total_stock}</div>
                    <div>Expired Stock: {selectedMedicineDetail.batches.reduce((sum, b) => sum + (new Date(b.expiry_date) < new Date() ? b.quantity : 0), 0)}</div>
                    <div>Min Level: {selectedMedicineDetail.min_stock_level}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMedicineDetail(false)
                    setSelectedMedicineDetail(null)
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Batches ({selectedMedicineDetail.batches.length})
                </h3>
                <button
                  onClick={() => {
                    setSelectedMedicine(selectedMedicineDetail)
                    setShowAddBatch(true)
                    setShowMedicineDetail(false)
                  }}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Batch
                </button>
              </div>

              {selectedMedicineDetail.batches.length === 0 ? (
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
                    
                    return (
                      <div key={batch.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        {/* Batch Header */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{batch.batch_number}</h4>
                              <p className="text-sm text-gray-500">Supplier: {batch.supplier}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                              {batch.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Batch Details */}
                        <div className="p-4 space-y-4">
                          {/* Quantity & Pricing */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Current Stock</div>
                              <div className="text-xl font-bold text-gray-900">{batch.quantity}</div>
                              <div className="text-xs text-gray-500">Remaining: {batchStats?.remainingUnits ?? '—'}</div>
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
                            <button
                              onClick={() => handleEditBatch(batch)}
                              className="flex-1 bg-green-600 text-white px-2 py-2 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBatch(batch.id)}
                              className="flex-1 bg-red-600 text-white px-2 py-2 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                            <button
                              onClick={() => printBatchLabel(batch, selectedMedicineDetail.name)}
                              className="flex-1 bg-blue-600 text-white px-2 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              Print
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
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
    </div>
  )
}