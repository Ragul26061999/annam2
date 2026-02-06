import { supabase } from './supabase';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export type BillCategory = 
  | 'bed_charges'
  | 'doctor_consultation'
  | 'doctor_services'
  | 'surgery'
  | 'pharmacy'
  | 'lab'
  | 'radiology'
  | 'nursing'
  | 'equipment'
  | 'consumables'
  | 'other';

export type PaymentType = 'cash' | 'card' | 'upi' | 'net_banking' | 'cheque' | 'insurance' | 'advance';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'waived' | 'cancelled';

export interface IPAdvance {
  id?: string;
  bed_allocation_id: string;
  patient_id: string;
  amount: number;
  payment_type: Exclude<PaymentType, 'advance'>;
  reference_number?: string;
  notes?: string;
  advance_date?: string;
  used_amount?: number;
  available_amount?: number;
  status?: 'active' | 'fully_used' | 'refunded' | 'cancelled';
  created_by?: string;
  created_at?: string;
}

export interface IPBillItem {
  id?: string;
  bed_allocation_id: string;
  patient_id: string;
  bill_category: BillCategory;
  source_table?: string;
  source_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  gross_amount?: number;
  discount_percent?: number;
  discount_amount?: number;
  discount_reason?: string;
  discount_approved_by?: string;
  net_amount?: number;
  paid_amount?: number;
  pending_amount?: number;
  payment_status?: PaymentStatus;
  service_date?: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  edited?: boolean;
  last_edited_by?: string;
  last_edited_at?: string;
  created_by?: string;
  created_at?: string;
}

export interface IPBillPayment {
  id?: string;
  bed_allocation_id: string;
  patient_id: string;
  payment_date?: string;
  payment_type: PaymentType;
  total_amount: number;
  reference_number?: string;
  notes?: string;
  advance_id?: string;
  receipt_number?: string;
  created_by?: string;
  created_at?: string;
}

export interface IPBillPaymentAllocation {
  id?: string;
  payment_id: string;
  bill_item_id: string;
  allocated_amount: number;
}

export interface IPBillDiscount {
  id?: string;
  bed_allocation_id: string;
  bill_item_id?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  created_at?: string;
}

export interface IPBillingSummary {
  bed_allocation_id: string;
  patient_id: string;
  patient_name: string;
  ip_number: string;
  admission_date: string;
  discharge_date?: string;
  bed_charges_total: number;
  doctor_consultation_total: number;
  surgery_total: number;
  pharmacy_total: number;
  lab_total: number;
  radiology_total: number;
  other_total: number;
  gross_total: number;
  discount_total: number;
  net_total: number;
  paid_total: number;
  pending_total: number;
  total_advance: number;
  available_advance: number;
}

// =====================================================
// ADVANCE FUNCTIONS
// =====================================================

