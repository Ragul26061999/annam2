'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, X, Package, Clock, Database } from 'lucide-react';

interface UploadStats {
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
}

interface MedicationPreview {
  name: string;
  generic_name: string;
  manufacturer: string;
  dosage_form: string;
  category: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  data: any;
}

const UploadMedicationsPage = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    totalRows: 0,
    processedRows: 0,
    successCount: 0,
    errorCount: 0,
    duplicateCount: 0
  });
  const [preview, setPreview] = useState<MedicationPreview[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Derive category from medication name or generic name
  const deriveCategory = (name: string, genericName: string): string => {
    const lowerName = name.toLowerCase();
    const lowerGeneric = genericName ? genericName.toLowerCase() : '';
    
    // Antibiotics
    if (lowerName.includes('antibiotic') || lowerGeneric.includes('amox') || 
        lowerGeneric.includes('azith') || lowerGeneric.includes('cef') ||
        lowerGeneric.includes('augmentin') || lowerGeneric.includes('levoflox') ||
        lowerName.includes('azith') || lowerName.includes('cef') ||
        lowerName.includes('augmentin') || lowerName.includes('levoflox')) {
      return 'Antibiotics';
    }
    
    // Cardiovascular
    if (lowerName.includes('amlodipine') || lowerName.includes('atenolol') ||
        lowerName.includes('metoprolol') || lowerName.includes('losartan') ||
        lowerGeneric.includes('amlodipine') || lowerGeneric.includes('atenolol')) {
      return 'Cardiovascular';
    }
    
    // Pain & Anti-inflammatory
    if (lowerName.includes('paracetamol') || lowerName.includes('ibuprofen') ||
        lowerName.includes('diclofenac') || lowerName.includes('ketorol') ||
        lowerGeneric.includes('paracetamol') || lowerGeneric.includes('ibuprofen')) {
      return 'Pain Management';
    }
    
    // Vitamins & Supplements
    if (lowerName.includes('vitamin') || lowerName.includes('multivitamin') ||
        lowerName.includes('zinc') || lowerName.includes('calcium') ||
        lowerGeneric.includes('vitamin') || lowerGeneric.includes('multivitamin')) {
      return 'Vitamins & Supplements';
    }
    
    // Gastrointestinal
    if (lowerName.includes('pantoprazole') || lowerName.includes('omeprazole') ||
        lowerName.includes('ranitidine') || lowerGeneric.includes('pantoprazole')) {
      return 'Gastrointestinal';
    }
    
    // Respiratory
    if (lowerName.includes('salbutamol') || lowerName.includes('montelukast') ||
        lowerGeneric.includes('salbutamol') || lowerGeneric.includes('montelukast')) {
      return 'Respiratory';
    }
    
    // Diabetes
    if (lowerName.includes('metformin') || lowerName.includes('glimepiride') ||
        lowerGeneric.includes('metformin') || lowerGeneric.includes('glimepiride')) {
      return 'Diabetes';
    }
    
    // Neurology
    if (lowerName.includes('levetiracetam') || lowerName.includes('phenytoin') ||
        lowerGeneric.includes('levetiracetam') || lowerGeneric.includes('phenytoin')) {
      return 'Neurology';
    }
    
    // Default category
    return 'General Medicine';
  };

  // Parse CSV file with proper quote handling
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1).map((line, index) => {
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Push the last value
      values.push(currentValue.trim());
      
      const obj: any = { row: index + 2 };
      
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      
      return obj;
    });
  };

  // Validate medication data
  const validateMedication = (med: any): ValidationError | null => {
    if (!med.Medicine || med.Medicine.trim() === '') {
      return {
        row: med.row,
        field: 'Medicine',
        message: 'Medicine name is required',
        data: med
      };
    }
    
    // Generic name (Combination) is now optional
    // if (!med.Combination || med.Combination.trim() === '') {
    //   return {
    //     row: med.row,
    //     field: 'Combination',
    //     message: 'Generic name is required',
    //     data: med
    //   };
    // }
    
    // Brand is now optional
    // if (!med.Brand || med.Brand.trim() === '') {
    //   return {
    //     row: med.row,
    //     field: 'Brand',
    //     message: 'Brand is required',
    //     data: med
    //   };
    // }
    
    // Product (Dosage form) is now optional
    // if (!med.Product || med.Product.trim() === '') {
    //   return {
    //     row: med.row,
    //     field: 'Product',
    //     message: 'Dosage form is required',
    //     data: med
    //   };
    // }
    
    return null;
  };

  // Check for duplicates in preview data
  const checkDuplicates = (medications: MedicationPreview[]): MedicationPreview[] => {
    const seen = new Map<string, number>();
    
    return medications.map(med => {
      const key = `${med.name.toLowerCase().trim()}-${med.manufacturer.toLowerCase().trim()}-${med.dosage_form.toLowerCase().trim()}`;
      
      if (seen.has(key)) {
        return {
          ...med,
          isDuplicate: true,
          duplicateReason: `Duplicate of row ${seen.get(key)}`
        };
      } else {
        seen.set(key, parseInt(med.name.split(' ')[0]) || 1); // Store row number
        return {
          ...med,
          isDuplicate: false
        };
      }
    });
  };

  // Preview medications from CSV
  const handlePreview = useCallback(() => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        
        const medications: MedicationPreview[] = [];
        const validationErrors: ValidationError[] = [];
        
        data.forEach(med => {
          const error = validateMedication(med);
          if (error) {
            validationErrors.push(error);
          } else {
            medications.push({
              name: med.Medicine,
              generic_name: med.Combination || 'Not specified',
              manufacturer: med.Brand || 'Not specified',
              dosage_form: med.Product || 'Not specified',
              category: deriveCategory(med.Medicine, med.Combination || '')
            });
          }
        });
        
        // Check for duplicates
        const medicationsWithDuplicates = checkDuplicates(medications);
        
        // Count duplicates
        const duplicateCount = medicationsWithDuplicates.filter(med => med.isDuplicate).length;
        const uniqueCount = medicationsWithDuplicates.length - duplicateCount;
        
        setPreview(medicationsWithDuplicates.slice(0, 10)); // Show first 10 for preview
        setErrors(validationErrors);
        setUploadStats({
          totalRows: data.length,
          processedRows: data.length,
          successCount: uniqueCount,
          errorCount: validationErrors.length,
          duplicateCount: duplicateCount
        });
        setShowPreview(true);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }, [file]);

  // Upload medications to database
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-medications', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      
      // Update final stats
      setUploadStats({
        totalRows: result.totalRows,
        processedRows: result.totalRows,
        successCount: result.successCount,
        errorCount: result.errorCount,
        duplicateCount: result.duplicateCount
      });
      
      // Show completion message
      if (result.successCount > 0) {
        alert(`Successfully uploaded ${result.successCount} medications!${result.errorCount > 0 ? ` ${result.errorCount} failed.` : ''}${result.duplicateCount > 0 ? ` ${result.duplicateCount} duplicates skipped.` : ''}`);
      } else {
        alert('Upload failed. Please check the file format and try again.');
      }
      
      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        console.log('Upload errors:', result.errors);
        setErrors(result.errors.map((err: any) => ({
          row: err.row,
          field: err.field || 'General',
          message: err.message || err.error,
          data: err.medData || {}
        })));
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      setShowPreview(false);
      setErrors([]);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  // Drag and drop handlers
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
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      setShowPreview(false);
      setErrors([]);
    } else {
      alert('Please drop a valid CSV file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload Medications</h1>
              <p className="text-gray-600 mt-1">Import medications from CSV file to database</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-blue-600" />
                Select CSV File
              </h2>
              
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">
                  {file ? file.name : 'Drag and drop your CSV file here, or click to browse'}
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  Choose File
                </label>
              </div>
              
              {file && (
                <div className="mt-4 flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm text-green-800">{file.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setShowPreview(false);
                      setErrors([]);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Real-time Stats */}
            {(uploading || uploadStats.totalRows > 0) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Database className="w-5 h-5 mr-2 text-purple-600" />
                  Upload Statistics
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{uploadStats.totalRows}</div>
                    <div className="text-sm text-blue-800">Total Rows</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{uploadStats.successCount}</div>
                    <div className="text-sm text-green-800">Success</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{uploadStats.errorCount}</div>
                    <div className="text-sm text-red-800">Errors</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{uploadStats.duplicateCount}</div>
                    <div className="text-sm text-yellow-800">Duplicates</div>
                  </div>
                </div>
                
                {uploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Processing...</span>
                      <span className="text-sm text-gray-600">
                        {uploadStats.processedRows} / {uploadStats.totalRows}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadStats.processedRows / uploadStats.totalRows) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Section */}
            {showPreview && preview.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-green-600" />
                  Preview (First 10 medications)
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Medicine Name</th>
                        <th className="text-left py-2">Generic Name</th>
                        <th className="text-left py-2">Manufacturer</th>
                        <th className="text-left py-2">Dosage Form</th>
                        <th className="text-left py-2">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((med, index) => (
                        <tr key={index} className={`border-b ${med.isDuplicate ? 'bg-yellow-50' : ''}`}>
                          <td className="py-2">
                            {med.isDuplicate ? (
                              <div className="flex items-center">
                                <AlertCircle className="w-4 h-4 text-yellow-600 mr-1" />
                                <span className="text-xs text-yellow-800">Duplicate</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                                <span className="text-xs text-green-800">New</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2">
                            <div>
                              <div className={med.isDuplicate ? 'text-gray-500' : ''}>
                                {med.name}
                              </div>
                              {med.isDuplicate && (
                                <div className="text-xs text-yellow-600">
                                  {med.duplicateReason}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2">{med.generic_name}</td>
                          <td className="py-2">{med.manufacturer}</td>
                          <td className="py-2">{med.dosage_form}</td>
                          <td className="py-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {med.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {preview.length < uploadStats.successCount && (
                  <p className="text-sm text-gray-600 mt-4">
                    ... and {uploadStats.successCount - preview.length} more medications
                  </p>
                )}
              </div>
            )}

            {/* Errors Section */}
            {errors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center text-red-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Validation Errors ({errors.length})
                </h2>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {errors.map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg text-sm">
                      <div className="font-medium text-red-800">
                        Row {error.row}: {error.field}
                      </div>
                      <div className="text-red-600">{error.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={handlePreview}
                  disabled={!file || uploading}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Preview Data
                </button>
                
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading || errors.length > 0}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload to Database'}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-purple-600" />
                CSV Format
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Required columns:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Medicine (Drug name)</li>
                </ul>
                
                <p><strong>Optional columns:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Combination (Generic name)</li>
                  <li>Brand (Manufacturer)</li>
                  <li>Product (Dosage form)</li>
                </ul>
                
                <p className="mt-3"><strong>Note:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Category will be auto-derived</li>
                  <li>Duplicates will be skipped</li>
                  <li>First 10 rows shown in preview</li>
                  <li>Empty generic names will be marked as "Not specified"</li>
                  <li>Empty brands will be marked as "Not specified"</li>
                  <li>Empty dosage forms will be marked as "Not specified"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadMedicationsPage;
