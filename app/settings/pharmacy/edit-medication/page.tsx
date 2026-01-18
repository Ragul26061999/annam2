'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Plus,
  Package,
  Calendar,
  DollarSign,
  Hash,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

interface MedicationBatch {
  id: string;
  batch_number: string;
  expiry_date: string;
  current_quantity: number;
  received_quantity: number;
  purchase_price: number;
  selling_price: number;
  manufacturing_date?: string;
  received_date?: string;
  supplier_name?: string;
  status: string;
  is_active: boolean;
}

interface Medication {
  id: string;
  name: string;
  combination?: string;
  generic_name?: string;
  manufacturer?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  unit?: string;
  purchase_price?: number;
  selling_price?: number;
  mrp?: number;
  total_stock: number;
  available_stock: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  prescription_required?: boolean;
  hsn_code?: string;
  gst_percent?: number;
  cgst_percent?: number;
  sgst_percent?: number;
  igst_percent?: number;
  batches?: MedicationBatch[];
  batchCount?: number;
}

const EditMedicationPage = () => {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMedication, setExpandedMedication] = useState<string | null>(null);
  const [loadingBatches, setLoadingBatches] = useState<string | null>(null);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
  const [editingBatch, setEditingBatch] = useState<MedicationBatch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<{batch: MedicationBatch, medicationId: string} | null>(null);
  const [deletingMedication, setDeletingMedication] = useState<Medication | null>(null);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medications')
        .select(`
          id,
          name,
          combination,
          generic_name,
          manufacturer,
          category,
          total_stock,
          available_stock,
          minimum_stock_level,
          unit
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get batch counts for each medication
      const medicationsWithCounts = await Promise.all(
        (data || []).map(async (med: any) => {
          const { count } = await supabase
            .from('medicine_batches')
            .select('*', { count: 'exact', head: true })
            .or(`medication_id.eq.${med.id},medicine_id.eq.${med.id}`)
            .eq('is_active', true);
          
          return {
            ...med,
            batchCount: count || 0
          };
        })
      );

      setMedications(medicationsWithCounts);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async (medicationId: string) => {
    try {
      setLoadingBatches(medicationId);
      const { data, error } = await supabase
        .from('medicine_batches')
        .select('*')
        .or(`medication_id.eq.${medicationId},medicine_id.eq.${medicationId}`)
        .eq('is_active', true)
        .order('expiry_date');

      if (error) throw error;

      setMedications(prev => prev.map(med => 
        med.id === medicationId 
          ? { ...med, batches: data || [] }
          : med
      ));
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoadingBatches(null);
    }
  };

  const toggleMedicationExpand = async (medicationId: string) => {
    if (expandedMedication === medicationId) {
      setExpandedMedication(null);
    } else {
      setExpandedMedication(medicationId);
      const medication = medications.find(m => m.id === medicationId);
      if (!medication?.batches) {
        await fetchBatches(medicationId);
      }
    }
  };

  const handleAddBatch = (medicationId: string) => {
    setSelectedMedicationId(medicationId);
    setEditingBatch(null);
    setShowAddBatchModal(true);
  };

  const handleEditBatch = (batch: MedicationBatch, medicationId: string) => {
    setSelectedMedicationId(medicationId);
    setEditingBatch(batch);
    setShowAddBatchModal(true);
  };

  const handleDeleteBatch = async (batch: MedicationBatch, medicationId: string) => {
    try {
      const { error } = await supabase
        .from('medicine_batches')
        .update({ is_active: false })
        .eq('id', batch.id);

      if (error) throw error;

      // Seamless update - remove batch from local state
      setMedications(prev => prev.map(med => {
        if (med.id === medicationId) {
          const updatedBatches = med.batches?.filter(b => b.id !== batch.id) || [];
          return {
            ...med,
            batches: updatedBatches,
            batchCount: updatedBatches.length,
            available_stock: med.available_stock - batch.current_quantity,
            total_stock: med.total_stock - batch.current_quantity
          };
        }
        return med;
      }));
      
      setDeletingBatch(null);
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch. Please try again.');
    }
  };

  const handleDeleteMedication = async (medication: Medication) => {
    try {
      // Soft delete medication and all its batches
      const { error: medError } = await supabase
        .from('medications')
        .update({ is_active: false })
        .eq('id', medication.id);

      if (medError) throw medError;

      const { error: batchError } = await supabase
        .from('medicine_batches')
        .update({ is_active: false })
        .or(`medication_id.eq.${medication.id},medicine_id.eq.${medication.id}`);

      if (batchError) throw batchError;

      // Remove from local state
      setMedications(prev => prev.filter(med => med.id !== medication.id));
      setDeletingMedication(null);
    } catch (error) {
      console.error('Error deleting medication:', error);
      alert('Failed to delete medication. Please try again.');
    }
  };

  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
  };

  const handleUpdateMedication = async (updatedMedication: Medication) => {
    try {
      const { error } = await supabase
        .from('medications')
        .update({
          name: updatedMedication.name,
          combination: updatedMedication.combination,
          generic_name: updatedMedication.generic_name,
          manufacturer: updatedMedication.manufacturer,
          category: updatedMedication.category,
          dosage_form: updatedMedication.dosage_form,
          strength: updatedMedication.strength,
          unit: updatedMedication.unit,
          purchase_price: updatedMedication.purchase_price,
          selling_price: updatedMedication.selling_price,
          mrp: updatedMedication.mrp,
          minimum_stock_level: updatedMedication.minimum_stock_level,
          maximum_stock_level: updatedMedication.maximum_stock_level,
          prescription_required: updatedMedication.prescription_required,
          hsn_code: updatedMedication.hsn_code,
          gst_percent: updatedMedication.gst_percent,
          cgst_percent: updatedMedication.cgst_percent,
          sgst_percent: updatedMedication.sgst_percent,
          igst_percent: updatedMedication.igst_percent,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedMedication.id);

      if (error) throw error;

      // Seamless update - update medication in local state
      setMedications(prev => prev.map(med => 
        med.id === updatedMedication.id ? updatedMedication : med
      ));
      
      setEditingMedication(null);
    } catch (error) {
      console.error('Error updating medication:', error);
      alert('Failed to update medication. Please try again.');
    }
  };

  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.combination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.generic_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/settings/pharmacy')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Pharmacy Settings</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Medications</h1>
                <p className="text-gray-600">Manage medications and their batches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search medications by name, combination, or generic name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Medications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMedications.map((medication) => (
              <div
                key={medication.id}
                className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
              >
                {/* Medication Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => toggleMedicationExpand(medication.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedMedication === medication.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{medication.name}</h3>
                          {medication.combination && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              {medication.combination}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {medication.generic_name && (
                            <span>Generic: {medication.generic_name}</span>
                          )}
                          {medication.manufacturer && (
                            <span>• {medication.manufacturer}</span>
                          )}
                          {medication.category && (
                            <span>• {medication.category}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Total Stock</div>
                        <div className={`text-lg font-bold ${
                          medication.available_stock <= (medication.minimum_stock_level || 0)
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {medication.available_stock} {medication.unit || 'units'}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Batches</div>
                        <div className="text-lg font-bold text-purple-600">
                          {medication.batchCount}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddBatch(medication.id)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Batch
                      </button>
                      <button
                        onClick={() => handleEditMedication(medication)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit Medication"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => setDeletingMedication(medication)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete Medication"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Batches Section */}
                {expandedMedication === medication.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    {loadingBatches === medication.id ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                      </div>
                    ) : medication.batches && medication.batches.length > 0 ? (
                      <div className="space-y-2">
                        {medication.batches.map((batch) => (
                          <div
                            key={batch.id}
                            className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="grid grid-cols-6 gap-4 flex-1">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Batch Number</div>
                                  <div className="font-semibold text-gray-900">{batch.batch_number}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Quantity</div>
                                  <div className="font-semibold text-gray-900">
                                    {batch.current_quantity} / {batch.received_quantity}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">MRP</div>
                                  <div className="font-semibold text-gray-900">₹{batch.selling_price}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Cost</div>
                                  <div className="font-semibold text-gray-900">₹{batch.purchase_price}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Expiry Date</div>
                                  <div className={`font-semibold ${
                                    new Date(batch.expiry_date) < new Date()
                                      ? 'text-red-600'
                                      : new Date(batch.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                                      ? 'text-orange-600'
                                      : 'text-gray-900'
                                  }`}>
                                    {new Date(batch.expiry_date).toLocaleDateString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Status</div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    batch.status === 'active' 
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {batch.status}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => handleEditBatch(batch, medication.id)}
                                className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4 text-purple-600" />
                              </button>
                              <button
                                onClick={() => setDeletingBatch({batch, medicationId: medication.id})}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No batches found for this medication</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredMedications.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">No medications found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Batch Modal */}
      {showAddBatchModal && selectedMedicationId && (
        <BatchModal
          medicationId={selectedMedicationId}
          batch={editingBatch}
          onClose={() => {
            setShowAddBatchModal(false);
            setEditingBatch(null);
            setSelectedMedicationId(null);
          }}
          onSuccess={async (newBatch?: MedicationBatch) => {
            // Seamless update - add or update batch in local state
            if (newBatch) {
              setMedications(prev => prev.map(med => {
                if (med.id === selectedMedicationId) {
                  const existingBatches = med.batches || [];
                  const updatedBatches = editingBatch 
                    ? existingBatches.map(b => b.id === newBatch.id ? newBatch : b)
                    : [...existingBatches, newBatch];
                  
                  const totalStock = updatedBatches.reduce((sum, batch) => sum + batch.current_quantity, 0);
                  
                  return {
                    ...med,
                    batches: updatedBatches,
                    batchCount: updatedBatches.length,
                    available_stock: totalStock,
                    total_stock: totalStock
                  };
                }
                return med;
              }));
            }
            
            setShowAddBatchModal(false);
            setEditingBatch(null);
            setSelectedMedicationId(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Batch</h3>
                  <p className="text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete batch <span className="font-semibold">{deletingBatch.batch.batch_number}</span>?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This will mark the batch as inactive and remove it from the active list.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingBatch(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteBatch(deletingBatch.batch, deletingBatch.medicationId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Medication Confirmation Modal */}
      {deletingMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Medication</h3>
                  <p className="text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 font-medium mb-2">
                  ⚠️ Warning: This will delete:
                </p>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Medication: <span className="font-semibold">{deletingMedication.name}</span></li>
                  <li>• All {deletingMedication.batchCount} batches</li>
                  <li>• All related inventory records</li>
                </ul>
                <p className="text-xs text-red-600 mt-2">
                  This is a permanent action and cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingMedication(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMedication(deletingMedication)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Medication
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medication Modal */}
      {editingMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900">Edit Medication</h2>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateMedication(editingMedication);
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name *</label>
                  <input
                    type="text"
                    required
                    value={editingMedication.name}
                    onChange={(e) => setEditingMedication({...editingMedication, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Combination</label>
                  <input
                    type="text"
                    value={editingMedication.combination || ''}
                    onChange={(e) => setEditingMedication({...editingMedication, combination: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={editingMedication.generic_name || ''}
                    onChange={(e) => setEditingMedication({...editingMedication, generic_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={editingMedication.manufacturer || ''}
                    onChange={(e) => setEditingMedication({...editingMedication, manufacturer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editingMedication.category || ''}
                    onChange={(e) => setEditingMedication({...editingMedication, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingMedication.unit || 'units'}
                    onChange={(e) => setEditingMedication({...editingMedication, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    value={editingMedication.minimum_stock_level || 0}
                    onChange={(e) => setEditingMedication({...editingMedication, minimum_stock_level: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    value={editingMedication.maximum_stock_level || 0}
                    onChange={(e) => setEditingMedication({...editingMedication, maximum_stock_level: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingMedication(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200"
                >
                  Update Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Batch Modal Component
interface BatchModalProps {
  medicationId: string;
  batch: MedicationBatch | null;
  onClose: () => void;
  onSuccess: (newBatch?: MedicationBatch) => void;
}

const BatchModal: React.FC<BatchModalProps> = ({ medicationId, batch, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    batch_number: batch?.batch_number || '',
    expiry_date: batch?.expiry_date || '',
    current_quantity: batch?.current_quantity || 0,
    purchase_price: batch?.purchase_price || 0,
    selling_price: batch?.selling_price || 0
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (batch) {
        // Update existing batch - only update the fields we have in the form
        const { error } = await supabase
          .from('medicine_batches')
          .update({
            batch_number: formData.batch_number,
            expiry_date: formData.expiry_date,
            current_quantity: formData.current_quantity,
            purchase_price: formData.purchase_price,
            selling_price: formData.selling_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', batch.id);

        if (error) throw error;
      } else {
        // Create new batch
        const { error } = await supabase
          .from('medicine_batches')
          .insert({
            medication_id: medicationId,
            medicine_id: medicationId,
            ...formData,
            received_quantity: formData.current_quantity, // Set received_quantity to current_quantity
            received_date: new Date().toISOString().split('T')[0], // Set current date
            status: 'active', // Set default status
            is_active: true
          });

        if (error) throw error;
      }

      // Return the new/updated batch for seamless UI update
      const returnBatch = batch 
        ? { ...batch, ...formData, updated_at: new Date().toISOString() }
        : { 
            id: 'temp-' + Date.now(), // Temporary ID, will be replaced by real one
            ...formData,
            medication_id: medicationId,
            medicine_id: medicationId,
            received_quantity: formData.current_quantity,
            received_date: new Date().toISOString().split('T')[0],
            status: 'active',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

      onSuccess(returnBatch);
    } catch (error) {
      console.error('Error saving batch:', error);
      alert('Failed to save batch. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">
            {batch ? 'Edit Batch' : 'Add New Batch'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                required
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Quantity *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.current_quantity}
                onChange={(e) => setFormData({ ...formData, current_quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Price (Cost)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selling Price (MRP)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                batch ? 'Update Batch' : 'Add Batch'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMedicationPage;
