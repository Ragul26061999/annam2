/**
 * Test Supabase Connection
 * This script tests the connection to the Supabase database
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
// For local development, these would typically be:
// SUPABASE_URL=http://localhost:54321
// SUPABASE_ANON_KEY=your-anon-key-from-supabase-status
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🧪 Testing Supabase Connection...');
  console.log(`🔗 URL: ${supabaseUrl}`);
  
  try {
    // Test database connection with a simple query
    const { data, error } = await supabase.rpc('health_check');
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log('💬 Response:', data);
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

async function testTables() {
  console.log('\n📋 Testing table access...');
  
  try {
    // Test accessing the users table
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);
    
    if (error) {
      console.error('❌ Error accessing users table:', error.message);
      return false;
    }
    
    console.log('✅ Users table access successful!');
    console.log('👥 Sample users:', data);
    return true;
  } catch (err) {
    console.error('❌ Table access failed:', err.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Running Supabase Connection Tests\n');
  
  const connectionSuccess = await testConnection();
  const tableAccessSuccess = await testTables();
  
  console.log('\n📊 Test Results:');
  console.log(`🔗 Connection: ${connectionSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📋 Table Access: ${tableAccessSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (connectionSuccess && tableAccessSuccess) {
    console.log('\n🎉 All tests passed! Supabase is configured correctly.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Please check your Supabase setup.');
    process.exit(1);
  }
}

// Run the tests
runTests();