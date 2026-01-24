'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, User, Calendar, Clock, CheckCircle, AlertCircle, Trash2, Receipt, Package, Activity, TrendingUp, Users, RotateCcw, Printer, Eye, X } from 'lucide-react'
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
  status: 'active' | 'partially_dispensed' | 'dispensed' | 'expired'
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

interface LinkedBillItem {
  billing_id: string
  ref_id: string | null
  description: string | null
  qty: number | null
  unit_amount: number | null
  total_amount: number | null
  batch_number: string | null
  expiry_date: string | null
}

interface LinkedBill {
  id: string
  bill_number: string | null
  created_at: string | null
  total: number | null
  amount_paid: number | null
  balance_due: number | null
  payment_method: string | null
  payment_status: string | null
  customer_name: string | null
}

interface LinkedPayment {
  id: string
  billing_id: string
  amount: number
  method: string
  reference: string | null
  paid_at: string | null
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

  const [showBillsModal, setShowBillsModal] = useState(false)
  const [billsLoading, setBillsLoading] = useState(false)
  const [selectedBillsPrescription, setSelectedBillsPrescription] = useState<Prescription | null>(null)
  const [linkedBills, setLinkedBills] = useState<LinkedBill[]>([])
  const [linkedBillItems, setLinkedBillItems] = useState<LinkedBillItem[]>([])
  const [linkedPayments, setLinkedPayments] = useState<LinkedPayment[]>([])

  const getDerivedPrescriptionStatus = (prescription: { status?: string; prescription_items?: any[] }): Prescription['status'] => {
    const baseStatus = (prescription.status || 'active').toLowerCase()
    if (baseStatus === 'expired') return 'expired'
    if (baseStatus === 'dispensed') return 'dispensed'

    const items = Array.isArray(prescription.prescription_items) ? prescription.prescription_items : []
    if (items.length === 0) return 'active'

    const anyDispensed = items.some((it: any) => (Number(it.dispensed_quantity) || 0) > 0)
    const allDone = items.every((it: any) => (Number(it.dispensed_quantity) || 0) >= (Number(it.quantity) || 0))
    if (allDone) return 'dispensed'
    if (anyDispensed) return 'partially_dispensed'
    return 'active'
  }

  const getStatusLabel = (status: Prescription['status']) => {
    switch (status) {
      case 'partially_dispensed':
        return 'Partially Dispensed'
      default:
        return status
    }
  }

