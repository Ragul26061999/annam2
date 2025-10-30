'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart, 
  User, 
  Phone, 
  Calendar,
  Package,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Printer
} from 'lucide-react';

// Types
interface Medicine {
  id: string;
  name: string;
  medicine_code: string;
  manufacturer: string;
  category: string;
  unit: string;
  description?: string;
  batches: MedicineBatch[];
}

interface MedicineBatch {
  id: string;
  batch_number: string;
  expiry_date: string;
  current_quantity: number;
  purchase_price: number;
  selling_price: number;
  medicine_id: string;
  status: string;
}

interface BillItem {
  medicine: Medicine;
  batch: MedicineBatch;
  quantity: number;
  total: number;
}

interface Customer {
  type: 'patient' | 'walk_in';
  name: string;
  phone?: string;
  patient_id?: string;
}

interface BillTotals {
  subtotal: number;
  discountType: 'amount' | 'percent';
  discountValue: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
}

export default function NewBillingPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [customer, setCustomer] = useState<Customer>({
    type: 'walk_in',
    name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrPreviewBatch, setQrPreviewBatch] = useState<MedicineBatch | null>(null);
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash');
  // Patient search state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Array<{ id: string; patient_id: string; name: string; phone?: string }>>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [billTotals, setBillTotals] = useState<BillTotals>({
    subtotal: 0,
    discountType: 'amount',
    discountValue: 0,
    discountAmount: 0,
    taxPercent: 18, // Default GST
    taxAmount: 0,
    totalAmount: 0
  });
  const [showBillSuccess, setShowBillSuccess] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<any>(null);
  // Hospital details for receipt
  const [hospitalDetails, setHospitalDetails] = useState({
    gstNumber: 'GST29ABCDE1234F1Z5',
    contactNumber: '+91-9876543210'
  });
  const embedded = false;

  // Utility: get QR image URL for given data
  const getQrUrl = (data: string, size: number = 200) => {
    const encoded = encodeURIComponent(data);
    // Using goqr.me API to generate QR image
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  };

  // Load medicines from database (using 'medications' table)
  const loadMedicines = async () => {
    try {
      setLoading(true);
      const { data: medicinesData, error: medicinesError } = await supabase
         .from('medications')
         .select('id, name, medication_code, manufacturer, category, dosage_form')
         .eq('status', 'active')
         .order('name');

      if (medicinesError) throw medicinesError;

      const { data: batchesData, error: batchesError } = await supabase
         .from('medicine_batches')
         .select('*')
         .gt('current_quantity', 0)
         .eq('status', 'active')
         .gte('expiry_date', new Date().toISOString().split('T')[0]);

      if (batchesError) throw batchesError;

      // Group batches by medicine_id
      const batchesByMedicine = batchesData.reduce((acc: any, batch: any) => {
        if (!acc[batch.medicine_id]) {
          acc[batch.medicine_id] = [];
        }
        acc[batch.medicine_id].push(batch);
        return acc;
      }, {});

      // Combine medicines with their batches and map fields to UI type
      const medicinesWithBatches: Medicine[] = (medicinesData || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        medicine_code: m.medication_code,
        manufacturer: m.manufacturer,
        category: m.category,
        unit: m.dosage_form || 'units',
        description: '',
        batches: batchesByMedicine[m.id] || []
      })).filter((medicine: Medicine) => medicine.batches.length > 0);

      setMedicines(medicinesWithBatches);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  // Search registered patients by name, UHID, or phone
  useEffect(() => {
    const run = async () => {
      const term = patientSearch.trim();
      if (customer.type !== 'patient' || term.length < 2) {
        setPatientResults([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, patient_id, name, phone')
          .or(`name.ilike.%${term}%,patient_id.ilike.%${term}%,phone.ilike.%${term}%`)
          .limit(10);
        if (error) throw error;
        setPatientResults(data || []);
      } catch (e) {
        console.error('Patient search error:', e);
      }
    };
    run();
  }, [patientSearch, customer.type]);

  // Filter medicines based on search (including batch number)
  const filteredMedicines = medicines.filter(medicine => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const baseMatch =
      medicine.name.toLowerCase().includes(term) ||
      medicine.medicine_code.toLowerCase().includes(term) ||
      medicine.manufacturer.toLowerCase().includes(term);
    const batchMatch = medicine.batches?.some(b =>
      b.batch_number?.toLowerCase().includes(term)
    );
    return baseMatch || batchMatch;
  });

  // Add medicine to bill
  const addToBill = (medicine: Medicine, batch: MedicineBatch, quantity: number = 1) => {
    // Validate quantity
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (quantity > batch.current_quantity) {
      alert(`Insufficient stock available. Only ${batch.current_quantity} units in stock.`);
      return;
    }

    // Check if batch is expired
    const today = new Date();
    const expiryDate = new Date(batch.expiry_date);
    if (expiryDate <= today) {
      alert('This batch has expired and cannot be sold.');
      return;
    }

    const existingItemIndex = billItems.findIndex(
      item => item.medicine.id === medicine.id && item.batch.id === batch.id
    );

    if (existingItemIndex >= 0) {
      const newQuantity = billItems[existingItemIndex].quantity + quantity;
      if (newQuantity > batch.current_quantity) {
        alert(`Insufficient stock available. Only ${batch.current_quantity} units in stock.`);
        return;
      }
      updateBillItemQuantity(existingItemIndex, newQuantity);
    } else {
      const newItem: BillItem = {
        medicine,
        batch,
        quantity,
        total: quantity * batch.selling_price
      };
      setBillItems([...billItems, newItem]);
    }
  };

  // Update bill item quantity
  const updateBillItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeBillItem(index);
      return;
    }

    const item = billItems[index];
    
    // Validate new quantity
    if (newQuantity > item.batch.current_quantity) {
      alert(`Insufficient stock available. Only ${item.batch.current_quantity} units in stock.`);
      return;
    }

    // Check if batch is expired
    const today = new Date();
    const expiryDate = new Date(item.batch.expiry_date);
    if (expiryDate <= today) {
      alert('This batch has expired and cannot be sold.');
      return;
    }

    const updatedItems = [...billItems];
    updatedItems[index] = {
      ...item,
      quantity: newQuantity,
      total: newQuantity * item.batch.selling_price
    };
    setBillItems(updatedItems);
  };

  // Remove bill item
  const removeBillItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  // Calculate totals with discount and tax
  const calculateTotals = () => {
    const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
    
    let discountAmount = 0;
    if (billTotals.discountType === 'percent') {
      discountAmount = (subtotal * billTotals.discountValue) / 100;
    } else {
      discountAmount = billTotals.discountValue;
    }
    
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * billTotals.taxPercent) / 100;
    const totalAmount = afterDiscount + taxAmount;
    
    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount
    };
  };

  // Update totals when items or discount/tax change
  useEffect(() => {
    const totals = calculateTotals();
    setBillTotals(prev => ({
      ...prev,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount
    }));
  }, [billItems, billTotals.discountType, billTotals.discountValue, billTotals.taxPercent]);

  // Generate bill
  const generateBill = async () => {
    if (billItems.length === 0) {
      alert('Please add items to the bill');
      return;
    }
    // Validate depending on type
    if (customer.type === 'patient') {
      if (!customer.patient_id) {
        alert('Please select a registered patient');
        return;
      }
      if (!customer.name?.trim()) {
        alert('Selected patient record has no name. Please re-select or contact admin.');
        return;
      }
    } else {
      if (!customer.name?.trim()) {
        alert('Please enter customer name');
        return;
      }
      if (!customer.phone?.trim()) {
        alert('Please enter customer phone number');
        return;
      }
      // Validate phone number format (handle possible undefined safely)
      const phoneRegex = /^[0-9]{10}$/;
      const phoneRaw = customer.phone ?? '';
      const phoneDigits = phoneRaw.replace(/\D/g, '');
      if (!phoneRegex.test(phoneDigits)) {
        alert('Please enter a valid 10-digit phone number');
        return;
      }
    }

    // Check for expired batches before processing
    const today = new Date();
    const expiredItems = billItems.filter(item => {
      const expiryDate = new Date(item.batch.expiry_date);
      return expiryDate <= today;
    });

    if (expiredItems.length > 0) {
      alert('Some items in your bill have expired batches. Please remove them before proceeding.');
      return;
    }

    try {
      setLoading(true);
      
      // Create pharmacy bill
      const { data: billData, error: billError } = await supabase
        .from('billing')
        .insert({
          patient_id: customer.type === 'patient' ? customer.patient_id : 'c0c4724a-1e95-48fd-9db0-9e70eaa6a940', // Use existing patient ID for walk-ins
          currency: 'INR',
          subtotal: billTotals.subtotal,
          discount_type: billTotals.discountType,
          discount_value: billTotals.discountValue,
          tax_percent: billTotals.taxPercent,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'credit' ? 'pending' : 'completed',
          customer_name: customer.name.trim(),
          customer_phone: customer.type === 'patient' ? (customer.phone ?? null) : (customer.phone ?? '').trim(),
          customer_type: customer.type
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create bill items
      const billItemsData = billItems.map(item => ({
        billing_id: billData.id,
        line_type_id: '3a0ca26e-7dc1-4ede-9872-d798cf39d248', // Medicine line type from ref_code table
        medicine_id: item.medicine.id,
        batch_id: item.batch.id,
        description: item.medicine.name,
        qty: item.quantity,
        unit_amount: item.batch.selling_price,
        total_amount: item.total,
        batch_number: item.batch.batch_number,
        expiry_date: item.batch.expiry_date
      }));

      const { error: itemsError } = await supabase
        .from('billing_item')
        .insert(billItemsData);

      if (itemsError) throw itemsError;

      // Stock transactions and inventory adjustments are handled automatically by database triggers

      // Show success modal with receipt
      setGeneratedBill({
        ...billData,
        items: billItems,
        totals: billTotals,
        customer: customer,
        paymentMethod: paymentMethod,
        hospitalDetails: hospitalDetails,
        billDate: new Date().toISOString()
      });
      setShowBillSuccess(true);
      setShowPaymentModal(false);
      
      // Reset form
      setBillItems([]);
      setCustomer({ type: 'walk_in', name: '', phone: '' });
      setPaymentMethod('cash');
      setBillTotals({
        subtotal: 0,
        discountType: 'amount',
        discountValue: 0,
        discountAmount: 0,
        taxPercent: 18,
        taxAmount: 0,
        totalAmount: 0
      });
      
      // Reload medicines to update stock
      loadMedicines();
      
    } catch (err: any) {
      console.error('Full error object:', err);
      console.error('Error message:', err?.message);
      console.error('Error details:', err?.details);
      console.error('Error hint:', err?.hint);
      setError(err?.message || 'Unknown error occurred');
      alert('Error generating bill: ' + (err?.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gray-50 p-6'}>
      <div className={embedded ? '' : 'max-w-7xl mx-auto'}>
        {/* Header (hidden when embedded) */}
        {!embedded && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">New Pharmacy Bill</h1>
            <p className="text-gray-600">Create a new billing entry for pharmacy sales</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Hospital Details Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hospital Details (for Receipt)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
              <input
                type="text"
                value={hospitalDetails.gstNumber}
                onChange={(e) => setHospitalDetails(prev => ({ ...prev, gstNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="GST29ABCDE1234F1Z5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
              <input
                type="text"
                value={hospitalDetails.contactNumber}
                onChange={(e) => setHospitalDetails(prev => ({ ...prev, contactNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+91-9876543210"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Medicine Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Package className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Select Medicines</h2>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by name, code, manufacturer, or batch number / QR value..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Medicine List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading medicines...</p>
                  </div>
                ) : filteredMedicines.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No medicines found</p>
                  </div>
                ) : (
                  filteredMedicines.map((medicine) => (
                    <div key={medicine.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{medicine.name}</h3>
                          <p className="text-sm text-gray-600">Code: {medicine.medicine_code}</p>
                          <p className="text-sm text-gray-600">Manufacturer: {medicine.manufacturer}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {medicine.category}
                        </span>
                      </div>

                      {/* Batches */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Available Batches:</p>
                        {(searchTerm
                          ? medicine.batches.filter(b =>
                              b.batch_number?.toLowerCase().includes(searchTerm.toLowerCase().trim())
                            )
                          : medicine.batches
                        ).map((batch) => (
                          <div key={batch.id} className="space-y-2">
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-4 text-sm">
                                   <span className="font-medium">Batch: {batch.batch_number}</span>
                                   <span className="text-gray-600">Exp: {new Date(batch.expiry_date).toLocaleDateString()}</span>
                                   <span className="text-gray-600">Stock: {batch.current_quantity}</span>
                                   <span className="font-semibold text-green-600">₹{batch.selling_price}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => addToBill(medicine, batch)}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add
                                </button>
                                {/* QR view button */}
                                <button
                                  onClick={() => setQrPreviewBatch(batch)}
                                  className="bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-sm"
                                  title="View QR for this batch"
                                >
                                  QR
                                </button>
                              </div>
                            </div>
                            {/* QR Preview Panel */}
                            {qrPreviewBatch?.id === batch.id && (
                              <div className="border border-gray-200 rounded-lg p-3 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <img
                                    src={getQrUrl(batch.batch_number, 160)}
                                    alt={`QR for ${batch.batch_number}`}
                                    className="w-40 h-40 border border-gray-200 rounded"
                                  />
                                  <div className="text-sm text-gray-700">
                                    <p className="font-medium">Batch QR</p>
                                    <p>Scan to search: {batch.batch_number}</p>
                                    <div className="mt-2 flex gap-2">
                                      <a
                                        href={getQrUrl(batch.batch_number, 300)}
                                        download={`batch_${batch.batch_number}_qr.png`}
                                        className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                                      >
                                        Download
                                      </a>
                                      <button
                                        onClick={() => setQrPreviewBatch(null)}
                                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                      >
                                        Close
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
                <select
                  value={customer.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setCustomer({ ...customer, type: e.target.value as 'patient' | 'walk_in' })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="walk_in">Walk-in Customer</option>
                  <option value="patient">Registered Patient</option>
                </select>
              </div>
              {customer.type === 'patient' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search Patient (name / UHID / phone)</label>
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                      placeholder="Start typing to search registered patients..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {showPatientDropdown && patientResults.length > 0 && (
                      <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                        {patientResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setCustomer({ type: 'patient', name: p.name, phone: p.phone || '', patient_id: p.id });
                              setPatientSearch(`${p.name} · ${p.patient_id}`);
                              setShowPatientDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                          >
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{p.name}</div>
                              <div className="text-gray-600">UHID: {p.patient_id}{p.phone ? ` • ${p.phone}` : ''}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
                      <input
                        type="text"
                        value={customer.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomer({ ...customer, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="text"
                        value={customer.phone || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomer({ ...customer, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setCustomer({ ...customer, name: e.target.value })
                      }
                      placeholder="Enter customer name"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="text"
                      value={customer.phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setCustomer({ ...customer, phone: e.target.value })
                      }
                      placeholder="Enter phone number"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

            {/* Bill Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Bill Items</h2>
              </div>

              {billItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No items added to bill</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {billItems.map((item, index) => (
                    <div key={`${item.medicine.id}-${item.batch.id}`} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.medicine.name}</h4>
                          <p className="text-sm text-gray-600">Batch: {item.batch.batch_number}</p>
                          <p className="text-sm text-gray-600">₹{item.batch.selling_price} each</p>
                        </div>
                        <button
                          onClick={() => removeBillItem(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateBillItemQuantity(index, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateBillItemQuantity(index, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="font-semibold text-green-600">₹{item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Summary */}
              {billItems.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
                  {/* Discount Section */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Discount & Tax</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                        <select
                          value={billTotals.discountType}
                          onChange={(e) => setBillTotals(prev => ({ ...prev, discountType: e.target.value as 'amount' | 'percent' }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="amount">Amount (₹)</option>
                          <option value="percent">Percentage (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount {billTotals.discountType === 'percent' ? '(%)' : '(₹)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={billTotals.discountType === 'percent' ? '100' : undefined}
                          value={billTotals.discountValue}
                          onChange={(e) => setBillTotals(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">GST/Tax (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={billTotals.taxPercent}
                          onChange={(e) => setBillTotals(prev => ({ ...prev, taxPercent: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="18"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bill Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{billTotals.subtotal.toFixed(2)}</span>
                    </div>
                    {billTotals.discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">-₹{billTotals.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {billTotals.taxAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax ({billTotals.taxPercent}%):</span>
                        <span className="font-medium">₹{billTotals.taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-lg font-semibold pt-2 border-t">
                      <span>Total Amount:</span>
                      <span className="text-green-600">₹{billTotals.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Generate Bill Button */}
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={loading || billItems.length === 0}
                className="w-full mt-6 bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Generate Bill
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        {/* Payment Method Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => !loading && setShowPaymentModal(false)}></div>
            <div className="relative bg-white w-full max-w-md mx-auto rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Select Payment Method</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'upi' | 'credit')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="credit">Credit (Due)</option>
                  </select>
                  {paymentMethod === 'credit' && (
                    <p className="text-xs text-gray-600 mt-2">This will mark the payment status as Pending. You can settle later.</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => { setShowPaymentModal(false); await generateBill(); }}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300"
                  >
                    Confirm & Generate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bill Success Modal with Receipt */}
        {showBillSuccess && generatedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowBillSuccess(false)}></div>
            <div className="relative bg-white w-full max-w-2xl mx-auto rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Success Header */}
              <div className="bg-green-600 text-white p-6 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Bill Generated Successfully!</h2>
                <p className="text-green-100 mt-2">Bill Number: {generatedBill.bill_number}</p>
              </div>

              {/* Receipt Content */}
              <div id="receipt-content" className="p-6">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">ANNAM HOSPITAL</h1>
                  <p className="text-gray-600">Pharmacy Department</p>
                  <p className="text-sm text-gray-500">GST No: {generatedBill.hospitalDetails?.gstNumber || 'GST29ABCDE1234F1Z5'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p><strong>Bill No:</strong> {generatedBill.bill_number}</p>
                    <p><strong>Bill Date:</strong> {generatedBill.billDate ? new Date(generatedBill.billDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                    <p><strong>Printed Date:</strong> {new Date().toLocaleDateString()}</p>
                    <p><strong>Printed Time:</strong> {new Date().toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <p><strong>Customer:</strong> {generatedBill.customer.name}</p>
                    {generatedBill.customer.phone && <p><strong>Phone:</strong> {generatedBill.customer.phone}</p>}
                    <p><strong>Type:</strong> {generatedBill.customer.type === 'patient' ? 'Registered Patient' : 'Walk-in'}</p>
                  </div>
                </div>

                <table className="w-full mb-6 text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2">Item</th>
                      <th className="text-center py-2">Qty</th>
                      <th className="text-right py-2">Rate</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedBill.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2">
                          <div>
                            <p className="font-medium">{item.medicine.name}</p>
                            <p className="text-xs text-gray-500">Batch: {item.batch.batch_number}</p>
                          </div>
                        </td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">₹{item.batch.selling_price.toFixed(2)}</td>
                        <td className="text-right py-2">₹{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t-2 border-gray-300 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{generatedBill.totals.subtotal.toFixed(2)}</span>
                  </div>
                  {generatedBill.totals.discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span>-₹{generatedBill.totals.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {generatedBill.totals.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({generatedBill.totals.taxPercent}%):</span>
                      <span>₹{generatedBill.totals.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{generatedBill.totals.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="capitalize">{generatedBill.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-center mt-6 text-xs text-gray-500">
                  <p>Thank you for choosing Annam Hospital!</p>
                  <p>For queries, contact: {generatedBill.hospitalDetails?.contactNumber || '+91-9876543210'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-50 px-6 py-4 flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setShowBillSuccess(false)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}