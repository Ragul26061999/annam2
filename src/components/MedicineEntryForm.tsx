'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Package,
  Barcode,
  AlertCircle,
  CheckCircle,
  Loader,
  X,
  DollarSign,
  FileText,
  Truck,
  Calendar,
} from 'lucide-react';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
  FormSection,
  BarcodeDisplay,
} from './ui/FormComponents';

interface MedicineFormData {
  medication_code: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  dosage_form: string;
  strength: string;
  unit_price: number;
  minimum_stock_level: number;
  maximum_stock_level: number;
  reorder_level: number;
  storage_conditions: string;
  prescription_required: boolean;
  location: string;
  side_effects: string;
  contraindications: string;
  drug_interactions: string;
  supplier_id: string;
}

interface BatchFormData {
  medicine_id: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  received_date: string;
  received_quantity: number;
  purchase_price: number;
  selling_price: number;
  supplier_id: string;
  supplier_batch_id: string;
  notes: string;
}

interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string;
  phone: string;
}

const MedicineEntryForm: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'medicine' | 'batch' | 'supplier'>('medicine');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [generatedBatchBarcode, setGeneratedBatchBarcode] = useState('');
  const [suggestedBatchNumber, setSuggestedBatchNumber] = useState('');
  const [generatedBarcode, setGeneratedBarcode] = useState('');

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  // Medicine search (for New Batch tab)
  const [medicineSearch, setMedicineSearch] = useState('');
  const [medicineResults, setMedicineResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [medicineForm, setMedicineForm] = useState<MedicineFormData>({
    medication_code: '',
    name: '',
    generic_name: '',
    manufacturer: '',
    category: 'Antibiotic',
    dosage_form: 'Tablet',
    strength: '',
    unit_price: 0,
    minimum_stock_level: 10,
    maximum_stock_level: 1000,
    reorder_level: 20,
    storage_conditions: 'Room Temperature',
    prescription_required: true,
    location: '',
    side_effects: '',
    contraindications: '',
    drug_interactions: '',
    supplier_id: '',
  });

  const [batchForm, setBatchForm] = useState<BatchFormData>({
    medicine_id: '',
    batch_number: '',
    manufacturing_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    received_date: new Date().toISOString().split('T')[0],
    received_quantity: 0,
    purchase_price: 0,
    selling_price: 0,
    supplier_id: '',
    supplier_batch_id: '',
    notes: '',
  });

  useEffect(() => {
    loadSuppliers();
    if (activeTab === 'batch') {
      loadMedicines();
    }
  }, [activeTab]);

  // Removed medicine barcode generation preview (batch barcode only)

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, supplier_code, name, contact_person, phone')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const searchMedicines = async (q: string) => {
    try {
      if (!q || q.trim().length < 2) {
        setMedicineResults([]);
        return;
      }
      const term = `%${q.trim()}%`;
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, medication_code')
        .or(`name.ilike.${term},medication_code.ilike.${term},generic_name.ilike.${term}`)
        .limit(10);
      if (error) throw error;
      setMedicineResults(data || []);
    } catch (e) {
      console.error('searchMedicines failed', e);
      setMedicineResults([]);
    }
  };

  // Suggest next batch number when medicine changes, and recompute batch barcode on changes
  useEffect(() => {
    const updateSuggestions = async () => {
      try {
        setGeneratedBatchBarcode('');
        const med = medicines.find(m => m.id === batchForm.medicine_id);
        if (!med) return;
        // Suggest next batch number if empty
        if (!batchForm.batch_number) {
          const { data: nextBatch, error: nextErr } = await supabase.rpc('generate_next_batch_number', {
            p_medicine_id: batchForm.medicine_id,
          });
          if (!nextErr && nextBatch) {
            setSuggestedBatchNumber(nextBatch);
            setBatchForm(prev => ({ ...prev, batch_number: nextBatch }));
          }
        }
        const batchNum = batchForm.batch_number || suggestedBatchNumber;
        if (batchNum) {
          const { data: bb, error: bbErr } = await supabase.rpc('generate_batch_barcode', {
            med_code: med.medication_code,
            batch_num: batchNum,
          });
          if (!bbErr && bb) setGeneratedBatchBarcode(bb);
        }
      } catch (e) {
        console.error('Failed to suggest batch/compute barcode', e);
      }
    };
    if (batchForm.medicine_id) {
      updateSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchForm.medicine_id, batchForm.batch_number]);

  const loadMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, medication_code, barcode')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setMedicines(data || []);
    } catch (error) {
      console.error('Error loading medicines:', error);
    }
  };

  const generateBarcodePreview = async (medCode: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_medicine_barcode', {
        med_code: medCode,
      });

      if (error) throw error;
      setGeneratedBarcode(data || '');
    } catch (error) {
      console.error('Error generating barcode:', error);
      setGeneratedBarcode('');
    }
  };

  const validateMedicineForm = (): boolean => {
    const newErrors: { field: string; message: string }[] = [];

    // medication_code is optional (auto-generated server-side)
    if (!medicineForm.name.trim()) {
      newErrors.push({ field: 'name', message: 'Medicine name is required' });
    }
    if (!medicineForm.manufacturer.trim()) {
      newErrors.push({ field: 'manufacturer', message: 'Manufacturer is required' });
    }
    if (medicineForm.unit_price <= 0) {
      newErrors.push({ field: 'unit_price', message: 'Unit price must be greater than 0' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const validateBatchForm = (): boolean => {
    const newErrors: { field: string; message: string }[] = [];

    if (!batchForm.medicine_id) {
      newErrors.push({ field: 'medicine_id', message: 'Please select a medicine' });
    }
    // batch_number is optional (auto-generated server-side)
    if (!batchForm.expiry_date) {
      newErrors.push({ field: 'expiry_date', message: 'Expiry date is required' });
    }
    if (batchForm.received_quantity <= 0) {
      newErrors.push({ field: 'received_quantity', message: 'Quantity must be greater than 0' });
    }
    if (!batchForm.supplier_id) {
      newErrors.push({ field: 'supplier_id', message: 'Please select a supplier' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMedicineForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('medications').insert([
        {
          ...medicineForm,
          status: 'active',
          is_active: true,
        },
      ]);

      if (error) throw error;

      setSuccessMessage('✓ Medicine added successfully with barcode!');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error: any) {
      setErrors([{ field: 'submit', message: error.message || 'Failed to add medicine' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBatchForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.from('medicine_batches').insert([
        {
          ...batchForm,
          current_quantity: batchForm.received_quantity,
          status: 'active',
          is_active: true,
        },
      ]).select('*').single();

      if (error) throw error;

      const assigned = data as any;
      setSuccessMessage(`✓ Batch added successfully! Batch: ${assigned?.batch_number || batchForm.batch_number}  | Barcode: ${assigned?.batch_barcode || ''}`);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error: any) {
      setErrors([{ field: 'submit', message: error.message || 'Failed to add batch' }]);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (field: string) => errors.find((e) => e.field === field)?.message;
  const hasError = (field: string) => !!getErrorMessage(field);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Medicine & Batch Entry</h2>
              <p className="text-blue-100 text-sm">Add medicines with automatic barcode generation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('medicine')}
            className={`flex-1 py-4 px-6 font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'medicine'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Plus className="w-5 h-5" />
            New Medicine
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex-1 py-4 px-6 font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'batch'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Barcode className="w-5 h-5" />
            New Batch
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`flex-1 py-4 px-6 font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'supplier'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Truck className="w-5 h-5" />
            Supplier
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="m-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">{successMessage}</span>
          </div>
        )}

        {errors.length > 0 && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            {errors.map((error, idx) => (
              <div key={idx} className="flex items-start gap-3 mb-2 last:mb-0">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 font-medium capitalize">{error.field}</p>
                  <p className="text-red-600 text-sm">{error.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Content */}
        <div className="p-6">
          {activeTab === 'medicine' ? (
            <form onSubmit={handleAddMedicine} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Information */}
                  <FormSection title="Basic Information" icon={<Package className="w-5 h-5 text-blue-600" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Medicine Code (auto if blank)"
                        value={medicineForm.medication_code}
                        onChange={(e) => setMedicineForm({ ...medicineForm, medication_code: e.target.value })}
                        placeholder="e.g., MED001"
                        error={hasError('medication_code')}
                        errorMessage={getErrorMessage('medication_code')}
                      />
                      <FormInput
                        label="Medicine Name"
                        value={medicineForm.name}
                        onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                        placeholder="e.g., Paracetamol"
                        required
                        error={hasError('name')}
                        errorMessage={getErrorMessage('name')}
                      />
                      <FormInput
                        label="Generic Name"
                        value={medicineForm.generic_name}
                        onChange={(e) => setMedicineForm({ ...medicineForm, generic_name: e.target.value })}
                        placeholder="e.g., Acetaminophen"
                      />
                      <FormInput
                        label="Manufacturer"
                        value={medicineForm.manufacturer}
                        onChange={(e) => setMedicineForm({ ...medicineForm, manufacturer: e.target.value })}
                        placeholder="e.g., Pharma Ltd"
                        required
                        error={hasError('manufacturer')}
                        errorMessage={getErrorMessage('manufacturer')}
                      />
                      <FormSelect
                        label="Category"
                        value={medicineForm.category}
                        onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })}
                        options={['Antibiotic', 'Analgesic', 'Antipyretic', 'Antihistamine', 'Antacid', 'Vitamin', 'Supplement', 'Other']}
                      />
                      <FormSelect
                        label="Dosage Form"
                        value={medicineForm.dosage_form}
                        onChange={(e) => setMedicineForm({ ...medicineForm, dosage_form: e.target.value })}
                        options={['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Powder', 'Drops']}
                      />
                      <FormInput
                        label="Strength"
                        value={medicineForm.strength}
                        onChange={(e) => setMedicineForm({ ...medicineForm, strength: e.target.value })}
                        placeholder="e.g., 500mg"
                      />
                    </div>
                  </FormSection>

                  {/* Pricing & Stock */}
                  <FormSection title="Pricing & Stock" icon={<DollarSign className="w-5 h-5 text-blue-600" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Unit Price (₹)"
                        type="number"
                        step="0.01"
                        value={medicineForm.unit_price}
                        onChange={(e) => setMedicineForm({ ...medicineForm, unit_price: parseFloat(e.target.value) || 0 })}
                        required
                        error={hasError('unit_price')}
                        errorMessage={getErrorMessage('unit_price')}
                      />
                      <FormInput
                        label="Location"
                        value={medicineForm.location}
                        onChange={(e) => setMedicineForm({ ...medicineForm, location: e.target.value })}
                        placeholder="e.g., Shelf A1"
                      />
                      <FormInput
                        label="Min Stock Level"
                        type="number"
                        value={medicineForm.minimum_stock_level}
                        onChange={(e) => setMedicineForm({ ...medicineForm, minimum_stock_level: parseInt(e.target.value) || 0 })}
                      />
                      <FormInput
                        label="Max Stock Level"
                        type="number"
                        value={medicineForm.maximum_stock_level}
                        onChange={(e) => setMedicineForm({ ...medicineForm, maximum_stock_level: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </FormSection>
                </div>

                {/* Prescription Required */}
                <div className="lg:col-span-1">
                  <FormSection title="Settings" icon={<FileText className="w-5 h-5 text-blue-600" />}>
                    <FormCheckbox
                      label="Prescription Required"
                      checked={medicineForm.prescription_required}
                      onChange={(e) => setMedicineForm({ ...medicineForm, prescription_required: e.target.checked })}
                      description="Check if this medicine requires a prescription"
                    />
                  </FormSection>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Adding Medicine...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Medicine with Barcode
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddBatch} className="space-y-6">
              {/* Batch Form Content */}
              <FormSection title="Select Medicine" icon={<Package className="w-5 h-5 text-blue-600" />}>
                <div className="space-y-2">
                  <FormInput
                    label="Search Medicine"
                    value={medicineSearch}
                    onChange={async (e) => {
                      const q = e.target.value;
                      setMedicineSearch(q);
                      setShowResults(true);
                      await searchMedicines(q);
                    }}
                    placeholder="Type 2+ letters of name or code"
                  />
                  {showResults && medicineResults.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-auto bg-white shadow-sm">
                      {medicineResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setBatchForm({ ...batchForm, medicine_id: m.id });
                            setMedicineSearch(`${m.name} (${m.medication_code})`);
                            setMedicineResults([]);
                            setShowResults(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        >
                          {m.name} <span className="text-gray-500">({m.medication_code})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {hasError('medicine_id') && (
                    <p className="text-sm text-red-600">{getErrorMessage('medicine_id')}</p>
                  )}
                </div>
              </FormSection>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormSection title="Batch Information" icon={<Barcode className="w-5 h-5 text-blue-600" />}>
                  <div className="space-y-4">
                    <FormInput
                      label="Batch Number (auto if blank)"
                      value={batchForm.batch_number}
                      onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                      placeholder="e.g., BATCH001"
                      error={hasError('batch_number')}
                      errorMessage={getErrorMessage('batch_number')}
                    />
                    <FormInput
                      label="Manufacturing Date"
                      type="date"
                      value={batchForm.manufacturing_date}
                      onChange={(e) => setBatchForm({ ...batchForm, manufacturing_date: e.target.value })}
                    />
                    <FormInput
                      label="Expiry Date"
                      type="date"
                      value={batchForm.expiry_date}
                      onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                      required
                      error={hasError('expiry_date')}
                      errorMessage={getErrorMessage('expiry_date')}
                    />
                  </div>
                </FormSection>

                <FormSection title="Supplier & Quantity" icon={<Truck className="w-5 h-5 text-blue-600" />}>
                  <div className="space-y-4">
                    <FormSelect
                      label="Supplier"
                      value={batchForm.supplier_id}
                      onChange={(e) => setBatchForm({ ...batchForm, supplier_id: e.target.value })}
                      options={suppliers.map(s => ({ value: s.id, label: `${s.name} (${s.supplier_code})` }))}
                      placeholder="-- Select Supplier --"
                      required
                      error={hasError('supplier_id')}
                      errorMessage={getErrorMessage('supplier_id')}
                    />
                    <FormInput
                      label="Received Quantity"
                      type="number"
                      value={batchForm.received_quantity}
                      onChange={(e) => setBatchForm({ ...batchForm, received_quantity: parseInt(e.target.value) || 0 })}
                      required
                      error={hasError('received_quantity')}
                      errorMessage={getErrorMessage('received_quantity')}
                    />
                    <FormInput
                      label="Purchase Price (₹)"
                      type="number"
                      step="0.01"
                      value={batchForm.purchase_price}
                      onChange={(e) => setBatchForm({ ...batchForm, purchase_price: parseFloat(e.target.value) || 0 })}
                    />
                    <FormInput
                      label="Selling Price (₹)"
                      type="number"
                      step="0.01"
                      value={batchForm.selling_price}
                      onChange={(e) => setBatchForm({ ...batchForm, selling_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </FormSection>
              </div>

              {/* Batch Barcode Preview */}
              <FormSection title="Batch Barcode Preview" icon={<Barcode className="w-5 h-5 text-blue-600" />}>
                {generatedBatchBarcode ? (
                  <BarcodeDisplay barcode={generatedBatchBarcode} label="Batch Barcode" size="lg" />
                ) : (
                  <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                    Select a medicine and (optionally) batch number to preview barcode
                  </div>
                )}
              </FormSection>

              <FormTextarea
                label="Notes"
                value={batchForm.notes}
                onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                placeholder="Any additional notes about this batch..."
              />

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Adding Batch...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Batch with Barcode
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
          {activeTab === 'supplier' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setErrors([]);
                try {
                  const { error } = await supabase.from('suppliers').insert([
                    {
                      name: supplierForm.name,
                      contact_person: supplierForm.contact_person,
                      phone: supplierForm.phone,
                      email: supplierForm.email,
                      address: supplierForm.address,
                      status: 'active',
                      is_active: true,
                    },
                  ]);
                  if (error) throw error;
                  await loadSuppliers();
                  setSuccessMessage('✓ Supplier added successfully!');
                  setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
                } catch (err: any) {
                  setErrors([{ field: 'submit', message: err.message || 'Failed to add supplier' }]);
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-6"
            >
              <FormSection title="Supplier Registration" icon={<Truck className="w-5 h-5 text-blue-600" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Supplier Name"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="e.g., Global Medicines Inc"
                  />
                  <FormInput
                    label="Contact Person"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    placeholder="e.g., John Doe"
                  />
                  <FormInput
                    label="Phone"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="e.g., +91-9876543210"
                  />
                  <FormInput
                    label="Email"
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="e.g., contact@supplier.com"
                  />
                </div>
                <FormTextarea
                  label="Address"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="Street, City, State, Country"
                />
              </FormSection>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('medicine')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicineEntryForm;
