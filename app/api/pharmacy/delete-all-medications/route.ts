import { NextResponse } from 'next/server'
import { requireSupabaseAdmin } from '@/src/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const enabled = process.env.ALLOW_DANGER_ZONE_DELETES === 'true'
    const isProd = process.env.NODE_ENV === 'production'

    if (isProd && !enabled) {
      return NextResponse.json(
        {
          error:
            "This endpoint is disabled in production. Set ALLOW_DANGER_ZONE_DELETES='true' to enable it."
        },
        { status: 403 }
      )
    }

    const supabaseAdmin = requireSupabaseAdmin()

    const body = await request.json().catch(() => ({}))
    const hard = Boolean((body as any)?.hard)

    const { count: batchCount, error: batchCountError } = await supabaseAdmin
      .from('medicine_batches')
      .select('id', { count: 'exact', head: true })

    if (batchCountError) {
      return NextResponse.json(
        { error: batchCountError.message, code: batchCountError.code, details: batchCountError.details },
        { status: 500 }
      )
    }

    const { count: medicationCount, error: medicationCountError } = await supabaseAdmin
      .from('medications')
      .select('id', { count: 'exact', head: true })

    if (medicationCountError) {
      return NextResponse.json(
        { error: medicationCountError.message, code: medicationCountError.code, details: medicationCountError.details },
        { status: 500 }
      )
    }

    if (hard) {
      const { error: deleteBatchesError } = await supabaseAdmin
        .from('medicine_batches')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (deleteBatchesError) {
        return NextResponse.json(
          { error: deleteBatchesError.message, code: deleteBatchesError.code, details: deleteBatchesError.details },
          { status: 500 }
        )
      }

      const { error: deleteMedicationsError } = await supabaseAdmin
        .from('medications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (deleteMedicationsError) {
        return NextResponse.json(
          { error: deleteMedicationsError.message, code: deleteMedicationsError.code, details: deleteMedicationsError.details },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        mode: 'hard',
        deletedBatches: batchCount ?? 0,
        deletedMedications: medicationCount ?? 0
      })
    }

    const now = new Date().toISOString()

    const { error: deactivateBatchesError } = await supabaseAdmin
      .from('medicine_batches')
      .update({
        is_active: false,
        status: 'inactive',
        current_quantity: 0,
        received_quantity: 0,
        updated_at: now
      })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deactivateBatchesError) {
      return NextResponse.json(
        { error: deactivateBatchesError.message, code: deactivateBatchesError.code, details: deactivateBatchesError.details },
        { status: 500 }
      )
    }

    const { error: deactivateMedicationsError } = await supabaseAdmin
      .from('medications')
      .update({
        is_active: false,
        status: 'inactive',
        total_stock: 0,
        available_stock: 0,
        updated_at: now
      })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deactivateMedicationsError) {
      return NextResponse.json(
        {
          error: deactivateMedicationsError.message,
          code: deactivateMedicationsError.code,
          details: deactivateMedicationsError.details
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mode: 'soft',
      deletedBatches: batchCount ?? 0,
      deletedMedications: medicationCount ?? 0
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
