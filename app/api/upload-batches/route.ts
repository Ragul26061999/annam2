import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { batches } = await request.json();

    if (!batches || !Array.isArray(batches)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Initialize Supabase client with service role key (bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let successCount = 0;
    let errorCount = 0;

    for (const batch of batches) {
      if (!batch.medicationId || !batch.batchNumber) {
        errorCount++;
        continue;
      }

      // 1. Insert Batch
      const { error: batchError } = await supabase
        .from('medicine_batches')
        .insert({
          medicine_id: batch.medicationId,
          batch_number: batch.batchNumber,
          expiry_date: batch.expiryDate,
          current_quantity: batch.quantity,
          received_quantity: batch.quantity,
          purchase_price: batch.purchaseRate,
          selling_price: batch.mrp, // Using MRP as selling price for now, or calculate? Usually MRP is Max, selling is lower. But CSV has MRP.
          status: 'active',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (batchError) {
        console.error(`Error inserting batch ${batch.batchNumber}:`, batchError);
        errorCount++;
        continue;
      }

      // 2. Update Medication Total Stock
      // We need to fetch current stock first or increment it
      // Supabase doesn't support increment in simple update easily without RPC, 
      // so we fetch and update. 
      // Note: Race condition possible but low risk for this admin task.
      
      const { data: med, error: fetchError } = await supabase
        .from('medications')
        .select('total_stock, available_stock')
        .eq('id', batch.medicationId)
        .single();

      if (!fetchError && med) {
        const newTotal = (med.total_stock || 0) + batch.quantity;
        const newAvailable = (med.available_stock || 0) + batch.quantity;

        await supabase
          .from('medications')
          .update({
            total_stock: newTotal,
            available_stock: newAvailable,
            updated_at: new Date().toISOString()
          })
          .eq('id', batch.medicationId);
      }

      successCount++;
    }

    return NextResponse.json({
      success: true,
      successCount,
      errorCount
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
