const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
// We need to get the anon key from the environment or ask the user
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScanCatalog() {
  console.log('Checking scan_test_catalog table...');
  
  try {
    const { data, error } = await supabase
      .from('scan_test_catalog')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error fetching scan catalog:', error);
      return;
    }
    
    console.log('Scan catalog data:', data);
    console.log('Number of records:', data?.length || 0);
    
    // Check if table exists by trying to get count
    const { count, error: countError } = await supabase
      .from('scan_test_catalog')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting count:', countError);
    } else {
      console.log('Total scan catalog records:', count);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

async function checkScanOrdersTable() {
  console.log('\nChecking scan_test_orders table structure...');
  
  try {
    const { data, error } = await supabase
      .from('scan_test_orders')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing scan_test_orders:', error);
      return;
    }
    
    console.log('scan_test_orders is accessible');
    console.log('Sample data:', data);
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkScanCatalog().then(() => checkScanOrdersTable());
