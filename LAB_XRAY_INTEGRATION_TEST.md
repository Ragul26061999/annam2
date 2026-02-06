# Lab-Xray Upload Integration Test Guide

## Overview
This guide tests the integration between lab-xray document uploads and patient clinical records display.

## Test Steps

### 1. Access Lab-Xray Page
- Navigate to: `http://localhost:3000/lab-xray`
- Click on the "ORDERS" tab
- You should see a list of orders with "View", "Print", and "Upload" buttons

### 2. Upload a Document
- Find any order (preferably for patient ID: `303cd13d-8a30-4280-ab26-c5cf0d6e389a`)
- Click the "Upload" button
- Select a PDF file (any test document)
- Wait for the upload to complete
- Verify the upload was successful (no error message, button returns to normal state)

### 3. Check Patient Clinical Records
- Navigate to: `http://localhost:3000/patients/303cd13d-8a30-4280-ab26-c5cf0d6e389a?tab=clinical-records&allocation=13788bb9-2cf2-48ea-95c3-d62394882f23`
- Click on the "Lab Results" tab
- You should now see:
  - The count showing both lab tests and uploaded documents
  - A new "Uploaded Documents" section (in blue) showing the file you just uploaded
  - The uploaded document should have:
    - Test name
    - File name
    - Upload date
    - File size
    - "View" and "Download" buttons

### 4. Verify Document Access
- Click the "View" button to open the document in a new tab
- Click the "Download" button to download the document
- Both should work correctly

## Expected Results

✅ **Lab-Xray Page**: Upload button works and successfully uploads files
✅ **Patient Clinical Records**: Uploaded documents appear in the "Uploaded Documents" section
✅ **Document Access**: View and download buttons work correctly
✅ **Data Integration**: Attachments are properly linked to the patient

## Technical Implementation

The integration works through these components:

1. **Lab-Xray Upload** (`/app/lab-xray/components/OrdersFromBilling.tsx`):
   - Uploads files to `lab-xray-attachments` storage bucket
   - Creates records in `lab_xray_attachments` table
   - Links to lab orders when possible

2. **Patient Clinical Records** (`/src/components/ip-clinical/LabResultsTab.tsx`):
   - Fetches both lab test orders and lab xray attachments
   - Displays attachments in a separate "Uploaded Documents" section
   - Provides view/download functionality

3. **Database Integration**:
   - `lab_xray_attachments` table stores file metadata
   - Links to patients via `patient_id`
   - Links to lab orders via `lab_order_id` when available

## Troubleshooting

If documents don't appear:
1. Check browser console for errors
2. Verify the upload completed successfully
3. Refresh the patient clinical records page
4. Check that the patient ID matches between the upload and the clinical records view

## Success Criteria

The integration is successful when:
- Documents uploaded from the lab-xray page appear in the patient's clinical records
- The "Uploaded Documents" section shows the correct count and file details
- View and download functionality works as expected
- The UI clearly distinguishes between lab test results and uploaded documents
