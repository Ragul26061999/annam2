import { supabase } from './supabase';
import type { OtherBills, OtherBillPayments } from '../types/database';

export type ChargeCategory = 
  | 'nursing_charges'
  | 'attendant_charges'
  | 'medical_equipment'
  | 'ambulance_service'
  | 'special_procedures'
  | 'dietary_charges'
  | 'laundry_service'
  | 'accommodation_extra'
  | 'mortuary_charges'
  | 'certificate_charges'
  | 'photocopying'
  | 'misc_supplies'
  | 'other';

export type PatientType = 'IP' | 'OP' | 'Emergency' | 'General';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'cancelled';

export interface OtherBillFormData {
  patient_id?: string;
  patient_type: PatientType;
  patient_name: string;
  patient_phone?: string;
  charge_category: ChargeCategory;
  charge_description: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
  reference_number?: string;
  remarks?: string;
  bed_allocation_id?: string;
  encounter_id?: string;
}

export type OtherBillWithPatient = OtherBills['Row'] & {
  patient?: {
    id: string;
    patient_id: string;
    name: string;
    phone: string;
  } | null;
  created_by_user?: {
    name: string;
    employee_id: string;
  } | null;
}

export const CHARGE_CATEGORIES: { value: ChargeCategory; label: string; description: string }[] = [
  { value: 'nursing_charges', label: 'Nursing Charges', description: 'Nursing care and monitoring fees' },
  { value: 'attendant_charges', label: 'Attendant Charges', description: 'Patient attendant service fees' },
  { value: 'medical_equipment', label: 'Medical Equipment', description: 'Equipment rental or usage charges' },
  { value: 'ambulance_service', label: 'Ambulance Service', description: 'Ambulance transportation charges' },
  { value: 'special_procedures', label: 'Special Procedures', description: 'Special medical procedure charges' },
  { value: 'dietary_charges', label: 'Dietary Charges', description: 'Special diet and meal charges' },
  { value: 'laundry_service', label: 'Laundry Service', description: 'Linen and laundry charges' },
  { value: 'accommodation_extra', label: 'Extra Accommodation', description: 'Additional room/bed charges' },
  { value: 'mortuary_charges', label: 'Mortuary Charges', description: 'Mortuary and preservation charges' },
  { value: 'certificate_charges', label: 'Certificate Fees', description: 'Medical certificate and report fees' },
  { value: 'photocopying', label: 'Photocopying', description: 'Document photocopying charges' },
  { value: 'misc_supplies', label: 'Miscellaneous Supplies', description: 'Other medical supplies' },
  { value: 'other', label: 'Other', description: 'Other miscellaneous charges' },
];

export async function generateOtherBillNumber(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_other_bill_number');
    
    if (error) {
      console.error('Error generating other bill number:', error);
      const yearShort = new Date().getFullYear().toString().slice(-2);
      const randomNum = Math.floor(Math.random() * 90000) + 10000;
      return `OB${yearShort}${randomNum}`;
    }
    
    return data;
  } catch (error) {
    console.error('Exception generating other bill number:', error);
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    return `OB${yearShort}${randomNum}`;
  }
}

function calculateBillAmounts(formData: OtherBillFormData) {
  const quantity = formData.quantity || 1;
  const unitPrice = formData.unit_price || 0;
  const discountPercent = formData.discount_percent || 0;
  const taxPercent = formData.tax_percent || 0;

  const subtotal = quantity * unitPrice;
  const discountAmount = (subtotal * discountPercent) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * taxPercent) / 100;
  const totalAmount = afterDiscount + taxAmount;
  const balanceAmount = totalAmount;

  return {
    subtotal,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    balance_amount: balanceAmount,
  };
}

