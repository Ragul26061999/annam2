'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, AlertCircle, Package } from 'lucide-react'
import { supabase } from '@/src/lib/supabase'

interface BillItem {
  id: string
  description: string
  qty: number
  unit_amount: number
  total_amount: number
  medicine_id?: string
  batch_number?: string
}

interface BillEditModalProps {
  bill: any
  isOpen: boolean
  onClose: () => void
  onSave: (updatedBill: any, updatedItems: BillItem[]) => Promise<void>
}

export default function BillEditModal({ bill, isOpen, onClose, onSave }: BillEditModalProps) {
  const [items, setItems] = useState<BillItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && bill) {
      loadBillItems()
    }
  }, [isOpen, bill])

  const loadBillItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('billing_item')
        .select('*')
        .eq('billing_id', bill.id)

      if (error) throw error
      const normalized = (data || []).map((row: any) => ({
        ...row,
        qty: Number(row.qty ?? 0),
        unit_amount: Number(row.unit_amount ?? 0),
        total_amount: Number(row.total_amount ?? 0)
      }))
      setItems(normalized)
    } catch (err: any) {
      setError('Failed to load bill items: ' + (err?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const updatedItems = [...items]
    if (field === 'qty' || field === 'unit_amount') {
      const numValue = parseFloat(value.toString()) || 0
      if (field === 'qty' && numValue < 1) return // Prevent quantity less than 1
      ;(updatedItems[index] as any)[field] = numValue
      updatedItems[index].total_amount = updatedItems[index].qty * updatedItems[index].unit_amount
    } else if (field === 'description') {
      updatedItems[index].description = value as string
    }
    setItems(updatedItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0)
  }

  const calculateGST = () => {
    return items.reduce((sum, item) => sum + ((Number(item.total_amount) || 0) * 0.12), 0) // Assuming 12% GST
  }

  const handleSave = async () => {
    if (items.length === 0) {
      setError('Bill must have at least one item')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const updatedBill = {
        ...bill,
        subtotal: calculateTotal(),
        tax: calculateGST(),
        total: calculateTotal() + calculateGST()
      }

      await onSave(updatedBill, items)
      onClose()
    } catch (err: any) {
      setError('Failed to save bill: ' + (err?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Edit Pending Bill</h2>
            <p className="text-sm text-gray-600 mt-1">Bill: {bill?.bill_number}</p>
            <p className="text-sm text-gray-500">Customer: {bill?.customer_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bill Items Section */}
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Bill Items - Edit Quantities</h3>
                  <span className="text-sm text-gray-500">
                    {items.length} items
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <div className="font-medium text-sm">{item.description}</div>
                          {item.batch_number && (
                            <div className="text-xs text-gray-500">Batch: {item.batch_number}</div>
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleUpdateItem(index, 'qty', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_amount}
                            onChange={(e) => handleUpdateItem(index, 'unit_amount', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Total</div>
                            <div className="font-semibold text-sm">
                              ₹{item.total_amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No items in bill</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="text-lg font-medium mb-3">Updated Bill Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (12%):</span>
                    <span>₹{calculateGST().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-blue-200">
                    <span>Total:</span>
                    <span>₹{(calculateTotal() + calculateGST()).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || items.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
