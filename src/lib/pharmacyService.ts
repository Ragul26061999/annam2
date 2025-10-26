import { supabase } from './supabase';

// =====================================================
// INTERFACES AND TYPES
// =====================================================

export interface Medication {
  id: string;
  medicine_code: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  dosage_form: string;
  strength: string;
  unit: string;
  total_stock: number;
  available_stock: number;
  minimum_stock_level: number;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  prescription_required: boolean;
  storage_conditions?: string;
  side_effects?: string;
  status: 'active' | 'inactive' | 'discontinued';
  location?: string;
  barcode?: string;
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: string;
  medication_id: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'expired';
  quantity: number;
  unit_price: number;
  // total_amount is generated/calculated in DB; treat as optional/nullable in the client
  total_amount?: number | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  supplier_id?: string | null;
  notes?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  performed_by?: string | null;
  transaction_date?: string | null;
  created_at: string;
}

export interface MedicationHistory {
  id: string;
  patient_id: string;
  medication_name: string;
  generic_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribed_date: string;
  dispensed_date?: string;
  prescribed_by: string;
  dispensed_by?: string;
  status: 'prescribed' | 'dispensed' | 'completed' | 'discontinued';
  total_amount?: number;
  payment_status?: string;
}

export interface PharmacyBilling {
  id: string;
  bill_number: string;
  patient_id: string;
  patient_name?: string;
  items: PharmacyBillItem[];
  subtotal: number;
  discount: number;
  tax_amount: number;
  tax_rate: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'insurance' | 'online';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PharmacyBillItem {
  id?: string;
  medication_id: string;
  medication_name?: string;
  batch_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch_number?: string;
  expiry_date?: string;
}

// Batch purchase history entry for inventory UI
export interface BatchPurchaseHistoryEntry {
  bill_id: string;
  bill_number: string;
  purchased_at: string;
  patient_id: string;
  // Display name for UI. For registered patients, this is the patient name.
  // For walk-in customers, this will be the bill's patient_name (if present) or 'Walk-in Customer'.
  patient_name: string;
  // Optional UHID for registered patients (patients.patient_id). Not set for walk-ins.
  patient_uhid?: string;
  medication_id: string;
  medication_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_status: string;
}

export interface PrescriptionDispensing {
  id: string;
  prescription_id: string;
  medication_id: string;
  quantity_prescribed: number;
  quantity_dispensed: number;
  dispensed_by: string;
  dispensed_at: string;
  notes?: string;
  status: 'pending' | 'partial' | 'complete';
}

// =====================================================
// MEDICATION MANAGEMENT
// =====================================================

export async function getMedications(filters?: {
  category?: string;
  prescription_required?: boolean;
  search?: string;
  status?: string;
}): Promise<Medication[]> {
  try {
    let query = supabase
      .from('medications')
      .select('*');

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.prescription_required !== undefined) {
      query = query.eq('prescription_required', filters.prescription_required);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,generic_name.ilike.%${filters.search}%,medicine_code.ilike.%${filters.search}%`);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query.order('name');

    if (error) {
      console.error('Error fetching medications - Details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMedications:', error);
    return [];
  }
}

export async function getMedicationById(id: string): Promise<Medication | null> {
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching medication by ID:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getMedicationById:', error);
    throw error;
  }
}

export async function getLowStockMedications(): Promise<Medication[]> {
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .filter('available_stock', 'lt', 'minimum_stock_level')
      .eq('status', 'active')
      .order('available_stock', { ascending: true });

    if (error) {
      console.error('Error fetching low stock medications:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLowStockMedications:', error);
    throw error;
  }
}

// =====================================================
// STOCK MANAGEMENT
// =====================================================

export async function addStock(
  medicationId: string,
  quantity: number,
  unitPrice: number,
  supplierName?: string,
  batchNumber?: string,
  expiryDate?: string,
  notes?: string,
  performedBy?: string
): Promise<StockTransaction> {
  try {
    const { data, error } = await supabase
      .from('stock_transactions')
      .insert({
        medication_id: medicationId,
        transaction_type: 'purchase',
        quantity,
        unit_price: unitPrice,
        batch_number: batchNumber,
        expiry_date: expiryDate,
        // supplier_id is the canonical column; we currently capture supplierName in notes until supplier mapping is implemented
        supplier_id: null,
        notes: supplierName ? `Supplier: ${supplierName}${notes ? ` | ${notes}` : ''}` : notes,
        performed_by: performedBy ?? null,
        transaction_date: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error adding stock:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in addStock:', error);
    throw error;
  }
}

export async function getStockTransactions(
  medicationId?: string,
  transactionType?: string,
  limit: number = 50
): Promise<StockTransaction[]> {
  try {
    let query = supabase
      .from('stock_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (medicationId) {
      query = query.eq('medication_id', medicationId);
    }

    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stock transactions:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getStockTransactions:', error);
    throw error;
  }
}

// =====================================================
// PATIENT MEDICATION HISTORY
// =====================================================

export async function getPatientMedicationHistory(patientId: string): Promise<MedicationHistory[]> {
  try {
    const history: MedicationHistory[] = [];

    // Get prescribed medications from prescriptions
    const { data: prescriptions, error: prescError } = await supabase
      .from('prescriptions')
      .select(`
        id,
        created_at,
        doctor_id,
        prescription_items(
          medication_id,
          dosage,
          frequency,
          duration
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (prescError) {
      console.error('Error fetching prescriptions:', prescError);
    } else if (prescriptions) {
      // Get doctor names
      const doctorIds = [...new Set(prescriptions.map(p => p.doctor_id))];
      const { data: doctors } = await supabase
        .from('users')
        .select('id, name')
        .in('id', doctorIds);

      // Get medicine names
      const medicineIds = prescriptions.flatMap(p => 
        p.prescription_items?.map(item => item.medication_id) || []
      );
      const { data: medicines } = await supabase
        .from('medications')
        .select('id, name, generic_name')
        .in('id', medicineIds);

      prescriptions.forEach(prescription => {
        const doctor = doctors?.find(d => d.id === prescription.doctor_id);
        
        prescription.prescription_items?.forEach(item => {
          const medicine = medicines?.find(m => m.id === item.medication_id);
          
          history.push({
            id: `presc_${prescription.id}_${item.medication_id}`,
            patient_id: patientId,
            medication_name: medicine?.name || 'Unknown',
            generic_name: medicine?.generic_name || '',
            dosage: item.dosage || '',
            frequency: item.frequency || '',
            duration: item.duration || '',
            prescribed_date: prescription.created_at,
            prescribed_by: doctor?.name || 'Unknown Doctor',
            status: 'prescribed'
          });
        });
      });
    }

    // Get dispensed medications
    const { data: dispensed, error: dispError } = await supabase
      .from('prescription_dispensed')
      .select(`
        id,
        dispensed_at,
        total_amount,
        payment_status,
        dispensed_by,
        prescription_dispensed_items(
          medication_id,
          quantity_dispensed,
          unit_price,
          total_price
        )
      `)
      .eq('patient_id', patientId)
      .order('dispensed_at', { ascending: false });

    if (dispError) {
      console.error('Error fetching dispensed medications:', dispError);
    } else if (dispensed) {
      // Get pharmacist names
      const pharmacistIds = [...new Set(dispensed.map(d => d.dispensed_by))];
      const { data: pharmacists } = await supabase
        .from('users')
        .select('id, name')
        .in('id', pharmacistIds);

      // Get medication names
      const medicationIds = dispensed.flatMap(d => 
        d.prescription_dispensed_items?.map(item => item.medication_id) || []
      );
      const { data: medications } = await supabase
        .from('medications')
        .select('id, name, generic_name, strength, dosage_form')
        .in('id', medicationIds);

      dispensed.forEach(dispense => {
        const pharmacist = pharmacists?.find(p => p.id === dispense.dispensed_by);
        
        dispense.prescription_dispensed_items?.forEach(item => {
          const medication = medications?.find(m => m.id === item.medication_id);
          
          history.push({
            id: `disp_${dispense.id}_${item.medication_id}`,
            patient_id: patientId,
            medication_name: medication?.name || 'Unknown',
            generic_name: medication?.generic_name || '',
            dosage: `${medication?.strength} ${medication?.dosage_form}` || '',
            frequency: `Qty: ${item.quantity_dispensed}`,
            duration: '',
            prescribed_date: '',
            dispensed_date: dispense.dispensed_at,
            prescribed_by: '',
            dispensed_by: pharmacist?.name || 'Unknown Pharmacist',
            status: 'dispensed',
            total_amount: item.total_price,
            payment_status: dispense.payment_status
          });
        });
      });
    }

    // Sort by date (most recent first)
    history.sort((a, b) => {
      const dateA = new Date(a.dispensed_date || a.prescribed_date);
      const dateB = new Date(b.dispensed_date || b.prescribed_date);
      return dateB.getTime() - dateA.getTime();
    });

    return history;
  } catch (error) {
    console.error('Error in getPatientMedicationHistory:', error);
    throw error;
  }
}

// =====================================================
// DASHBOARD ANALYTICS
// =====================================================

export async function getPharmacyDashboardStats(): Promise<{
  totalMedications: number;
  lowStockCount: number;
  todaySales: number;
  pendingBills: number;
  totalRevenue: number;
  prescriptionsDispensed: number;
}> {
  try {
    // Get total medications
    const { count: totalMedications } = await supabase
      .from('medications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get low stock count
    const { data: lowStockData } = await supabase
      .rpc('get_low_stock_medicines');

    const lowStockCount = lowStockData?.length || 0;

    // Get today's sales
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySalesData } = await supabase
      .from('stock_transactions')
      .select('total_amount')
      .eq('transaction_type', 'sale')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    const todaySales = todaySalesData?.reduce((sum, transaction) => sum + transaction.total_amount, 0) || 0;

    // Get pending bills count (align with 'billing')
    const { count: pendingBills } = await supabase
      .from('billing')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending');

    // Get total revenue (this month)
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: revenueData } = await supabase
      .from('billing')
      .select('total_amount')
      .eq('payment_status', 'completed')
      .gte('created_at', firstDayOfMonth);

    const totalRevenue = revenueData?.reduce((sum, bill) => sum + bill.total_amount, 0) || 0;

    // Get prescriptions dispensed today
    const { count: prescriptionsDispensed } = await supabase
      .from('prescription_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'dispensed')
      .gte('updated_at', `${today}T00:00:00`)
      .lt('updated_at', `${today}T23:59:59`);

    return {
      totalMedications: totalMedications || 0,
      lowStockCount: lowStockCount || 0,
      todaySales,
      pendingBills: pendingBills || 0,
      totalRevenue,
      prescriptionsDispensed: prescriptionsDispensed || 0
    };
  } catch (error) {
    console.error('Error in getPharmacyDashboardStats:', error);
    return {
      totalMedications: 0,
      lowStockCount: 0,
      todaySales: 0,
      pendingBills: 0,
      totalRevenue: 0,
      prescriptionsDispensed: 0
    };
  }
}

// =====================================================
// STOCK SUMMARY STATS
// =====================================================

export async function getStockSummaryStats(): Promise<{
  remainingUnits: number;
  soldUnitsThisMonth: number;
  purchasedUnitsThisMonth: number;
}> {
  try {
    // Remaining stock: use aggregated available_stock from medications (maintained by triggers)
    const { data: meds, error: medsError } = await supabase
      .from('medications')
      .select('available_stock');

    if (medsError) {
      console.error('Error fetching medicines for stock summary:', medsError);
      throw medsError;
    }

    const remainingUnits = (meds || [])
      .reduce((sum: number, m: any) => sum + (m.available_stock || 0), 0);

    // Compute purchased/sold units for the current month using transaction_date (fallback to created_at when transaction_date is null)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const [txWithDateRes, txWithoutDateRes] = await Promise.all([
      supabase
        .from('stock_transactions')
        .select('quantity, transaction_type, transaction_date, created_at')
        .gte('transaction_date', monthStart)
        .lt('transaction_date', nextMonthStart),
      supabase
        .from('stock_transactions')
        .select('quantity, transaction_type, transaction_date, created_at')
        .is('transaction_date', null)
        .gte('created_at', monthStart)
        .lt('created_at', nextMonthStart)
    ]);

    const txAll = [
      ...(txWithDateRes.data || []),
      ...(txWithoutDateRes.data || [])
    ];

    let purchasedUnitsThisMonth = 0;
    let soldUnitsThisMonth = 0;

    for (const tx of txAll) {
      const qty = typeof tx.quantity === 'number' ? tx.quantity : Number(tx.quantity) || 0;
      if (tx.transaction_type === 'purchase') {
        // count positive quantities only
        purchasedUnitsThisMonth += qty > 0 ? qty : 0;
      } else if (tx.transaction_type === 'sale') {
        // count absolute units sold (sale entries are typically negative)
        soldUnitsThisMonth += Math.abs(qty);
      }
    }

    return {
      remainingUnits,
      soldUnitsThisMonth,
      purchasedUnitsThisMonth,
    };
  } catch (error) {
    console.error('Error in getStockSummaryStats:', error);
    return {
      remainingUnits: 0,
      soldUnitsThisMonth: 0,
      purchasedUnitsThisMonth: 0,
    };
  }
}

