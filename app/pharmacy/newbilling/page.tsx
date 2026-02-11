'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/src/lib/supabase'
import { generateBillNumber } from '@/src/lib/billingService';
import { getCurrentUserProfile } from '@/src/lib/supabase';
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
  X,
  Pill,
  ArrowRight,
  ArrowLeft
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
  is_external?: boolean;
  available_stock?: number;
  total_stock?: number;
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
  legacy_code?: string | null;
}

interface BillItem {
  medicine: Medicine;
  batch: MedicineBatch;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Customer {
  type: 'patient' | 'walk_in' | 'intent';
  name: string;
  phone?: string;
  patient_id?: string;
  intent_type?: string;
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
  const typeFromUrl = searchParams?.get('type') || null;
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [showExternalPriceModal, setShowExternalPriceModal] = useState(false);
  const [externalPriceInput, setExternalPriceInput] = useState('');
  const [pendingExternalAdd, setPendingExternalAdd] = useState<{
    medicine: Medicine;
    quantity: number;
  } | null>(null);
  const [customer, setCustomer] = useState<Customer>({
    type: typeFromUrl === 'intent' ? 'intent' : 'walk_in',
    name: '',
    phone: ''
  });
  const [intentType, setIntentType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrPreviewBatch, setQrPreviewBatch] = useState<MedicineBatch | null>(null);
  // Unlisted Medicine State
  const [showUnlistedModal, setShowUnlistedModal] = useState(false);
  const [unlistedForm, setUnlistedForm] = useState({
    name: '',
    manufacturer: '',
    category: 'Unlisted',
    mrp: '',
    selling_price: '',
    batch_number: 'TEMP-' + Math.floor(Math.random() * 10000),
    expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    stock: '100'
  });

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([
    { method: 'cash', amount: 0, reference: '' }
  ]);
  const [staffId, setStaffId] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentStaff, setCurrentStaff] = useState<any>(null);

  // Load current user on component mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUserProfile();
        setCurrentUser(user);
        
        // Find corresponding staff record for this user
        if (user?.id) {
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('id, first_name, last_name, employee_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
          
          if (staffError) {
            // Handle different types of staff errors
            if (staffError.code === 'PGRST116') {
              // No rows returned - user doesn't have a staff record
              console.warn('No staff record found for current user:', user.id);
            } else {
              // Other database errors
              console.error('Database error finding staff record:', staffError.message);
            }
            
            // No staff mapping found; do NOT fall back to user.id (billing.staff_id must reference staff.id)
            setCurrentStaff(null);
            setStaffId('');
          } else if (staffData) {
            setCurrentStaff(staffData);
            setStaffId(staffData.id);
          }
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    
    loadCurrentUser();
  }, []);
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
      (customer.type === 'walk_in' && !!(customer.name || '').trim()) ||
      (customer.type === 'intent' && !!(customer.name || '').trim() && !!intentType)
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
    taxPercent: 5, // Default GST changed to 5%
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
  const [linkedPrescriptionEncounterId, setLinkedPrescriptionEncounterId] = useState<string | null>(null);
  const [linkedPrescriptionItems, setLinkedPrescriptionItems] = useState<Array<{ prescription_item_id: string; medication_id: string; quantity: number; dispensed_quantity: number }>>([]);
  // Prescribed medications search state
  const [prescribedSearchTerm, setPrescribedSearchTerm] = useState('');
  const [prescribedMedications, setPrescribedMedications] = useState<Array<{
    prescription_item_id: string;
    medication_id: string;
    medication_name: string;
    dosage: string;
    quantity: number;
    dispensed_quantity: number;
    frequency: string;
    duration: string;
  }>>([]);
  // Hospital details for receipt (persisted)
  const [hospitalDetails, setHospitalDetails] = useState({
    name: 'ANNAM PHARMACY',
    department: 'Pharmacy Department',
    address: '2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur - 628002',
    contactNumber: 'Ph.No: 04639-252592',
    gstNumber: 'GST29ABCDE1234F1Z5'
  });
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  const [selectedPatientIndex, setSelectedPatientIndex] = useState(0);
  const [selectedMedicineIndex, setSelectedMedicineIndex] = useState(0);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const medicineDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search handler to prevent hanging
  const handleMedicineSearch = (value: string) => {
    setSearchTerm(value);
    setSelectedMedicine(null);
    setSelectedBatch(null);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Show loading state for longer searches
    if (value.length > 2) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(() => {
        setSearchLoading(false);
      }, 300);
    } else {
      setSearchLoading(false);
    }
    
