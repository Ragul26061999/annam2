'use client'

import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Package, Calendar, AlertTriangle, Filter, History, Layers, Clock } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { getBatchPurchaseHistory, getBatchStockStats } from '@/src/lib/pharmacyService'
import type { BatchPurchaseHistoryEntry } from '@/src/lib/pharmacyService'

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
      // Mock data - replace with actual API calls
      const mockMedicines: Medicine[] = [
        {
          id: 'm1',
          name: 'Paracetamol 500mg',
          category: 'Analgesic',
          description: 'Pain relief and fever reducer',
          manufacturer: 'ABC Pharma',
          unit: 'tablets',
          total_stock: 150,
          min_stock_level: 20,
          batches: [
            {
              id: 'b1',
              medicine_id: 'm1',
              batch_number: 'PAR001',
              manufacturing_date: '2024-01-15',
              expiry_date: '2025-12-31',
              quantity: 100,
              unit_cost: 3.00,
              selling_price: 5.00,
              supplier: 'MedSupply Co.',
              status: 'active',
              received_date: '2024-02-01'
            },
            {
              id: 'b2',
              medicine_id: 'm1',
              batch_number: 'PAR002',
              manufacturing_date: '2024-03-10',
              expiry_date: '2026-02-28',
              quantity: 50,
              unit_cost: 3.20,
              selling_price: 5.00,
              supplier: 'MedSupply Co.',
              status: 'active',
              received_date: '2024-03-15'
            }
          ]
        },
        {
          id: 'm2',
          name: 'Amoxicillin 250mg',
          category: 'Antibiotic',
          description: 'Broad-spectrum antibiotic',
          manufacturer: 'XYZ Pharmaceuticals',
          unit: 'capsules',
          total_stock: 25,
          min_stock_level: 30,
          batches: [
            {
              id: 'b3',
              medicine_id: 'm2',
              batch_number: 'AMX001',
              manufacturing_date: '2024-02-01',
              expiry_date: '2025-06-30',
              quantity: 25,
              unit_cost: 12.00,
              selling_price: 15.00,
              supplier: 'PharmaDist Ltd.',
              status: 'low_stock',
              received_date: '2024-02-10'
            }
          ]
        }
      ]
      setMedicines(mockMedicines)
    } catch (err) {
      setError('Failed to load medicines')
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
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
              <StatCard title="Total Medicines" value={String(stats.totalMedicines)} change="—" trend="up" icon={<Package className="w-5 h-5 text-gray-600" />} />
              <StatCard title="Total Batches" value={String(stats.totalBatches)} change="—" trend="up" icon={<Layers className="w-5 h-5 text-gray-600" />} />
              <StatCard title="Low Stock" value={String(stats.lowStock)} change="—" trend="down" icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />} />
              <StatCard title="Expiring Soon" value={String(stats.expiringSoon)} change="—" trend="down" icon={<Clock className="w-5 h-5 text-orange-600" />} />
              <StatCard title="Expired" value={String(stats.expired)} change="—" trend="down" icon={<AlertTriangle className="w-5 h-5 text-red-600" />} />
            </>
          )
        })()}
      </div>

      {/* Overall Remaining Stock card removed per request */}

      {/* Medicines List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading medicines...</div>
        ) : filteredMedicines.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No medicines found</p>
          </div>
        ) : (
          filteredMedicines.map((medicine) => {
            const status = getStockStatus(medicine)
            return (
              <div key={medicine.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{medicine.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>Category: {medicine.category}</div>
                      <div>Manufacturer: {medicine.manufacturer}</div>
                      <div>Total Stock: {medicine.total_stock} {medicine.unit}</div>
                      <div>Min Level: {medicine.min_stock_level} {medicine.unit}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMedicine(medicine)
                      setShowAddBatch(true)
                    }}
                    className="btn-secondary flex items-center text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Batch
                  </button>
                </div>

                {/* Batches - Card Grid */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Batches ({medicine.batches.length})</h4>
                  {medicine.batches.length === 0 ? (
                    <p className="text-gray-500 text-sm">No batches available</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {medicine.batches.map((batch) => {
                        const isExpired = new Date(batch.expiry_date) < new Date()
                        const expSoon = isExpiringSoon(batch.expiry_date)
                        return (
                          <div key={batch.id} className="card p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm text-gray-500">Batch</div>
                                <div className="text-lg font-semibold">{batch.batch_number}</div>
                                <div className="text-xs text-gray-500 mt-1">Supplier: {batch.supplier}</div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                                {batch.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                              <div>
                                <div className="text-gray-500">Quantity</div>
                                <div className="font-medium">{batch.quantity}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Unit Cost</div>
                                <div className="font-medium">₹{batch.unit_cost}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Selling Price</div>
                                <div className="font-medium">₹{batch.selling_price}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Received</div>
                                <div className="font-medium">{new Date(batch.received_date).toLocaleDateString()}</div>
                              </div>
                            </div>
                          <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                            <div>
                              <div className="text-gray-500">Mfg Date</div>
                              <div className="font-medium flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {new Date(batch.manufacturing_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Expiry</div>
                              <div className={`font-medium flex items-center gap-1 ${isExpired ? 'text-red-600' : expSoon ? 'text-yellow-600' : ''}`}>
                                {(isExpired || expSoon) && (
                                  <AlertTriangle className={`w-4 h-4 ${isExpired ? 'text-red-500' : 'text-yellow-500'}`} />
                                )}
                                {new Date(batch.expiry_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          {/* Batch Stock Stats (DB-backed, Purchased hidden per request) */}
                          <div className="grid grid-cols-2 gap-3 text-sm mt-4">
                            <div className="bg-gray-50 rounded-md p-2">
                              <div className="text-gray-500 flex items-center gap-1">
                                <Package className="w-4 h-4 text-gray-400" /> Remaining
                              </div>
                              <div className="font-semibold">{batchStatsMap[batch.batch_number]?.remainingUnits ?? '—'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-md p-2">
                              <div className="text-gray-500 flex items-center gap-1">
                                <History className="w-4 h-4 text-gray-400" /> Sold (This Month)
                              </div>
                              <div className="font-semibold">{batchStatsMap[batch.batch_number]?.soldUnitsThisMonth ?? '—'}</div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <button
                              onClick={() => openBatchHistory(batch.batch_number)}
                              className="btn-secondary flex items-center text-sm"
                            >
                                <History className="w-4 h-4 mr-1" />
                                History
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Medicine Modal */}
      {showAddMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Add New Medicine</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={newMedicine.category}
                  onChange={(e) => setNewMedicine({...newMedicine, category: e.target.value})}
                  className="input"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer *
                </label>
                <input
                  type="text"
                  value={newMedicine.manufacturer}
                  onChange={(e) => setNewMedicine({...newMedicine, manufacturer: e.target.value})}
                  className="input"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    value={newMedicine.unit}
                    onChange={(e) => setNewMedicine({...newMedicine, unit: e.target.value})}
                    className="input"
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock Level *
                  </label>
                  <input
                    type="number"
                    value={newMedicine.min_stock_level}
                    onChange={(e) => setNewMedicine({...newMedicine, min_stock_level: parseInt(e.target.value)})}
                    className="input"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newMedicine.description}
                  onChange={(e) => setNewMedicine({...newMedicine, description: e.target.value})}
                  className="input"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddMedicine(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMedicine}
                className="btn-primary"
                disabled={loading || !newMedicine.name || !newMedicine.category || !newMedicine.manufacturer}
              >
                {loading ? 'Adding...' : 'Add Medicine'}
              </button>
            </div>
          </div>
        </div>
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
    </div>
  )
}