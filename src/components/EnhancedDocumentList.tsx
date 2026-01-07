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
    FolderOpen,
    Eye,
    Clock,
    Tag,
    StickyNote,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import {
    getPatientDocuments,
    downloadDocument,
    deleteDocument,
    PatientDocument
} from '../lib/documentService';

interface EnhancedDocumentListProps {
    patientId?: string;
    uhid?: string;
    onDocumentDeleted?: () => void;
    showDelete?: boolean;
    refreshTrigger?: number;
    temporaryFiles?: any[];
}

export default function EnhancedDocumentList({
    patientId,
    uhid,
    onDocumentDeleted,
    showDelete = true,
    refreshTrigger = 0,
    temporaryFiles = []
}: EnhancedDocumentListProps) {
    const [documents, setDocuments] = useState<PatientDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

    useEffect(() => {
        loadDocuments();
    }, [patientId, refreshTrigger]);

    useEffect(() => {
        // Update documents when temporary files change
        if (temporaryFiles.length > 0) {
            const tempDocs = temporaryFiles.map(file => ({
                id: file.id,
                patient_id: patientId || 'temp',
                uhid: uhid || '',
                document_name: file.document_name,
                document_type: file.mime_type,
                file_path: '',
                file_size: file.file_size,
                mime_type: file.mime_type,
                uploaded_by: file.uploaded_by || 'Current User',
                upload_date: file.upload_date || new Date().toISOString(),
                category: file.category || 'general',
                notes: file.notes || '',
                created_at: file.upload_date || new Date().toISOString(),
                updated_at: file.upload_date || new Date().toISOString(),
                temp_file: file.temp_file
            }));
            setDocuments(prev => [...tempDocs, ...prev.filter(d => !d.id.startsWith('temp-'))]);
        }
    }, [temporaryFiles, patientId, uhid]);

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
        // Convert UTC to Indian time (UTC+5:30)
        const date = new Date(dateStr);
        const indianTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        
        return indianTime.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatTime = (dateStr: string): string => {
        // Convert UTC to Indian time (UTC+5:30)
        const date = new Date(dateStr);
        const indianTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        
        return indianTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatDateOnly = (dateStr: string): string => {
        // Convert UTC to Indian time (UTC+5:30)
        const date = new Date(dateStr);
        const indianTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        
        return indianTime.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
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
            case 'imaging':
                return 'bg-indigo-100 text-indigo-700';
            case 'consent-form':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getFileIcon = (mimeType?: string): React.ReactNode => {
        if (mimeType?.includes('pdf')) {
            return <FileText className="h-5 w-5 text-red-500" />;
        } else if (mimeType?.includes('image')) {
            return <File className="h-5 w-5 text-green-500" />;
        } else if (mimeType?.includes('word') || mimeType?.includes('document')) {
            return <FileText className="h-5 w-5 text-blue-500" />;
        } else {
            return <File className="h-5 w-5 text-gray-500" />;
        }
    };

    const toggleExpanded = (docId: string) => {
        setExpandedDoc(expandedDoc === docId ? null : docId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="ml-2 text-gray-600">Loading documents...</span>
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
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No documents uploaded yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload documents to see them here</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                    Patient Documents ({documents.length})
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FileText className="h-4 w-4" />
                    <span>Click on document to view details</span>
                </div>
            </div>

            <div className="space-y-3">
                {documents.map((doc) => (
                    <div
                        key={doc.id}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                    >
                        {/* Main Document Row */}
                        <div className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* File Icon */}
                                    <div className="flex-shrink-0">
                                        {getFileIcon(doc.mime_type)}
                                    </div>

                                    {/* Document Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {doc.document_name}
                                            </p>
                                            {doc.category && (
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getCategoryBadgeColor(doc.category)}`}>
                                                    <Tag className="h-3 w-3 mr-1" />
                                                    {doc.category.replace('-', ' ')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-6 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(doc.upload_date)}
                                            </span>
                                            <span className="flex items-center gap-1 font-medium text-blue-600">
                                                <User className="h-3 w-3" />
                                                {doc.uploaded_by || 'Unknown'}
                                            </span>
                                            <span>{formatFileSize(doc.file_size)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => toggleExpanded(doc.id)}
                                        className="p-2 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
                                        title="View Details"
                                    >
                                        {expandedDoc === doc.id ? (
                                            <ChevronUp className="h-5 w-5" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5" />
                                        )}
                                    </button>
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
                        </div>

                        {/* Expanded Details */}
                        {expandedDoc === doc.id && (
                            <div className="border-t border-gray-100 bg-gray-50 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">File Type:</span>
                                            <span className="text-sm text-gray-900">{doc.mime_type || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">File Size:</span>
                                            <span className="text-sm text-gray-900">{formatFileSize(doc.file_size)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Category:</span>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getCategoryBadgeColor(doc.category)}`}>
                                                {doc.category || 'general'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Uploaded By:</span>
                                            <span className="text-sm text-gray-900 font-medium text-blue-600">{doc.uploaded_by || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Upload Date:</span>
                                            <span className="text-sm text-gray-900">{formatDateOnly(doc.upload_date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Upload Time:</span>
                                            <span className="text-sm text-gray-900 font-medium text-orange-600">{formatTime(doc.upload_date)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Notes Section */}
                                {doc.notes && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <StickyNote className="h-4 w-4 text-gray-500" />
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Notes:</span>
                                        </div>
                                        <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                                            {doc.notes}
                                        </p>
                                    </div>
                                )}

                                {/* Temporary File Indicator */}
                                {doc.temp_file && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-500" />
                                            <span className="text-xs font-semibold text-orange-600 uppercase">Temporary File</span>
                                        </div>
                                        <p className="text-xs text-orange-600 mt-1">
                                            This file is uploaded but not yet saved to the database. It will be permanently saved when you complete the registration.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
