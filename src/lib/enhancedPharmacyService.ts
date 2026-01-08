import { supabase } from './supabase';

// =====================================================
// INTERFACES AND TYPES
// =====================================================

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  drug_license_no?: string;
  payment_terms?: string;
  credit_days: number;
  status: 'active' | 'inactive' | 'blacklisted';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DrugPurchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier?: Supplier;
  invoice_number?: string;
  invoice_date?: string;
  purchase_date: string;
  subtotal: number;
  discount_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_gst: number;
  other_charges: number;
  total_amount: number;
  payment_status: 'pending' | 'partial' | 'paid';
  payment_mode: 'cash' | 'credit' | 'cheque' | 'online' | 'upi';
  paid_amount: number;
  due_date?: string;
  remarks?: string;
  received_by?: string;
  verified_by?: string;
  status: 'draft' | 'received' | 'verified' | 'cancelled';
  items?: DrugPurchaseItem[];
  created_at: string;
  updated_at: string;
}

export interface DrugPurchaseItem {
  id?: string;
  purchase_id?: string;
  medication_id: string;
  medication_name?: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date: string;
  quantity: number;
  free_quantity: number;
  unit_price: number;
  mrp: number;
  discount_percent: number;
  gst_percent: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  gst_amount: number;
  total_amount: number;
  hsn_code?: string;
  rack_location?: string;
}

export interface PurchaseReturn {
  id: string;
  return_number: string;
  purchase_id?: string;
  supplier_id: string;
  supplier?: Supplier;
  return_date: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  reason: 'expired' | 'damaged' | 'quality_issue' | 'wrong_item' | 'excess_stock' | 'other';
  reason_details?: string;
  credit_note_number?: string;
  credit_note_date?: string;
  status: 'draft' | 'submitted' | 'approved' | 'completed' | 'rejected';
  processed_by?: string;
  approved_by?: string;
  items?: PurchaseReturnItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseReturnItem {
  id?: string;
  return_id?: string;
  medication_id: string;
  medication_name?: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
  reason?: string;
}

export interface DepartmentDrugIssue {
  id: string;
  issue_number: string;
  department_id?: string;
  department_name: string;
  requested_by?: string;
  requester_name?: string;
  issue_date: string;
  issue_time?: string;
  purpose?: string;
  total_items: number;
  total_value: number;
  status: 'pending' | 'approved' | 'issued' | 'partial' | 'rejected' | 'returned';
  approved_by?: string;
  issued_by?: string;
  remarks?: string;
  items?: DepartmentDrugIssueItem[];
  created_at: string;
  updated_at: string;
}

export interface DepartmentDrugIssueItem {
  id?: string;
  issue_id?: string;
  medication_id: string;
  medication_name?: string;
  batch_number?: string;
  expiry_date?: string;
  requested_quantity: number;
  issued_quantity: number;
  unit_price?: number;
  total_amount?: number;
  status: 'pending' | 'issued' | 'partial' | 'rejected';
  remarks?: string;
}

export interface SalesReturn {
  id: string;
  return_number: string;
  // DB column
  bill_id?: string;
  // Backward compatibility (older UI/service callers)
  original_bill_id?: string;
  original_bill_number?: string;

  patient_id?: string;
  customer_name?: string;
  customer_phone?: string;
  return_date: string;

  reason?: string;
  return_reason_code?: string;

  refund_mode?: string;
  refund_amount?: number;

  total_quantity?: number;
  total_amount?: number;
  net_amount?: number;
  total_tax?: number;

  remarks?: string;
  reason_details?: string;

  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  status: string;
  items?: SalesReturnItem[];
  created_at: string;
  updated_at: string;
}

export interface SalesReturnItem {
  id?: string;
  return_id?: string;
  medication_id: string;
  medication_name?: string;
  batch_number?: string;
  expiry_date?: string;
  quantity: number;
  // UI/service field (mapped to DB `selling_rate`)
  unit_price: number;

  // DB fields (optional, computed/mapped)
  selling_rate?: number;
  return_reason?: string;
  total_amount: number;
  restock_status: 'pending' | 'restocked' | 'disposed';
  // UI/service field (mapped to DB `return_reason`)
  reason?: string;

