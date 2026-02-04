// Debug script for staff loading issue
// Run this in the browser console to check the environment and Supabase connection

console.log('🔍 Debugging Staff Loading Issue...\n');

// 1. Check environment variables
console.log('1. Environment Variables:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env?.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

// 2. Check if supabase client is available
console.log('\n2. Supabase Client:');
try {
  const { supabase } = require('../../src/lib/supabase');
  console.log('Supabase client:', supabase ? '✅ Available' : '❌ Not available');
  
  if (supabase) {
    // 3. Test basic connection
    console.log('\n3. Testing Supabase Connection...');
    supabase.from('staff').select('count').then(result => {
      console.log('Connection test result:', result);
      if (result.error) {
        console.error('❌ Connection failed:', result.error);
      } else {
        console.log('✅ Connection successful');
      }
    });
  }
} catch (error) {
  console.error('❌ Error importing supabase:', error);
}

// 4. Check if staff table exists
console.log('\n4. Manual Staff Query:');
try {
  const { supabase } = require('../../src/lib/supabase');
  if (supabase) {
    supabase
      .from('staff')
      .select('id, first_name, last_name, employee_id')
      .eq('status', 'active')
      .limit(5)
      .then(result => {
        console.log('Staff query result:', result);
        if (result.data) {
          console.log(`✅ Found ${result.data.length} staff members`);
          console.log('Sample staff:', result.data.slice(0, 2));
        }
        if (result.error) {
          console.error('❌ Staff query error:', result.error);
        }
      });
  }
} catch (error) {
  console.error('❌ Error querying staff:', error);
}

console.log('\n📋 Debug complete! Check the console output above for issues.');
