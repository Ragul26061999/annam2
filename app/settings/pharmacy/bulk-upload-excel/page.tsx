'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Package,
  Database,
  SkipForward,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RowResult {
  row: number;
  sheet: string;
  medicineName: string;
  batchNumber: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
}

interface PreviewMedication {
  name: string;
  combination?: string;
  brand?: string;
  product?: string;
  category: string;
  batches: PreviewBatch[];
  status: 'new' | 'existing';
  existingMedicationId?: string;
}

interface PreviewBatch {
  batchNumber: string;
  expiryDate: string | null;
  quantity: number;
  purchaseRate: number;
  mrp: number;
  status: 'new' | 'existing' | 'duplicate';
  existingBatchId?: string;
  expiryStatus: 'valid' | 'expired' | 'expiring-soon';
}

interface PreviewResult {
  sheets: {
    name: string;
    rowCount: number;
    validRows: number;
    invalidRows: number;
  }[];
  medications: {
    total: number;
    new: number;
    existing: number;
  };
  batches: {
    total: number;
    new: number;
    existing: number;
    duplicate: number;
    expired: number;
    expiringSoon: number;
  };
  previewData: PreviewMedication[];
  errors: {
    row: number;
    sheet: string;
    message: string;
  }[];
}

interface UploadResponse {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  results: RowResult[];
  allResults: RowResult[];
  error?: string;
}

