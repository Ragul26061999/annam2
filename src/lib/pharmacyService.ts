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

// =====================================================
// BATCH HELPERS (MCP)
// =====================================================

// Returns total received quantity for a given batch by summing purchase transactions.
export async function getBatchReceivedTotal(batchNumber: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('stock_transactions')
      .select('quantity')
      .eq('batch_number', batchNumber)
      .eq('transaction_type', 'purchase');

    if (error) {
      console.error('Error fetching batch received total:', error);
      return 0;
    }

    const total = (data || []).reduce((sum: number, r: any) => sum + (Number(r.quantity) || 0), 0);
    return Math.max(0, total);
  } catch (e) {
    console.error('Error in getBatchReceivedTotal:', e);
    return 0;
  }
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
    // First create the stock transaction
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

    // Update the medication's available stock
    const { data: currentMed } = await supabase
      .from('medications')
      .select('available_stock')
      .eq('id', medicationId)
      .single();

    if (currentMed) {
      const newStock = (currentMed.available_stock || 0) + quantity;
      await supabase
        .from('medications')
        .update({ available_stock: newStock })
        .eq('id', medicationId);
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
        doctor:doctor_id(user:user_id(name)),
        prescription_items(
          medication_id,
          dosage,
          frequency,
          duration,
          medication:medication_id(name, generic_name)
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (prescError) {
      console.error('Error fetching prescriptions:', prescError);
    } else if (prescriptions) {
      prescriptions.forEach((prescription: any) => {
        const doctorName = prescription.doctor?.user?.name || 'Unknown Doctor';

        const items = prescription.prescription_items || [];
        items.forEach((item: any) => {
          if (!item) return;
          const medicine = item.medication;

          history.push({
            id: `presc_${prescription.id}_${item.medication_id}`,
            patient_id: patientId,
            medication_name: medicine?.name || 'Unknown',
            generic_name: medicine?.generic_name || '',
            dosage: item.dosage || '',
            frequency: item.frequency || '',
            duration: item.duration || '',
            prescribed_date: prescription.created_at,
            prescribed_by: doctorName,
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
        dispensed_date,
        total_amount,
        payment_status,
        pharmacist_id,
        prescription_dispensed_items(
          medication_id,
          dispensed_quantity,
          unit_price,
          total_price
        )
      `)
      .eq('patient_id', patientId)
      .order('dispensed_date', { ascending: false });

    if (dispError) {
      console.error('Error fetching dispensed medications:', dispError);
    } else if (dispensed) {
      // Get pharmacist names
      const pharmacistIds = [...new Set(dispensed.map(d => d.pharmacist_id))];
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
        const pharmacist = pharmacists?.find(p => p.id === dispense.pharmacist_id);

        const dispensedItems = dispense.prescription_dispensed_items || [];
        dispensedItems.forEach(item => {
          if (!item) return; // Skip if item is null/undefined
          const medication = medications?.find(m => m.id === item.medication_id);

          history.push({
            id: `disp_${dispense.id}_${item.medication_id}`,
            patient_id: patientId,
            medication_name: medication?.name || 'Unknown',
            generic_name: medication?.generic_name || '',
            dosage: medication ? `${medication.strength || ''} ${medication.dosage_form || ''}`.trim() : '',
            frequency: `Qty: ${item.dispensed_quantity}`,
            duration: '',
            prescribed_date: '',
            dispensed_date: dispense.dispensed_date,
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

    // Get today's sales - include payments collected today regardless of bill date
    const today = new Date().toISOString().split('T')[0];

    // Get sales from stock transactions (immediate sales)
    const { data: todaySalesData } = await supabase
      .from('stock_transactions')
      .select('total_amount')
      .eq('transaction_type', 'sale')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    const stockSales = todaySalesData?.reduce((sum, transaction) => sum + (transaction.total_amount || 0), 0) || 0;

    // Get payments collected today (regardless of original bill date)
    const { data: todayPaymentsData } = await supabase
      .from('billing')
      .select('total_amount')
      .eq('payment_status', 'completed')
      .gte('updated_at', `${today}T00:00:00`)
      .lt('updated_at', `${today}T23:59:59`);

    const paymentsCollected = todayPaymentsData?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0;

    const todaySales = stockSales + paymentsCollected;

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
        patients!patient_id(name),
        doctor:doctor_id(user:user_id(name)),
        prescription_items(
          id,
          medication_id,
          medication:medication_id(name),
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
      doctor_name: (prescription.doctor as any)?.user?.name || 'Unknown Doctor',
      issue_date: prescription.issue_date,
      status: prescription.status,
      total_items: prescription.prescription_items?.length || 0,
      total_amount: (prescription.prescription_items as any[])?.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0) || 0,
      prescription_items: (prescription.prescription_items as any[])?.map(item => ({
        ...item,
        medication_name: item.medication?.name || 'Unknown Medicine'
      })) || []
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
    // Create the stock transaction
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

    // Update the medication's available stock
    const { data: currentMed } = await supabase
      .from('medications')
      .select('available_stock')
      .eq('id', medicationId)
      .single();

    if (currentMed) {
      const newStock = Math.max(0, (currentMed.available_stock || 0) + adjustmentQuantity);
      await supabase
        .from('medications')
        .update({ available_stock: newStock })
        .eq('id', medicationId);
    }

    return transaction;
  } catch (error) {
    console.error('Error in adjustStock:', error);
    throw error;
  }
}

export async function editStockTransaction(
  transactionId: string,
  updates: {
    quantity?: number;
    unit_price?: number;
    batch_number?: string;
    expiry_date?: string;
    notes?: string;
  },
  userId: string
): Promise<StockTransaction> {
  try {
    // Get the original transaction
    const { data: originalTx, error: fetchError } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !originalTx) {
      throw new Error('Stock transaction not found');
    }

    // Only allow editing purchase transactions
    if (originalTx.transaction_type !== 'purchase') {
      throw new Error('Only purchase transactions can be edited');
    }

    // Calculate the difference in quantity if quantity is being updated
    let quantityDiff = 0;
    if (updates.quantity !== undefined && updates.quantity !== originalTx.quantity) {
      quantityDiff = updates.quantity - originalTx.quantity;
    }

    // Update the transaction
    const { data: updatedTx, error: updateError } = await supabase
      .from('stock_transactions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update stock transaction');
    }

    // If quantity changed, update the medication stock
    if (quantityDiff !== 0) {
      const { data: currentMed } = await supabase
        .from('medications')
        .select('available_stock')
        .eq('id', originalTx.medication_id)
        .single();

      if (currentMed) {
        const newStock = Math.max(0, (currentMed.available_stock || 0) + quantityDiff);
        await supabase
          .from('medications')
          .update({ available_stock: newStock })
          .eq('id', originalTx.medication_id);
      }
    }

    return updatedTx;
  } catch (error) {
    console.error('Error in editStockTransaction:', error);
    throw error;
  }
}

export async function adjustExpiredStock(
  medicationId: string,
  batchNumber: string,
  adjustmentType: 'delete' | 'adjust',
  userId: string,
  adjustmentQuantity?: number,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (adjustmentType === 'delete') {
      // Delete the entire batch from stock_transactions
      const { data: batchTransactions, error: fetchError } = await supabase
        .from('stock_transactions')
        .select('*')
        .eq('medication_id', medicationId)
        .eq('batch_number', batchNumber)
        .eq('transaction_type', 'purchase');

      if (fetchError) throw fetchError;

      if (batchTransactions && batchTransactions.length > 0) {
        // Calculate total quantity to remove from stock
        const totalQuantity = batchTransactions.reduce((sum, tx) => sum + tx.quantity, 0);

        // Delete the transactions
        const { error: deleteError } = await supabase
          .from('stock_transactions')
          .delete()
          .eq('medication_id', medicationId)
          .eq('batch_number', batchNumber)
          .eq('transaction_type', 'purchase');

        if (deleteError) throw deleteError;

        // Update medication stock
        const { data: currentMed } = await supabase
          .from('medications')
          .select('available_stock')
          .eq('id', medicationId)
          .single();

        if (currentMed) {
          const newStock = Math.max(0, (currentMed.available_stock || 0) - totalQuantity);
          await supabase
            .from('medications')
            .update({ available_stock: newStock })
            .eq('id', medicationId);
        }

        // Create an adjustment transaction record
        await supabase
          .from('stock_transactions')
          .insert({
            medication_id: medicationId,
            transaction_type: 'purchase',
            quantity: totalQuantity,
            unit_price: 0,
            batch_number: batchNumber,
            notes: `Initial stock for batch: ${notes || 'No notes provided'}`,
            performed_by: userId,
            transaction_date: new Date().toISOString()
          });
      }

      return { success: true, message: 'Expired batch deleted successfully' };
    } else if (adjustmentType === 'adjust' && adjustmentQuantity !== undefined) {
      // Adjust the quantity of expired stock
      const { data: batchTransactions, error: fetchError } = await supabase
        .from('stock_transactions')
        .select('*')
        .eq('medication_id', medicationId)
        .eq('batch_number', batchNumber)
        .eq('transaction_type', 'purchase');

      if (fetchError) throw fetchError;

      if (batchTransactions && batchTransactions.length > 0) {
        // Find the most recent purchase transaction for this batch
        const latestTransaction = batchTransactions[0];

        // Update the transaction quantity
        const quantityDiff = adjustmentQuantity - latestTransaction.quantity;
        const { error: updateError } = await supabase
          .from('stock_transactions')
          .update({
            quantity: adjustmentQuantity,
            notes: `${latestTransaction.notes || ''} | Adjusted for expiry: ${notes || 'No notes provided'}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', latestTransaction.id);

        if (updateError) throw updateError;

        // Update medication stock
        const { data: currentMed } = await supabase
          .from('medications')
          .select('available_stock')
          .eq('id', medicationId)
          .single();

        if (currentMed) {
          const newStock = Math.max(0, (currentMed.available_stock || 0) + quantityDiff);
          await supabase
            .from('medications')
            .update({ available_stock: newStock })
            .eq('id', medicationId);
        }

        // Create an adjustment transaction record
        await supabase
          .from('stock_transactions')
          .insert({
            medication_id: medicationId,
            transaction_type: 'expired',
            quantity: quantityDiff,
            unit_price: 0,
            batch_number: batchNumber,
            notes: `Expired stock adjusted: ${notes || 'No notes provided'}`,
            performed_by: userId,
            transaction_date: new Date().toISOString()
          });
      }

      return { success: true, message: 'Expired stock adjusted successfully' };
    }

    throw new Error('Invalid adjustment parameters');
  } catch (error) {
    console.error('Error in adjustExpiredStock:', error);
    return { success: false, message: (error as Error).message };
  }
}

export async function addStockWithAutoSplit(
  medicationId: string,
  totalQuantity: number,
  unitPrice: number,
  maxBatchSize: number = 1000,
  supplierName?: string,
  baseBatchNumber?: string,
  expiryDate?: string,
  notes?: string,
  performedBy?: string
): Promise<{ success: boolean; transactions: StockTransaction[]; message: string }> {
  try {
    const transactions: StockTransaction[] = [];
    const remainingQuantity = totalQuantity;
    let batchCounter = 1;

    // Calculate how many batches we need
    const numBatches = Math.ceil(totalQuantity / maxBatchSize);

    for (let i = 0; i < numBatches; i++) {
      const batchQuantity = Math.min(maxBatchSize, remainingQuantity - (i * maxBatchSize));
      const batchNumber = baseBatchNumber
        ? `${baseBatchNumber}-${String(batchCounter).padStart(2, '0')}`
        : `AUTO-${Date.now()}-${String(batchCounter).padStart(2, '0')}`;

      const transaction = await addStock(
        medicationId,
        batchQuantity,
        unitPrice,
        supplierName,
        batchNumber,
        expiryDate,
        notes ? `${notes} (Batch ${batchCounter} of ${numBatches})` : `Auto-split batch ${batchCounter} of ${numBatches}`,
        performedBy
      );

      transactions.push(transaction);
      batchCounter++;
    }

    return {
      success: true,
      transactions,
      message: `Successfully created ${numBatches} batch(es) for total quantity ${totalQuantity}`
    };
  } catch (error) {
    console.error('Error in addStockWithAutoSplit:', error);
    return {
      success: false,
      transactions: [],
      message: (error as Error).message
    };
  }
}

export async function calculateOptimalBatchSize(
  medicationId: string,
  monthlyUsage: number = 0,
  shelfLifeMonths: number = 12
): Promise<{ recommendedBatchSize: number; reasoning: string }> {
  try {
    // Get medication details
    const { data: medication, error: medError } = await supabase
      .from('medications')
      .select('name, minimum_stock_level, available_stock')
      .eq('id', medicationId)
      .single();

    if (medError || !medication) {
      throw new Error('Medication not found');
    }

    let recommendedBatchSize = 1000; // Default
    let reasoning = 'Using default batch size of 1000 units';

    if (monthlyUsage > 0) {
      // Calculate based on monthly usage
      const threeMonthsSupply = monthlyUsage * 3;
      const minRecommended = Math.max(threeMonthsSupply, medication.minimum_stock_level * 2);

      // Consider shelf life - don't recommend more than 75% of shelf life to avoid expiry
      const maxBasedOnShelfLife = monthlyUsage * (shelfLifeMonths * 0.75);

      recommendedBatchSize = Math.min(minRecommended, maxBasedOnShelfLife, 2000);
      recommendedBatchSize = Math.max(recommendedBatchSize, 100); // Minimum 100 units

      reasoning = `Based on monthly usage of ${monthlyUsage} units and ${shelfLifeMonths} months shelf life. Recommended ${recommendedBatchSize} units to cover 3 months supply while minimizing expiry risk.`;
    } else {
      // Use minimum stock level as baseline
      recommendedBatchSize = Math.max(medication.minimum_stock_level * 3, 500);
      recommendedBatchSize = Math.min(recommendedBatchSize, 1500);

      reasoning = `Based on minimum stock level of ${medication.minimum_stock_level} units. Recommended ${recommendedBatchSize} units to maintain adequate buffer.`;
    }

    return {
      recommendedBatchSize,
      reasoning
    };
  } catch (error) {
    console.error('Error in calculateOptimalBatchSize:', error);
    return {
      recommendedBatchSize: 1000,
      reasoning: 'Error calculating optimal size. Using default of 1000 units.'
    };
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
    // 1) Fetch bill items for the given batch number (support legacy/new table names)
    let items: any[] = [];

    try {
      const res = await supabase
        .from('billing_item')
        .select('id, bill_id, medicine_id, quantity, unit_price, total_amount, batch_number, created_at')
        .eq('batch_number', batchNumber)
        .order('id', { ascending: false });

      if (res.error) {
        console.warn('Failed to fetch from billing_item:', res.error?.message || 'Unknown error');
      } else if (res.data && res.data.length > 0) {
        items = res.data;
      }
    } catch (e) {
      console.warn('Exception querying billing_item:', e);
    }

    // If first query returned no items, try fallback table
    if (items.length === 0) {
      try {
        const res2 = await supabase
          .from('pharmacy_bill_items')
          .select('id, bill_id, medication_id, quantity, unit_price, total_amount, batch_number, created_at')
          .eq('batch_number', batchNumber)
          .order('id', { ascending: false });

        if (res2.error) {
          console.warn('Failed to fetch from pharmacy_bill_items:', res2.error?.message || 'Unknown error');
        } else if (res2.data && res2.data.length > 0) {
          items = res2.data.map((r: any) => ({
            ...r,
            medicine_id: r.mediation_id ?? r.medication_id ?? r.medicine_id,
          }));
        }
      } catch (fallbackError) {
        console.warn('Exception querying pharmacy_bill_items:', fallbackError);
      }
    }

    // If no items found in either table, return empty
    if (items.length === 0) {
      return [];
    }

    // 2) Bulk fetch bills (align with current schema 'billing')
    const billIds = Array.from(new Set(items.map(i => i.bill_id))).filter(Boolean);
    // Try billing, then pharmacy_bills
    let bills: any[] | null = null; let billsError: any = null;
    try {
      const r = await supabase
        .from('billing')
        .select('id, bill_number, patient_id, customer_name, bill_date, created_at, payment_status')
        .in('id', billIds);
      bills = r.data; billsError = r.error;
    } catch (e) { billsError = e; }
    if (billsError || !bills) {
      const r2 = await supabase
        .from('pharmacy_bills')
        .select('id, bill_number, patient_id, customer_name, bill_date, created_at, payment_status')
        .in('id', billIds);
      bills = r2.data || [];
      if (r2.error) {
        console.error('Error fetching bills for batch history (both tables failed):', r2.error);
      }
    }

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
    const medicationIds = Array.from(new Set(items.map(i => i.medicine_id ?? i.medication_id))).filter(Boolean);
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
      const med = (meds || []).find(m => m.id === (i.medicine_id ?? i.medication_id));

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
        medication_id: i.medicine_id ?? i.medication_id,
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

// =====================================================
// DEFINITIVE STOCK TRUTH SYSTEM (Single Source of Truth)
// =====================================================

export interface StockTruthRecord {
  record_type: 'BATCH';
  medication_id: string;
  medication_code: string;
  medication_name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  dosage_form: string;
  strength: string;
  unit_price: number;
  batch_id: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  initial_quantity: number;
  table_quantity: number;
  current_quantity: number; // TRUTH: Never negative
  raw_ledger_balance: number;
  total_purchased: number;
  total_sold: number;
  last_transaction_date: string;
  purchase_price: number;
  selling_price: number;
  supplier_name: string;
  batch_barcode: string;
  batch_status: string;
  cost_value: number;
  retail_value: number;
  reconciliation_status: 'RECONCILED' | 'MINOR_DISCREPANCY' | 'MAJOR_DISCREPANCY' | 'NO_TRANSACTIONS' | 'NO_BATCH_RECORD';
  discrepancy_amount: number;
  expiry_status: 'GOOD' | 'EXPIRING_SOON' | 'EXPIRED';
  days_to_expiry: number;
  stock_level_status: 'OPTIMAL' | 'LOW' | 'CRITICAL_LOW' | 'OVERSTOCKED';
  alert_level: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'INFO';
}

export interface MedicineStockSummary {
  medication_id: string;
  medication_code: string;
  medication_name: string;
  total_batches: number;
  total_quantity: number;
  total_cost_value: number;
  total_retail_value: number;
  critical_low_batches: number;
  expired_batches: number;
  expiring_soon_batches: number;
  needs_reconciliation: boolean;
  overall_alert_level: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'INFO';
}

export interface StockReconciliationResult {
  success: boolean;
  message: string;
  old_ledger_balance: number;
  new_ledger_balance: number;
  adjustment_needed: number;
}

export async function getStockTruth(medicationId?: string, batchNumber?: string): Promise<StockTruthRecord[]> {
  try {
    const { data, error } = await supabase.rpc('get_stock_truth', {
      medication_id: medicationId || null,
      batch_number: batchNumber || null
    });

    if (error) {
      console.error('Error fetching stock truth:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getStockTruth:', error);
    return [];
  }
}

export async function getMedicineStockSummary(medicationId: string): Promise<MedicineStockSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_medicine_stock_summary', {
      medication_id: medicationId
    });

    if (error) {
      console.error('Error fetching medicine stock summary:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in getMedicineStockSummary:', error);
    return null;
  }
}

export async function reconcileStock(batchNumber: string, newQuantity: number, userId: string): Promise<StockReconciliationResult> {
  try {
    const { data, error } = await supabase.rpc('reconcile_stock', {
      batch_number: batchNumber,
      new_quantity: newQuantity,
      user_id: userId
    });

    if (error) {
      console.error('Error reconciling stock:', error);
      return {
        success: false,
        message: `Error: ${error.message}`,
        old_ledger_balance: 0,
        new_ledger_balance: 0,
        adjustment_needed: 0
      };
    }

    return data && data.length > 0 ? data[0] : {
      success: false,
      message: 'No response from server',
      old_ledger_balance: 0,
      new_ledger_balance: 0,
      adjustment_needed: 0
    };
  } catch (error) {
    console.error('Error in reconcileStock:', error);
    return {
      success: false,
      message: `Error: ${error}`,
      old_ledger_balance: 0,
      new_ledger_balance: 0,
      adjustment_needed: 0
    };
  }
}

// =====================================================
// ROBUST STOCK FUNCTIONS (using server-side views/RPCs)
// =====================================================

export interface BatchStockData {
  medication_id: string;
  batch_number: string;
  current_stock: number;
  purchased_this_month: number;
  sold_this_month: number;
}

export interface MedicationStockData {
  medication_id: string;
  current_stock: number;
  expired_units: number;
  total_batches: number;
}

export async function getBatchStockRobust(batchNumber: string): Promise<BatchStockData | null> {
  try {
    const { data, error } = await supabase.rpc('get_batch_stock', {
      batch_num: batchNumber
    });

    if (error) {
      console.error('Error fetching batch stock:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in getBatchStockRobust:', error);
    return null;
  }
}

export async function getMedicationStockRobust(medicationId: string): Promise<MedicationStockData | null> {
  try {
    const { data, error } = await supabase.rpc('get_medication_stock', {
      med_id: medicationId
    });

    if (error) {
      console.error('Error fetching medication stock:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in getMedicationStockRobust:', error);
    return null;
  }
}

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
      remainingUnits: Math.max(0, remainingUnits),
      soldUnitsThisMonth: Math.max(0, soldUnitsThisMonth),
      purchasedUnitsThisMonth: Math.max(0, purchasedUnitsThisMonth)
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
      .from('medications')
      .select('available_stock')
      .eq('id', medicationId)
      .single();

    if (medication) {
      const newStock = Math.max(0, medication.available_stock - quantityDispensed);
      await supabase
        .from('medications')
        .update({ available_stock: newStock })
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

// =====================================================
// COMPREHENSIVE INVENTORY ANALYTICS
// =====================================================

export interface InventoryAnalytics {
  totalStockValue: {
    costValue: number;
    retailValue: number;
    profitMargin: number;
  };
  stockSummary: {
    totalMedicines: number;
    totalBatches: number;
    totalUnits: number;
    lowStockItems: number;
    expiredItems: number;
    expiringSoonItems: number;
  };
  categoryBreakdown: Array<{
    category: string;
    medicineCount: number;
    totalUnits: number;
    totalValue: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    purchases: number;
    sales: number;
    revenue: number;
  }>;
  topSellingMedicines: Array<{
    medicationId: string;
    medicationName: string;
    totalSold: number;
    revenue: number;
  }>;
  expiryAnalysis: Array<{
    period: string;
    count: number;
    totalValue: number;
  }>;
}

export async function getInventoryAnalytics(): Promise<InventoryAnalytics> {
  try {
    // Get all medications with their stock
    const { data: medications, error: medError } = await supabase
      .from('medications')
      .select('id, name, category, available_stock, purchase_price, selling_price');

    if (medError) throw medError;

    // Get all stock transactions for trends
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1).toISOString();

    const { data: transactions, error: txError } = await supabase
      .from('stock_transactions')
      .select('medication_id, transaction_type, quantity, unit_price, total_amount, created_at')
      .gte('created_at', sixMonthsAgo)
      .order('created_at', { ascending: true });

    if (txError) throw txError;

    // Get batch information for expiry analysis
    const { data: batches, error: batchError } = await supabase
      .from('medicine_batches')
      .select('medicine_id, expiry_date, current_quantity, selling_price');

    if (batchError) throw batchError;

    // Calculate total stock values
    const totalCostValue = (medications || []).reduce((sum, med) =>
      sum + ((med.available_stock || 0) * (med.purchase_price || 0)), 0);
    const totalRetailValue = (medications || []).reduce((sum, med) =>
      sum + ((med.available_stock || 0) * (med.selling_price || 0)), 0);
    const profitMargin = totalCostValue > 0 ? ((totalRetailValue - totalCostValue) / totalCostValue) * 100 : 0;

    // Stock summary
    const totalUnits = (medications || []).reduce((sum, med) => sum + (med.available_stock || 0), 0);
    const lowStockItems = (medications || []).filter(med =>
      med.available_stock <= 10 && med.available_stock > 0).length;

    const now = new Date();
    const expiredItems = (batches || []).filter(batch =>
      new Date(batch.expiry_date) < now && batch.current_quantity > 0).length;

    const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
    const expiringSoonItems = (batches || []).filter(batch =>
      new Date(batch.expiry_date) >= now &&
      new Date(batch.expiry_date) <= ninetyDaysFromNow &&
      batch.current_quantity > 0).length;

    // Category breakdown
    const categoryMap = new Map();
    (medications || []).forEach(med => {
      const category = med.category || 'Uncategorized';
      const value = (med.available_stock || 0) * (med.selling_price || 0);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { medicineCount: 0, totalUnits: 0, totalValue: 0 });
      }
      const cat = categoryMap.get(category);
      cat.medicineCount++;
      cat.totalUnits += med.available_stock || 0;
      cat.totalValue += value;
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      medicineCount: data.medicineCount,
      totalUnits: data.totalUnits,
      totalValue: data.totalValue,
      percentage: totalRetailValue > 0 ? (data.totalValue / totalRetailValue) * 100 : 0
    })).sort((a, b) => b.totalValue - a.totalValue);

    // Monthly trends
    const monthlyMap = new Map();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentYear, currentMonth - i, 1);
      const monthKey = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyMap.set(monthKey, { purchases: 0, sales: 0, revenue: 0 });
    }

    (transactions || []).forEach(tx => {
      const month = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyMap.has(month)) {
        const data = monthlyMap.get(month);
        if (tx.transaction_type === 'purchase') {
          data.purchases += Math.abs(tx.quantity || 0);
        } else if (tx.transaction_type === 'sale') {
          data.sales += Math.abs(tx.quantity || 0);
          data.revenue += tx.total_amount || 0;
        }
      }
    });

    const monthlyTrends = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      purchases: data.purchases,
      sales: data.sales,
      revenue: data.revenue
    }));

    // Top selling medicines
    const salesMap = new Map();
    (transactions || [])
      .filter(tx => tx.transaction_type === 'sale')
      .forEach(tx => {
        if (!salesMap.has(tx.medication_id)) {
          salesMap.set(tx.medication_id, { totalSold: 0, revenue: 0 });
        }
        const data = salesMap.get(tx.medication_id);
        data.totalSold += Math.abs(tx.quantity || 0);
        data.revenue += tx.total_amount || 0;
      });

    const topSellingMedicines = Array.from(salesMap.entries())
      .map(([medicationId, data]) => {
        const med = medications?.find(m => m.id === medicationId);
        return {
          medicationId,
          medicationName: med?.name || 'Unknown',
          totalSold: data.totalSold,
          revenue: data.revenue
        };
      })
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10);

    // Expiry analysis
    const expiryPeriods = [
      { period: 'Expired', daysAgo: -Infinity, daysAhead: 0 },
      { period: 'Expiring in 30 days', daysAgo: 0, daysAhead: 30 },
      { period: 'Expiring in 31-60 days', daysAgo: 30, daysAhead: 60 },
      { period: 'Expiring in 61-90 days', daysAgo: 60, daysAhead: 90 },
      { period: 'Expiring in 90+ days', daysAgo: 90, daysAhead: Infinity }
    ];

    const expiryAnalysis = expiryPeriods.map(period => {
      const filtered = (batches || []).filter(batch => {
        const expiryDate = new Date(batch.expiry_date);
        const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= period.daysAgo && daysDiff < period.daysAhead && batch.current_quantity > 0;
      });

      return {
        period: period.period,
        count: filtered.length,
        totalValue: filtered.reduce((sum, batch) =>
          sum + (batch.current_quantity * (batch.selling_price || 0)), 0)
      };
    });

    return {
      totalStockValue: {
        costValue: totalCostValue,
        retailValue: totalRetailValue,
        profitMargin
      },
      stockSummary: {
        totalMedicines: medications?.length || 0,
        totalBatches: batches?.length || 0,
        totalUnits,
        lowStockItems,
        expiredItems,
        expiringSoonItems
      },
      categoryBreakdown,
      monthlyTrends,
      topSellingMedicines,
      expiryAnalysis
    };
  } catch (error) {
    console.error('Error in getInventoryAnalytics:', error);
    return {
      totalStockValue: { costValue: 0, retailValue: 0, profitMargin: 0 },
      stockSummary: { totalMedicines: 0, totalBatches: 0, totalUnits: 0, lowStockItems: 0, expiredItems: 0, expiringSoonItems: 0 },
      categoryBreakdown: [],
      monthlyTrends: [],
      topSellingMedicines: [],
      expiryAnalysis: []
    };
  }
}

