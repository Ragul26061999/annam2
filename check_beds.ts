import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBeds() {
  const { data, error } = await supabase.from('beds').select('bed_type').limit(10);
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Bed types in DB:', [...new Set(data.map(b => b.bed_type))]);
}

checkBeds();
