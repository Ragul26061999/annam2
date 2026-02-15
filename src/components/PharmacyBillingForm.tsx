'use client';
import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Minus,
  ShoppingCart,
  User,
  Pill,
  Calculator,
  Save,
  Trash2,
  Edit,
  FileText,
  AlertCircle,
  CheckCircle,
  Package,
  IndianRupee,
  RefreshCw
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

interface BillingItem {
  id: string;
  medication_id: string;
  medication_name: string;
  unit_price: number;
  quantity: number;
  discount_percentage: number;
  total_price: number;
  stock_available: number;
}

interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  dispensed_quantity?: number;
  remaining_quantity?: number;
}

interface Prescription {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  diagnosis: string;
  created_at: string;
  total_amount: number;
  status: string;
  prescription_items: PrescriptionItem[];
}

interface PharmacyBillingFormProps {
  onClose: () => void;
  onBillCreated: () => void;
  currentUser: any;
  prescriptionId?: string;
  billingType: 'prescription' | 'custom';
}

export default function PharmacyBillingForm({
  onClose,
  onBillCreated,
  currentUser,
  prescriptionId,
  billingType
}: PharmacyBillingFormProps) {
  const [loading, setLoading] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [lastPrescriptionUpdate, setLastPrescriptionUpdate] = useState<string>('');

  // Customer details for custom billing
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Billing details
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [notes, setNotes] = useState('');
  const [overallDiscount, setOverallDiscount] = useState(0);

  useEffect(() => {
    fetchMedications();
    if (billingType === 'prescription' && prescriptionId) {
      fetchPrescriptionDetails();
    }
  }, [billingType, prescriptionId]);

  // Periodic check for prescription updates
  useEffect(() => {
    if (billingType === 'prescription' && prescriptionId) {
      const interval = setInterval(() => {
        fetchPrescriptionDetails();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [billingType, prescriptionId, lastPrescriptionUpdate]);

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .gt('stock_quantity', 0)
        .order('name', { ascending: true });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  const fetchPrescriptionDetails = async () => {
    if (!prescriptionId) return;

    try {
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients!inner(name)
        `)
        .eq('id', prescriptionId)
        .single();

      if (prescriptionError) throw prescriptionError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('prescription_items')
        .select('*')
        .eq('prescription_id', prescriptionId);

      if (itemsError) throw itemsError;

      const prescriptionWithItems: Prescription = {
        ...prescriptionData,
        patient_name: prescriptionData.patients.name,
        prescription_items: itemsData || []
      };

      // Check if prescription has been updated
      const currentUpdate = prescriptionData.updated_at;
      if (currentUpdate !== lastPrescriptionUpdate && lastPrescriptionUpdate !== '') {
        // Prescription was updated, refresh billing items
        const updatedItems: BillingItem[] = itemsData.map((item: PrescriptionItem) => ({
          id: item.id,
          medication_id: item.medication_id,
          medication_name: item.medication_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          discount_percentage: 0,
          total_price: item.total_price,
          stock_available: 0 // Will be updated when we fetch medication details
        }));

        setBillingItems(updatedItems);

        // Show notification to user about prescription update
        alert('Prescription has been updated by the doctor. Billing items have been refreshed.');
      }

      setPrescription(prescriptionWithItems);
      setLastPrescriptionUpdate(currentUpdate);

      // Only set billing items if this is the initial load
      if (lastPrescriptionUpdate === '') {
        const items: BillingItem[] = itemsData.map((item: PrescriptionItem) => ({
          id: item.id,
          medication_id: item.medication_id,
          medication_name: item.medication_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          discount_percentage: 0,
          total_price: item.total_price,
          stock_available: 0 // Will be updated when we fetch medication details
        }));

        setBillingItems(items);
      }
    } catch (error) {
      console.error('Error fetching prescription details:', error);
    }
  };

  const refreshPrescription = async () => {
    await fetchPrescriptionDetails();
  };

  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.generic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.medication_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addMedicationToBill = (medication: Medication) => {
    const existingItem = billingItems.find(item => item.medication_id === medication.id);

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: BillingItem = {
        id: Date.now().toString(),
        medication_id: medication.id,
        medication_name: medication.name,
        unit_price: medication.unit_price,
        quantity: 1,
        discount_percentage: 0,
        total_price: medication.unit_price,
        stock_available: medication.stock_quantity
      };
      setBillingItems([...billingItems, newItem]);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeBillingItem(itemId);
      return;
    }

    setBillingItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const total = (item.unit_price * newQuantity) * (1 - item.discount_percentage / 100);
          return {
            ...item,
            quantity: newQuantity,
            total_price: total
          };
        }
        return item;
      })
    );
  };

  const updateDiscount = (itemId: string, discountPercentage: number) => {
    setBillingItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const total = (item.unit_price * item.quantity) * (1 - discountPercentage / 100);
          return {
            ...item,
            discount_percentage: discountPercentage,
            total_price: total
          };
        }
        return item;
      })
    );
  };

  const removeBillingItem = (itemId: string) => {
    setBillingItems(items => items.filter(item => item.id !== itemId));
  };

  const calculateSubtotal = () => {
    return billingItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const calculateOverallDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * overallDiscount) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateOverallDiscountAmount();
    return subtotal - discountAmount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (billingItems.length === 0) {
      alert('Please add at least one medication to the bill.');
      return;
    }

    setLoading(true);
    try {
      // Create pharmacy billing record
      const billingData = {
        patient_id: prescription?.patient_id || null,
        patient_name: prescription?.patient_name || customerName,
        customer_phone: prescription ? null : customerPhone,
        customer_address: prescription ? null : customerAddress,
        // prescription_uuid: prescriptionId || null,
        billing_type: billingType,
        subtotal: calculateSubtotal(),
        discount_percentage: overallDiscount,
        discount_amount: calculateOverallDiscountAmount(),
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        payment_status: 'paid',
        notes: notes,
        created_by: currentUser?.id || 'unknown',
        status: 'completed'
      };

      const { data: billingRecord, error: billingError } = await supabase
        .from('pharmacy_bills')
        .insert(billingData)
        .select()
        .single();

      if (billingError) throw billingError;

      // Create billing items
      for (const item of billingItems) {
        const { error: itemError } = await supabase
          .from('pharmacy_bill_items')
          .insert({
            billing_id: billingRecord.id,
            medication_id: item.medication_id,
            medication_name: item.medication_name,
            unit_price: item.unit_price,
            quantity: item.quantity,
            discount_percentage: item.discount_percentage,
            total_price: item.total_price
          });

        if (itemError) throw itemError;

        // Ledger-first: record a stock transaction for the sale (positive quantity)
        const txnId = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const { error: txnError } = await supabase
          .from('stock_transactions')
          .insert({
            medication_id: item.medication_id,
            transaction_id: txnId,
            transaction_type: 'sale',
            quantity: item.quantity,
            unit_price: item.unit_price,
            // Use per-item total after discount for accurate revenue
            total_amount: item.total_price,
            customer_name: prescription ? prescription.patient_name : customerName || null,
            created_by: currentUser?.id || 'unknown',
            notes: `billing_id:${billingRecord.id}`
          });

        if (txnError) throw txnError;
      }

      // If this is a prescription billing, update prescription items as dispensed
      if (billingType === 'prescription' && prescriptionId) {
        for (const item of billingItems) {
          // Update the prescription item to mark it as dispensed
          const { error: updateError } = await supabase
            .from('prescription_items')
            .update({
              dispensed_quantity: item.quantity,
              remaining_quantity: (item.quantity || 0) - item.quantity,
              status: 'dispensed'
            })
            .eq('id', item.id);

          if (updateError) console.error('Error updating prescription item:', updateError);
        }
      }

      onBillCreated();
      onClose();
    } catch (error) {
      console.error('Error creating bill:', error);
      alert('Error creating bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {billingType === 'prescription' ? 'Prescription Billing' : 'Custom Billing'}
              </h2>
              <p className="text-sm text-gray-600">
                {billingType === 'prescription'
                  ? 'Bill prescribed medications'
                  : 'Create custom medication bill'
                }
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

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Medication Search */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search medications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredMedications.map((medication) => (
                <div
                  key={medication.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => addMedicationToBill(medication)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{medication.name}</h4>
                      <p className="text-xs text-gray-600">{medication.generic_name}</p>
                      <p className="text-xs text-gray-500">{medication.strength} - {medication.dosage_form}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 flex items-center text-sm">
                        <IndianRupee className="h-3 w-3" />
                        {medication.unit_price.toFixed(0)}
                      </p>
                      <p className="text-xs text-gray-500">Stock: {medication.stock_quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Billing Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Details for Custom Billing */}
              {billingType === 'custom' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Prescription Details */}
              {billingType === 'prescription' && prescription && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Prescription Details
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Patient:</span>
                      <span className="ml-2 font-medium">{prescription.patient_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Doctor:</span>
                      <span className="ml-2 font-medium">{prescription.doctor_name}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Diagnosis:</span>
                      <span className="ml-2 font-medium">{prescription.diagnosis}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Billing Items
                </h3>

                {billingItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No items added to bill</p>
                    <p className="text-sm">Search and add medications from the left panel</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {billingItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.medication_name}</h4>
                            <p className="text-sm text-gray-600 flex items-center">
                              <IndianRupee className="h-3 w-3" />
                              {item.unit_price.toFixed(0)} per unit
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeBillingItem(item.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantity
                            </label>
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1 border border-gray-300 rounded-l-lg hover:bg-gray-50"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                                min="1"
                                max={item.stock_available}
                                className="w-16 px-2 py-1 border-t border-b border-gray-300 text-center text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1 border border-gray-300 rounded-r-lg hover:bg-gray-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Discount %
                            </label>
                            <input
                              type="number"
                              value={item.discount_percentage}
                              onChange={(e) => updateDiscount(item.id, parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Total
                            </label>
                            <p className="font-semibold text-green-600 flex items-center text-sm py-1">
                              <IndianRupee className="h-3 w-3" />
                              {item.total_price.toFixed(0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Details */}
              {billingItems.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Payment Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'upi')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Overall Discount %
                      </label>
                      <input
                        type="number"
                        value={overallDiscount}
                        onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Additional notes..."
                    />
                  </div>

                  {/* Bill Summary */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="flex items-center">
                          <IndianRupee className="h-3 w-3" />
                          {calculateSubtotal().toFixed(0)}
                        </span>
                      </div>
                      {overallDiscount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Overall Discount ({overallDiscount}%):</span>
                          <span className="flex items-center">
                            -<IndianRupee className="h-3 w-3" />
                            {calculateOverallDiscountAmount().toFixed(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span className="flex items-center text-green-600">
                          <IndianRupee className="h-4 w-4" />
                          {calculateTotal().toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || billingItems.length === 0}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Bill
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}