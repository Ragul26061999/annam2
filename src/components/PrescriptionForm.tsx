'use client';
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Search, 
  Pill, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Stethoscope
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Medication {
  id: string;
  medication_code: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  dosage_form: string;
  strength: string;
  unit_price: number;
  stock_quantity: number;
}

interface PrescriptionItem {
  medication_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  frequency_times: string[]; // Morning, Afternoon, Evening, Night
  meal_timing: string; // before_meal, after_meal, with_meal, empty_stomach
  duration: string;
  duration_days: number;
  instructions: string;
  quantity: number;
  auto_calculate_quantity: boolean;
  unit_price: number;
  total_price: number;
  stock_quantity: number;
}

interface PrescriptionFormProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onPrescriptionCreated: () => void;
  currentUser: any;
}

export default function PrescriptionForm({ 
  patientId, 
  patientName, 
  onClose, 
  onPrescriptionCreated, 
  currentUser 
}: PrescriptionFormProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Medication[]>([]);
  const [showMedicationSearch, setShowMedicationSearch] = useState(false);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('id, medication_code, name, generic_name, manufacturer, category, dosage_form, strength, unit_price, stock_quantity')
        .gt('stock_quantity', 0)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  const searchMedications = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    const filtered = medications.filter(med => 
      med.name.toLowerCase().includes(term.toLowerCase()) ||
      med.generic_name.toLowerCase().includes(term.toLowerCase()) ||
      med.category.toLowerCase().includes(term.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const addMedicationToPrescription = (medication: Medication) => {
    const newItem: PrescriptionItem = {
      medication_id: medication.id,
      medication_name: medication.name,
      dosage: '',
      frequency: '',
      frequency_times: [],
      meal_timing: '',
      duration: '',
      duration_days: 1,
      instructions: '',
      quantity: 1,
      auto_calculate_quantity: true,
      unit_price: medication.unit_price,
      total_price: medication.unit_price,
      stock_quantity: medication.stock_quantity
    };
    
    setPrescriptionItems([...prescriptionItems, newItem]);
    setSearchTerm('');
    setSearchResults([]);
    setShowMedicationSearch(false);
  };

  const calculateAutoQuantity = (frequencyTimes: string[], durationDays: number) => {
    const timesPerDay = frequencyTimes.length;
    return timesPerDay * durationDays;
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: string | number | string[] | boolean) => {
    const updatedItems = [...prescriptionItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate quantity if enabled
    if (updatedItems[index].auto_calculate_quantity && 
        (field === 'frequency_times' || field === 'duration_days')) {
      const autoQuantity = calculateAutoQuantity(
        updatedItems[index].frequency_times, 
        updatedItems[index].duration_days
      );
      updatedItems[index].quantity = autoQuantity;
      updatedItems[index].total_price = updatedItems[index].unit_price * autoQuantity;
    } else if (field === 'quantity') {
      updatedItems[index].total_price = updatedItems[index].unit_price * (value as number);
    }
    
    setPrescriptionItems(updatedItems);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const calculateTotalAmount = () => {
    return prescriptionItems.reduce((total, item) => total + item.total_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prescriptionItems.length === 0) {
      alert('Please add at least one medication to the prescription.');
      return;
    }

    setLoading(true);
    try {
      // Create prescription record
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: patientId,
          doctor_id: currentUser?.id || 'unknown',
          doctor_name: currentUser?.name || 'Dr. Unknown',
          diagnosis: diagnosis,
          notes: notes,
          follow_up_date: followUpDate || null,
          total_amount: calculateTotalAmount(),
          status: 'active'
        })
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      const prescriptionId = prescriptionData.id;

      // Create prescription items
      for (const item of prescriptionItems) {
        const { error: itemError } = await supabase
          .from('prescription_items')
          .insert({
            prescription_id: prescriptionId,
            medication_id: item.medication_id,
            medication_name: item.medication_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          });

        if (itemError) throw itemError;
      }

      onPrescriptionCreated();
      onClose();
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert('Error creating prescription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Pill className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">New Prescription</h2>
                <p className="text-gray-600 text-sm">
                  Patient: {patientName} • ID: {patientId}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Diagnosis and Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Stethoscope className="h-4 w-4 inline mr-2" />
                  Diagnosis *
                </label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter patient diagnosis..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional instructions or notes..."
                />
              </div>
            </div>

            {/* Follow-up Date */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Medication Search */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Prescribed Medications</h3>
                <button
                  type="button"
                  onClick={() => setShowMedicationSearch(!showMedicationSearch)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Medication
                </button>
              </div>

              {showMedicationSearch && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        searchMedications(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Search medications by name, generic name, or category..."
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                      {searchResults.map((medication) => (
                        <div
                          key={medication.id}
                          onClick={() => addMedicationToPrescription(medication)}
                          className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{medication.name}</p>
                              <p className="text-sm text-gray-600">{medication.generic_name}</p>
                              <p className="text-xs text-gray-500">
                                {medication.strength} • {medication.dosage_form} • {medication.manufacturer}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-600">₹{medication.unit_price}</p>
                              <p className="text-xs text-gray-500">Stock: {medication.stock_quantity}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prescription Items */}
            {prescriptionItems.length > 0 && (
              <div className="space-y-4">
                {prescriptionItems.map((item, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.medication_name}</h4>
                        <p className="text-sm text-gray-600">₹{item.unit_price} per unit</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePrescriptionItem(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Stock Information */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">Current Stock:</span>
                        <span className={`text-sm font-bold ${item.stock_quantity > 10 ? 'text-green-600' : item.stock_quantity > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {item.stock_quantity} units available
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Dosage from Inventory *</label>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => updatePrescriptionItem(index, 'dosage', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="e.g., 500mg, 1 tablet"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Duration (Days) *</label>
                        <input
                          type="number"
                          min="1"
                          value={item.duration_days}
                          onChange={(e) => updatePrescriptionItem(index, 'duration_days', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    {/* Frequency Times */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 mb-2">Frequency Times *</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
                          <label key={time} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={item.frequency_times.includes(time)}
                              onChange={(e) => {
                                const newTimes = e.target.checked
                                  ? [...item.frequency_times, time]
                                  : item.frequency_times.filter(t => t !== time);
                                updatePrescriptionItem(index, 'frequency_times', newTimes);
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">{time}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Meal Timing */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 mb-2">Meal Timing</label>
                      <select
                        value={item.meal_timing}
                        onChange={(e) => updatePrescriptionItem(index, 'meal_timing', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Select meal timing</option>
                        <option value="before_meal">Before Meal</option>
                        <option value="after_meal">After Meal</option>
                        <option value="with_meal">With Meal</option>
                        <option value="empty_stomach">Empty Stomach</option>
                      </select>
                    </div>

                    {/* Quantity Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="flex items-center space-x-2 mb-2">
                          <input
                            type="checkbox"
                            checked={item.auto_calculate_quantity}
                            onChange={(e) => updatePrescriptionItem(index, 'auto_calculate_quantity', e.target.checked)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-xs font-medium text-gray-700">Auto Calculate Quantity</span>
                        </label>
                        {item.auto_calculate_quantity ? (
                          <div className="px-3 py-2 text-sm bg-green-50 border border-green-300 rounded font-medium text-green-600">
                            Auto: {calculateAutoQuantity(item.frequency_times, item.duration_days)} units
                          </div>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            max={item.stock_quantity}
                            value={item.quantity}
                            onChange={(e) => updatePrescriptionItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Custom quantity"
                          />
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Random Quantity</label>
                        <button
                          type="button"
                          onClick={() => {
                            const randomQty = Math.floor(Math.random() * Math.min(item.stock_quantity, 30)) + 1;
                            updatePrescriptionItem(index, 'quantity', randomQty);
                            updatePrescriptionItem(index, 'auto_calculate_quantity', false);
                          }}
                          className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-700 border border-purple-300 rounded hover:bg-purple-200 transition-colors"
                        >
                          Generate Random
                        </button>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                        <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded font-medium text-green-600">
                          ₹{item.total_price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                      <textarea
                        value={item.instructions}
                        onChange={(e) => updatePrescriptionItem(index, 'instructions', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., Take after meals, Avoid alcohol, Complete the full course"
                        rows={2}
                      />
                      {item.meal_timing && (
                        <p className="mt-1 text-xs text-blue-600">
                          Meal timing: {item.meal_timing.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      )}
                      {item.frequency_times.length > 0 && (
                        <p className="mt-1 text-xs text-green-600">
                          Times: {item.frequency_times.join(', ')} ({item.frequency_times.length} times daily)
                        </p>
                      )}
                    </div>
                    </div>
                  </div>
                ))}
                
                {/* Total Amount */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Prescription Amount:</span>
                    <span className="text-2xl font-bold text-green-600">₹{calculateTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {prescriptionItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No medications added yet. Click "Add Medication" to start prescribing.</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || prescriptionItems.length === 0}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Create Prescription
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}