    setShowMedicineDropdown(true);
    setSelectedMedicineIndex(0);
    setSelectedBatchIndex(0);
  };

  // Smooth scrolling function for dropdown
  const scrollToHighlightedMedicine = (medicineIndex: number, batchIndex: number) => {
    if (!medicineDropdownRef.current) return;
    
    const container = medicineDropdownRef.current;
    
    // Find all medicine elements
    const medicineElements = container.querySelectorAll('[data-medicine-index]');
    const targetMedicineElement = medicineElements[medicineIndex] as HTMLElement;
    
    if (targetMedicineElement) {
      // Find the specific batch within this medicine
      const batchElements = targetMedicineElement.querySelectorAll('[data-batch-index]');
      const targetElement = batchElements.length > 0 && batchIndex < batchElements.length 
        ? batchElements[batchIndex] as HTMLElement
        : targetMedicineElement;
      
      if (targetElement) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elementTop = targetElement.offsetTop;
        const elementBottom = elementTop + targetElement.clientHeight;
        
        // Smooth scroll into view if not visible
        if (elementTop < containerTop) {
          container.scrollTo({
            top: elementTop - 10,
            behavior: 'smooth'
          });
        } else if (elementBottom > containerBottom) {
          container.scrollTo({
            top: elementBottom - container.clientHeight + 10,
            behavior: 'smooth'
          });
        }
      }
    }
  };
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

  // Keyboard navigation functions
  const handlePatientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (patientResults.length === 0) return;
      e.preventDefault();
      setShowPatientDropdown(true);
    }
    if (!showPatientDropdown || patientResults.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        setSelectedPatientIndex(prev => (prev + 1) % patientResults.length);
        break;
      case 'ArrowUp':
        setSelectedPatientIndex(prev => (prev - 1 + patientResults.length) % patientResults.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (patientResults[selectedPatientIndex]) {
          const p = patientResults[selectedPatientIndex];
          setCustomer({ type: 'patient', name: p.name, phone: p.phone || '', patient_id: p.id });
          setPatientSearch(`${p.name} · ${p.patient_id}`);
          setShowPatientDropdown(false);
          setSelectedPatientIndex(0);
          // Focus to medication search
          setTimeout(() => {
            const medicineInput = document.querySelector('input[placeholder*="medicine"]') as HTMLInputElement;
            if (medicineInput) {
              medicineInput.focus();
            }
          }, 100);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowPatientDropdown(false);
        setSelectedPatientIndex(0);
        break;
    }
  };

  // Filter medicines based on search (including batch number, barcode, and legacy code); guard undefined fields
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

      // If base match, include all batches; otherwise search within batches
      if (baseMatch) return true;

      // Search within batch numbers, barcodes, and legacy codes
      return medicine.batches?.some((batch: any) => {
        const batchNum = (batch.batch_number || '').toLowerCase();
        const barcode = (batch.batch_barcode || '').toLowerCase();
        const legacyCode = ((batch.legacy_code || '') as string).toLowerCase();
        return batchNum.includes(term) || barcode.includes(term) || legacyCode.includes(term);
      });
    });

  const handleMedicineKeyDown = (e: React.KeyboardEvent) => {
    // Early return if dropdown is not showing or no medicines
    if (!showMedicineDropdown || filteredMedicines.length === 0 || searchLoading) {
      return;
    }
    
    // Prevent default for navigation keys
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      e.preventDefault();
    }
    
    const currentMedicine = filteredMedicines[selectedMedicineIndex];
    if (!currentMedicine) return;
    
    const matchingBatches = searchTermTrimmed.length > 0 
      ? currentMedicine.batches.filter(b => 
          (b.batch_number || '').toLowerCase().includes(searchTermTrimmed.toLowerCase()) ||
          (b.batch_barcode || '').toLowerCase().includes(searchTermTrimmed.toLowerCase()) ||
          ((b.legacy_code || '') as string).toLowerCase().includes(searchTermTrimmed.toLowerCase())
        ) || []
      : currentMedicine.batches || [];
    
    const totalBatches = matchingBatches.length;
    
    switch (e.key) {
      case 'ArrowDown':
        if (selectedBatchIndex < totalBatches - 1) {
          const newIndex = selectedBatchIndex + 1;
          setSelectedBatchIndex(newIndex);
          // Use requestAnimationFrame for smoother scrolling
          requestAnimationFrame(() => scrollToHighlightedMedicine(selectedMedicineIndex, newIndex));
        } else if (selectedMedicineIndex < filteredMedicines.length - 1) {
          const newMedicineIndex = selectedMedicineIndex + 1;
          setSelectedMedicineIndex(newMedicineIndex);
          setSelectedBatchIndex(0);
          requestAnimationFrame(() => scrollToHighlightedMedicine(newMedicineIndex, 0));
        }
        break;
      case 'ArrowUp':
        if (selectedBatchIndex > 0) {
          const newIndex = selectedBatchIndex - 1;
          setSelectedBatchIndex(newIndex);
          requestAnimationFrame(() => scrollToHighlightedMedicine(selectedMedicineIndex, newIndex));
        } else if (selectedMedicineIndex > 0) {
          const newMedicineIndex = selectedMedicineIndex - 1;
          const prevMedicine = filteredMedicines[newMedicineIndex];
          const prevBatches = searchTermTrimmed.length > 0 
            ? prevMedicine?.batches.filter(b => 
                (b.batch_number || '').toLowerCase().includes(searchTermTrimmed.toLowerCase()) ||
                (b.batch_barcode || '').toLowerCase().includes(searchTermTrimmed.toLowerCase()) ||
                ((b.legacy_code || '') as string).toLowerCase().includes(searchTermTrimmed.toLowerCase())
              ) || []
            : prevMedicine?.batches || [];
          const newBatchIndex = Math.max(0, prevBatches.length - 1);
          setSelectedMedicineIndex(newMedicineIndex);
          setSelectedBatchIndex(newBatchIndex);
          requestAnimationFrame(() => scrollToHighlightedMedicine(newMedicineIndex, newBatchIndex));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (currentMedicine.is_external) {
          setPendingExternalAdd({ medicine: currentMedicine, quantity: Number(quantity) || 1 });
          setExternalPriceInput('');
          setShowExternalPriceModal(true);
        } else if (matchingBatches[selectedBatchIndex]) {
          const batch = matchingBatches[selectedBatchIndex];
          setSelectedMedicine(currentMedicine);
          setSelectedBatch(batch);
          setSearchTerm(currentMedicine.name);
          setSelectedMedicineIndex(0);
          setSelectedBatchIndex(0);
          setShowMedicineDropdown(false);
          setTimeout(() => {
            const qtyInput = document.querySelector('input[placeholder="Quantity"]') as HTMLInputElement;
            if (qtyInput) qtyInput.focus();
          }, 50);
        }
        break;
      case 'Escape':
        setShowMedicineDropdown(false);
        setSelectedMedicineIndex(0);
        setSelectedBatchIndex(0);
        break;
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Add item with current quantity and reset
      if (selectedMedicine && (selectedMedicine.is_external || selectedBatch)) {
        if (selectedMedicine.is_external) {
          setPendingExternalAdd({ medicine: selectedMedicine, quantity: Number(quantity) || 1 });
          setExternalPriceInput('');
          setShowExternalPriceModal(true);
          return;
        }
        if (selectedBatch) {
          addToBill(selectedMedicine, selectedBatch, Number(quantity) || 1);
          setSelectedMedicine(null);
          setSelectedBatch(null);
          setSearchTerm('');
          setQuantity(1);
          setSelectedMedicineIndex(0);
          setShowMedicineDropdown(false);
          setTimeout(() => {
            const medicineInput = document.querySelector('input[placeholder*="medicine"]');
            if (medicineInput) {
              (medicineInput as HTMLElement).focus();
            }
          }, 100);
        }
        return;
      }

      if (searchTerm && filteredMedicines.length > 0) {
        const medicine = filteredMedicines[0];
        if (medicine.is_external) {
          setPendingExternalAdd({ medicine, quantity: Number(quantity) || 1 });
          setExternalPriceInput('');
          setShowExternalPriceModal(true);
          return;
        }
        const batch = medicine.batches[0];
        if (batch) {
          addToBill(medicine, batch, Number(quantity) || 1);
          setSearchTerm('');
          setQuantity(1);
          setSelectedMedicineIndex(0);
          setShowMedicineDropdown(false);
          // Focus back to medicine search
          setTimeout(() => {
            const medicineInput = document.querySelector('input[placeholder*="medicine"]');
            if (medicineInput) {
              (medicineInput as HTMLElement).focus();
            }
          }, 100);
        }
      }
    }
  };

  const confirmAddExternalWithPrice = () => {
    if (!pendingExternalAdd) return;

    const parsed = Number(externalPriceInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      alert('Please enter a valid price');
      return;
    }

    const existingExternalIndex = billItems.findIndex(
      (it) => !!it.medicine.is_external && it.medicine.id === pendingExternalAdd.medicine.id
    );

    if (existingExternalIndex >= 0) {
      const currentQty = Number(billItems[existingExternalIndex]?.quantity) || 0;
      const addQty = Number(pendingExternalAdd.quantity) || 0;
      updateBillItemPrice(existingExternalIndex, parsed);
      updateBillItemQuantity(existingExternalIndex, currentQty + addQty);

      setShowExternalPriceModal(false);
      setPendingExternalAdd(null);
      setExternalPriceInput('');

      setSearchTerm('');
      setQuantity(1);
      setSelectedMedicineIndex(0);
      setSelectedBatchIndex(0);
      setShowMedicineDropdown(false);
      setTimeout(() => {
        const medicineInput = document.querySelector('input[placeholder*="medicine"]');
        if (medicineInput) {
          (medicineInput as HTMLElement).focus();
        }
      }, 100);
      return;
    }

    const dummyBatch: MedicineBatch = {
      id: 'ext-' + pendingExternalAdd.medicine.id,
      batch_number: 'EXTERNAL',
      expiry_date: '2099-12-31',
      current_quantity: 999999,
      purchase_price: 0,
      selling_price: parsed,
      medicine_id: pendingExternalAdd.medicine.id,
      status: 'active'
    };

    addToBill(pendingExternalAdd.medicine, dummyBatch, pendingExternalAdd.quantity);
    setShowExternalPriceModal(false);
    setPendingExternalAdd(null);
    setExternalPriceInput('');

    setSearchTerm('');
    setQuantity(1);
    setSelectedMedicineIndex(0);
    setSelectedBatchIndex(0);
    setShowMedicineDropdown(false);
    setTimeout(() => {
      const medicineInput = document.querySelector('input[placeholder*="medicine"]');
      if (medicineInput) {
        (medicineInput as HTMLElement).focus();
      }
    }, 100);
  };

  // Medicine dropdown state
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);

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
        .select('id, name, medication_code, manufacturer, category, dosage_form, combination, available_stock, total_stock')
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
        available_stock: m.available_stock || 0,
        total_stock: m.total_stock || 0,
        batches: batchesByMedicine[m.id] || []
      }));

      setMedicines(medicinesWithBatches);
    } catch (err: any) {
      setError(err?.message || 'Unknown error occurred');
      console.error('Error loading medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
    
    // Cleanup function to clear search timeout
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
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
            encounter_id,
            status,
            patient:patients(id, patient_id, name, phone),
            prescription_items(
              id,
              medication_id,
              quantity,
              dispensed_quantity,
              status,
              dosage,
              frequency,
              duration,
              medications:medication_id(name, medication_code)
            )
          `)
          .eq('id', prescriptionIdFromUrl)
          .single();

        if (error) throw error;

        setLinkedPrescriptionId(data.id);
        setLinkedPrescriptionEncounterId(data.encounter_id);
        setLinkedPrescriptionItems((data.prescription_items || []).map((it: any) => ({
          prescription_item_id: it.id,
          medication_id: it.medication_id,
          quantity: Number(it.quantity) || 0,
          dispensed_quantity: Number(it.dispensed_quantity) || 0
        })));

        // Set prescribed medications with full details for search
        setPrescribedMedications((data.prescription_items || []).map((it: any) => ({
          prescription_item_id: it.id,
          medication_id: it.medication_id,
          medication_name: it.medications?.name || 'Unknown Medicine',
          dosage: it.dosage || '',
          quantity: Number(it.quantity) || 0,
          dispensed_quantity: Number(it.dispensed_quantity) || 0,
          frequency: it.frequency || '',
          duration: it.duration || ''
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
            unit_price: batch.selling_price,
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

  // Filter prescribed medications based on search term
  const filteredPrescribedMedications = prescribedMedications.filter(med => {
    if (!prescribedSearchTerm.trim()) return true;
    const term = prescribedSearchTerm.toLowerCase();
    return (
      med.medication_name.toLowerCase().includes(term) ||
      med.dosage.toLowerCase().includes(term)
    );
  });

  // Add medicine to bill (or just to database as external)
  const handleSaveUnlisted = async () => {
    try {
      if (!unlistedForm.name) {
        alert("Please enter Medicine Name");
        return;
      }

      setLoading(true);

      const tempCode = 'EXT-' + Date.now();

      // 1. Insert into medications with is_external = true
      const { data: medData, error: medError } = await supabase
        .from('medications')
        .insert({
          name: unlistedForm.name,
          medication_code: tempCode,
          manufacturer: 'External',
          category: 'External',
          unit: 'Nos', 
          is_external: true,
          status: 'active',
          is_active: true
        })
        .select()
        .single();

      if (medError) {
          console.error('Error inserting external medicine:', medError);
          alert('Error logging external medicine: ' + (medError.message || 'Check console for details'));
          return;
      }

      alert('External medicine added to database successfully. You can now search for it.');
      
      // Update local state to include this new medicine so it appears in search
      const newMedicine: Medicine = {
          id: medData.id,
          name: medData.name,
          medicine_code: medData.medication_code,
          manufacturer: medData.manufacturer,
          category: medData.category,
          unit: medData.unit,
          batches: [], // No batches yet
          is_external: true
      };
      
      setMedicines(prev => [...prev, newMedicine]);

      setShowUnlistedModal(false);
      // Reset form
      setUnlistedForm({
        name: '',
        manufacturer: '',
        category: 'Unlisted',
        mrp: '',
        selling_price: '',
        batch_number: '',
        expiry_date: '',
        stock: ''
      });
      
    } catch (e: any) {
      console.error('Error adding unlisted medicine:', e);
      alert('Error adding unlisted medicine: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const addToBill = (medicine: Medicine, batch: MedicineBatch, quantity: number = 1) => {
    try {
      // Validate quantity
      if (quantity <= 0) {
        setError('Quantity must be greater than 0');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Skip stock check for external medicines
      if (!medicine.is_external && quantity > batch.current_quantity) {
        setError(`Insufficient stock available. Only ${batch.current_quantity} units in stock.`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Check if batch is expired (skip for external)
      if (!medicine.is_external) {
        const today = new Date();
        const expiryDate = new Date(batch.expiry_date);
        if (expiryDate <= today) {
          setError('This batch has expired and cannot be sold.');
          setTimeout(() => setError(null), 3000);
          return;
        }
      }

      const existingItemIndex = billItems.findIndex(
        item => item.medicine.id === medicine.id && item.batch.id === batch.id
      );

      if (existingItemIndex >= 0) {
        const newQuantity = billItems[existingItemIndex].quantity + quantity;
        if (!medicine.is_external && newQuantity > batch.current_quantity) {
          setError(`Insufficient stock available. Only ${batch.current_quantity} units in stock.`);
          setTimeout(() => setError(null), 3000);
          return;
        }
        updateBillItemQuantity(existingItemIndex, newQuantity);
      } else {
        const newItem: BillItem = {
          medicine,
          batch,
          quantity,
          unit_price: batch.selling_price,
          total: quantity * batch.selling_price
        };
        setBillItems([...billItems, newItem]);
      }
    } catch (error) {
      console.error('Error adding item to bill:', error);
      setError('Failed to add item to bill. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Update bill item quantity
  const updateBillItemQuantity = (index: number, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        removeBillItem(index);
        return;
      }

      const item = billItems[index];
      if (!item) return;

      // Validate new quantity (skip for external)
      if (!item.medicine.is_external && newQuantity > item.batch.current_quantity) {
        setError(`Insufficient stock available. Only ${item.batch.current_quantity} units in stock.`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Check if batch is expired (skip for external)
      if (!item.medicine.is_external) {
        const today = new Date();
        const expiryDate = new Date(item.batch.expiry_date);
        if (expiryDate <= today) {
          setError('This batch has expired and cannot be sold.');
          setTimeout(() => setError(null), 3000);
          return;
        }
      }

      const updatedItems = [...billItems];
      updatedItems[index] = {
        ...item,
        quantity: newQuantity,
        total: newQuantity * item.unit_price
      };
      setBillItems(updatedItems);
    } catch (error) {
      console.error('Error updating bill item quantity:', error);
      setError('Failed to update quantity. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Update bill item price
  const updateBillItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    
    const updatedItems = [...billItems];
    const item = updatedItems[index];
    updatedItems[index] = {
        ...item,
        unit_price: newPrice,
        total: item.quantity * newPrice
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

  // Transfer medicines to intent
  const handleTransferToIntent = async () => {
    if (!intentType || billItems.length === 0) {
      alert('Please select intent type and add medicines');
      return;
    }

    setLoading(true);
    try {
      // Transfer each item to intent_medicines table
      for (const item of billItems) {
        const { error: insertError } = await supabase
          .from('intent_medicines')
          .insert({
            intent_type: intentType,
            medication_id: item.medicine.id,
            medication_name: item.medicine.name,
            batch_number: item.batch.batch_number,
            quantity: item.quantity,
            mrp: item.unit_price,
            combination: item.medicine.combination || '',
            dosage_type: item.medicine.unit || '',
            manufacturer: item.medicine.manufacturer || '',
            medicine_status: 'active',
            medicine_code: '',
            expiry_date: item.batch.expiry_date || null
          });

        if (insertError) throw insertError;

        // Update medication stock
        const { error: updateError } = await supabase
          .from('medications')
          .update({
            available_stock: (item.medicine.available_stock ?? 0) - item.quantity,
            total_stock: (item.medicine.total_stock ?? 0) - item.quantity
          })
          .eq('id', item.medicine.id);

        if (updateError) throw updateError;

        // Update batch stock (skip for external medicines)
        if (!item.medicine.is_external) {
          const { error: batchUpdateError } = await supabase
            .from('medicine_batches')
            .update({
              current_quantity: (item.batch.current_quantity ?? 0) - item.quantity
            })
            .eq('id', item.batch.id);

          if (batchUpdateError) throw batchUpdateError;
        }
      }

      // Clear the bill items
      setBillItems([]);
      
      // Refresh medicines to show updated stock
      await loadMedicines();
      
      alert(`Successfully transferred ${billItems.length} medicines to ${intentType.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`);
    } catch (error) {
      console.error('Error transferring medicines:', error);
      alert('Error transferring medicines. Please try again.');
    } finally {
      setLoading(false);
    }
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
    } else if (customer.type === 'intent') {
      if (!customer.name?.trim()) {
        alert('Please enter customer name');
        return;
      }
      if (!intentType) {
        alert('Please select an intent type');
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
      if (item.medicine.is_external) return false;
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

      // Validate staff_id to prevent FK violations (billing.staff_id -> staff.id)
      let validatedStaffId: string | null = null;
      if (staffId) {
        const { data: staffCheck, error: staffCheckError } = await supabase
          .from('staff')
          .select('id')
          .eq('id', staffId)
          .maybeSingle();

        if (staffCheckError) {
          console.error('Error validating staffId before billing insert:', {
            message: (staffCheckError as any)?.message,
            details: (staffCheckError as any)?.details,
            hint: (staffCheckError as any)?.hint,
            code: (staffCheckError as any)?.code,
            raw: staffCheckError
          });
        }

        if (staffCheck?.id) {
          validatedStaffId = staffCheck.id;
        } else {
          console.warn('Invalid staffId detected; inserting billing with staff_id = NULL to avoid FK violation', {
            staffId,
            currentUserId: currentUser?.id
          });
        }
      }

      // Create pharmacy bill (handle prod schema differences: total_amount vs total)
      let billData: any = null;
      {
        const base = {
          bill_number: billNumber, // Use our generated bill number
          patient_id: customer.type === 'patient' ? customer.patient_id : null, // Set to null for walk-in customers
          encounter_id: linkedPrescriptionEncounterId,
          currency: 'INR',
          subtotal: billTotals.subtotal,
          discount_type: billTotals.discountType,
          discount_value: billTotals.discountValue,
          tax_percent: billTotals.taxPercent,
          payment_method: normalizeMethod(payments[0].method),
          customer_name: customer.name.trim(),
          customer_phone: customer.type === 'patient' ? (customer.phone ?? null) : (customer.phone ?? '').trim(),
          customer_type: customer.type,
          staff_id: validatedStaffId
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
      const billItemsData = billItems.map(item => {
        const linked = linkedPrescriptionItems.find(lp => lp.medication_id === item.medicine.id);
        return {
          billing_id: billData!.id,
          line_type_id: '3a0ca26e-7dc1-4ede-9872-d798cf39d248', // Medicine line type from ref_code table
          medicine_id: item.medicine.id,
          batch_id: item.medicine.is_external ? null : item.batch.id,
          ref_id: linked?.prescription_item_id ?? null,
          description: item.medicine.name,
          qty: item.quantity,
          unit_amount: item.unit_price,
          total_amount: item.total,
          batch_number: item.medicine.is_external ? 'EXTERNAL' : item.batch.batch_number,
          expiry_date: item.medicine.is_external ? null : item.batch.expiry_date
        };
      });

      const { error: itemsError } = await supabase
        .from('billing_item')
        .insert(billItemsData);

      if (itemsError) throw itemsError;

      // Populate GST ledger for each bill item
      try {
        for (const item of billItems) {
          // Skip external medicines as they don't have GST
          if (item.medicine.is_external) continue;

          // Calculate GST components
          const taxableAmount = item.total / (1 + (billTotals.taxPercent / 100));
          const gstAmount = item.total - taxableAmount;
          const cgstAmount = gstAmount / 2;
          const sgstAmount = gstAmount / 2;

          // Add to GST ledger
          const { error: gstError } = await supabase
            .from('pharmacy_gst_ledger')
            .insert({
              transaction_date: new Date().toISOString().split('T')[0],
              transaction_type: 'sale',
              reference_type: 'billing',
              reference_id: billData!.id,
              reference_number: billNumber,
              party_name: customer.name,
              party_gstin: null, // Customer GSTIN not collected in current system
              taxable_amount: Math.round(taxableAmount * 100) / 100,
              cgst_rate: billTotals.taxPercent / 2,
              cgst_amount: Math.round(cgstAmount * 100) / 100,
              sgst_rate: billTotals.taxPercent / 2,
              sgst_amount: Math.round(sgstAmount * 100) / 100,
              igst_rate: 0,
              igst_amount: 0,
              total_gst: Math.round(gstAmount * 100) / 100,
              total_amount: item.total
            });

          if (gstError) {
            console.error('Error inserting GST ledger entry:', {
              message: gstError.message,
              details: gstError.details,
              hint: gstError.hint,
              code: gstError.code,
              item: item.medicine.name,
              billNumber: billNumber
            });
            // Don't throw here - GST failure shouldn't block billing
          }
        }
      } catch (gstLedgerError) {
        console.error('Error populating GST ledger:', gstLedgerError);
        // Continue with billing even if GST ledger fails
      }

      // If bill originated from a prescription, update dispensed quantities/status.
      if (linkedPrescriptionId && linkedPrescriptionItems.length > 0) {
        const nowIso = new Date().toISOString();
        const updatedItems: Array<{ id: string; quantity: number; dispensed_quantity: number }> = [];
        for (const it of linkedPrescriptionItems) {
          const billedQty = billItems
            .filter(bi => bi.medicine.id === it.medication_id)
            .reduce((sum, bi) => sum + (Number(bi.quantity) || 0), 0);
          if (billedQty <= 0) continue;

          const newDispensed = Math.max((Number(it.dispensed_quantity) || 0) + billedQty, 0);
          const fullyDispensed = newDispensed >= (Number(it.quantity) || 0);
          // IMPORTANT: DB/UI only support 'pending' | 'dispensed' | 'cancelled' for prescription_items.status.
          // So keep it 'pending' until fully dispensed.
          const nextStatus = fullyDispensed ? 'dispensed' : 'pending';

          const { error: updErr } = await supabase
            .from('prescription_items')
            .update({
              dispensed_quantity: newDispensed,
              status: nextStatus,
              dispensed_by: currentUser?.id ?? null,
              dispensed_date: nowIso
            })
            .eq('id', it.prescription_item_id);

          if (updErr) {
            console.warn('Failed updating prescription_items after billing:', {
              prescription_item_id: it.prescription_item_id,
              message: (updErr as any)?.message,
              details: (updErr as any)?.details,
              hint: (updErr as any)?.hint,
              code: (updErr as any)?.code
            });
          } else {
            updatedItems.push({
              id: it.prescription_item_id,
              quantity: Number(it.quantity) || 0,
              dispensed_quantity: newDispensed
            });
          }
        }

        // Update prescriptions header status if all items are fully dispensed.
        // The prescriptions list page categorizes based on prescriptions.status = 'active' | 'dispensed' | 'expired'.
        try {
          const allDone = updatedItems.length > 0 && updatedItems.every(x => (Number(x.dispensed_quantity) || 0) >= (Number(x.quantity) || 0));
          if (allDone) {
            const { error: presUpdErr } = await supabase
              .from('prescriptions')
              .update({ status: 'dispensed' })
              .eq('id', linkedPrescriptionId);

            if (presUpdErr) {
              console.warn('Failed updating prescriptions.status after billing:', {
                prescription_id: linkedPrescriptionId,
                message: (presUpdErr as any)?.message,
                details: (presUpdErr as any)?.details,
                hint: (presUpdErr as any)?.hint,
                code: (presUpdErr as any)?.code
              });
            }
          }
        } catch (e) {
          console.warn('Error computing/updating prescriptions.status after billing:', e);
        }
      }

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

      // Roundoff payment-status correction:
      // If payable total is e.g. 144.36 and collected is 144.00, treat as paid.
      try {
        const { data: latestBillRow, error: latestBillErr } = await supabase
          .from('billing')
          .select('id, total_amount, total, amount_paid, payment_method, payment_status')
          .eq('id', billData!.id)
          .single();

        if (latestBillErr) {
          console.warn('Failed to re-check billing totals for roundoff status:', latestBillErr);
        } else if (latestBillRow) {
          const total = Number((latestBillRow as any).total_amount ?? (latestBillRow as any).total ?? 0) || 0;
          const paid = Number((latestBillRow as any).amount_paid ?? 0) || 0;
          const method = String((latestBillRow as any).payment_method ?? '').toLowerCase();
          const currentStatus = String((latestBillRow as any).payment_status ?? '').toLowerCase();

          const roundedPayable = Math.round(total);
          const matchesRoundedPayable = Math.abs(roundedPayable - paid) <= 0.01;
          const tinyDiff = Math.abs(total - paid) <= 0.05;
          const shouldMarkPaid = method !== 'credit' && currentStatus !== 'paid' && paid > 0 && (matchesRoundedPayable || tinyDiff);

          if (shouldMarkPaid) {
            const { error: updErr } = await supabase
              .from('billing')
              .update({ payment_status: 'paid' })
              .eq('id', billData!.id);

            if (updErr) {
              console.warn('Failed to update payment_status to paid after roundoff check:', updErr);
            }
          }
        }
      } catch (roundoffErr) {
        console.warn('Roundoff payment-status correction error:', roundoffErr);
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

      // Reset form
      setBillItems([]);
      setCustomer({ type: 'walk_in', name: '', phone: '' });
      setIntentType('');
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
    const patientUhid = customer.type === 'patient' ? customer.patient_id : customer.type === 'intent' ? `INTENT-${intentType}` : 'WALK-IN';
    
    // Get sales type
    let salesType = payments.length > 1 ? 'SPLIT' : payments[0].method?.toUpperCase() || 'CASH';
    if (salesType === 'CREDIT') {
      salesType = 'CREDIT';
    }

    // Generate items HTML
    const itemsHtml = generatedBill.items.map((item: any, index: number) => `
      <tr>
        <td class="items-8cm">${index + 1}.</td>
        <td class="items-8cm">${item.medicine?.name || item.name}</td>
        <td class="items-8cm text-center">${item.quantity}</td>
        <td class="items-8cm text-right">${Number(item.total || item.total_amount || item.amount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const subtotal = Number(generatedBill.totals?.subtotal || generatedBill.items?.reduce((s: number, i: any) => s + Number(i.total || i.total_amount || i.amount || 0), 0) || 0);
    const discount = Number(generatedBill.totals?.discountAmount || generatedBill.totals?.discount || 0);
    const tax = Number(generatedBill.totals?.taxAmount || generatedBill.totals?.tax || 0);
    const totalAmount = Number(generatedBill.totals?.totalAmount || generatedBill.totals?.total || generatedBill.total || 0);

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
              <span>${(subtotal - discount).toFixed(2)}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
              <span>${discount.toFixed(2)}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
              <span>${(tax / 2).toFixed(2)}</span>
            </div>
            <div class="totals-line header-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
              <span>${(tax / 2).toFixed(2)}</span>
            </div>
            <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
              <span>Total Amount</span>
              <span>${totalAmount.toFixed(2)}</span>
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

  const showThermalPreviewWithLogo = () => {
    if (!generatedBill) return;

    const now = new Date();
    const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const patientUhid = customer.type === 'patient' ? customer.patient_id : customer.type === 'intent' ? `INTENT-${intentType}` : 'WALK-IN';

    let salesType = payments.length > 1 ? 'SPLIT' : payments[0].method?.toUpperCase() || 'CASH';
    if (salesType === 'CREDIT') {
      salesType = 'CREDIT';
    }

    const itemsHtml = generatedBill.items.map((item: any, index: number) => `
      <tr>
        <td class="items-8cm">${index + 1}.</td>
        <td class="items-8cm">${item.medicine?.name || item.name}</td>
        <td class="items-8cm text-center">${item.quantity}</td>
        <td class="items-8cm text-right">${Number(item.total || item.total_amount || item.amount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const subtotal = Number(generatedBill.totals?.subtotal || 0);
    const discount = Number(generatedBill.totals?.discountAmount || 0);
    const tax = Number(generatedBill.totals?.taxAmount || 0);
    const totalAmount = Number(generatedBill.totals?.totalAmount || 0);

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${generatedBill.bill_number}</title>
          <style>
            @page { margin: 3mm 8mm 3mm 3mm; size: 85mm 297mm; }
            body { 
              font-family: 'Verdana', sans-serif; 
              font-weight: bold;
              margin: 0; 
              padding: 2px;
              font-size: 14px;
              line-height: 1.2;
              width: 85mm;
            }
            .header-14cm { font-size: 16pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-9cm { font-size: 11pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-10cm { font-size: 12pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .items-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .bill-info-10cm { font-size: 12pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .bill-info-bold { font-weight: bold; font-family: 'Verdana', sans-serif; }
            .footer-7cm { font-size: 9pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .center { text-align: center; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .right { text-align: right; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table { width: 100%; border-collapse: collapse; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table td { padding: 1px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .totals-line { display: flex; justify-content: space-between; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .footer { margin-top: 15px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .signature-area { margin-top: 25px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .logo { width: 300px; height: auto; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="/logo/annamPharmacy.png" alt="ANNAM LOGO" class="logo" />
            <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
            <div class="header-9cm">Phone- 04639 252592</div>
            <div class="footer-7cm">Gst No: 33AJWPR2713G2ZZ</div>
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
              <span>${(subtotal - discount).toFixed(2)}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
              <span>${discount.toFixed(2)}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
              <span>${(tax / 2).toFixed(2)}</span>
            </div>
            <div class="totals-line header-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
              <span>${(tax / 2).toFixed(2)}</span>
            </div>
            <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
              <span>Total Amount</span>
              <span>${totalAmount.toFixed(2)}</span>
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

    const printWindow = window.open('', '_blank', 'width=450,height=650');
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
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-semibold text-slate-900">New Pharmacy Bill</h1>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                  Entry Type:
                  <span className="ml-1 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {customer.type === 'patient' ? 'Registered' : customer.type === 'intent' ? 'Intent' : 'Walk-in'}
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
                  <span className="h-6 w-px bg-slate-200 ml-2" />
                  <span className="text-slate-500">Total:</span>
                  <span className="text-lg font-semibold text-emerald-600">₹{Math.round(billTotals.totalAmount)}</span>
                </div>
              </div>
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

        <div className="flex flex-col gap-4 mt-2">
          {/* View Toggle Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-slate-900">Pharmacy Billing</h1>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                  {customer.type === 'patient' ? 'Patient' : customer.type === 'intent' ? 'Intent' : 'Walk-in'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Items:</span>
                  <span className="font-semibold text-slate-900">{billItems.length}</span>
                  <span className="h-6 w-px bg-slate-200 ml-2" />
                  <span className="text-slate-500">Total:</span>
                  <span className="text-lg font-semibold text-emerald-600">₹{Math.round(billTotals.totalAmount)}</span>
                </div>
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('compact')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'compact'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('detailed')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'detailed'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Detailed
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Left side: Sales Entry + Medicine */}
          <div className="flex flex-col gap-4">
            {/* Customer Information Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">Customer Information</h2>
                </div>
                <div className="text-xs text-slate-500">
                  Billed by: {currentStaff ? 
                    `${currentStaff.first_name} ${currentStaff.last_name}`.trim() || currentStaff.employee_id || 'Staff Member' :
                    currentUser?.name || 'Loading...'
                  }
                  {!currentStaff && currentUser && (
                    <span className="ml-2 text-amber-600 font-medium">
                      (No staff record)
                    </span>
                  )}
                </div>
              </div>

              {/* Customer / Patient Block */}
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                    <select
                      value={customer.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const newType = e.target.value as 'patient' | 'walk_in' | 'intent';
                        setCustomer({ ...customer, type: newType });
                        if (newType !== 'intent') {
                          setIntentType('');
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="patient">Patient</option>
                      <option value="walk_in">Walk-in</option>
                      <option value="intent">Intent</option>
                    </select>
                  </div>

                  {/* Show Customer Name for patient and walk_in only */}
                  {customer.type !== 'intent' && (
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name *</label>
                      <input
                        type="text"
                        value={customer.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCustomer({ ...customer, name: e.target.value })
                        }
                        placeholder="Enter customer name"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Conditional second field based on type */}
                  {customer.type === 'patient' ? (
                    <>
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Search Patient</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={patientSearch}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setPatientSearch(e.target.value);
                              setShowPatientDropdown(true);
                              setSelectedPatientIndex(0);
                            }}
                            onKeyDown={handlePatientKeyDown}
                            onFocus={() => setShowPatientDropdown(true)}
                            placeholder="Search by name, UHID, or mobile..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {showPatientDropdown && patientResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                              {patientResults.map((p, index) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setCustomer({ type: 'patient', name: p.name, phone: p.phone || '', patient_id: p.id });
                                    setPatientSearch(`${p.name} · ${p.patient_id}`);
                                    setShowPatientDropdown(false);
                                    setSelectedPatientIndex(0);
                                    // Focus to medication search
                                    setTimeout(() => {
                                      const medicineInput = document.querySelector('input[placeholder*="medicine"]') as HTMLInputElement;
                                      if (medicineInput) {
                                        medicineInput.focus();
                                      }
                                    }, 100);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs ${
                                    index === selectedPatientIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="font-medium text-slate-900">{p.name}</div>
                                  <div className="text-slate-500">UHID: {p.patient_id}</div>
                                  {p.phone && <div className="text-slate-400">📱 {p.phone}</div>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                        <input
                          type="text"
                          value={customer.phone || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCustomer({ ...customer, phone: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-700"
                          readOnly
                        />
                      </div>
                    </>
                  ) : customer.type === 'intent' ? (
                    <div className="col-span-7">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Intent Type *</label>
                      <select
                        value={intentType}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          setIntentType(e.target.value);
                          setCustomer({ ...customer, intent_type: e.target.value });
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select intent type...</option>
                        <option value="injection room">Injection Room</option>
                        <option value="icu">ICU</option>
                        <option value="causath">Causath</option>
                        <option value="nicu">NICU</option>
                        <option value="labour word">Labour Word</option>
                        <option value="miones">Miones</option>
                        <option value="major ot">Major OT</option>
                      </select>
                    </div>
                  ) : (
                    <div className="col-span-7">
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
                        placeholder="Enter phone number"
                        className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${phoneError ? 'border-red-300' : 'border-slate-200'}`}
                      />
                      {phoneError && (
                        <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div> {/* Added closing div tag here */}
            {/* Prescribed Medications Search - Only show when prescription is linked */}
            {prescribedMedications.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-green-600" />
                    <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">Prescribed Medications</h2>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Search Prescribed Medications</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search prescribed medications..."
                      value={prescribedSearchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrescribedSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredPrescribedMedications.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-500">
                      {prescribedSearchTerm ? 'No matching prescribed medications found' : 'No prescribed medications available'}
                    </div>
                  ) : (
                    filteredPrescribedMedications.map((med, index) => {
                      const remainingQty = med.quantity - med.dispensed_quantity;
                      const isAlreadyInBill = billItems.some(item => 
                        item.medicine.id === med.medication_id
                      );

                      return (
                        <div
                          key={med.prescription_item_id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            isAlreadyInBill 
                              ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                              : 'bg-slate-50 border-slate-200 hover:bg-blue-50'
                          }`}
                          onClick={() => {
                            if (isAlreadyInBill) return; // Already in bill

                            // Find the medicine and best batch
                            const medicine = medicines.find(m => m.id === med.medication_id);
                            if (!medicine) return;

                            const bestBatch = medicine.batches
                              .filter(b => (Number(b.current_quantity) || 0) > 0)
                              .filter(b => {
                                const exp = new Date(b.expiry_date);
                                return !Number.isNaN(exp.getTime()) && exp >= new Date();
                              })
                              .sort((a, b) => {
                                const ea = new Date(a.expiry_date).getTime();
                                const eb = new Date(b.expiry_date).getTime();
                                return eb - ea;
                              })[0];

                            if (!bestBatch) return;

                            const qty = Math.min(remainingQty, bestBatch.current_quantity);
                            if (qty <= 0) return;

                            addToBill(medicine, bestBatch, qty);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 text-sm">{med.medication_name}</h4>
                              <p className="text-xs text-slate-600 mt-1">
                                {med.dosage && `Dosage: ${med.dosage}`}
                                {med.frequency && ` • Frequency: ${med.frequency}`}
                                {med.duration && ` • Duration: ${med.duration}`}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span>Prescribed: {med.quantity}</span>
                                <span>Dispensed: {med.dispensed_quantity}</span>
                                <span>Remaining: {remainingQty}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {isAlreadyInBill ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  Added to Bill
                                </span>
                              ) : remainingQty > 0 ? (
                                <button
                                  className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Find the medicine and best batch
                                    const medicine = medicines.find(m => m.id === med.medication_id);
                                    if (!medicine) return;

                                    const bestBatch = medicine.batches
                                      .filter(b => (Number(b.current_quantity) || 0) > 0)
                                      .filter(b => {
                                        const exp = new Date(b.expiry_date);
                                        return !Number.isNaN(exp.getTime()) && exp >= new Date();
                                      })
                                      .sort((a, b) => {
                                        const ea = new Date(a.expiry_date).getTime();
                                        const eb = new Date(b.expiry_date).getTime();
                                        return eb - ea;
                                      })[0];

                                    if (!bestBatch) return;

                                    const qty = Math.min(remainingQty, bestBatch.current_quantity);
                                    if (qty <= 0) return;

                                    addToBill(medicine, bestBatch, qty);
                                  }}
                                >
                                  Add ({remainingQty})
                                </button>
                              ) : (
                                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded">
                                  Fully Dispensed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            {/* Single Row Billing Entry */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">Add Medicine</h2>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Medicine Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search medicine, batch, or legacy code..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMedicineSearch(e.target.value)}
                      onKeyDown={(e) => {
                        handleMedicineKeyDown(e);
                      }}
                      onFocus={() => setShowMedicineDropdown(true)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {showMedicineDropdown && searchTerm && (
                      <div 
                        ref={medicineDropdownRef}
                        className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-auto"
                      >
                        {searchLoading ? (
                          <div className="px-3 py-4 text-xs text-slate-500 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            Searching...
                          </div>
                        ) : (
                          <>
                            <div className="px-3 py-1 text-xs text-slate-400 border-b">
                              {filteredMedicines.length} medicines found
                            </div>
                            {filteredMedicines.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-500 flex justify-between items-center">
                                <span>No medicines found</span>
                                <button
                                  onClick={() => setShowUnlistedModal(true)}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  + Add Unlisted Medicine
                                </button>
                              </div>
                            ) : (
                          filteredMedicines.map((medicine, index) => {
                            const matchingBatches = searchTermTrimmed.length > 0 
                              ? medicine.batches.filter(b => 
                                  (b.batch_number || '').toLowerCase().includes(searchTermTrimmed.toLowerCase()) ||
                                  (b.batch_barcode || '').toLowerCase().includes(searchTermTrimmed.toLowerCase()) ||
                                  ((b.legacy_code || '') as string).toLowerCase().includes(searchTermTrimmed.toLowerCase())
                                )
                              : medicine.batches;
                            return (
                              <div
                                key={medicine.id}
                                data-medicine-index={index}
                                className={`px-3 py-2 text-xs ${
                                  index === selectedMedicineIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="font-medium text-slate-900">{medicine.name}</div>
                                <div className="text-slate-500">
                                  {medicine.medicine_code} • {medicine.manufacturer}
                                </div>
                                
                                {/* Always show batch section */}
                                <div className="mt-2">
                                  {medicine.batches.length === 0 ? (
                                    medicine.is_external ? (
                                      <div 
                                          className={`pl-2 py-2 rounded cursor-pointer border ${
                                              index === selectedMedicineIndex ? 'bg-blue-100 border-blue-400 ring-1 ring-blue-400' : 'bg-slate-50 border-slate-200 hover:bg-blue-50'
                                          }`}
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              setPendingExternalAdd({ medicine: medicine, quantity: Number(quantity) || 1 });
                                              setExternalPriceInput('');
                                              setShowExternalPriceModal(true);
                                          }}
                                      >
                                          <div className="font-medium text-slate-700 text-xs">Add to Bill</div>
                                          <div className="text-xs text-slate-500">Price editable in bill</div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                        No active batches available
                                      </div>
                                    )
                                  ) : (
                                    <div>
                                      <div className="text-xs text-slate-600 mb-1">
                                        Available Batches ({matchingBatches.length > 0 ? matchingBatches.length : medicine.batches.length}):
                                      </div>
                                      <div className="space-y-1">
                                        {(matchingBatches.length > 0 ? matchingBatches : medicine.batches).slice(0, 5).map((batch, batchIndex) => {
                                          const isSelectedBatch = index === selectedMedicineIndex && batchIndex === selectedBatchIndex;
                                          return (
                                          <div
                                            key={batch.id}
                                            data-batch-index={batchIndex}
                                            className={`pl-2 py-2 rounded cursor-pointer border ${
                                              isSelectedBatch
                                                ? 'bg-blue-100 border-blue-400 ring-1 ring-blue-400'
                                                : matchingBatches.length > 0 && searchTermTrimmed.length > 0
                                                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                                  : 'bg-slate-50 border-slate-200 hover:bg-blue-50'
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedMedicine(medicine);
                                              setSelectedBatch(batch);
                                              setSearchTerm(medicine.name);
                                              setSelectedMedicineIndex(0);
                                              setSelectedBatchIndex(0);
                                              setShowMedicineDropdown(false);
                                              setTimeout(() => {
                                                const qtyInput = document.querySelector('input[placeholder="Quantity"]') as HTMLInputElement;
                                                if (qtyInput) qtyInput.focus();
                                              }, 50);
                                            }}
                                          >
                                            <div className="flex justify-between items-center">
                                              <span className="font-medium text-slate-700 text-xs">
                                                Batch: {batch.batch_number}
                                              </span>
                                              <span className="text-slate-600 text-xs">
                                                Stock: {batch.current_quantity}
                                              </span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                              {batch.batch_barcode && `Barcode: ${batch.batch_barcode}`}
                                              {batch.legacy_code && ` • Legacy: ${batch.legacy_code}`}
                                              {batch.expiry_date && ` • Exp: ${new Date(batch.expiry_date).toLocaleDateString()}`}
                                            </div>
                                            <div className="text-xs text-emerald-600 mt-1">
                                              Price: ₹{batch.selling_price}
                                            </div>
                                          </div>
                                          );
                                        })}
                                        {medicine.batches.length > 5 && (
                                          <div className="text-xs text-slate-400 pl-2 italic">
                                            ... and {medicine.batches.length - 5} more batches
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Quantity"
                    value={quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    onKeyDown={handleQuantityKeyDown}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">&nbsp;</label>
                  <button
                    type="button"
                    onClick={() => {
                      const addQty = Number(quantity) || 1;

                      if (selectedMedicine && (selectedMedicine.is_external || selectedBatch)) {
                        if (selectedMedicine.is_external) {
                          setPendingExternalAdd({ medicine: selectedMedicine, quantity: addQty });
                          setExternalPriceInput('');
                          setShowExternalPriceModal(true);
                          return;
                        }
                        if (selectedBatch) {
                          addToBill(selectedMedicine, selectedBatch, addQty);
                          setSelectedMedicine(null);
                          setSelectedBatch(null);
                          setSearchTerm('');
                          setQuantity(1);
                          setSelectedMedicineIndex(0);
                          setShowMedicineDropdown(false);
                          setTimeout(() => {
                            const medicineInput = document.querySelector('input[placeholder*="medicine"]');
                            if (medicineInput) {
                              (medicineInput as HTMLElement).focus();
                            }
                          }, 100);
                        }
                        return;
                      }

                      if (searchTerm && filteredMedicines.length > 0) {
                        const medicine = filteredMedicines[0];
                        if (medicine.is_external) {
                          setPendingExternalAdd({ medicine, quantity: addQty });
                          setExternalPriceInput('');
                          setShowExternalPriceModal(true);
                          return;
                        }
                        // Find the best matching batch based on search term
                        let targetBatch = medicine.batches[0];
                        if (searchTermTrimmed.length > 0) {
                          const matchingBatches = medicine.batches.filter(b => 
                            (b.batch_number || '').toLowerCase().includes(searchTermTrimmed.toLowerCase()) ||
                            (b.batch_barcode || '').toLowerCase().includes(searchTermTrimmed.toLowerCase()) ||
                            ((b.legacy_code || '') as string).toLowerCase().includes(searchTermTrimmed.toLowerCase())
                          );
                          if (matchingBatches.length > 0) {
                            targetBatch = matchingBatches[0];
                          }
                        }
                        if (targetBatch) {
                          addToBill(medicine, targetBatch, addQty);
                          setSearchTerm('');
                          setQuantity(1);
                          setSelectedMedicineIndex(0);
                          setShowMedicineDropdown(false);
                          setTimeout(() => {
                            const medicineInput = document.querySelector('input[placeholder*="medicine"]');
                            if (medicineInput) {
                              (medicineInput as HTMLElement).focus();
                            }
                          }, 100);
                        }
                      }
                    }}
                    disabled={(!selectedMedicine && (!searchTerm || filteredMedicines.length === 0)) || !!(selectedMedicine && !selectedMedicine.is_external && !selectedBatch)}
                    className="w-full rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>

          {/* Right side: Bill Items + Billing Summary - Hide for intent */}
          {customer.type !== 'intent' && (
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
                  <div className="grid grid-cols-[40px,1.7fr,0.7fr,0.9fr,0.9fr,60px] bg-slate-50 text-[11px] font-medium text-slate-600 px-3 py-2">
                    <span>Sl.</span>
                    <span>Drug / Batch</span>
                    <span className="text-right">Rate</span>
                    <span className="text-center">Qty (Units)</span>
                    <span className="text-right">Total</span>
                    <span className="text-center">Action</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                    {billItems.map((item, index) => (
                      <div
                        key={`${item.medicine.id}-${item.batch.id}`}
                        className="grid grid-cols-[40px,1.7fr,0.7fr,0.9fr,0.9fr,60px] items-center px-3 py-2 text-slate-700"
                      >
                        <span>{index + 1}</span>
                        <div className="flex flex-col">
                          <span className="font-medium truncate">{item.medicine.name}</span>
                          <span className="text-[10px] text-slate-500 truncate">Batch: {item.medicine.is_external ? 'EXT' : item.batch.batch_number.slice(-4)}</span>
                        </div>
                        {item.medicine.is_external ? (
                          <div className="flex justify-end">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateBillItemPrice(index, parseFloat(e.target.value) || 0)}
                              className="w-20 rounded border border-slate-200 bg-white text-right text-[11px] py-1 px-1 focus:ring-2 focus:ring-blue-500 outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <span className="text-right font-medium">₹{item.unit_price.toFixed(2)}</span>
                        )}
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
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-700 mb-2">Discount & Tax</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
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
                      <div>
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
                        <span className="text-lg font-semibold text-emerald-600">₹{Math.round(billTotals.taxAmount)}</span>
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
          )}

            {/* Transfer Section for Intent Type */}
            {customer.type === 'intent' && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">Transfer Items</h2>
                    </div>
                    <span className="text-xs text-slate-500">
                      Intent: {intentType || 'Not selected'}
                    </span>
                  </div>

                  {billItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-500">
                      <Package className="h-10 w-10 text-slate-200 mb-2" />
                      No items added yet for transfer
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-[40px,1.7fr,0.7fr,0.9fr,0.9fr,60px] bg-slate-50 text-[11px] font-medium text-slate-600 px-3 py-2">
                        <span>Sl.</span>
                        <span>Drug / Batch</span>
                        <span className="text-right">Rate</span>
                        <span className="text-center">Qty (Units)</span>
                        <span className="text-right">Total</span>
                        <span className="text-center">Action</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                        {billItems.map((item, index) => (
                          <div
                            key={`${item.medicine.id}-${item.batch.id}`}
                            className="grid grid-cols-[40px,1.7fr,0.7fr,0.9fr,0.9fr,60px] items-center px-3 py-2 text-slate-700"
                          >
                            <span>{index + 1}</span>
                            <div className="flex flex-col">
                              <span className="font-medium truncate">{item.medicine.name}</span>
                              <span className="text-[10px] text-slate-500 truncate">Batch: {item.medicine.is_external ? 'EXT' : item.batch.batch_number.slice(-4)}</span>
                            </div>
                            <span className="text-right">₹{item.unit_price.toFixed(2)}</span>
                            <span className="text-center">{item.quantity}</span>
                            <span className="text-right font-medium">₹{(item.quantity * item.unit_price).toFixed(2)}</span>
                            <button
                              onClick={() => removeBillItem(index)}
                              className="text-red-500 hover:text-red-700 mx-auto"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transfer Summary */}
                  {billItems.length > 0 && (
                    <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-xs flex flex-col gap-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Items</span>
                        <span className="font-medium text-slate-900">{billItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Quantity</span>
                        <span className="font-medium text-slate-900">
                          {billItems.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Value</span>
                        <span className="font-medium text-purple-700">
                          ₹{Math.round(billTotals.subtotal)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Transfer Button */}
                  {billItems.length > 0 && intentType && (
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTransferToIntent}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        <ArrowRight className="h-4 w-4" />
                        {loading ? 'Transferring...' : `Transfer to ${intentType.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                  onClick={() => showThermalPreviewWithLogo()}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Thermal 2
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

      {showExternalPriceModal && pendingExternalAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowExternalPriceModal(false);
              setPendingExternalAdd(null);
              setExternalPriceInput('');
            }}
          ></div>
          <div className="relative bg-white w-full max-w-md mx-auto rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">External Item Price</h3>
              <button
                onClick={() => {
                  setShowExternalPriceModal(false);
                  setPendingExternalAdd(null);
                  setExternalPriceInput('');
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-slate-700 font-medium truncate">{pendingExternalAdd.medicine.name}</div>
              <div className="text-xs text-slate-500">Quantity: {pendingExternalAdd.quantity}</div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price (₹)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={externalPriceInput}
                onChange={(e) => setExternalPriceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmAddExternalWithPrice();
                  }
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowExternalPriceModal(false);
                  setPendingExternalAdd(null);
                  setExternalPriceInput('');
                }}
                className="rounded-lg border border-slate-200 bg-white text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAddExternalWithPrice}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlisted Medicine Modal */}
      {showUnlistedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowUnlistedModal(false)}></div>
          <div className="relative bg-white w-full max-w-md mx-auto rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Unlisted Medicine</h3>
              <button onClick={() => setShowUnlistedModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={unlistedForm.name}
                  onChange={e => setUnlistedForm({...unlistedForm, name: e.target.value})}
                  placeholder="e.g., Dolopar 650"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">
                  This medicine will be logged for future inventory creation. It will not be added to the current bill.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveUnlisted}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Request'}
                </button>
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