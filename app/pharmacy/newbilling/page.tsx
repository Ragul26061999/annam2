'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/src/lib/supabase'
import { generateBillNumber } from '@/src/lib/billingService';
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
  Eye,
  X
} from 'lucide-react';
import StaffSelect from '@/src/components/StaffSelect';

// Types
interface Medicine {
  id: string;
  name: string;
  medicine_code: string;
  manufacturer: string;
  category: string;
  unit: string;
  description?: string;
  combination?: string;
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
  batch_barcode?: string;
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

function NewBillingPageInner() {
  const searchParams = useSearchParams();
  const prescriptionIdFromUrl = searchParams?.get('prescriptionId') || null;
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
  const [staffId, setStaffId] = useState('');
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

  // Enable payment only when patient details are valid and there is at least one item
  const canReceivePayment = (
    billItems.length > 0 && (
      (customer.type === 'patient' && !!customer.patient_id && !!(customer.name || '').trim()) ||
      (customer.type === 'walk_in' && !!(customer.name || '').trim())
    )
  );

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
  const [linkedPrescriptionId, setLinkedPrescriptionId] = useState<string | null>(null);
  const [linkedPrescriptionItems, setLinkedPrescriptionItems] = useState<Array<{ prescription_item_id: string; medication_id: string; quantity: number; dispensed_quantity: number }>>([]);
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
    /* 7.7 cm thermal roll style */
    @page {
      size: 77mm auto;
      margin: 4mm 3mm 6mm 3mm;
    }
    @media print {
      body * {
        visibility: hidden;
      }
      .printable-area,
      .printable-area * {
        visibility: visible;
      }
      .printable-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        font-weight: bold; /* user requirement: bold print */
      }
    }

    .receipt {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11px;
      max-width: 77mm;
      margin: 0 auto;
      padding: 0;
    }

