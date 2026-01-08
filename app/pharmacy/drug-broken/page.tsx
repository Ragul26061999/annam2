'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Eye, XCircle, AlertTriangle, Package, Trash2
} from 'lucide-react'
import {
  getDrugBrokenRecords,
  createDrugBrokenRecord,
  DrugBrokenRecord
} from '@/src/lib/enhancedPharmacyService'
import { getMedications } from '@/src/lib/pharmacyService'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const DAMAGE_TYPES = [
  { value: 'broken', label: 'Broken', icon: '💔' },
  { value: 'leaked', label: 'Leaked', icon: '💧' },
  { value: 'contaminated', label: 'Contaminated', icon: '☣️' },
  { value: 'packaging_damaged', label: 'Packaging Damaged', icon: '📦' },
  { value: 'temperature_damage', label: 'Temperature Damage', icon: '🌡️' },
  { value: 'other', label: 'Other', icon: '❓' }
]

const DISPOSAL_METHODS = [
  { value: 'pending', label: 'Pending Decision' },
  { value: 'disposed', label: 'Disposed' },
  { value: 'returned_to_supplier', label: 'Returned to Supplier' },
  { value: 'insurance_claim', label: 'Insurance Claim' }
]

export default function DrugBrokenPage() {
  const [records, setRecords] = useState<DrugBrokenRecord[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    medication_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: 0,
    damage_type: 'broken' as const,
    damage_description: '',
    location: '',
    discoverer_name: '',
    disposal_method: 'pending' as const,
    remarks: ''
  })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    loadData()
  }, [filterType])

  const loadData = async () => {
    setLoading(true)
    try {
      const [recordsData, medsData] = await Promise.all([
        getDrugBrokenRecords({ damage_type: filterType || undefined }),
        getMedications()
      ])
      setRecords(recordsData)
      setMedications(medsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMedicationChange = (medId: string) => {
    const med = medications.find(m => m.id === medId)
    setFormData({
      ...formData,
      medication_id: medId
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.medication_id || !formData.batch_number || formData.quantity <= 0) {
      alert('Please fill all required fields')
      return
    }

    try {
      await createDrugBrokenRecord({
        ...formData,
        status: 'reported'
      })

      alert('Drug broken/damaged record created successfully!')
      setShowForm(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error creating record:', error)
      alert('Failed to create record')
    }
  }

  const resetForm = () => {
    setFormData({
      medication_id: '',
      batch_number: '',
      expiry_date: '',
      quantity: 0,
      damage_type: 'broken',
      damage_description: '',
      location: '',
      discoverer_name: '',
      disposal_method: 'pending',
      remarks: ''
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      reported: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-blue-100 text-blue-800',
      disposed: 'bg-green-100 text-green-800',
      claimed: 'bg-purple-100 text-purple-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.reported}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getDamageIcon = (type: string) => {
    const damageType = DAMAGE_TYPES.find(d => d.value === type)
    return damageType?.icon || '❓'
  }

  const totalLoss = records.reduce((sum, r) => sum + (r.total_loss || 0), 0)

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drug Broken / Damaged</h1>
          <p className="text-gray-600">Track damaged, broken, or expired drugs</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-amber-700"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Report Damage
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Records</div>
          <div className="text-2xl font-bold">{records.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Loss</div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalLoss)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Pending Disposal</div>
          <div className="text-2xl font-bold text-yellow-600">
            {records.filter(r => r.disposal_method === 'pending').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">This Month</div>
          <div className="text-2xl font-bold text-blue-600">
            {records.filter(r => new Date(r.record_date).getMonth() === new Date().getMonth()).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by record number or medicine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="">All Damage Types</option>
            {DAMAGE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loss</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disposal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.filter(r => 
              !searchTerm || 
              r.record_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.medication_name?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-amber-600">{record.record_number}</td>
                <td className="px-6 py-4 text-sm">{formatDate(record.record_date)}</td>
                <td className="px-6 py-4 text-sm">{record.medication_name}</td>
                <td className="px-6 py-4 text-sm">{record.batch_number}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="flex items-center">
                    <span className="mr-2">{getDamageIcon(record.damage_type)}</span>
                    <span className="capitalize">{record.damage_type.replace('_', ' ')}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium">{record.quantity}</td>
                <td className="px-6 py-4 text-sm font-medium text-red-600">{formatCurrency(record.total_loss || 0)}</td>
                <td className="px-6 py-4 text-sm capitalize">{record.disposal_method?.replace('_', ' ')}</td>
                <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-500">No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Record Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                Report Drug Damage
              </h2>
              <button onClick={() => setShowForm(false)}><XCircle className="w-6 h-6 text-gray-500" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Medicine *</label>
                  <select
                    value={formData.medication_id}
                    onChange={(e) => handleMedicationChange(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Medicine</option>
                    {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Batch Number *</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity Damaged *</label>
                  <input
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    className="w-full border rounded-lg px-3 py-2"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Damage Type *</label>
                  <select
                    value={formData.damage_type}
                    onChange={(e) => setFormData({...formData, damage_type: e.target.value as any})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    {DAMAGE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Storage location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discovered By</label>
                  <input
                    type="text"
                    value={formData.discoverer_name}
                    onChange={(e) => setFormData({...formData, discoverer_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Name of person who discovered"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Disposal Method</label>
                  <select
                    value={formData.disposal_method}
                    onChange={(e) => setFormData({...formData, disposal_method: e.target.value as any})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {DISPOSAL_METHODS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Damage Description</label>
                <textarea
                  value={formData.damage_description}
                  onChange={(e) => setFormData({...formData, damage_description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Describe how the damage occurred..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-amber-600 text-white rounded-lg">Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
