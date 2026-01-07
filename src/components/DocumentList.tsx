'use client';

import React, { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    Trash2,
    Calendar,
    User,
    File,
    AlertCircle,
    Loader2,
    FolderOpen
} from 'lucide-react';
import {
    getPatientDocuments,
    downloadDocument,
    deleteDocument,
    PatientDocument
} from '../lib/documentService';

interface DocumentListProps {
    patientId?: string;
    onDocumentDeleted?: () => void;
    showDelete?: boolean;
    refreshTrigger?: number;
    temporaryFiles?: any[]; // Add temporary files from upload
}

export default function DocumentList({
    patientId,
    onDocumentDeleted,
    showDelete = true,
    refreshTrigger = 0,
    temporaryFiles = []
}: DocumentListProps) {
    const [documents, setDocuments] = useState<PatientDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadDocuments();
    }, [patientId, refreshTrigger]);

    useEffect(() => {
        // Update documents when temporary files change
        if (temporaryFiles.length > 0) {
            const tempDocs = temporaryFiles.map(file => ({
                id: file.id,
                patient_id: patientId || 'temp',
                uhid: '',
                document_name: file.document_name,
                document_type: file.mime_type,
                file_path: '',
                file_size: file.file_size,
                mime_type: file.mime_type,
                uploaded_by: '',
                upload_date: file.upload_date,
                category: file.category,
                notes: file.notes,
                created_at: file.upload_date,
                updated_at: file.upload_date,
                temp_file: file.temp_file
            }));
            setDocuments(prev => [...tempDocs, ...prev.filter(d => !d.id.startsWith('temp-'))]);
        }
    }, [temporaryFiles, patientId]);

    const loadDocuments = async () => {
        if (!patientId) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);
        try {
            const docs = await getPatientDocuments(patientId);
            setDocuments(prev => {
                // Keep temporary files and add database files
                const tempFiles = prev.filter(d => d.id.startsWith('temp-'));
                return [...tempFiles, ...docs];
            });
        } catch (err: any) {
            setError(err.message || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (doc: PatientDocument) => {
        try {
            if (doc.temp_file) {
                // Handle temporary file download
                const url = URL.createObjectURL(doc.temp_file);
                const a = document.createElement('a');
                a.href = url;
                a.download = doc.document_name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // Handle database file download
                await downloadDocument(doc.file_path, doc.document_name);
            }
        } catch (err: any) {
            alert('Failed to download document: ' + err.message);
        }
    };

    const handleDelete = async (doc: PatientDocument) => {
        if (!confirm(`Are you sure you want to delete "${doc.document_name}"?`)) {
            return;
        }

        setDeletingId(doc.id);
        try {
            if (doc.temp_file) {
                // Handle temporary file deletion (just remove from state)
                setDocuments(prev => prev.filter(d => d.id !== doc.id));
                if (onDocumentDeleted) {
                    onDocumentDeleted();
                }
            } else {
                // Handle database file deletion
                const result = await deleteDocument(doc.id, doc.file_path);
                if (result.success) {
                    setDocuments(prev => prev.filter(d => d.id !== doc.id));
                    if (onDocumentDeleted) {
                        onDocumentDeleted();
                    }
                } else {
                    alert('Failed to delete document: ' + result.error);
                }
            }
        } catch (err: any) {
            alert('Failed to delete document: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const formatFileSize = (bytes?: number): string => {
        if (!bytes || bytes === 0) return 'Unknown size';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCategoryBadgeColor = (category?: string): string => {
        switch (category) {
            case 'medical-report':
                return 'bg-blue-100 text-blue-700';
            case 'lab-result':
                return 'bg-purple-100 text-purple-700';
            case 'prescription':
                return 'bg-green-100 text-green-700';
            case 'insurance':
                return 'bg-orange-100 text-orange-700';
            case 'id-proof':
                return 'bg-pink-100 text-pink-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getFileIcon = (mimeType?: string): React.ReactNode => {
        if (mimeType?.includes('pdf')) {
            return <FileText className="h-5 w-5 text-red-500" />;
        } else if (mimeType?.includes('image')) {
            return <File className="h-5 w-5 text-green-500" />;
        } else {
            return <File className="h-5 w-5 text-blue-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-12">
                <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No documents uploaded yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload documents to see them here</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
                Uploaded Documents ({documents.length})
            </h3>

            <div className="grid grid-cols-1 gap-3">
                {documents.map((doc) => (
                    <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* File Icon */}
                            <div className="flex-shrink-0">
                                {getFileIcon(doc.mime_type)}
                            </div>

                            {/* Document Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {doc.document_name}
                                    </p>
                                    {doc.category && (
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getCategoryBadgeColor(doc.category)}`}>
                                            {doc.category}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(doc.upload_date)}
                                    </span>
                                    <span>{formatFileSize(doc.file_size)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-4">
                            <button
                                onClick={() => handleDownload(doc)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                title="Download"
                            >
                                <Download className="h-5 w-5" />
                            </button>

                            {showDelete && (
                                <button
                                    onClick={() => handleDelete(doc)}
                                    disabled={deletingId === doc.id}
                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                                    title="Delete"
                                >
                                    {deletingId === doc.id ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-5 w-5" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