    .invoice-header {
      line-height: 1.3;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .bill-info {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 4px 0;
    }

    .bill-info td {
      word-break: break-all;
    }

    table {
      border-collapse: collapse;
    }

    thead tr {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }

    tbody tr:last-child {
      border-bottom: 1px solid #000;
    }

    th,
    td {
      padding: 2px 0;
    }

    .amount-cell {
      text-align: right;
      padding-right: 2mm;
    }

    .label {
      font-weight: 400;
      color: #000;
    }

    .value {
      font-weight: 600;
    }

    .totals-section {
      page-break-inside: avoid;
      margin: 4px 0 6mm 0;
      border: 1px solid #000;
      padding: 4px 2mm;
    }

    .invoice-footer {
      position: relative;
      margin-top: 4mm;
      text-align: center;
      font-size: 9px;
    }
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
        .select('id, name, medication_code, manufacturer, category, dosage_form, combination')
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
        combination: m.combination,
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

  useEffect(() => {
    const loadFromPrescription = async () => {
      if (!prescriptionIdFromUrl) return;
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            id,
            patient_id,
            status,
            patient:patients(id, patient_id, name, phone),
            prescription_items(
              id,
              medication_id,
              quantity,
              dispensed_quantity,
              status
            )
          `)
          .eq('id', prescriptionIdFromUrl)
          .single();

        if (error) throw error;

        setLinkedPrescriptionId(data.id);
        setLinkedPrescriptionItems((data.prescription_items || []).map((it: any) => ({
          prescription_item_id: it.id,
          medication_id: it.medication_id,
          quantity: Number(it.quantity) || 0,
          dispensed_quantity: Number(it.dispensed_quantity) || 0
        })));

        const patientRow = Array.isArray((data as any).patient)
          ? ((data as any).patient[0] || null)
          : ((data as any).patient || null);

        const patientName = patientRow?.name || '';
        const patientPhone = patientRow?.phone || '';
        const patientUhid = patientRow?.patient_id || '';

        setCustomer({
          type: 'patient',
          name: patientName,
          phone: patientPhone,
          patient_id: data.patient_id
        });
        setPatientSearch(patientUhid && patientName ? `${patientName} · ${patientUhid}` : patientName);

        const pendingItems = (data.prescription_items || []).filter((it: any) => (it.status || 'pending') === 'pending');
        if (pendingItems.length === 0) return;

        const bestBatchForMedicine = (m: Medicine): MedicineBatch | null => {
          const batches = Array.isArray(m.batches) ? m.batches : [];
          const viable = batches
            .filter(b => (Number(b.current_quantity) || 0) > 0)
            .filter(b => {
              const exp = new Date(b.expiry_date);
              return !Number.isNaN(exp.getTime()) && exp >= new Date();
            })
            .sort((a, b) => {
              const ea = new Date(a.expiry_date).getTime();
              const eb = new Date(b.expiry_date).getTime();
              return eb - ea;
            });
          return viable[0] || null;
        };

        const initialBillItems: BillItem[] = [];
        for (const it of pendingItems) {
          const medicine = medicines.find(m => m.id === it.medication_id);
          if (!medicine) continue;
          const batch = bestBatchForMedicine(medicine);
          if (!batch) continue;
          const remainingQty = Math.max((Number(it.quantity) || 0) - (Number(it.dispensed_quantity) || 0), 0);
          const qty = remainingQty > 0 ? remainingQty : (Number(it.quantity) || 1);
          if (qty <= 0) continue;
          if (qty > batch.current_quantity) continue;
          initialBillItems.push({
            medicine,
            batch,
            quantity: qty,
            total: qty * batch.selling_price
          });
        }

        if (initialBillItems.length > 0) setBillItems(initialBillItems);
      } catch (e: any) {
        console.error('Error preloading from prescription - Details:', JSON.stringify(e, null, 2));
        setError(e?.message || 'Failed to load prescription for billing');
      } finally {
        setLoading(false);
      }
    };

    loadFromPrescription();
  }, [prescriptionIdFromUrl, medicines]);

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
      } catch { }
      // fallback local
      try {
        const saved = localStorage.getItem('hospital_details');
        if (saved) setHospitalDetails(JSON.parse(saved));
      } catch { }
    })();
  }, []);

  // Persist locally on change (UX convenience)
  useEffect(() => {
    try { localStorage.setItem('hospital_details', JSON.stringify(hospitalDetails)); } catch { }
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
          .or(`name.ilike.%${term}%,patient_id.ilike.%${term}%`)
          .limit(10);
        if (error) throw error;
        setPatientResults(data || []);
      } catch (e) {
        console.error('Patient search error:', e);
      }
    };
    run();
  }, [patientSearch, customer.type]);

  // Filter medicines based on search (including batch number and barcode); guard undefined fields
  // Only show results when there is a search term (hide catalogue by default)
  const searchTermTrimmed = (searchTerm || '').trim();
  const filteredMedicines = searchTermTrimmed.length === 0
    ? []
    : medicines.filter((medicine) => {
      const term = searchTermTrimmed.toLowerCase();
      const name = (medicine.name || '').toLowerCase();
      const combination = (medicine.combination || '').toLowerCase();
      const code = (medicine.medicine_code || '').toLowerCase();
      const manufacturer = (medicine.manufacturer || '').toLowerCase();
      const category = (medicine.category || '').toLowerCase();
      const unit = (medicine.unit || '').toLowerCase();
      const baseMatch =
        name.includes(term) ||
        combination.includes(term) ||
        code.includes(term) ||
        manufacturer.includes(term) ||
        category.includes(term) ||
        unit.includes(term);
      // Also match batch_number and batch_barcode
      const batchMatch = Array.isArray(medicine.batches) && medicine.batches.some((b) =>
        (b.batch_number || '').toLowerCase().includes(term) ||
        (b.batch_barcode || '').toLowerCase().includes(term)
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
    const subtotal = Math.round(billItems.reduce((sum, item) => sum + item.total, 0));

    let discountAmount = 0;
    if (billTotals.discountType === 'percent') {
      discountAmount = Math.round((subtotal * billTotals.discountValue) / 100);
    } else {
      discountAmount = Math.round(billTotals.discountValue);
    }

    const afterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round((afterDiscount * billTotals.taxPercent) / 100);
    const totalAmount = afterDiscount + taxAmount;

    // Custom rounding: .5 and below stays same, .51 and above goes to next
    const customRound = (num: number) => {
      const decimal = num - Math.floor(num);
      return decimal <= 0.5 ? Math.floor(num) : Math.ceil(num);
    };

    return {
      subtotal: customRound(subtotal),
      discountAmount: customRound(discountAmount),
      taxAmount: customRound(taxAmount),
      totalAmount: customRound(totalAmount)
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

      // Generate bill number using our simplified format
      const billNumber = await generateBillNumber();

      // Create pharmacy bill (handle prod schema differences: total_amount vs total)
      let billData: any = null;
      {
        const base = {
          bill_number: billNumber, // Use our generated bill number
          patient_id: customer.type === 'patient' ? customer.patient_id : 'c0c4724a-1e95-48fd-9db0-9e70eaa6a940', // Use existing patient ID for walk-ins
          currency: 'INR',
          subtotal: billTotals.subtotal,
          discount_type: billTotals.discountType,
          discount_value: billTotals.discountValue,
          tax_percent: billTotals.taxPercent,
          payment_method: normalizeMethod(payments[0].method),
          customer_name: customer.name.trim(),
          customer_phone: customer.type === 'patient' ? (customer.phone ?? null) : (customer.phone ?? '').trim(),
          customer_type: customer.type,
          staff_id: staffId || null
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

      // Show success modal with receipt (snapshot payments for printing)
      setGeneratedBill({
        ...billData,
        items: billItems,
        totals: billTotals,
        customer: customer,
        paymentMethod: payments.length > 1 ? 'split' : payments[0].method,
        payments: payments.map(p => ({ method: p.method, amount: Number(p.amount) || 0, reference: p.reference || '' })),
        hospitalDetails: hospitalDetails,
        billDate: getISTDate().toISOString()
      });
      setShowBillSuccess(true);
      setShowPaymentModal(false);

      if (linkedPrescriptionId) {
        try {
          // Mark prescription items dispensed based on billed medicines
          for (const bi of billItems) {
            const matched = linkedPrescriptionItems.find(li => li.medication_id === bi.medicine.id);
            if (!matched) continue;

            const nextDispensedQty = Math.min(
              Number(matched.quantity) || 0,
              (Number(matched.dispensed_quantity) || 0) + (Number(bi.quantity) || 0)
            );
            const { error: itemUpdErr } = await supabase
              .from('prescription_items')
              .update({
                status: 'dispensed',
                dispensed_quantity: nextDispensedQty
              })
              .eq('id', matched.prescription_item_id);
            if (itemUpdErr) throw itemUpdErr;
          }

          // If all items are dispensed, update prescription header
          const { data: remaining, error: remErr } = await supabase
            .from('prescription_items')
            .select('id, status')
            .eq('prescription_id', linkedPrescriptionId);
          if (remErr) throw remErr;
          const allDispensed = (remaining || []).length > 0 && (remaining || []).every((r: any) => r.status === 'dispensed');
          if (allDispensed) {
            const { error: prescUpdErr } = await supabase
              .from('prescriptions')
              .update({ status: 'dispensed' })
              .eq('id', linkedPrescriptionId);
            if (prescUpdErr) throw prescUpdErr;
          }
        } catch (statusErr: any) {
          console.error('Failed to update prescription status after billing - Details:', JSON.stringify(statusErr, null, 2));
        }
      }

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

  // Thermal printer preview function
  const showThermalPreview = () => {
    if (!generatedBill) return;

    const now = new Date();
    const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // Get patient UHID
    const patientUhid = customer.type === 'patient' ? customer.patient_id : 'WALK-IN';
    
    // Get sales type
    let salesType = payments.length > 1 ? 'SPLIT' : payments[0].method?.toUpperCase() || 'CASH';
    if (salesType === 'CREDIT') {
      salesType = 'CREDIT';
    }

    // Generate items HTML
    const itemsHtml = generatedBill.items.map((item: any, index: number) => `
      <tr>
        <td>${index + 1}.</td>
        <td>${item.medicine?.name || item.name}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${Number(item.total_amount || item.amount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${generatedBill.bill_number}</title>
          <style>
            @page { margin: 5mm; size: 77mm 297mm; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              margin: 0; 
              padding: 10px;
              font-size: 12px;
              line-height: 1.2;
              width: 77mm;
            }
            .header-14cm { font-size: 14pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
            .header-9cm { font-size: 9pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
            .header-10cm { font-size: 10pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
            .header-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
            .items-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
            .bill-info-10cm { font-size: 10pt; font-family: 'Times New Roman', Times, serif; }
            .bill-info-bold { font-weight: bold; font-family: 'Times New Roman', Times, serif; }
            .footer-7cm { font-size: 7pt; font-family: 'Times New Roman', Times, serif; }
            .center { text-align: center; font-family: 'Times New Roman', Times, serif; }
            .right { text-align: right; font-family: 'Times New Roman', Times, serif; }
            .table { width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; }
            .table td { padding: 2px; font-family: 'Times New Roman', Times, serif; }
            .totals-line { display: flex; justify-content: space-between; font-family: 'Times New Roman', Times, serif; }
            .footer { margin-top: 20px; font-family: 'Times New Roman', Times, serif; }
            .signature-area { margin-top: 30px; font-family: 'Times New Roman', Times, serif; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="header-14cm">ANNAM PHARMACY</div>
            <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
            <div class="header-9cm">Phone- 04639 252592</div>
            <div class="header-10cm">Gst No: 33AJWPR2713G2ZZ</div>
            <div style="margin-top: 5px; font-weight: bold;">INVOICE</div>
          </div>
          
          <div style="margin-top: 10px;">
            <table class="table">
              <tr>
                <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${generatedBill.bill_number}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${patientUhid}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${customer.name}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${formatISTDate(getISTDate())} ${formatISTTime(getISTDate())}</td>
              </tr>
              <tr>
                <td class="header-10cm">Sales Type&nbsp;:&nbsp;&nbsp;</td>
                <td class="header-10cm bill-info-bold">${salesType}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 10px;">
            <table class="table">
              <tr style="border-bottom: 1px dashed #000;">
                <td width="30%" class="items-8cm">S.No</td>
                <td width="40%" class="items-8cm">Drug Name</td>
                <td width="15%" class="items-8cm text-center">Qty</td>
                <td width="15%" class="items-8cm text-right">Amt</td>
              </tr>
              ${itemsHtml}
            </table>
          </div>

          <div style="margin-top: 10px;">
            <div class="totals-line items-8cm">
              <span>Taxable Amount</span>
              <span>${Number(generatedBill.totals?.subtotal || 0).toFixed(2)}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
              <span>${Number(generatedBill.totals?.discountAmount || 0).toFixed(2)}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
              <span>${Number((generatedBill.totals?.taxAmount || 0) / 2).toFixed(2)}</span>
            </div>
            <div class="totals-line header-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
              <span>${Number((generatedBill.totals?.taxAmount || 0) / 2).toFixed(2)}</span>
            </div>
            <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
              <span>Total Amount</span>
              <span>${Number(generatedBill.totals?.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <div class="totals-line footer-7cm">
              <span>Printed on ${printedDateTime}</span>
              <span>Pharmacist Sign</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(thermalContent);
      printWindow.document.close();
    }
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-slate-100 px-6 py-4'}>
      <div className={embedded ? '' : 'max-w-7xl mx-auto flex flex-col gap-4'}>
        {/* Desktop-style top status bar (hidden when embedded) */}
        {!embedded && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-slate-900">New Pharmacy Bill</h1>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                  Entry Type:
                  <span className="ml-1 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {customer.type === 'patient' ? 'Registered' : 'Walk-in'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Active Bill</span>
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-sm">
                    Tab 1
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Items:</span>
                  <span className="font-semibold text-slate-900">{billItems.length}</span>
                  <span className="h-6 w-px bg-slate-200" />
                  <span className="text-slate-500">Total:</span>
                  <span className="text-lg font-semibold text-emerald-600">₹{Math.round(billTotals.totalAmount)}</span>
                </div>
              </div>
            </div>
            {/* Hospital Details trigger */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Hospital Details (for Receipt)</h2>
                <p className="text-xs text-slate-500">Configure header, address, phone and GST for the printed invoice.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHospitalModal(true)}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                Edit Details
              </button>
            </div>
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

        <div className="grid grid-cols-2 gap-6 mt-2">
          {/* Left side: Sales Entry + Medicine */}
          <div className="flex flex-col gap-4">
            {/* Sales Entry Information (Customer + Bill Info) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
              <StaffSelect
                value={staffId}
                onChange={setStaffId}
                label="Billed By (Staff)"
                required
              />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">Sales Entry Information</h2>
                </div>
              </div>

              {/* Customer / Patient Block */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Customer Type</label>
                  <select
                    value={customer.type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setCustomer({ ...customer, type: e.target.value as 'patient' | 'walk_in' })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Move focus to the next input field based on customer type
                        const nextElement = customer.type === 'patient'
                          ? document.querySelector('input[placeholder="Start typing to search registered patients..."]')
                          : document.querySelector('input[placeholder="Enter customer name"]');
                        if (nextElement) {
                          (nextElement as HTMLElement).focus();
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="patient">Patient</option>
                    <option value="walk_in">Walk-in</option>
                  </select>
                </div>
                {customer.type === 'patient' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Search Patient (name / UHID)</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setPatientSearch(e.target.value);
                            setShowPatientDropdown(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const container = e.currentTarget.closest('.space-y-3');
                              const nextElement = container?.querySelectorAll('input')[1];
                              if (nextElement) {
                                (nextElement as HTMLElement).focus();
                              }
                            }
                          }}
                          placeholder="Start typing to search registered patients..."
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {showPatientDropdown && patientResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                            {patientResults.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setCustomer({ type: 'patient', name: p.name, phone: p.phone || '', patient_id: p.id });
                                  setPatientSearch(`${p.name} · ${p.patient_id}`);
                                  setShowPatientDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                              >
                                <div className="text-xs">
                                  <div className="font-medium text-slate-900">{p.name}</div>
                                  <div className="text-slate-500">UHID: {p.patient_id}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Patient Name</label>
                        <input
                          type="text"
                          value={customer.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCustomer({ ...customer, name: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const container = e.currentTarget.closest('.grid');
                              const nextElement = container?.querySelectorAll('input')[1];
                              if (nextElement) {
                                (nextElement as HTMLElement).focus();
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                        <input
                          type="text"
                          value={customer.phone || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCustomer({ ...customer, phone: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const searchInput = document.querySelector('input[placeholder="Search by name, code, manufacturer, or batch number..."]');
                              if (searchInput) {
                                (searchInput as HTMLElement).focus();
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name *</label>
                      <input
                        type="text"
                        value={customer.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCustomer({ ...customer, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const container = e.currentTarget.closest('.grid');
                            const nextElement = container?.querySelectorAll('input')[1];
                            if (nextElement) {
                              (nextElement as HTMLElement).focus();
                            }
                          }
                        }}
                        placeholder="Enter customer name"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={customer.phone || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value;
                          const digits = raw.replace(/\D/g, '');
                          setCustomer({ ...customer, phone: raw });
                          setPhoneError(digits.length > 10 ? 'Phone number cannot exceed 10 digits' : '');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const searchInput = document.querySelector('input[placeholder="Search by name, code, manufacturer, or batch number..."]');
                            if (searchInput) {
                              (searchInput as HTMLElement).focus();
                            }
                          }
                        }}
                        placeholder="Enter phone number"
                        className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${phoneError ? 'border-red-300' : 'border-slate-200'}`}
                      />
                      {phoneError && (
                        <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Medicine Search Row inside Sales Entry */}
              <div className="mt-5 border-t border-dashed border-slate-200 pt-4">
                <label className="block text-xs font-medium text-slate-600 mb-1">Medicine Search (Barcode / Name)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, code, manufacturer, or batch number..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Focus stays on search or moves to first bill item quantity if exists
                        const firstQuantityInput = document.querySelector('.max-h-72 input[type="number"]');
                        if (firstQuantityInput) {
                          (firstQuantityInput as HTMLElement).focus();
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Medicine Catalogue below Sales Entry */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">Medicine Catalogue</h2>
                </div>
                <span className="text-xs text-slate-500">Select batch and add items to bill</span>
              </div>
              <div className="border border-slate-100 rounded-xl max-h-[420px] overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
                      Loading medicines...
                    </div>
                  ) : searchTermTrimmed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-500">
                      <Search className="h-10 w-10 text-slate-200 mb-2" />
                      Search by name, code, batch number, or barcode
                    </div>
                  ) : filteredMedicines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-500">
                      <Package className="h-10 w-10 text-slate-200 mb-2" />
                      No medicines found for "{searchTermTrimmed}"
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredMedicines.map((medicine) => (
                        <div key={medicine.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm text-slate-900 truncate">{medicine.name}</h3>
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-100">
                                  {medicine.category}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                <span>Code: {medicine.medicine_code}</span>
                                <span>Manufacturer: {medicine.manufacturer}</span>
                                <span>Unit: {medicine.unit}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            {/* Show all batches for matched medicine - no secondary filtering */}
                            {medicine.batches.map((batch) => (
                              <div
                                key={batch.id}
                                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px] border border-slate-100"
                              >
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                                  <span className="font-medium text-slate-800">Batch: {batch.batch_number}</span>
                                  <span>Exp: {new Date(batch.expiry_date).toLocaleDateString()}</span>
                                  <span>Stock: {batch.current_quantity}</span>
                                  <span className="font-semibold text-emerald-600">₹{batch.selling_price}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addToBill(medicine, batch)}
                                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Item
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Bill Items + Billing Summary */}
          <div className="flex flex-col gap-4">
            {/* Bill Items in table style */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-purple-600" />
                  <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">Bill Items</h2>
                </div>
              </div>

              {billItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-500">
                  <ShoppingCart className="h-10 w-10 text-slate-200 mb-2" />
                  No items added yet
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[40px,1.7fr,0.7fr,0.7fr,0.9fr,60px] bg-slate-50 text-[11px] font-medium text-slate-600 px-3 py-2">
                    <span>Sl.</span>
                    <span>Drug / Batch</span>
                    <span className="text-right">Rate</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Total</span>
                    <span className="text-center">Action</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                    {billItems.map((item, index) => (
                      <div
                        key={`${item.medicine.id}-${item.batch.id}`}
                        className="grid grid-cols-[40px,1.7fr,0.7fr,0.7fr,0.9fr,60px] items-center px-3 py-2 text-slate-700"
                      >
                        <span>{index + 1}</span>
                        <div className="flex flex-col">
                          <span className="font-medium truncate">{item.medicine.name}</span>
                          <span className="text-[10px] text-slate-500 truncate">Batch: {item.batch.batch_number.slice(-4)}</span>
                        </div>
                        <span className="text-right font-medium">₹{item.batch.selling_price.toFixed(2)}</span>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min={1}
                            max={item.batch.current_quantity}
                            value={Number.isFinite(item.quantity as any) ? item.quantity : 0}
                            onChange={(e) => {
                              const raw = e.target.value;
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const allQtyInputs = Array.from(document.querySelectorAll('.max-h-72 input[type="number"]'));
                                const currentIndex = allQtyInputs.indexOf(e.currentTarget);
                                if (currentIndex < allQtyInputs.length - 1) {
                                  (allQtyInputs[currentIndex + 1] as HTMLElement).focus();
                                } else {
                                  // Move to discount type select
                                  const discountSelect = document.querySelector('select[value="amount"], select[value="percent"]');
                                  if (discountSelect) {
                                    (discountSelect as HTMLElement).focus();
                                  }
                                }
                              }
                            }}
                            className="w-14 rounded border border-slate-200 bg-white text-center text-[11px] py-1"
                          />
                        </div>
                        <span className="text-right font-semibold text-emerald-600">₹{item.total.toFixed(2)}</span>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeBillItem(index)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Billing Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">Billing Summary</h2>
                </div>
              </div>

              {billItems.length === 0 ? (
                <p className="text-xs text-slate-500">Add items to see billing details.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-700 mb-3">Discount & Tax</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Discount Type</label>
                        <select
                          value={billTotals.discountType}
                          onChange={(e) => setBillTotals(prev => ({ ...prev, discountType: e.target.value as 'amount' | 'percent' }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const container = e.currentTarget.closest('.grid');
                              const nextElement = container?.querySelectorAll('input')[0];
                              if (nextElement) {
                                (nextElement as HTMLElement).focus();
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="amount">Amount (₹)</option>
                          <option value="percent">Percentage (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Discount {billTotals.discountType === 'percent' ? '(%)' : '(₹)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={billTotals.discountType === 'percent' ? '100' : undefined}
                          value={billTotals.discountValue}
                          onChange={(e) => setBillTotals(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const container = e.currentTarget.closest('.grid');
                              const nextElement = container?.querySelectorAll('input')[1];
                              if (nextElement) {
                                (nextElement as HTMLElement).focus();
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">GST / Tax (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={billTotals.taxPercent}
                          onChange={(e) => setBillTotals(prev => ({ ...prev, taxPercent: parseFloat(e.target.value) || 0 }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              // Focus on Receive Payment button
                              const receivePaymentBtn = document.querySelector('button:has(> .lucide-check-circle)');
                              if (receivePaymentBtn && !receivePaymentBtn.hasAttribute('disabled')) {
                                (receivePaymentBtn as HTMLElement).focus();
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="18"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium text-slate-900">₹{Math.round(billTotals.subtotal)}</span>
                    </div>
                    {billTotals.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Discount</span>
                        <span className="font-medium text-red-600">-₹{Math.round(billTotals.discountAmount)}</span>
                      </div>
                    )}
                    {billTotals.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tax ({billTotals.taxPercent}%)</span>
                        <span className="font-medium text-slate-900">₹{Math.round(billTotals.taxAmount)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between border-top border-emerald-200 pt-1">
                      <span className="text-[13px] font-semibold text-slate-900">Total Amount</span>
                      <span className="text-lg font-bold text-emerald-700">₹{Math.round(billTotals.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Actions: Receive Payment / Print Receipt */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      disabled={!canReceivePayment}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Receive Payment
                    </button>
                  </div>
                </div>
              )}
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
                      <span className="text-2xl font-bold text-green-600">₹{Math.round(totalDue)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="font-medium text-gray-900">Subtotal</div>
                        <div className="text-gray-600">₹{Math.round(billTotals.subtotal)}</div>
                      </div>
                      {billTotals.discountAmount > 0 && (
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <div className="font-medium text-gray-900">Discount</div>
                          <div className="text-red-600">-₹{Math.round(billTotals.discountAmount)}</div>
                        </div>
                      )}
                      {billTotals.taxAmount > 0 && (
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <div className="font-medium text-gray-900">Tax</div>
                          <div className="text-blue-600">₹{Math.round(billTotals.taxAmount)}</div>
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
                        <span className="text-lg font-semibold text-gray-900">₹{Math.round(totalDue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Paid Amount</span>
                        <span className="text-lg font-semibold text-green-600">₹{Math.round(paid)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
                        <span className="text-gray-900 font-medium">Remaining Balance</span>
                        <span className={`text-lg font-bold ${remainingAmount === 0 ? 'text-green-600' : remainingAmount < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          ₹{Math.round(remainingAmount)}
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
                        <p className="text-red-700 text-sm">Please adjust the payment amounts to not exceed ₹{Math.round(totalDue)}</p>
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
                  onClick={() => showThermalPreview()}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Thermal Preview
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
          <div className="printable-area hidden print:block" aria-hidden="true">
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
                  <p>
                    <strong>Sales Type:</strong>{' '}
                    {(() => {
                      const pays = (Array.isArray(generatedBill.payments) && generatedBill.payments.length > 0)
                        ? generatedBill.payments
                        : payments;
                      if (Array.isArray(pays) && pays.length > 0) {
                        return pays
                          .map((p: any) => `${(p.method || '').toUpperCase()} ₹${Number(p.amount || 0).toFixed(2)}`)
                          .join(' + ');
                      }
                      return (generatedBill.paymentMethod === 'credit'
                        ? 'CREDIT'
                        : (generatedBill.paymentMethod || 'cash').toUpperCase());
                    })()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p><strong>To:</strong> {generatedBill.customer.name}</p>
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
                  {(() => {
                    // Group items by medicine name and combine quantities/totals
                    const groupedItems = generatedBill.items.reduce((acc: any, item: any) => {
                      const medicineName = item.medicine.name;
                      if (!acc[medicineName]) {
                        acc[medicineName] = {
                          medicine: item.medicine,
                          totalQuantity: 0,
                          totalAmount: 0,
                          batches: []
                        };
                      }
                      acc[medicineName].totalQuantity += item.quantity;
                      acc[medicineName].totalAmount += item.total;
                      acc[medicineName].batches.push(item.batch.batch_number.slice(-4));
                      return acc;
                    }, {});

                    return Object.values(groupedItems).map((groupedItem: any, index: number) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2">{index + 1}</td>
                        <td className="py-2">
                          <div>
                            <p className="font-medium truncate">{groupedItem.medicine.name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              Batches: {groupedItem.batches.join(', ')}
                            </p>
                          </div>
                        </td>
                        <td className="text-center py-2">{groupedItem.totalQuantity}</td>
                        <td className="py-2 amount-cell">₹{Math.round(groupedItem.totalAmount)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>

              {/* Payment Details (supports split payments) */}
              {(() => {
                const pays = (Array.isArray(generatedBill.payments) && generatedBill.payments.length > 0)
                  ? generatedBill.payments
                  : payments;
                return Array.isArray(pays) && pays.length > 0 ? (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment Details</h4>
                    <div className="space-y-1">
                      {pays.map((payment: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="capitalize">{payment.method}</span>
                          <span className="font-medium">₹{Number(payment.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-1 mt-2 flex justify-between font-semibold">
                        <span>Total Paid</span>
                        <span>
                          ₹{(pays.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

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

export default function NewBillingPage() {
  return (
    <Suspense fallback={null}>
      <NewBillingPageInner />
    </Suspense>
  );
}