  // Optional GST fields used by some callers
  gst_percent?: number;
  gst_amount?: number;
}

export interface DrugBrokenRecord {
  id: string;
  record_number: string;
  record_date: string;
  medication_id: string;
  medication_name?: string;
  batch_number: string;
  expiry_date?: string;
  quantity: number;
  unit_price?: number;
  total_loss?: number;
  damage_type: 'broken' | 'leaked' | 'contaminated' | 'packaging_damaged' | 'temperature_damage' | 'other';
  damage_description?: string;
  location?: string;
  discovered_by?: string;
  discoverer_name?: string;
  verified_by?: string;
  disposal_method?: 'disposed' | 'returned_to_supplier' | 'pending' | 'insurance_claim';
  disposal_date?: string;
  insurance_claim_number?: string;
  status: 'reported' | 'verified' | 'disposed' | 'claimed';
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CashCollection {
  id: string;
  collection_number: string;
  collection_date: string;
  shift: 'morning' | 'afternoon' | 'night' | 'general';
  collected_by: string;
  collector_name?: string;
  opening_cash: number;
  cash_sales: number;
  card_collections: number;
  upi_collections: number;
  insurance_collections: number;
  credit_collections: number;
  cash_refunds: number;
  total_collections: number;
  total_bills: number;
  total_returns: number;
  expected_cash: number;
  actual_cash?: number;
  cash_difference: number;
  denominations?: Record<string, number>;
  handover_to?: string;
  handover_time?: string;
  status: 'open' | 'closed' | 'verified' | 'discrepancy';
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface GSTLedgerEntry {
  id: string;
  transaction_date: string;
  transaction_type: 'sale' | 'purchase' | 'sale_return' | 'purchase_return';
  reference_type: string;
  reference_id: string;
  reference_number?: string;
  party_name?: string;
  party_gstin?: string;
  hsn_code?: string;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_gst: number;
  total_amount: number;
  gst_return_period?: string;
  filed_status: 'pending' | 'filed' | 'amended';
  created_at: string;
}

// =====================================================
// SUPPLIER MANAGEMENT
// =====================================================

export async function getSuppliers(filters?: {
  status?: string;
  search?: string;
}): Promise<Supplier[]> {
  try {
    let query = supabase.from('suppliers').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,supplier_code.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('name');

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

export async function createSupplier(supplier: Partial<Supplier>): Promise<Supplier | null> {
  try {
    const { data: codeData } = await supabase.rpc('generate_supplier_code');
    
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        ...supplier,
        supplier_code: codeData || `SUP-${Date.now()}`
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createSupplier:', error);
    throw error;
  }
}

export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateSupplier:', error);
    throw error;
  }
}

// =====================================================
// DRUG PURCHASE MANAGEMENT
// =====================================================

export async function getDrugPurchases(filters?: {
  status?: string;
  supplier_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}): Promise<DrugPurchase[]> {
  try {
    let query = supabase
      .from('drug_purchases')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code, gstin)
      `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }

    if (filters?.from_date) {
      query = query.gte('purchase_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('purchase_date', filters.to_date);
    }

    if (filters?.search) {
      query = query.or(`purchase_number.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('purchase_date', { ascending: false });

    if (error) {
      console.error('Error fetching drug purchases:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDrugPurchases:', error);
    return [];
  }
}

export async function getDrugPurchaseById(id: string): Promise<DrugPurchase | null> {
  try {
    const { data: purchase, error } = await supabase
      .from('drug_purchases')
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching purchase:', error);
      return null;
    }

    // Get purchase items
    const { data: items } = await supabase
      .from('drug_purchase_items')
      .select(`
        *,
        medication:medications(id, name, medicine_code, generic_name)
      `)
      .eq('purchase_id', id);

    return {
      ...purchase,
      items: items?.map(item => ({
        ...item,
        medication_name: item.medication?.name || ''
      })) || []
    };
  } catch (error) {
    console.error('Error in getDrugPurchaseById:', error);
    return null;
  }
}

export async function createDrugPurchase(
  purchase: Partial<DrugPurchase>,
  items: DrugPurchaseItem[]
): Promise<DrugPurchase | null> {
  try {
    // Generate purchase number
    const { data: purchaseNumber } = await supabase.rpc('generate_purchase_number');

    // Calculate totals
    let subtotal = 0;
    let totalGst = 0;

    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100);
      subtotal += itemSubtotal;
      totalGst += item.gst_amount || 0;
    });

    const totalAmount = subtotal + totalGst + (purchase.other_charges || 0) - (purchase.discount_amount || 0);

    // Create purchase record
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('drug_purchases')
      .insert({
        purchase_number: purchaseNumber || `PUR-${Date.now()}`,
        supplier_id: purchase.supplier_id,
        invoice_number: purchase.invoice_number,
        invoice_date: purchase.invoice_date,
        purchase_date: purchase.purchase_date || new Date().toISOString().split('T')[0],
        subtotal,
        discount_amount: purchase.discount_amount || 0,
        cgst_amount: purchase.cgst_amount || totalGst / 2,
        sgst_amount: purchase.sgst_amount || totalGst / 2,
        igst_amount: purchase.igst_amount || 0,
        total_gst: totalGst,
        other_charges: purchase.other_charges || 0,
        total_amount: totalAmount,
        payment_status: purchase.payment_status || 'pending',
        payment_mode: purchase.payment_mode || 'credit',
        paid_amount: purchase.paid_amount || 0,
        due_date: purchase.due_date,
        remarks: purchase.remarks,
        received_by: purchase.received_by,
        status: purchase.status || 'received'
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error creating purchase:', purchaseError);
      throw purchaseError;
    }

    // Create purchase items (triggers will update stock)
    const itemsToInsert = items.map(item => ({
      purchase_id: purchaseData.id,
      medication_id: item.medication_id,
      batch_number: item.batch_number,
      manufacturing_date: item.manufacturing_date,
      expiry_date: item.expiry_date,
      quantity: item.quantity,
      free_quantity: item.free_quantity || 0,
      unit_price: item.unit_price,
      mrp: item.mrp,
      discount_percent: item.discount_percent || 0,
      gst_percent: item.gst_percent || 12,
      cgst_percent: item.cgst_percent || 6,
      sgst_percent: item.sgst_percent || 6,
      igst_percent: item.igst_percent || 0,
      gst_amount: item.gst_amount || 0,
      total_amount: item.total_amount,
      hsn_code: item.hsn_code,
      rack_location: item.rack_location
    }));

    const { error: itemsError } = await supabase
      .from('drug_purchase_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating purchase items:', itemsError);
      // Rollback purchase
      await supabase.from('drug_purchases').delete().eq('id', purchaseData.id);
      throw itemsError;
    }

