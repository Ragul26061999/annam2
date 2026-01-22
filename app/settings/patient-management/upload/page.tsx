'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/src/lib/supabase';
import { uploadPatient } from './actions';

interface PatientData {
  [key: string]: any;
}

interface ColumnMapping {
  patient_id: string;
  name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  blood_group: string;
  email: string;
}

const REQUIRED_FIELDS = ['name'];

const PatientUploadPage = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PatientData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    patient_id: '',
    name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    blood_group: '',
    email: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState({ total: 0, success: 0, failed: 0, skipped: 0, errors: [] as string[] });
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Map, 3: Review/Process
  const [progress, setProgress] = useState(0);
  const [dbCount, setDbCount] = useState<number | null>(null);

  React.useEffect(() => {
    fetchDbCount();
  }, []);

  const fetchDbCount = async () => {
    try {
      const { count, error } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });
      if (!error) {
        setDbCount(count);
      }
    } catch (error) {
      console.error('Error fetching DB count:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcel(selectedFile);
    }
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (jsonData.length > 0) {
          // Normalize keys (trim whitespace)
          const normalizedData = jsonData.map((row: any) => {
            const newRow: any = {};
            Object.keys(row).forEach(key => {
              newRow[key.trim()] = row[key];
            });
            return newRow;
          });

          const cols = Object.keys(normalizedData[0] as object);
          setColumns(cols);
          setPreviewData(normalizedData as PatientData[]);
          
          // Auto-map columns
          const newMapping = { ...mapping };
          cols.forEach(col => {
            const lowerCol = col.toLowerCase();
            if (lowerCol.includes('name') || lowerCol.includes('patient')) newMapping.name = col;
            if (lowerCol.includes('phone') || lowerCol.includes('mobile')) newMapping.phone = col;
            if (lowerCol.includes('dob') || lowerCol.includes('birth')) newMapping.date_of_birth = col;
            if (lowerCol.includes('gender') || lowerCol.includes('sex')) newMapping.gender = col;
            if (lowerCol.includes('address') || lowerCol.includes('city')) newMapping.address = col;
            if (lowerCol.includes('blood')) newMapping.blood_group = col;
            if (lowerCol.includes('email')) newMapping.email = col;
            if (lowerCol.includes('id') || lowerCol.includes('uhid')) newMapping.patient_id = col;
          });
          setMapping(newMapping);
          setStep(2);
        }
      } catch (error) {
        console.error('Error parsing Excel:', error);
        alert('Error parsing Excel file. Please make sure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const normalizeGender = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim().toLowerCase();
    
    // Male variants
    if (['m', 'male', 'man', 'boy', 'mr', 'mr.'].includes(str)) return 'male';
    
    // Female variants
    if (['f', 'female', 'woman', 'girl', 'ms', 'ms.', 'mrs', 'mrs.'].includes(str)) return 'female';
    
    // Other variants
    if (['o', 'other', 'trans', 'transgender'].includes(str)) return 'other';
    
    // Default fallback if we have a value but it doesn't match standard patterns
    // We could return 'other' or null. Given constraint is strict, let's try 'other' if it looks like a word, otherwise null.
    // Actually, safe bet is to return null if we can't map it, but that might violate "not null" if there is one (schema says gender is nullable).
    // So null is safe.
    return null;
  };

  const processUpload = async () => {
    setUploading(true);
    setStep(3);
    setProgress(0);
    const stats = { total: previewData.length, success: 0, failed: 0, skipped: 0, errors: [] as string[] };
    let processed = 0;

    for (const row of previewData) {
      // Improved empty row detection based on mapped columns
      const hasMappedData = Object.values(mapping).some(colName => {
        if (!colName) return false;
        const val = row[colName];
        return val !== undefined && val !== null && val.toString().trim() !== '';
      });

      if (!hasMappedData) {
        stats.total--; // Adjust total since we're skipping empty row
        continue;
      }

      try {
        const pidRaw = mapping.patient_id ? row[mapping.patient_id] : null;
        const finalPatientId = (pidRaw && pidRaw.toString().trim()) 
          ? pidRaw.toString().trim() 
          : `UHID${Math.floor(Date.now() + Math.random() * 1000)}`;

        const patientData = {
          patient_id: finalPatientId,
          name: mapping.name && row[mapping.name] ? row[mapping.name].toString().trim() : null,
          phone: mapping.phone && row[mapping.phone] ? row[mapping.phone].toString().trim() : null,
          date_of_birth: mapping.date_of_birth ? formatDate(row[mapping.date_of_birth]) : null,
          gender: mapping.gender && row[mapping.gender] ? normalizeGender(row[mapping.gender]) : null,
          address: mapping.address && row[mapping.address] ? row[mapping.address].toString().trim() : null,
          blood_group: mapping.blood_group && row[mapping.blood_group] ? row[mapping.blood_group].toString().trim() : null,
          email: mapping.email && row[mapping.email] ? row[mapping.email].toString().trim() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active'
        };

        if (!patientData.name) {
          stats.skipped++;
          stats.errors.push(`Row ${processed + 1} SKIPPED: Missing Name. Data: ${JSON.stringify(row)}`);
          processed++;
          setProgress(Math.round((processed / previewData.length) * 100));
          setUploadStats({ ...stats });
          continue;
        }

        const result = await uploadPatient(patientData);

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }
        
        stats.success++;
        // Optimistic update of DB count
        setDbCount(prev => (prev || 0) + 1);
      } catch (error: any) {
        console.error('Error uploading row:', JSON.stringify(row), error);
        stats.failed++;
        const errorMsg = error.message || error.details || JSON.stringify(error);
        stats.errors.push(`Row ${processed + 1}: ${errorMsg || 'Unknown error'}`);
      }
      
      processed++;
      setProgress(Math.round((processed / previewData.length) * 100));
      setUploadStats({ ...stats });
    }
    setUploading(false);
    fetchDbCount(); // Final sync
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return null;
    // Handle Excel serial date
    if (typeof dateVal === 'number') {
      const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    // Handle string date
    const date = new Date(dateVal);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Upload Patient Data</h1>
          <p className="text-gray-600">Import patients from Excel file</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Steps Indicator */}
          <div className="flex items-center gap-4 mb-8 border-b pb-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-100' : 'bg-gray-100'}`}>1</div>
              Upload
            </div>
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-100' : 'bg-gray-100'}`}>2</div>
              Map Columns
            </div>
            <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-100' : 'bg-gray-100'}`}>3</div>
              Process
            </div>
          </div>

          {step === 1 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Excel File</h3>
              <p className="text-gray-500 mb-6">Supported formats: .xlsx, .xls</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="w-5 h-5 mr-2" />
                Select File
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Map Columns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(mapping).map((field) => (
                    <div key={field} className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700 capitalize">
                        {field.replace(/_/g, ' ')} {field === 'name' && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={mapping[field as keyof ColumnMapping]}
                        onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      >
                        <option value="">-- Select Column --</option>
                        {columns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Preview (First 3 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(mapping).map((field) => (
                          <th key={field} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.slice(0, 3).map((row, idx) => (
                        <tr key={idx}>
                          {Object.keys(mapping).map((field) => {
                            const colName = mapping[field as keyof ColumnMapping];
                            return (
                              <td key={field} className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {colName ? row[colName] : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processUpload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Start Import
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-12">
              <div className="max-w-xl mx-auto mb-8">
                {/* Real-time Progress Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 text-left">Upload Progress</h3>
                      <p className="text-sm text-gray-500 text-left">Processing records...</p>
                    </div>
                    <div className="text-3xl font-black text-blue-600">{progress}%</div>
                  </div>
                  
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-6 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase">Total</div>
                      <div className="text-xl font-bold text-gray-900">{uploadStats.total}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-green-600 uppercase">Success</div>
                      <div className="text-xl font-bold text-green-600">{uploadStats.success}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-red-600 uppercase">Failed</div>
                      <div className="text-xl font-bold text-red-600">{uploadStats.failed}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-orange-600 uppercase">Skipped</div>
                      <div className="text-xl font-bold text-orange-600">{uploadStats.skipped}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-purple-600 uppercase">DB Count</div>
                      <div className="text-xl font-bold text-purple-600">{dbCount !== null ? dbCount : '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {uploading ? (
                <div>
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Data...</h3>
                  <p className="text-gray-500">
                    Please wait while we process your file.
                  </p>
                </div>
              ) : (
                <div>
                  {uploadStats.failed === 0 ? (
                    <div className="text-green-600 mb-4">
                      <Check className="w-16 h-16 mx-auto mb-2" />
                      <h3 className="text-xl font-bold">Import Complete!</h3>
                    </div>
                  ) : (
                    <div className="text-orange-600 mb-4">
                      <AlertCircle className="w-16 h-16 mx-auto mb-2" />
                      <h3 className="text-xl font-bold">Import Completed with Errors</h3>
                    </div>
                  )}
                  
                  {uploadStats.errors.length > 0 && (
                    <div className="text-left bg-red-50 p-4 rounded-lg mb-6 max-h-60 overflow-y-auto max-w-xl mx-auto border border-red-100">
                      <h4 className="font-bold text-red-800 mb-2 sticky top-0 bg-red-50 pb-2 border-b border-red-100">Error Log ({uploadStats.errors.length} errors):</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                        {uploadStats.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setStep(1);
                      setFile(null);
                      setPreviewData([]);
                      setProgress(0);
                    }}
                    className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
                  >
                    Upload Another File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientUploadPage;
