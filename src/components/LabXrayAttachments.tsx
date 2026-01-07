'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Download, Trash2, AlertCircle, CheckCircle, Loader2, Eye, Search, Filter } from 'lucide-react';
import { 
  uploadLabXrayAttachment, 
  getPatientLabXrayAttachments, 
  getLabTestAttachments,
  getRadiologyAttachments,
  deleteLabXrayAttachment,
  getLabXrayAttachmentDownloadUrl,
  type LabXrayAttachment,
  type LabXrayAttachmentUploadData
} from '../lib/labXrayAttachmentService';

function toErrorMessage(err: unknown): string {
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

interface LabXrayAttachmentsProps {
  patientId: string;
  labOrderId?: string;
  radiologyOrderId?: string;
  testType?: 'lab' | 'radiology';
  testName?: string;
  uploadedBy?: string;
  onAttachmentChange?: () => void;
  showFileBrowser?: boolean;
}

export default function LabXrayAttachments({ 
  patientId, 
  labOrderId,
  radiologyOrderId,
  testType = 'lab',
  testName = '',
  uploadedBy, 
  onAttachmentChange,
  showFileBrowser = true
}: LabXrayAttachmentsProps) {
  const [attachments, setAttachments] = useState<LabXrayAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lab' | 'radiology'>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAttachments();
  }, [patientId, labOrderId, radiologyOrderId]);

  const loadAttachments = async () => {
    try {
      if (!patientId) {
        setAttachments([]);
        return;
      }

      let data: LabXrayAttachment[] = [];
      
      if (labOrderId) {
        data = await getLabTestAttachments(labOrderId);
      } else if (radiologyOrderId) {
        data = await getRadiologyAttachments(radiologyOrderId);
      } else {
        data = await getPatientLabXrayAttachments(patientId);
      }
      
      setAttachments(data);
    } catch (err: any) {
      console.error('Error loading attachments:', err);
      setError(toErrorMessage(err));
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!patientId) {
      setError('Please select a patient before uploading.');
      return;
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      setError('File size must be less than 20MB');
      return;
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

    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, images, DICOM, and text files are allowed');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const uploadData: LabXrayAttachmentUploadData = {
        patient_id: patientId,
        lab_order_id: labOrderId,
        radiology_order_id: radiologyOrderId,
        test_name: testName || `${testType.toUpperCase()} Test`,
        test_type: testType,
        file: file,
        uploaded_by: uploadedBy
      };

      const attachment = await uploadLabXrayAttachment(uploadData);
      setAttachments(prev => [attachment, ...prev]);
      setSuccess(true);
      onAttachmentChange?.();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(toErrorMessage(err));
    } finally {
      setUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await deleteLabXrayAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      onAttachmentChange?.();
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      setError('Failed to delete attachment');
    }
  };

  const handleDownload = (attachment: LabXrayAttachment) => {
    const url = getLabXrayAttachmentDownloadUrl(attachment.file_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (attachment: LabXrayAttachment) => {
    const url = getLabXrayAttachmentDownloadUrl(attachment.file_path);
    window.open(url, '_blank');
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
    if (fileType.includes('dicom')) return <FileText className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  // Filter attachments based on search and filter
  const filteredAttachments = attachments.filter(attachment => {
    const matchesSearch = attachment.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         attachment.test_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || attachment.test_type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      {showFileBrowser && (
        <div 
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Click to upload or drag and drop
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  PDF, Images, DICOM, or Text files up to 20MB
                </span>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.txt,.doc,.docx,.dcm,.dicom,.tiff"
                  onChange={handleFileInputChange}
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
      )}

      {/* Search and Filter */}
      {showFileBrowser && attachments.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('lab')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'lab' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Lab
            </button>
            <button
              onClick={() => setFilterType('radiology')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'radiology' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Radiology
            </button>
          </div>
        </div>
      )}

      {/* Attachments List */}
      {filteredAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            Attachments ({filteredAttachments.length})
          </h4>
          <div className="space-y-2">
            {filteredAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(attachment.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {attachment.test_type.toUpperCase()}
                      </span>
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(attachment.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {attachment.test_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(attachment)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
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

      {/* Empty State */}
      {filteredAttachments.length === 0 && !uploading && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm">
            {searchTerm || filterType !== 'all' 
              ? 'No files found matching your criteria' 
              : 'No attachments yet'}
          </p>
        </div>
      )}
    </div>
  );
}
