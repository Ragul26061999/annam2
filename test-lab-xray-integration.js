// Test script to verify lab-xray upload to patient clinical records integration
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLabXrayIntegration() {
  console.log('Testing Lab-Xray Upload Integration...');
  
  const patientId = '303cd13d-8a30-4280-ab26-c5cf0d6e389a';
  
  try {
    // 1. Check existing lab orders for the patient
    console.log('\n1. Checking existing lab orders...');
    const { data: labOrders, error: labError } = await supabase
      .from('lab_test_orders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    
    if (labError) {
      console.error('Error fetching lab orders:', labError);
    } else {
      console.log(`Found ${labOrders?.length || 0} lab orders`);
      labOrders?.forEach((order, index) => {
        console.log(`  ${index + 1}. Order #${order.order_number} - ${order.status} - ${order.created_at}`);
      });
    }

    // 2. Check existing lab xray attachments for the patient
    console.log('\n2. Checking existing lab xray attachments...');
    const { data: attachments, error: attachmentError } = await supabase
      .from('lab_xray_attachments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('test_type', 'lab')
      .order('uploaded_at', { ascending: false });
    
    if (attachmentError) {
      console.error('Error fetching attachments:', attachmentError);
    } else {
      console.log(`Found ${attachments?.length || 0} lab attachments`);
      attachments?.forEach((att, index) => {
        console.log(`  ${index + 1}. ${att.test_name} - ${att.file_name} - ${att.uploaded_at}`);
        console.log(`      File URL: ${att.file_url}`);
        console.log(`      Lab Order ID: ${att.lab_order_id || 'Not linked'}`);
      });
    }

    // 3. Check billing records for the patient
    console.log('\n3. Checking billing records...');
    const { data: billingRecords, error: billingError } = await supabase
      .from('billing')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (billingError) {
      console.error('Error fetching billing records:', billingError);
    } else {
      console.log(`Found ${billingRecords?.length || 0} billing records`);
      billingRecords?.forEach((bill, index) => {
        console.log(`  ${index + 1}. Bill #${bill.bill_no || bill.bill_number} - ${bill.bill_type} - ₹${bill.total || bill.subtotal}`);
      });
    }

    console.log('\n✅ Integration test completed!');
    console.log('\nNext steps:');
    console.log('1. Go to http://localhost:3000/lab-xray');
    console.log('2. Find an order for the patient and upload a document');
    console.log('3. Go to http://localhost:3000/patients/303cd13d-8a30-4280-ab26-c5cf0d6e389a?tab=clinical-records&allocation=13788bb9-2cf2-48ea-95c3-d62394882f23');
    console.log('4. Check if the uploaded document appears in the "Uploaded Documents" section');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLabXrayIntegration();
