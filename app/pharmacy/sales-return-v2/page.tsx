'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Eye, XCircle, RotateCcw, User, Receipt, CheckCircle, 
  AlertCircle, ArrowLeft, ShoppingCart, Trash2, Calendar, CreditCard, Printer
} from 'lucide-react'
import {
  getSalesReturns,
  createSalesReturn,
  getPharmacyBillForReturn,
  searchPharmacyBills,
  getRecentBills,
  updateBillAfterReturn,
  SalesReturn,
  SalesReturnItem
} from '@/src/lib/enhancedPharmacyService'
import { supabase } from '@/src/lib/supabase'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const RETURN_REASONS = [
  { value: 'wrong_medicine', label: 'Wrong Medicine Dispensed' },
  { value: 'excess_quantity', label: 'Excess Quantity' },
  { value: 'expired', label: 'Expired Medicine' },
  { value: 'damaged', label: 'Damaged/Broken' },
  { value: 'adverse_reaction', label: 'Adverse Reaction' },
  { value: 'doctor_changed', label: 'Doctor Changed Prescription' },
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'other', label: 'Other Reason' }
]

const REFUND_MODES = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' }
]

const getBillImpactAfterReturn = (bill: any, returnAmount: number) => {
  const currentTotal = Number(bill?.total || 0)
  const currentPaid = Number(bill?.amount_paid || 0)
  const newTotal = Math.max(0, currentTotal - Number(returnAmount || 0))
  const refundAmount = Math.max(0, currentPaid - newTotal)
  const newAmountPaid = Math.min(currentPaid, newTotal)
  const newBalanceDue = Math.max(0, newTotal - newAmountPaid)
  return { newTotal, newAmountPaid, newBalanceDue, refundAmount }
}

