import { supabase } from './supabase';

export interface PaymentSplit {
  id: string;
  mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque';
  amount: number;
  reference?: string;
  bankName?: string;
  chequeNumber?: string;
}

export interface PaymentData {
  totalAmount: number;
  splits: PaymentSplit[];
  paymentDate: string;
  notes?: string;
  patientId?: string;
  patientName?: string;
  billId?: string;
  source?: 'billing' | 'pharmacy' | 'lab' | 'radiology' | 'diagnostic' | 'outpatient' | 'other_bills';
}

/**
 * Record payment for billing records (IP billing, pharmacy, lab, radiology, etc.)
 */
export async function recordBillingPayment(paymentData: PaymentData) {
  try {
    console.log('Starting recordBillingPayment with data:', JSON.stringify(paymentData, null, 2));
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Authentication error: ${authError.message}`);
    }
    if (!user) {
      throw new Error('User not authenticated');
    }
    console.log('User authenticated:', user.id);

    // Record each payment split
    const paymentRecords = [];
    
    for (const split of paymentData.splits) {
      console.log('Processing split:', split);
      
      const bedAllocationId = paymentData.billId ? await getBedAllocationIdFromBill(paymentData.billId) : null;
      const patientId = paymentData.patientId ? await getPatientIdFromId(paymentData.patientId) : null;
      
      console.log('Mapped IDs - bed_allocation_id:', bedAllocationId, 'patient_id:', patientId);
      
      const paymentRecord = {
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        payment_type: split.mode === 'bank_transfer' ? 'net_banking' : split.mode,
        amount: split.amount,
        reference_number: split.reference || null,
        notes: paymentData.notes || null,
        payment_date: paymentData.paymentDate,
        created_by: user.id
      };
      
      console.log('Payment record to insert:', JSON.stringify(paymentRecord, null, 2));
      
      const { data, error } = await supabase
        .from('ip_payment_receipts')
        .insert([paymentRecord])
        .select();
        
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('Payment recorded successfully:', data);
      paymentRecords.push(data[0]);
    }

    // Update billing record payment status
    if (paymentData.billId && paymentData.source) {
      await updateBillingPaymentStatus(paymentData.billId, paymentData.totalAmount, paymentData.source);
    }

    return paymentRecords;
  } catch (error) {
    console.error('Error in recordBillingPayment:', error);
    throw error;
  }
}

/**
 * Record payment for other bills
 */
export async function recordOtherBillPayment(paymentData: PaymentData) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Record each payment split
    const paymentRecords = [];
    
    for (const split of paymentData.splits) {
      const paymentRecord = {
        bill_id: paymentData.billId,
        payment_date: paymentData.paymentDate,
        payment_method: split.mode === 'bank_transfer' ? 'net_banking' : split.mode,
        payment_amount: split.amount,
        transaction_reference: split.reference || null,
        bank_name: split.bankName || null,
        cheque_number: split.chequeNumber || null,
        notes: paymentData.notes || null,
        received_by: user.id
      };
      
      const { data, error } = await supabase
        .from('other_bill_payments')
        .insert([paymentRecord])
        .select();
        
      if (error) {
        console.error('Error recording other bill payment split:', error);
        throw error;
      }
      
      paymentRecords.push(data[0]);
    }

    // Update other bill payment status
    if (paymentData.billId) {
      await updateOtherBillPaymentStatus(paymentData.billId, paymentData.totalAmount);
    }

    return paymentRecords;
  } catch (error) {
    console.error('Error in recordOtherBillPayment:', error);
    throw error;
  }
}

/**
 * Get bed allocation ID from bill ID
 */
async function getBedAllocationIdFromBill(billId: string): Promise<string | null> {
  try {
    console.log('Getting bed allocation ID for billId:', billId);
    
    // Try to get from billing table first
    const { data: billingData, error: billingError } = await supabase
      .from('billing')
      .select('bed_allocation_id')
      .eq('id', billId)
      .single();
    
    if (billingError) {
      console.log('Billing table query error:', billingError);
    } else if (billingData?.bed_allocation_id) {
      console.log('Found bed allocation ID from billing table:', billingData.bed_allocation_id);
      return billingData.bed_allocation_id;
    }

    // Try to get from other_bills table
    const { data: otherBillData, error: otherBillError } = await supabase
      .from('other_bills')
      .select('bed_allocation_id')
      .eq('id', billId)
      .single();
    
    if (otherBillError) {
      console.log('Other bills table query error:', otherBillError);
    } else if (otherBillData?.bed_allocation_id) {
      console.log('Found bed allocation ID from other bills table:', otherBillData.bed_allocation_id);
      return otherBillData.bed_allocation_id;
    }
    
    console.log('No bed allocation ID found for bill:', billId);
    return null;
  } catch (error) {
    console.error('Error getting bed allocation ID:', error);
    return null;
  }
}

/**
 * Get patient UUID from patient ID string
 */
async function getPatientIdFromId(patientId: string): Promise<string | null> {
  try {
    console.log('Getting patient UUID for patientId:', patientId);
    
    const { data, error } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_id', patientId)
      .single();
    
    if (error) {
      console.log('Patient query error:', error);
      return null;
    }
    
    console.log('Found patient UUID:', data?.id);
    return data?.id || null;
  } catch (error) {
    console.error('Error getting patient ID:', error);
    return null;
  }
}

/**
 * Update billing record payment status
 */
async function updateBillingPaymentStatus(billId: string, paymentAmount: number, source: string) {
  try {
    // Get current billing record
    const { data: currentBill } = await supabase
      .from('billing')
      .select('total_amount, amount_paid')
      .eq('id', billId)
      .single();
    
    if (!currentBill) {
      console.warn('Billing record not found:', billId);
      return;
    }

    const newPaidAmount = (currentBill.amount_paid || 0) + paymentAmount;
    const remainingAmount = currentBill.total_amount - newPaidAmount;
    
    let paymentStatus = 'partial';
    if (remainingAmount <= 0) {
      paymentStatus = 'paid';
    } else if (newPaidAmount === 0) {
      paymentStatus = 'pending';
    }

    // Update billing record
    const { error } = await supabase
      .from('billing')
      .update({
        amount_paid: newPaidAmount,
        payment_status: paymentStatus,
        payment_date: new Date().toISOString()
      })
      .eq('id', billId);

    if (error) {
      console.error('Error updating billing status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateBillingPaymentStatus:', error);
    throw error;
  }
}

/**
 * Update other bill payment status
 */
async function updateOtherBillPaymentStatus(billId: string, paymentAmount: number) {
  try {
    // Get current other bill record
    const { data: currentBill } = await supabase
      .from('other_bills')
      .select('total_amount, paid_amount')
      .eq('id', billId)
      .single();
    
    if (!currentBill) {
      console.warn('Other bill record not found:', billId);
      return;
    }

    const newPaidAmount = (currentBill.paid_amount || 0) + paymentAmount;
    const remainingAmount = currentBill.total_amount - newPaidAmount;
    
    let paymentStatus = 'partial';
    if (remainingAmount <= 0) {
      paymentStatus = 'paid';
    } else if (newPaidAmount === 0) {
      paymentStatus = 'pending';
    }

    // Update other bill record
    const { error } = await supabase
      .from('other_bills')
      .update({
        paid_amount: newPaidAmount,
        balance_amount: remainingAmount,
        payment_status: paymentStatus
      })
      .eq('id', billId);

    if (error) {
      console.error('Error updating other bill status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateOtherBillPaymentStatus:', error);
    throw error;
  }
}

/**
 * Get payment history for a bill
 */
export async function getPaymentHistory(billId: string, source: 'billing' | 'other_bills') {
  try {
    if (source === 'billing') {
      const { data, error } = await supabase
        .from('ip_payment_receipts')
        .select(`
          *,
          created_by:users(name),
          patient:patients(name, patient_id)
        `)
        .eq('bed_allocation_id', billId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('other_bill_payments')
        .select(`
          *,
          received_by:users(name),
          other_bills!inner(patient:patients(name, patient_id))
        `)
        .eq('bill_id', billId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error getting payment history:', error);
    throw error;
  }
}
