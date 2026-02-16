'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Search, Eye, Printer, XCircle, FileText, Download, ArrowLeft
} from 'lucide-react'
import {
  getDrugPurchases,
  getDrugPurchaseById,
  DrugPurchase
} from '@/src/lib/enhancedPharmacyService'

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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'received':
      return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Received</span>
    case 'verified':
      return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Verified</span>
    case 'draft':
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">Draft</span>
    case 'cancelled':
      return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Cancelled</span>
    default:
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">{status}</span>
  }
}

export default function DrugPurchasePage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState<DrugPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPurchase, setSelectedPurchase] = useState<DrugPurchase | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedPurchase, setEditedPurchase] = useState<DrugPurchase | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [filterStatus])

  const loadData = async () => {
    setLoading(true)
    try {
      const purchasesData = await getDrugPurchases({ status: filterStatus || undefined })
      setPurchases(purchasesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewPurchase = async (id: string) => {
    setLoadingDetails(true)
    try {
      const purchase = await getDrugPurchaseById(id)
      if (purchase) {
        setSelectedPurchase(purchase)
        setEditedPurchase(JSON.parse(JSON.stringify(purchase))) // Deep copy for editing
        setIsEditMode(false)
      }
    } catch (error) {
      console.error('Error fetching purchase details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleEditToggle = () => {
    if (!isEditMode) {
      setIsEditMode(true)
    } else {
      // Cancel edit mode - restore original data
      if (selectedPurchase) {
        setEditedPurchase(JSON.parse(JSON.stringify(selectedPurchase)))
      }
      setIsEditMode(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!editedPurchase) return
    
    try {
      // TODO: Call API to update purchase
      console.log('Saving changes:', editedPurchase)
      
      // For now, just update local state
      setSelectedPurchase(JSON.parse(JSON.stringify(editedPurchase)))
      setIsEditMode(false)
      
      alert('Purchase updated successfully!')
    } catch (error) {
      console.error('Error saving purchase:', error)
      alert('Error saving purchase: ' + (error as Error).message)
    }
  }

  const handleItemChange = (itemIndex: number, field: string, value: any) => {
    if (!editedPurchase || !editedPurchase.items) return
    
    const updatedItems = [...editedPurchase.items]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: value
    }
    
    setEditedPurchase({
      ...editedPurchase,
      items: updatedItems
    })
  }

  const handleHeaderChange = (field: string, value: any) => {
    if (!editedPurchase) return
    
    setEditedPurchase({
      ...editedPurchase,
      [field]: value
    })
  }

  const handleViewDocument = (documentUrl: string) => {
    setSelectedDocumentUrl(documentUrl)
    setShowDocumentModal(true)
  }

  const handleCloseDocumentModal = () => {
    setSelectedDocumentUrl(null)
    setShowDocumentModal(false)
  }

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
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drug Purchase</h1>
            <p className="text-gray-600">Manage drug purchases and GRN entries</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/pharmacy/purchase/new1')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
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
                      onClick={() => handleViewPurchase(purchase.id)}
                      className="text-blue-600 hover:text-blue-800"
                      disabled={loadingDetails}
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

      {/* View Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0">
              <h2 className="text-xl font-bold">
                Purchase Details: {selectedPurchase.purchase_number}
                {isEditMode && <span className="text-sm text-blue-600 ml-2">(Edit Mode)</span>}
              </h2>
              <div className="flex gap-2">
                {selectedPurchase && (
                  <button
                    onClick={handleEditToggle}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium ${
                      isEditMode 
                        ? 'bg-gray-500 text-white hover:bg-gray-600' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isEditMode ? 'Cancel Edit' : 'Edit'}
                  </button>
                )}
                {isEditMode && (
                  <button
                    onClick={handleSaveChanges}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Save Changes
                  </button>
                )}
                <button onClick={() => setSelectedPurchase(null)} className="text-gray-500 hover:text-gray-700">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-auto">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-gray-50 p-4 rounded-lg">
                <div>
                    <p className="text-sm text-gray-500 mb-1">Supplier</p>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={(editedPurchase?.supplier as any)?.name || ''}
                        onChange={(e) => handleHeaderChange('supplier', { 
                          ...(editedPurchase?.supplier as any), 
                          name: e.target.value 
                        })}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">{(selectedPurchase?.supplier as any)?.name}</p>
                        <p className="text-xs text-gray-500">{(selectedPurchase?.supplier as any)?.supplier_code}</p>
                      </>
                    )}
                </div>
                <div>
                    <p className="text-sm text-gray-500 mb-1">Invoice Info</p>
                    {isEditMode ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editedPurchase?.invoice_number || ''}
                          onChange={(e) => handleHeaderChange('invoice_number', e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Invoice Number"
                        />
                        <input
                          type="date"
                          value={editedPurchase?.purchase_date || ''}
                          onChange={(e) => handleHeaderChange('purchase_date', e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">{selectedPurchase?.invoice_number || '-'}</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedPurchase?.purchase_date || '')}</p>
                      </>
                    )}
                </div>
                <div>
                    <p className="text-sm text-gray-500 mb-1">Payment</p>
                    {isEditMode ? (
                      <div className="space-y-2">
                        <select
                          value={editedPurchase?.payment_mode || 'CREDIT'}
                          onChange={(e) => handleHeaderChange('payment_mode', e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="CREDIT">Credit</option>
                          <option value="CASH">Cash</option>
                          <option value="ONLINE">Online</option>
                        </select>
                        <select
                          value={editedPurchase?.payment_status || 'pending'}
                          onChange={(e) => handleHeaderChange('payment_status', e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="partial">Partial</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-gray-900 capitalize">{selectedPurchase?.payment_mode || '-'}</p>
                        <p className="text-xs text-gray-500 capitalize">{selectedPurchase?.payment_status || '-'}</p>
                      </>
                    )}
                </div>
                <div>
                    <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                    {isEditMode ? (
                      <div className="space-y-2">
                        <input
                          type="number"
                          value={editedPurchase?.total_amount || 0}
                          onChange={(e) => handleHeaderChange('total_amount', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                        <input
                          type="number"
                          value={editedPurchase?.total_gst || 0}
                          onChange={(e) => handleHeaderChange('total_gst', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                          placeholder="GST Amount"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-lg text-blue-600">{formatCurrency(selectedPurchase?.total_amount || 0)}</p>
                        <p className="text-xs text-gray-500">GST: {formatCurrency(selectedPurchase?.total_gst || 0)}</p>
                      </>
                    )}
                </div>
              </div>

              {/* Document Section */}
              {selectedPurchase.document_url && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Purchase Document</p>
                        <p className="text-xs text-gray-600">Click to view the uploaded purchase document</p>
                      </div>
                    </div>
                    <button
                      onClick={() => selectedPurchase.document_url && handleViewDocument(selectedPurchase.document_url)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                      disabled={!selectedPurchase.document_url}
                    >
                      <Eye className="w-4 h-4" />
                      View Document
                    </button>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <h3 className="text-lg font-semibold mb-4">Purchase Items</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Returned</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pack Count</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Free</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">MRP</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">GST%</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {(isEditMode ? editedPurchase : selectedPurchase)?.items?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            value={item.medication_name}
                                            onChange={(e) => handleItemChange(idx, 'medication_name', e.target.value)}
                                            className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        item.medication_name
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            value={item.batch_number}
                                            onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                                            className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        item.batch_number
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {isEditMode ? (
                                        <input
                                            type="date"
                                            value={item.expiry_date}
                                            onChange={(e) => handleItemChange(idx, 'expiry_date', e.target.value)}
                                            className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        formatDate(item.expiry_date)
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                    {isEditMode ? (
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                                            className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                                            min="0"
                                        />
                                    ) : (
                                        item.quantity
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                                    {(item as any).returned_quantity || 0}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                    {(item as any).net_quantity || item.quantity}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                    {isEditMode ? (
                                        <input
                                            type="number"
                                            value={item.pack_counting || 1}
                                            onChange={(e) => handleItemChange(idx, 'pack_counting', parseInt(e.target.value) || 1)}
                                            className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                                            min="1"
                                        />
                                    ) : (
                                        item.pack_counting || 1
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 text-right">
                                    {isEditMode ? (
                                        <input
                                            type="number"
                                            value={item.free_quantity || 0}
                                            onChange={(e) => handleItemChange(idx, 'free_quantity', parseInt(e.target.value) || 0)}
                                            className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                                            min="0"
                                        />
                                    ) : (
                                        item.free_quantity || 0
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                    {isEditMode ? (
                                        <input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                            className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                                            step="0.01"
                                            min="0"
                                        />
                                    ) : (
                                        formatCurrency(item.unit_price)
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 text-right">
                                    {isEditMode ? (
                                        <input
                                            type="number"
                                            value={item.mrp}
                                            onChange={(e) => handleItemChange(idx, 'mrp', parseFloat(e.target.value) || 0)}
                                            className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                                            step="0.01"
                                            min="0"
                                        />
                                    ) : (
                                        formatCurrency(item.mrp)
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 text-right">
                                    {isEditMode ? (
                                        <input
                                            type="number"
                                            value={item.gst_percent}
                                            onChange={(e) => handleItemChange(idx, 'gst_percent', parseFloat(e.target.value) || 0)}
                                            className="w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-right"
                                            step="0.01"
                                            min="0"
                                        />
                                    ) : (
                                        `${item.gst_percent}%`
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                    {formatCurrency(item.total_amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td colSpan={11} className="px-4 py-3 text-right font-medium text-gray-900">Subtotal</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(selectedPurchase.subtotal)}</td>
                        </tr>
                         <tr>
                            <td colSpan={11} className="px-4 py-3 text-right font-medium text-gray-900">Total GST</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(selectedPurchase.total_gst)}</td>
                        </tr>
                        <tr>
                            <td colSpan={11} className="px-4 py-3 text-right font-bold text-gray-900">Grand Total</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600">{formatCurrency(selectedPurchase.total_amount)}</td>
                        </tr>
                    </tfoot>
                </table>
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
                {isEditMode && (
                  <button
                    onClick={handleSaveChanges}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium mr-3"
                  >
                    Save Changes
                  </button>
                )}
                <button 
                    onClick={() => {
                      if (isEditMode) {
                        handleEditToggle()
                      } else {
                        setSelectedPurchase(null)
                      }
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                    {isEditMode ? 'Cancel' : 'Close'}
                </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Modal */}
      {showDocumentModal && selectedDocumentUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Purchase Document</h3>
              <button
                onClick={handleCloseDocumentModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {selectedDocumentUrl.includes('.pdf') ? (
                <iframe
                  src={selectedDocumentUrl}
                  className="w-full h-[70vh] rounded-lg"
                  title="Purchase Document"
                />
              ) : (
                <img
                  src={selectedDocumentUrl}
                  alt="Purchase Document"
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <a
                  href={selectedDocumentUrl}
                  download="purchase-document"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Document
                </a>
                <button
                  onClick={handleCloseDocumentModal}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
