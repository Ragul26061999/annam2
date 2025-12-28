
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStaff() {
  console.log('Checking staff...');
  const { data, error, count } = await supabase
    .from('staff')
    .select('*', { count: 'exact' });
  
  if (error) {
    console.log('Error info:', JSON.stringify(error, null, 2));
    console.log('Error message:', error.message);
  } else {
    console.log('Count:', count);
    console.log('Data:', data);
  }
}

checkStaff();