    // Add to GST ledger
    await addToGSTLedger({
      transaction_date: purchaseData.purchase_date,
      transaction_type: 'purchase',
      reference_type: 'drug_purchase',
      reference_id: purchaseData.id,
      reference_number: purchaseData.purchase_number,
      party_name: (await getSupplierById(purchase.supplier_id!))?.name,
      party_gstin: (await getSupplierById(purchase.supplier_id!))?.gstin,
      taxable_amount: subtotal,
      cgst_amount: purchase.cgst_amount || totalGst / 2,
      sgst_amount: purchase.sgst_amount || totalGst / 2,
      total_gst: totalGst,
      total_amount: totalAmount
    });

    return purchaseData;
  } catch (error) {
    console.error('Error in createDrugPurchase:', error);
    throw error;
  }
}

async function getSupplierById(id: string): Promise<Supplier | null> {
  const { data } = await supabase.from('suppliers').select('*').eq('id', id).single();
  return data;
}

// =====================================================
// PURCHASE RETURN MANAGEMENT
// =====================================================

export async function getPurchaseReturns(filters?: {
  status?: string;
  supplier_id?: string;
  from_date?: string;
  to_date?: string;
}): Promise<PurchaseReturn[]> {
  try {
    let query = supabase
      .from('purchase_returns')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code)
      `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }

    if (filters?.from_date) {
      query = query.gte('return_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('return_date', filters.to_date);
    }

    const { data, error } = await query.order('return_date', { ascending: false });

    if (error) {
      console.error('Error fetching purchase returns:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPurchaseReturns:', error);
    return [];
  }
}

export async function createPurchaseReturn(
  returnData: Partial<PurchaseReturn>,
  items: PurchaseReturnItem[]
): Promise<PurchaseReturn | null> {
  try {
    const { data: returnNumber } = await supabase.rpc('generate_purchase_return_number');

    let subtotal = 0;
    let totalGst = 0;

    items.forEach(item => {
      subtotal += item.quantity * item.unit_price;
      totalGst += item.gst_amount || 0;
    });

    const { data: prData, error } = await supabase
      .from('purchase_returns')
      .insert({
        return_number: returnNumber || `PR-${Date.now()}`,
        purchase_id: returnData.purchase_id,
        supplier_id: returnData.supplier_id,
        return_date: returnData.return_date || new Date().toISOString().split('T')[0],
        subtotal,
        gst_amount: totalGst,
        total_amount: subtotal + totalGst,
        reason: returnData.reason,
        reason_details: returnData.reason_details,
        status: returnData.status || 'draft',
        processed_by: returnData.processed_by
      })
      .select()
      .single();

    if (error) throw error;

    // Insert items
    const itemsToInsert = items.map(item => ({
      return_id: prData.id,
      medication_id: item.medication_id,
      batch_number: item.batch_number,
      quantity: item.quantity,
      unit_price: item.unit_price,
      gst_percent: item.gst_percent || 0,
      gst_amount: item.gst_amount || 0,
      total_amount: item.total_amount,
      reason: item.reason
    }));

    await supabase.from('purchase_return_items').insert(itemsToInsert);

    // Update stock (reduce)
    for (const item of items) {
      await supabase
        .from('medications')
        .select('available_stock')
        .eq('id', item.medication_id)
        .single()
        .then(async ({ data: med }) => {
          if (med) {
            await supabase
              .from('medications')
              .update({ 
                available_stock: Math.max(0, (med.available_stock || 0) - item.quantity),
                updated_at: new Date().toISOString()
              })
              .eq('id', item.medication_id);
          }
        });

      // Add stock transaction
      await supabase.from('stock_transactions').insert({
        medication_id: item.medication_id,
        transaction_type: 'return',
        quantity: -item.quantity,
        unit_price: item.unit_price,
        batch_number: item.batch_number,
        notes: `Purchase Return: ${prData.return_number}`,
        transaction_date: new Date().toISOString()
      });
    }

    return prData;
  } catch (error) {
    console.error('Error in createPurchaseReturn:', error);
    throw error;
  }
}

// =====================================================
// DEPARTMENT DRUG ISSUE MANAGEMENT
// =====================================================

export async function getDepartments(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDepartments:', error);
    return [];
  }
}

export async function getDepartmentDrugIssues(filters?: {
  status?: string;
  department_id?: string;
  from_date?: string;
  to_date?: string;
}): Promise<DepartmentDrugIssue[]> {
  try {
    let query = supabase.from('department_drug_issues').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.department_id) {
      query = query.eq('department_id', filters.department_id);
    }

    if (filters?.from_date) {
      query = query.gte('issue_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('issue_date', filters.to_date);
    }

    const { data, error } = await query.order('issue_date', { ascending: false });

    if (error) {
      console.error('Error fetching department drug issues:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDepartmentDrugIssues:', error);
    return [];
  }
}

export async function createDepartmentDrugIssue(
  issue: Partial<DepartmentDrugIssue>,
  items: DepartmentDrugIssueItem[]
): Promise<DepartmentDrugIssue | null> {
  try {
    const { data: issueNumber } = await supabase.rpc('generate_dept_issue_number');

    let totalValue = 0;
    items.forEach(item => {
      totalValue += (item.requested_quantity * (item.unit_price || 0));
    });

    const { data: issueData, error } = await supabase
      .from('department_drug_issues')
      .insert({
        issue_number: issueNumber || `DI-${Date.now()}`,
        department_id: issue.department_id,
        department_name: issue.department_name,
        requested_by: issue.requested_by,
        requester_name: issue.requester_name,
        issue_date: issue.issue_date || new Date().toISOString().split('T')[0],
        purpose: issue.purpose,
        total_items: items.length,
        total_value: totalValue,
        status: issue.status || 'pending',
        remarks: issue.remarks
      })
      .select()
      .single();

    if (error) throw error;

    // Insert items
    const itemsToInsert = items.map(item => ({
      issue_id: issueData.id,
      medication_id: item.medication_id,
      medication_name: item.medication_name,
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
      requested_quantity: item.requested_quantity,
      issued_quantity: 0,
      unit_price: item.unit_price,
      total_amount: item.requested_quantity * (item.unit_price || 0),
      status: 'pending'
    }));

    await supabase.from('department_drug_issue_items').insert(itemsToInsert);

    return issueData;
  } catch (error) {
    console.error('Error in createDepartmentDrugIssue:', error);
    throw error;
  }
}

export async function issueDepartmentDrugs(
  issueId: string,
  items: { item_id: string; issued_quantity: number; batch_number: string }[],
  issuedBy: string
): Promise<boolean> {
  try {
    for (const item of items) {
      // Update issue item
      await supabase
        .from('department_drug_issue_items')
        .update({
          issued_quantity: item.issued_quantity,
          batch_number: item.batch_number,
          status: 'issued'
        })
        .eq('id', item.item_id);
    }

    // Update main issue status
    await supabase
      .from('department_drug_issues')
      .update({
        status: 'issued',
        issued_by: issuedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', issueId);

    return true;
  } catch (error) {
    console.error('Error in issueDepartmentDrugs:', error);
    throw error;
  }
}

// =====================================================
// SALES RETURN MANAGEMENT
// =====================================================

export async function getSalesReturns(filters?: {
  status?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}): Promise<SalesReturn[]> {
  try {
    let query = supabase.from('sales_returns').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.from_date) {
      query = query.gte('return_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('return_date', filters.to_date);
    }

    if (filters?.search) {
      query = query.or(`return_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,bill_id::text.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('return_date', { ascending: false });

    if (error) {
      console.error('Error fetching sales returns:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSalesReturns:', error);
    return [];
  }
}

