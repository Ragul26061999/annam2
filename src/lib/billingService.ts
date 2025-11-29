import { supabase } from './supabase';

export interface BillingItem {
  id?: string;
  description: string;
  quantity: number;
  unit_amount: number;
  total_amount: number;
  line_type: 'service' | 'medication' | 'procedure' | 'consultation' | 'scan' | 'lab_test';
}

export interface BillingData {
  patient_id: string;
  encounter_id?: string;
  bill_number?: string;
  items: BillingItem[];
  total_amount: number;
  paid_amount?: number;
  status?: 'pending' | 'partial' | 'paid' | 'cancelled';
}

export interface Bill {
  id: string;
  patient_id: string;
  encounter_id?: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
  items?: BillingItem[];
  patient?: any;
}

/**
 * Generate a unique bill number
 * New Format: AP{YY}{Sequential}
 *   - Prefix "AP" for pharmacy
 *   - {YY} = last two digits of the year (e.g., 2025 -> 25)
 *   - {Sequential} = 5‑digit zero-padded running number for that year
 * Example: AP2500001, AP2500002, ...
 */
export async function generateBillNumber(): Promise<string> {
  const now = new Date();
  const fullYear = now.getFullYear().toString();
  const yearShort = fullYear.slice(-2); // e.g. "2025" -> "25"
  const prefix = `AP${yearShort}`;

  try {
    // Count existing bills for this year to get a simple linear sequence
    const { count, error } = await supabase
      .from('billing')
      .select('id', { count: 'exact', head: true })
      .like('bill_number', `${prefix}%`);

    if (error) {
      console.error('Error getting bill count for bill number generation:', error);
      throw new Error('Failed to generate bill number');
    }

    const sequence = ((count || 0) + 1).toString().padStart(5, '0');
    return `${prefix}${sequence}`;
  } catch (error) {
    console.error('Error generating bill number:', error);
    throw error;
  }
}

/**
 * Create a bill for an appointment/encounter
 */
export async function createBill(billingData: BillingData): Promise<Bill> {
  try {
    // Generate bill number if not provided
    const billNumber = billingData.bill_number || await generateBillNumber();
    
    // Calculate total amount from items
    const totalAmount = billingData.items.reduce((sum, item) => sum + item.total_amount, 0);
    
    // Create billing record
    const billingRecord = {
      patient_id: billingData.patient_id,
      encounter_id: billingData.encounter_id,
      bill_number: billNumber,
      bill_date: new Date().toISOString(),
      total_amount: totalAmount,
      paid_amount: billingData.paid_amount || 0,
      status: billingData.status || 'pending'
    };

    const { data: bill, error: billError } = await supabase
      .from('billing')
      .insert([billingRecord])
      .select()
      .single();

    if (billError) {
      console.error('Error creating bill:', billError);
      throw new Error(`Failed to create bill: ${billError.message}`);
    }

    // Create billing items
    const billingItems = billingData.items.map(item => ({
      billing_id: bill.id,
      description: item.description,
      qty: item.quantity,
      unit_amount: item.unit_amount,
      total_amount: item.total_amount,
      line_type: item.line_type
    }));

    const { error: itemsError } = await supabase
      .from('billing_item')
      .insert(billingItems);

    if (itemsError) {
      console.error('Error creating billing items:', itemsError);
      // Rollback bill creation
      await supabase.from('billing').delete().eq('id', bill.id);
      throw new Error(`Failed to create billing items: ${itemsError.message}`);
    }

    // Fetch complete bill with items
    return await getBillById(bill.id);
  } catch (error) {
    console.error('Error creating bill:', error);
    throw error;
  }
}

/**
 * Get bill by ID with items
 */
