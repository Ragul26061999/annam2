// Test script to verify purchase document functionality
// This can be run in the browser console on the pharmacy purchase page

console.log('Testing purchase document functionality...');

// Test 1: Check if document upload button exists
const checkUploadButton = () => {
  // Look for upload button in purchase form
  const uploadButton = document.querySelector('button:has([data-lucide="Upload"])');
  if (uploadButton) {
    console.log('✅ Document upload button found in purchase form');
    return true;
  } else {
    console.log('❌ Document upload button not found');
    return false;
  }
};

// Test 2: Check if file input exists
const checkFileInput = () => {
  const fileInput = document.querySelector('input[type="file"][accept*="image"], input[type="file"][accept*="pdf"]');
  if (fileInput) {
    console.log('✅ File input found for document upload');
    return true;
  } else {
    console.log('❌ File input not found');
    return false;
  }
};

// Test 3: Check if purchase details modal shows document section
const checkDocumentSection = () => {
  // Look for document section in purchase details (may need to open a modal first)
  const documentSection = document.querySelector('[class*="bg-blue-50 border border-blue-200"]');
  if (documentSection) {
    console.log('✅ Document section found in purchase details');
    return true;
  } else {
    console.log('❌ Document section not found (may need to open a purchase details modal)');
    return false;
  }
};

// Test 4: Check if document modal exists
const checkDocumentModal = () => {
  const modal = document.querySelector('[class*="fixed inset-0"]');
  if (modal) {
    console.log('✅ Document modal container found');
    return true;
  } else {
    console.log('❌ Document modal container not found');
    return false;
  }
};

// Run tests
const runTests = () => {
  console.log('🧪 Running purchase document functionality tests...\n');
  
  const results = {
    uploadButton: checkUploadButton(),
    fileInput: checkFileInput(),
    documentSection: checkDocumentSection(),
    documentModal: checkDocumentModal()
  };
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Purchase document functionality is working.');
  } else {
    console.log('⚠️ Some tests failed. Check the implementation.');
  }
  
  return results;
};

// Export for manual testing
window.testPurchaseDocuments = runTests;

console.log('Test script loaded. Run window.testPurchaseDocuments() to execute tests.');
