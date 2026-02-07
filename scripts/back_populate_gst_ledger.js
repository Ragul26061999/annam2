// Script to back-populate GST ledger for existing pharmacy bills
// Run this once to populate GST data for existing bills

import { supabase } from '../src/lib/supabase.js';

async function backPopulateGSTLedger() {
  try {
    console.log('Starting GST ledger back-population...');

    // Get all pharmacy bills (bill_type IS NULL)
    const { data: pharmacyBills, error: billsError } = await supabase
      .from('billing')
      .select('id, bill_number, customer_name, created_at, tax_percent')
      .is('bill_type', null)
      .order('created_at', { ascending: false });

    if (billsError) {
      console.error('Error fetching pharmacy bills:', billsError);
      return;
    }

    console.log(`Found ${pharmacyBills?.length || 0} pharmacy bills to process`);

    // Process each bill
    for (const bill of pharmacyBills || []) {
      console.log(`Processing bill ${bill.bill_number}...`);

      // Get bill items for this bill
      const { data: billItems, error: itemsError } = await supabase
        .from('billing_item')
        .select(`
          id,
          medicine_id,
          description,
          qty,
          unit_amount,
          total_amount,
          medicines(medication_code, gst_percent)
        `)
        .eq('billing_id', bill.id);

      if (itemsError) {
        console.error(`Error fetching items for bill ${bill.bill_number}:`, itemsError);
        continue;
      }

      // Process each bill item
      for (const item of billItems || []) {
        // Skip if already exists in GST ledger
        const { data: existingEntry } = await supabase
          .from('pharmacy_gst_ledger')
          .select('id')
          .eq('reference_id', bill.id)
          .eq('reference_type', 'billing')
          .limit(1);

        if (existingEntry && existingEntry.length > 0) {
          console.log(`GST entry already exists for bill ${bill.bill_number}, item ${item.id}`);
          continue;
        }

        // Calculate GST components
        const taxPercent = bill.tax_percent || 5; // Default to 5% if not set
        const taxableAmount = item.total_amount / (1 + (taxPercent / 100));
        const gstAmount = item.total_amount - taxableAmount;
        const cgstAmount = gstAmount / 2;
        const sgstAmount = gstAmount / 2;

        // Get HSN code (use medicine's gst_percent if available, else default)
        const hsnCode = '30049099'; // Standard HSN for pharmaceuticals

        // Insert GST ledger entry
        const { error: gstError } = await supabase
          .from('pharmacy_gst_ledger')
          .insert({
            transaction_date: new Date(bill.created_at).toISOString().split('T')[0],
            transaction_type: 'sale',
            reference_type: 'billing',
            reference_id: bill.id,
            reference_number: bill.bill_number,
            party_name: bill.customer_name,
            party_gstin: null,
            hsn_code: hsnCode,
            taxable_amount: Math.round(taxableAmount * 100) / 100,
            cgst_rate: taxPercent / 2,
            cgst_amount: Math.round(cgstAmount * 100) / 100,
            sgst_rate: taxPercent / 2,
            sgst_amount: Math.round(sgstAmount * 100) / 100,
            igst_rate: 0,
            igst_amount: 0,
            total_gst: Math.round(gstAmount * 100) / 100,
            total_amount: item.total_amount,
            gst_return_period: (() => {
              const date = new Date(bill.created_at);
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${month}-${year}`;
            })(),
            filed_status: 'pending'
          });

        if (gstError) {
          console.error(`Error inserting GST entry for bill ${bill.bill_number}, item ${item.id}:`, gstError);
        } else {
          console.log(`Added GST entry for bill ${bill.bill_number}, item ${item.id}`);
        }
      }
    }

    console.log('GST ledger back-population completed!');
  } catch (error) {
    console.error('Error in back-populate GST ledger:', error);
  }
}

// Run the script
backPopulateGSTLedger();
