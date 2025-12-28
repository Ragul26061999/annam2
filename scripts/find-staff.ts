
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findTable() {
  console.log('Searching for staff table...');
  
  // Try public schema
  const { data: publicData, error: publicError } = await supabase
    .from('staff')
    .select('count', { count: 'exact', head: true });
  
  if (publicError) {
    console.log('Public schema error:', publicError.message);
  } else {
    console.log('Found in public schema!');
  }

  // Try using different table name variations if any
  const variations = ['staff_members', 'employees', 'users'];
  for (const v of variations) {
    const { error } = await supabase.from(v).select('count', { count: 'exact', head: true });
    if (!error) console.log(`Found table: ${v}`);
  }
}

findTable();
