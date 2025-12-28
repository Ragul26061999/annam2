'use client';

import React, { useState } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { uploadPatientDocument } from '../lib/documentService';

interface DocumentUploadProps {
    patientId?: string;
    uhid?: string;
    staffId?: string;
    category?: string;
    onUploadComplete?: (document: any) => void;
    onUploadError?: (error: string) => void;
    disabled?: boolean;
}

export default function DocumentUpload({
    patientId,
    uhid,
    staffId,
    category = 'general',
    onUploadComplete,
    onUploadError,
    disabled = false
}: DocumentUploadProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setSuccess(null);

        if (e.target.files) {
            const files = Array.from(e.target.files);

            // Validate file size (max 10MB per file)
            const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
            if (invalidFiles.length > 0) {
                setError('Some files exceed the 10MB size limit');
                return;
            }

            setSelectedFiles(prev => [...prev, ...files]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setError(null);
        setSuccess(null);
    };

    const handleUpload = async () => {
        if (!patientId || !uhid) {
            setError('Patient information is required');
            return;
        }

        if (selectedFiles.length === 0) {
            setError('Please select at least one file');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const file of selectedFiles) {
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

                const result = await uploadPatientDocument(
                    file,
                    patientId,
                    uhid,
                    category,
                    file.type,
                    '',
                    staffId
                );

                if (result.success) {
                    successCount++;
                    setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                    if (onUploadComplete && result.document) {
                        onUploadComplete(result.document);
                    }
                } else {
                    errorCount++;
                    if (onUploadError) {
                        onUploadError(result.error || 'Upload failed');
                    }
                }
            }

            if (errorCount === 0) {
                setSuccess(`Successfully uploaded ${successCount} file(s)`);
                setSelectedFiles([]);
                setUploadProgress({});
            } else {
                setError(`Upload completed with ${errorCount} error(s)`);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to upload documents');
            if (onUploadError) {
                onUploadError(err.message);
            }
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${disabled
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                }`}>
                <label htmlFor="file-upload" className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <Upload className={`h-12 w-12 mx-auto mb-3 ${disabled ? 'text-gray-400' : 'text-blue-500'}`} />
                    <p className={`text-sm font-semibold mb-1 ${disabled ? 'text-gray-500' : 'text-gray-700'}`}>
                        {disabled ? 'Document upload disabled' : 'Click to upload or drag and drop'}
                    </p>
                    <p className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
                        PDF, JPG, PNG up to 10MB
                    </p>
                    <input
                        id="file-upload"
                        type="file"
                        multiple
                        disabled={disabled}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                </label>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Selected Files ({selectedFiles.length})</h4>
                    {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                                <File className="h-5 w-5 text-blue-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                            </div>
                            {!uploading && (
                                <button
                                    onClick={() => removeFile(index)}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                    <X className="h-4 w-4 text-gray-500" />
                                </button>
                            )}
                            {uploading && uploadProgress[file.name] !== undefined && (
                                <div className="text-xs text-gray-500">
                                    {uploadProgress[file.name]}%
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-700">{success}</p>
                </div>
            )}

            {/* Upload Button */}
            {selectedFiles.length > 0 && (
                <button
                    onClick={handleUpload}
                    disabled={uploading || disabled || !patientId}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="h-5 w-5" />
                            Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
