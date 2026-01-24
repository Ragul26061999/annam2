'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Trash2 } from 'lucide-react';
import { 
  createOtherBill, 
  CHARGE_CATEGORIES,
  getOtherBillChargeCategories,
  type OtherBillFormData,
  type OtherBillItem,
  type ChargeCategory,
  type PatientType 
} from '../lib/otherBillsService';
import { supabase } from '../lib/supabase';

interface OtherBillsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Partial<OtherBillFormData>;
}

interface PatientSearchResult {
  id: string;
  patient_id: string;
  name: string;
  phone: string;
}

export default function OtherBillsForm({ isOpen, onClose, onSuccess, initialData }: OtherBillsFormProps) {
  const [formData, setFormData] = useState<OtherBillFormData>({
    patient_type: 'General',
    patient_name: '',
    patient_phone: '',
    items: [
      {
        charge_category: 'nursing_charges',
        charge_description: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_percent: 0,
      },
    ],
    reference_number: '',
    remarks: '',
    ...initialData,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [chargeCategories, setChargeCategories] = useState(CHARGE_CATEGORIES);

  const [calculatedAmounts, setCalculatedAmounts] = useState({
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    (formData.items || []).forEach((item) => {
      const quantity = item.quantity || 1;
      const unitPrice = item.unit_price || 0;
      const discountPercent = item.discount_percent || 0;
      const taxPercent = item.tax_percent || 0;

      const itemSubtotal = quantity * unitPrice;
      const itemDiscountAmount = (itemSubtotal * discountPercent) / 100;
      const afterDiscount = itemSubtotal - itemDiscountAmount;
      const itemTaxAmount = (afterDiscount * taxPercent) / 100;
      const itemTotalAmount = afterDiscount + itemTaxAmount;

      subtotal += itemSubtotal;
      discountAmount += itemDiscountAmount;
      taxAmount += itemTaxAmount;
      totalAmount += itemTotalAmount;
    });

    setCalculatedAmounts({ subtotal, discountAmount, taxAmount, totalAmount });
  }, [formData.items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await getOtherBillChargeCategories();
        if (!mounted) return;
        setChargeCategories(cats);
      } catch (err) {
        console.warn('Failed to load other bill charge categories:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setPatientResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_id, name, phone')
        .or(`name.ilike.%${query}%,patient_id.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setPatientResults(data || []);
    } catch (err) {
      console.error('Error searching patients:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearch) {
        searchPatients(patientSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  const selectPatient = (patient: PatientSearchResult) => {
    setFormData({
      ...formData,
      patient_id: patient.id,
      patient_name: patient.name,
      patient_phone: patient.phone,
    });
    setPatientSearch('');
    setShowPatientSearch(false);
    setPatientResults([]);
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          charge_category: 'nursing_charges',
          charge_description: '',
          quantity: 1,
          unit_price: 0,
          discount_percent: 0,
          tax_percent: 0,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      if (!prev.items || prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      };
    });
  };

  const updateItem = (index: number, updates: Partial<OtherBillItem>) => {
    setFormData((prev) => ({
      ...prev,
      items: (prev.items || []).map((item, i) => (i === index ? { ...item, ...updates } : item)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await createOtherBill(formData, user?.id);
      
      onSuccess?.();
      onClose();
      
      setFormData({
        patient_type: 'General',
        patient_name: '',
        patient_phone: '',
        items: [
          {
            charge_category: 'nursing_charges',
            charge_description: '',
            quantity: 1,
            unit_price: 0,
            discount_percent: 0,
            tax_percent: 0,
          },
        ],
        reference_number: '',
        remarks: '',
      });
    } catch (err: any) {
      console.error('Error creating other bill:', err);
      setError(err.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create Other Bill</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Type *
              </label>
              <select
                value={formData.patient_type}
                onChange={(e) => setFormData({ ...formData, patient_type: e.target.value as PatientType })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="IP">Inpatient (IP)</option>
                <option value="OP">Outpatient (OP)</option>
                <option value="Emergency">Emergency</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Patient (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientSearch(true);
                  }}
                  onFocus={() => setShowPatientSearch(true)}
                  placeholder="Search by name, ID, or phone"
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              {showPatientSearch && patientResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {patientResults.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => selectPatient(patient)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-900">{patient.name}</div>
                      <div className="text-sm text-gray-500">
                        ID: {patient.patient_id} | {patient.phone}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Name *
              </label>
              <input
                type="text"
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Phone
              </label>
              <input
                type="tel"
                value={formData.patient_phone}
                onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Items *
              </label>
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {(formData.items || []).map((item, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">Item {index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={(formData.items || []).length <= 1}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Charge Category *
                      </label>
                      <select
                        value={item.charge_category}
                        onChange={(e) => updateItem(index, { charge_category: e.target.value as ChargeCategory })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {chargeCategories.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label} - {category.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Charge Description *
                      </label>
                      <input
                        type="text"
                        value={item.charge_description}
                        onChange={(e) => updateItem(index, { charge_description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qty *
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 1 })}
                        min="0.01"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Price (₹) *
                      </label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        value={item.discount_percent || 0}
                        onChange={(e) => updateItem(index, { discount_percent: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax (%)
                      </label>
                      <input
                        type="number"
                        value={item.tax_percent || 0}
                        onChange={(e) => updateItem(index, { tax_percent: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 mb-3">Bill Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">₹{calculatedAmounts.subtotal.toFixed(2)}</span>
            </div>
            {calculatedAmounts.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium text-red-600">-₹{calculatedAmounts.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {calculatedAmounts.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">₹{calculatedAmounts.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-semibold text-gray-900">Total Amount:</span>
              <span className="font-bold text-xl text-blue-600">₹{calculatedAmounts.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
