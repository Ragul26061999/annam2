import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Checking billing table counts by bill_type...');
  
  // Just fetch all bill_types and count in JS to avoid grouping issues
  const { data: records, error: listError } = await supabase
      .from('billing')
      .select('bill_type');
      
  if (listError) {
      console.error('List failed:', listError);
  } else {
      const counts: Record<string, number> = {};
      records.forEach((r: any) => {
          const type = r.bill_type || 'null';
          counts[type] = (counts[type] || 0) + 1;
      });
      console.log('Counts by bill_type:', counts);
  }
}

check();
