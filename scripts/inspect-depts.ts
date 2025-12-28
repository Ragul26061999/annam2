
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectDepartments() {
  console.log('Inspecting departments table...');
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching departments:', error.message);
    console.error('Error code:', error.code);
  } else {
    console.log('Successfully fetched sample row:', data);
    if (data.length === 0) {
      console.log('Table is empty.');
    } else {
      console.log('Columns found:', Object.keys(data[0]));
    }
  }

  console.log('\nTesting the exact query used in AddStaffModal...');
  const { data: qData, error: qError } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  
  if (qError) {
    console.error('Query Error:', qError.message);
    console.error('Query Error Code:', qError.code);
  } else {
    console.log('Query success! Number of active departments:', qData.length);
  }
}

inspectDepartments();