export async function createOtherBill(
  formData: OtherBillFormData,
  userId?: string
): Promise<OtherBills['Row']> {
  try {
    const billNumber = await generateOtherBillNumber();
    const amounts = calculateBillAmounts(formData);

    const billData: any = {
      bill_number: billNumber,
      bill_date: new Date().toISOString(),
      patient_id: formData.patient_id || null,
      patient_type: formData.patient_type,
      patient_name: formData.patient_name,
      patient_phone: formData.patient_phone || null,
      charge_category: formData.charge_category,
      charge_description: formData.charge_description,
      quantity: formData.quantity,
      unit_price: formData.unit_price,
      discount_percent: formData.discount_percent || 0,
      discount_amount: amounts.discount_amount,
      subtotal: amounts.subtotal,
      tax_percent: formData.tax_percent || 0,
      tax_amount: amounts.tax_amount,
      total_amount: amounts.total_amount,
      payment_status: 'pending',
      paid_amount: 0,
      balance_amount: amounts.balance_amount,
      reference_number: formData.reference_number || null,
      remarks: formData.remarks || null,
      bed_allocation_id: formData.bed_allocation_id || null,
      encounter_id: formData.encounter_id || null,
      status: 'active',
    };

    if (userId) {
      billData.created_by = userId;
      billData.updated_by = null;
    }

    const { data, error } = await supabase
      .from('other_bills')
      .insert([billData])
      .select()
      .single();

    if (error) {
      console.error('Error creating other bill:', error);
      throw new Error(`Failed to create other bill: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Exception creating other bill:', error);
    throw error;
  }
}

export async function getOtherBills(filters?: {
  patient_id?: string;
  patient_type?: PatientType;
  payment_status?: PaymentStatus;
  charge_category?: ChargeCategory;
  from_date?: string;
  to_date?: string;
  status?: string;
}): Promise<OtherBillWithPatient[]> {
  try {
    let query = supabase
      .from('other_bills')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone),
        created_by_user:created_by(name, employee_id)
      `)
      .order('bill_date', { ascending: false });

    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }

    if (filters?.patient_type) {
      query = query.eq('patient_type', filters.patient_type);
    }

    if (filters?.payment_status) {
      query = query.eq('payment_status', filters.payment_status);
    }

    if (filters?.charge_category) {
      query = query.eq('charge_category', filters.charge_category);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.eq('status', 'active');
    }

    if (filters?.from_date) {
      query = query.gte('bill_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('bill_date', filters.to_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching other bills:', error);
      throw new Error(`Failed to fetch other bills: ${error.message}`);
    }

    return data as OtherBillWithPatient[];
  } catch (error) {
    console.error('Exception fetching other bills:', error);
    throw error;
  }
}

export async function getOtherBillById(billId: string): Promise<OtherBillWithPatient | null> {
  try {
    const { data, error } = await supabase
      .from('other_bills')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone),
        created_by_user:created_by(name, employee_id)
      `)
      .eq('id', billId)
      .single();

    if (error) {
      console.error('Error fetching other bill:', error);
      throw new Error(`Failed to fetch other bill: ${error.message}`);
    }

    return data as OtherBillWithPatient;
  } catch (error) {
    console.error('Exception fetching other bill:', error);
    return null;
  }
}

export async function updateOtherBill(
  billId: string,
  updates: Partial<OtherBillFormData>,
  userId?: string
): Promise<OtherBills['Row']> {
  try {
    const currentBill = await getOtherBillById(billId);
    if (!currentBill) {
      throw new Error('Bill not found');
    }

    const mergedData: OtherBillFormData = {
      patient_id: updates.patient_id ?? currentBill.patient_id ?? undefined,
      patient_type: updates.patient_type ?? currentBill.patient_type,
      patient_name: updates.patient_name ?? currentBill.patient_name,
      patient_phone: updates.patient_phone ?? currentBill.patient_phone ?? undefined,
      charge_category: updates.charge_category ?? currentBill.charge_category,
      charge_description: updates.charge_description ?? currentBill.charge_description,
      quantity: updates.quantity ?? currentBill.quantity,
      unit_price: updates.unit_price ?? currentBill.unit_price,
      discount_percent: updates.discount_percent ?? currentBill.discount_percent,
      tax_percent: updates.tax_percent ?? currentBill.tax_percent,
      reference_number: updates.reference_number ?? currentBill.reference_number ?? undefined,
      remarks: updates.remarks ?? currentBill.remarks ?? undefined,
      bed_allocation_id: updates.bed_allocation_id ?? currentBill.bed_allocation_id ?? undefined,
      encounter_id: updates.encounter_id ?? currentBill.encounter_id ?? undefined,
    };

    const amounts = calculateBillAmounts(mergedData);

    const updateData: Partial<OtherBills['Row']> = {
      ...updates,
      discount_amount: amounts.discount_amount,
      subtotal: amounts.subtotal,
      tax_amount: amounts.tax_amount,
      total_amount: amounts.total_amount,
      balance_amount: amounts.total_amount - currentBill.paid_amount,
      updated_by: userId || null,
    };

    const { data, error } = await supabase
      .from('other_bills')
      .update(updateData)
      .eq('id', billId)
      .select()
      .single();

    if (error) {
      console.error('Error updating other bill:', error);
      throw new Error(`Failed to update other bill: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Exception updating other bill:', error);
    throw error;
  }
}

