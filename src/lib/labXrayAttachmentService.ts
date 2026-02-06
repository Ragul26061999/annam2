import { supabase } from './supabase';

function supabaseErrorToString(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  const anyErr = err as any;
  if (typeof anyErr?.message === 'string') return anyErr.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export interface LabXrayAttachment {
  id: string;
  patient_id: string;
  lab_order_id?: string;
  radiology_order_id?: string;
  test_name: string;
  test_type: 'lab' | 'radiology';
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  file_url?: string;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface LabXrayAttachmentUploadData {
  patient_id: string;
  lab_order_id?: string;
  radiology_order_id?: string;
  test_name: string;
  test_type: 'lab' | 'radiology';
  file: File;
  uploaded_by?: string;
}

// Upload file for lab/xray test
export async function uploadLabXrayAttachment(
  data: LabXrayAttachmentUploadData
): Promise<LabXrayAttachment> {
  try {
    if (!data.patient_id) {
      throw new Error('Patient not selected. Please select a patient before uploading.');
    }

    let uploadedByUserId = data.uploaded_by || '';

    // Get authenticated user if uploaded_by not provided
    if (!uploadedByUserId) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const authUserId = authData.user.id;
      const { data: appUser, error: appUserError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUserId)
        .maybeSingle();

      if (appUserError) {
        throw new Error(appUserError.message || 'Failed to resolve application user.');
      }

      if (!appUser?.id) {
        throw new Error('No user profile found for this login. Please create a user with employee_id in Users table.');
      }

      uploadedByUserId = appUser.id;
    }

    // Validate file size (20MB max)
    if (data.file.size > 20 * 1024 * 1024) {
      throw new Error('File size must be less than 20MB');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/dicom',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/dicom',
      'image/tiff'
    ];

    if (!allowedTypes.includes(data.file.type)) {
      throw new Error('Only PDF, images, DICOM, and text files are allowed');
    }

    // Generate unique file path
    const fileExt = data.file.name.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2);
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;
    
    // Organize files by type and patient
    const filePath = `${data.test_type}-tests/${data.patient_id}/${fileName}`;

    // Upload file to Supabase storage
    let uploadError: any = null;
    {
      const res = await supabase.storage
        .from('lab-xray-attachments')
        .upload(filePath, data.file, {
          cacheControl: '3600',
          upsert: false
        });
      uploadError = res.error;
    }

    // If bucket was missing (common misconfig), attempt to create/ensure then retry once.
    if (uploadError?.message?.toLowerCase?.().includes('bucket not found')) {
      throw new Error('Storage bucket "lab-xray-attachments" not found. Please contact administrator to create the storage bucket.');
    }

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error(`Failed to upload file: ${supabaseErrorToString(uploadError)}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lab-xray-attachments')
      .getPublicUrl(filePath);

    // Save attachment record to database
    const { data: attachment, error: dbError } = await supabase
      .from('lab_xray_attachments')
      .insert({
        patient_id: data.patient_id,
        lab_order_id: data.lab_order_id || null,
        radiology_order_id: data.radiology_order_id || null,
        test_name: data.test_name,
        test_type: data.test_type,
        file_name: data.file.name,
        file_path: filePath,
        file_type: data.file.type,
        file_size: data.file.size,
        uploaded_by: uploadedByUserId,
        file_url: urlData.publicUrl
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving attachment record:', {
        message: (dbError as any)?.message,
        details: (dbError as any).details,
        hint: (dbError as any).hint,
        code: (dbError as any).code
      });
      
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('lab-xray-attachments')
        .remove([filePath]);
      
      throw new Error(`Failed to save attachment record: ${supabaseErrorToString(dbError)}`);
    }

    return attachment;
  } catch (error) {
    console.error('Error in uploadLabXrayAttachment:', error);
    throw error;
  }
}

// Get attachments for a specific lab test order
export async function getLabTestAttachments(
  testOrderId: string
): Promise<LabXrayAttachment[]> {
  try {
    const { data, error } = await supabase
      .from('lab_xray_attachments')
      .select('*')
      .eq('lab_order_id', testOrderId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching lab test attachments:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLabTestAttachments:', error);
    throw new Error(supabaseErrorToString(error));
  }
}

// Get attachments for a specific radiology order
export async function getRadiologyAttachments(
  radiologyOrderId: string
): Promise<LabXrayAttachment[]> {
  try {
    const { data, error } = await supabase
      .from('lab_xray_attachments')
      .select('*')
      .eq('radiology_order_id', radiologyOrderId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching radiology attachments:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRadiologyAttachments:', error);
    throw new Error(supabaseErrorToString(error));
  }
}

// Get all attachments for a patient (both lab and radiology)
export async function getPatientLabXrayAttachments(
  patientId: string
): Promise<LabXrayAttachment[]> {
  try {
    if (!patientId) return [];
    const { data, error } = await supabase
      .from('lab_xray_attachments')
      .select('*')
      .eq('patient_id', patientId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching patient attachments:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPatientLabXrayAttachments:', error);
    throw new Error(supabaseErrorToString(error));
  }
}

// Delete lab/xray attachment
export async function deleteLabXrayAttachment(
  attachmentId: string
): Promise<void> {
  try {
    // Get attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('lab_xray_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      console.error('Error fetching attachment details:', fetchError);
      throw fetchError;
    }

    // Delete from storage
    if (attachment?.file_path) {
      const { error: storageError } = await supabase.storage
        .from('lab-xray-attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue to delete database record even if storage deletion fails
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('lab_xray_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Error deleting attachment record:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error in deleteLabXrayAttachment:', error);
    throw new Error(supabaseErrorToString(error));
  }
}

// Get download URL for attachment
export function getLabXrayAttachmentDownloadUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('lab-xray-attachments')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

// Check if storage bucket exists, create if not
export async function ensureLabXrayAttachmentBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((bucket: any) => bucket.name === 'lab-xray-attachments') || false;
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket('lab-xray-attachments', {
        public: true,
        fileSizeLimit: 20971520, // 20MB
        allowedMimeTypes: [
          'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/dicom',
          'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/dicom', 'image/tiff'
        ]
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error in ensureLabXrayAttachmentBucket:', error);
    throw error;
  }
}

// Update attachment record (e.g., link to test order after order is created)
export async function updateLabXrayAttachment(
  attachmentId: string,
  updates: Partial<Pick<LabXrayAttachment, 'lab_order_id' | 'radiology_order_id' | 'test_name'>>
): Promise<LabXrayAttachment> {
  try {
    const { data, error } = await supabase
      .from('lab_xray_attachments')
      .update(updates)
      .eq('id', attachmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating attachment:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateLabXrayAttachment:', error);
    throw new Error(supabaseErrorToString(error));
  }
}
