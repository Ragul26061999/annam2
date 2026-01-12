import { supabase } from './supabase';

// Diagnostic billing interfaces
export interface DiagnosticBillingItem {
  id: string;
  patient_id: string;
  order_type: 'lab' | 'radiology';
  order_id: string;
  bill_number: string;
  test_name: string;
  amount: number;
  total_amount?: number;
  billing_status: 'pending' | 'partial' | 'paid' | 'cancelled';
  paid_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticBillSummary {
  bill_number: string;
  patient_id: string;
  patient_name?: string;
  patient_uhid?: string;
  order_type: 'lab' | 'radiology';
  total_amount: number;
  paid_amount: number;
  billing_status: 'pending' | 'partial' | 'paid' | 'cancelled';
  created_at: string;
  items: DiagnosticBillingItem[];
}

export interface DiagnosticBillingStats {
  totalBills: number;
  totalRevenue: number;
  pendingBills: number;
  paidBills: number;
  labBills: number;
  radiologyBills: number;
}

/**
 * Get diagnostic bills with optional filtering
 */
export async function getDiagnosticBills(filters?: {
  patient_id?: string;
  billing_status?: string;
  order_type?: string;
  patientSearch?: string;
}): Promise<DiagnosticBillSummary[]> {
  try {
    let query = supabase
      .from('diagnostic_billing_items')
      .select(`
        *,
        patients!diagnostic_billing_items_patient_id_fkey (
          name,
          patient_id
        )
      `);

    // Apply filters
    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }
    if (filters?.billing_status) {
      query = query.eq('billing_status', filters.billing_status);
    }
    if (filters?.order_type) {
      query = query.eq('order_type', filters.order_type);
    }
    if (filters?.patientSearch) {
      query = query.or(`patients.name.ilike.%${filters.patientSearch}%,patients.patient_id.ilike.%${filters.patientSearch}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching diagnostic bills:', error);
      throw error;
    }

    // Group by bill_number to create summaries
    const billMap = new Map<string, DiagnosticBillSummary>();

    data.forEach((item: any) => {
      const billNumber = item.bill_number;
      
      if (!billMap.has(billNumber)) {
        billMap.set(billNumber, {
          bill_number: billNumber,
          patient_id: item.patient_id,
          patient_name: item.patients?.name,
          patient_uhid: item.patients?.patient_id,
          order_type: item.order_type,
          total_amount: item.total_amount || item.amount,
          paid_amount: item.paid_amount || 0,
          billing_status: item.billing_status,
          created_at: item.created_at,
          items: []
        });
      }

      const summary = billMap.get(billNumber)!;
      summary.items.push({
        id: item.id,
        patient_id: item.patient_id,
        order_type: item.order_type,
        order_id: item.order_id,
        bill_number: item.bill_number,
        test_name: item.test_name,
        amount: item.amount,
        total_amount: item.total_amount,
        billing_status: item.billing_status,
        paid_amount: item.paid_amount,
        created_at: item.created_at,
        updated_at: item.updated_at
      });
    });

    return Array.from(billMap.values());
  } catch (error) {
    console.error('Error in getDiagnosticBills:', error);
    return [];
  }
}

/**
 * Update diagnostic bill payment
 */
export async function updateDiagnosticBillPayment(
  billNumber: string, 
  paymentData: {
    payment_method: string;
    amount: number;
    reference?: string;
  }
): Promise<DiagnosticBillSummary | null> {
  try {
    // Get all items for this bill
    const { data: items, error: fetchError } = await supabase
      .from('diagnostic_billing_items')
      .select('*')
      .eq('bill_number', billNumber);

    if (fetchError) {
      console.error('Error fetching bill items:', fetchError);
      throw fetchError;
    }

    if (!items || items.length === 0) {
      throw new Error('Bill not found');
    }

    // Calculate new paid amount
    const currentPaid = items.reduce((sum, item) => sum + (item.paid_amount || 0), 0);
    const newPaidAmount = currentPaid + paymentData.amount;

    // Determine new status
    const totalAmount = items.reduce((sum, item) => sum + (item.total_amount || item.amount), 0);
    const newStatus = newPaidAmount >= totalAmount ? 'paid' : 
                     newPaidAmount > 0 ? 'partial' : 'pending';

    // Update all items for this bill
    const updatePromises = items.map(item =>
      supabase
        .from('diagnostic_billing_items')
        .update({
          paid_amount: (item.paid_amount || 0) + (paymentData.amount * (item.amount / totalAmount)),
          billing_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
    );

    await Promise.all(updatePromises);

    // Return updated summary
    const updatedBills = await getDiagnosticBills();
    return updatedBills.find(bill => bill.bill_number === billNumber) || null;
  } catch (error) {
    console.error('Error in updateDiagnosticBillPayment:', error);
    throw error;
  }
}

/**
 * Get diagnostic billing statistics
 */
export async function getDiagnosticBillingStats(): Promise<DiagnosticBillingStats> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_billing_items')
      .select('amount, total_amount, billing_status, order_type, bill_number, paid_amount');

    if (error) {
      console.error('Error fetching diagnostic billing stats:', error);
      throw error;
    }

    // Group by bill_number to avoid double counting
    const billMap = new Map<string, {
      total_amount: number;
      paid_amount: number;
      billing_status: string;
      order_type: string;
    }>();

    data.forEach(item => {
      if (!billMap.has(item.bill_number)) {
        billMap.set(item.bill_number, {
          total_amount: item.total_amount || item.amount,
          paid_amount: item.paid_amount || 0,
          billing_status: item.billing_status,
          order_type: item.order_type
        });
      }
    });

    const bills = Array.from(billMap.values());
    
    return {
      totalBills: bills.length,
      totalRevenue: bills.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0),
      pendingBills: bills.filter(bill => bill.billing_status === 'pending').length,
      paidBills: bills.filter(bill => bill.billing_status === 'paid').length,
      labBills: bills.filter(bill => bill.order_type === 'lab').length,
      radiologyBills: bills.filter(bill => bill.order_type === 'radiology').length
    };
  } catch (error) {
    console.error('Error in getDiagnosticBillingStats:', error);
    return {
      totalBills: 0,
      totalRevenue: 0,
      pendingBills: 0,
      paidBills: 0,
      labBills: 0,
      radiologyBills: 0
    };
  }
}

/**
 * Get hospital details for billing
 */
export async function getHospitalDetails() {
  try {
    const { data, error } = await supabase
      .from('hospital_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching hospital details:', error);
      throw error;
    }

    return data || {
      name: 'Annam Hospital',
      address: '123 Hospital Road, Chennai, Tamil Nadu 600001',
      contact_number: '+91 44 1234 5678',
      gst_number: '33AAAPL1234C1ZV',
      department: 'Laboratory & Radiology Services'
    };
  } catch (error) {
    console.error('Error in getHospitalDetails:', error);
    return {
      name: 'Annam Hospital',
      address: '123 Hospital Road, Chennai, Tamil Nadu 600001',
      contact_number: '+91 44 1234 5678',
      gst_number: '33AAAPL1234C1ZV',
      department: 'Laboratory & Radiology Services'
    };
  }
}

/**
 * Generate diagnostic bill number
 */
export function generateDiagnosticBillNumber(orderType: 'lab' | 'radiology'): string {
  const prefix = orderType === 'lab' ? 'LB' : 'RB';
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${dateStr}${random}`;
}
