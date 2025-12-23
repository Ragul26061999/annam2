
const { getLabTestCatalog, getRadiologyTestCatalog, getDiagnosticStats } = require('./src/lib/labXrayService');

async function testDiagnostics() {
  console.log('--- Testing Diagnostics Module ---');
  try {
    const labCat = await getLabTestCatalog();
    console.log(`Lab test catalog loaded: ${labCat.length} tests found.`);
    
    const radCat = await getRadiologyTestCatalog();
    console.log(`Radiology test catalog loaded: ${radCat.length} tests found.`);
    
    const stats = await getDiagnosticStats();
    console.log('Current System Stats:', stats);
    
    console.log('--- Test Finished Successfully ---');
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

// Note: This script is for context/reference. 
// In a real environment, you'd run this with a node environment that has supabase config.
