'use client';

import React, { useState, useEffect } from 'react';
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
  Printer,
  X
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

// Split payment entry
interface Payment {
  method: 'cash' | 'card' | 'upi' | 'credit' | 'others';
  amount: number;
  reference?: string;
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
  const [payments, setPayments] = useState<Payment[]>([
    { method: 'cash', amount: 0, reference: '' }
  ]);
  // Smooth typing buffer for payment amounts per row
  const [paymentAmountInputs, setPaymentAmountInputs] = useState<string[]>([]);
  // Initialize/expand buffer when modal opens
  useEffect(() => {
    if (showPaymentModal) {
      setPaymentAmountInputs(payments.map(p => {
        const n = Number(p.amount);
        return Number.isFinite(n) ? n.toFixed(2) : '';
      }));
    }
  }, [showPaymentModal]);

  // Normalize method to DB-allowed values
  const normalizeMethod = (m: string): 'cash' | 'card' | 'upi' | 'credit' => {
    switch (m) {
      case 'cash':
      case 'card':
      case 'upi':
      case 'credit':
        return m;
      default:
        return 'cash';
    }
  }

  // Helper: Get current Indian time (IST = UTC+5:30)
  const getISTDate = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (5.5 * 60 * 60 * 1000)); // IST is UTC+5:30
    return ist;
  };

  // Helper: Format date for receipt display in IST
  const formatISTDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatISTTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  // Keep buffer length in sync when rows are added/removed, without overwriting existing typed values
  useEffect(() => {
    setPaymentAmountInputs(prev => {
      const next = payments.map((p, i) => {
        if (prev[i] !== undefined) return prev[i];
        const n = Number(p.amount);
        return Number.isFinite(n) ? n.toFixed(2) : '';
      });
      return next;
    });
  }, [payments.length]);
  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)

  // Payment method icon helper
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return '💵'
      case 'upi':
        return '📱'
      case 'card':
        return '💳'
      case 'credit':
        return '⏳'
      case 'others':
        return '🔄'
      default:
        return '💰'
    }
  }
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
  // Patient search state used in UI below
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  // Hospital details for receipt (persisted)
  const [hospitalDetails, setHospitalDetails] = useState({
    name: 'ANNAM PHARMACY',
    department: 'Pharmacy Department',
    address: '2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur - 628002',
    contactNumber: 'Ph.No: 04639-252592',
    gstNumber: 'GST29ABCDE1234F1Z5'
  });
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const embedded = false;
  const [phoneError, setPhoneError] = useState<string>('');
  const printCss = `
    @page { size: auto; margin: 5mm; }
    @media print {
      body * { visibility: hidden; }
      .printable-area, .printable-area * { visibility: visible; }
      .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
    }
    .receipt { font-size: 12px; max-width: 540px; margin: 0 auto; }
    .invoice-header { line-height: 1.3; margin-bottom: 6px; }
    .bill-info td { word-break: break-all; }
    .amount-cell { text-align: right; padding-right: 4mm; }
    .label { font-weight: 400; color: #333; }
    .value { font-weight: 600; }
    .totals-section { page-break-inside: avoid; margin-bottom: 5mm; }
    .invoice-footer { position: relative; margin-top: 10mm; text-align: center; font-size: 10pt; }
  `;

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

  // Load hospital details from Supabase (fallback to localStorage)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('hospital_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        if (!error && data) {
          setHospitalDetails({
            name: data.name,
            department: data.department,
            address: data.address,
            contactNumber: data.contact_number,
            gstNumber: data.gst_number,
          });
          return;
        }
      } catch {}
      // fallback local
      try {
        const saved = localStorage.getItem('hospital_details');
        if (saved) setHospitalDetails(JSON.parse(saved));
      } catch {}
    })();
  }, []);

  // Persist locally on change (UX convenience)
  useEffect(() => {
    try { localStorage.setItem('hospital_details', JSON.stringify(hospitalDetails)); } catch {}
  }, [hospitalDetails]);

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
      
      // Create pharmacy bill (handle prod schema differences: total_amount vs total)
      let billData: any = null;
      {
        const base = {
          patient_id: customer.type === 'patient' ? customer.patient_id : 'c0c4724a-1e95-48fd-9db0-9e70eaa6a940', // Use existing patient ID for walk-ins
          currency: 'INR',
          subtotal: billTotals.subtotal,
          discount_type: billTotals.discountType,
          discount_value: billTotals.discountValue,
          tax_percent: billTotals.taxPercent,
          payment_method: normalizeMethod(payments[0].method),
          customer_name: customer.name.trim(),
          customer_phone: customer.type === 'patient' ? (customer.phone ?? null) : (customer.phone ?? '').trim(),
          customer_type: customer.type
        } as any;

        // Attempt 1: insert with total_amount
        const { data: d1, error: e1 } = await supabase
          .from('billing')
          .insert({ ...base, total_amount: billTotals.totalAmount })
          .select('*')
          .single();

        if (!e1) {
          billData = d1;
        } else {
          const msg = (e1.message || '').toLowerCase();
          // If total_amount missing OR total is a generated column, retry WITHOUT any total field
          const looksLikeColumnMissing = msg.includes("'total_amount'") || msg.includes('total_amount') || (msg.includes('column') && msg.includes('not') && msg.includes('found'));
          const looksLikeGeneratedTotal = msg.includes('generated') && msg.includes('total') || msg.includes('non-default') && msg.includes('total');
          if (looksLikeColumnMissing || looksLikeGeneratedTotal) {
            const { data: d2, error: e2 } = await supabase
              .from('billing')
              .insert({ ...base })
              .select('*')
              .single();
            if (e2) throw e2;
            billData = d2;
          } else {
            throw e1;
          }
        }
      }

      // Create bill items
      const billItemsData = billItems.map(item => ({
        billing_id: billData!.id,
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

      // Insert split payments using RPC so triggers update payment_status/amounts
      for (const p of payments) {
        if (!p.amount || p.amount <= 0) continue;
        const { error: payErr } = await supabase.rpc('add_billing_payment', {
          p_billing_id: billData!.id,
          p_amount: p.amount,
          p_method: p.method,
          p_reference: p.reference || null,
          p_notes: null,
          p_received_by: null
        });
        if (payErr) throw payErr;
      }

      // Stock transactions and inventory adjustments are handled automatically by database triggers

      // Show success modal with receipt
      setGeneratedBill({
        ...billData,
        items: billItems,
        totals: billTotals,
        customer: customer,
        paymentMethod: payments.length > 1 ? 'split' : payments[0].method,
        hospitalDetails: hospitalDetails,
        billDate: getISTDate().toISOString()
      });
      setShowBillSuccess(true);
      setShowPaymentModal(false);
      
      // Reset form
      setBillItems([]);
      setCustomer({ type: 'walk_in', name: '', phone: '' });
      setPayments([{ method: 'cash', amount: 0, reference: '' }]);
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

        {/* Hospital Details trigger */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Hospital Details (for Receipt)</h2>
            <p className="text-sm text-gray-600">Configure header, address, phone and GST for the printed invoice.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHospitalModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Edit Details
          </button>
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
                  placeholder="Search by name, code, manufacturer, or batch number..."
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
                              </div>
                            </div>
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const raw = e.target.value;
                        const digits = raw.replace(/\D/g, '');
                        setCustomer({ ...customer, phone: raw });
                        setPhoneError(digits.length > 10 ? 'Phone number cannot exceed 10 digits' : '');
                      }}
                      placeholder="Enter phone number"
                      className={`w-full px-3 py-2 border ${phoneError ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    {phoneError && (
                      <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                    )}
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
                          <input
                            type="number"
                            min={1}
                            max={item.batch.current_quantity}
                            value={Number.isFinite(item.quantity as any) ? item.quantity : 0}
                            onChange={(e) => {
                              const raw = e.target.value;
                              // Allow empty while typing; keep controlled value as 0
                              if (raw === '') {
                                updateBillItemQuantity(index, 0);
                                return;
                              }
                              const val = parseInt(raw, 10);
                              if (Number.isNaN(val)) {
                                updateBillItemQuantity(index, 0);
                                return;
                              }
                              updateBillItemQuantity(index, val);
                            }}
                            onBlur={(e) => {
                              let val = parseInt(e.target.value || '0', 10);
                              if (!val || val < 1) val = 1;
                              if (val > item.batch.current_quantity) val = item.batch.current_quantity;
                              updateBillItemQuantity(index, val);
                            }}
                            className="w-16 text-center border border-gray-200 rounded-md py-1"
                          />
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
        {/* Enhanced Payment Modal with Split Support */}
        {showPaymentModal && (() => {
          const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
          const totalDue = r2(billTotals.totalAmount);
          const typedPaidRaw = paymentAmountInputs.length
            ? paymentAmountInputs.reduce((s, v) => {
                const n = parseFloat((v || '').toString().replace(/,/g, '.'));
                return s + (Number.isFinite(n) ? n : 0);
              }, 0)
            : paymentsTotal;
          const paid = r2(typedPaidRaw);
          const remainingAmount = Math.max(r2(totalDue - paid), 0);
          return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setShowPaymentModal(false)}></div>
            <div className="relative bg-white w-full max-w-2xl mx-auto rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">Payment Details</h3>
                    <p className="text-blue-100 mt-1">Split payments supported</p>
                  </div>
                  <button
                    onClick={() => !loading && setShowPaymentModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Bill Summary Card */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mb-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">Bill Summary</h4>
                    <span className="text-2xl font-bold text-green-600">₹{totalDue.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="font-medium text-gray-900">Subtotal</div>
                      <div className="text-gray-600">₹{billTotals.subtotal.toFixed(2)}</div>
                    </div>
                    {billTotals.discountAmount > 0 && (
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="font-medium text-gray-900">Discount</div>
                        <div className="text-red-600">-₹{billTotals.discountAmount.toFixed(2)}</div>
                      </div>
                    )}
                    {billTotals.taxAmount > 0 && (
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="font-medium text-gray-900">Tax</div>
                        <div className="text-blue-600">₹{billTotals.taxAmount.toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">Payment Methods</h4>
                    {payments.length < 3 && (
                      <button
                        onClick={() => setPayments(prev => [...prev, { method: 'cash', amount: 0, reference: '' }])}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Add Payment
                      </button>
                    )}
                  </div>

                  {payments.map((p, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        {/* Payment Method Icon */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                          {getPaymentMethodIcon(p.method)}
                        </div>

                        {/* Payment Details */}
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                              <select
                                value={p.method}
                                onChange={(e) => {
                                  const newMethod = e.target.value as Payment['method'];
                                  setPayments(prev => prev.map((pp, i) => i === idx ? { ...pp, method: newMethod } : pp));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="cash">💵 Cash</option>
                                <option value="upi">📱 UPI</option>
                                <option value="card">💳 Card</option>
                                <option value="credit">⏳ Credit (Due)</option>
                                <option value="others">🔄 Others</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*[.,]?[0-9]{0,2}"
                                  enterKeyHint="done"
                                  value={paymentAmountInputs[idx] ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/,/g, '.');
                                    if (/^\d*(?:\.\d{0,2})?$/.test(v) || v === '') {
                                      setPaymentAmountInputs(prev => {
                                        const next = [...prev];
                                        next[idx] = v;
                                        return next;
                                      });
                                    }
                                  }}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const raw = paymentAmountInputs[idx] ?? '';
                                      const n = parseFloat(raw);
                                      const safe = Number.isFinite(n) && n >= 0 ? parseFloat(n.toFixed(2)) : 0;
                                      setPayments(prev => prev.map((pp, i) => i === idx ? { ...pp, amount: safe } : pp));
                                      setPaymentAmountInputs(prev => {
                                        const next = [...prev];
                                        next[idx] = safe.toFixed(2);
                                        return next;
                                      });
                                    }
                                  }}
                                  onBlur={() => {
                                    const raw = paymentAmountInputs[idx] ?? '';
                                    const n = parseFloat(raw);
                                    const safe = Number.isFinite(n) && n >= 0 ? parseFloat(n.toFixed(2)) : 0;
                                    setPayments(prev => prev.map((pp, i) => i === idx ? { ...pp, amount: safe } : pp));
                                    setPaymentAmountInputs(prev => {
                                      const next = [...prev];
                                      next[idx] = safe.toFixed(2);
                                      return next;
                                    });
                                  }}
                                  className="w-full pr-16 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0.00"
                                  aria-label="Payment amount"
                                />
                                {remainingAmount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const amt = parseFloat(Math.max(0, remainingAmount).toFixed(2));
                                      setPayments(prev => prev.map((pp, i) => i === idx ? { ...pp, amount: amt } : pp));
                                      setPaymentAmountInputs(prev => {
                                        const next = [...prev];
                                        next[idx] = amt.toFixed(2);
                                        return next;
                                      });
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 rounded-md text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm"
                                    title={`Fill remaining: ₹${remainingAmount.toFixed(2)}`}
                                    aria-label={`Fill remaining amount ₹${remainingAmount.toFixed(2)}`}
                                  >
                                    Fill ₹{remainingAmount.toFixed(2)}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reference (Optional)</label>
                            <input
                              type="text"
                              value={p.reference || ''}
                              onChange={(e) => setPayments(prev => prev.map((pp, i) => i === idx ? { ...pp, reference: e.target.value } : pp))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Transaction ID, last 4 digits, or note"
                            />
                          </div>
                        </div>

                        {/* Remove Button */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))}
                            disabled={payments.length === 1}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove this payment"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Summary */}
                <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Amount</span>
                      <span className="text-lg font-semibold text-gray-900">₹{totalDue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Paid Amount</span>
                      <span className="text-lg font-semibold text-green-600">₹{paid.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
                      <span className="text-gray-900 font-medium">Remaining Balance</span>
                      <span className={`text-lg font-bold ${remainingAmount === 0 ? 'text-green-600' : remainingAmount < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                        ₹{remainingAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Payment Progress</span>
                      <span>{Math.min(100, Math.round(((totalDue === 0 ? 0 : (paid / totalDue)) * 100)))}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${remainingAmount === 0 ? 'bg-green-500' : remainingAmount < 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, Math.max(0, (totalDue === 0 ? 0 : (paid / totalDue)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Validation Messages */}
                {paid > totalDue && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-red-800 font-medium">Payment amount exceeds bill total</p>
                      <p className="text-red-700 text-sm">Please adjust the payment amounts to not exceed ₹{totalDue.toFixed(2)}</p>
                    </div>
                  </div>
                )}

                {paid === 0 && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <p className="text-yellow-800">Please add at least one payment method with a valid amount.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={loading}
                  className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (paid === 0) {
                      alert('Please add at least one payment method with a valid amount.');
                      return;
                    }
                    if (paid > totalDue) {
                      alert('Paid amount cannot exceed total bill amount.');
                      return;
                    }
                    setShowPaymentModal(false);
                    await generateBill();
                  }}
                  disabled={loading || paid === 0 || paid > totalDue}
                  className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Generate Bill
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
        })()}
        {/* Success Modal - UI Only */}
        {showBillSuccess && generatedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowBillSuccess(false)}></div>
            <div className="relative bg-white w-full max-w-2xl mx-auto rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-green-600 text-white p-6 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Bill Generated Successfully!</h2>
                <p className="text-green-100 mt-2">Bill Number: {generatedBill.bill_number}</p>
              </div>
              <div className="p-6">
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <p>Receipt is ready for printing.</p>
                </div>
              </div>
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

        {/* Hidden Printable Receipt - This is what gets printed */}
        {generatedBill && (
          <div className="printable-area">
            <div id="receipt-content" className="p-6 receipt">
              <style dangerouslySetInnerHTML={{ __html: printCss }} />
              {/* Header */}
              <div className="text-center mb-4 invoice-header">
                <h1 className="text-xl font-bold text-gray-900">{hospitalDetails.name || 'ANNAM PHARMACY'}</h1>
                <p className="text-gray-700">{hospitalDetails.department}</p>
                <p className="text-sm text-gray-600">{hospitalDetails.address}</p>
                <p className="text-sm text-gray-600">{hospitalDetails.contactNumber}</p>
                <p className="text-sm text-gray-500">GST No: {hospitalDetails.gstNumber}</p>
                <p className="mt-1 text-sm font-semibold">INVOICE</p>
              </div>

              {/* Bill Info */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm bill-info">
                <div className="space-y-1">
                  <p><strong>Bill No:</strong> {generatedBill.bill_number}</p>
                  <p><strong>Date:</strong> {formatISTDate(getISTDate())} {formatISTTime(getISTDate())}</p>
                  <p><strong>Sales Type:</strong> {generatedBill.paymentMethod === 'credit' ? 'CREDIT' : 'CASH'}</p>
                </div>
                <div className="space-y-1">
                  <p><strong>To:</strong> {generatedBill.customer.name}</p>
                  {generatedBill.customer.phone && <p><strong>Phone:</strong> {generatedBill.customer.phone}</p>}
                  {generatedBill.customer.address && <p><strong>Address:</strong> {generatedBill.customer.address}</p>}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-4 text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 w-12">S.No</th>
                    <th className="text-left py-2">Drug Name</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedBill.items.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2">{index + 1}</td>
                      <td className="py-2">
                        <div>
                          <p className="font-medium">{item.medicine.name}</p>
                          <p className="text-xs text-gray-500">Batch: {item.batch.batch_number}</p>
                        </div>
                      </td>
                      <td className="text-center py-2">{item.quantity}</td>
                      <td className="py-2 amount-cell">₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Payment Details for Split Payments */}
              {generatedBill.paymentMethod === 'split' && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment Details</h4>
                  <div className="space-y-1">
                    {payments.map((payment, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="capitalize">{payment.method}</span>
                        <span className="font-medium">₹{payment.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1 mt-2 flex justify-between font-semibold">
                      <span>Total Paid</span>
                      <span>₹{paymentsTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t-2 border-gray-300 pt-3 space-y-1 text-sm totals-section">
                <div className="flex justify-between">
                  <span className="label">Taxable Amt</span>
                  <span className="value">₹{generatedBill.totals.subtotal.toFixed(2)}</span>
                </div>
                {generatedBill.totals.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="label">Disc Amt</span>
                    <span className="value">-₹{generatedBill.totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="label">CGST Amt</span>
                  <span className="value">₹{(generatedBill.totals.taxAmount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="label">SGST Amt</span>
                  <span className="value">₹{(generatedBill.totals.taxAmount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total Net Amt</span>
                  <span>₹{generatedBill.totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 invoice-footer text-xs text-gray-600">
                <div className="flex justify-between items-end">
                  <div>
                    <p>Printed Date: {formatISTDate(getISTDate())}</p>
                    <p>Printed Time: {formatISTTime(getISTDate())}</p>
                  </div>
                  <div className="text-right">
                    <div className="h-10"></div>
                    <p className="border-t border-gray-300 pt-1">Pharmacist Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hospital Details Modal */}
        {showHospitalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowHospitalModal(false)}></div>
            <div className="relative bg-white w-full max-w-xl mx-auto rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Hospital Details (for Receipt)</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={hospitalDetails.name}
                    onChange={(e) => setHospitalDetails(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="ANNAM PHARMACY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={hospitalDetails.department}
                    onChange={(e) => setHospitalDetails(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="Pharmacy Department"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={hospitalDetails.address}
                    onChange={(e) => setHospitalDetails(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={hospitalDetails.contactNumber}
                    onChange={(e) => setHospitalDetails(prev => ({ ...prev, contactNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="Ph.No: 04639-252592"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    value={hospitalDetails.gstNumber}
                    onChange={(e) => setHospitalDetails(prev => ({ ...prev, gstNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="GST29ABCDE1234F1Z5"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setShowHospitalModal(false)} className="px-4 py-2 rounded-lg border border-gray-200">Close</button>
                <button
                  onClick={async () => {
                    try {
                      await supabase.from('hospital_settings').upsert({
                        id: 1,
                        name: hospitalDetails.name,
                        department: hospitalDetails.department,
                        address: hospitalDetails.address,
                        contact_number: hospitalDetails.contactNumber,
                        gst_number: hospitalDetails.gstNumber,
                        updated_at: new Date().toISOString()
                      });
                      setShowHospitalModal(false);
                    } catch {
                      setShowHospitalModal(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}