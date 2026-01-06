const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('medications').select('count').single()
    if (error) {
      console.error('Connection error:', error)
      return
    }
    console.log('✓ Connection successful')
    
    // Check if medications table exists and has data
    const { data: meds, error: medsError } = await supabase
      .from('medications')
      .select('id, name, status')
      .limit(5)
    
    if (medsError) {
      console.error('Medications table error:', medsError)
    } else {
      console.log('✓ Medications table accessible, sample data:', meds)
    }
    
    // Check if medicine_batches table exists
    try {
      const { data: batches, error: batchesError } = await supabase
        .from('medicine_batches')
        .select('count')
        .single()
      
      if (batchesError) {
        console.log('✗ medicine_batches table error:', batchesError.message)
      } else {
        console.log('✓ medicine_batches table exists')
      }
    } catch (e) {
      console.log('✗ medicine_batches table might not exist:', e.message)
    }
    
    // Check if suppliers table exists
    try {
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('count')
        .single()
      
      if (suppliersError) {
        console.log('✗ suppliers table error:', suppliersError.message)
      } else {
        console.log('✓ suppliers table exists')
      }
    } catch (e) {
      console.log('✗ suppliers table might not exist:', e.message)
    }
    
    // Test the exact query from loadMedicines (FIXED)
    console.log('\n--- Testing FIXED loadMedicines query ---')
    const { data: testMeds, error: testError } = await supabase
      .from('medications')
      .select('id, name, category, manufacturer, available_stock, minimum_stock_level, dosage_form, combination')
      .eq('status', 'active')
      .order('name')
      .limit(3)
    
    if (testError) {
      console.error('Fixed query error:', testError)
    } else {
      console.log('✓ Fixed query works, sample results:', testMeds)
    }
    
  } catch (e) {
    console.error('Unexpected error:', e)
  }
}

testConnection()