
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tablesToVerify = [
  'users', 'patients', 'doctors', 'appointments', 'beds', 'bed_allocations',
  'staff', 'departments', 'lab_test_catalog', 'radiology_test_catalog',
  'lab_test_orders', 'radiology_test_orders', 'billing'
];

async function verifyCloudConnection() {
  console.log('🌐 Checking Cloud Supabase connection...');
  
  try {
    const results = [];
    for (const table of tablesToVerify) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (!error) {
        results.push({ table, status: '✅ Connected' });
      } else {
        results.push({ table, status: `❌ Error: ${error.message}` });
      }
    }
    
    console.log('\n📊 Cloud Database Table Status:');
    console.table(results);

  } catch (err) {
    console.error('❌ Unexpected error:', err instanceof Error ? err.message : err);
  }
}

verifyCloudConnection();
