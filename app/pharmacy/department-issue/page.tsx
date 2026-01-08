'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Eye, Building2, XCircle, CheckCircle, Clock, Package
} from 'lucide-react'
import {
  getDepartments,
  getDepartmentDrugIssues,
  createDepartmentDrugIssue,
  issueDepartmentDrugs,
  DepartmentDrugIssue,
  DepartmentDrugIssueItem
} from '@/src/lib/enhancedPharmacyService'
import { getMedications } from '@/src/lib/pharmacyService'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DepartmentDrugIssuePage() {
  const [issues, setIssues] = useState<DepartmentDrugIssue[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    department_id: '',
    department_name: '',
    requester_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    purpose: '',
    remarks: ''
  })
  
  const [items, setItems] = useState<DepartmentDrugIssueItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [filterStatus])

  const loadData = async () => {
    setLoading(true)
    try {
      const [issuesData, deptsData, medsData] = await Promise.all([
        getDepartmentDrugIssues({ status: filterStatus || undefined }),
        getDepartments(),
        getMedications()
      ])
      setIssues(issuesData)
      setDepartments(deptsData)
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
      medication_name: '',
      requested_quantity: 0,
      issued_quantity: 0,
      unit_price: 0,
      status: 'pending'
    }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'medication_id') {
      const med = medications.find(m => m.id === value)
      if (med) {
        newItems[index].medication_name = med.name
        newItems[index].unit_price = med.selling_price || 0
      }
    }
    
    setItems(newItems)
  }

  const handleDepartmentChange = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId)
    setFormData({
      ...formData,
      department_id: deptId,
      department_name: dept?.name || ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.department_name || items.length === 0) {
      alert('Please select department and add items')
      return
    }

    try {
      await createDepartmentDrugIssue({
        ...formData,
        status: 'pending'
      }, items)

      alert('Issue request created successfully!')
      setShowForm(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error creating issue:', error)
      alert('Failed to create issue request')
    }
  }

  const resetForm = () => {
    setFormData({
      department_id: '',
      department_name: '',
      requester_name: '',
      issue_date: new Date().toISOString().split('T')[0],
      purpose: '',
      remarks: ''
    })
    setItems([])
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      issued: 'bg-green-100 text-green-800',
      partial: 'bg-orange-100 text-orange-800',
      rejected: 'bg-red-100 text-red-800',
      returned: 'bg-purple-100 text-purple-800'
    }
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="w-3 h-3 mr-1" />,
      approved: <CheckCircle className="w-3 h-3 mr-1" />,
      issued: <Package className="w-3 h-3 mr-1" />
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const totalValue = items.reduce((sum, item) => sum + (item.requested_quantity * (item.unit_price || 0)), 0)

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Drug Issue</h1>
          <p className="text-gray-600">Issue drugs to hospital departments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Issue Request
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by issue number or department..."
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="issued">Issued</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {issues.filter(i => 
              !searchTerm || 
              i.issue_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
              i.department_name.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((issue) => (
              <tr key={issue.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-purple-600">{issue.issue_number}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                    {issue.department_name}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{issue.requester_name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm">{formatDate(issue.issue_date)}</td>
                <td className="px-6 py-4 text-sm">{issue.total_items}</td>
                <td className="px-6 py-4 text-sm font-medium">{formatCurrency(issue.total_value)}</td>
                <td className="px-6 py-4">{getStatusBadge(issue.status)}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                    {issue.status === 'approved' && (
                      <button className="text-green-600 hover:text-green-800 text-xs bg-green-50 px-2 py-1 rounded">
                        Issue
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No issues found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">New Department Drug Issue Request</h2>
              <button onClick={() => setShowForm(false)}><XCircle className="w-6 h-6 text-gray-500" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department *</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Requested By</label>
                  <input
                    type="text"
                    value={formData.requester_name}
                    onChange={(e) => setFormData({...formData, requester_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Name of requester"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Issue Date *</label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Purpose</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Purpose of request"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Requested Items</h3>
                  <button type="button" onClick={addItem} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">
                    <Plus className="w-4 h-4 inline mr-1" />Add Item
                  </button>
                </div>

                <table className="min-w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-xs text-left">Medicine</th>
                      <th className="px-3 py-2 text-xs text-left">Available Stock</th>
                      <th className="px-3 py-2 text-xs text-left">Requested Qty</th>
                      <th className="px-3 py-2 text-xs text-left">Unit Price</th>
                      <th className="px-3 py-2 text-xs text-left">Total</th>
                      <th className="px-3 py-2 text-xs"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const med = medications.find(m => m.id === item.medication_id)
                      return (
                        <tr key={index} className="border-t">
                          <td className="px-2 py-2">
                            <select
                              value={item.medication_id}
                              onChange={(e) => updateItem(index, 'medication_id', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-sm"
                              required
                            >
                              <option value="">Select Medicine</option>
                              {medications.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.available_stock} in stock)</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-sm text-center">
                            {med?.available_stock || 0}
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.requested_quantity || ''}
                              onChange={(e) => updateItem(index, 'requested_quantity', parseInt(e.target.value) || 0)}
                              className="w-20 border rounded px-2 py-1 text-sm"
                              min="1"
                              max={med?.available_stock || 9999}
                              required
                            />
                          </td>
                          <td className="px-2 py-2 text-sm">{formatCurrency(item.unit_price || 0)}</td>
                          <td className="px-2 py-2 text-sm font-medium">
                            {formatCurrency(item.requested_quantity * (item.unit_price || 0))}
                          </td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => removeItem(index)} className="text-red-600">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-bold">Total Value: {formatCurrency(totalValue)}</div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg">Submit Request</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