// =====================================================
// PRESCRIPTION MANAGEMENT
// =====================================================

export interface PendingPrescription {
  id: string;
  prescription_id: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  issue_date: string;
  status: string;
  total_items: number;
  total_amount: number;
  prescription_items: {
    id: string;
    medication_id: string;
    medication_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

export async function getPendingPrescriptions(): Promise<PendingPrescription[]> {
  try {
    const { data: prescriptions, error } = await supabase
      .from('prescriptions')
      .select(`
        id,
        prescription_id,
        patient_id,
        doctor_id,
        issue_date,
        status,
        patients!inner(name),
        users!inner(name),
        prescription_items(
          id,
          medication_id,
          medication_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('status', 'pending')
      .order('issue_date', { ascending: false });

    if (error) {
      console.error('Error fetching pending prescriptions:', error);
      throw error;
    }

    const formattedPrescriptions: PendingPrescription[] = (prescriptions || []).map(prescription => ({
      id: prescription.id,
      prescription_id: prescription.prescription_id,
      patient_id: prescription.patient_id,
      patient_name: (prescription.patients as any)?.name || 'Unknown Patient',
      doctor_name: (prescription.users as any)?.name || 'Unknown Doctor',
      issue_date: prescription.issue_date,
      status: prescription.status,
      total_items: prescription.prescription_items?.length || 0,
      total_amount: prescription.prescription_items?.reduce((sum, item) => sum + item.total_price, 0) || 0,
      prescription_items: prescription.prescription_items || []
    }));

    return formattedPrescriptions;
  } catch (error) {
    console.error('Error in getPendingPrescriptions:', error);
    throw error;
  }
}

// =====================================================
// BARCODE FUNCTIONS
// =====================================================

export async function generateMedicineBarcode(medicationCode: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_medicine_barcode', {
      med_code: medicationCode
    });

    if (error) {
      console.error('Error generating medicine barcode:', error);
      throw error;
    }

    return data || '';
  } catch (error) {
    console.error('Error in generateMedicineBarcode:', error);
    throw error;
  }
}

export async function generateBatchBarcode(medicationCode: string, batchNumber: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_batch_barcode', {
      med_code: medicationCode,
      batch_num: batchNumber
    });

    if (error) {
      console.error('Error generating batch barcode:', error);
      throw error;
    }

    return data || '';
  } catch (error) {
    console.error('Error in generateBatchBarcode:', error);
    throw error;
  }
}

export async function findMedicineByBarcode(barcode: string): Promise<Medication | null> {
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error finding medicine by barcode:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in findMedicineByBarcode:', error);
    throw error;
  }
}

export async function findBatchByBarcode(barcode: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('medicine_batches')
      .select(`
        *,
        medication:medications(name, medication_code, generic_name)
      `)
      .eq('batch_barcode', barcode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error finding batch by barcode:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in findBatchByBarcode:', error);
    throw error;
  }
}

// =====================================================
// SUPPLIER FUNCTIONS
// =====================================================

export async function getSuppliers(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSuppliers:', error);
    return [];
  }
}

export async function getSupplierById(id: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching supplier by ID:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getSupplierById:', error);
    throw error;
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export async function searchMedications(searchTerm: string): Promise<Medication[]> {
  return getMedications({ search: searchTerm, status: 'active' });
}

export async function getMedicationCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('category')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    const categories = [...new Set(data?.map(item => item.category) || [])];
    return categories.sort();
  } catch (error) {
    console.error('Error in getMedicationCategories:', error);
    return [];
  }
}

// =====================================================
// STOCK ADJUSTMENT FUNCTIONS
// =====================================================

export async function adjustStock(
  medicationId: string,
  adjustmentQuantity: number,
  reason: string,
  notes: string,
  userId: string
): Promise<StockTransaction> {
  try {
    const { data: transaction, error: transactionError } = await supabase
      .from('stock_transactions')
      .insert({
        medication_id: medicationId,
        transaction_type: 'adjustment',
        // Use signed quantity so negative values reduce stock via trigger
        quantity: adjustmentQuantity,
        unit_price: 0,
        notes: `${reason}: ${notes}`,
        performed_by: userId,
        transaction_date: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      throw new Error('Failed to create stock transaction');
    }

    return transaction;
  } catch (error) {
    console.error('Error in adjustStock:', error);
    throw error;
  }
}

// =====================================================
// PHARMACY BILLING FUNCTIONS
// =====================================================

export async function createPharmacyBill(
  patientId: string,
  items: { 
    medication_id: string; 
    quantity: number; 
    unit_price: number;
    batch_id?: string;
    batch_number?: string;
    expiry_date?: string;
  }[],
  discount: number,
  taxRate: number,
  paymentMethod: string,
  userId: string
): Promise<PharmacyBilling> {
  try {
    // Delegate atomic bill creation + ledger entries to the database RPC.
    const { data: bill, error } = await supabase.rpc('create_billing_with_items', {
      p_patient_id: patientId || null,
      p_items: items,
      p_discount: discount,
      p_tax_rate: taxRate,
      p_payment_method: paymentMethod,
      p_user_id: userId
    });

    if (error) {
      console.error('create_pharmacy_bill_with_items failed:', error);
      throw new Error('Failed to create pharmacy bill');
    }

    // The RPC returns the full bill row; reconstruct items summary locally for UI if needed.
    return {
      ...bill,
      items: items.map(item => ({
        medication_id: item.medication_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }))
    };
  } catch (error) {
    console.error('Error in createPharmacyBill:', error);
    throw error;
  }
}

export async function getPharmacyBills(patientId?: string): Promise<PharmacyBilling[]> {
  try {
    let query = supabase
      .from('billing')
      .select('*')
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bills - Details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      return [];
    }

    // Transform data to include display patient_name and normalized payment_status
    const bills = data?.map(bill => ({
      ...bill,
      // For walk-in customers or if patient not linked
      patient_name: bill.customer_name || 'Walk-in Customer',
      total_amount: bill.total_amount,
      payment_status: bill.payment_status,
      items: [] // Items would need to be fetched separately if needed
    })) || [];

    return bills;
  } catch (error) {
    console.error('Error in getPharmacyBills:', error);
    return [];
  }
}

// =====================================================
// BATCH PURCHASE HISTORY (by batch_number)
// =====================================================

export async function getBatchPurchaseHistory(batchNumber: string): Promise<BatchPurchaseHistoryEntry[]> {
  try {
    // 1) Fetch bill items for the given batch number
    const { data: items, error: itemsError } = await supabase
      .from('billing_item')
      .select('id, bill_id, medicine_id, quantity, unit_price, total_amount, batch_number, created_at')
      .eq('batch_number', batchNumber)
      .order('id', { ascending: false });

    if (itemsError) {
      console.error('Error fetching bill items by batch_number:', itemsError);
      return [];
    }

    if (!items || items.length === 0) {
      return [];
    }

    // 2) Bulk fetch bills (align with current schema 'billing')
    const billIds = Array.from(new Set(items.map(i => i.bill_id))).filter(Boolean);
    const { data: bills, error: billsError } = await supabase
      .from('billing')
      .select('id, bill_number, patient_id, customer_name, bill_date, created_at, payment_status')
      .in('id', billIds);

    if (billsError) {
      console.error('Error fetching bills for batch history:', billsError);
    }

    // 3) Bulk fetch patients
    const patientIds = Array.from(new Set((bills || []).map(b => b.patient_id))).filter(Boolean);
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, name, patient_id')
      .in('id', patientIds);

    if (patientsError) {
      console.error('Error fetching patients for batch history:', patientsError);
    }

    // 4) Bulk fetch medicines
    const medicationIds = Array.from(new Set(items.map(i => i.medicine_id))).filter(Boolean);
    const { data: meds, error: medsError } = await supabase
      .from('medications')
      .select('id, name')
      .in('id', medicationIds);

    if (medsError) {
      console.error('Error fetching medicines for batch history:', medsError);
    }

    // 5) Join data locally (with safe fallbacks)
    const result: BatchPurchaseHistoryEntry[] = items.map(i => {
      const bill = (bills || []).find(b => b.id === i.bill_id);
      const patient = bill ? (patients || []).find(p => p.id === bill.patient_id) : undefined;
      const med = (meds || []).find(m => m.id === i.medicine_id);

      return {
        bill_id: bill?.id || i.bill_id,
        bill_number: bill?.bill_number || 'N/A',
        // Prefer bill.created_at, fall back to item.created_at to avoid Invalid Date in UI
        purchased_at: bill?.bill_date || bill?.created_at || i.created_at || '',
        patient_id: bill?.patient_id || '',
        // If the bill is linked to a registered patient, show their name; include UHID separately.
        // Otherwise, prefer bill.patient_name (walk-in) or default label.
        patient_name: bill?.patient_id
          ? (patient?.name || 'Unknown')
          : (bill?.customer_name || 'Walk-in Customer'),
        patient_uhid: bill?.patient_id ? (patient?.patient_id || undefined) : undefined,
        medication_id: i.medicine_id,
        medication_name: med?.name || 'Unknown',
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_amount: i.total_amount,
        // Normalize payment status for UI: show 'paid' for completed/paid, else pending/other as-is
        payment_status: bill?.payment_status
          ? ((bill.payment_status === 'completed' || bill.payment_status === 'paid') ? 'paid' : bill.payment_status)
          : 'pending'
      };
    });

    // Sort by date desc (handle invalid/empty dates gracefully)
    result.sort((a, b) => {
      const aTime = a.purchased_at ? new Date(a.purchased_at).getTime() : 0;
      const bTime = b.purchased_at ? new Date(b.purchased_at).getTime() : 0;
      return bTime - aTime;
    });
    return result;
  } catch (error) {
    console.error('Error in getBatchPurchaseHistory:', error);
    return [];
  }
}

// =====================================================
// PER-BATCH STOCK STATS (Remaining, Sold this month, Purchased this month)
// =====================================================

export async function getBatchStockStats(batchNumber: string): Promise<{
  remainingUnits: number;
  soldUnitsThisMonth: number;
  purchasedUnitsThisMonth: number;
}> {
  try {
    // Time window: current calendar month in IST
    const now = new Date();
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30
    const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
    const monthStartIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1);
    const nextMonthStartIST = new Date(nowIST.getFullYear(), nowIST.getMonth() + 1, 1);
    // Convert IST boundaries back to UTC ISO for comparison with UTC timestamps
    const monthStart = new Date(monthStartIST.getTime() - IST_OFFSET_MS).toISOString();
    const nextMonthStart = new Date(nextMonthStartIST.getTime() - IST_OFFSET_MS).toISOString();

    // Ledger-first computation:
    const { data: txAll, error: txAllError } = await supabase
      .from('stock_transactions')
      .select('quantity, transaction_type, transaction_date, created_at')
      .eq('batch_number', batchNumber);

    if (txAllError) {
      console.error('Error fetching stock_transactions for batch:', txAllError);
    }

    let remainingUnits = 0;
    let soldUnitsThisMonth = 0;
    let purchasedUnitsThisMonth = 0;

    if (txAll && txAll.length > 0) {
      for (const tx of txAll) {
        const qty = typeof tx.quantity === 'number' ? tx.quantity : Number(tx.quantity) || 0;
        remainingUnits += qty;
        const txnDate = (tx.transaction_date as string | null) ?? (tx.created_at as string | null);
        if (txnDate && txnDate >= monthStart && txnDate < nextMonthStart) {
          if (tx.transaction_type === 'sale') {
            soldUnitsThisMonth += Math.abs(qty);
          } else if (tx.transaction_type === 'purchase') {
            purchasedUnitsThisMonth += qty > 0 ? qty : 0;
          }
        }
      }
    } else {
      // Fallback: if no transactions exist for this batch, use the batch's current_quantity
      const { data: batchRow, error: batchError } = await supabase
        .from('medicine_batches')
        .select('current_quantity')
        .eq('batch_number', batchNumber)
        .limit(1)
        .maybeSingle();
      if (batchError) {
        console.error('Error fetching batch fallback quantity:', batchError);
      }
      remainingUnits = Number(batchRow?.current_quantity ?? 0);
    }

    return {
      remainingUnits,
      soldUnitsThisMonth,
      purchasedUnitsThisMonth
    };
  } catch (error) {
    console.error('Error in getBatchStockStats:', error);
    // Fail-safe defaults
    return {
      remainingUnits: 0,
      soldUnitsThisMonth: 0,
      purchasedUnitsThisMonth: 0
    };
  }
}

// =====================================================
// PRESCRIPTION DISPENSING FUNCTIONS
// =====================================================

export async function dispensePrescription(
  prescriptionId: string,
  medicationId: string,
  quantityDispensed: number,
  userId: string,
  notes?: string
): Promise<PrescriptionDispensing> {
  try {
    // Create dispensing record
    const { data: dispensing, error: dispensingError } = await supabase
      .from('prescription_dispensing')
      .insert({
        prescription_id: prescriptionId,
        medication_id: medicationId,
        quantity_dispensed: quantityDispensed,
        dispensed_by: userId,
        dispensed_at: new Date().toISOString(),
        notes,
        status: 'complete'
      })
      .select()
      .single();

    if (dispensingError) {
      throw new Error('Failed to create dispensing record');
    }

    // Update medication stock
    const { data: medication } = await supabase
      .from('medicines')
      .select('stock_quantity')
      .eq('id', medicationId)
      .single();

    if (medication) {
      const newStock = Math.max(0, medication.stock_quantity - quantityDispensed);
      await supabase
        .from('medicines')
        .update({ stock_quantity: newStock })
        .eq('id', medicationId);

      // Create stock transaction
      const transactionId = `DISP-${Date.now()}-${prescriptionId}`;
      await supabase
        .from('pharmacy_stock_transactions')
        .insert({
          medication_id: medicationId,
          transaction_id: transactionId,
          transaction_type: 'sale',
          quantity: quantityDispensed,
          unit_price: 0,
          total_amount: 0,
          notes: `Dispensed for prescription ${prescriptionId}`,
          created_by: userId,
          created_at: new Date().toISOString()
        });
    }

    return dispensing;
  } catch (error) {
    console.error('Error in dispensePrescription:', error);
    throw error;
  }
}