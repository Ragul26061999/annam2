# Enhanced Pharmacy Module Documentation

**Project:** HMS Annam  
**Module:** Enhanced Pharmacy  
**Created:** January 8, 2026  

---

## Overview

This document describes the comprehensive pharmacy module enhancement that includes 10 key features:

1. **Drug Purchase** - Purchase drugs from suppliers with GST
2. **Purchase Return** - Return drugs to suppliers
3. **Department Drug Issue** - Issue drugs to hospital departments
4. **Drug Sales** - Existing billing enhanced with GST
5. **Sales Return** - Process customer drug returns
6. **Drug Broken** - Track damaged/broken/expired drugs
7. **Medical Report** - Pharmacy transaction summary reports
8. **GST Report** - Tax reports with CGST/SGST breakdown
9. **Drug Stock Report** - Inventory status and alerts
10. **Cash Collection** - Daily cash management and handover

---

## Database Schema

### New Tables Created

| Table | Purpose |
|-------|---------|
| `suppliers` | Supplier master data with GST and license info |
| `drug_purchases` | Purchase orders/GRN header |
| `drug_purchase_items` | Purchase line items with batch tracking |
| `purchase_returns` | Return to supplier header |
| `purchase_return_items` | Return line items |
| `department_drug_issues` | Department issue request header |
| `department_drug_issue_items` | Issue request line items |
| `sales_returns` | Customer return header |
| `sales_return_items` | Customer return line items |
| `drug_broken_records` | Damaged drug records |
| `pharmacy_cash_collections` | Cash collection sessions |
| `pharmacy_gst_ledger` | GST transaction ledger |

### Migration File
`/supabase/migrations/20260108_enhanced_pharmacy_module.sql`

---

## Data Flow Diagrams

### Drug Purchase Flow
```
Supplier → drug_purchases (header)
         → drug_purchase_items (items)
         → TRIGGER: updates medications.available_stock
         → stock_transactions (audit)
         → pharmacy_gst_ledger (GST tracking)
```

### Purchase Return Flow
```
Pharmacy → purchase_returns (header)
        → purchase_return_items (items)
        → Updates medications.available_stock (decrease)
        → stock_transactions (audit)
```

### Department Issue Flow
```
Department Request → department_drug_issues (header)
                  → department_drug_issue_items (items)
                  → Approval Workflow
                  → TRIGGER: updates stock on issue
                  → stock_transactions (audit)
```

### Sales Return Flow
```
Customer Return → sales_returns (header)
              → sales_return_items (items)
              → Restock Decision (restock/dispose)
              → TRIGGER: updates stock if restocked
              → stock_transactions (audit)
```

### Cash Collection Flow
```
Start Shift → pharmacy_cash_collections (open)
           → Track: cash, card, UPI, insurance
           → End Shift: denomination count
           → Calculate difference
           → Close/Verify
```

---

## File Structure

### Service Layer
```
/src/lib/enhancedPharmacyService.ts
  - Supplier CRUD
  - Drug Purchase management
  - Purchase Return processing
  - Department Issue workflow
  - Sales Return processing
  - Drug Broken tracking
  - Cash Collection management
  - GST/Medical/Stock Reports
```

### Pages
```
/app/pharmacy/
  ├── page.tsx (Dashboard with navigation)
  ├── purchase/page.tsx
  ├── purchase-return/page.tsx
  ├── department-issue/page.tsx
  ├── sales-return/page.tsx
  ├── drug-broken/page.tsx
  ├── reports/page.tsx
  ├── cash-collection/page.tsx
  ├── inventory/page.tsx (existing)
  ├── billing/page.tsx (existing)
  └── newbilling/page.tsx (existing)
```

---

## API Reference

### Supplier Functions
```typescript
getSuppliers(filters?: { status?: string; search?: string }): Promise<Supplier[]>
createSupplier(supplier: Partial<Supplier>): Promise<Supplier>
updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier>
```

### Drug Purchase Functions
```typescript
getDrugPurchases(filters?: { status?: string; supplier_id?: string; from_date?: string; to_date?: string }): Promise<DrugPurchase[]>
getDrugPurchaseById(id: string): Promise<DrugPurchase>
createDrugPurchase(purchase: Partial<DrugPurchase>, items: DrugPurchaseItem[]): Promise<DrugPurchase>
```

### Purchase Return Functions
```typescript
getPurchaseReturns(filters?: { status?: string; supplier_id?: string }): Promise<PurchaseReturn[]>
createPurchaseReturn(returnData: Partial<PurchaseReturn>, items: PurchaseReturnItem[]): Promise<PurchaseReturn>
```

