import { supabase } from './supabase';

export interface PatientDocument {
  id: string;
  patient_id: string;
  uhid: string;
  document_name: string;
  document_type?: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  upload_date: string;
  category?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  temp_file?: File; // Add temporary file property
}

export interface DocumentUploadData {
  patient_id: string;
  uhid: string;
  document_name: string;
  document_type?: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  category?: string;
  notes?: string;
}

// Storage bucket name
const BUCKET_NAME = 'patient-documents';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadDocumentFile(
  file: File,
  patientId: string,
  uhid: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // Create unique file name to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${uhid}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error.message, error);
      return { success: false, error: error.message };
    }

    return { success: true, filePath: data.path };
  } catch (error: any) {
    console.error('Error in uploadDocumentFile:', error);
    return { success: false, error: error.message || 'Failed to upload file' };
  }
}

/**
 * Save document metadata to database
 */
export async function saveDocumentMetadata(
  documentData: DocumentUploadData
): Promise<{ success: boolean; document?: PatientDocument; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('patient_documents')
      .insert([documentData])
      .select()
      .single();

    if (error) {
      console.error('Error saving document metadata:', error.message, error);
      return { success: false, error: error.message };
    }

    return { success: true, document: data };
  } catch (error: any) {
    console.error('Error in saveDocumentMetadata:', error);
    return { success: false, error: error.message || 'Failed to save document metadata' };
  }
}

/**
 * Complete document upload (file + metadata)
 */
export async function uploadPatientDocument(
  file: File,
  patientId: string,
  uhid: string,
  category: string = 'general',
  documentType?: string,
  notes?: string,
  staffId?: string
): Promise<{ success: boolean; document?: PatientDocument; error?: string }> {
  try {
    // 1. Upload file to storage
    const uploadResult = await uploadDocumentFile(file, patientId, uhid);

    if (!uploadResult.success || !uploadResult.filePath) {
      return { success: false, error: uploadResult.error || 'File upload failed' };
    }

    // 2. Save metadata to database
    const metadata: DocumentUploadData = {
      patient_id: patientId,
      uhid: uhid,
      document_name: file.name,
      document_type: documentType,
      file_path: uploadResult.filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: staffId,
      category: category,
      notes: notes
    };

    const metadataResult = await saveDocumentMetadata(metadata);

    if (!metadataResult.success) {
      // If metadata save fails, try to delete the uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([uploadResult.filePath]);
      return { success: false, error: metadataResult.error };
    }

    return { success: true, document: metadataResult.document };
  } catch (error: any) {
    console.error('Error in uploadPatientDocument:', error);
    return { success: false, error: error.message || 'Failed to upload document' };
  }
}

/**
 * Get all documents for a patient
 */
export async function getPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  if (!patientId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patientId)
      .order('upload_date', { ascending: false });

    if (error) {
      console.error('Error fetching patient documents:', error.message, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPatientDocuments:', error);
    return [];
  }
}

/**
 * Get document download URL
 */
export async function getDocumentUrl(filePath: string): Promise<string | null> {
  try {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error getting document URL:', error);
    return null;
  }
}

/**
 * Download a document
 */
export async function downloadDocument(filePath: string, fileName: string): Promise<void> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) throw error;

    // Create blob URL and trigger download
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
}

/**
 * Delete a document (file + metadata)
 */
export async function deleteDocument(documentId: string, filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }

    // 2. Delete metadata from database
    const { error: dbError } = await supabase
      .from('patient_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Error deleting document metadata:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteDocument:', error);
    return { success: false, error: error.message || 'Failed to delete document' };
  }
}

/**
 * Get documents by category
 */
export async function getDocumentsByCategory(patientId: string, category: string): Promise<PatientDocument[]> {
  if (!patientId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patientId)
      .eq('category', category)
      .order('upload_date', { ascending: false });

    if (error) {
      console.error('Error fetching documents by category:', error.message, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDocumentsByCategory:', error);
    return [];
  }
}