const BulkUploadExcelPage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [response, setResponse] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error' | 'skipped'>('all');
  
  // Preview states
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'existing'>('all');
  const [expandedMedications, setExpandedMedications] = useState<Set<string>>(new Set());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.name.endsWith('.xlsx') ||
        selectedFile.name.endsWith('.xls') ||
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'application/vnd.ms-excel'
      ) {
        setFile(selectedFile);
        setUploadComplete(false);
        setResponse(null);
        setError(null);
        setShowPreview(false);
        setPreviewData(null);
        setExpandedMedications(new Set());
      } else {
        alert('Please select a valid Excel file (.xlsx or .xls)');
      }
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

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setUploadComplete(false);
      setResponse(null);
      setError(null);
      setShowPreview(false);
      setPreviewData(null);
    } else {
      alert('Please drop a valid Excel file (.xlsx or .xls)');
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setPreviewing(true);
    setError(null);
    setShowPreview(false);
    setPreviewData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/pharmacy/bulk-upload-excel/preview', {
        method: 'POST',
        body: formData,
      });

      const data: PreviewResult = await res.json();

      if (!res.ok) {
        throw new Error((data as any).error || 'Preview failed');
      }

      setPreviewData(data);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Preview failed. Please try again.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadComplete(false);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/pharmacy/bulk-upload-excel', {
        method: 'POST',
        body: formData,
      });

      const data: UploadResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResponse(data);
      setUploadComplete(true);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadComplete(false);
    setResponse(null);
    setError(null);
    setShowAllResults(false);
    setFilterStatus('all');
    setShowPreview(false);
    setPreviewData(null);
    setExpandedMedications(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredResults = response?.allResults?.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  }) || [];

  const displayResults = showAllResults ? filteredResults : filteredResults.slice(0, 20);

  // Helper functions for preview
  const toggleMedicationExpansion = (medName: string) => {
    setExpandedMedications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(medName)) {
        newSet.delete(medName);
      } else {
        newSet.add(medName);
      }
      return newSet;
    });
  };

  const getFilteredPreviewData = () => {
    if (!previewData) return [];
    if (previewFilter === 'all') return previewData.previewData;
    return previewData.previewData.filter(med => med.status === previewFilter);
  };

  const getExpiryStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return 'text-red-600 bg-red-50';
      case 'expiring-soon': return 'text-orange-600 bg-orange-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'existing': return 'text-blue-600 bg-blue-50';
      case 'duplicate': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/settings/pharmacy')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Pharmacy Settings</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl shadow-lg">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bulk Upload from Excel</h1>
              <p className="text-gray-600">
                Upload Drug Stock Excel file to import medications and batches
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Select Excel File
              </h2>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2 text-lg">
                  {file ? file.name : 'Drag and drop your Excel file here'}
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Supports .xlsx and .xls files (Drug Stock format)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors font-medium"
                >
                  Choose File
                </label>
              </div>

              {file && (
                <div className="mt-4 flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                    <div>
                      <span className="text-sm font-medium text-indigo-900">{file.name}</span>
                      <span className="text-xs text-indigo-600 ml-2">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-900">Upload Failed</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Overview */}
            {showPreview && previewData && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    Preview Overview
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewFilter('all')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        previewFilter === 'all'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All ({previewData.medications.total})
                    </button>
                    <button
                      onClick={() => setPreviewFilter('new')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        previewFilter === 'new'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      New ({previewData.medications.new})
                    </button>
                    <button
                      onClick={() => setPreviewFilter('existing')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        previewFilter === 'existing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Existing ({previewData.medications.existing})
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-2xl font-bold text-blue-700">{previewData.medications.total}</div>
                    <div className="text-sm text-blue-600">Total Medications</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="text-2xl font-bold text-green-700">{previewData.batches.total}</div>
                    <div className="text-sm text-green-600">Total Batches</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-100">
                    <div className="text-2xl font-bold text-yellow-700">{previewData.batches.expired + previewData.batches.expiringSoon}</div>
                    <div className="text-sm text-yellow-600">Expiring Batches</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <div className="text-2xl font-bold text-purple-700">{previewData.batches.new}</div>
                    <div className="text-sm text-purple-600">New Batches</div>
                  </div>
                </div>

                {/* Sheet Information */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-3">Excel Sheets Processed</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {previewData.sheets.map((sheet, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div>
                          <div className="font-medium text-gray-900">{sheet.name}</div>
                          <div className="text-sm text-gray-600">{sheet.validRows} valid rows</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700">{sheet.rowCount} total</div>
                          {sheet.invalidRows > 0 && (
                            <div className="text-xs text-red-600">{sheet.invalidRows} invalid</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medications List */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Medications ({getFilteredPreviewData().length})</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {getFilteredPreviewData().map((med, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div 
                          className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => toggleMedicationExpansion(med.name)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                med.status === 'new' ? 'bg-green-500' : 'bg-blue-500'
                              }`} />
                              <div>
                                <div className="font-medium text-gray-900">{med.name}</div>
                                <div className="text-sm text-gray-600">
                                  {med.brand && `${med.brand} • `}
                                  {med.category}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">{med.batches.length} batches</div>
                                <div className="text-xs text-gray-600">
                                  {med.batches.filter(b => b.status === 'new').length} new
                                </div>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                                expandedMedications.has(med.name) ? 'rotate-180' : ''
                              }`} />
                            </div>
                          </div>
                        </div>

                        {expandedMedications.has(med.name) && (
                          <div className="border-t border-gray-200 p-4 bg-white">
                            <div className="space-y-2">
                              {med.batches.map((batch, batchIdx) => (
                                <div key={batchIdx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${
                                      batch.status === 'new' ? 'bg-green-500' :
                                      batch.status === 'existing' ? 'bg-blue-500' : 'bg-yellow-500'
                                    }`} />
                                    <div>
                                      <div className="font-mono text-sm font-medium text-gray-900">{batch.batchNumber}</div>
                                      <div className="text-xs text-gray-600">
                                        Qty: {batch.quantity} • MRP: ₹{batch.mrp}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {batch.expiryDate && (
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExpiryStatusColor(batch.expiryStatus)}`}>
                                        {batch.expiryStatus === 'expired' ? 'Expired' :
                                         batch.expiryStatus === 'expiring-soon' ? 'Expiring Soon' : 'Valid'}
                                      </span>
                                    )}
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBatchStatusColor(batch.status)}`}>
                                      {batch.status === 'new' ? 'New' :
                                       batch.status === 'existing' ? 'Existing' : 'Duplicate'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Preview Progress */}
            {previewing && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Excel File...</h3>
                  <p className="text-gray-600 text-center">
                    Reading all sheets, checking existing medications and batches.
                    <br />
                    This will show you a preview before uploading.
                  </p>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Uploading to Database...</h3>
                  <p className="text-gray-600 text-center">
                    Creating medications and inserting batches one by one.
                    <br />
                    This may take a few minutes for large files.
                  </p>
                </div>
              </div>
            )}

            {/* Results Summary */}
            {uploadComplete && response && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    Upload Results
                  </h2>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <div className="text-3xl font-bold text-gray-800">
                        {response.totalProcessed}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Total Rows</div>
                    </div>
                    <button
                      onClick={() => setFilterStatus('success')}
                      className={`text-center p-4 rounded-xl transition-all ${
                        filterStatus === 'success'
                          ? 'bg-green-200 ring-2 ring-green-400'
                          : 'bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      <div className="text-3xl font-bold text-green-600">
                        {response.successCount}
                      </div>
                      <div className="text-sm text-green-800 mt-1">Success</div>
                    </button>
                    <button
                      onClick={() => setFilterStatus('error')}
                      className={`text-center p-4 rounded-xl transition-all ${
                        filterStatus === 'error'
                          ? 'bg-red-200 ring-2 ring-red-400'
                          : 'bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      <div className="text-3xl font-bold text-red-600">
                        {response.errorCount}
                      </div>
                      <div className="text-sm text-red-800 mt-1">Errors</div>
                    </button>
                    <button
                      onClick={() => setFilterStatus('skipped')}
                      className={`text-center p-4 rounded-xl transition-all ${
                        filterStatus === 'skipped'
                          ? 'bg-yellow-200 ring-2 ring-yellow-400'
                          : 'bg-yellow-50 hover:bg-yellow-100'
                      }`}
                    >
                      <div className="text-3xl font-bold text-yellow-600">
                        {response.skippedCount}
                      </div>
                      <div className="text-sm text-yellow-800 mt-1">Skipped</div>
                    </button>
                  </div>

                  {filterStatus !== 'all' && (
                    <button
                      onClick={() => setFilterStatus('all')}
                      className="mb-4 text-sm text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Show all results
                    </button>
                  )}

                  {/* Results Table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Status</th>
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Sheet</th>
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Row</th>
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Medicine</th>
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Batch</th>
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayResults.map((result, idx) => (
                          <tr
                            key={idx}
                            className={`border-b border-gray-100 ${
                              result.status === 'error'
                                ? 'bg-red-50'
                                : result.status === 'skipped'
                                ? 'bg-yellow-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="py-2.5 px-4">
                              {result.status === 'success' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3" /> Success
                                </span>
                              )}
                              {result.status === 'error' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3" /> Error
                                </span>
                              )}
                              {result.status === 'skipped' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <SkipForward className="w-3 h-3" /> Skipped
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-gray-600">{result.sheet}</td>
                            <td className="py-2.5 px-4 text-gray-600">{result.row}</td>
                            <td className="py-2.5 px-4 font-medium text-gray-900 max-w-[200px] truncate">
                              {result.medicineName}
                            </td>
                            <td className="py-2.5 px-4 text-gray-600 font-mono text-xs">
                              {result.batchNumber}
                            </td>
                            <td className="py-2.5 px-4 text-gray-600 text-xs max-w-[250px] truncate">
                              {result.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredResults.length > 20 && (
                    <button
                      onClick={() => setShowAllResults(!showAllResults)}
                      className="mt-4 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {showAllResults ? (
                        <>
                          <ChevronUp className="w-4 h-4" /> Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" /> Show all {filteredResults.length} results
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>
              <div className="space-y-3">
                {!showPreview ? (
                  <>
                    <button
                      onClick={handlePreview}
                      disabled={!file || previewing}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2"
                    >
                      {previewing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4" />
                          Preview & Review
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Choose Different File
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Confirm Upload
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setShowPreview(false);
                        setPreviewData(null);
                        setExpandedMedications(new Set());
                      }}
                      className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Back to Preview
                    </button>

                    <button
                      onClick={handleReset}
                      className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Upload Different File
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                How It Works
              </h3>
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Select Excel File</p>
                    <p>Choose your Drug Stock .xlsx file with medication and batch data</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Preview & Review</p>
                    <p>Analyze the file to see medication counts, batch details, and expiry status</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Review Details</p>
                    <p>Expand medications to view batches, check expiry dates, and verify data</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Confirm Upload</p>
                    <p>After review, confirm to process all medications and batches to database</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expected Format */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Expected Format
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <p className="font-medium text-gray-900 mb-1">Required Columns:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Medicine</span> - Drug name</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Optional Columns:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Batch No</span></li>
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Purchase Rate</span></li>
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Mrp</span></li>
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Expiry Dt</span></li>
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Qty</span></li>
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Pack</span></li>
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Combination</span></li>
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Brand</span></li>
                    <li><span className="font-mono text-xs bg-gray-100 px-1 rounded">Product</span></li>
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mt-3">
                  <p className="text-amber-800 text-xs">
                    <strong>Note:</strong> Duplicate batches (same medication + batch number) will be skipped.
                    Medications without batch numbers will still be created.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadExcelPage;
