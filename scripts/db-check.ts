
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

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
