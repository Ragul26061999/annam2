import { supabase } from './supabase';

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
}

export interface PaymentSplit {
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'insurance' | 'cheque' | 'wallet';
  amount: number;
  transaction_reference?: string;
  bank_name?: string;
  card_last_four?: string;
  upi_id?: string;
  cheque_number?: string;
  cheque_date?: string;
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

// Generate unique bill number
export function generateBillNumber(prefix: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${dateStr}-${random}`;
}

// Create universal bill for any service
export async function createUniversalBill(data: PaymentData): Promise<PaymentRecord> {
  try {
    const bill_id = generateBillNumber('BILL');
    
    // Create main billing record
    const { data: billing, error: billingError } = await supabase
      .from('billing')
      .insert({
        bill_id,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id,
        bed_allocation_id: data.bed_allocation_id,
        bill_date: new Date().toISOString().split('T')[0],
        items: data.items,
        subtotal: data.subtotal,
        tax_amount: data.tax_amount,
        discount_amount: data.discount_amount,
        total_amount: data.total_amount,
        payment_status: 'pending',
        payment_method: data.payment_method,
        created_by: data.created_by,
      })
      .select()
      .single();

    if (billingError) {
      console.error('Error creating billing record:', billingError);
      throw new Error(`Failed to create billing record: ${billingError.message}`);
    }

    // Create individual billing items
    const billingItems = data.items.map(item => ({
      billing_summary_id: billing.id,
      service_name: item.service_name,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      total_amount: item.total_amount,
      item_type: item.item_type,
    }));

    const { error: itemsError } = await supabase
      .from('billing_items')
      .insert(billingItems);

    if (itemsError) {
      console.error('Error creating billing items:', itemsError);
      // Don't throw here as main bill is created
    }

    return billing;
  } catch (error) {
    console.error('Error in createUniversalBill:', error);
    throw error;
  }
}

// Process split payments for existing bill
export async function processSplitPayments(
  billId: string, 
  payments: PaymentSplit[],
  receivedBy: string,
  notes?: string
): Promise<PaymentReceipt> {
  try {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Get billing details
    const { data: billing } = await supabase
      .from('billing')
      .select('*')
      .eq('id', billId)
      .single();

    if (!billing) {
      throw new Error('Bill not found');
    }

    // Generate receipt number
    const { data: receiptData } = await supabase
      .rpc('generate_receipt_number');

    const receiptNumber = receiptData;

    // Add each payment to payment history
    for (const payment of payments) {
      const paymentData = {
        bill_id: billing.bill_id,
        billing_id: billId,
        payment_date: new Date().toISOString().split('T')[0],
        payment_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        amount_paid: payment.amount,
        payment_method: payment.method,
        transaction_reference: payment.transaction_reference,
        bank_name: payment.bank_name,
        card_last_four: payment.card_last_four,
        upi_id: payment.upi_id,
        cheque_number: payment.cheque_number,
        cheque_date: payment.cheque_date,
        notes: payment.notes,
        created_by: null // Will be set by RLS
      };

      const { error: historyError } = await supabase
        .from('payment_history')
        .insert(paymentData);

      if (historyError) {
        console.error('Error creating payment history:', historyError);
        throw new Error(`Failed to record payment: ${historyError.message}`);
      }
    }

    // Create payment receipt
    const receipt = {
      receipt_number: receiptNumber,
      bill_id: billing.bill_id,
      billing_id: billId,
      patient_id: billing.patient_id,
      receipt_date: new Date().toISOString().split('T')[0],
      receipt_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      total_amount: billing.total_amount,
      amount_paid: totalPaid,
      balance_amount: billing.total_amount - totalPaid,
      payment_status: totalPaid >= billing.total_amount ? 'full' : 'partial',
      payment_methods: payments,
      received_by: receivedBy,
      created_by: null // Will be set by RLS
    };

    const { data: receiptRecord, error: receiptError } = await supabase
      .from('payment_receipts')
      .insert(receipt)
      .select()
      .single();

    if (receiptError) {
      console.error('Error creating payment receipt:', receiptError);
      throw new Error(`Failed to create receipt: ${receiptError.message}`);
    }

    return receiptRecord;
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

  await processSplitPayments(billId, [payment], 'System', notes);
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
  });
}