export async function createAdvance(advance: Omit<IPAdvance, 'id' | 'used_amount' | 'available_amount' | 'status' | 'created_at'>): Promise<IPAdvance> {
  const { data, error } = await supabase
    .from('ip_advances')
    .insert({
      bed_allocation_id: advance.bed_allocation_id,
      patient_id: advance.patient_id,
      amount: advance.amount,
      payment_type: advance.payment_type,
      reference_number: advance.reference_number || null,
      notes: advance.notes || null,
      advance_date: advance.advance_date || new Date().toISOString(),
      created_by: advance.created_by || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating advance:', error);
    throw new Error(`Failed to create advance: ${error.message}`);
  }

  return data;
}

export async function getAdvances(bedAllocationId: string): Promise<IPAdvance[]> {
  const { data, error } = await supabase
    .from('ip_advances')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .neq('status', 'cancelled')
    .order('advance_date', { ascending: false });

  if (error) {
    console.error('Error fetching advances:', error);
    throw new Error(`Failed to fetch advances: ${error.message}`);
  }

  return data || [];
}

export async function getAvailableAdvances(bedAllocationId: string): Promise<IPAdvance[]> {
  const { data, error } = await supabase
    .from('ip_advances')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .eq('status', 'active')
    .gt('available_amount', 0)
    .order('advance_date', { ascending: true });

  if (error) {
    console.error('Error fetching available advances:', error);
    throw new Error(`Failed to fetch available advances: ${error.message}`);
  }

  return data || [];
}

export async function getTotalAvailableAdvance(bedAllocationId: string): Promise<number> {
  const advances = await getAvailableAdvances(bedAllocationId);
  return advances.reduce((sum, adv) => sum + (adv.available_amount || 0), 0);
}

export async function createAdvanceFromPatientRegistration(
  bedAllocationId: string,
  patientId: string,
  advanceAmount: number,
  paymentMethod: string,
  referenceNumber?: string,
  notes?: string,
  createdBy?: string
): Promise<IPAdvance> {
  const advanceData: Partial<IPAdvance> = {
    bed_allocation_id: bedAllocationId,
    patient_id: patientId,
    amount: advanceAmount,
    payment_type: paymentMethod as Exclude<PaymentType, 'advance'>,
    reference_number: referenceNumber,
    notes: notes,
    advance_date: new Date().toISOString(),
    used_amount: 0,
    status: 'active',
    created_by: createdBy
  };

  const { data, error } = await supabase
    .from('ip_advances')
    .insert([advanceData])
    .select()
    .single();

  if (error) {
    console.error('Error creating advance from registration:', error);
    throw new Error(`Failed to create advance: ${error.message}`);
  }

  return data;
}

export async function cancelAdvance(advanceId: string, userId?: string): Promise<void> {
  const { error } = await supabase
    .from('ip_advances')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', advanceId);

  if (error) {
    console.error('Error cancelling advance:', error);
    throw new Error(`Failed to cancel advance: ${error.message}`);
  }
}

// =====================================================
// BILL ITEM FUNCTIONS
// =====================================================

export async function createBillItem(item: Omit<IPBillItem, 'id' | 'gross_amount' | 'net_amount' | 'paid_amount' | 'pending_amount' | 'payment_status' | 'created_at'>): Promise<IPBillItem> {
  const { data, error } = await supabase
    .from('ip_bill_items')
    .insert({
      bed_allocation_id: item.bed_allocation_id,
      patient_id: item.patient_id,
      bill_category: item.bill_category,
      source_table: item.source_table || null,
      source_id: item.source_id || null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      discount_amount: item.discount_amount || 0,
      discount_reason: item.discount_reason || null,
      discount_approved_by: item.discount_approved_by || null,
      service_date: item.service_date || new Date().toISOString().split('T')[0],
      created_by: item.created_by || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating bill item:', error);
    throw new Error(`Failed to create bill item: ${error.message}`);
  }

  return data;
}

export async function createBillItems(items: Omit<IPBillItem, 'id' | 'gross_amount' | 'net_amount' | 'paid_amount' | 'pending_amount' | 'payment_status' | 'created_at'>[]): Promise<IPBillItem[]> {
  const insertData = items.map(item => ({
    bed_allocation_id: item.bed_allocation_id,
    patient_id: item.patient_id,
    bill_category: item.bill_category,
    source_table: item.source_table || null,
    source_id: item.source_id || null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent || 0,
    discount_amount: item.discount_amount || 0,
    discount_reason: item.discount_reason || null,
    discount_approved_by: item.discount_approved_by || null,
    service_date: item.service_date || new Date().toISOString().split('T')[0],
    created_by: item.created_by || null
  }));

  const { data, error } = await supabase
    .from('ip_bill_items')
    .insert(insertData)
    .select();

  if (error) {
    console.error('Error creating bill items:', error);
    throw new Error(`Failed to create bill items: ${error.message}`);
  }

  return data || [];
}

export async function getBillItems(bedAllocationId: string): Promise<IPBillItem[]> {
  const { data, error } = await supabase
    .from('ip_bill_items')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .neq('payment_status', 'cancelled')
    .order('service_date', { ascending: true })
    .order('bill_category', { ascending: true });

  if (error) {
    console.error('Error fetching bill items:', error);
    throw new Error(`Failed to fetch bill items: ${error.message}`);
  }

  return data || [];
}

export async function getPendingBillItems(bedAllocationId: string): Promise<IPBillItem[]> {
  const { data, error } = await supabase
    .from('ip_bill_items')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .in('payment_status', ['pending', 'partial'])
    .order('service_date', { ascending: true });

  if (error) {
    console.error('Error fetching pending bill items:', error);
    throw new Error(`Failed to fetch pending bill items: ${error.message}`);
  }

  return data || [];
}

export async function updateBillItem(
  billItemId: string,
  updates: Partial<Pick<IPBillItem, 'description' | 'quantity' | 'unit_price' | 'discount_percent' | 'discount_amount' | 'discount_reason' | 'discount_approved_by'>>,
  userId?: string
): Promise<IPBillItem> {
  const updateData: any = {
    ...updates,
    edited: true,
    last_edited_by: userId || null,
    last_edited_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ip_bill_items')
    .update(updateData)
    .eq('id', billItemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating bill item:', error);
    throw new Error(`Failed to update bill item: ${error.message}`);
  }

  return data;
}

export async function applyDiscountToBillItem(
  billItemId: string,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  reason?: string,
  approvedBy?: string
): Promise<IPBillItem> {
  // First get the bill item to calculate discount amount
  const { data: item, error: fetchError } = await supabase
    .from('ip_bill_items')
    .select('quantity, unit_price')
    .eq('id', billItemId)
    .single();

  if (fetchError || !item) {
    throw new Error('Bill item not found');
  }

  const grossAmount = item.quantity * item.unit_price;
  let discountAmount: number;
  let discountPercent: number;

  if (discountType === 'percentage') {
    discountPercent = discountValue;
    discountAmount = (grossAmount * discountValue) / 100;
  } else {
    discountAmount = discountValue;
    discountPercent = (discountValue / grossAmount) * 100;
  }

  const { data, error } = await supabase
    .from('ip_bill_items')
    .update({
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      discount_reason: reason || null,
      discount_approved_by: approvedBy || null,
      edited: true,
      last_edited_by: approvedBy || null,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', billItemId)
    .select()
    .single();

  if (error) {
    console.error('Error applying discount:', error);
    throw new Error(`Failed to apply discount: ${error.message}`);
  }

  // Also record in discount history
  await supabase.from('ip_bill_discounts').insert({
    bed_allocation_id: data.bed_allocation_id,
    bill_item_id: billItemId,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: discountAmount,
    reason: reason || null,
    approved_by: approvedBy || null,
    approved_at: new Date().toISOString(),
    created_by: approvedBy || null
  });

  return data;
}

export async function cancelBillItem(billItemId: string, userId?: string): Promise<void> {
  const { error } = await supabase
    .from('ip_bill_items')
    .update({
      payment_status: 'cancelled',
      edited: true,
      last_edited_by: userId || null,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', billItemId);

  if (error) {
    console.error('Error cancelling bill item:', error);
    throw new Error(`Failed to cancel bill item: ${error.message}`);
  }
}

export async function acknowledgeBillItem(billItemId: string, userId: string): Promise<IPBillItem> {
  const { data, error } = await supabase
    .from('ip_bill_items')
    .update({
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', billItemId)
    .select()
    .single();

  if (error) {
    console.error('Error acknowledging bill item:', error);
    throw new Error(`Failed to acknowledge bill item: ${error.message}`);
  }

  return data;
}

// =====================================================
// PAYMENT FUNCTIONS
// =====================================================

export interface PaymentWithAllocations {
  payment: Omit<IPBillPayment, 'id' | 'receipt_number' | 'created_at'>;
  allocations: { bill_item_id: string; amount: number }[];
}

export async function createPaymentWithAllocations(
  paymentData: PaymentWithAllocations
): Promise<{ payment: IPBillPayment; allocations: IPBillPaymentAllocation[] }> {
  const { payment, allocations } = paymentData;

  // Validate total allocation matches payment amount
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  if (Math.abs(totalAllocated - payment.total_amount) > 0.01) {
    throw new Error(`Allocation total (${totalAllocated}) does not match payment amount (${payment.total_amount})`);
  }

  // Generate receipt number
  const { data: receiptData } = await supabase.rpc('generate_ip_receipt_number');
  const receiptNumber = receiptData || `IPR${Date.now()}`;

  // Create payment
  const { data: paymentRecord, error: paymentError } = await supabase
    .from('ip_bill_payments')
    .insert({
      bed_allocation_id: payment.bed_allocation_id,
      patient_id: payment.patient_id,
      payment_date: payment.payment_date || new Date().toISOString(),
      payment_type: payment.payment_type,
      total_amount: payment.total_amount,
      reference_number: payment.reference_number || null,
      notes: payment.notes || null,
      advance_id: payment.advance_id || null,
      receipt_number: receiptNumber,
      created_by: payment.created_by || null
    })
    .select()
    .single();

  if (paymentError) {
    console.error('Error creating payment:', paymentError);
    throw new Error(`Failed to create payment: ${paymentError.message}`);
  }

  // Create allocations
  const allocationInserts = allocations.map(a => ({
    payment_id: paymentRecord.id,
    bill_item_id: a.bill_item_id,
    allocated_amount: a.amount
  }));

  const { data: allocationRecords, error: allocationError } = await supabase
    .from('ip_bill_payment_allocations')
    .insert(allocationInserts)
    .select();

  if (allocationError) {
    console.error('Error creating allocations:', allocationError);
    // Rollback payment
    await supabase.from('ip_bill_payments').delete().eq('id', paymentRecord.id);
    throw new Error(`Failed to create payment allocations: ${allocationError.message}`);
  }

  return {
    payment: paymentRecord,
    allocations: allocationRecords || []
  };
}

export async function payWithAdvance(
  bedAllocationId: string,
  patientId: string,
  allocations: { bill_item_id: string; amount: number }[],
  userId?: string
): Promise<{ payment: IPBillPayment; allocations: IPBillPaymentAllocation[] }> {
  const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);
  
  // Get available advances
  const availableAdvances = await getAvailableAdvances(bedAllocationId);
  const totalAvailable = availableAdvances.reduce((sum, a) => sum + (a.available_amount || 0), 0);

  if (totalAvailable < totalAmount) {
    throw new Error(`Insufficient advance balance. Available: ${totalAvailable}, Required: ${totalAmount}`);
  }

  // Use advances in FIFO order
  let remainingAmount = totalAmount;
  let advanceId: string | undefined;

  for (const advance of availableAdvances) {
    if (remainingAmount <= 0) break;
    
    const useAmount = Math.min(remainingAmount, advance.available_amount || 0);
    if (useAmount > 0) {
      advanceId = advance.id; // Use first advance for reference
      remainingAmount -= useAmount;
    }
  }

  // Create payment with advance type
  return createPaymentWithAllocations({
    payment: {
      bed_allocation_id: bedAllocationId,
      patient_id: patientId,
      payment_type: 'advance',
      total_amount: totalAmount,
      advance_id: advanceId,
      notes: 'Payment from advance',
      created_by: userId
    },
    allocations
  });
}

export async function getPayments(bedAllocationId: string): Promise<IPBillPayment[]> {
  const { data, error } = await supabase
    .from('ip_bill_payments')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }

  return data || [];
}

export async function getPaymentAllocations(paymentId: string): Promise<(IPBillPaymentAllocation & { bill_item: IPBillItem })[]> {
  const { data, error } = await supabase
    .from('ip_bill_payment_allocations')
    .select(`
      *,
      bill_item:ip_bill_items(*)
    `)
    .eq('payment_id', paymentId);

  if (error) {
    console.error('Error fetching payment allocations:', error);
    throw new Error(`Failed to fetch payment allocations: ${error.message}`);
  }

  return data || [];
}

// =====================================================
// BILLING SUMMARY FUNCTIONS
// =====================================================

export async function getBillingSummary(bedAllocationId: string): Promise<IPBillingSummary | null> {
  const { data, error } = await supabase
    .from('ip_billing_summary')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows
    console.error('Error fetching billing summary:', error);
    throw new Error(`Failed to fetch billing summary: ${error.message}`);
  }

  return data;
}

export async function getBillItemsByCategory(bedAllocationId: string): Promise<Record<BillCategory, IPBillItem[]>> {
  const items = await getBillItems(bedAllocationId);
  
  const grouped: Record<BillCategory, IPBillItem[]> = {
    bed_charges: [],
    doctor_consultation: [],
    doctor_services: [],
    surgery: [],
    pharmacy: [],
    lab: [],
    radiology: [],
    nursing: [],
    equipment: [],
    consumables: [],
    other: []
  };

  items.forEach(item => {
    if (grouped[item.bill_category]) {
      grouped[item.bill_category].push(item);
    } else {
      grouped.other.push(item);
    }
  });

  return grouped;
}

// =====================================================
// SYNC FUNCTIONS - Sync from source tables to ip_bill_items
// =====================================================

export async function syncBillItemsFromSources(bedAllocationId: string, patientId: string, admissionDate: string, dischargeDate?: string): Promise<void> {
  const endDate = dischargeDate || new Date().toISOString();
  const admissionDateOnly = admissionDate.split('T')[0];
  const endDateOnly = endDate.split('T')[0];

  // Get existing bill items to avoid duplicates
  const existingItems = await getBillItems(bedAllocationId);
  const existingSourceIds = new Set(existingItems.map(i => `${i.source_table}:${i.source_id}`));

  const newItems: Omit<IPBillItem, 'id' | 'gross_amount' | 'net_amount' | 'paid_amount' | 'pending_amount' | 'payment_status' | 'created_at'>[] = [];

  // 1. Sync Lab Orders
  const { data: labOrders } = await supabase
    .from('lab_test_orders')
    .select('*, lab_test_catalog(test_name, test_cost)')
    .eq('patient_id', patientId)
    .gte('created_at', admissionDate)
    .lte('created_at', endDate);

  (labOrders || []).forEach((order: any) => {
    const key = `lab_test_orders:${order.id}`;
    if (!existingSourceIds.has(key)) {
      newItems.push({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        bill_category: 'lab',
        source_table: 'lab_test_orders',
        source_id: order.id,
        description: order.lab_test_catalog?.test_name || 'Lab Test',
        quantity: 1,
        unit_price: Number(order.lab_test_catalog?.test_cost) || 0,
        service_date: order.created_at?.split('T')[0]
      });
    }
  });

  // 2. Sync Radiology Orders
  const { data: radioOrders } = await supabase
    .from('radiology_test_orders')
    .select('*, radiology_test_catalog(test_name, test_cost)')
    .eq('patient_id', patientId)
    .gte('created_at', admissionDate)
    .lte('created_at', endDate);

  (radioOrders || []).forEach((order: any) => {
    const key = `radiology_test_orders:${order.id}`;
    if (!existingSourceIds.has(key)) {
      newItems.push({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        bill_category: 'radiology',
        source_table: 'radiology_test_orders',
        source_id: order.id,
        description: order.radiology_test_catalog?.test_name || 'Radiology Scan',
        quantity: 1,
        unit_price: Number(order.radiology_test_catalog?.test_cost) || 0,
        service_date: order.created_at?.split('T')[0]
      });
    }
  });

  // 3. Sync Surgery Charges
  const { data: surgeries } = await supabase
    .from('ip_surgery_charges')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId);

  (surgeries || []).forEach((surgery: any) => {
    const key = `ip_surgery_charges:${surgery.id}`;
    if (!existingSourceIds.has(key)) {
      newItems.push({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        bill_category: 'surgery',
        source_table: 'ip_surgery_charges',
        source_id: surgery.id,
        description: surgery.surgery_name || 'Surgery',
        quantity: 1,
        unit_price: Number(surgery.total_amount) || 0,
        service_date: surgery.surgery_date?.split('T')[0] || surgery.created_at?.split('T')[0]
      });
    }
  });

  // 4. Sync Pharmacy Bills
  const { data: pharmacyBills } = await supabase
    .from('pharmacy_bills')
    .select('*')
    .eq('patient_id', patientId)
    .gte('bill_date', admissionDateOnly)
    .lte('bill_date', endDateOnly);

  (pharmacyBills || []).forEach((bill: any) => {
    const key = `pharmacy_bills:${bill.id}`;
    if (!existingSourceIds.has(key)) {
      newItems.push({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        bill_category: 'pharmacy',
        source_table: 'pharmacy_bills',
        source_id: bill.id,
        description: `Pharmacy Bill #${bill.bill_number}`,
        quantity: 1,
        unit_price: Number(bill.total_amount) || 0,
        service_date: bill.bill_date?.split('T')[0]
      });
    }
  });

  // 5. Sync Doctor Consultations
  const { data: consultations } = await supabase
    .from('ip_doctor_consultations')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId);

  (consultations || []).forEach((consult: any) => {
    const key = `ip_doctor_consultations:${consult.id}`;
    if (!existingSourceIds.has(key)) {
      newItems.push({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        bill_category: 'doctor_consultation',
        source_table: 'ip_doctor_consultations',
        source_id: consult.id,
        description: `${consult.consultation_type || 'Consultation'} - ${consult.doctor_name}`,
        quantity: consult.days || 1,
        unit_price: Number(consult.consultation_fee) || 0,
        service_date: consult.consultation_date?.split('T')[0]
      });
    }
  });

  // Insert new items
  if (newItems.length > 0) {
    await createBillItems(newItems);
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function calculateCategoryTotals(items: IPBillItem[]): Record<BillCategory, { gross: number; discount: number; net: number; paid: number; pending: number }> {
  const totals: Record<BillCategory, { gross: number; discount: number; net: number; paid: number; pending: number }> = {
    bed_charges: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    doctor_consultation: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    doctor_services: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    surgery: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    pharmacy: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    lab: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    radiology: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    nursing: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    equipment: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    consumables: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 },
    other: { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 }
  };

  items.forEach(item => {
    const cat = item.bill_category;
    if (totals[cat]) {
      totals[cat].gross += item.gross_amount || 0;
      totals[cat].discount += item.discount_amount || 0;
      totals[cat].net += item.net_amount || 0;
      totals[cat].paid += item.paid_amount || 0;
      totals[cat].pending += item.pending_amount || 0;
    }
  });

  return totals;
}

export function calculateOverallTotals(items: IPBillItem[]): { gross: number; discount: number; net: number; paid: number; pending: number } {
  return items.reduce((acc, item) => ({
    gross: acc.gross + (item.gross_amount || 0),
    discount: acc.discount + (item.discount_amount || 0),
    net: acc.net + (item.net_amount || 0),
    paid: acc.paid + (item.paid_amount || 0),
    pending: acc.pending + (item.pending_amount || 0)
  }), { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 });
}
