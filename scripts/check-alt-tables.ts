
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStaffMembers() {
  console.log('Checking staff_members...');
  const { data, error } = await supabase.from('staff_members').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('staff_members data:', data);
  }

  console.log('Checking employees...');
  const { data: empData, error: empError } = await supabase.from('employees').select('*').limit(1);
  if (empError) {
    console.log('Error:', empError.message);
  } else {
    console.log('employees data:', empData);
  }
}

checkStaffMembers();