### Department Issue Functions
```typescript
getDepartments(): Promise<Department[]>
getDepartmentDrugIssues(filters?: { status?: string; department_id?: string }): Promise<DepartmentDrugIssue[]>
createDepartmentDrugIssue(issue: Partial<DepartmentDrugIssue>, items: DepartmentDrugIssueItem[]): Promise<DepartmentDrugIssue>
issueDepartmentDrugs(issueId: string, items: IssuedItem[], issuedBy: string): Promise<boolean>
```

### Sales Return Functions
```typescript
getSalesReturns(filters?: { status?: string; from_date?: string; to_date?: string }): Promise<SalesReturn[]>
createSalesReturn(returnData: Partial<SalesReturn>, items: SalesReturnItem[]): Promise<SalesReturn>
processRestockSalesReturn(returnId: string, itemsToRestock: RestockItem[]): Promise<boolean>
```

### Drug Broken Functions
```typescript
getDrugBrokenRecords(filters?: { status?: string; damage_type?: string }): Promise<DrugBrokenRecord[]>
createDrugBrokenRecord(record: Partial<DrugBrokenRecord>): Promise<DrugBrokenRecord>
```

### Cash Collection Functions
```typescript
getCashCollections(filters?: { status?: string; collected_by?: string }): Promise<CashCollection[]>
createCashCollection(collection: Partial<CashCollection>): Promise<CashCollection>
closeCashCollection(id: string, actualCash: number, denominations?: object, handoverTo?: string, remarks?: string): Promise<CashCollection>
```

### Report Functions
```typescript
getGSTReport(filters: { from_date: string; to_date: string; transaction_type?: string }): Promise<GSTReport>
getDrugStockReport(filters?: { category?: string; low_stock_only?: boolean }): Promise<StockReport>
getMedicalReport(filters: { from_date: string; to_date: string }): Promise<MedicalReport>
```

---

## GST Calculations

### Tax Rates
- Default GST: 12% (6% CGST + 6% SGST)
- Can be configured per medication
- IGST for inter-state transactions

### GST Fields Added
- `medications`: hsn_code, gst_percent, cgst_percent, sgst_percent
- `billing`: cgst_amount, sgst_amount, igst_amount, customer_gstin

---

## Database Triggers

### Stock Update Triggers
1. `trg_update_stock_on_purchase` - Increases stock when purchase items are inserted
2. `trg_update_stock_on_dept_issue` - Decreases stock when items are issued
3. `trg_update_stock_on_sales_return` - Restocks items when marked as restocked
4. `trg_update_stock_on_drug_broken` - Decreases stock when damage is reported

---

## Document Number Generation

| Document | Prefix | Format |
|----------|--------|--------|
| Purchase | PUR | PUR-YYYYMMDD-0001 |
| Purchase Return | PR | PR-YYYYMMDD-0001 |
| Dept Issue | DI | DI-YYYYMMDD-0001 |
| Sales Return | SR | SR-YYYYMMDD-0001 |
| Drug Broken | DB | DB-YYYYMMDD-0001 |
| Cash Collection | CC | CC-YYYYMMDD-0001 |
| Supplier Code | SUP | SUP-0001 |

---

## Status Workflows

### Purchase Status
`draft` → `received` → `verified` → (or `cancelled`)

### Return Status (Purchase/Sales)
`draft` → `submitted` → `approved` → `completed` → (or `rejected`)

### Department Issue Status
`pending` → `approved` → `issued` → (or `partial`/`rejected`/`returned`)

### Drug Broken Status
`reported` → `verified` → `disposed` → (or `claimed`)

### Cash Collection Status
`open` → `closed` → `verified` → (or `discrepancy`)

---

## Running the Migration

```bash
# Apply the migration to Supabase
npx supabase db push

# Or manually run in SQL editor
# Copy contents of /supabase/migrations/20260108_enhanced_pharmacy_module.sql
```

---

## Quick Navigation

The main pharmacy dashboard (`/app/pharmacy/page.tsx`) now includes:
- 10 quick access cards for all pharmacy modules
- Color-coded icons for easy identification
- Direct links to each feature

---

## Sample Suppliers (Pre-seeded)

| Code | Name | City | GSTIN |
|------|------|------|-------|
| SUP-0001 | ABC Pharmaceuticals | Chennai | 33AABCU9603R1ZM |
| SUP-0002 | MediSupply India | Mumbai | 27AABCU9603R1ZM |
| SUP-0003 | HealthCare Distributors | Bangalore | 29AABCU9603R1ZM |

---

**Last Updated:** January 8, 2026  
**Maintained By:** Development Team
