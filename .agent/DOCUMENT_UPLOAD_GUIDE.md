# Patient Document Upload Feature - Implementation Guide

## 🎯 Overview

This feature allows uploading, storing, and displaying patient documents in:
- **Outpatient Registration Form**
- **Inpatient Admission Form**
- **Patient Details Pages**

---

## 📋 What Has Been Created

### 1. Database Schema ✅
- **File:** `CREATE_PATIENT_DOCUMENTS_TABLE.sql`
- **Table:** `patient_documents`
- **Purpose:** Store document metadata

### 2. Service Layer ✅
- **File:** `src/lib/documentService.ts`
- **Functions:**
  - `uploadPatientDocument()` - Upload file + metadata
  - `getPatientDocuments()` - Retrieve documents
  - `downloadDocument()` - Download file
  - `deleteDocument()` - Remove document
  - And more...

### 3. UI Components ✅
- **DocumentUpload** (`src/components/DocumentUpload.tsx`)
  - Drag & drop file upload
  - Progress tracking
  - File validation

- **DocumentList** (`src/components/DocumentList.tsx`)
  - Display uploaded documents
  - Download functionality
  - Delete capability

---

## 🚀 Setup Instructions

### Step 1: Database Migration (REQUIRED)

**Execute in Supabase SQL Editor:**

```sql
-- Copy and run the entire contents of:
CREATE_PATIENT_DOCUMENTS_TABLE.sql
```

This creates:
- `patient_documents` table
- Indexes for performance
- RLS policies
- Triggers for auto-update timestamps

### Step 2: Create Supabase Storage Bucket (REQUIREDStep 2:

1. Go to **Supabase Dashboard**
2. Navigate to **Storage**
3. Click **"New bucket"**
4. **Bucket Details:**
   - **Name:** `patient-documents`
   - **Public:** ✅ Make this bucket public
   - **File size limit:** 10 MB (or your preferred limit)
5. Click **"Create bucket"**

### Step 3: Set Bucket Policies

After creating the bucket, set these policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patient-documents');

-- Allow public reads (for viewing documents)
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'patient-documents');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'patient-documents');
```

---

## 📝 How to Integrate into Forms

### Option A: Outpatient Registration Form

**File:** `components/OutpatientRegistrationForm.tsx`

**Add these imports:**
```typescript
import DocumentUpload from '../src/components/DocumentUpload';
```

**Add state:**
```typescript
const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
```

**Add to form (after patient info section):**
```tsx
{/* Document Upload Section */}
<div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
  <h3 className="text-lg font-bold text-gray-900 mb-4">
    Upload Documents (Optional)
  </h3>
  <DocumentUpload
    patientId={registrationResult?.patientId}
    uhid={formData.uhid}
    staffId={formData.staffId}
    category="general"
    onUploadComplete={(doc) => {
      setUploadedDocuments(prev => [...prev, doc]);
    }}
    onUploadError={(error) => {
      console.error('Upload error:', error);
    }}
    disabled={!registrationResult}
  />
</div>
```

### Option B: Inpatient Admission Form

**File:** `components/InpatientAdmissionForm.tsx`

**Same integration as above** - Add DocumentUpload component in appropriate section.

### Option C: Patient Details Page

**Add both components:**

```tsx
import DocumentUpload from '../src/components/DocumentUpload';
import DocumentList from '../src/components/DocumentList';

// In your component:
<div className="space-y-6">
  {/* Upload Section */}
  <div className="bg-white rounded-2xl shadow-lg p-6">
    <h2 className="text-xl font-bold mb-4">Upload New Documents</h2>
    <DocumentUpload
      patientId={patientData.id}
      uhid={patientData.patient_id}
      staffId={currentStaffId}
      category="medical-report"
      onUploadComplete={() => {
        // Refresh document list
      }}
    />
  </div>

  {/* Document List */}
  <div className="bg-white rounded-2xl shadow-lg p-6">
    <DocumentList
      patientId={patientData.id}
      showDelete={true}
      onDocumentDeleted={() => {
        // Optional callback
      }}
    />
  </div>
