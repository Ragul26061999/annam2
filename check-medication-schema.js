const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkMedicationsSchema() {
  console.log('Checking medications table schema...')
  
  try {
    // Get one row to see the actual columns
    const { data: sample, error: sampleError } = await supabase
      .from('medications')
      .select('*')
      .limit(1)
    
    if (sampleError) {
      console.error('Error getting sample:', sampleError)
      return
    }
    
    if (sample && sample.length > 0) {
      console.log('Available columns in medications table:')
      console.log(Object.keys(sample[0]))
      
      console.log('\nSample row data:')
      console.log(JSON.stringify(sample[0], null, 2))
    }
    
    // Check if nickname column exists specifically
    console.log('\n--- Testing nickname column ---')
    const { data: nicknameTest, error: nicknameError } = await supabase
      .from('medications')
      .select('nickname')
      .limit(1)
    
    if (nicknameError) {
      console.log('✗ nickname column error:', nicknameError.message)
    } else {
      console.log('✓ nickname column exists')
    }
    
    // Check available_stock vs other stock columns
    console.log('\n--- Testing stock columns ---')
    const stockColumns = ['available_stock', 'total_stock', 'stock', 'quantity']
    
    for (const col of stockColumns) {
      try {
        const { data: testData, error: testError } = await supabase
          .from('medications')
          .select(col)
          .limit(1)
        
        if (testError) {
          console.log(`✗ ${col}: ${testError.message}`)
        } else {
          console.log(`✓ ${col} exists`)
        }
      } catch (e) {
        console.log(`✗ ${col}: might not exist`)
      }
    }
    
  } catch (e) {
    console.error('Unexpected error:', e)
  }
}

checkMedicationsSchema()
