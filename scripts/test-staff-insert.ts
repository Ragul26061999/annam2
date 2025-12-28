
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Attempting to insert into staff table...');
  const { data, error } = await supabase
    .from('staff')
    .insert([{
      employee_id: 'TEST' + Math.floor(Math.random() * 1000),
      first_name: 'Test',
      last_name: 'User',
      role: 'Nurse',
      is_active: true
    }])
    .select();

  if (error) {
    console.error('Insert Error Detail:', JSON.stringify(error, null, 2));
  } else {
    console.log('Insert Success!', data);
  }
}

testInsert();
