'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Search, Filter, Eye, Edit, Trash2, Package, 
  Calendar, FileText, IndianRupee, ChevronLeft, ChevronRight,
  Download, Printer, CheckCircle, Clock, XCircle
} from 'lucide-react'
import {
  getSuppliers,
  getDrugPurchases,
  createDrugPurchase,
  Supplier,
  DrugPurchase,
  DrugPurchaseItem
} from '@/src/lib/enhancedPharmacyService'
import { getMedications } from '@/src/lib/pharmacyService'
import { supabase } from '@/src/lib/supabase'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export default function DrugPurchasePage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState<DrugPurchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<DrugPurchase | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    supplier_id: '',
    invoice_number: '',
    invoice_date: '',
    purchase_date: new Date().toISOString().split('T')[0],
    payment_mode: 'credit' as const,
    remarks: ''
  })
  
  const [items, setItems] = useState<DrugPurchaseItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [filterStatus])

  const loadData = async () => {
    setLoading(true)
    try {
      const [purchasesData, suppliersData, medsData] = await Promise.all([
        getDrugPurchases({ status: filterStatus || undefined }),
        getSuppliers({ status: 'active' }),
        getMedications()
      ])
      setPurchases(purchasesData)
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
      expiry_date: '',
      quantity: 0,
      free_quantity: 0,
      unit_price: 0,
      mrp: 0,
      discount_percent: 0,
      gst_percent: 12,
      cgst_percent: 6,
      sgst_percent: 6,
      igst_percent: 0,
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
    
    // Recalculate totals
    const item = newItems[index]
    const subtotal = item.quantity * item.unit_price
    const discountedAmount = subtotal * (1 - (item.discount_percent || 0) / 100)
    const gstAmount = discountedAmount * (item.gst_percent || 0) / 100
    item.gst_amount = gstAmount
    item.total_amount = discountedAmount + gstAmount
    
    // Auto-fill medication details
    if (field === 'medication_id') {
      const med = medications.find(m => m.id === value)
      if (med) {
        item.unit_price = med.purchase_price || 0
        item.mrp = med.mrp || med.selling_price || 0
        item.gst_percent = med.gst_percent || 12
        item.cgst_percent = med.cgst_percent || 6
        item.sgst_percent = med.sgst_percent || 6
      }
    }
    
    setItems(newItems)
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100))
    }, 0)
    const totalGst = items.reduce((sum, item) => sum + (item.gst_amount || 0), 0)
    const grandTotal = subtotal + totalGst
    return { subtotal, totalGst, grandTotal }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.supplier_id || items.length === 0) {
      alert('Please select a supplier and add at least one item')
      return
    }

    try {
      const { subtotal, totalGst, grandTotal } = calculateTotals()
      
      await createDrugPurchase({
        ...formData,
        subtotal,
        total_gst: totalGst,
        total_amount: grandTotal,
        status: 'received'
      }, items)

      alert('Purchase created successfully!')
      setShowForm(false)
      setFormData({
        supplier_id: '',
        invoice_number: '',
        invoice_date: '',
        purchase_date: new Date().toISOString().split('T')[0],
        payment_mode: 'credit',
        remarks: ''
      })
      setItems([])
      loadData()
    } catch (error) {
      console.error('Error creating purchase:', error)
      alert('Failed to create purchase')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      received: 'bg-green-100 text-green-800',
      verified: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    const icons: Record<string, React.ReactNode> = {
      draft: <Clock className="w-3 h-3 mr-1" />,
      received: <CheckCircle className="w-3 h-3 mr-1" />,
      verified: <CheckCircle className="w-3 h-3 mr-1" />,
      cancelled: <XCircle className="w-3 h-3 mr-1" />
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const { subtotal, totalGst, grandTotal } = calculateTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drug Purchase</h1>
          <p className="text-gray-600">Manage drug purchases and GRN entries</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Purchase
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by purchase number or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="received">Received</option>
            <option value="verified">Verified</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Purchase List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {purchases.filter(p => 
              !searchTerm || 
              p.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((purchase) => (
              <tr key={purchase.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  {purchase.purchase_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(purchase.supplier as any)?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {purchase.invoice_number || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(purchase.purchase_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(purchase.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    purchase.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    purchase.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {purchase.payment_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(purchase.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedPurchase(purchase)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-800">
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No purchases found. Click "New Purchase" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Purchase Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">New Drug Purchase</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Purchase Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Supplier invoice number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({...formData, payment_mode: e.target.value as any})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="credit">Credit</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Purchase Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg flex items-center text-sm hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">Medicine</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">Batch</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">Expiry</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">Qty</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">Free</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">Rate</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">MRP</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">Disc%</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">GST%</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">Total</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left"></th>
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
                              {medications.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={item.batch_number}
                              onChange={(e) => updateItem(index, 'batch_number', e.target.value)}
                              className="w-24 border rounded px-2 py-1 text-sm"
                              placeholder="Batch#"
                              required
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                              className="w-32 border rounded px-2 py-1 text-sm"
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
                              value={item.free_quantity || ''}
                              onChange={(e) => updateItem(index, 'free_quantity', parseInt(e.target.value) || 0)}
                              className="w-14 border rounded px-2 py-1 text-sm"
                              min="0"
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
                              value={item.mrp || ''}
                              onChange={(e) => updateItem(index, 'mrp', parseFloat(e.target.value) || 0)}
                              className="w-20 border rounded px-2 py-1 text-sm"
                              step="0.01"
                              required
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.discount_percent || ''}
                              onChange={(e) => updateItem(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                              className="w-14 border rounded px-2 py-1 text-sm"
                              step="0.1"
                              max="100"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.gst_percent || ''}
                              onChange={(e) => updateItem(index, 'gst_percent', parseFloat(e.target.value) || 0)}
                              className="w-14 border rounded px-2 py-1 text-sm"
                              step="0.1"
                            />
                          </td>
                          <td className="px-2 py-2 text-sm font-medium">
                            {formatCurrency(item.total_amount || 0)}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                            No items added. Click "Add Item" to start.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-72 bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total GST:</span>
                    <span>{formatCurrency(totalGst)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
