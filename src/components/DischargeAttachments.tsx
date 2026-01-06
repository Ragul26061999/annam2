'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { 
  uploadDischargeAttachment, 
  getDischargeAttachments, 
  deleteDischargeAttachment,
  getAttachmentDownloadUrl,
  type DischargeAttachment 
} from '../lib/dischargeAttachmentService';

interface DischargeAttachmentsProps {
  dischargeSummaryId: string;
  uploadedBy?: string;
  onAttachmentChange?: () => void;
}

export default function DischargeAttachments({ 
  dischargeSummaryId, 
  uploadedBy, 
  onAttachmentChange 
}: DischargeAttachmentsProps) {
  const [attachments, setAttachments] = useState<DischargeAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadAttachments();
  }, [dischargeSummaryId]);

  const loadAttachments = async () => {
    try {
      const data = await getDischargeAttachments(dischargeSummaryId);
      setAttachments(data);
    } catch (err: any) {
      console.error('Error loading attachments:', err);
      setError('Failed to load attachments');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, images, and text files are allowed');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const attachment = await uploadDischargeAttachment(dischargeSummaryId, file, uploadedBy || '');
      setAttachments(prev => [attachment, ...prev]);
      setSuccess(true);
      onAttachmentChange?.();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }

    // Clear file input
    event.target.value = '';
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await deleteDischargeAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      onAttachmentChange?.();
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      setError('Failed to delete attachment');
    }
  };

  const handleDownload = (attachment: DischargeAttachment) => {
    const url = getAttachmentDownloadUrl(attachment.file_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (fileType.includes('image')) return <FileText className="w-4 h-4 text-green-500" />;
    if (fileType.includes('text')) return <FileText className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Click to upload or drag and drop
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                PDF, Images, or Text files up to 10MB
              </span>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.txt,.doc,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading file...
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            File uploaded successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Attachments ({attachments.length})</h4>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(attachment.file_type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.file_size)} • 
                      {new Date(attachment.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(attachment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attachments.length === 0 && !uploading && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm">No attachments yet</p>
        </div>
      )}
    </div>
  );
}