export async function getBillById(billId: string): Promise<Bill> {
  try {
    // Fetch bill
    const { data: bill, error: billError } = await supabase
      .from('billing')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email)
      `)
      .eq('id', billId)
      .single();

    if (billError) {
      console.error('Error fetching bill:', billError);
      throw new Error(`Bill not found: ${billError.message}`);
    }

    // Fetch billing items
    const { data: items, error: itemsError } = await supabase
      .from('billing_item')
      .select('*')
      .eq('billing_id', billId);

    if (itemsError) {
      console.error('Error fetching billing items:', itemsError);
    }

    return {
      ...bill,
      items: items?.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.qty,
        unit_amount: item.unit_amount,
        total_amount: item.total_amount,
        line_type: item.line_type
      })) || []
    };
  } catch (error) {
    console.error('Error fetching bill:', error);
    throw error;
  }
}

/**
 * Get bills for a patient
 */
export async function getPatientBills(patientId: string): Promise<Bill[]> {
  try {
    const { data: bills, error } = await supabase
      .from('billing')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email)
      `)
      .eq('patient_id', patientId)
      .order('bill_date', { ascending: false });

    if (error) {
      console.error('Error fetching patient bills:', error);
      throw new Error(`Failed to fetch patient bills: ${error.message}`);
    }

    return bills || [];
  } catch (error) {
    console.error('Error fetching patient bills:', error);
    throw error;
  }
}

/**
 * Update bill payment
 */
export async function updateBillPayment(
  billId: string,
  paidAmount: number,
  paymentMethod?: string
): Promise<Bill> {
  try {
    // Get current bill
    const bill = await getBillById(billId);
    
    const newPaidAmount = bill.paid_amount + paidAmount;
    const newStatus = newPaidAmount >= bill.total_amount ? 'paid' : 
                      newPaidAmount > 0 ? 'partial' : 'pending';

    const { data: updatedBill, error } = await supabase
      .from('billing')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus
      })
      .eq('id', billId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bill payment:', error);
      throw new Error(`Failed to update bill payment: ${error.message}`);
    }

    return await getBillById(billId);
  } catch (error) {
    console.error('Error updating bill payment:', error);
    throw error;
  }
}

/**
 * Create bill for appointment completion
 * Includes consultation fee and any additional services
 */
export async function createAppointmentBill(
  appointmentId: string,
  patientId: string,
  doctorId: string,
  encounterId?: string,
  additionalItems: BillingItem[] = []
): Promise<Bill> {
  try {
    // Get doctor's consultation fee
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('consultation_fee, specialization, user:users(name)')
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctor) {
      throw new Error('Failed to fetch doctor information');
    }

    const consultationFee = doctor.consultation_fee || 500; // Default fee
    const doctorName = (doctor.user && Array.isArray(doctor.user) && doctor.user.length > 0) 
      ? doctor.user[0].name 
      : 'Doctor';
    const specialization = doctor.specialization || 'General';

    // Create billing items
    const items: BillingItem[] = [
      {
        description: `Consultation - ${doctorName} (${specialization})`,
        quantity: 1,
        unit_amount: consultationFee,
        total_amount: consultationFee,
        line_type: 'consultation'
      },
      ...additionalItems
    ];

    // Create bill
    return await createBill({
      patient_id: patientId,
      encounter_id: encounterId,
      items,
      total_amount: items.reduce((sum, item) => sum + item.total_amount, 0),
      status: 'pending'
    });
  } catch (error) {
    console.error('Error creating appointment bill:', error);
    throw error;
  }
}

/**
 * Get billing statistics
 */
export async function getBillingStats(): Promise<{
  totalBills: number;
  totalRevenue: number;
  pendingAmount: number;
  paidAmount: number;
}> {
  try {
    const { data: bills, error } = await supabase
      .from('billing')
      .select('total_amount, paid_amount, status');

    if (error) {
      console.error('Error fetching billing stats:', error);
      throw new Error(`Failed to fetch billing stats: ${error.message}`);
    }

    const stats = {
      totalBills: bills?.length || 0,
      totalRevenue: bills?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0,
      pendingAmount: bills?.filter(b => b.status === 'pending' || b.status === 'partial')
        .reduce((sum, bill) => sum + (Number(bill.total_amount) - Number(bill.paid_amount)), 0) || 0,
      paidAmount: bills?.reduce((sum, bill) => sum + Number(bill.paid_amount), 0) || 0
    };

    return stats;
  } catch (error) {
    console.error('Error fetching billing stats:', error);
    throw error;
  }
}