export async function createSalesReturn(
  returnData: Partial<SalesReturn>,
  items: SalesReturnItem[]
): Promise<SalesReturn | null> {
  try {
    let totalQuantity = 0;
    let totalAmount = 0;

    items.forEach((item) => {
      totalQuantity += Number(item.quantity || 0);
      totalAmount += Number(item.total_amount || 0);
    });

    // Prefer DB default return_number (generate_sales_return_number())
    const { data: srData, error: srError } = await supabase
      .from('sales_returns')
      .insert({
        return_number: `SR-${Date.now()}`,
        bill_id: (returnData as any).bill_id ?? returnData.original_bill_id,
        customer_name: returnData.customer_name,
        customer_phone: (returnData as any).customer_phone,
        return_date: returnData.return_date || new Date().toISOString().split('T')[0],
        reason: returnData.reason,
        return_reason_code: (returnData as any).return_reason_code,
        status: returnData.status || 'draft',
        refund_mode: (returnData as any).refund_mode,
        refund_amount: Number((returnData as any).refund_amount ?? 0),
        total_quantity: Number(totalQuantity),
        total_amount: Number(totalAmount),
        net_amount: Number(totalAmount),
        remarks: (returnData as any).remarks ?? returnData.reason_details
      })
      .select('*')
      .single();

    if (srError) {
      console.error('Error inserting sales_returns:', {
        message: (srError as any)?.message,
        details: (srError as any)?.details,
        hint: (srError as any)?.hint,
        code: (srError as any)?.code
      });
      throw srError;
    }

    const itemsToInsert = items.map((item) => ({
      return_id: srData.id,
      medication_id: item.medication_id,
      batch_number: item.batch_number,
      expiry_date: (item as any).expiry_date,
      quantity: Number(item.quantity || 0),
      selling_rate: Number(item.unit_price || 0),
      total_amount: Number(item.total_amount || 0),
      return_reason: (item as any).reason,
      restock_status: item.restock_status || 'pending'
    }));

    const { error: sriError } = await supabase.from('sales_return_items').insert(itemsToInsert);
    if (sriError) {
      console.error('Error inserting sales_return_items:', {
        message: (sriError as any)?.message,
        details: (sriError as any)?.details,
        hint: (sriError as any)?.hint,
        code: (sriError as any)?.code
      });
      throw sriError;
    }

    return srData;
  } catch (error) {
    console.error('Error in createSalesReturn:', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code
    });
    console.error('Error in createSalesReturn (raw):', error);
    throw error;
  }
}

