import { NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase'

export async function POST(request: Request) {
  try {
    // Use regular supabase client instead of admin client
    const body = await request.json()
    const purchase = body?.purchase
    const items = body?.items

    if (!purchase?.supplier_id) {
      return NextResponse.json({ error: 'supplier_id is required' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 })
    }

    // Generate purchase number
    const { data: purchaseNumber, error: purchaseNumberError } = await supabase.rpc('generate_purchase_number')
    if (purchaseNumberError) {
      return NextResponse.json(
        { error: purchaseNumberError.message, code: purchaseNumberError.code, details: purchaseNumberError.details },
        { status: 500 }
      )
    }

    // Calculate totals from items
    let totalQty = 0
    let totalFreeQty = 0
    let subtotal = 0
    let totalDiscount = 0
    let totalTaxable = 0
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0
    let totalTax = 0
    let grandTotal = 0

    for (const item of items) {
      const qty = Number(item.quantity ?? 0)
      const freeQty = Number(item.free_quantity ?? 0)
      const rate = Number(item.rate ?? item.unit_price ?? 0)
      const discPct = Number(item.discount_percent ?? 0)
      const gstPct = Number(item.gst_percent ?? 0)

      const lineSubtotal = qty * rate
      const lineDisc = lineSubtotal * discPct / 100
      const lineTaxable = lineSubtotal - lineDisc
      const lineGst = lineTaxable * gstPct / 100
      const lineCgst = lineGst / 2
      const lineSgst = lineGst / 2
      const lineTotal = lineTaxable + lineGst

      totalQty += qty
      totalFreeQty += freeQty
      subtotal += lineSubtotal
      totalDiscount += lineDisc
      totalTaxable += lineTaxable
      totalCgst += lineCgst
      totalSgst += lineSgst
      totalTax += lineGst
      grandTotal += lineTotal
    }

    // Apply bill-level adjustments
    const billDiscPct = Number(purchase.disc_amount ?? 0) // bill-level discount amount
    const cashDiscount = Number(purchase.cash_discount ?? 0)
    const salesDiscPct = Number(purchase.sales_disc_percent ?? 0)
    const finalTotalDiscount = totalDiscount + billDiscPct + cashDiscount
    const netPayable = grandTotal - billDiscPct - cashDiscount
    const paidAmount = Number(purchase.paid_amount ?? 0)

    // Insert purchase header
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('drug_purchases')
      .insert({
        purchase_number: purchaseNumber || `PUR-${Date.now()}`,
        supplier_id: purchase.supplier_id,
        invoice_number: purchase.bill_no || purchase.invoice_number || null,
        invoice_date: purchase.bill_date || null,
        purchase_date: purchase.received_date || new Date().toISOString().split('T')[0],
        bill_date: purchase.bill_date || null,
        received_date: purchase.received_date || new Date().toISOString().split('T')[0],
        status: purchase.status || 'received',
        total_quantity: totalQty + totalFreeQty,
        total_amount: grandTotal,
        discount_amount: totalDiscount,
        taxable_amount: totalTaxable,
        cgst_amount: totalCgst,
        sgst_amount: totalSgst,
        igst_amount: totalIgst,
        total_tax: totalTax,
        net_amount: netPayable,
        remarks: purchase.remarks || null,
        document_url: purchase.document_url || null,
        // New enhanced fields
        grn_no: purchase.grn_no || null,
        bill_amount: Number(purchase.bill_amount ?? grandTotal),
        gst_amount: totalTax,
        disc_amount: billDiscPct,
        sales_disc_percent: salesDiscPct,
        free_bill: purchase.free_bill || false,
        purchase_account: purchase.purchase_account || 'PURCHASE ACCOUNT',
        cash_discount: cashDiscount,
        paid_amount: paidAmount,
        payment_mode: purchase.payment_mode || 'CREDIT',
        total_discount: finalTotalDiscount,
        net_payable: netPayable,
      })
      .select('*')
      .single()

    if (purchaseError) {
      return NextResponse.json(
        { error: purchaseError.message, code: purchaseError.code, details: purchaseError.details, hint: purchaseError.hint },
        { status: 500 }
      )
    }

    // Build item rows - use same logic as original purchase API
    const itemsToInsert = (items as any[]).flatMap((item: any) => {
      const normalQty = Number(item.quantity ?? 0)
      const freeQty = Number(item.free_quantity ?? 0)
      const rate = Number(item.rate ?? item.unit_price ?? 0)
      const mrp = Number(item.mrp ?? 0)
      const packSize = Number(item.pack_size ?? 1)
      const discPct = Number(item.discount_percent ?? 0)
      const gstPct = Number(item.gst_percent ?? 0)
      const profitPct = Number(item.profit_percent ?? 0)

      const rows: any[] = []

      // Normal (paid) stock row
      if (normalQty > 0) {
        const lineSubtotal = normalQty * rate
        const lineDisc = lineSubtotal * discPct / 100
        const lineTaxable = lineSubtotal - lineDisc
        const lineGst = lineTaxable * gstPct / 100
        const lineCgst = lineGst / 2
        const lineSgst = lineGst / 2
        const lineTotal = lineTaxable + lineGst
        const singleUnitRate = packSize > 0 ? rate / packSize : rate

        rows.push({
          purchase_id: purchaseData.id,
          medication_id: item.medication_id,
          batch_number: String(item.batch_number ?? ''),
          expiry_date: String(item.expiry_date ?? ''),
          quantity: normalQty,
          free_quantity: 0,
          mrp: mrp || null,
          purchase_rate: rate,
          selling_rate: mrp || null,
          discount_percent: discPct,
          discount_amount: lineDisc,
          taxable_amount: lineTaxable,
          cgst_percent: gstPct / 2,
          cgst_amount: lineCgst,
          sgst_percent: gstPct / 2,
          sgst_amount: lineSgst,
          igst_percent: 0,
          igst_amount: 0,
          total_amount: lineTotal,
          gst_percent: gstPct,
          pack_size: packSize,
          single_unit_rate: singleUnitRate,
          profit_percent: profitPct,
          drug_return: item.drug_return || false,
          flag: item.drug_return ? 'Return' : 'Purchase',
        })
      }

      // Free stock as separate batch (suffix -1 like original)
      if (freeQty > 0) {
        const baseBatch = String(item.batch_number ?? '')
        const freeBatch = baseBatch.endsWith('-1') ? baseBatch : `${baseBatch}-1`
        const freeExpiry = item.free_expiry_date || item.expiry_date
        const freeMrp = item.free_mrp || mrp

        rows.push({
          purchase_id: purchaseData.id,
          medication_id: item.medication_id,
          batch_number: freeBatch,
          expiry_date: freeExpiry,
          quantity: freeQty,
          free_quantity: 0,
          mrp: freeMrp || null,
          purchase_rate: 0,
          selling_rate: freeMrp || null,
          discount_percent: 0,
          discount_amount: 0,
          taxable_amount: 0,
          cgst_percent: 0,
          cgst_amount: 0,
          sgst_percent: 0,
          sgst_amount: 0,
          igst_percent: 0,
          igst_amount: 0,
          total_amount: 0,
          gst_percent: 0,
          pack_size: packSize,
          single_unit_rate: 0,
          profit_percent: profitPct,
          drug_return: false,
          flag: 'Free',
        })
      }

      return rows
    })

    const { error: itemsError } = await supabase.from('drug_purchase_items').insert(itemsToInsert)

    if (itemsError) {
      // Rollback purchase header
      await supabase.from('drug_purchases').delete().eq('id', purchaseData.id)
      return NextResponse.json(
        { error: itemsError.message, code: itemsError.code, details: itemsError.details, hint: itemsError.hint },
        { status: 500 }
      )
    }

    return NextResponse.json({ purchase: purchaseData })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET: Search purchase by bill number
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const billNo = searchParams.get('bill_no')

    if (!billNo) {
      return NextResponse.json({ error: 'bill_no parameter is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('drug_purchases')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code, gstin)
      `)
      .or(`invoice_number.ilike.%${billNo}%,purchase_number.ilike.%${billNo}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // For each purchase, get items
    const results = []
    for (const purchase of (data || [])) {
      const { data: items } = await supabase
        .from('drug_purchase_items')
        .select(`
          *,
          medication:medications(id, name, medication_code, generic_name)
        `)
        .eq('purchase_id', purchase.id)

      results.push({
        ...purchase,
        items: items?.map((item: any) => ({
          ...item,
          medication_name: item.medication?.name || '',
        })) || []
      })
    }

    return NextResponse.json({ purchases: results })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
