'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, User, Calendar, Clock, CheckCircle, AlertCircle, Trash2, Receipt, Package, Activity, TrendingUp, Users, RotateCcw, Printer } from 'lucide-react'
import { supabase } from '../../../src/lib/supabase'
import { PharmacyBillPrint } from '../../../src/components/pharmacy/PharmacyBillPrint'

interface Prescription {
  id: string
  prescription_id: string
  patient_id: string
  patient_name: string
  doctor_id: string
  doctor_name: string
  prescription_date: string
  status: 'active' | 'dispensed' | 'expired'
  instructions: string
  items: PrescriptionItem[]
}

interface PrescriptionItem {
  id: string
  medication_id: string
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  dispensed_quantity: number
  instructions: string
  unit_price: number
  total_price: number
  status: 'pending' | 'dispensed' | 'cancelled'
}

export default function PrescribedListPage() {
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'dispensed' | 'all'>('all')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)

  // Calculate statistics
  const stats = {
    total: prescriptions.length,
    active: prescriptions.filter(p => p.status === 'active').length,
    dispensed: prescriptions.filter(p => p.status === 'dispensed').length,
    pendingItems: prescriptions.reduce((acc, p) => acc + p.items.filter(i => i.status === 'pending').length, 0),
    totalPatients: new Set(prescriptions.map(p => p.patient_id)).size,
    totalValue: prescriptions.reduce((acc, p) => acc + p.items.reduce((itemAcc, item) => itemAcc + item.total_price, 0), 0)
  }

  useEffect(() => {
    loadPrescriptions()
  }, [])

  const loadPrescriptions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch prescriptions with related patient, doctor, and items (with medication)
      const { data, error: prescError } = await supabase
        .from('prescriptions')
        .select(`
          id,
          prescription_id,
          patient_id,
          doctor_id,
          issue_date,
          instructions,
          status,
          created_at,
          patient:patients(id, patient_id, name),
          doctor:users(id, name),
          prescription_items(
            id,
            medication_id,
            dosage,
            frequency,
            duration,
            quantity,
            dispensed_quantity,
            instructions,
            unit_price,
            total_price,
            status,
            medication:medications(id, name, generic_name, strength)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (prescError) {
        console.error('Error fetching prescriptions - Details:', JSON.stringify(prescError, null, 2))
        throw prescError
      }

      const prescriptionsWithItems: Prescription[] = (data || []).map((prescription: any) => {
        const items: PrescriptionItem[] = (prescription.prescription_items || []).map((item: any) => ({
          id: item.id,
          medication_id: item.medication_id,
          medication_name: item.medication?.name || 'Unknown Medication',
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          dispensed_quantity: item.dispensed_quantity || 0,
          instructions: item.instructions || '',
          unit_price: item.unit_price,
          total_price: item.total_price,
          status: (item.status || 'pending') as 'pending' | 'dispensed' | 'cancelled'
        }))

        return {
          id: prescription.id,
          prescription_id: prescription.prescription_id,
          patient_id: prescription.patient_id,
          patient_name: prescription.patient?.name || 'Unknown Patient',
          doctor_id: prescription.doctor_id,
          doctor_name: prescription.doctor?.name || 'Unknown Doctor',
          prescription_date: prescription.issue_date || prescription.created_at?.split('T')[0] || '',
          status: (prescription.status || 'active') as 'active' | 'dispensed' | 'expired',
          instructions: prescription.instructions || '',
          items
        }
      })

      setPrescriptions(prescriptionsWithItems)
    } catch (err: any) {
      console.error('Error loading prescriptions:', err)
      setError(err.message || 'Failed to load prescriptions')
    } finally {
      setLoading(false)
    }
  }

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = prescription.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.doctor_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesTab = true
    if (activeTab === 'active') {
      matchesTab = prescription.status === 'active'
    } else if (activeTab === 'dispensed') {
      matchesTab = prescription.status === 'dispensed'
    }
    
    return matchesSearch && matchesTab
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-yellow-100 text-yellow-800'
      case 'dispensed':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-gray-200 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4" />
      case 'dispensed':
        return <CheckCircle className="w-4 h-4" />
      case 'expired':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const handleCreateBill = (prescription: Prescription) => {
    router.push(`/pharmacy/newbilling?prescriptionId=${encodeURIComponent(prescription.id)}`)
  }

  const handleReturnBill = (prescription: Prescription) => {
    router.push(`/pharmacy/sales-return?prescriptionId=${encodeURIComponent(prescription.id)}`)
  }

  const handlePrintBill = (prescription: Prescription) => {
    setSelectedPrescription(prescription)
    setShowPrintModal(true)
  }

  const handleDeletePrescription = async (prescription: Prescription) => {
    const ok = window.confirm(`Delete prescription ${prescription.prescription_id} for ${prescription.patient_name}?`)
    if (!ok) return

    try {
      setLoading(true)
      setError(null)

      const { error: itemsError } = await supabase
        .from('prescription_items')
        .delete()
        .eq('prescription_id', prescription.id)
      if (itemsError) throw itemsError

      const { error: prescError } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescription.id)
      if (prescError) throw prescError

      await loadPrescriptions()
    } catch (err: any) {
      console.error('Error deleting prescription - Details:', JSON.stringify(err, null, 2))
      setError(err?.message || 'Failed to delete prescription')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prescribed List</h1>
          <p className="text-gray-600 mt-1">Manage patient prescriptions and medicine dispensing</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Prescriptions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Prescriptions</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.active}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispensed Prescriptions</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.dispensed}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{stats.totalValue.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by patient or doctor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Prescriptions ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setActiveTab('dispensed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dispensed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dispensed ({stats.dispensed})
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab === 'all' ? '' : activeTab === 'active' ? 'Active' : 'Dispensed'} Prescriptions Found
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'No prescriptions match your search criteria.' : 
               activeTab === 'all' ? 'No prescriptions found in the system.' :
               activeTab === 'active' ? 'No active prescriptions found.' :
               'No dispensed prescriptions found.'}
            </p>
          </div>
        ) : (
          filteredPrescriptions.map((prescription) => (
            <div key={prescription.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{prescription.patient_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusBadge(prescription.status)}`}>
                      {getStatusIcon(prescription.status)}
                      {prescription.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Dr. {prescription.doctor_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(prescription.prescription_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{prescription.items.length} item(s)</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {prescription.status === 'active' ? (
                    <>
                      <button
                        onClick={() => handleCreateBill(prescription)}
                        className="btn-primary text-sm flex items-center gap-2"
                        disabled={!prescription.items.some(i => i.status === 'pending')}
                      >
                        <Receipt className="w-4 h-4" />
                        Create Bill
                      </button>
                      <button
                        onClick={() => handleDeletePrescription(prescription)}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  ) : prescription.status === 'dispensed' ? (
                    <>
                      <button
                        onClick={() => handlePrintBill(prescription)}
                        className="btn-primary text-sm flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print Bill
                      </button>
                      <button
                        onClick={() => handleReturnBill(prescription)}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Return
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDeletePrescription(prescription)}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Prescription Items */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Prescribed Medicines</h4>
                <div className="space-y-2">
                  {prescription.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.medication_name}</div>
                        <div className="text-sm text-gray-600">
                          {item.dosage} • {item.frequency} • {item.duration}
                        </div>
                        {item.instructions && (
                          <div className="text-sm text-blue-600 mt-1">{item.instructions}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {item.dispensed_quantity}/{item.quantity}
                        </div>
                        <div className="text-sm text-gray-600">dispensed</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print Modal */}
      {showPrintModal && selectedPrescription && (
        <PharmacyBillPrint
          prescription={selectedPrescription}
          onClose={() => {
            setShowPrintModal(false)
            setSelectedPrescription(null)
          }}
        />
      )}
    </div>
  )
}
