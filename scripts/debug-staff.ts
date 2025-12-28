
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStaffTable() {
  console.log('Checking staff table...');
  const { data, error, count } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Count:', count);
  }

  console.log('Checking departments table...');
  const { data: deptData, error: deptError } = await supabase
    .from('departments')
    .select('count', { count: 'exact', head: true });
  
  if (deptError) {
    console.error('Dept Error:', deptError);
  } else {
    console.log('Dept Success!');
  }
}

checkStaffTable();
