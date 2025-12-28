
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectStaff() {
  console.log('Inspecting staff table...');
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching staff:', error.message);
    if (error.code === '42P01') {
      console.log('Table "staff" does not exist.');
    }
  } else {
    console.log('Successfully fetched sample row:', data);
    if (data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]));
    } else {
      console.log('Table is empty.');
    }
  }
}

inspectStaff();
