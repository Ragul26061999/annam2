# Quick Integration Examples

## 📝 Copy-Paste Ready Code Snippets

---

## 1. Outpatient Registration Form Integration

### Add to `components/OutpatientRegistrationForm.tsx`

**Step 1: Add imports at the top:**
```typescript
import DocumentUpload from '../src/components/DocumentUpload';
import DocumentList from '../src/components/DocumentList';
import { FileText } from 'lucide-react';
```

**Step 2: Add state near other useState:**
```typescript
const [showDocuments, setShowDocuments] = useState(false);
```

**Step 3: Add this section AFTER success state (before the closing div):**
```tsx
{/* Document Upload Section - Only show after successful registration */}
{isSuccess && registrationResult && (
  <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
    <div className="flex items-center gap-3 mb-6">
      <FileText className="h-6 w-6 text-blue-600" />
      <h3 className="text-xl font-bold text-gray-900">Patient Documents</h3>
    </div>

    <div className="space-y-6">
      {/* Upload New Documents */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Upload Documents</h4>
        <DocumentUpload
          patientId={registrationResult.patientId}
          uhid={registrationResult.uhid}
          staffId={formData.staffId}
          category="general"
          onUploadComplete={(doc) => {
            console.log('Document uploaded:', doc);
            // Optionally refresh document list
          }}
          onUploadError={(error) => {
            console.error('Upload error:', error);
          }}
        />
      </div>

      {/* View Uploaded Documents */}
      <div>
        <DocumentList
          patientId={registrationResult.patientId}
          showDelete={true}
        />
      </div>
    </div>
  </div>
)}
```

---

## 2. Inpatient Admission Form Integration

### Add to `components/InpatientAdmissionForm.tsx`

**Same steps as Outpatient form above**

Add after the success state (admission complete screen).

---

## 3. Patient Details Page Integration

### Create new file: `app/patients/[id]/documents/page.tsx`

```tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Upload } from 'lucide-react';
import DocumentUpload from '../../../../src/components/DocumentUpload';
import DocumentList from '../../../../src/components/DocumentList';

export default function PatientDocumentsPage() {
  const params = useParams();
  const patientId = params.id as string;

  // You would fetch patient data here
  const patientData = {
    uhid: 'UHID001', // Replace with actual data
    name: 'Patient Name' // Replace with actual data
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/patients/${patientId}`}
              className="p-2 hover:bg-white rounded-xl transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patient Documents</h1>
              <p className="text-gray-600">
                {patientData.name} - {patientData.uhid}
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Upload New Documents</h2>
          </div>

          <DocumentUpload
            patientId={patientId}
            uhid={patientData.uhid}
            category="medical-report"
            onUploadComplete={() => {
              // Refresh the list
              window.location.reload();
            }}
          />
        </div>

        {/* Document List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Uploaded Documents</h2>
          </div>

          <DocumentList
            patientId={patientId}
            showDelete={true}
            onDocumentDeleted={() => {
              console.log('Document deleted');
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Add "Documents" Tab to Existing Patient Page

### If you have a patient details page with tabs:

```tsx
// Add to your tab navigation
const tabs = [
  { name: 'Overview', href: `/patients/${id}` },
  { name: 'Medical History', href: `/patients/${id}/history` },
  { name: 'Documents', href: `/patients/${id}/documents` }, // NEW!
  { name: 'Billing', href: `/patients/${id}/billing` },
];
```

---

## 5. Minimal Integration (Just Upload)

If you only want upload functionality without the list:

```tsx
<div className="p-4 bg-white rounded-lg shadow">
  <h3 className="font-semibold mb-3">Upload Patient Documents</h3>
  <DocumentUpload
    patientId="patient-uuid-here"
    uhid="UHID001"
    staffId="staff-uuid-here"
  />
</div>
```

---

## 6. Minimal Integration (Just List)

If you only want to display existing documents:

```tsx
<div className="p-4 bg-white rounded-lg shadow">
  <h3 className="font-semibold mb-3">Patient Documents</h3>
  <DocumentList
    patientId="patient-uuid-here"
    showDelete={false} // Hide delete button
  />
</div>
```

---

## 7. Full-Featured Integration

Both upload and display with categories:

```tsx
<div className="space-y-6">
  {/* Medical Reports */}
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="text-lg font-bold mb-4">Medical Reports</h3>
    <DocumentUpload
      patientId={patientId}
      uhid={uhid}
      staffId={staffId}
      category="medical-report"
    />
  </div>

  {/* Lab Results */}
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="text-lg font-bold mb-4">Lab Results</h3>
    <DocumentUpload
      patientId={patientId}
      uhid={uhid}
      staffId={staffId}
      category="lab-result"
    />
  </div>

  {/* All Documents */}
  <div className="bg-white rounded-xl shadow p-6">
    <DocumentList patientId={patientId} />
  </div>
</div>
```

---

## 8. Integration with Form Submission

If you want to allow uploads during registration:

```tsx
// Add state for tracking uploads
const [documentsUploaded, setDocumentsUploaded] = useState(0);

// In your form JSX (BEFORE form submission):
<div className="space-y-4">
  <h4 className="font-semibold">Optional Documents</h4>
  <p className="text-sm text-gray-600">
    Upload any relevant documents (ID proof, medical records, etc.)
  </p>
  <DocumentUpload
    patientId={formData.patientId} // Will be available after patient creation
    uhid={formData.uhid}
    staffId={formData.staffId}
    disabled={!formData.patientId} // Disable until patient is created
    onUploadComplete={() => {
      setDocumentsUploaded(prev => prev + 1);
    }}
  />
  {documentsUploaded > 0 && (
    <p className="text-sm text-green-600">
      ✓ {documentsUploaded} document(s) uploaded
    </p>
  )}
</div>
```

---

## 🎨 Styling Variations

### Compact Version:
```tsx
<DocumentUpload
  patientId={id}
  uhid={uhid}
  // No labels, minimal UI
/>
```

### With Custom Styling:
```tsx
<div className="border-2 border-dashed border-blue-300 rounded-lg p-4">
  <DocumentUpload {...props} />
</div>
```

---

## ✅ Pre-Flight Checklist

Before integrating, ensure:

- [ ] SQL migration executed (`CREATE_PATIENT_DOCUMENTS_TABLE.sql`)
- [ ] Storage bucket created (`patient-documents`)
- [ ] Bucket policies configured
- [ ] Patient ID available in your form/page
- [ ] UHID available in your form/page
- [ ] Staff ID available (optional but recommended)

---

## 🚀 Testing Steps

1. **Test Upload:**
   - Select a PDF file
   - Click upload
   - Verify success message

2. **Test List:**
   - Check document appears in list
   - Verify download works
   - Verify delete works (if enabled)

3. **Test Validation:**
   - Try uploading >10MB file (should fail)
   - Try uploading invalid type (should fail)

---

**Ready to integrate!** Choose the example that best fits your needs and copy-paste into your files.
