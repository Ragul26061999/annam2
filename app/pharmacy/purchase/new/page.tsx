'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Trash2, Save, ArrowLeft,
  Calendar, CreditCard, User, FileText,
  Package, Truck, Receipt, Upload, X, CheckCircle
} from 'lucide-react'
import {
  getSuppliers,
  createDrugPurchase,
  Supplier,
  DrugPurchaseItem
} from '@/src/lib/enhancedPharmacyService'
import { getMedications } from '@/src/lib/pharmacyService'
import { supabase } from '@/src/lib/supabase'

interface PurchaseFormData {
  supplier_id: string;
  invoice_number: string;
  invoice_date: string;
  purchase_date: string;
  payment_mode: 'cash' | 'credit' | 'cheque' | 'online' | 'upi';
  remarks: string;
}

export default function NewDrugPurchasePage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<PurchaseFormData>({
    supplier_id: '',
    invoice_number: '',
    invoice_date: '',
    purchase_date: new Date().toISOString().split('T')[0],
    payment_mode: 'credit' as const,
    remarks: ''
  })
  
  const [items, setItems] = useState<DrugPurchaseItem[]>([])
  
  // Document upload state
  const [purchaseDocument, setPurchaseDocument] = useState<File | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [documentUploading, setDocumentUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [suppliersData, medsData] = await Promise.all([
        getSuppliers({ status: 'active' }),
        getMedications()
      ])
      setSuppliers(suppliersData)
      setMedications(medsData)
      // Add one empty item by default
      addItem()
      
      // Create storage bucket if it doesn't exist
      await createStorageBucket()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createStorageBucket = async () => {
    try {
      // Check if bucket exists, create if not
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()
      
      if (listError) {
        console.warn('Error listing storage buckets:', listError)
        return
      }
      
      const bucketExists = buckets?.some((b: any) => b.name === 'purchase-documents')
      
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket('purchase-documents', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
          fileSizeLimit: 5242880 // 5MB
        })
        
        if (error) {
          console.warn('Could not create storage bucket:', error)
        }
      }
    } catch (error) {
      console.warn('Error checking storage bucket:', error)
    }
  }

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select an image file (JPEG, PNG, GIF, WebP) or PDF')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB')
      return
    }

    setDocumentUploading(true)
    setPurchaseDocument(file)

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `purchase-documents/${fileName}`

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('purchase-documents')
        .getPublicUrl(filePath)

      setDocumentUrl(urlData.publicUrl)
      console.log('Document uploaded successfully:', urlData.publicUrl)

    } catch (error: any) {
      console.error('Error uploading document:', error)
      alert(`Failed to upload document: ${error.message}`)
      setPurchaseDocument(null)
      setDocumentUrl(null)
    } finally {
      setDocumentUploading(false)
    }
  }

  const handleRemoveDocument = () => {
    setPurchaseDocument(null)
    setDocumentUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const addItem = () => {
    setItems(prev => [...prev, {
      medication_id: '',
      batch_number: '',
      expiry_date: '',
      quantity: 0,
      pack_counting: 1,
      free_quantity: 0,
      unit_price: 0,
      mrp: 0,
      discount_percent: 0,
      gst_percent: 5,
      cgst_percent: 2.5,
      sgst_percent: 2.5,
      igst_percent: 0,
      gst_amount: 0,
      total_amount: 0,
      // Default free item details
      free_expiry_date: '',
      free_mrp: 0
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    const item = { ...newItems[index], [field]: value }
    
    // Validate date fields to prevent 5-6 digit years
    if ((field === 'expiry_date' || field === 'free_expiry_date') && value) {
      const year = parseInt(value.split('-')[0]);
      if (year < 2000 || year > 2100) {
        return; // Don't update if year is invalid
      }
    }
    
    // Auto-fill medication details
    if (field === 'medication_id') {
      const med = medications.find(m => m.id === value)
      if (med) {
        item.medication_name = med.name
        item.unit_price = med.purchase_price || 0
        item.mrp = med.mrp || med.selling_price || 0
        item.free_mrp = item.mrp // Default free MRP to same
        
        // Handle GST defaults with consistency
        const defaultGst = med.gst_percent || 5
        item.gst_percent = defaultGst
        
        if (med.cgst_percent !== undefined && med.sgst_percent !== undefined) {
             item.cgst_percent = med.cgst_percent
             item.sgst_percent = med.sgst_percent
        } else {
             item.cgst_percent = defaultGst / 2
             item.sgst_percent = defaultGst / 2
        }
      }
    }

    // Auto-calculate CGST/SGST if GST % changes
    if (field === 'gst_percent') {
        const gst = parseFloat(value) || 0
        item.cgst_percent = gst / 2
        item.sgst_percent = gst / 2
        item.igst_percent = 0
    }

    // Default free item details if main details change
    if (field === 'expiry_date' && !item.free_expiry_date) {
        item.free_expiry_date = value
    }
    if (field === 'mrp' && (!item.free_mrp || item.free_mrp === 0)) {
        item.free_mrp = value
    }

    // Recalculate totals
    const totalQuantity = (item.quantity || 0) * (item.pack_counting || 1)
    const subtotal = totalQuantity * item.unit_price
    const discountAmount = subtotal * ((item.discount_percent || 0) / 100)
    const taxableAmount = subtotal - discountAmount
    const gstAmount = taxableAmount * ((item.gst_percent || 0) / 100)
    
    item.discount_amount = discountAmount
    item.taxable_amount = taxableAmount
    item.gst_amount = gstAmount
    item.total_amount = taxableAmount + gstAmount
    
    newItems[index] = item
    setItems(newItems)
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const totalQuantity = (item.quantity || 0) * (item.pack_counting || 1)
      return sum + (totalQuantity * item.unit_price)
    }, 0)
    const discount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0)
    const taxable = items.reduce((sum, item) => sum + (item.taxable_amount || 0), 0)
    const totalGst = items.reduce((sum, item) => sum + (item.gst_amount || 0), 0)
    const grandTotal = items.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    return { subtotal, discount, taxable, totalGst, grandTotal }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.supplier_id || items.length === 0) {
      alert('Please select a supplier and add at least one item')
      return
    }

    // Validate items
    const invalidItems = items.filter(i => !i.medication_id || !i.batch_number || !i.expiry_date || i.quantity <= 0 || (i.pack_counting || 0) <= 0)
    if (invalidItems.length > 0) {
      alert('Please fill in all required fields for all items (Medicine, Batch, Expiry, Qty, Pack Count)')
      return
    }

    try {
      setSubmitting(true)
      const { subtotal, discount, totalGst, grandTotal } = calculateTotals()
      
      const created = await createDrugPurchase({
        ...formData,
        subtotal,
        discount_amount: discount,
        total_gst: totalGst,
        total_amount: grandTotal,
        status: 'received',
        document_url: documentUrl || undefined
      }, items)

      if (created) {
        const purchaseNo = created.purchase_number
        alert(`Purchase created successfully! Purchase No: ${purchaseNo}`)
        router.push('/pharmacy/purchase')
      }
    } catch (error) {
      console.error('Error creating purchase:', error)
      alert('Failed to create purchase. See console for details.')
    } finally {
      setSubmitting(false)
    }
  }

  const { subtotal, totalGst, grandTotal } = calculateTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">New Purchase Entry</h1>
                <p className="text-sm text-gray-500">Create a new drug purchase record (GRN)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Saving...' : 'Save Purchase'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Form Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Supplier Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Supplier Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>
                  ))}
                </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                 <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({...formData, payment_mode: e.target.value as any})}
                    className="w-full border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="credit">Credit</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                    <option value="upi">UPI</option>
                  </select>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Invoice Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter invoice no."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => {
                    const date = e.target.value;
                    // Validate year is between 2000 and 2100
                    if (date) {
                      const year = parseInt(date.split('-')[0]);
                      if (year >= 2000 && year <= 2100) {
                        setFormData({...formData, invoice_date: date});
                      }
                    } else {
                      setFormData({...formData, invoice_date: date});
                    }
                  }}
                  className="w-full border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  min="2000-01-01"
                  max="2100-12-31"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => {
                    const date = e.target.value;
                    // Validate year is between 2000 and 2100
                    if (date) {
                      const year = parseInt(date.split('-')[0]);
                      if (year >= 2000 && year <= 2100) {
                        setFormData({...formData, purchase_date: date});
                      }
                    } else {
                      setFormData({...formData, purchase_date: date});
                    }
                  }}
                  className="w-full border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  min="2000-01-01"
                  max="2100-12-31"
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Additional Notes
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Any additional notes or comments..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Purchase Items
            </h2>
            <div className="flex gap-3">
              {/* Document Upload Button */}
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload}
                  disabled={documentUploading}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={documentUploading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
                >
                  {documentUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
              
              <button
                type="button"
                onClick={addItem}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add New Item
              </button>
            </div>
          </div>
          
          {/* Document Preview */}
          {documentUrl && (
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Document uploaded successfully</p>
                    <p className="text-xs text-gray-600">{purchaseDocument?.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveDocument}
                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                  title="Remove document"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-64">Medicine</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-32">Batch Info</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-32">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-24">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-24">Free Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-32">Pricing</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-20">GST %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-32">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 align-top">
                      <select
                        value={item.medication_id}
                        onChange={(e) => updateItem(index, 'medication_id', e.target.value)}
                        className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Medicine</option>
                        {medications.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4 align-top space-y-2">
                      <input
                        type="text"
                        value={item.batch_number}
                        onChange={(e) => updateItem(index, 'batch_number', e.target.value)}
                        className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Batch No."
                        required
                      />
                    </td>
                    <td className="px-4 py-4 align-top space-y-2">
                        <div>
                            <label className="text-xs text-gray-500 block">Expiry</label>
                            <input
                                type="date"
                                value={item.expiry_date}
                                onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                                className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                min="2000-01-01"
                                max="2100-12-31"
                                required
                            />
                        </div>
                        {item.free_quantity > 0 && (
                            <div>
                                <label className="text-xs text-gray-500 block text-orange-600">Free Exp</label>
                                <input
                                    type="date"
                                    value={item.free_expiry_date || ''}
                                    onChange={(e) => updateItem(index, 'free_expiry_date', e.target.value)}
                                    className="w-full border-2 border-orange-200 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500 bg-orange-50"
                                    min="2000-01-01"
                                    max="2100-12-31"
                                />
                            </div>
                        )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-500 block">Qty</label>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                            placeholder="Qty"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Pack Count</label>
                          <input
                            type="number"
                            value={item.pack_counting || ''}
                            onChange={(e) => updateItem(index, 'pack_counting', parseInt(e.target.value) || 1)}
                            className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                            placeholder="Pack"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <input
                        type="number"
                        value={item.free_quantity || ''}
                        onChange={(e) => updateItem(index, 'free_quantity', parseInt(e.target.value) || 0)}
                        className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        placeholder="Free"
                      />
                    </td>
                    <td className="px-4 py-4 align-top space-y-2">
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500">Rate</label>
                            <input
                                type="number"
                                value={item.unit_price || ''}
                                onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500">MRP</label>
                            <input
                                type="number"
                                value={item.mrp || ''}
                                onChange={(e) => updateItem(index, 'mrp', parseFloat(e.target.value) || 0)}
                                className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        {item.free_quantity > 0 && (
                            <div className="flex flex-col">
                                <label className="text-xs text-gray-500 text-orange-600">Free MRP</label>
                                <input
                                    type="number"
                                    value={item.free_mrp || ''}
                                    onChange={(e) => updateItem(index, 'free_mrp', parseFloat(e.target.value) || 0)}
                                    className="w-full border-2 border-orange-200 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500 bg-orange-50"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        )}
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500">Disc %</label>
                            <input
                                type="number"
                                value={item.discount_percent || ''}
                                onChange={(e) => updateItem(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                                className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                max="100"
                            />
                        </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <input
                        type="number"
                        value={item.gst_percent || ''}
                        onChange={(e) => updateItem(index, 'gst_percent', parseFloat(e.target.value) || 0)}
                        className="w-full border-2 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        max="28"
                      />
                    </td>
                    <td className="px-4 py-4 align-top text-right font-medium text-gray-900">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.total_amount)}
                    </td>
                    <td className="px-4 py-4 align-top text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-right font-medium text-gray-600">Subtotal:</td>
                  <td className="px-4 py-4 text-right font-medium text-gray-900">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(subtotal)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-right font-medium text-gray-600">Total GST:</td>
                  <td className="px-4 py-4 text-right font-medium text-gray-900">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalGst)}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-blue-50">
                  <td colSpan={7} className="px-4 py-4 text-right font-bold text-gray-900 text-lg">Grand Total:</td>
                  <td className="px-4 py-4 text-right font-bold text-blue-600 text-lg">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
