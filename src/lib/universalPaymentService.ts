import { supabase } from './supabase';
import { generateSequentialBillNumber } from './billNumberGenerator';

function supabaseErrorToString(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  const anyErr = err as any;
  if (typeof anyErr?.message === 'string') return anyErr.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export interface PaymentItem {
  id?: string;
  service_name: string;
  quantity: number;
  unit_rate: number;
  total_amount: number;
  item_type: 'service' | 'medicine' | 'procedure' | 'accommodation' | 'lab_test' | 'radiology';
  reference_id?: string; // Links to specific service (lab_order, radiology_order, etc.)
}

export interface PaymentData {
  patient_id: string;
  appointment_id?: string;
  bed_allocation_id?: string;
  items: PaymentItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method?: string; // Default for backward compatibility
  notes?: string;
  created_by?: string;
  bill_type?: 'consultation' | 'lab' | 'radiology' | 'pharmacy' | 'ipd' | 'other';
}

export interface PaymentSplit {
  method: 'cash' | 'card' | 'upi' | 'gpay' | 'ghpay' | 'insurance' | 'credit' | 'others';
  amount: number;
  transaction_reference?: string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  bill_id: string;
  patient_id: string;
  bill_date: string;
  items: PaymentItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentReceipt {
  id: string;
  receipt_number: string;
  bill_id: string;
  patient_id: string;
  receipt_date: string;
  receipt_time: string;
  total_amount: number;
  amount_paid: number;
  balance_amount: number;
  payment_status: 'partial' | 'full' | 'overdue';
  payment_methods: PaymentSplit[];
  received_by: string;
  created_at: string;
}

// Generate unique bill number - using same format as pharmacy billing
export async function generateBillNumber(prefix: string): Promise<string> {
  return generateSequentialBillNumber(prefix);
}

// Create universal bill for any service
export async function createUniversalBill(data: PaymentData): Promise<PaymentRecord> {
  try {
    const bill_id = await generateBillNumber('OP');
    
    // Create main billing record
    const { data: billing, error: billingError } = await supabase
      .from('billing')
      .insert({
        bill_no: bill_id,
        bill_number: bill_id,
        patient_id: data.patient_id,
        bed_allocation_id: data.bed_allocation_id,
        subtotal: data.subtotal,
        discount: data.discount_amount,
        tax: data.tax_amount,
        payment_status: 'pending',
        payment_method: data.payment_method,
        bill_type: data.bill_type || 'consultation',
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (billingError) {
      console.error('Error creating billing record:', billingError);
      throw new Error(`Failed to create billing record: ${supabaseErrorToString(billingError)}`);
    }

    // Map DB row to PaymentRecord shape expected by UI.
    // Note: billing table in this project doesn't store item lines as JSON.
    return {
      id: billing.id,
      bill_id: billing.bill_no ?? billing.bill_number ?? bill_id,
      patient_id: billing.patient_id,
      bill_date: (billing.issued_at ? String(billing.issued_at).split('T')[0] : new Date().toISOString().split('T')[0]),
      items: data.items,
      subtotal: Number(billing.subtotal ?? data.subtotal) || 0,
      tax_amount: Number(billing.tax ?? data.tax_amount) || 0,
      discount_amount: Number(billing.discount ?? data.discount_amount) || 0,
      total_amount: Number(billing.total ?? ((Number(billing.subtotal ?? data.subtotal) || 0) - (Number(billing.discount ?? data.discount_amount) || 0) + (Number(billing.tax ?? data.tax_amount) || 0))) || 0,
      payment_status: (billing.payment_status as any) || 'pending',
      payment_method: billing.payment_method ?? data.payment_method,
      payment_date: billing.issued_at ?? undefined,
      created_at: billing.created_at ?? new Date().toISOString(),
      updated_at: billing.updated_at ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in createUniversalBill:', error);
    throw error;
  }
}

// Process split payments for existing bill
export async function processSplitPayments(
  billId: string,
  payments: PaymentSplit[],
  notes?: string
): Promise<void> {
  try {
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error('User not authenticated. Please log in again.');
    }
    const authUserId = authData.user.id;

    // Load bill
    const { data: billing, error: billingFetchError } = await supabase
      .from('billing')
      .select('id, subtotal, discount, tax, total, amount_paid, balance_due, payment_status')
      .eq('id', billId)
      .single();

    if (billingFetchError) {
      throw new Error(`Failed to load bill: ${supabaseErrorToString(billingFetchError)}`);
    }
    if (!billing) throw new Error('Bill not found');

    const billTotal = Number(billing.total) || 0;
    if (Math.abs(totalPaid - billTotal) > 0.01) {
      throw new Error('Payment amount must equal the total bill amount');
    }

    // Replace payments (simple + robust)
    const { error: delError } = await supabase
      .from('billing_payments')
      .delete()
      .eq('billing_id', billId);

    if (delError) {
      throw new Error(`Failed to clear old payments: ${supabaseErrorToString(delError)}`);
    }

    const rows = payments
      .map(p => ({
        billing_id: billId,
        amount: Number(p.amount) || 0,
        method: p.method,
        reference: p.transaction_reference || null,
        paid_at: new Date().toISOString(),
        received_by: authUserId,
      }))
      .filter(r => r.amount > 0);

    if (rows.length) {
      const { error: insError } = await supabase
        .from('billing_payments')
        .insert(rows);
      if (insError) {
        throw new Error(`Failed to save payments: ${supabaseErrorToString(insError)}`);
      }
    }

    const paid = totalPaid;
    const balance = Math.max(0, billTotal - paid);
    const paymentStatus = paid <= 0 ? 'pending' : (balance <= 0 ? 'paid' : 'partial');

    // Derive payment_method for billing header
    const nonZero = payments.filter(p => (Number(p.amount) || 0) > 0);
    const derivedMethod = nonZero.length === 1 ? nonZero[0].method : (nonZero.length > 1 ? 'others' : null);

    const { error: updError } = await supabase
      .from('billing')
      .update({
        amount_paid: paid,
        balance_due: balance,
        payment_status: paymentStatus,
        payment_method: derivedMethod,
        updated_at: new Date().toISOString(),
      })
      .eq('id', billId);

    if (updError) {
      throw new Error(`Failed to update bill totals: ${supabaseErrorToString(updError)}`);
    }
  } catch (error) {
    console.error('Error in processSplitPayments:', error);
    throw error;
  }
}

// Process single payment (backward compatibility)
export async function processPayment(
  billId: string, 
  paymentMethod: string, 
  amount: number, 
  transactionReference?: string,
  notes?: string
): Promise<void> {
  const payment: PaymentSplit = {
    method: paymentMethod as any,
    amount,
    transaction_reference: transactionReference,
    notes
  };

  await processSplitPayments(billId, [payment], notes);
}

// Get bills by patient
export async function getPatientBills(patientId: string): Promise<PaymentRecord[]> {
  try {
    const { data, error } = await supabase
      .from('billing')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patient bills:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPatientBills:', error);
    throw error;
  }
}

// Get bills by service type
export async function getBillsByServiceType(serviceType: string): Promise<PaymentRecord[]> {
  try {
    const { data, error } = await supabase
      .from('billing')
      .select('*')
      .contains('items', [{ item_type: serviceType }])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bills by service type:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBillsByServiceType:', error);
    throw error;
  }
}

// Create bill specifically for lab tests
export async function createLabTestBill(
  patientId: string,
  labOrders: any[],
  staffId?: string
): Promise<PaymentRecord> {
  const items: PaymentItem[] = labOrders.map(order => ({
    service_name: order.test_catalog?.test_name || 'Lab Test',
    quantity: 1,
    unit_rate: order.test_catalog?.test_cost || 0,
    total_amount: order.test_catalog?.test_cost || 0,
    item_type: 'lab_test' as const,
    reference_id: order.id,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const taxAmount = subtotal * 0.05; // 5% tax
  const totalAmount = subtotal + taxAmount;

  return createUniversalBill({
    patient_id: patientId,
    items,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: 0,
    total_amount: totalAmount,
    payment_method: 'cash',
    created_by: staffId,
    bill_type: 'lab',
  });
}

// Create bill specifically for radiology tests
export async function createRadiologyBill(
  patientId: string,
  radiologyOrders: any[],
  staffId?: string
): Promise<PaymentRecord> {
  const items: PaymentItem[] = radiologyOrders.map(order => ({
    service_name: order.test_catalog?.test_name || 'Radiology Test',
    quantity: 1,
    unit_rate: order.test_catalog?.test_cost || 0,
    total_amount: order.test_catalog?.test_cost || 0,
    item_type: 'radiology' as const,
    reference_id: order.id,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const taxAmount = subtotal * 0.05; // 5% tax
  const totalAmount = subtotal + taxAmount;

  return createUniversalBill({
    patient_id: patientId,
    items,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: 0,
    total_amount: totalAmount,
    payment_method: 'cash',
    created_by: staffId,
  });
}

// Create bill specifically for scan tests
export async function createScanBill(
  patientId: string,
  scanOrders: any[],
  staffId?: string
): Promise<PaymentRecord> {
  const items: PaymentItem[] = scanOrders.map(order => ({
    service_name: order.test_catalog?.test_name || 'Scan Test',
    quantity: 1,
    unit_rate: order.test_catalog?.test_cost || 0,
    total_amount: order.test_catalog?.test_cost || 0,
    item_type: 'radiology' as const, // Using radiology type for scans
    reference_id: order.id,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const taxAmount = subtotal * 0.05; // 5% tax
  const totalAmount = subtotal + taxAmount;

  return createUniversalBill({
    patient_id: patientId,
    items,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: 0,
    total_amount: totalAmount,
    payment_method: 'cash',
    created_by: staffId,
    bill_type: 'radiology', // Using radiology type for scans
  });
}

// Create bill specifically for IP admission
export async function createIPAdmissionBill(
  patientId: string,
  bedAllocationId: string,
  admissionDays: number,
  dailyRate: number,
  additionalServices: PaymentItem[] = [],
  staffId?: string
): Promise<PaymentRecord> {
  const items: PaymentItem[] = [
    {
      service_name: 'Room Charges',
      quantity: admissionDays,
      unit_rate: dailyRate,
      total_amount: admissionDays * dailyRate,
      item_type: 'accommodation' as const,
      reference_id: bedAllocationId,
    },
    ...additionalServices,
  ];

  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const taxAmount = subtotal * 0.05; // 5% tax
  const totalAmount = subtotal + taxAmount;

  return createUniversalBill({
    patient_id: patientId,
    bed_allocation_id: bedAllocationId,
    items,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: 0,
    total_amount: totalAmount,
    payment_method: 'cash',
    created_by: staffId,
  });
}

// Create bill specifically for OP consultation
export async function createOPConsultationBill(
  patientId: string,
  appointmentId: string,
  consultationFee: number,
  doctorName: string,
  staffId?: string
): Promise<PaymentRecord> {
  const items: PaymentItem[] = [{
    service_name: `Consultation - Dr. ${doctorName}`,
    quantity: 1,
    unit_rate: consultationFee,
    total_amount: consultationFee,
    item_type: 'service' as const,
    reference_id: appointmentId,
  }];

  const subtotal = consultationFee;
  const taxAmount = subtotal * 0.05; // 5% tax
  const totalAmount = subtotal + taxAmount;

  return createUniversalBill({
    patient_id: patientId,
    appointment_id: appointmentId,
    items,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: 0,
    total_amount: totalAmount,
    payment_method: 'cash',
    created_by: staffId,
    bill_type: 'consultation',
  });
}
