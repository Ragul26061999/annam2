// Debug script to test finance billing data fetching
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinanceBilling() {
  console.log('Testing finance billing data fetch...');
  
  try {
    // Test each service individually
    const services = [
      { name: 'billing', query: supabase.from('billing').select('*, patients!patient_id(name, patient_id, phone)', { count: 'exact' }).order('created_at', { ascending: false }) },
      { name: 'pharmacy_bills', query: supabase.from('pharmacy_bills').select('*', { count: 'exact' }).order('created_at', { ascending: false }) },
      { name: 'lab_test_orders', query: supabase.from('lab_test_orders').select('*, patients!patient_id(name, patient_id)', { count: 'exact' }).order('created_at', { ascending: false }) },
      { name: 'radiology_test_orders', query: supabase.from('radiology_test_orders').select('*, patients!patient_id(name, patient_id)', { count: 'exact' }).order('created_at', { ascending: false }) },
      { name: 'diagnostic_billing_items', query: supabase.from('diagnostic_billing_items').select('*, patients!patient_id(name, patient_id, phone)', { count: 'exact' }).order('created_at', { ascending: false }) },
      { name: 'patients', query: supabase.from('patients').select('*, total_amount, consultation_fee, op_card_amount, payment_mode', { count: 'exact' }).not('total_amount', 'is', null).order('created_at', { ascending: false }) },
      { name: 'other_bills', query: supabase.from('other_bills').select('*, patients!patient_id(name, patient_id, phone)', { count: 'exact' }).eq('status', 'active').order('created_at', { ascending: false }) },
      { name: 'ip_payment_receipts', query: supabase.from('ip_payment_receipts').select('*, patients!patient_id(name, patient_id, phone)', { count: 'exact' }).order('created_at', { ascending: false }) }
    ];

    for (const service of services) {
      try {
        console.log(`Testing ${service.name}...`);
        const { data, error, count } = await service.query;
        
        if (error) {
          console.error(`❌ ${service.name} failed:`, error);
        } else {
          console.log(`✅ ${service.name}: ${data?.length || 0} records, count: ${count}`);
          if (data && data.length > 0) {
            console.log(`   Sample record:`, data[0]);
          }
        }
      } catch (err) {
        console.error(`❌ ${service.name} exception:`, err);
      }
    }
    
  } catch (error) {
    console.error('Overall error:', error);
  }
}

testFinanceBilling();
