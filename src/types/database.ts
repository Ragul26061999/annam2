// Database Types for ERPH Project
// Generated from Supabase on January 8, 2026

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Enhanced Pharmacy Module Tables
      drug_purchases: {
        Row: {
          id: string
          purchase_number: string
          supplier_id: string
          purchase_date: string
          invoice_number: string | null
          invoice_date: string | null
          order_number: string | null
          order_date: string | null
          status: 'draft' | 'received' | 'verified' | 'cancelled'
          total_quantity: number
          total_amount: number
          discount_amount: number
          taxable_amount: number
          cgst_amount: number
          sgst_amount: number
          igst_amount: number
          total_tax: number
          net_amount: number
          payment_terms: string | null
          expected_delivery_date: string | null
          remarks: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<DrugPurchases['Row'], 'id' | 'purchase_number' | 'created_at' | 'updated_at'>
        Update: Partial<DrugPurchases['Insert']>
      }
      drug_purchase_items: {
        Row: {
          id: string
          purchase_id: string
          medication_id: string
          batch_number: string
          expiry_date: string
          quantity: number
          free_quantity: number
          mrp: number | null
          purchase_rate: number
          selling_rate: number | null
          discount_percent: number
          discount_amount: number
          taxable_amount: number
          cgst_percent: number
          cgst_amount: number
          sgst_percent: number
          sgst_amount: number
          igst_percent: number
          igst_amount: number
          total_amount: number
          created_at: string
        }
        Insert: Omit<DrugPurchaseItems['Row'], 'id' | 'created_at'>
        Update: Partial<DrugPurchaseItems['Insert']>
      }
      purchase_returns: {
        Row: {
          id: string
          return_number: string
          supplier_id: string
          purchase_id: string | null
          return_date: string
          reason: string | null
          return_reason_code: string | null
          status: 'draft' | 'submitted' | 'approved' | 'completed' | 'rejected'
          total_quantity: number
          total_amount: number
          discount_amount: number
          taxable_amount: number
          cgst_amount: number
          sgst_amount: number
          igst_amount: number
          total_tax: number
          net_amount: number
          remarks: string | null
          approved_by: string | null
          approved_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<PurchaseReturns['Row'], 'id' | 'return_number' | 'created_at' | 'updated_at'>
        Update: Partial<PurchaseReturns['Insert']>
      }
      purchase_return_items: {
        Row: {
          id: string
          return_id: string
          medication_id: string
          batch_number: string
          expiry_date: string
          quantity: number
          purchase_rate: number
          discount_percent: number
          discount_amount: number
          taxable_amount: number
          cgst_percent: number
          cgst_amount: number
          sgst_percent: number
          sgst_amount: number
          igst_percent: number
          igst_amount: number
          total_amount: number
          return_reason: string | null
          created_at: string
        }
        Insert: Omit<PurchaseReturnItems['Row'], 'id' | 'created_at'>
        Update: Partial<PurchaseReturnItems['Insert']>
      }
      department_drug_issues: {
        Row: {
          id: string
          issue_number: string
          department_id: string
          issue_date: string
          requester_name: string | null
          requester_designation: string | null
          purpose: string | null
          urgency: 'normal' | 'urgent' | 'emergency'
          status: 'pending' | 'approved' | 'issued' | 'partial' | 'rejected' | 'returned'
          total_quantity: number
          total_value: number
          issued_by: string | null
          issued_at: string | null
          approved_by: string | null
          approved_at: string | null
          remarks: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<DepartmentDrugIssues['Row'], 'id' | 'issue_number' | 'created_at' | 'updated_at'>
        Update: Partial<DepartmentDrugIssues['Insert']>
      }
      department_drug_issue_items: {
        Row: {
          id: string
          issue_id: string
          medication_id: string
          batch_number: string | null
          expiry_date: string | null
          requested_quantity: number
          issued_quantity: number
          unit_price: number | null
          total_value: number | null
          created_at: string
        }
        Insert: Omit<DepartmentDrugIssueItems['Row'], 'id' | 'created_at'>
        Update: Partial<DepartmentDrugIssueItems['Insert']>
      }
      sales_returns: {
        Row: {
          id: string
          return_number: string
          bill_id: string | null
          customer_name: string | null
          customer_phone: string | null
          return_date: string
          reason: string | null
          return_reason_code: string | null
          status: 'draft' | 'submitted' | 'approved' | 'completed' | 'rejected'
          refund_mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | null
          refund_amount: number
          total_quantity: number
          total_amount: number
          discount_amount: number
          taxable_amount: number
          cgst_amount: number
          sgst_amount: number
          igst_amount: number
          total_tax: number
          net_amount: number
          remarks: string | null
          approved_by: string | null
          approved_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<SalesReturns['Row'], 'id' | 'return_number' | 'created_at' | 'updated_at'>
        Update: Partial<SalesReturns['Insert']>
      }
      sales_return_items: {
        Row: {
          id: string
          return_id: string
          medication_id: string
          batch_number: string | null
          expiry_date: string | null
          quantity: number
          selling_rate: number
          discount_percent: number
          discount_amount: number
          taxable_amount: number
          cgst_percent: number
          cgst_amount: number
          sgst_percent: number
          sgst_amount: number
          igst_percent: number
          igst_amount: number
          total_amount: number
          return_reason: string | null
          restock_status: 'pending' | 'restocked' | 'disposed'
          created_at: string
        }
        Insert: Omit<SalesReturnItems['Row'], 'id' | 'created_at'>
        Update: Partial<SalesReturnItems['Insert']>
      }
      drug_broken_records: {
        Row: {
          id: string
          broken_number: string
          medication_id: string
          batch_number: string
          expiry_date: string | null
          quantity: number
          damage_type: 'broken' | 'expired' | 'damaged' | 'lost' | 'theft' | 'other'
          damage_description: string | null
          location: string | null
          discovered_date: string
          discoverer_name: string | null
          disposal_method: string | null
          disposal_date: string | null
          disposed_by: string | null
          status: 'reported' | 'verified' | 'disposed' | 'claimed'
          estimated_value: number | null
          remarks: string | null
          verified_by: string | null
          verified_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<DrugBrokenRecords['Row'], 'id' | 'broken_number' | 'created_at' | 'updated_at'>
        Update: Partial<DrugBrokenRecords['Insert']>
      }
      pharmacy_cash_collections: {
        Row: {
          id: string
          collection_number: string
          collection_date: string
          shift: 'morning' | 'afternoon' | 'night' | 'general'
          collector_name: string | null
          opening_cash: number
          cash_sales: number
          card_collections: number
          upi_collections: number
          insurance_collections: number
          credit_collections: number
          cash_refunds: number
          total_collections: number
          expected_cash: number
          actual_cash: number | null
          cash_difference: number | null
          denominations: Json | null
          total_bills: number
          total_returns: number
          status: 'open' | 'closed' | 'verified' | 'discrepancy'
          handover_to: string | null
          handover_at: string | null
          verified_by: string | null
          verified_at: string | null
          remarks: string | null
          collected_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<PharmacyCashCollections['Row'], 'id' | 'collection_number' | 'created_at' | 'updated_at'>
        Update: Partial<PharmacyCashCollections['Insert']>
      }
      pharmacy_gst_ledger: {
        Row: {
          id: string
          transaction_date: string
          transaction_type: 'purchase' | 'purchase_return' | 'sales' | 'sales_return'
          reference_id: string | null
          reference_number: string | null
          party_type: 'supplier' | 'customer'
          party_name: string
          party_gstin: string | null
          taxable_amount: number
          cgst_percent: number
          cgst_amount: number
          sgst_percent: number
          sgst_amount: number
          igst_percent: number
          igst_amount: number
          total_gst: number
          total_amount: number
          created_at: string
        }
        Insert: Omit<PharmacyGstLedger['Row'], 'id' | 'created_at'>
        Update: Partial<PharmacyGstLedger['Insert']>
      }
      // Existing tables (simplified)
      suppliers: {
        Row: {
          id: string
          supplier_code: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          postal_code: string | null
          tax_id: string | null
          license_number: string | null
          payment_terms: string | null
          credit_limit: number | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          is_active: boolean | null
          gstin: string | null
          pan_number: string | null
          pincode: string | null
        }
        Insert: Omit<Suppliers['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Suppliers['Insert']>
      }
      medications: {
        Row: {
          id: string
          medicine_code: string
          name: string
          generic_name: string | null
          category: string | null
          dosage_form: string | null
          strength: string | null
          manufacturer: string | null
          unit_price: number | null
          selling_price: number | null
          stock_quantity: number | null
          minimum_stock_level: number | null
          maximum_stock_level: number | null
          reorder_level: number | null
          prescription_required: boolean | null
          status: string | null
          barcode: string | null
          created_at: string | null
          updated_at: string | null
          hsn_code: string | null
          gst_percent: number | null
          cgst_percent: number | null
          sgst_percent: number | null
          igst_percent: number | null
        }
        Insert: Omit<Medications['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Medications['Insert']>
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          head_of_department: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Departments['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Departments['Insert']>
      }
      users: {
        Row: {
          id: string
          auth_id: string | null
          employee_id: string
          name: string
          email: string
          role: string
          specialization: string | null
          department: string | null
          phone: string | null
          address: string | null
          joined_date: string | null
          status: string | null
          permissions: Json | null
          created_at: string | null
          updated_at: string | null
          party_id: string | null
        }
        Insert: Omit<Users['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Users['Insert']>
      }
      pharmacy_bills: {
        Row: {
          id: string
          bill_number: string
          patient_id: string | null
          customer_name: string | null
          customer_phone: string | null
          total_amount: number
          discount: number
          tax: number
          net_amount: number
          payment_method: string | null
          payment_status: string
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          cgst_amount: number | null
          sgst_amount: number | null
          igst_amount: number | null
          customer_gstin: string | null
        }
        Insert: Omit<PharmacyBills['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<PharmacyBills['Insert']>
      }
    }
    Functions: {
      generate_purchase_number: { Args: Record<PropertyKey, never>; Returns: string }
      generate_purchase_return_number: { Args: Record<PropertyKey, never>; Returns: string }
      generate_dept_issue_number: { Args: Record<PropertyKey, never>; Returns: string }
      generate_sales_return_number: { Args: Record<PropertyKey, never>; Returns: string }
      generate_drug_broken_number: { Args: Record<PropertyKey, never>; Returns: string }
      generate_cash_collection_number: { Args: Record<PropertyKey, never>; Returns: string }
    }
  }
}

// Type aliases for easier use
export type DrugPurchases = Database['public']['Tables']['drug_purchases']
export type DrugPurchaseItems = Database['public']['Tables']['drug_purchase_items']
export type PurchaseReturns = Database['public']['Tables']['purchase_returns']
export type PurchaseReturnItems = Database['public']['Tables']['purchase_return_items']
export type DepartmentDrugIssues = Database['public']['Tables']['department_drug_issues']
export type DepartmentDrugIssueItems = Database['public']['Tables']['department_drug_issue_items']
export type SalesReturns = Database['public']['Tables']['sales_returns']
export type SalesReturnItems = Database['public']['Tables']['sales_return_items']
export type DrugBrokenRecords = Database['public']['Tables']['drug_broken_records']
export type PharmacyCashCollections = Database['public']['Tables']['pharmacy_cash_collections']
export type PharmacyGstLedger = Database['public']['Tables']['pharmacy_gst_ledger']
export type Suppliers = Database['public']['Tables']['suppliers']
export type Medications = Database['public']['Tables']['medications']
export type Departments = Database['public']['Tables']['departments']
export type Users = Database['public']['Tables']['users']
export type PharmacyBills = Database['public']['Tables']['pharmacy_bills']
