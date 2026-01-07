'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle, Loader2, Search, Folder, Image, FileText, FileImage } from 'lucide-react';
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

interface UploadedFile {
    file: File;
    id: string;
    category: string;
    notes: string;
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
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const documentCategories = [
        { value: 'general', label: 'General', icon: File },
        { value: 'medical_report', label: 'Medical Report', icon: FileText },
        { value: 'lab_result', label: 'Lab Result', icon: FileText },
        { value: 'prescription', label: 'Prescription', icon: FileText },
        { value: 'imaging', label: 'Imaging (X-ray/MRI)', icon: FileImage },
        { value: 'insurance', label: 'Insurance', icon: File },
        { value: 'id_proof', label: 'ID Proof', icon: File },
        { value: 'other', label: 'Other', icon: File }
    ];

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return Image;
        if (file.type.includes('pdf') || file.type.includes('document')) return FileText;
        return File;
    };

    const handleFileSelect = (files: FileList | null) => {
        setError(null);
        setSuccess(null);

        if (!files) return;

        const newFiles = Array.from(files);

        // Validate file size (max 10MB per file)
        const invalidFiles = newFiles.filter(file => file.size > 10 * 1024 * 1024);
        if (invalidFiles.length > 0) {
            setError('Some files exceed the 10MB size limit');
            return;
        }

        const newUploadedFiles: UploadedFile[] = newFiles.map(file => ({
            file,
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            category: category,
            notes: ''
        }));

        setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (!disabled) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const removeFile = (id: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
        setError(null);
        setSuccess(null);
    };

    const updateFileCategory = (id: string, newCategory: string) => {
        setUploadedFiles(prev => prev.map(f => 
            f.id === id ? { ...f, category: newCategory } : f
        ));
    };

    const updateFileNotes = (id: string, notes: string) => {
        setUploadedFiles(prev => prev.map(f => 
            f.id === id ? { ...f, notes } : f
        ));
    };

    const handleUpload = async () => {
        if (!uhid) {
            setError('Patient UHID is required');
            return;
        }

        if (uploadedFiles.length === 0) {
            setError('Please select at least one file');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const uploadedFile of uploadedFiles) {
                setUploadProgress(prev => ({ ...prev, [uploadedFile.file.name]: 0 }));

                // For now, just simulate upload if patientId is not available
                if (!patientId) {
                    // Simulate upload progress
                    for (let i = 0; i <= 100; i += 20) {
                        setUploadProgress(prev => ({ ...prev, [uploadedFile.file.name]: i }));
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    successCount++;
                    setUploadProgress(prev => ({ ...prev, [uploadedFile.file.name]: 100 }));
                    if (onUploadComplete) {
                        onUploadComplete({
                            id: `temp-${uploadedFile.id}`,
                            document_name: uploadedFile.file.name,
                            category: uploadedFile.category,
                            notes: uploadedFile.notes,
                            file_size: uploadedFile.file.size,
                            mime_type: uploadedFile.file.type,
                            upload_date: new Date().toISOString(),
                            temp_file: uploadedFile.file
                        });
                    }
                } else {
                    const result = await uploadPatientDocument(
                        uploadedFile.file,
                        patientId,
                        uhid,
                        uploadedFile.category,
                        uploadedFile.file.type,
                        uploadedFile.notes,
                        staffId
                    );

                    if (result.success) {
                        successCount++;
                        setUploadProgress(prev => ({ ...prev, [uploadedFile.file.name]: 100 }));
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
            }

            if (errorCount === 0) {
                setSuccess(`Successfully processed ${successCount} file(s)`);
                setUploadedFiles([]);
                setUploadProgress({});
            } else {
                setError(`Processing completed with ${errorCount} error(s) and ${successCount} success(es)`);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to process documents');
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
            {/* Upload Area - Simplified and Clickable */}
            <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${disabled || isDragOver
                    ? disabled 
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : 'border-blue-400 bg-blue-100'
                    : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !disabled && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    disabled={disabled}
                    onChange={handleInputChange}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.gif,.webp"
                />
                <Upload className={`h-16 w-16 mx-auto mb-4 ${disabled ? 'text-gray-400' : isDragOver ? 'text-blue-600' : 'text-blue-500'}`} />
                <p className={`text-lg font-semibold mb-2 ${disabled ? 'text-gray-500' : isDragOver ? 'text-blue-700' : 'text-gray-700'}`}>
                    {disabled ? 'Document upload disabled' : isDragOver ? 'Drop files here' : 'Click to upload documents'}
                </p>
                <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                    or drag and drop files here
                </p>
                <p className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
                    Supports: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)
                </p>
            </div>

            {/* Selected Files List */}
            {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700">Selected Files ({uploadedFiles.length})</h4>
                        <button
                            onClick={() => setUploadedFiles([])}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                            Clear All
                        </button>
                    </div>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {uploadedFiles.map((uploadedFile) => {
                            const FileIcon = getFileIcon(uploadedFile.file);
                            return (
                                <div key={uploadedFile.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-start gap-3">
                                        <FileIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{uploadedFile.file.name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.file.size)}</p>
                                            
                                            {/* Category and Notes */}
                                            <div className="mt-2 space-y-2">
                                                <select
                                                    value={uploadedFile.category}
                                                    onChange={(e) => updateFileCategory(uploadedFile.id, e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                    disabled={uploading}
                                                >
                                                    {documentCategories.map(cat => (
                                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="Add notes (optional)"
                                                    value={uploadedFile.notes}
                                                    onChange={(e) => updateFileNotes(uploadedFile.id, e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                    disabled={uploading}
                                                />
                                            </div>
                                        </div>
                                        {!uploading && (
                                            <button
                                                onClick={() => removeFile(uploadedFile.id)}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                            >
                                                <X className="h-4 w-4 text-gray-500" />
                                            </button>
                                        )}
                                        {uploading && uploadProgress[uploadedFile.file.name] !== undefined && (
                                            <div className="text-xs text-gray-500 flex-shrink-0">
                                                {uploadProgress[uploadedFile.file.name]}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
            {uploadedFiles.length > 0 && (
                <button
                    onClick={handleUpload}
                    disabled={uploading || disabled}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Uploading {uploadedFiles.length} File{uploadedFiles.length > 1 ? 's' : ''}...
                        </>
                    ) : (
                        <>
                            <Upload className="h-5 w-5" />
                            Upload {uploadedFiles.length} File{uploadedFiles.length > 1 ? 's' : ''}
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
