'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Eye, XCircle, Wallet, Clock, CheckCircle, AlertTriangle,
  CreditCard, Smartphone, Building, DollarSign, ArrowRightLeft
} from 'lucide-react'
import {
  getCashCollections,
  createCashCollection,
  closeCashCollection,
  CashCollection
} from '@/src/lib/enhancedPharmacyService'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const SHIFTS = [
  { value: 'morning', label: 'Morning (6 AM - 2 PM)' },
  { value: 'afternoon', label: 'Afternoon (2 PM - 10 PM)' },
  { value: 'night', label: 'Night (10 PM - 6 AM)' },
  { value: 'general', label: 'General (Full Day)' }
]

const DENOMINATIONS = [
  { value: '2000', label: '₹2000' },
  { value: '500', label: '₹500' },
  { value: '200', label: '₹200' },
  { value: '100', label: '₹100' },
  { value: '50', label: '₹50' },
  { value: '20', label: '₹20' },
  { value: '10', label: '₹10' },
  { value: '5', label: '₹5' },
  { value: '2', label: '₹2' },
  { value: '1', label: '₹1' }
]

export default function CashCollectionPage() {
  const [collections, setCollections] = useState<CashCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCloseForm, setShowCloseForm] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<CashCollection | null>(null)
  
  const [formData, setFormData] = useState({
    collection_date: new Date().toISOString().split('T')[0],
    shift: 'general' as const,
    collector_name: '',
    opening_cash: 0,
    cash_sales: 0,
    card_collections: 0,
    upi_collections: 0,
    insurance_collections: 0,
    credit_collections: 0,
    cash_refunds: 0,
    total_bills: 0,
    total_returns: 0
  })

  const [closeFormData, setCloseFormData] = useState({
    actual_cash: 0,
    denominations: {} as Record<string, number>,
    remarks: ''
  })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [filterStatus])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getCashCollections({ status: filterStatus || undefined })
      setCollections(data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    const totalCollections = 
      (formData.cash_sales || 0) +
      (formData.card_collections || 0) +
      (formData.upi_collections || 0) +
      (formData.insurance_collections || 0) +
      (formData.credit_collections || 0)

    const expectedCash = 
      (formData.opening_cash || 0) +
      (formData.cash_sales || 0) -
      (formData.cash_refunds || 0)

    return { totalCollections, expectedCash }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createCashCollection({
        ...formData,
        collected_by: 'current-user-id' // Would come from auth
      })

      alert('Cash collection started successfully!')
      setShowForm(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error creating collection:', error)
      alert('Failed to create collection')
    }
  }

  const handleCloseCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCollection) return

    try {
      await closeCashCollection(
        selectedCollection.id,
        closeFormData.actual_cash,
        closeFormData.denominations,
        undefined,
        closeFormData.remarks
      )

      alert('Cash collection closed successfully!')
      setShowCloseForm(false)
      setSelectedCollection(null)
      setCloseFormData({ actual_cash: 0, denominations: {}, remarks: '' })
      loadData()
    } catch (error) {
      console.error('Error closing collection:', error)
      alert('Failed to close collection')
    }
  }

  const resetForm = () => {
    setFormData({
      collection_date: new Date().toISOString().split('T')[0],
      shift: 'general',
      collector_name: '',
      opening_cash: 0,
      cash_sales: 0,
      card_collections: 0,
      upi_collections: 0,
      insurance_collections: 0,
      credit_collections: 0,
      cash_refunds: 0,
      total_bills: 0,
      total_returns: 0
    })
  }

  const updateDenomination = (denom: string, count: number) => {
    const newDenoms = { ...closeFormData.denominations, [denom]: count }
    const total = Object.entries(newDenoms).reduce((sum, [d, c]) => sum + (parseInt(d) * c), 0)
    setCloseFormData({
      ...closeFormData,
      denominations: newDenoms,
      actual_cash: total
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-green-100 text-green-800',
      closed: 'bg-blue-100 text-blue-800',
      verified: 'bg-purple-100 text-purple-800',
      discrepancy: 'bg-red-100 text-red-800'
    }
    const icons: Record<string, React.ReactNode> = {
      open: <Clock className="w-3 h-3 mr-1" />,
      closed: <CheckCircle className="w-3 h-3 mr-1" />,
      verified: <CheckCircle className="w-3 h-3 mr-1" />,
      discrepancy: <AlertTriangle className="w-3 h-3 mr-1" />
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.open}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const { totalCollections, expectedCash } = calculateTotals()

  // Summary stats
  const todayCollections = collections.filter(c => c.collection_date === new Date().toISOString().split('T')[0])
  const openCollections = collections.filter(c => c.status === 'open')
  const totalCashToday = todayCollections.reduce((sum, c) => sum + (c.cash_sales || 0), 0)

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Collection</h1>
          <p className="text-gray-600">Manage daily cash collections and handovers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Start Collection
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-700">Today's Cash</div>
              <div className="text-2xl font-bold text-green-800">{formatCurrency(totalCashToday)}</div>
            </div>
            <Wallet className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-700">Today's Collections</div>
              <div className="text-2xl font-bold text-blue-800">{todayCollections.length}</div>
            </div>
            <ArrowRightLeft className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-yellow-700">Open Sessions</div>
              <div className="text-2xl font-bold text-yellow-800">{openCollections.length}</div>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-700">This Month</div>
              <div className="text-2xl font-bold text-purple-800">{collections.length}</div>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
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
              placeholder="Search by collection number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="verified">Verified</option>
            <option value="discrepancy">Discrepancy</option>
          </select>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collector</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash Sales</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {collections.filter(c => 
              !searchTerm || c.collection_number.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((collection) => (
              <tr key={collection.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-green-600">{collection.collection_number}</td>
                <td className="px-6 py-4 text-sm">{formatDate(collection.collection_date)}</td>
                <td className="px-6 py-4 text-sm capitalize">{collection.shift}</td>
                <td className="px-6 py-4 text-sm">{collection.collector_name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm font-medium">{formatCurrency(collection.cash_sales)}</td>
                <td className="px-6 py-4 text-sm font-medium">{formatCurrency(collection.total_collections)}</td>
                <td className="px-6 py-4 text-sm">
                  {collection.status !== 'open' ? (
                    <span className={collection.cash_difference < 0 ? 'text-red-600' : collection.cash_difference > 0 ? 'text-green-600' : ''}>
                      {collection.cash_difference !== 0 ? formatCurrency(collection.cash_difference) : '-'}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-6 py-4">{getStatusBadge(collection.status)}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                    {collection.status === 'open' && (
                      <button 
                        onClick={() => {
                          setSelectedCollection(collection)
                          setCloseFormData({
                            actual_cash: 0,
                            denominations: {},
                            remarks: ''
                          })
                          setShowCloseForm(true)
                        }}
                        className="text-green-600 hover:text-green-800 text-xs bg-green-50 px-2 py-1 rounded"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {collections.length === 0 && (
              <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No collections found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Start Collection Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-green-600" />
                Start Cash Collection
              </h2>
              <button onClick={() => setShowForm(false)}><XCircle className="w-6 h-6 text-gray-500" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.collection_date}
                    onChange={(e) => setFormData({...formData, collection_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shift *</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({...formData, shift: e.target.value as any})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Collector Name *</label>
                  <input
                    type="text"
                    value={formData.collector_name}
                    onChange={(e) => setFormData({...formData, collector_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-4 flex items-center">
                    <Wallet className="w-4 h-4 mr-2" /> Cash
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Opening Cash</label>
                      <input
                        type="number"
                        value={formData.opening_cash || ''}
                        onChange={(e) => setFormData({...formData, opening_cash: parseFloat(e.target.value) || 0})}
                        className="w-full border rounded px-3 py-2"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Cash Sales</label>
                      <input
                        type="number"
                        value={formData.cash_sales || ''}
                        onChange={(e) => setFormData({...formData, cash_sales: parseFloat(e.target.value) || 0})}
                        className="w-full border rounded px-3 py-2"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Cash Refunds</label>
                      <input
                        type="number"
                        value={formData.cash_refunds || ''}
                        onChange={(e) => setFormData({...formData, cash_refunds: parseFloat(e.target.value) || 0})}
                        className="w-full border rounded px-3 py-2"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-4 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" /> Other Collections
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Card Collections</label>
                      <input
                        type="number"
                        value={formData.card_collections || ''}
                        onChange={(e) => setFormData({...formData, card_collections: parseFloat(e.target.value) || 0})}
                        className="w-full border rounded px-3 py-2"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">UPI Collections</label>
                      <input
                        type="number"
                        value={formData.upi_collections || ''}
                        onChange={(e) => setFormData({...formData, upi_collections: parseFloat(e.target.value) || 0})}
                        className="w-full border rounded px-3 py-2"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Insurance</label>
                      <input
                        type="number"
                        value={formData.insurance_collections || ''}
                        onChange={(e) => setFormData({...formData, insurance_collections: parseFloat(e.target.value) || 0})}
                        className="w-full border rounded px-3 py-2"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Bills</label>
                  <input
                    type="number"
                    value={formData.total_bills || ''}
                    onChange={(e) => setFormData({...formData, total_bills: parseInt(e.target.value) || 0})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Returns</label>
                  <input
                    type="number"
                    value={formData.total_returns || ''}
                    onChange={(e) => setFormData({...formData, total_returns: parseInt(e.target.value) || 0})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="text-sm text-blue-700">Total Collections</div>
                  <div className="text-xl font-bold text-blue-800">{formatCurrency(totalCollections)}</div>
                </div>
                <div>
                  <div className="text-sm text-green-700">Expected Cash</div>
                  <div className="text-xl font-bold text-green-800">{formatCurrency(expectedCash)}</div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg">Start Collection</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Collection Form Modal */}
      {showCloseForm && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Close Cash Collection</h2>
              <button onClick={() => setShowCloseForm(false)}><XCircle className="w-6 h-6 text-gray-500" /></button>
            </div>

            <form onSubmit={handleCloseCollection} className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Collection: {selectedCollection.collection_number}</div>
                <div className="text-lg font-bold">Expected Cash: {formatCurrency(selectedCollection.expected_cash)}</div>
              </div>

              <div>
                <h3 className="font-medium mb-4">Cash Denomination Count</h3>
                <div className="grid grid-cols-5 gap-2">
                  {DENOMINATIONS.map(d => (
                    <div key={d.value} className="text-center">
                      <div className="text-xs text-gray-600 mb-1">{d.label}</div>
                      <input
                        type="number"
                        value={closeFormData.denominations[d.value] || ''}
                        onChange={(e) => updateDenomination(d.value, parseInt(e.target.value) || 0)}
                        className="w-full border rounded px-2 py-1 text-center text-sm"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-blue-700">Actual Cash (from denominations)</div>
                    <div className="text-2xl font-bold text-blue-800">{formatCurrency(closeFormData.actual_cash)}</div>
                  </div>
                  <div className={`text-right ${closeFormData.actual_cash - selectedCollection.expected_cash < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <div className="text-sm">Difference</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(closeFormData.actual_cash - selectedCollection.expected_cash)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <textarea
                  value={closeFormData.remarks}
                  onChange={(e) => setCloseFormData({...closeFormData, remarks: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Any notes about the collection..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowCloseForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg">Close Collection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