  const openBillsModal = async (prescription: Prescription) => {
    try {
      setBillsLoading(true)
      setSelectedBillsPrescription(prescription)
      setShowBillsModal(true)

      const { data: authData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authData?.user) {
        console.warn('User not authenticated while loading linked bills:', {
          message: (authErr as any)?.message,
          details: (authErr as any)?.details,
          hint: (authErr as any)?.hint,
          code: (authErr as any)?.code
        })
        throw new Error('Please sign in again to view bills')
      }

      const { data: pItems, error: pItemsErr } = await supabase
        .from('prescription_items')
        .select('id')
        .eq('prescription_id', prescription.id)

      if (pItemsErr) {
        console.warn('Failed loading prescription_items ids for linked bills:', {
          message: (pItemsErr as any)?.message,
          details: (pItemsErr as any)?.details,
          hint: (pItemsErr as any)?.hint,
          code: (pItemsErr as any)?.code
        })
        throw pItemsErr
      }
      const prescriptionItemIds = (pItems || []).map((r: any) => r.id).filter(Boolean)
      if (prescriptionItemIds.length === 0) {
        setLinkedBills([])
        setLinkedBillItems([])
        setLinkedPayments([])
        return
      }

      const { data: billItems, error: billItemsErr } = await supabase
        .from('billing_item')
        .select('billing_id, ref_id, description, qty, unit_amount, total_amount, batch_number, expiry_date')
        .in('ref_id', prescriptionItemIds)

      if (billItemsErr) {
        console.warn('Failed loading billing_item rows for linked bills:', {
          message: (billItemsErr as any)?.message,
          details: (billItemsErr as any)?.details,
          hint: (billItemsErr as any)?.hint,
          code: (billItemsErr as any)?.code
        })
        throw billItemsErr
      }
      const normalizedBillItems: LinkedBillItem[] = (billItems || []).map((x: any) => ({
        billing_id: String(x.billing_id),
        ref_id: x.ref_id ? String(x.ref_id) : null,
        description: x.description ?? null,
        qty: x.qty !== null && x.qty !== undefined ? Number(x.qty) : null,
        unit_amount: x.unit_amount !== null && x.unit_amount !== undefined ? Number(x.unit_amount) : null,
        total_amount: x.total_amount !== null && x.total_amount !== undefined ? Number(x.total_amount) : null,
        batch_number: x.batch_number ?? null,
        expiry_date: x.expiry_date ?? null
      }))
      setLinkedBillItems(normalizedBillItems)

      const billIds = Array.from(new Set(normalizedBillItems.map(bi => bi.billing_id))).filter(Boolean)
      if (billIds.length === 0) {
        setLinkedBills([])
        setLinkedPayments([])
        return
      }

      const { data: bills, error: billsErr } = await supabase
        .from('billing')
        .select('id, bill_number, created_at, total, amount_paid, balance_due, payment_method, payment_status, customer_name')
        .in('id', billIds)
        .order('created_at', { ascending: false })

      if (billsErr) {
        console.warn('Failed loading billing headers for linked bills:', {
          message: (billsErr as any)?.message,
          details: (billsErr as any)?.details,
          hint: (billsErr as any)?.hint,
          code: (billsErr as any)?.code
        })
        throw billsErr
      }
      setLinkedBills((bills || []).map((b: any) => ({
        id: String(b.id),
        bill_number: b.bill_number ?? null,
        created_at: b.created_at ?? null,
        total: b.total !== null && b.total !== undefined ? Number(b.total) : null,
        amount_paid: b.amount_paid !== null && b.amount_paid !== undefined ? Number(b.amount_paid) : null,
        balance_due: b.balance_due !== null && b.balance_due !== undefined ? Number(b.balance_due) : null,
        payment_method: b.payment_method ?? null,
        payment_status: b.payment_status ?? null,
        customer_name: b.customer_name ?? null
      })))

      const { data: pays, error: paysErr } = await supabase
        .from('billing_payments')
        .select('id, billing_id, amount, method, reference, paid_at')
        .in('billing_id', billIds)
        .order('paid_at', { ascending: false })

      if (paysErr) {
        console.warn('Failed loading billing_payments for linked bills:', {
          message: (paysErr as any)?.message,
          details: (paysErr as any)?.details,
          hint: (paysErr as any)?.hint,
          code: (paysErr as any)?.code
        })
        throw paysErr
      }
      setLinkedPayments((pays || []).map((p: any) => ({
        id: String(p.id),
        billing_id: String(p.billing_id),
        amount: Number(p.amount) || 0,
        method: String(p.method || ''),
        reference: p.reference ?? null,
        paid_at: p.paid_at ?? null
      })))
    } catch (e: any) {
      console.error('Error loading linked bills:', {
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        code: e?.code,
        raw: e
      })
      setLinkedBills([])
      setLinkedBillItems([])
      setLinkedPayments([])
    } finally {
      setBillsLoading(false)
    }
  }

  const closeBillsModal = () => {
    setShowBillsModal(false)
    setSelectedBillsPrescription(null)
    setLinkedBills([])
    setLinkedBillItems([])
    setLinkedPayments([])
  }

