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
  transaction_id: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'expired';
  quantity: number;
  unit_price: number;
  total_amount: number;
  batch_number?: string;
  expiry_date?: string;
  supplier_name?: string;
  customer_name?: string;
  notes?: string;
  created_by: string;
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
      .from('medicines')
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
      console.error('Error fetching medications:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMedications:', error);
    throw error;
  }
}

export async function getMedicationById(id: string): Promise<Medication | null> {
  try {
    const { data, error } = await supabase
      .from('medicines')
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
      .from('medicines')
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
  batchNumber?: string,
  expiryDate?: string,
  supplierName?: string,
  notes?: string,
  createdBy?: string
): Promise<StockTransaction> {
  try {
    // Generate transaction ID
    const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { data, error } = await supabase
      .from('pharmacy_stock_transactions')
      .insert({
        medication_id: medicationId,
        transaction_id: transactionId,
        transaction_type: 'purchase',
        quantity,
        unit_price: unitPrice,
        total_amount: quantity * unitPrice,
        batch_number: batchNumber,
        expiry_date: expiryDate,
        supplier_name: supplierName,
        notes,
        created_by: createdBy
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error adding stock:', error);
      throw error;
    }

    // Update medication stock quantity
    const { data: currentMed } = await supabase
      .from('medicines')
      .select('stock_quantity')
      .eq('id', medicationId)
      .single();

    if (currentMed) {
      await supabase
        .from('medicines')
        .update({
          stock_quantity: currentMed.stock_quantity + quantity,
          unit_price: unitPrice,
          updated_at: new Date().toISOString()
        })
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
      .from('pharmacy_stock_transactions')
      .select('*')
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
        .from('medicines')
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
        .from('medicines')
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
      .from('medicines')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get low stock count
    const { data: lowStockData } = await supabase
      .rpc('get_low_stock_medicines');

    const lowStockCount = lowStockData?.length || 0;

    // Get today's sales
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySalesData } = await supabase
      .from('pharmacy_stock_transactions')
      .select('total_amount')
      .eq('transaction_type', 'sale')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    const todaySales = todaySalesData?.reduce((sum, transaction) => sum + transaction.total_amount, 0) || 0;

    // Get pending bills count (align with 'pharmacy_bills')
    const { count: pendingBills } = await supabase
      .from('pharmacy_bills')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending');

    // Get total revenue (this month)
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: revenueData } = await supabase
      .from('pharmacy_bills')
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
    // Remaining stock = sum of current_quantity across all medicine_batches
    const { data: batches, error: batchesError } = await supabase
      .from('medicine_batches')
      .select('current_quantity');

    if (batchesError) {
      console.error('Error fetching batches for stock summary:', batchesError);
      throw batchesError;
    }

    const remainingUnits = (batches || [])
      .reduce((sum: number, b: any) => sum + (b.current_quantity || 0), 0);

    // We no longer track purchased/sold summary via pharmacy_stock_transactions.
    // Return zeros to avoid querying a non-existent relation.
    const purchasedUnitsThisMonth = 0;
    const soldUnitsThisMonth = 0;

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
// UTILITY FUNCTIONS
// =====================================================

export async function searchMedications(searchTerm: string): Promise<Medication[]> {
  return getMedications({ search: searchTerm, status: 'active' });
}

export async function getMedicationCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('medicines')
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
    // Get current stock
    const { data: medication, error: medicationError } = await supabase
      .from('medicines')
      .select('stock_quantity')
      .eq('id', medicationId)
      .single();

    if (medicationError) {
      throw new Error('Failed to fetch medication');
    }

    // Calculate new stock quantity
    const newStockQuantity = Math.max(0, medication.stock_quantity + adjustmentQuantity);

    // Update medication stock
    const { error: updateError } = await supabase
      .from('medicines')
      .update({ 
        stock_quantity: newStockQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', medicationId);

    if (updateError) {
      throw new Error('Failed to update medication stock');
    }

    // Create stock transaction record
    const transactionId = `ADJ-${Date.now()}`;
    const { data: transaction, error: transactionError } = await supabase
      .from('pharmacy_stock_transactions')
      .insert({
        medication_id: medicationId,
        transaction_id: transactionId,
        transaction_type: 'adjustment',
        quantity: Math.abs(adjustmentQuantity),
        unit_price: 0,
        total_amount: 0,
        notes: `${reason}: ${notes}`,
        created_by: userId,
        created_at: new Date().toISOString()
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
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountAmount = (subtotal * discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const totalAmount = taxableAmount + taxAmount;

    // Generate bill number
    const billNumber = `PH${Date.now()}`;

    // Create bill
    // NOTE: Align with current schema 'pharmacy_bills'.
    // This function is legacy and may not be used by the new billing page,
    // but we keep it consistent so other callers behave correctly.
    const { data: bill, error: billError } = await supabase
      .from('pharmacy_bills')
      .insert({
        bill_number: billNumber,
        patient_id: patientId || null,
        // customer_type is unknown from this legacy signature; treat as 'patient' when patientId is provided
        customer_type: patientId ? 'patient' : 'walk_in',
        customer_name: null,
        customer_phone: null,
        bill_date: new Date().toISOString(),
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        // Normalize to new status semantics: paid/completed -> 'completed'; credit -> 'pending'
        payment_status: paymentMethod === 'credit' ? 'pending' : 'completed',
        created_by: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (billError) {
      throw new Error('Failed to create pharmacy bill');
    }

    // Create bill items and update stock
    for (const item of items) {
      // Create bill item
      await supabase
        .from('pharmacy_bill_items')
        .insert({
          bill_id: bill.id,
          medicine_id: item.medication_id,
          batch_id: item.batch_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.quantity * item.unit_price,
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null
        });
      // Update batch stock: decrement medicine_batches.current_quantity
      // Prefer batch_id if provided; otherwise use batch_number
      let batchSelector: { column: 'id' | 'batch_number'; value: string } | null = null;
      if (item.batch_id) {
        batchSelector = { column: 'id', value: item.batch_id };
      } else if (item.batch_number) {
        batchSelector = { column: 'batch_number', value: item.batch_number };
      }

      if (batchSelector) {
        const { data: batchRow, error: batchFetchError } = await supabase
          .from('medicine_batches')
          .select('id, current_quantity')
          .eq(batchSelector.column, batchSelector.value)
          .limit(1)
          .maybeSingle();

        if (!batchFetchError && batchRow) {
          const newQty = Math.max(0, (batchRow.current_quantity || 0) - item.quantity);
          await supabase
            .from('medicine_batches')
            .update({ current_quantity: newQty })
            .eq('id', batchRow.id);
        } else {
          console.warn('Batch not found for decrementing stock', {
            selector: batchSelector,
            error: batchFetchError
          });
        }
      } else {
        console.warn('No batch_id or batch_number provided for bill item; skipping batch stock update', item);
      }
    }

    return {
      ...bill,
      total_amount: totalAmount,
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
      .from('pharmacy_bills')
      .select(`
        *,
        patient:patients(name, patient_id)
      `)
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pharmacy bills:', error);
      return [];
    }

    // Transform data to include display patient_name and normalized payment_status
    const bills = data?.map(bill => ({
      ...bill,
      // If linked to a registered patient, use patient's name; otherwise use customer_name for walk-in
      patient_name: bill.patient ? bill.patient.name : (bill.customer_name || 'Walk-in Customer'),
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
      .from('pharmacy_bill_items')
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

    // 2) Bulk fetch bills (align with current schema 'pharmacy_bills')
    const billIds = Array.from(new Set(items.map(i => i.bill_id))).filter(Boolean);
    const { data: bills, error: billsError } = await supabase
      .from('pharmacy_bills')
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
      .from('medicines')
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
    // Time window: current calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    // Remaining units for the batch from medicine_batches.current_quantity
    const { data: batchRow, error: batchError } = await supabase
      .from('medicine_batches')
      .select('current_quantity')
      .eq('batch_number', batchNumber)
      .limit(1)
      .maybeSingle();

    if (batchError) {
      console.error('Error fetching batch remaining quantity:', batchError);
    }

    const remainingUnits = (batchRow?.current_quantity ?? 0) as number;

    // Sold units this month: sum of pharmacy_bill_items.quantity for this batch_number
    // Filter by bills created in the current month, prefer bill_date if available
    const { data: billItems, error: billItemsError } = await supabase
      .from('pharmacy_bill_items')
      .select('bill_id, quantity, batch_number')
      .eq('batch_number', batchNumber);

    if (billItemsError) {
      console.error('Error fetching bill items for batch stats:', billItemsError);
    }

    let soldUnitsThisMonth = 0;
    if (billItems && billItems.length > 0) {
      const billIds = Array.from(new Set(billItems.map(i => i.bill_id))).filter(Boolean);
      const { data: bills, error: billsError } = await supabase
        .from('pharmacy_bills')
        .select('id, bill_date, created_at, payment_status')
        .in('id', billIds)
        .gte('bill_date', monthStart)
        .lt('bill_date', nextMonthStart);

      if (billsError) {
        console.error('Error filtering bills for batch sold stats:', billsError);
      }

      const validBillIds = new Set(
        (bills || [])
          .filter(b => (b.payment_status === 'completed' || b.payment_status === 'paid'))
          .map(b => b.id)
      );

      soldUnitsThisMonth = billItems
        .filter(i => validBillIds.has(i.bill_id))
        .reduce((sum, i) => sum + (i.quantity || 0), 0);
    }

    // Purchased units this month removed per schema; return 0 to avoid errors.
    const purchasedUnitsThisMonth = 0;

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