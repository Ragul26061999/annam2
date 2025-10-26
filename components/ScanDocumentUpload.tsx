'use client';
import React, { useState } from 'react';
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

interface ScanDocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  scanOrder: {
    id: string;
    scan_type: string;
    scan_name: string;
    body_part: string;
    clinical_indication: string;
  };
  patientId: string;
  encounterId: string;
  onSuccess?: () => void;
}

interface UploadedDocument {
  id: string;
  document_name: string;
  file_url: string;
  file_size: number;
  document_type: string;
  upload_date: string;
}

export default function ScanDocumentUpload({
  isOpen,
  onClose,
  scanOrder,
  patientId,
  encounterId,
  onSuccess
}: ScanDocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [scanDate, setScanDate] = useState(new Date().toISOString().split('T')[0]);
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [radiologistNotes, setRadiologistNotes] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Validate file types
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/dicom'];
      const validFiles = files.filter(file => {
        if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.dcm')) {
          setError(`Invalid file type: ${file.name}. Please upload JPEG, PNG, PDF, or DICOM files.`);
          return false;
        }
        return true;
      });
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${scanOrder.id}_${Date.now()}.${fileExt}`;
    const filePath = `scan-documents/${patientId}/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from('medical-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('medical-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const uploadedDocs: UploadedDocument[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));

        // Upload file to storage
        const fileUrl = await uploadFile(file);

        // Save document record to database
        const { data, error: dbError } = await supabase
          .from('scan_documents')
          .insert({
            scan_order_id: scanOrder.id,
            patient_id: patientId,
            encounter_id: encounterId,
            document_name: file.name,
            document_type: file.type || 'application/octet-stream',
            file_url: fileUrl,
            file_size: file.size,
            scan_date: scanDate,
            findings: findings || null,
            impression: impression || null,
            radiologist_notes: radiologistNotes || null,
            status: 'uploaded'
          })
          .select()
          .single();

        if (dbError) throw dbError;

        uploadedDocs.push(data);
      }

      // Update scan order status to completed
      await supabase
        .from('scan_orders')
        .update({ 
          status: 'completed',
          completed_date: new Date().toISOString()
        })
        .eq('id', scanOrder.id);

      setUploadedDocuments(uploadedDocs);
      setSuccess(true);
      setSelectedFiles([]);
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upload Scan Documents</h2>
            <p className="text-sm text-gray-600 mt-1">
              {scanOrder.scan_type} - {scanOrder.scan_name} ({scanOrder.body_part})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Clinical Indication */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Clinical Indication</h4>
            <p className="text-blue-800 text-sm">{scanOrder.clinical_indication}</p>
          </div>

          {/* Scan Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Scan Date
              </label>
              <input
                type="date"
                value={scanDate}
                onChange={(e) => setScanDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-500 transition-colors">
            <input
              type="file"
              id="file-upload"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.dcm"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                JPEG, PNG, PDF, or DICOM files (Max 10MB per file)
              </p>
            </label>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">Selected Files ({selectedFiles.length})</h4>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    disabled={uploading}
                  >
                    <X size={18} className="text-gray-600" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Uploading...</span>
                <span className="text-sm font-medium text-blue-900">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Report Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Report Details (Optional)</h4>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Findings
              </label>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Key findings from the scan"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Impression
              </label>
              <textarea
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Clinical impression"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Radiologist Notes
              </label>
              <textarea
                value={radiologistNotes}
                onChange={(e) => setRadiologistNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Additional notes from radiologist"
                disabled={uploading}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <p className="text-green-800 text-sm">
                Documents uploaded successfully! Scan order marked as completed.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              disabled={uploading}
            >
              {success ? 'Close' : 'Cancel'}
            </button>
            {!success && (
              <button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Upload Documents</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