// Get pharmacy bill details with all items for return processing
export async function getPharmacyBillForReturn(billId: string): Promise<{
  bill: any
  items: any[]
}> {
  try {
    const { data: bill, error: billError } = await supabase
      .from('billing')
      .select(`
        id,
        bill_number,
        customer_name,
        customer_phone,
        customer_type,
        patient_id,
        subtotal,
        discount,
        tax,
        total,
        amount_paid,
        balance_due,
        payment_method,
        payment_status,
        created_at
      `)
      .eq('id', billId)
      .single()

    if (billError) {
      console.error('getPharmacyBillForReturn billError:', {
        message: (billError as any)?.message,
        details: (billError as any)?.details,
        hint: (billError as any)?.hint,
        code: (billError as any)?.code
      })
      throw billError
    }

    const { data: items, error: itemsError } = await supabase
      .from('billing_item')
      .select(
        'id,billing_id,description,qty,unit_amount,total_amount,medicine_id,batch_number,expiry_date'
      )
      .eq('billing_id', billId)

    if (itemsError) {
      console.error('getPharmacyBillForReturn itemsError:', {
        message: (itemsError as any)?.message,
        details: (itemsError as any)?.details,
        hint: (itemsError as any)?.hint,
        code: (itemsError as any)?.code
      })
      throw itemsError
    }

    const safeItems = items || []
    const medicineIds = Array.from(
      new Set(
        safeItems
          .map((it: any) => it.medicine_id)
          .filter((id: string | null) => !!id)
      )
    ) as string[]

    let medsMap: Record<string, any> = {}
    if (medicineIds.length > 0) {
      const { data: medsData, error: medsError } = await supabase
        .from('medications')
        .select('id,name,medication_code,category,manufacturer,gst_percent')
        .in('id', medicineIds)

      if (medsError) {
        console.warn('Medications enrichment skipped due to error:', medsError?.message || medsError)
      } else if (medsData) {
        medsMap = (medsData as any[]).reduce((acc: any, m: any) => {
          acc[m.id] = m
          return acc
        }, {})
      }
    }

    const enrichedItems = safeItems.map((it: any) => ({
      ...it,
      medication: it.medicine_id ? medsMap[it.medicine_id] : null
    }))

    return { bill, items: enrichedItems }
  } catch (error: any) {
    console.error('Error in getPharmacyBillForReturn:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    })
    console.error('Error in getPharmacyBillForReturn (raw):', error)
    throw error
  }
}

// Search pharmacy bills for return
export async function searchPharmacyBills(searchTerm: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('billing')
      .select(`
        id,
        bill_number,
        customer_name,
        customer_phone,
        total,
        payment_status,
        created_at,
        patient_id,
        customer_type
      `)
      .or(`bill_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error in searchPharmacyBills:', error?.message || error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error in searchPharmacyBills:', error)
    return []
  }
}

// Get recent bills for easy selection
export async function getRecentBills(limit: number = 5): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('billing')
      .select(`
        id,
        bill_number,
        customer_name,
        customer_phone,
        total,
        payment_status,
        created_at,
        patient_id,
        customer_type
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error in getRecentBills:', error?.message || error)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Error in getRecentBills:', error)
    return []
  }
}

