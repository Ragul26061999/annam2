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

    // For non-inpatient bills, use other_bill_payments table instead
    if (paymentData.source !== 'billing') {
      console.log('Non-inpatient bill, using recordOtherBillPayment instead');
      return await recordOtherBillPayment(paymentData);
    }

    // Check if this is an IP billing record (has bed allocation) or general billing
    const bedAllocationId = paymentData.billId ? await getBedAllocationIdFromBill(paymentData.billId) : null;
    const patientId = paymentData.patientId ? await getPatientIdFromId(paymentData.patientId) : null;
    
    console.log('Mapped IDs - bed_allocation_id:', bedAllocationId, 'patient_id:', patientId);
    
    // Record each payment split
    const paymentRecords = [];
    
    for (const split of paymentData.splits) {
      console.log('Processing split:', split);
      
      // If it has bed allocation, record to ip_payment_receipts
      // If no bed allocation, record to other_bill_payments (general billing)
      let paymentRecord;
      let tableName;
      
      if (bedAllocationId) {
        // IP billing - use ip_payment_receipts table
        paymentRecord = {
          bed_allocation_id: bedAllocationId,
          patient_id: patientId,
          payment_type: split.mode === 'bank_transfer' ? 'net_banking' : split.mode,
          amount: split.amount,
          reference_number: split.reference || null,
          notes: paymentData.notes || null,
          payment_date: paymentData.paymentDate,
          created_by: user.id
        };
        tableName = 'ip_payment_receipts';
      } else {
        // General billing - create other_bills record if needed and use other_bill_payments table
        let otherBillId = paymentData.billId;
        
        // If billId doesn't exist in other_bills table, create a record
        try {
          const { data: existingBill } = await supabase
            .from('other_bills')
            .select('id')
            .eq('id', paymentData.billId)
            .single();
          
          if (!existingBill) {
            console.log('Creating other_bills record for general billing');
            otherBillId = await createOtherBillRecord(paymentData);
          }
        } catch (error) {
          console.log('Bill not found in other_bills, creating new record');
          otherBillId = await createOtherBillRecord(paymentData);
        }
        
        paymentRecord = {
          bill_id: otherBillId,
          payment_date: paymentData.paymentDate,
          payment_method: split.mode === 'bank_transfer' ? 'net_banking' : split.mode,
          payment_amount: split.amount,
          transaction_reference: split.reference || null,
          bank_name: split.bankName || null,
          cheque_number: split.chequeNumber || null,
          notes: paymentData.notes || null,
          received_by: user.id
        };
        tableName = 'other_bill_payments';
      }
      
      console.log(`Payment record to insert into ${tableName}:`, JSON.stringify(paymentRecord, null, 2));
      
      const { data, error } = await supabase
        .from(tableName)
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
      if (bedAllocationId) {
        // Update main billing table for IP billing
        await updateBillingPaymentStatus(paymentData.billId, paymentData.totalAmount, paymentData.source);
      } else {
        // Update other_bills table for general billing
        await updateOtherBillPaymentStatus(paymentData.billId, paymentData.totalAmount);
      }
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
      // If billing table doesn't have this record, check if it's a general billing record
      // that should be treated as other_bills
      console.log('Billing record not found, treating as general billing');
      return null;
    } else if (billingData?.bed_allocation_id) {
      console.log('Found bed allocation ID from billing table:', billingData.bed_allocation_id);
      return billingData.bed_allocation_id;
    }

    console.log('No bed allocation ID found for bill:', billId, 'treating as general billing');
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
 * Create other_bills record for general billing if it doesn't exist
 */
async function createOtherBillRecord(paymentData: PaymentData): Promise<string> {
  try {
    console.log('Creating other_bills record for bill:', paymentData.billId);
    
    const otherBillRecord = {
      bill_number: paymentData.billId || `GB${Date.now()}`,
      patient_id: paymentData.patientId ? await getPatientIdFromId(paymentData.patientId) : null,
      patient_name: paymentData.patientName || 'Unknown',
      patient_phone: null,
      charge_category: 'other',
      charge_description: 'General Billing Services',
      quantity: 1,
      unit_price: paymentData.totalAmount,
      discount_percent: 0,
      discount_amount: 0,
      subtotal: paymentData.totalAmount,
      tax_percent: 0,
      tax_amount: 0,
      total_amount: paymentData.totalAmount,
      payment_status: 'pending',
      paid_amount: 0,
      balance_amount: paymentData.totalAmount,
      reference_number: null,
      remarks: paymentData.notes || null,
      bed_allocation_id: null,
      encounter_id: null,
      created_by: null,
      status: 'active'
    };
    
    const { data, error } = await supabase
      .from('other_bills')
      .insert([otherBillRecord])
      .select('id')
      .single();
      
    if (error) {
      console.error('Error creating other_bills record:', error);
      throw error;
    }
    
    console.log('Created other_bills record with ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error in createOtherBillRecord:', error);
    throw error;
  }
}

/**
 * Update billing record payment status
 */
async function updateBillingPaymentStatus(billId: string, paymentAmount: number, source: string) {
  try {
    console.log('Updating billing status for billId:', billId, 'amount:', paymentAmount, 'source:', source);
    
    if (source === 'billing') {
      // Update main billing table
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

      console.log('Updating billing record with status:', paymentStatus, 'paid:', newPaidAmount);
      
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
    } else {
      // For other bill types, update other_bills table
      await updateOtherBillPaymentStatus(billId, paymentAmount);
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
    console.log('Updating other bill status for billId:', billId, 'amount:', paymentAmount);
    
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

    console.log('Updating other bill record with status:', paymentStatus, 'paid:', newPaidAmount, 'remaining:', remainingAmount);
    
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