export async function recordPayment(
  billId: string,
  paymentData: {
    payment_method: OtherBillPayments['Row']['payment_method'];
    payment_amount: number;
    transaction_reference?: string;
    bank_name?: string;
    cheque_number?: string;
    cheque_date?: string;
    notes?: string;
  },
  userId?: string
): Promise<void> {
  try {
    const bill = await getOtherBillById(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    const paymentRecord: OtherBillPayments['Insert'] = {
      bill_id: billId,
      payment_date: new Date().toISOString(),
      payment_method: paymentData.payment_method,
      payment_amount: paymentData.payment_amount,
      transaction_reference: paymentData.transaction_reference || null,
      bank_name: paymentData.bank_name || null,
      cheque_number: paymentData.cheque_number || null,
      cheque_date: paymentData.cheque_date || null,
      notes: paymentData.notes || null,
      received_by: userId || null,
    };

    const { error: paymentError } = await supabase
      .from('other_bill_payments')
      .insert([paymentRecord]);

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      throw new Error(`Failed to record payment: ${paymentError.message}`);
    }

    const newPaidAmount = bill.paid_amount + paymentData.payment_amount;
    const newBalanceAmount = bill.total_amount - newPaidAmount;
    
    let newPaymentStatus: PaymentStatus = 'pending';
    if (newPaidAmount >= bill.total_amount) {
      newPaymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'partial';
    }

    const { error: updateError } = await supabase
      .from('other_bills')
      .update({
        paid_amount: newPaidAmount,
        balance_amount: Math.max(0, newBalanceAmount),
        payment_status: newPaymentStatus,
        updated_by: userId || null,
      })
      .eq('id', billId);

    if (updateError) {
      console.error('Error updating bill payment status:', updateError);
      throw new Error(`Failed to update bill: ${updateError.message}`);
    }
  } catch (error) {
    console.error('Exception recording payment:', error);
    throw error;
  }
}

export async function getPaymentHistory(billId: string): Promise<OtherBillPayments['Row'][]> {
  try {
    const { data, error } = await supabase
      .from('other_bill_payments')
      .select(`
        *,
        received_by_user:received_by(name, employee_id)
      `)
      .eq('bill_id', billId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching payment history:', error);
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching payment history:', error);
    return [];
  }
}

export async function cancelOtherBill(billId: string, userId?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('other_bills')
      .update({
        status: 'cancelled',
        payment_status: 'cancelled',
        updated_by: userId || null,
      })
      .eq('id', billId);

    if (error) {
      console.error('Error cancelling bill:', error);
      throw new Error(`Failed to cancel bill: ${error.message}`);
    }
  } catch (error) {
    console.error('Exception cancelling bill:', error);
    throw error;
  }
}

export async function getOtherBillsStats(): Promise<{
  total_bills: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  by_category: Record<string, { count: number; amount: number }>;
  by_patient_type: Record<string, { count: number; amount: number }>;
}> {
  try {
    const { data: bills, error } = await supabase
      .from('other_bills')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching stats:', error);
      throw new Error(`Failed to fetch stats: ${error.message}`);
    }

    const stats = {
      total_bills: bills?.length || 0,
      total_amount: 0,
      paid_amount: 0,
      pending_amount: 0,
      by_category: {} as Record<string, { count: number; amount: number }>,
      by_patient_type: {} as Record<string, { count: number; amount: number }>,
    };

    bills?.forEach((bill) => {
      stats.total_amount += bill.total_amount;
      stats.paid_amount += bill.paid_amount;
      stats.pending_amount += bill.balance_amount;

      if (!stats.by_category[bill.charge_category]) {
        stats.by_category[bill.charge_category] = { count: 0, amount: 0 };
      }
      stats.by_category[bill.charge_category].count += 1;
      stats.by_category[bill.charge_category].amount += bill.total_amount;

      if (!stats.by_patient_type[bill.patient_type]) {
        stats.by_patient_type[bill.patient_type] = { count: 0, amount: 0 };
      }
      stats.by_patient_type[bill.patient_type].count += 1;
      stats.by_patient_type[bill.patient_type].amount += bill.total_amount;
    });

    return stats;
  } catch (error) {
    console.error('Exception fetching stats:', error);
    throw error;
  }
}
