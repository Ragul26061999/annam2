import { supabase } from './supabase';

export interface DischargeAttachment {
  id: string;
  discharge_summary_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface DischargeSummaryWithAttachments {
  discharge_summary: any;
  attachments: DischargeAttachment[];
}

// Upload file for discharge summary
export async function uploadDischargeAttachment(
  dischargeSummaryId: string,
  file: File,
  uploadedBy: string
): Promise<DischargeAttachment> {
  try {
    let uploadedByUserId = uploadedBy;

    // discharge_attachments.uploaded_by references public.users(id) (app user), not auth.users(id)
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

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `discharge-summaries/${dischargeSummaryId}/${fileName}`;

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('discharge-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('discharge-attachments')
      .getPublicUrl(filePath);

    // Save attachment record to database
    const { data: attachment, error: dbError } = await supabase
      .from('discharge_attachments')
      .insert({
        discharge_summary_id: dischargeSummaryId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: uploadedByUserId,
        file_url: urlData.publicUrl
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving attachment record:', {
        message: dbError.message,
        details: (dbError as any).details,
        hint: (dbError as any).hint,
        code: (dbError as any).code
      });
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('discharge-attachments')
        .remove([filePath]);
      throw new Error(`Failed to save attachment record: ${dbError.message}`);
    }

    return attachment;
  } catch (error) {
    console.error('Error in uploadDischargeAttachment:', error);
    throw error;
  }
}

// Get all attachments for a discharge summary
export async function getDischargeAttachments(
  dischargeSummaryId: string
): Promise<DischargeAttachment[]> {
  try {
    const { data, error } = await supabase
      .from('discharge_attachments')
      .select('*')
      .eq('discharge_summary_id', dischargeSummaryId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDischargeAttachments:', error);
    throw error;
  }
}

// Delete discharge attachment
export async function deleteDischargeAttachment(
  attachmentId: string
): Promise<void> {
  try {
    // Get attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('discharge_attachments')
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
        .from('discharge-attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue to delete database record even if storage deletion fails
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('discharge_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Error deleting attachment record:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error in deleteDischargeAttachment:', error);
    throw error;
  }
}

// Get discharge summary with all attachments
export async function getDischargeSummaryWithAttachments(
  allocationId: string
): Promise<DischargeSummaryWithAttachments | null> {
  try {
    // Get discharge summary
    const { data: summary, error: summaryError } = await supabase
      .from('discharge_summaries')
      .select('*')
      .eq('allocation_id', allocationId)
      .maybeSingle();

    if (summaryError) {
      console.error('Error fetching discharge summary:', summaryError);
      throw summaryError;
    }

    if (!summary) {
      return null;
    }

    // Get attachments
    const attachments = await getDischargeAttachments(summary.id);

    return {
      discharge_summary: summary,
      attachments
    };
  } catch (error) {
    console.error('Error in getDischargeSummaryWithAttachments:', error);
    throw error;
  }
}

// Download attachment
export function getAttachmentDownloadUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('discharge-attachments')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

// Check if storage bucket exists, create if not
export async function ensureDischargeAttachmentBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'discharge-attachments') || false;
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket('discharge-attachments', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain']
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
        throw error;
      }
    }

    // Set up RLS policies for the bucket
    const { error: policyError } = await supabase.rpc('create_discharge_attachments_policies');
    if (policyError) {
      console.error('Error setting up RLS policies:', policyError);
      // Don't throw here as policies might already exist
    }
  } catch (error) {
    console.error('Error in ensureDischargeAttachmentBucket:', error);
    throw error;
  }
}
