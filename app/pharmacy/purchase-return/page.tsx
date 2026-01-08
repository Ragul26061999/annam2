'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Eye, Package, Calendar, IndianRupee, XCircle,
  RotateCcw, CheckCircle, Clock, AlertTriangle
} from 'lucide-react'
import {
  getSuppliers,
  getPurchaseReturns,
  createPurchaseReturn,
  Supplier,
  PurchaseReturn,
  PurchaseReturnItem
} from '@/src/lib/enhancedPharmacyService'
import { getMedications } from '@/src/lib/pharmacyService'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const RETURN_REASONS = [
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'excess_stock', label: 'Excess Stock' },
  { value: 'other', label: 'Other' }
]

export default function PurchaseReturnPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    return_date: new Date().toISOString().split('T')[0],
    reason: 'expired' as const,
    reason_details: ''
  })
  
  const [items, setItems] = useState<PurchaseReturnItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [returnsData, suppliersData, medsData] = await Promise.all([
        getPurchaseReturns(),
        getSuppliers({ status: 'active' }),
        getMedications()
      ])
      setReturns(returnsData)
      setSuppliers(suppliersData)
      setMedications(medsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, {
      medication_id: '',
      batch_number: '',
      quantity: 0,
      unit_price: 0,
      gst_percent: 12,
      gst_amount: 0,
      total_amount: 0
    }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    const item = newItems[index]
    const subtotal = item.quantity * item.unit_price
    const gstAmount = subtotal * (item.gst_percent || 0) / 100
    item.gst_amount = gstAmount
    item.total_amount = subtotal + gstAmount
    
    if (field === 'medication_id') {
      const med = medications.find(m => m.id === value)
      if (med) {
        item.unit_price = med.purchase_price || 0
      }
    }
    
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.supplier_id || items.length === 0) {
      alert('Please select a supplier and add at least one item')
      return
    }

    try {
      await createPurchaseReturn({
        ...formData,
        status: 'submitted'
      }, items)

      alert('Purchase return created successfully!')
      setShowForm(false)
      setFormData({
        supplier_id: '',
        return_date: new Date().toISOString().split('T')[0],
        reason: 'expired',
        reason_details: ''
      })
      setItems([])
      loadData()
    } catch (error) {
      console.error('Error creating return:', error)
      alert('Failed to create return')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.total_amount || 0), 0)

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Return</h1>
          <p className="text-gray-600">Return drugs to suppliers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-orange-700"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          New Return
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search returns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns.map((ret) => (
              <tr key={ret.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-orange-600">{ret.return_number}</td>
                <td className="px-6 py-4 text-sm">{(ret.supplier as any)?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm">{formatDate(ret.return_date)}</td>
                <td className="px-6 py-4 text-sm capitalize">{ret.reason.replace('_', ' ')}</td>
                <td className="px-6 py-4 text-sm font-medium">{formatCurrency(ret.total_amount)}</td>
                <td className="px-6 py-4">{getStatusBadge(ret.status)}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No returns found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">New Purchase Return</h2>
              <button onClick={() => setShowForm(false)}><XCircle className="w-6 h-6 text-gray-500" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier *</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Return Date *</label>
                  <input
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => setFormData({...formData, return_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason *</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value as any})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Details</label>
                  <input
                    type="text"
                    value={formData.reason_details}
                    onChange={(e) => setFormData({...formData, reason_details: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Additional details"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Return Items</h3>
                  <button type="button" onClick={addItem} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">
                    <Plus className="w-4 h-4 inline mr-1" />Add Item
                  </button>
                </div>

                <table className="min-w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-xs text-left">Medicine</th>
                      <th className="px-3 py-2 text-xs text-left">Batch</th>
                      <th className="px-3 py-2 text-xs text-left">Qty</th>
                      <th className="px-3 py-2 text-xs text-left">Rate</th>
                      <th className="px-3 py-2 text-xs text-left">GST%</th>
                      <th className="px-3 py-2 text-xs text-left">Total</th>
                      <th className="px-3 py-2 text-xs"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-2 py-2">
                          <select
                            value={item.medication_id}
                            onChange={(e) => updateItem(index, 'medication_id', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                            required
                          >
                            <option value="">Select</option>
                            {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={item.batch_number}
                            onChange={(e) => updateItem(index, 'batch_number', e.target.value)}
                            className="w-24 border rounded px-2 py-1 text-sm"
                            required
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-16 border rounded px-2 py-1 text-sm"
                            min="1"
                            required
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={item.unit_price || ''}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-20 border rounded px-2 py-1 text-sm"
                            step="0.01"
                            required
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={item.gst_percent || ''}
                            onChange={(e) => updateItem(index, 'gst_percent', parseFloat(e.target.value) || 0)}
                            className="w-14 border rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-sm font-medium">{formatCurrency(item.total_amount || 0)}</td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => removeItem(index)} className="text-red-600">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-bold">Total: {formatCurrency(totalAmount)}</div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-orange-600 text-white rounded-lg">Submit Return</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
