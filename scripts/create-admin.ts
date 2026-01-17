import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key for admin functions

if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set in environment variables');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  console.error('Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  const email = 'selvan@annam.com';
  const password = 'password';

  console.log('Creating admin user...');
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email confirmation for this user
    user_metadata: {
      role: 'admin',
      name: 'Admin User',
    },
  });

  if (error) {
    console.error('Error creating user:', error.message);
    return;
  }

  console.log('Admin user created successfully:');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('User ID:', data.user.id);
}

createAdminUser().catch(console.error);
