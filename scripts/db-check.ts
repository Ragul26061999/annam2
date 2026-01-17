
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConnection() {
  console.log('Checking database connection...');
  
  try {
    // Try to query the public tables
    const { data: tables, error } = await supabase.rpc('get_tables'); // Checking if an RPC exists first

    if (error) {
      console.log('RPC get_tables failed, trying direct select on information_schema...');
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (schemaError) {
        console.error('Could not list tables from information_schema:', schemaError.message);
        console.log('Falling back to checking common tables...');
        const commonTables = [
          'users', 'patients', 'doctors', 'staff', 'departments', 
          'appointments', 'beds', 'billing', 'pharmacy_inventory', 'projects'
        ];

        console.log('\nCommon tables search:');
        for (const table of commonTables) {
          const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
          if (!error) {
            console.log(`- ${table} (exists)`);
          }
        }
        return;
      }
      
      console.log('Successfully connected and retrieved tables:');
      schemaData.forEach((t: any) => console.log(`- ${t.table_name}`));
    } else {
      console.log('Successfully connected and retrieved tables via RPC:');
      tables.forEach((t: any) => console.log(`- ${t.table_name}`));
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkConnection();
