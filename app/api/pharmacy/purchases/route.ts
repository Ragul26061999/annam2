import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const purchase = body?.purchase
    const items = body?.items

    if (!purchase?.supplier_id) {
      return NextResponse.json({ error: 'supplier_id is required' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 })
    }

    const { data: purchaseNumber, error: purchaseNumberError } = await supabaseAdmin.rpc('generate_purchase_number')
    if (purchaseNumberError) {
      return NextResponse.json(
        {
          error: purchaseNumberError.message,
          code: purchaseNumberError.code,
          details: purchaseNumberError.details,
          hint: purchaseNumberError.hint
        },
        { status: 500 }
      )
    }

    // Totals are expected to be calculated client-side already, but keep safe defaults.
    // NOTE: The current database schema for drug_purchases may not include fields like
    // subtotal/other_charges/payment_* (schema cache errors). So we map to core columns.
    const taxableAmount = Number(purchase.subtotal ?? purchase.taxable_amount ?? 0)
    const totalTax = Number(purchase.total_gst ?? purchase.total_tax ?? purchase.totalGst ?? 0)
    const totalAmount = Number(purchase.total_amount ?? purchase.totalAmount ?? taxableAmount + totalTax)
    const totalQty = (items as any[]).reduce((sum, it) => {
      const q = Number(it?.quantity ?? 0)
      const f = Number(it?.free_quantity ?? 0)
      return sum + q + f
    }, 0)

    const { data: purchaseData, error: purchaseError } = await supabaseAdmin
      .from('drug_purchases')
      .insert({
        purchase_number: purchaseNumber || `PUR-${Date.now()}`,
        supplier_id: purchase.supplier_id,
        invoice_number: purchase.invoice_number || null,
        invoice_date: purchase.invoice_date || null,
        purchase_date: purchase.purchase_date || new Date().toISOString().split('T')[0],
        status: purchase.status || 'received',
        total_quantity: totalQty,
        total_amount: totalAmount,
        discount_amount: Number(purchase.discount_amount ?? 0),
        taxable_amount: taxableAmount,
        cgst_amount: Number(purchase.cgst_amount ?? totalTax / 2),
        sgst_amount: Number(purchase.sgst_amount ?? totalTax / 2),
        igst_amount: Number(purchase.igst_amount ?? 0),
        total_tax: totalTax,
        net_amount: Number(purchase.net_amount ?? totalAmount),
        remarks: purchase.remarks || null,
      })
      .select('*')
      .single()

    if (purchaseError) {
      return NextResponse.json(
        {
          error: purchaseError.message,
          code: purchaseError.code,
          details: purchaseError.details,
          hint: purchaseError.hint
        },
        { status: 500 }
      )
    }

    const buildItemRow = (item: any, overrides?: { batch_number?: string; quantity?: number; expiry_date?: string; mrp?: number; unit_price?: number }) => {
      const qty = Number(overrides?.quantity ?? item.quantity ?? 0)
      const batchNumber = String(overrides?.batch_number ?? item.batch_number ?? '')
      const expiryDate = String(overrides?.expiry_date ?? item.expiry_date ?? '')
      const mrp = Number(overrides?.mrp ?? item.mrp ?? 0)

      const rate = Number(overrides?.unit_price ?? item.unit_price ?? item.purchase_rate ?? 0)
      const lineSubtotal = qty * rate
      const discPct = Number(item.discount_percent ?? 0)
      const discAmt = Number(item.discount_amount ?? (lineSubtotal * discPct) / 100)
      const lineTaxable = Number(item.taxable_amount ?? Math.max(0, lineSubtotal - discAmt))
      const gstPct = Number(item.gst_percent ?? 0)
      const gstAmt = Number(item.gst_amount ?? (lineTaxable * gstPct) / 100)
      const cgstPct = Number(item.cgst_percent ?? (gstPct ? gstPct / 2 : 0))
      const sgstPct = Number(item.sgst_percent ?? (gstPct ? gstPct / 2 : 0))
      const cgstAmt = Number(item.cgst_amount ?? (gstAmt ? gstAmt / 2 : 0))
      const sgstAmt = Number(item.sgst_amount ?? (gstAmt ? gstAmt / 2 : 0))
      const igstPct = Number(item.igst_percent ?? 0)
      const igstAmt = Number(item.igst_amount ?? 0)
      const totalLine = Number(item.total_amount ?? lineTaxable + gstAmt)

      return {
        purchase_id: purchaseData.id,
        medication_id: item.medication_id,
        batch_number: batchNumber,
        expiry_date: expiryDate,
        quantity: qty,
        free_quantity: 0,
        mrp: mrp || null,
        purchase_rate: rate,
        selling_rate: mrp || null,
        discount_percent: discPct,
        discount_amount: discAmt,
        taxable_amount: lineTaxable,
        cgst_percent: cgstPct,
        cgst_amount: cgstAmt,
        sgst_percent: sgstPct,
        sgst_amount: sgstAmt,
        igst_percent: igstPct,
        igst_amount: igstAmt,
        total_amount: totalLine
      }
    }

    const itemsToInsert = (items as any[]).flatMap((item: any) => {
      const normalQty = Number(item.quantity ?? 0)
      const freeQty = Number(item.free_quantity ?? 0)
      const rows: any[] = []

      // Normal (paid) stock row
      if (normalQty > 0) {
        rows.push(buildItemRow(item, { quantity: normalQty }))
      }

      // Free stock as separate batch (suffix -1)
      if (freeQty > 0) {
        const baseBatch = String(item.batch_number ?? '')
        const freeBatch = baseBatch.endsWith('-1') ? baseBatch : `${baseBatch}-1`

        // Optional overrides if UI later sends them
        const freeExpiry = item.free_expiry_date || item.expiry_date
        const freeMrp = item.free_mrp || item.mrp
        rows.push(buildItemRow(item, { batch_number: freeBatch, quantity: freeQty, expiry_date: freeExpiry, mrp: freeMrp, unit_price: 0 }))
      }

      return rows
    })

    const { error: itemsError } = await supabaseAdmin.from('drug_purchase_items').insert(itemsToInsert)

    if (itemsError) {
      // Rollback purchase header
      await supabaseAdmin.from('drug_purchases').delete().eq('id', purchaseData.id)
      return NextResponse.json(
        {
          error: itemsError.message,
          code: itemsError.code,
          details: itemsError.details,
          hint: itemsError.hint
        },
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