// =====================================================
// COMPREHENSIVE BATCH AND MEDICINE ANALYTICS
// =====================================================

export interface ComprehensiveMedicineData {
  medication_info: {
    id: string;
    name: string;
    generic_name: string;
    manufacturer: string;
    category: string;
    dosage_form: string;
    strength: string;
    medication_code: string;
  };
  stock_summary: {
    total_stock: number;
    total_batches: number;
    total_cost_value: number;
    total_retail_value: number;
    expired_stock: number;
    expiring_soon_stock: number;
    low_stock_batches: number;
    out_of_stock_batches: number;
  };
  batches: Array<{
    id: string;
    batch_number: string;
    supplier_name: string;
    manufacturing_date: string;
    expiry_date: string;
    received_date: string;
    current_stock: number;
    original_quantity: number;
    purchase_price: number;
    selling_price: number;
    cost_value: number;
    retail_value: number;
    sold_quantity: number;
    status: string;
    days_to_expiry: number;
  }>;
  purchase_history: Array<{
    id: string;
    batch_number: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    supplier_name: string;
    purchase_date: string;
    notes: string;
  }>;
  sales_history: Array<{
    id: string;
    batch_number: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    sale_date: string;
    bill_number: string;
    patient_name: string;
  }>;
}

export async function getComprehensiveMedicineData(medicationId: string): Promise<ComprehensiveMedicineData | null> {
  try {
    // Get medication basic info
    const { data: medicationInfo, error: medError } = await supabase
      .from('medications')
      .select(`
        id, name, generic_name, manufacturer, category, 
        dosage_form, strength, medication_code
      `)
      .eq('id', medicationId)
      .single();

    if (medError || !medicationInfo) {
      console.error('Error fetching medication info:', medError);
      return null;
    }

    // Get all batches - start with simplest approach
    let batchesData: any[] = [];
    let batchError = null;

    try {
      // Start with the most basic query
      const { data: basicBatches, error: basicError } = await supabase
        .from('medicine_batches')
        .select('*')
        .eq('medicine_id', medicationId);

      if (basicError) {
        console.error('Basic batch query failed:', basicError);
        batchError = basicError;
      } else if (basicBatches) {
        batchesData = basicBatches;
      } else {
        batchesData = [];
      }

      // If basic query works, try to get supplier info separately
      if (batchesData.length > 0 && !batchError) {
        try {
          const supplierIds = [...new Set(batchesData.map(b => b.supplier_id).filter(id => id))];
          if (supplierIds.length > 0) {
            const { data: suppliers, error: supplierError } = await supabase
              .from('suppliers')
              .select('id, name')
              .in('id', supplierIds);

            if (!supplierError && suppliers) {
              // Merge supplier data
              batchesData = batchesData.map(batch => {
                const supplier = suppliers.find(s => s.id === batch.supplier_id);
                return {
                  ...batch,
                  suppliers: supplier ? { name: supplier.name } : null
                };
              });
            }
          }
        } catch (supplierError) {
          console.log('Supplier fetch failed, continuing without supplier data:', supplierError);
        }
      }
    } catch (error) {
      console.error('Complete error in batch fetching:', error);
      batchError = error;
    }

    if (batchError) {
      console.error('Final batch error:', batchError);
      // Continue with empty batches instead of returning null
      batchesData = [];
    }

    // Get purchase history - simplified approach
    let purchaseHistory: any[] = [];
    try {
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('stock_transactions')
        .select('*')
        .eq('medication_id', medicationId)
        .eq('transaction_type', 'purchase')
        .order('created_at', { ascending: false });

      if (purchaseError) {
        console.error('Purchase history query failed:', purchaseError);
      } else if (purchaseData) {
        purchaseHistory = purchaseData;
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    }

    // Get sales history - simplified approach
    let salesHistory: any[] = [];
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('stock_transactions')
        .select('*')
        .eq('medication_id', medicationId)
        .eq('transaction_type', 'sale')
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Sales history query failed:', salesError);
      } else if (salesData) {
        salesHistory = salesData;
      }
    } catch (error) {
      console.error('Error fetching sales history:', error);
    }

    // Process batches data
    const processedBatches = (batchesData || []).map(batch => {
      const currentStock = Math.max(0, batch.current_quantity || 0);
      const originalQuantity = batch.original_quantity || 0;
      const purchasePrice = batch.purchase_price || 0;
      const sellingPrice = batch.selling_price || 0;
      const soldQuantity = Math.max(0, originalQuantity - currentStock);

      const expiryDate = new Date(batch.expiry_date);
      const today = new Date();
      const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: batch.id,
        batch_number: batch.batch_number,
        supplier_name: (batch.suppliers as any)?.name || (batch.supplier_id ? `Supplier-${batch.supplier_id}` : 'Unknown'),
        manufacturing_date: batch.manufacturing_date,
        expiry_date: batch.expiry_date,
        received_date: batch.received_date,
        current_stock: currentStock,
        original_quantity: originalQuantity,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        cost_value: currentStock * purchasePrice,
        retail_value: currentStock * sellingPrice,
        sold_quantity: soldQuantity,
        status: batch.status || 'active',
        days_to_expiry: daysToExpiry
      };
    });

    // Calculate stock summary
    const totalStock = processedBatches.reduce((sum, batch) => sum + batch.current_stock, 0);
    const totalBatches = processedBatches.length;
    const totalCostValue = processedBatches.reduce((sum, batch) => sum + batch.cost_value, 0);
    const totalRetailValue = processedBatches.reduce((sum, batch) => sum + batch.retail_value, 0);

    const expiredStock = processedBatches
      .filter(batch => batch.days_to_expiry < 0)
      .reduce((sum, batch) => sum + batch.current_stock, 0);

    const expiringSoonStock = processedBatches
      .filter(batch => batch.days_to_expiry >= 0 && batch.days_to_expiry <= 90)
      .reduce((sum, batch) => sum + batch.current_stock, 0);

    const lowStockBatches = processedBatches.filter(batch =>
      batch.current_stock > 0 && batch.current_stock <= 10
    ).length;

    const outOfStockBatches = processedBatches.filter(batch =>
      batch.current_stock <= 0
    ).length;

    // Process purchase history
    const processedPurchaseHistory = (purchaseHistory || []).map(purchase => ({
      id: purchase.id,
      batch_number: purchase.batch_number || '',
      quantity: purchase.quantity || 0,
      unit_price: purchase.unit_price || 0,
      total_amount: purchase.total_amount || 0,
      supplier_name: (purchase.suppliers as any)?.name || (purchase.supplier_id ? `Supplier-${purchase.supplier_id}` : 'Unknown'),
      purchase_date: purchase.created_at,
      notes: purchase.notes || ''
    }));

    // Process sales history
    const processedSalesHistory = (salesHistory || []).map(sale => ({
      id: sale.id,
      batch_number: sale.batch_number || '',
      quantity: Math.abs(sale.quantity || 0),
      unit_price: sale.unit_price || 0,
      total_amount: sale.total_amount || 0,
      sale_date: sale.created_at,
      bill_number: (sale.pharmacy_bills as any)?.bill_number || (sale.reference_id || ''),
      patient_name: (sale.pharmacy_bills as any)?.patient_name || 'Walk-in'
    }));

    return {
      medication_info: {
        id: medicationInfo.id,
        name: medicationInfo.name,
        generic_name: medicationInfo.generic_name || '',
        manufacturer: medicationInfo.manufacturer || '',
        category: medicationInfo.category || '',
        dosage_form: medicationInfo.dosage_form || '',
        strength: medicationInfo.strength || '',
        medication_code: medicationInfo.medication_code || ''
      },
      stock_summary: {
        total_stock: totalStock,
        total_batches: totalBatches,
        total_cost_value: totalCostValue,
        total_retail_value: totalRetailValue,
        expired_stock: expiredStock,
        expiring_soon_stock: expiringSoonStock,
        low_stock_batches: lowStockBatches,
        out_of_stock_batches: outOfStockBatches
      },
      batches: processedBatches,
      purchase_history: processedPurchaseHistory,
      sales_history: processedSalesHistory
    };

  } catch (error) {
    console.error('Error in getComprehensiveMedicineData:', error);
    return null;
  }
}
