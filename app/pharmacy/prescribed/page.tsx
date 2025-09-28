'use client'

import React, { useState, useEffect } from 'react'
import { Search, Plus, FileText, User, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface Prescription {
  id: string
  patient_id: string
  patient_name: string
  doctor_id: string
  doctor_name: string
  prescription_date: string
  status: 'pending' | 'partially_dispensed' | 'completed'
  items: PrescriptionItem[]
}

interface PrescriptionItem {
  id: string
  medicine_id: string
  medicine_name: string
  dosage: string
  frequency: string
  duration: string
  quantity_prescribed: number
  quantity_dispensed: number
  instructions: string
}

interface Medicine {
  id: string
  name: string
  category: string
  stock_quantity: number
  unit_price: number
  batch_number: string
  expiry_date: string
}

export default function PrescribedListPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [showDispenseModal, setShowDispenseModal] = useState(false)

  useEffect(() => {
    loadPrescriptions()
    loadMedicines()
  }, [])

  const loadPrescriptions = async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual API call
      const mockPrescriptions: Prescription[] = [
        {
          id: '1',
          patient_id: 'p1',
          patient_name: 'John Doe',
          doctor_id: 'd1',
          doctor_name: 'Dr. Smith',
          prescription_date: '2024-01-15',
          status: 'pending',
          items: [
            {
              id: 'pi1',
              medicine_id: 'm1',
              medicine_name: 'Paracetamol 500mg',
              dosage: '500mg',
              frequency: 'Twice daily',
              duration: '5 days',
              quantity_prescribed: 10,
              quantity_dispensed: 0,
              instructions: 'Take after meals'
            }
          ]
        }
      ]
      setPrescriptions(mockPrescriptions)
    } catch (err) {
      setError('Failed to load prescriptions')
    } finally {
      setLoading(false)
    }
  }

  const loadMedicines = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockMedicines: Medicine[] = [
        {
          id: 'm1',
          name: 'Paracetamol 500mg',
          category: 'Analgesic',
          stock_quantity: 100,
          unit_price: 5.00,
          batch_number: 'B001',
          expiry_date: '2025-12-31'
        }
      ]
      setMedicines(mockMedicines)
    } catch (err) {
      console.error('Failed to load medicines:', err)
    }
  }

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = prescription.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.doctor_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'partially_dispensed':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'partially_dispensed':
        return <AlertCircle className="w-4 h-4" />
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const handleDispense = (prescription: Prescription) => {
    setSelectedPrescription(prescription)
    setShowDispenseModal(true)
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

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by patient or doctor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partially_dispensed">Partially Dispensed</option>
            <option value="completed">Completed</option>
          </select>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Prescriptions Found</h3>
            <p className="text-gray-600">No prescriptions match your current filters.</p>
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
                      {prescription.status.replace('_', ' ')}
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
                  <button
                    onClick={() => handleDispense(prescription)}
                    className="btn-primary text-sm"
                    disabled={prescription.status === 'completed'}
                  >
                    {prescription.status === 'completed' ? 'Completed' : 'Dispense'}
                  </button>
                </div>
              </div>

              {/* Prescription Items */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Prescribed Medicines</h4>
                <div className="space-y-2">
                  {prescription.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.medicine_name}</div>
                        <div className="text-sm text-gray-600">
                          {item.dosage} • {item.frequency} • {item.duration}
                        </div>
                        {item.instructions && (
                          <div className="text-sm text-blue-600 mt-1">{item.instructions}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {item.quantity_dispensed}/{item.quantity_prescribed}
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

      {/* Dispense Modal - Placeholder */}
      {showDispenseModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Dispense Medicines</h2>
            <p className="text-gray-600 mb-4">
              Dispensing medicines for {selectedPrescription.patient_name}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDispenseModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle dispensing logic here
                  setShowDispenseModal(false)
                }}
                className="btn-primary"
              >
                Dispense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}