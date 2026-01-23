import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set in environment variables');
}

if (!supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables');
}

const missingSupabaseEnv = !supabaseUrl || !supabaseAnonKey;

const missingSupabaseEnvError = new Error(
  'Missing Supabase environment variables. Please check your .env.local file.'
);

export const supabase = missingSupabaseEnv
  ? (new Proxy(
      {},
      {
        get() {
          throw missingSupabaseEnvError;
        },
      }
    ) as any)
  : createClient(supabaseUrl, supabaseAnonKey);

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
};

// Function to create admin user without email confirmation
export const createAdminUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        email_confirm: true,
      },
    },
  });
  return { data, error };
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Auth user:', user);
  
  if (!user) {
    console.log('No authenticated user found');
    return null;
  }

  // Get the user profile from our users table
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  console.log('User profile query result:', { userProfile, error });

  if (error || !userProfile) {
    console.error('Error fetching user profile or profile not found:', error);
    
    // Fallback: Construct a profile from Auth user metadata if available
    if (user) {
      console.warn('Using fallback user profile from Auth metadata');
      return {
        id: user.id, // Use auth ID as ID since we don't have a user record ID
        auth_id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: user.user_metadata?.role || 'patient', // Default to patient if role is missing
        status: 'active',
        created_at: user.created_at
      };
    }
    
    return null;
  }

  console.log('Returning user profile:', userProfile);
  return userProfile;
};