</div>
```

---

## 🎨 Document Categories

Available categories for organization:

- `general` - General documents
- `medical-report` - Medical reports
- `lab-result` - Laboratory results
- `prescription` - Prescriptions
- `insurance` - Insurance documents
- `id-proof` - Identity proof

**Usage:**
```tsx
<DocumentUpload category="medical-report" ... />
```

---

## 📊 Features

### Document Upload Component
- ✅ Drag & drop support
- ✅ Multiple file selection
- ✅ File type validation (PDF, JPG, PNG, DOC)
- ✅ File size validation (10MB max)
- ✅ Upload progress tracking
- ✅ Success/error notifications
- ✅ Preview selected files

### Document List Component
- ✅ Display all patient documents
- ✅ Download documents
- ✅ Delete documents (with confirmation)
- ✅ Category badges (color-coded)
- ✅ File type icons
- ✅ Upload date & time
- ✅ File size display
- ✅ Empty state handling

---

## 🔒 Security

### File Storage
- Files stored in Supabase Storage
- Organized by patient UHID
- Unique filenames prevent collisions
- Public read access (adjust if needed)

### Database
- Row Level Security (RLS) enabled
- Policies for insert/update/delete
- Metadata stored separately from files

### File Validation
- Max file size: 10MB
- Allowed types: PDF, images, documents
- Validation on client and server

---

## 📱 Usage Examples

### Example 1: Basic Upload
```tsx
<DocumentUpload
  patientId="uuid-here"
  uhid="UHID001"
  staffId="staff-uuid"
/>
```

### Example 2: Categorized Upload
```tsx
<DocumentUpload
  patientId="uuid-here"
  uhid="UHID001"
  staffId="staff-uuid"
  category="lab-result"
  onUploadComplete={(doc) => {
    console.log('Uploaded:', doc);
  }}
/>
```

### Example 3: Display Documents
```tsx
<DocumentList
  patientId="uuid-here"
  showDelete={true}
  onDocumentDeleted={() => {
    alert('Document deleted');
  }}
/>
```

---

## 🐛 Troubleshooting

### Issue: Upload fails
**Solutions:**
1. Verify bucket `patient-documents` exists
2. Check bucket is public
3. Verify storage policies are set
4. Check file size < 10MB
5. Ensure patient_id and uhid are provided

### Issue: Cannot download
**Solutions:**
1. Check file exists in storage
2. Verify public access enabled
3. Check browser console for errors

### Issue: Documents not displaying
**Solutions:**
1. Verify `patient_documents` table exists
2. Check patientId is correct
3. Ensure documents were uploaded successfully
4. Check browser console for errors

---

## 🎯 Next Steps

1. **Execute SQL migration** - Create patient_documents table
2. **Create Storage bucket** - Set up patient-documents bucket
3. **Set policies** - Configure storage access policies
4. **Integrate components** - Add to Outpatient/Inpatient forms
5. **Test upload** - Upload a test document
6. **Test download** - Download the document
7. **Test delete** - Remove the document

---

## 📈 Future Enhancements

### Potential Improvements:
- [ ] Image preview before upload
- [ ] PDF viewer inline
- [ ] Bulk upload
- [ ] Document search/filter
- [ ] Version control
- [ ] Document expiry dates
- [ ] OCR for text extraction
- [ ] Document templates
- [ ] E-signature integration

---

## 📞 Support

### Common Questions:

**Q: Can I upload multiple files at once?**
A: Yes, select multiple files and click upload.

**Q: What's the maximum file size?**
A: Currently 10MB per file (configurable).

**Q: Can patients see their documents?**
A: Yes, if you integrate DocumentList on patient portal.

**Q: Are documents backed up?**
A: Yes, Supabase Storage is backed up automatically.

**Q: Can I organize by folders?**
A: Yes, use the `category` prop for organization.

---

**Status:** ✅ Ready to Implement  
**Complexity:** Medium  
**Estimated Time:** 30-60 minutes to integrate

---

_Remember to execute the SQL migration and create the storage bucket before testing!_