export default function SalesReturnPageV2() {
  const [returns, setReturns] = useState<SalesReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  
  // Multi-step form state
  const [step, setStep] = useState<'search' | 'view-bill' | 'select-items' | 'confirm'>('search')
  const [billSearchTerm, setBillSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchingBills, setSearchingBills] = useState(false)
  const [recentBills, setRecentBills] = useState<any[]>([])
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const [billDetails, setBillDetails] = useState<{ bill: any; items: any[] } | null>(null)
  const [loadingBillDetails, setLoadingBillDetails] = useState(false)
  
  // Return items selection
  const [selectedItems, setSelectedItems] = useState<Map<string, {
    item: any
    returnQuantity: number
    reason: string
    restock: boolean
  }>>(new Map())
  
  // Return form data
  const [returnData, setReturnData] = useState({
    return_date: new Date().toISOString().split('T')[0],
    refund_mode: 'cash' as const,
    remarks: ''
  })

  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  const [showReturnHistory, setShowReturnHistory] = useState(false)
  const [selectedReturnForHistory, setSelectedReturnForHistory] = useState<SalesReturn | null>(null)
  const [returnHistoryItems, setReturnHistoryItems] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadReturns()
    loadRecentBills()
  }, [filterStatus])

  const loadReturns = async () => {
    setLoading(true)
    try {
      const data = await getSalesReturns({ status: filterStatus || undefined })
      setReturns(data)
    } catch (error) {
      console.error('Error loading returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentBills = async () => {
    try {
      const data = await getRecentBills(5)
      setRecentBills(data)
    } catch (error) {
      console.error('Error loading recent bills:', error)
    }
  }

  const loadReturnHistory = async (returnItem: SalesReturn) => {
    setSelectedReturnForHistory(returnItem)
    setLoadingHistory(true)
    setShowReturnHistory(true)
    
    try {
      const { data, error } = await supabase
        .from('sales_return_items')
        .select(`
          *,
          medication:medication_id (
            name,
            medicine_code,
            category,
            manufacturer
          )
        `)
        .eq('return_id', returnItem.id)
      
      if (error) throw error
      setReturnHistoryItems(data || [])
    } catch (error) {
      console.error('Error loading return history:', error)
      alert('Failed to load return history')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSearchBills = async () => {
    if (!billSearchTerm.trim()) return
    
    setSearchingBills(true)
    try {
      const results = await searchPharmacyBills(billSearchTerm)
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching bills:', error)
      alert('Failed to search bills')
    } finally {
      setSearchingBills(false)
    }
  }

  const handleSelectBill = async (bill: any) => {
    setSelectedBill(bill)
    setLoadingBillDetails(true)
    setStep('view-bill')
    
    try {
      const details = await getPharmacyBillForReturn(bill.id)
      setBillDetails(details)
    } catch (error: any) {
      console.error('Error loading bill details:', {
        billId: bill?.id,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        raw: error
      })
      alert(`Failed to load bill details for bill id ${bill?.id}. ${error?.message || ''}`)
      setStep('search')
    } finally {
      setLoadingBillDetails(false)
    }
  }

  const handleToggleItemReturn = (item: any) => {
    const newSelected = new Map(selectedItems)
    
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id)
    } else {
      newSelected.set(item.id, {
        item,
        returnQuantity: Number(item.qty || 0),
        reason: 'wrong_medicine' as const,
        restock: true
      })
    }
    
    setSelectedItems(newSelected)
  }

  const handleUpdateReturnItem = (itemId: string, field: string, value: any) => {
    const newSelected = new Map(selectedItems)
    const existing = newSelected.get(itemId)
    
    if (existing) {
      newSelected.set(itemId, {
        ...existing,
        [field]: value
      })
      setSelectedItems(newSelected)
    }
  }

  const calculateReturnTotal = () => {
    let total = 0
    selectedItems.forEach(({ item, returnQuantity }) => {
      total += Number(item.unit_amount || 0) * returnQuantity
    })
    return total
  }

  const handleProceedToConfirm = () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item to return')
      return
    }
    setStep('confirm')
  }

  const handleSubmitReturn = async () => {
    if (!billDetails || selectedItems.size === 0) return

    try {
      const returnItems: SalesReturnItem[] = Array.from(selectedItems.values()).map(({ item, returnQuantity, reason, restock }) => ({
        medication_id: item.medicine_id,
        medication_name: item.medication?.name || '',
        batch_number: item.batch_number || '',
        quantity: returnQuantity,
        unit_price: Number(item.unit_amount || 0),
        gst_percent: item.gst_percent || 0,
        gst_amount: (Number(item.unit_amount || 0) * returnQuantity * (item.gst_percent || 0)) / 100,
        total_amount: Number(item.unit_amount || 0) * returnQuantity,
        reason,
        restock_status: restock ? 'pending' : 'disposed'
      }))

      const returnAmount = calculateReturnTotal()
      const impact = getBillImpactAfterReturn(billDetails.bill, returnAmount)

      const returnResult = await createSalesReturn({
        bill_id: billDetails.bill.id,
        customer_name: billDetails.bill.customer_name || 'Walk-in Customer',
        customer_phone: billDetails.bill.customer_phone || null,
        return_date: returnData.return_date,
        refund_mode: returnData.refund_mode,
        refund_amount: impact.refundAmount,
        reason: (Array.from(new Set(returnItems.map(i => i.reason))).join(', ') as any),
        remarks: returnData.remarks
      }, returnItems)

      // Update original bill
      const itemsForBillUpdate = Array.from(selectedItems.values()).map(({ item, returnQuantity }) => ({
        bill_item_id: item.id,
        quantity: returnQuantity
      }))

      const missingLine = itemsForBillUpdate.find((x) => !x.bill_item_id)
      if (missingLine) {
        throw new Error('Cannot update bill: missing billing_item id for a selected line')
      }

      console.log('updateBillAfterReturn input:', {
        billId: billDetails.bill.id,
        returnAmount,
        itemsForBillUpdate
      })

      const billUpdate = await updateBillAfterReturn(billDetails.bill.id, returnAmount, itemsForBillUpdate)

      // Prepare print data
      setPrintData({
        returnNumber: returnResult?.return_number || 'N/A',
        returnDate: returnData.return_date,
        originalBill: billDetails.bill,
        returnItems: Array.from(selectedItems.values()).map(({ item, returnQuantity, reason }) => ({
          name: item.medication?.name,
          quantity: returnQuantity,
          unitPrice: Number(item.unit_amount || 0),
          total: Number(item.unit_amount || 0) * returnQuantity,
          reason
        })),
        refundMode: returnData.refund_mode,
        totalRefund: returnAmount,
        refundDue: billUpdate.refundAmount,
        newTotal: billUpdate.newTotal,
        newPaid: billUpdate.newAmountPaid,
        newDue: billUpdate.newBalanceDue,
        remarks: returnData.remarks
      })

      if (billUpdate.refundAmount > 0) {
        alert(`Sales return processed. Refund due: ${formatCurrency(billUpdate.refundAmount)}. Bill adjusted.`)
      } else {
        alert('Sales return processed. Bill amount/balance has been adjusted.')
      }

      setShowPrintPreview(true)
    } catch (error: any) {
      console.error('Error processing return:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        raw: error
      })
      try {
        console.error('Error processing return (json):', JSON.stringify(error))
      } catch {}
      alert('Failed to process return')
    }
  }

  const resetForm = () => {
    setStep('search')
    setBillSearchTerm('')
    setSearchResults([])
    setSelectedBill(null)
    setBillDetails(null)
    setSelectedItems(new Map())
    setReturnData({
      return_date: new Date().toISOString().split('T')[0],
      refund_mode: 'cash',
      remarks: ''
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {step === 'search' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Return</h1>
              <p className="text-gray-600">Process customer drug returns with bill lookup</p>
            </div>
            <button
              onClick={() => setStep('search')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Return
            </button>
          </div>

          {/* Bill Search Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Search className="w-5 h-5 mr-2 text-blue-600" />
              Search Original Bill
            </h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter Bill Number, Customer Name, or Phone..."
                value={billSearchTerm}
                onChange={(e) => setBillSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchBills()}
                className="flex-1 border rounded-lg px-4 py-3 text-lg"
              />
              <button
                onClick={handleSearchBills}
                disabled={searchingBills}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Search className="w-5 h-5 mr-2" />
                {searchingBills ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Recent Bills - Quick Selection */}
            {recentBills.length > 0 && (
              <div className="mt-4 bg-white rounded-lg shadow-md">
                <div className="p-4 border-b bg-green-50">
                  <h3 className="font-medium text-green-800 flex items-center">
                    <Receipt className="w-4 h-4 mr-2" />
                    Recent Bills (Last 5)
                  </h3>
                  <p className="text-xs text-green-600 mt-1">Click to select for return</p>
                </div>
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => handleSelectBill(bill)}
                    className="p-4 border-b hover:bg-green-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-green-600">{bill.bill_number}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {bill.customer_name || 'Walk-in Customer'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {bill.customer_phone || 'No phone'}
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            bill.payment_status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : bill.payment_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : bill.payment_status === 'partial'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.payment_status || 'unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(Number(bill.total || 0))}</div>
                        <div className="text-xs text-gray-500">{formatDate(bill.created_at)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 bg-white rounded-lg shadow-md max-h-96 overflow-y-auto">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium">Found {searchResults.length} bill(s)</h3>
                </div>
                {searchResults.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => handleSelectBill(bill)}
                    className="p-4 border-b hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-blue-600">{bill.bill_number}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {bill.customer_name || 'Walk-in Customer'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {bill.customer_phone || 'No phone'}
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            bill.payment_status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : bill.payment_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.payment_status || 'unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(Number(bill.total || 0))}</div>
                        <div className="text-xs text-gray-500">{formatDate(bill.created_at)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Returns List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Recent Returns</h3>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded-lg px-3 py-1 text-sm"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Original Bill</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.map((returnItem) => (
                    <tr key={returnItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{returnItem.return_number}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(returnItem.return_date)}</td>
                      <td className="px-6 py-4 text-sm">{returnItem.original_bill_number || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{returnItem.customer_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-medium">{formatCurrency(Number(returnItem.total_amount || 0))}</td>
                      <td className="px-6 py-4">{getStatusBadge(returnItem.status)}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => loadReturnHistory(returnItem)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Return Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {returns.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No returns found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {step === 'view-bill' && billDetails && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('search')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </button>
            <button
              onClick={handleProceedToConfirm}
              disabled={selectedItems.size === 0}
              className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center hover:bg-green-700 disabled:bg-gray-400"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Proceed with {selectedItems.size} item(s)
            </button>
          </div>

          {/* Bill Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-90">Original Bill</div>
                <div className="text-3xl font-bold mt-1">{billDetails.bill.bill_number}</div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {billDetails.bill.customer_name || 'Walk-in Customer'}
                  </div>
                  <div className="text-sm opacity-90">
                    {billDetails.bill.customer_phone || 'No phone'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">Bill Amount</div>
                <div className="text-3xl font-bold">{formatCurrency(Number(billDetails.bill.total || 0))}</div>
                <div className="text-sm opacity-90 mt-2">{formatDate(billDetails.bill.created_at)}</div>
              </div>
            </div>
          </div>

          {/* Bill Items with Return Selection */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold">Select Items to Return</h3>
              <p className="text-sm text-gray-600 mt-1">Click on items to select them for return</p>
            </div>
            <div className="divide-y">
              {billDetails.items.map((item) => {
                const isSelected = selectedItems.has(item.id)
                const selectedData = selectedItems.get(item.id)
                
                return (
                  <div
                    key={item.id}
                    className={`p-4 transition-colors ${isSelected ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleItemReturn(item)}
                            className="w-5 h-5 text-green-600 rounded"
                          />
                          <div>
                            <div className="font-semibold text-lg">{item.medication?.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {item.medication?.category} | {item.medication?.manufacturer}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Batch: {item.batch_number || 'N/A'} | Expiry: {item.expiry_date ? formatDate(item.expiry_date) : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {isSelected && selectedData && (
                          <div className="mt-4 ml-8 grid grid-cols-3 gap-4 bg-white p-4 rounded-lg border">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Return Quantity</label>
                              <input
                                type="number"
                                min="1"
                                max={Number(item.qty || 0)}
                                value={selectedData.returnQuantity}
                                onChange={(e) => handleUpdateReturnItem(item.id, 'returnQuantity', parseInt(e.target.value) || 1)}
                                className="w-full border rounded px-3 py-2"
                              />
                              <div className="text-xs text-gray-500 mt-1">Max: {Number(item.qty || 0)}</div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Return Reason</label>
                              <select
                                value={selectedData.reason}
                                onChange={(e) => handleUpdateReturnItem(item.id, 'reason', e.target.value)}
                                className="w-full border rounded px-3 py-2"
                              >
                                {RETURN_REASONS.map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Restock?</label>
                              <select
                                value={selectedData.restock ? 'yes' : 'no'}
                                onChange={(e) => handleUpdateReturnItem(item.id, 'restock', e.target.value === 'yes')}
                                className="w-full border rounded px-3 py-2"
                              >
                                <option value="yes">Yes, add back to stock</option>
                                <option value="no">No, dispose</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-sm text-gray-600">Qty: {Number(item.qty || 0)}</div>
                        <div className="text-sm text-gray-600">@ {formatCurrency(Number(item.unit_amount || 0))}</div>
                        <div className="text-lg font-bold mt-1">{formatCurrency(item.total_amount)}</div>
                        {isSelected && selectedData && (
                          <div className="mt-2 text-green-600 font-semibold">
                            Return: {formatCurrency(Number(item.unit_amount || 0) * selectedData.returnQuantity)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedItems.size > 0 && (
              <div className="px-6 py-4 bg-green-50 border-t-2 border-green-500">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-600">{selectedItems.size} item(s) selected for return</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Total Refund Amount</div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(calculateReturnTotal())}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('view-bill')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Selection
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
              Confirm Return
            </h2>

            {billDetails && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-blue-700">Current Total</div>
                    <div className="font-bold">{formatCurrency(Number(billDetails.bill.total || 0))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-700">Paid</div>
                    <div className="font-bold">{formatCurrency(Number(billDetails.bill.amount_paid || 0))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-700">Balance Due</div>
                    <div className="font-bold">{formatCurrency(Number(billDetails.bill.balance_due || 0))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-700">Payment Status</div>
                    <div className="font-bold capitalize">{billDetails.bill.payment_status || 'unknown'}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Return Date</label>
                <input
                  type="date"
                  value={returnData.return_date}
                  onChange={(e) => setReturnData({...returnData, return_date: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Refund Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {REFUND_MODES.map(mode => (
                    <button
                      key={mode.value}
                      onClick={() => setReturnData({...returnData, refund_mode: mode.value as any})}
                      className={`border rounded-lg px-4 py-2 text-sm flex items-center justify-center ${
                        returnData.refund_mode === mode.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="mr-2">{mode.icon}</span>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Additional Remarks</label>
              <textarea
                value={returnData.remarks}
                onChange={(e) => setReturnData({...returnData, remarks: e.target.value})}
                className="w-full border rounded-lg px-4 py-2"
                rows={3}
                placeholder="Any additional notes about this return..."
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-3">Return Summary</h3>
              <div className="space-y-2">
                {Array.from(selectedItems.values()).map(({ item, returnQuantity, reason }) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.medication?.name} x {returnQuantity}</span>
                    <span className="font-medium">{formatCurrency(Number(item.unit_amount || 0) * returnQuantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-3 flex justify-between font-bold text-lg">
                <span>Total Refund</span>
                <span className="text-green-600">{formatCurrency(calculateReturnTotal())}</span>
              </div>

              {billDetails && (
                <div className="mt-4 pt-4 border-t">
                  {(() => {
                    const impact = getBillImpactAfterReturn(billDetails.bill, calculateReturnTotal())
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-gray-600">New Total</div>
                          <div className="font-semibold">{formatCurrency(impact.newTotal)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">New Paid</div>
                          <div className="font-semibold">{formatCurrency(impact.newAmountPaid)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">New Balance Due</div>
                          <div className="font-semibold">{formatCurrency(impact.newBalanceDue)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Refund Due</div>
                          <div className={`font-semibold ${impact.refundAmount > 0 ? 'text-green-700' : 'text-gray-800'}`}>
                            {formatCurrency(impact.refundAmount)}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setStep('view-bill')}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Process Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && printData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Return Receipt</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={() => {
                    setShowPrintPreview(false)
                    resetForm()
                    loadReturns()
                  }}
                  className="border px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-8" id="print-content">
              {/* Hospital Header */}
              <div className="text-center mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold">Annam Hospital</h1>
                <p className="text-sm text-gray-600">Pharmacy Department</p>
                <p className="text-xs text-gray-500 mt-1">Sales Return Receipt</p>
              </div>

              {/* Return Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-600">Return Number</div>
                  <div className="font-bold text-lg">{printData.returnNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Return Date</div>
                  <div className="font-bold">{formatDate(printData.returnDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Original Bill</div>
                  <div className="font-semibold">{printData.originalBill.bill_number}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Customer</div>
                  <div className="font-semibold">{printData.originalBill.customer_name || 'Walk-in'}</div>
                </div>
              </div>

              {/* Return Items Table */}
              <table className="w-full mb-6 border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2 text-left">Medicine</th>
                    <th className="border px-4 py-2 text-center">Qty</th>
                    <th className="border px-4 py-2 text-right">Rate</th>
                    <th className="border px-4 py-2 text-right">Amount</th>
                    <th className="border px-4 py-2 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.returnItems.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="border px-4 py-2">{item.name}</td>
                      <td className="border px-4 py-2 text-center">{item.quantity}</td>
                      <td className="border px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="border px-4 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                      <td className="border px-4 py-2 text-sm">{RETURN_REASONS.find(r => r.value === item.reason)?.label}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="border px-4 py-2 text-right font-bold">Total Refund:</td>
                    <td className="border px-4 py-2 text-right font-bold text-lg text-green-600">
                      {formatCurrency(printData.totalRefund)}
                    </td>
                    <td className="border px-4 py-2"></td>
                  </tr>
                </tfoot>
              </table>

              {/* Refund Details */}
              <div className="mb-6 bg-gray-50 p-4 rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-600">Refund Mode</div>
                    <div className="font-semibold capitalize">{printData.refundMode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Refund Amount</div>
                    <div className="font-bold text-xl text-green-600">{formatCurrency(printData.totalRefund)}</div>
                  </div>
                </div>
                {typeof printData.refundDue === 'number' && (
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">Refund Due (based on paid amount)</div>
                    </div>
                    <div className={`font-bold ${printData.refundDue > 0 ? 'text-green-700' : 'text-gray-700'}`}>
                      {formatCurrency(printData.refundDue)}
                    </div>
                  </div>
                )}
              </div>

              {(typeof printData.newTotal === 'number' || typeof printData.newPaid === 'number' || typeof printData.newDue === 'number') && (
                <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded">
                  <div className="font-semibold mb-2">Adjusted Bill Summary</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-blue-700">New Total</div>
                      <div className="font-bold">{formatCurrency(Number(printData.newTotal || 0))}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700">New Paid</div>
                      <div className="font-bold">{formatCurrency(Number(printData.newPaid || 0))}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700">New Balance Due</div>
                      <div className="font-bold">{formatCurrency(Number(printData.newDue || 0))}</div>
                    </div>
                  </div>
                </div>
              )}

              {printData.remarks && (
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-1">Remarks:</div>
                  <div className="text-sm border-l-4 border-gray-300 pl-3">{printData.remarks}</div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="mb-8">Customer Signature</div>
                    <div className="border-t border-gray-400 w-48"></div>
                  </div>
                  <div>
                    <div className="mb-8">Pharmacist Signature</div>
                    <div className="border-t border-gray-400 w-48"></div>
                  </div>
                </div>
                <div className="text-center text-xs text-gray-500 mt-6">
                  This is a computer-generated return receipt. Original bill has been adjusted accordingly.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return History Modal */}
      {showReturnHistory && selectedReturnForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Return Details</h2>
                <p className="text-sm opacity-90">{selectedReturnForHistory.return_number}</p>
              </div>
              <button
                onClick={() => setShowReturnHistory(false)}
                className="text-white hover:bg-white/20 rounded-full p-2"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Return Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-blue-700">Return Date</div>
                  <div className="font-bold text-blue-900">{formatDate(selectedReturnForHistory.return_date)}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-green-700">Original Bill</div>
                  <div className="font-bold text-green-900">{selectedReturnForHistory.original_bill_number || 'N/A'}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-purple-700">Customer</div>
                  <div className="font-bold text-purple-900">{selectedReturnForHistory.customer_name || 'Walk-in'}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-sm text-orange-700">Refund Amount</div>
                  <div className="font-bold text-orange-900">{formatCurrency(Number(selectedReturnForHistory.total_amount || 0))}</div>
                </div>
              </div>

              {/* Return Items */}
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h3 className="text-lg font-semibold">Returned Items</h3>
                </div>
                
                {loadingHistory ? (
                  <div className="p-8 text-center">Loading items...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Restock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {returnHistoryItems.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium">{item.medication?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{item.medication?.medicine_code}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">{item.medication?.category || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm font-mono">{item.batch_number || 'N/A'}</td>
                            <td className="px-4 py-3 text-center font-bold">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total_amount)}</td>
                            <td className="px-4 py-3 text-sm">
                              {RETURN_REASONS.find(r => r.value === item.reason)?.label || item.reason}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.restock_status === 'restocked' ? 'bg-green-100 text-green-800' :
                                item.restock_status === 'disposed' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.restock_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {returnHistoryItems.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                              No items found
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-right font-bold">Total Refund:</td>
                          <td className="px-4 py-3 text-right font-bold text-lg text-green-600">
                            {formatCurrency(returnHistoryItems.reduce((sum, item) => sum + (item.total_amount || 0), 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Refund Mode</div>
                  <div className="font-semibold capitalize">{selectedReturnForHistory.refund_mode}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div>{getStatusBadge(selectedReturnForHistory.status)}</div>
                </div>
              </div>

              {selectedReturnForHistory.reason_details && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-yellow-800 mb-1">Remarks:</div>
                  <div className="text-sm text-yellow-900">{selectedReturnForHistory.reason_details}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