// Update original pharmacy bill after return
export async function updateBillAfterReturn(
  billId: string,
  returnAmount: number,
  returnItems: { bill_item_id: string; quantity: number }[]
): Promise<{
  refundAmount: number
  newTotal: number
  newAmountPaid: number
  newBalanceDue: number
}> {
  try {
    if (!billId) {
      throw new Error('updateBillAfterReturn: billId is required')
    }

    if (!Array.isArray(returnItems) || returnItems.length === 0) {
      throw new Error('updateBillAfterReturn: returnItems is empty')
    }

    const invalidLine = returnItems.find((x) => !x?.bill_item_id)
    if (invalidLine) {
      throw new Error('updateBillAfterReturn: bill_item_id missing in returnItems')
    }

    // Get current bill
    const { data: bill, error: billError } = await supabase
      .from('billing')
      .select('*')
      .eq('id', billId)
      .single()

    if (billError) throw billError

    // Calculate new bill amount
    const currentTotal = Number(bill.total || 0)
    const currentSubtotal = Number(bill.subtotal || 0)
    const currentPaid = Number(bill.amount_paid || 0)

    const safeReturnAmount = Number(returnAmount || 0)
    if (!Number.isFinite(safeReturnAmount)) {
      throw new Error('updateBillAfterReturn: returnAmount is not a valid number')
    }

    const newTotalAmount = Math.max(0, currentTotal - safeReturnAmount)
    const newSubtotal = Math.max(0, currentSubtotal - safeReturnAmount)

    // Update bill subtotal first (total is a generated column in DB and cannot be set directly)
    const { data: updatedBill, error: updateSubtotalError } = await supabase
      .from('billing')
      .update({
        subtotal: newSubtotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId)
      .select('*')
      .single()

    if (updateSubtotalError) {
      console.error('updateBillAfterReturn billing updateError:', {
        message: (updateSubtotalError as any)?.message,
        details: (updateSubtotalError as any)?.details,
        hint: (updateSubtotalError as any)?.hint,
        code: (updateSubtotalError as any)?.code
      })
      throw updateSubtotalError
    }

    const computedNewTotal = Number((updatedBill as any)?.total ?? newTotalAmount)

    // Refund is due only if the patient/customer has already paid more than the new total
    const refundAmount = Math.max(0, currentPaid - computedNewTotal)
    const newAmountPaid = Math.min(currentPaid, computedNewTotal)
    const newBalanceDue = Math.max(0, computedNewTotal - newAmountPaid)

    // Update payment fields after total has been recomputed by DB
    const { error: updatePaymentError } = await supabase
      .from('billing')
      .update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId)

    if (updatePaymentError) {
      console.error('updateBillAfterReturn billing updateError:', {
        message: (updatePaymentError as any)?.message,
        details: (updatePaymentError as any)?.details,
        hint: (updatePaymentError as any)?.hint,
        code: (updatePaymentError as any)?.code
      })
      throw updatePaymentError
    }

    // Update bill items quantities
    for (const item of returnItems) {
      const { data: billItem, error: billItemError } = await supabase
        .from('billing_item')
        .select('*')
        .eq('id', item.bill_item_id)
        .eq('billing_id', billId)
        .maybeSingle()

      if (billItemError) {
        console.error('updateBillAfterReturn billItemError:', {
          message: (billItemError as any)?.message,
          details: (billItemError as any)?.details,
          hint: (billItemError as any)?.hint,
          code: (billItemError as any)?.code
        })
        throw billItemError
      }

      if (!billItem) {
        throw new Error(`updateBillAfterReturn: billing_item not found for id ${item.bill_item_id}`)
      }

      if (billItem) {
        const newQuantity = Math.max(0, (billItem.qty || 0) - item.quantity)
        const newLineTotal = Number(newQuantity) * Number(billItem.unit_amount || 0)

        await supabase
          .from('billing_item')
          .update({
            qty: newQuantity,
            total_amount: newLineTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', billItem.id)
      }
    }

    return {
      refundAmount,
      newTotal: computedNewTotal,
      newAmountPaid,
      newBalanceDue
    }
  } catch (error) {
    console.error('Error in updateBillAfterReturn:', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code
    })
    console.error('Error in updateBillAfterReturn (raw):', error)
    try {
      console.error('Error in updateBillAfterReturn (json):', JSON.stringify(error))
    } catch {}
    throw error
  }
}

export async function processRestockSalesReturn(
  returnId: string,
  itemsToRestock: { item_id: string; restock: boolean }[]
): Promise<boolean> {
  try {
    for (const item of itemsToRestock) {
      if (item.restock) {
        await supabase
          .from('sales_return_items')
          .update({ restock_status: 'restocked' })
          .eq('id', item.item_id);
      } else {
        await supabase
          .from('sales_return_items')
          .update({ restock_status: 'disposed' })
          .eq('id', item.item_id);
      }
    }

    // Update return status
    await supabase
      .from('sales_returns')
      .update({
        status: 'completed',
        refund_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', returnId);

    return true;
  } catch (error) {
    console.error('Error in processRestockSalesReturn:', error);
    throw error;
  }
}

// =====================================================
// DRUG BROKEN/DAMAGED MANAGEMENT
// =====================================================

export async function getDrugBrokenRecords(filters?: {
  status?: string;
  damage_type?: string;
  from_date?: string;
  to_date?: string;
}): Promise<DrugBrokenRecord[]> {
  try {
    let query = supabase.from('drug_broken_records').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.damage_type) {
      query = query.eq('damage_type', filters.damage_type);
    }

    if (filters?.from_date) {
      query = query.gte('record_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('record_date', filters.to_date);
    }

    const { data, error } = await query.order('record_date', { ascending: false });

    if (error) {
      console.error('Error fetching drug broken records:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDrugBrokenRecords:', error);
    return [];
  }
}

export async function createDrugBrokenRecord(
  record: Partial<DrugBrokenRecord>
): Promise<DrugBrokenRecord | null> {
  try {
    const { data: recordNumber } = await supabase.rpc('generate_drug_broken_number');

    // Get medication name if not provided
    let medicationName = record.medication_name;
    if (!medicationName && record.medication_id) {
      const { data: med } = await supabase
        .from('medications')
        .select('name')
        .eq('id', record.medication_id)
        .single();
      medicationName = med?.name;
    }

    // Get unit price if not provided
    let unitPrice = record.unit_price;
    if (!unitPrice && record.medication_id) {
      const { data: med } = await supabase
        .from('medications')
        .select('selling_price')
        .eq('id', record.medication_id)
        .single();
      unitPrice = med?.selling_price || 0;
    }

    const totalLoss = (record.quantity || 0) * (unitPrice || 0);

    const { data, error } = await supabase
      .from('drug_broken_records')
      .insert({
        record_number: recordNumber || `DB-${Date.now()}`,
        record_date: record.record_date || new Date().toISOString().split('T')[0],
        medication_id: record.medication_id,
        medication_name: medicationName,
        batch_number: record.batch_number,
        expiry_date: record.expiry_date,
        quantity: record.quantity,
        unit_price: unitPrice,
        total_loss: totalLoss,
        damage_type: record.damage_type,
        damage_description: record.damage_description,
        location: record.location,
        discovered_by: record.discovered_by,
        discoverer_name: record.discoverer_name,
        disposal_method: record.disposal_method || 'pending',
        status: record.status || 'reported',
        remarks: record.remarks
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error in createDrugBrokenRecord:', error);
    throw error;
  }
}

// =====================================================
// CASH COLLECTION MANAGEMENT
// =====================================================

export async function getCashCollections(filters?: {
  status?: string;
  collected_by?: string;
  from_date?: string;
  to_date?: string;
}): Promise<CashCollection[]> {
  try {
    let query = supabase.from('pharmacy_cash_collections').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.collected_by) {
      query = query.eq('collected_by', filters.collected_by);
    }

    if (filters?.from_date) {
      query = query.gte('collection_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('collection_date', filters.to_date);
    }

    const { data, error } = await query.order('collection_date', { ascending: false });

    if (error) {
      console.error('Error fetching cash collections:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCashCollections:', error);
    return [];
  }
}

export async function createCashCollection(
  collection: Partial<CashCollection>
): Promise<CashCollection | null> {
  try {
    const { data: collectionNumber } = await supabase.rpc('generate_cash_collection_number');

    const totalCollections = 
      (collection.cash_sales || 0) +
      (collection.card_collections || 0) +
      (collection.upi_collections || 0) +
      (collection.insurance_collections || 0) +
      (collection.credit_collections || 0);

    const expectedCash = 
      (collection.opening_cash || 0) +
      (collection.cash_sales || 0) -
      (collection.cash_refunds || 0);

    const { data, error } = await supabase
      .from('pharmacy_cash_collections')
      .insert({
        collection_number: collectionNumber || `CC-${Date.now()}`,
        collection_date: collection.collection_date || new Date().toISOString().split('T')[0],
        shift: collection.shift || 'general',
        collected_by: collection.collected_by,
        collector_name: collection.collector_name,
        opening_cash: collection.opening_cash || 0,
        cash_sales: collection.cash_sales || 0,
        card_collections: collection.card_collections || 0,
        upi_collections: collection.upi_collections || 0,
        insurance_collections: collection.insurance_collections || 0,
        credit_collections: collection.credit_collections || 0,
        cash_refunds: collection.cash_refunds || 0,
        total_collections: totalCollections,
        total_bills: collection.total_bills || 0,
        total_returns: collection.total_returns || 0,
        expected_cash: expectedCash,
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error in createCashCollection:', error);
    throw error;
  }
}

export async function closeCashCollection(
  id: string,
  actualCash: number,
  denominations?: Record<string, number>,
  handoverTo?: string,
  remarks?: string
): Promise<CashCollection | null> {
  try {
    // Get current collection
    const { data: collection } = await supabase
      .from('pharmacy_cash_collections')
      .select('expected_cash')
      .eq('id', id)
      .single();

    const cashDifference = actualCash - (collection?.expected_cash || 0);
    const status = Math.abs(cashDifference) > 10 ? 'discrepancy' : 'closed';

    const { data, error } = await supabase
      .from('pharmacy_cash_collections')
      .update({
        actual_cash: actualCash,
        cash_difference: cashDifference,
        denominations,
        handover_to: handoverTo,
        handover_time: new Date().toISOString(),
        status,
        remarks,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error in closeCashCollection:', error);
    throw error;
  }
}

// =====================================================
// GST REPORT FUNCTIONS
// =====================================================

async function addToGSTLedger(entry: Partial<GSTLedgerEntry>): Promise<void> {
  try {
    await supabase.from('pharmacy_gst_ledger').insert({
      transaction_date: entry.transaction_date,
      transaction_type: entry.transaction_type,
      reference_type: entry.reference_type,
      reference_id: entry.reference_id,
      reference_number: entry.reference_number,
      party_name: entry.party_name,
      party_gstin: entry.party_gstin,
      hsn_code: entry.hsn_code,
      taxable_amount: entry.taxable_amount || 0,
      cgst_rate: entry.cgst_rate || 6,
      cgst_amount: entry.cgst_amount || 0,
      sgst_rate: entry.sgst_rate || 6,
      sgst_amount: entry.sgst_amount || 0,
      igst_rate: entry.igst_rate || 0,
      igst_amount: entry.igst_amount || 0,
      total_gst: entry.total_gst || 0,
      total_amount: entry.total_amount || 0,
      gst_return_period: getGSTReturnPeriod(entry.transaction_date || new Date().toISOString()),
      filed_status: 'pending'
    });
  } catch (error) {
    console.error('Error adding to GST ledger:', error);
  }
}

function getGSTReturnPeriod(dateStr: string): string {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${year}`;
}

export async function getGSTReport(filters: {
  from_date: string;
  to_date: string;
  transaction_type?: string;
}): Promise<{
  summary: {
    total_taxable: number;
    total_cgst: number;
    total_sgst: number;
    total_igst: number;
    total_gst: number;
    total_amount: number;
  };
  entries: GSTLedgerEntry[];
}> {
  try {
    let query = supabase
      .from('pharmacy_gst_ledger')
      .select('*')
      .gte('transaction_date', filters.from_date)
      .lte('transaction_date', filters.to_date);

    if (filters.transaction_type) {
      query = query.eq('transaction_type', filters.transaction_type);
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching GST report:', error);
      return {
        summary: { total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0, total_gst: 0, total_amount: 0 },
        entries: []
      };
    }

    const entries = data || [];

    const summary = entries.reduce((acc, entry) => ({
      total_taxable: acc.total_taxable + (entry.taxable_amount || 0),
      total_cgst: acc.total_cgst + (entry.cgst_amount || 0),
      total_sgst: acc.total_sgst + (entry.sgst_amount || 0),
      total_igst: acc.total_igst + (entry.igst_amount || 0),
      total_gst: acc.total_gst + (entry.total_gst || 0),
      total_amount: acc.total_amount + (entry.total_amount || 0)
    }), { total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0, total_gst: 0, total_amount: 0 });

    return { summary, entries };
  } catch (error) {
    console.error('Error in getGSTReport:', error);
    return {
      summary: { total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0, total_gst: 0, total_amount: 0 },
      entries: []
    };
  }
}

// =====================================================
// DRUG STOCK REPORT
// =====================================================

export async function getDrugStockReport(filters?: {
  category?: string;
  low_stock_only?: boolean;
  expired_only?: boolean;
  expiring_soon_days?: number;
}): Promise<{
  summary: {
    total_medicines: number;
    total_stock_value: number;
    low_stock_count: number;
    expired_count: number;
    expiring_soon_count: number;
  };
  items: any[];
}> {
  try {
    let query = supabase
      .from('medications')
      .select(`
        id, medicine_code, name, generic_name, category, manufacturer,
        dosage_form, strength, unit, available_stock, minimum_stock_level,
        purchase_price, selling_price, mrp, status
      `)
      .eq('status', 'active');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data: medications, error } = await query.order('name');

    if (error) {
      console.error('Error fetching medications:', error);
      return {
        summary: { total_medicines: 0, total_stock_value: 0, low_stock_count: 0, expired_count: 0, expiring_soon_count: 0 },
        items: []
      };
    }

    // Get batch information
    const { data: batches } = await supabase
      .from('medicine_batches')
      .select('medicine_id, batch_number, expiry_date, current_quantity, selling_price');

    const now = new Date();
    const expiryDays = filters?.expiring_soon_days || 30;
    const expiryThreshold = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    let items = medications?.map(med => {
      const medBatches = batches?.filter(b => b.medicine_id === med.id) || [];
      const expiredBatches = medBatches.filter(b => new Date(b.expiry_date) < now);
      const expiringSoonBatches = medBatches.filter(b => {
        const expiry = new Date(b.expiry_date);
        return expiry >= now && expiry <= expiryThreshold;
      });

      return {
        ...med,
        stock_value: (med.available_stock || 0) * (med.selling_price || 0),
        is_low_stock: (med.available_stock || 0) <= (med.minimum_stock_level || 0),
        expired_quantity: expiredBatches.reduce((sum, b) => sum + (b.current_quantity || 0), 0),
        expiring_soon_quantity: expiringSoonBatches.reduce((sum, b) => sum + (b.current_quantity || 0), 0),
        batches: medBatches
      };
    }) || [];

    // Apply filters
    if (filters?.low_stock_only) {
      items = items.filter(item => item.is_low_stock);
    }

    if (filters?.expired_only) {
      items = items.filter(item => item.expired_quantity > 0);
    }

    const summary = {
      total_medicines: items.length,
      total_stock_value: items.reduce((sum, item) => sum + item.stock_value, 0),
      low_stock_count: items.filter(item => item.is_low_stock).length,
      expired_count: items.filter(item => item.expired_quantity > 0).length,
      expiring_soon_count: items.filter(item => item.expiring_soon_quantity > 0).length
    };

    return { summary, items };
  } catch (error) {
    console.error('Error in getDrugStockReport:', error);
    return {
      summary: { total_medicines: 0, total_stock_value: 0, low_stock_count: 0, expired_count: 0, expiring_soon_count: 0 },
      items: []
    };
  }
}

// =====================================================
// MEDICAL REPORT (Pharmacy Transactions Summary)
// =====================================================

export async function getMedicalReport(filters: {
  from_date: string;
  to_date: string;
  report_type?: 'daily' | 'weekly' | 'monthly';
}): Promise<{
  summary: {
    total_sales: number;
    total_purchases: number;
    total_returns: number;
    total_damaged: number;
    net_revenue: number;
    total_bills: number;
    average_bill_value: number;
  };
  daily_breakdown: any[];
  top_selling_drugs: any[];
  category_wise: any[];
}> {
  try {
    // Get sales data
    const { data: sales } = await supabase
      .from('billing')
      .select('total_amount, created_at, payment_status')
      .gte('created_at', filters.from_date)
      .lte('created_at', filters.to_date)
      .in('payment_status', ['paid', 'completed']);

    // Get purchase data
    const { data: purchases } = await supabase
      .from('drug_purchases')
      .select('total_amount, purchase_date')
      .gte('purchase_date', filters.from_date)
      .lte('purchase_date', filters.to_date)
      .eq('status', 'received');

    // Get returns data
    const { data: salesReturns } = await supabase
      .from('sales_returns')
      .select('total_amount, return_date')
      .gte('return_date', filters.from_date)
      .lte('return_date', filters.to_date)
      .eq('status', 'completed');

    // Get damaged/broken data
    const { data: damaged } = await supabase
      .from('drug_broken_records')
      .select('total_loss, record_date')
      .gte('record_date', filters.from_date)
      .lte('record_date', filters.to_date);

    // Calculate summary
    const totalSales = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
    const totalPurchases = purchases?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;
    const totalReturns = salesReturns?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
    const totalDamaged = damaged?.reduce((sum, d) => sum + (d.total_loss || 0), 0) || 0;
    const totalBills = sales?.length || 0;

    const summary = {
      total_sales: totalSales,
      total_purchases: totalPurchases,
      total_returns: totalReturns,
      total_damaged: totalDamaged,
      net_revenue: totalSales - totalReturns,
      total_bills: totalBills,
      average_bill_value: totalBills > 0 ? totalSales / totalBills : 0
    };

    // Get top selling drugs
    const { data: topDrugs } = await supabase
      .from('stock_transactions')
      .select(`
        medication_id,
        quantity,
        total_amount,
        medications(name, category)
      `)
      .eq('transaction_type', 'sale')
      .gte('transaction_date', filters.from_date)
      .lte('transaction_date', filters.to_date)
      .order('quantity', { ascending: false })
      .limit(10);

    return {
      summary,
      daily_breakdown: [],
      top_selling_drugs: topDrugs || [],
      category_wise: []
    };
  } catch (error) {
    console.error('Error in getMedicalReport:', error);
    return {
      summary: {
        total_sales: 0,
        total_purchases: 0,
        total_returns: 0,
        total_damaged: 0,
        net_revenue: 0,
        total_bills: 0,
        average_bill_value: 0
      },
      daily_breakdown: [],
      top_selling_drugs: [],
      category_wise: []
    };
  }
}
