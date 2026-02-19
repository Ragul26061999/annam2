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
  nickname: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  dosage_form: string;
  strength: string;
  combination: string;
  minimum_stock_level: number;
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

interface MedicineEntryFormProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedMedicine?: { id: string; name: string; medication_code?: string };
  initialTab?: 'medicine' | 'batch' | 'supplier';
}

const MedicineEntryForm: React.FC<MedicineEntryFormProps> = ({
  onClose,
  onSuccess,
  preselectedMedicine,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'medicine' | 'batch' | 'supplier'>(initialTab || 'medicine');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [generatedBatchBarcode, setGeneratedBatchBarcode] = useState('');
  const [suggestedBatchNumber, setSuggestedBatchNumber] = useState('');
  const [generatedBarcode, setGeneratedBarcode] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

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
    nickname: '',
    generic_name: '',
    manufacturer: '',
    category: 'Antibiotic',
    dosage_form: 'Tablet',
    strength: '',
    combination: '',
    minimum_stock_level: 10,
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
    manufacturing_date: '',
    expiry_date: '',
    received_date: '',
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

  // If a medicine is preselected (from medicine modal), lock selection and switch to Batch tab
  useEffect(() => {
    if (preselectedMedicine) {
      setActiveTab('batch');
      setBatchForm((prev) => ({ ...prev, medicine_id: preselectedMedicine.id }));
      const label = preselectedMedicine.medication_code
        ? `${preselectedMedicine.name} (${preselectedMedicine.medication_code})`
        : preselectedMedicine.name;
      setMedicineSearch(label);
      setShowResults(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedMedicine?.id]);

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

  // Utilities: date formatting and default expiry (12 months ahead)
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const defaultExpiryDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 12);
    return formatDate(d);
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
        .select('id, name, medication_code, nickname')
        .or(`name.ilike.${term},medication_code.ilike.${term},generic_name.ilike.${term},nickname.ilike.${term}`)
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
          if (!nextErr && nextBatch && typeof nextBatch === 'string') {
            const cleaned = nextBatch.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
            if (cleaned.length === 6) {
              setSuggestedBatchNumber(cleaned);
              setBatchForm(prev => ({ ...prev, batch_number: cleaned }));
            } else {
              const local = generateShortBatch();
              setSuggestedBatchNumber(local);
              setBatchForm(prev => ({ ...prev, batch_number: local }));
            }
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

  useEffect(() => {
    const checkAndLoadBatch = async () => {
      try {
        const bn = (batchForm.batch_number || '')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .trim();
        if (bn && bn.length === 6) {
          const { data, error } = await supabase
            .from('medicine_batches')
            .select('id, medication_id, batch_number, manufacturing_date, expiry_date, received_date, purchase_price, selling_price, supplier_id, supplier_batch_id, notes, current_quantity')
            .eq('batch_number', bn)
            .single();
          if (!error && data) {
            setEditMode(true);
            setEditingBatchId(data.id);
            setBatchForm(prev => ({
              ...prev,
              medicine_id: data.medication_id || prev.medicine_id,
              batch_number: data.batch_number || bn,
              manufacturing_date: data.manufacturing_date || '',
              expiry_date: data.expiry_date || '',
              received_date: data.received_date || '',
              received_quantity: typeof data.current_quantity === 'number' ? data.current_quantity : prev.received_quantity,
              purchase_price: typeof data.purchase_price === 'number' ? data.purchase_price : prev.purchase_price,
              selling_price: typeof data.selling_price === 'number' ? data.selling_price : prev.selling_price,
              supplier_id: data.supplier_id || '',
              supplier_batch_id: data.supplier_batch_id || '',
              notes: data.notes || '',
            }));
            return;
          }
        }
      } catch {}
      setEditMode(false);
      setEditingBatchId(null);
    };
    checkAndLoadBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchForm.batch_number]);

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
    // All fields optional per request. Keep only basic client-side sanity, no hard requirements.
    setErrors([]);
    return true;
  };

  const validateBatchForm = (): boolean => {
    // All fields optional per request. Keep only basic client-side sanity, no hard requirements.
    setErrors([]);
    return true;
  };

  // Generate a short simple batch number (fallback) 6-char base36 (fits 5–7 requirement)
  const generateShortBatch = () => {
    const base = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Ensure at least 6 characters; slice will cap length
    const six = (base + base).slice(0, 6);
    return six;
  };

  // Ensure unique batch number: try RPC first, then fallback to short generator with uniqueness check
  const ensureUniqueBatchNumber = async (medicineId?: string): Promise<string> => {
    // 1) Try server RPC suggestion if available
    try {
      if (medicineId) {
        const { data: nextBatch, error: nextErr } = await supabase.rpc('generate_next_batch_number', {
          p_medicine_id: medicineId,
        });
        if (!nextErr && nextBatch && typeof nextBatch === 'string') {
          const cleaned = nextBatch.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
          if (cleaned.length === 6) {
            return cleaned;
          }
        }
      }
    } catch {}
    // 2) Fallback to short generator with simple uniqueness check
    for (let i = 0; i < 5; i++) {
      const candidate = generateShortBatch();
      try {
        const { data, error } = await supabase
          .from('medicine_batches')
          .select('id', { count: 'exact', head: true })
          .eq('batch_number', candidate);
        if (!error && (data === null || (Array.isArray(data) && data.length === 0))) {
          return candidate;
        }
      } catch {}
    }
    // 3) Last resort
    return generateShortBatch();
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMedicineForm()) return;

    setLoading(true);
    try {
      // Insert and return id + medication_code
      const { data: inserted, error } = await supabase
        .from('medications')
        .insert([
          {
            ...medicineForm,
            // Handle empty string for supplier_id - convert to null
            supplier_id: medicineForm.supplier_id?.trim() || null,
            // Allow DB defaults/triggers to populate missing values
            status: 'active',
            is_active: true,
          },
        ])
        .select('id, medication_code, barcode')
        .single();

      if (error) throw error;

      // Auto-generate barcode if missing and medication_code is available
      if (inserted && !inserted.barcode && inserted.medication_code) {
        try {
          const { data: medBarcode, error: genErr } = await supabase.rpc('generate_medicine_barcode', {
            med_code: inserted.medication_code,
          });
          if (!genErr && medBarcode) {
            await supabase
              .from('medications')
              .update({ barcode: medBarcode })
              .eq('id', inserted.id);
          }
        } catch {}
      }

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
      // Ensure short, simple, unique batch number (exactly 6 chars)
      let finalBatchNumber = batchForm.batch_number
        ?.toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();
      if (!finalBatchNumber || finalBatchNumber.length !== 6) {
        finalBatchNumber = await ensureUniqueBatchNumber(batchForm.medicine_id || undefined);
      }

      // Sanitize date fields: convert empty strings to null to avoid Postgres date parse errors
      const sanitizeDate = (val?: string) => (val && val.trim() ? val : null);

      const insertPayload: any = {
        ...batchForm,
        batch_number: finalBatchNumber,
        manufacturing_date: sanitizeDate(batchForm.manufacturing_date),
        // If expiry_date is missing, default to 12 months from today to satisfy NOT NULL
        expiry_date: sanitizeDate(batchForm.expiry_date) ?? defaultExpiryDate(),
        received_date: sanitizeDate(batchForm.received_date),
        // Let DB defaults handle quantities if empty/zero is allowed, else null
        current_quantity: Number.isFinite(batchForm.received_quantity) ? batchForm.received_quantity : null,
        supplier_id: batchForm.supplier_id?.trim() ? batchForm.supplier_id : null,
        supplier_batch_id: batchForm.supplier_batch_id?.trim() ? batchForm.supplier_batch_id : null,
        notes: batchForm.notes?.trim() ? batchForm.notes : null,
        status: 'active',
        is_active: true,
      };

      let assigned: any = null;
      if (editMode && editingBatchId) {
        const { data, error } = await supabase
          .from('medicine_batches')
          .update(insertPayload)
          .eq('id', editingBatchId)
          .select('id, batch_number, batch_barcode, medication_id')
          .single();
        if (error) throw error;
        assigned = data;
      } else {
        const { data, error } = await supabase
          .from('medicine_batches')
          .insert([insertPayload])
          .select('id, batch_number, batch_barcode, medication_id')
          .single();
        if (error) throw error;
        assigned = data;
      }

      // Auto-generate batch barcode if missing and medication_code available
      if (assigned && !assigned.batch_barcode) {
        try {
          // fetch med_code for the medication
          let medCode: string | undefined;
          if (assigned.medication_id) {
            const { data: med, error: medErr } = await supabase
              .from('medications')
              .select('medication_code')
              .eq('id', assigned.medication_id)
              .single();
            if (!medErr) medCode = med?.medication_code;
          }
          if (medCode) {
            const { data: bb, error: bbErr } = await supabase.rpc('generate_batch_barcode', {
              med_code: medCode,
              batch_num: assigned.batch_number,
            });
            if (!bbErr && bb) {
              await supabase
                .from('medicine_batches')
                .update({ batch_barcode: bb })
                .eq('id', assigned.id);
              setGeneratedBatchBarcode(bb);
            }
          }
        } catch {}
      }

      setSuccessMessage(`${editMode ? '✓ Batch updated' : '✓ Batch added'} successfully! Batch: ${assigned?.batch_number || finalBatchNumber}  | Barcode: ${assigned?.batch_barcode || generatedBatchBarcode}`);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white px-8 py-6 flex justify-between items-center shadow-lg z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Medicine & Batch Entry</h2>
              <p className="text-blue-100 text-sm mt-0.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                Smart barcode generation • Auto-validation
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:rotate-90 group"
            aria-label="Close"
          >
            <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white px-2 pt-2">
          <button
            onClick={() => setActiveTab('medicine')}
            className={`relative flex-1 py-3.5 px-6 font-semibold flex items-center justify-center gap-2.5 transition-all duration-300 rounded-t-xl ${
              activeTab === 'medicine'
                ? 'bg-white text-blue-600 shadow-sm -mb-px'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <Plus className={`w-5 h-5 transition-transform ${activeTab === 'medicine' ? 'scale-110' : ''}`} />
            <span>New Medicine</span>
            {activeTab === 'medicine' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`relative flex-1 py-3.5 px-6 font-semibold flex items-center justify-center gap-2.5 transition-all duration-300 rounded-t-xl ${
              activeTab === 'batch'
                ? 'bg-white text-blue-600 shadow-sm -mb-px'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <Barcode className={`w-5 h-5 transition-transform ${activeTab === 'batch' ? 'scale-110' : ''}`} />
            <span>New Batch</span>
            {activeTab === 'batch' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`relative flex-1 py-3.5 px-6 font-semibold flex items-center justify-center gap-2.5 transition-all duration-300 rounded-t-xl ${
              activeTab === 'supplier'
                ? 'bg-white text-blue-600 shadow-sm -mb-px'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <Truck className={`w-5 h-5 transition-transform ${activeTab === 'supplier' ? 'scale-110' : ''}`} />
            <span>Supplier</span>
            {activeTab === 'supplier' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            )}
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mx-6 mt-6 mb-2 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-green-800 font-medium flex-1">{successMessage}</span>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mx-6 mt-6 mb-2 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-300 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-300">
            {errors.map((error, idx) => (
              <div key={idx} className="flex items-start gap-3 mb-3 last:mb-0">
                <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-red-800 font-semibold capitalize text-sm">{error.field}</p>
                  <p className="text-red-700 text-sm mt-0.5">{error.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-gradient-to-b from-white to-gray-50">
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
                        label="Nickname / Short Name"
                        value={medicineForm.nickname}
                        onChange={(e) => setMedicineForm({ ...medicineForm, nickname: e.target.value })}
                        placeholder="e.g., PCM, Para"
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
                      <FormInput
                        label="Combination"
                        value={medicineForm.combination}
                        onChange={(e) => setMedicineForm({ ...medicineForm, combination: e.target.value })}
                        placeholder="e.g., Paracetamol + Ibuprofen"
                      />
                    </div>
                  </FormSection>

                  {/* Pricing & Stock */}
                  <FormSection title="Pricing & Stock" icon={<DollarSign className="w-5 h-5 text-blue-600" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex gap-4 pt-6 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 hover:shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Adding Medicine...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Add Medicine with Barcode</span>
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
                  {preselectedMedicine ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selected Medicine</label>
                      <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-800 text-sm">
                        {preselectedMedicine.name}
                        {preselectedMedicine.medication_code ? (
                          <span className="text-gray-500"> ({preselectedMedicine.medication_code})</span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <>
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
                              <div>{m.name} <span className="text-gray-500">({m.medication_code})</span></div>
                              {m.nickname && <div className="text-xs text-purple-600 mt-0.5">Nickname: {m.nickname}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
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
              <div className="flex gap-4 pt-6 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 hover:shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>{editMode ? 'Updating Batch...' : 'Adding Batch...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>{editMode ? 'Update Batch with Barcode' : 'Add Batch with Barcode'}</span>
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

              <div className="flex gap-4 pt-6 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={() => setActiveTab('medicine')}
                  className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 hover:shadow-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-5 h-5" />
                      <span>Save Supplier</span>
                    </>
                  )}
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
