const { createClient } = require('@supabase/supabase-js');

// Using the Supabase URL and ANON key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set in environment variables');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase JavaScript client connection...');
  console.log(`🔗 URL: ${supabaseUrl}`);
  
  try {
    // Test database connection with a simple query to get tables
    const { data, error } = await supabase.rpc('health_check');
    
    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase JavaScript client connection successful!');
    console.log('💬 Health check response:', data);
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

async function testAuth() {
  console.log('\n🔐 Testing Supabase Auth...');
  
  try {
    // Check if we can get the current user (will be null if not logged in)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error && error.message !== 'Invalid user JWT: Token is expired') {
      console.error('❌ Auth Error:', error.message);
      return false;
    }
    
    if (user) {
      console.log('✅ Auth is working! Current user:', user.email);
    } else {
      console.log('✅ Auth client is initialized (no user currently signed in)');
    }
    return true;
  } catch (err) {
    console.error('❌ Auth test failed:', err.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Running Supabase Connection Tests\n');
  
  const connectionSuccess = await testSupabaseConnection();
  const authSuccess = await testAuth();
  
  console.log('\n📊 Test Results:');
  console.log(`🔗 JS Client Connection: ${connectionSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔐 Auth Integration: ${authSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (connectionSuccess && authSuccess) {
    console.log('\n🎉 All tests passed! Supabase is properly connected.');
  } else {
    console.log('\n💥 Some tests failed. Please check your Supabase setup.');
  }
}

runAllTests();