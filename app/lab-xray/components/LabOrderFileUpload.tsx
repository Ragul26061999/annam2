'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Eye, Download, Trash2, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';

interface LabOrderFileUploadProps {
  billId: string;
  patientId: string;
  labOrderIds: string[];
  billNumber: string;
  onUploadComplete?: () => void;
}

interface UploadedFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_at: string;
  lab_order_id: string | null;
}

export default function LabOrderFileUpload({ 
  billId, 
  patientId, 
  labOrderIds, 
  billNumber,
  onUploadComplete 
}: LabOrderFileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [billId]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('LabOrderFileUpload: Loading files for bill:', billId);
      
      const { data, error: fetchError } = await supabase
        .from('lab_xray_attachments')
        .select('*')
        .eq('billing_id', billId)
        .order('uploaded_at', { ascending: false });

      if (fetchError) {
        console.error('LabOrderFileUpload: Error fetching files:', fetchError);
        throw fetchError;
      }

      console.log('LabOrderFileUpload: Loaded files:', data);
      setFiles(data || []);
    } catch (err: any) {
      console.error('LabOrderFileUpload: Load error:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user?.id) {
        console.warn('LabOrderFileUpload: Could not get user ID:', error);
        return null;
      }
      
      // Verify user exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (checkError || !existingUser) {
        console.warn('LabOrderFileUpload: User ID not found in users table:', user.id);
        return null;
      }
      
      return user.id;
    } catch (err) {
      console.error('LabOrderFileUpload: Error getting user ID:', err);
      return null;
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      await handleUpload(droppedFiles);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      await handleUpload(selectedFiles);
    }
    // Reset input
    e.target.value = '';
  };

  const handleUpload = async (fileList: FileList) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const uploadedBy = await getCurrentUserId();
      
      // Validate lab order IDs exist in database
      let validLabOrderId: string | null = null;
      if (labOrderIds.length > 0) {
        console.log('LabOrderFileUpload: Validating lab order IDs:', labOrderIds);
        
        // Check if any of the lab order IDs exist in the database
        const { data: existingOrders, error: checkError } = await supabase
          .from('lab_test_orders')
          .select('id')
          .in('id', labOrderIds)
          .limit(1);

        if (!checkError && existingOrders && existingOrders.length > 0) {
          validLabOrderId = existingOrders[0].id;
          console.log('LabOrderFileUpload: Found valid lab order ID:', validLabOrderId);
        } else {
          console.warn('LabOrderFileUpload: No valid lab orders found in database, will use null');
        }
      }

      console.log('LabOrderFileUpload: Starting upload for', fileList.length, 'files');
      console.log('LabOrderFileUpload: Lab order IDs provided:', labOrderIds);
      console.log('LabOrderFileUpload: Valid lab order ID to use:', validLabOrderId);

      const uploadPromises = Array.from(fileList).map(async (file) => {
        // Validate file type
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
          throw new Error(`File "${file.name}" is not a PDF. Only PDF files are allowed.`);
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const filePath = `billing/${billId}/${timestamp}-${random}.${ext}`;

        console.log('LabOrderFileUpload: Uploading file to storage:', filePath);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('lab-xray-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('LabOrderFileUpload: Storage upload error:', uploadError);
          throw new Error(`Failed to upload "${file.name}": ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('lab-xray-attachments')
          .getPublicUrl(filePath);

        console.log('LabOrderFileUpload: File uploaded, URL:', urlData.publicUrl);

        // Insert record into database
        const attachmentData = {
          patient_id: patientId,
          billing_id: billId,
          lab_order_id: validLabOrderId, // Will be null if no valid lab order exists
          test_name: `Lab Test - ${billNumber}`,
          test_type: 'lab',
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || 'application/pdf',
          file_size: file.size,
          file_url: urlData.publicUrl,
          uploaded_by: uploadedBy,
        };

        console.log('LabOrderFileUpload: Inserting attachment record:', attachmentData);

        const { error: insertError } = await supabase
          .from('lab_xray_attachments')
          .insert(attachmentData);

        if (insertError) {
          console.error('LabOrderFileUpload: Database insert error:', insertError);
          // Try to clean up the uploaded file
          await supabase.storage
            .from('lab-xray-attachments')
            .remove([filePath]);
          throw new Error(`Failed to save "${file.name}" record: ${insertError.message}`);
        }

        console.log('LabOrderFileUpload: File uploaded successfully:', file.name);
      });

      await Promise.all(uploadPromises);

      setSuccess(`Successfully uploaded ${fileList.length} file(s)`);
      
      // Reload files after a short delay
      setTimeout(async () => {
        await loadFiles();
        if (onUploadComplete) {
          onUploadComplete();
        }
      }, 500);

    } catch (err: any) {
      console.error('LabOrderFileUpload: Upload error:', err);
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file: UploadedFile) => {
    if (!window.confirm(`Are you sure you want to delete "${file.file_name}"?`)) {
      return;
    }

    try {
      console.log('LabOrderFileUpload: Deleting file:', file.id);

      // Delete from storage
      if (file.file_url) {
        const { error: storageError } = await supabase.storage
          .from('lab-xray-attachments')
          .remove([file.file_url.split('/').slice(-3).join('/')]);

        if (storageError) {
          console.warn('LabOrderFileUpload: Storage delete warning:', storageError);
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('lab_xray_attachments')
        .delete()
        .eq('id', file.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess('File deleted successfully');
      await loadFiles();
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      console.error('LabOrderFileUpload: Delete error:', err);
      setError('Failed to delete file');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Lab Test Documents</h4>
          <p className="text-sm text-gray-500">Upload and manage PDF files for this lab order</p>
        </div>
        <div className="text-sm text-gray-600">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="application/pdf,.pdf"
          onChange={handleFileSelect}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="text-center">
          {uploading ? (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">Uploading files...</p>
              <p className="text-xs text-gray-500">Please wait</p>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                Drop PDF files here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Maximum file size: 10MB • PDF files only
              </p>
            </>
          )}
        </div>
      </div>

      {/* Files List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading files...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No files uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload PDF files using the area above</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-gray-700">Uploaded Files</h5>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate text-sm">
                      {file.file_name}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View file"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <a
                    href={file.file_url}
                    download={file.file_name}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