  // Calculate statistics
  const stats = {
    total: prescriptions.length,
    active: prescriptions.filter(p => p.status === 'active').length,
    dispensed: prescriptions.filter(p => p.status === 'dispensed' || p.status === 'partially_dispensed').length,
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

        const derivedStatus = getDerivedPrescriptionStatus(prescription)

        return {
          id: prescription.id,
          prescription_id: prescription.prescription_id,
          patient_id: prescription.patient_id,
          patient_name: prescription.patient?.name || 'Unknown Patient',
          doctor_id: prescription.doctor_id,
          doctor_name: prescription.doctor?.name || 'Unknown Doctor',
          prescription_date: prescription.issue_date || prescription.created_at?.split('T')[0] || '',
          status: derivedStatus,
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
      matchesTab = prescription.status === 'dispensed' || prescription.status === 'partially_dispensed'
    }
    
    return matchesSearch && matchesTab
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-yellow-100 text-yellow-800'
      case 'partially_dispensed':
        return 'bg-blue-100 text-blue-800'
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
      case 'partially_dispensed':
        return <Activity className="w-4 h-4" />
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
                      {getStatusLabel(prescription.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    {prescription.doctor_name && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Dr. {prescription.doctor_name}</span>
                      </div>
                    )}
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
                  {prescription.status !== 'dispensed' ? (
                    <>
                      <button
                        onClick={() => handleCreateBill(prescription)}
                        className="btn-primary text-sm flex items-center gap-2"
                        disabled={!prescription.items.some(i => i.status === 'pending')}
                      >
                        <Receipt className="w-4 h-4" />
                        Create Bill
                      </button>
                      {prescription.items.some(i => (Number(i.dispensed_quantity) || 0) > 0) ? (
                        <button
                          onClick={() => openBillsModal(prescription)}
                          className="btn-secondary text-sm flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Bills
                        </button>
                      ) : null}
                      {!prescription.items.some(i => (Number(i.dispensed_quantity) || 0) > 0) ? (
                        <button
                          onClick={() => handleDeletePrescription(prescription)}
                          className="btn-danger text-sm flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openBillsModal(prescription)}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Bills
                      </button>
                      <button
                        onClick={() => handlePrintBill(prescription)}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                    </>
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

      {showBillsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Bills</h2>
                {selectedBillsPrescription ? (
                  <div className="text-sm text-gray-600">
                    {selectedBillsPrescription.patient_name} · {selectedBillsPrescription.prescription_id}
                  </div>
                ) : null}
              </div>
              <button onClick={closeBillsModal} className="p-2 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {billsLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : linkedBills.length === 0 ? (
                <div className="text-sm text-gray-600">No bills found for dispensed items.</div>
              ) : (
                linkedBills.map(b => {
                  const billTotal = Number(b.total ?? 0) || 0
                  const billItems = linkedBillItems.filter(it => it.billing_id === b.id)
                  const billPays = linkedPayments.filter(p => p.billing_id === b.id)
                  return (
                    <div key={b.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="font-semibold">{b.bill_number || b.id}</div>
                          <div className="text-sm text-gray-600">
                            {b.created_at ? new Date(b.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                        <div className="text-sm">
                          <div><strong>Total:</strong> ₹{billTotal.toFixed(2)}</div>
                          <div><strong>Status:</strong> {b.payment_status || ''}</div>
                        </div>
                      </div>

                      {billItems.length > 0 ? (
                        <div className="mt-3">
                          <div className="text-sm font-medium mb-2">Items</div>
                          <div className="space-y-2">
                            {billItems.map((it, idx) => (
                              <div key={`${it.billing_id}-${idx}`} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                                <div className="flex-1 pr-2">
                                  <div className="font-medium">{it.description || 'Item'}</div>
                                  <div className="text-gray-600">Batch: {it.batch_number || '-'} · Exp: {it.expiry_date || '-'}</div>
                                </div>
                                <div className="text-right">
                                  <div>{Number(it.qty || 0)}/{''}</div>
                                  <div>₹{Number(it.total_amount || 0).toFixed(2)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3">
                        <div className="text-sm font-medium mb-2">Payments</div>
                        {billPays.length === 0 ? (
                          <div className="text-sm text-gray-600">No payment transactions recorded.</div>
                        ) : (
                          <div className="space-y-2">
                            {billPays.map(p => (
                              <div key={p.id} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                                <div>
                                  <div className="font-medium">{String(p.method || '').toUpperCase()}</div>
                                  <div className="text-gray-600">{p.paid_at ? new Date(p.paid_at).toLocaleString() : ''}{p.reference ? ` · Ref: ${p.reference}` : ''}</div>
                                </div>
                                <div className="font-medium">₹{Number(p.amount || 0).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
