import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ medications: [] });
    }

    const { data: medications, error } = await supabaseAdmin
      .from('medications')
      .select('id, name, medication_code, manufacturer, category, combination')
      .or(`name.ilike.%${query}%,combination.ilike.%${query}%,medication_code.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(20);

    if (error) {
      throw error;
    }

    return NextResponse.json({ medications });
  } catch (error) {
    console.error('Error searching medications:', error);
    return NextResponse.json(
      { error: 'Error searching medications' },
      { status: 500 }
    );
  }
}
