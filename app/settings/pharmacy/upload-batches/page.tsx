'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, X, Package, Database, Search } from 'lucide-react';
import { supabase } from '../../../../src/lib/supabase';

interface BatchPreview {
  row: number;
  medicationName: string;
  medicationId: string | null;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchaseRate: number;
  mrp: number;
  packSize: number;
  status: 'ready' | 'error';
  message?: string;
}

interface UploadStats {
  totalRows: number;
  uniqueMedications: number;
  multiBatchMedications: number;
  foundMedications: number;
  missingMedications: number;
  existingBatches: number;
}

interface MedicationRef {
  id: string;
  name: string;
  batches?: { batch_number: string }[];
}

const UploadBatchesPage = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<UploadStats>({
    totalRows: 0,
    uniqueMedications: 0,
    multiBatchMedications: 0,
    foundMedications: 0,
    missingMedications: 0,
    existingBatches: 0
  });
  const [preview, setPreview] = useState<BatchPreview[]>([]);
  const [allPreviewData, setAllPreviewData] = useState<BatchPreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [medications, setMedications] = useState<MedicationRef[]>([]);
  const [loadingMeds, setLoadingMeds] = useState(true);

  const normalizeMedicationName = (value: string) => {
    return (value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[()]/g, '')
      .trim();
  };

  // Fetch all medications for linking
  useEffect(() => {
    const fetchMedications = async () => {
      try {
        const { data, error } = await supabase
          .from('medications')
          .select('id, name, batches:medicine_batches(batch_number)');
        
        if (error) throw error;
        setMedications(data || []);
      } catch (error) {
        console.error('Error fetching medications:', error);
        alert('Failed to load medications list. Please refresh the page.');
      } finally {
        setLoadingMeds(false);
      }
    };

    fetchMedications();
  }, []);

  // Parse Date from MMM-YY to YYYY-MM-DD
  const parseExpiryDate = (dateStr: string): string => {
    const raw = (dateStr || '').trim();
    if (!raw) return '';

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const isValidYMD = (y: number, m: number, d: number) => {
      if (y < 1900 || y > 2100) return false;
      if (m < 1 || m > 12) return false;
      if (d < 1 || d > 31) return false;
      const dt = new Date(y, m - 1, d);
      return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
    };
    const lastDayOfMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

    // Excel serial date (commonly appears when CSV exported from Excel)
    // Excel serial date 1 = 1900-01-01 (with Excel leap year bug). Using the common JS conversion.
    if (/^\d+(\.\d+)?$/.test(raw)) {
      const serial = Number(raw);
      if (!Number.isNaN(serial) && serial > 0) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const ms = Math.round(serial * 24 * 60 * 60 * 1000);
        const dt = new Date(excelEpoch.getTime() + ms);
        const y = dt.getUTCFullYear();
        const m = dt.getUTCMonth() + 1;
        const d = dt.getUTCDate();
        if (isValidYMD(y, m, d)) return `${y}-${pad2(m)}-${pad2(d)}`;
      }
    }

    // YYYY-MM-DD (or YYYY/MM/DD)
    {
      const m = raw.match(/^\s*(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\s*$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        if (isValidYMD(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`;
      }
    }

    // DD-MM-YYYY / DD/MM/YYYY
    {
      const m = raw.match(/^\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\s*$/);
      if (m) {
        const d = Number(m[1]);
        const mo = Number(m[2]);
        const y = Number(m[3]);
        if (isValidYMD(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`;
      }
    }

    // MM-YYYY / MM/YYYY (use last day of month)
    {
      const m = raw.match(/^\s*(\d{1,2})[\/-](\d{4})\s*$/);
      if (m) {
        const mo = Number(m[1]);
        const y = Number(m[2]);
        if (y >= 1900 && y <= 2100 && mo >= 1 && mo <= 12) {
          const d = lastDayOfMonth(y, mo);
          return `${y}-${pad2(mo)}-${pad2(d)}`;
        }
      }
    }

    // MMM-YY / MMM-YYYY / MONTH-YY (use last day of month)
    try {
      const parts = raw.split('-').map(p => p.trim()).filter(Boolean);
      if (parts.length === 2) {
        const monthStr = parts[0];
        const yearStr = parts[1];

        const months: { [key: string]: string } = {
          Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
          JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
          JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
        };

        let month = months[monthStr];

        // Also accept numeric month in "MM-YY" form here
        if (!month && /^\d{1,2}$/.test(monthStr)) {
          const mo = Number(monthStr);
          if (mo >= 1 && mo <= 12) month = pad2(mo);
        }

        let year: number | null = null;
        if (/^\d{4}$/.test(yearStr)) year = Number(yearStr);
        else if (/^\d{2}$/.test(yearStr)) year = 2000 + Number(yearStr);

        if (month && year && year >= 1900 && year <= 2100) {
          const d = lastDayOfMonth(year, Number(month));
          return `${year}-${month}-${pad2(d)}`;
        }
      }
    } catch {
      // fallthrough
    }

    return '';
  };

  // Parse CSV file
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    // Assume header is line 1
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
      values.push(currentValue.trim());
      
      const obj: any = { row: index + 2 };
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      
      return obj;
    });
  };

  // Process and Preview
  const handlePreview = useCallback(() => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      (async () => {
        try {
          const text = e.target?.result as string;
          const data = parseCSV(text);

          const processedData: BatchPreview[] = [];
          const medicationCounts = new Map<string, number>();
          let foundCount = 0;
          let missingCount = 0;
          let existingBatchCount = 0;

          const localByNormalizedName = new Map<string, MedicationRef>();
          medications.forEach(m => {
            localByNormalizedName.set(normalizeMedicationName(m.name), m);
          });
          const lookupCache = new Map<string, MedicationRef | null>();

          const resolveMedication = async (name: string): Promise<MedicationRef | null> => {
            const key = normalizeMedicationName(name);
            if (!key) return null;
            if (lookupCache.has(key)) return lookupCache.get(key) ?? null;

            const local = localByNormalizedName.get(key);
            if (local) {
              lookupCache.set(key, local);
              return local;
            }

            const { data: found, error } = await supabase
              .from('medications')
              .select('id, name')
              .ilike('name', `%${name.trim()}%`)
              .limit(1);

            if (error || !found || found.length === 0) {
              lookupCache.set(key, null);
              return null;
            }

            const resolved: MedicationRef = { id: found[0].id, name: found[0].name };
            lookupCache.set(key, resolved);
            return resolved;
          };

          for (const row of data) {
            const medName = row['Medicine'] || '';
            if (!medName) continue;

            const matchedMed = await resolveMedication(medName);

            if (matchedMed) foundCount++;
            else missingCount++;

            medicationCounts.set(medName, (medicationCounts.get(medName) || 0) + 1);

            const expiryDate = parseExpiryDate(row['Expiry']);
            const batchNumber = row['Batch No'];

            let status: 'ready' | 'error' = 'ready';
            let message = '';

            const localWithBatches = matchedMed ? localByNormalizedName.get(normalizeMedicationName(matchedMed.name)) : undefined;
            const batchExists = localWithBatches?.batches?.some(b =>
              b.batch_number.toLowerCase() === batchNumber?.toLowerCase()
            );

            if (batchExists) existingBatchCount++;

            if (!matchedMed) {
              status = 'error';
              message = 'Medication not found in database';
            } else if (!expiryDate) {
              status = 'error';
              message = 'Invalid expiry date format';
            } else if (!batchNumber) {
              status = 'error';
              message = 'Missing batch number';
            } else if (batchExists) {
              status = 'error';
              message = 'Batch number already exists';
            }

            processedData.push({
              row: row.row,
              medicationName: medName,
              medicationId: matchedMed?.id || null,
              batchNumber: batchNumber,
              expiryDate: expiryDate,
              quantity: parseFloat(row['Qty'] || '0'),
              purchaseRate: parseFloat(row['Purchase Rat'] || '0'),
              mrp: parseFloat(row['Mrp'] || '0'),
              packSize: parseFloat(row['Pack'] || '1'),
              status,
              message
            });
          }

          let multiBatchCount = 0;
          medicationCounts.forEach(count => {
            if (count > 1) multiBatchCount++;
          });

          setStats({
            totalRows: processedData.length,
            uniqueMedications: medicationCounts.size,
            multiBatchMedications: multiBatchCount,
            foundMedications: foundCount,
            missingMedications: missingCount,
            existingBatches: existingBatchCount
          });

          setAllPreviewData(processedData);
          setPreview(processedData.slice(0, 10));
          setShowPreview(true);
        } catch (error) {
          console.error('Error parsing CSV:', error);
          alert('Error parsing CSV file. Please check the file format.');
        }
      })();
    };
    reader.readAsText(file);
  }, [file, medications]);

  // Upload batches
  const handleUpload = async () => {
    if (!allPreviewData.length) return;
    
    const validBatches = allPreviewData.filter(b => b.status === 'ready');
    if (validBatches.length === 0) {
      alert('No valid batches to upload.');
      return;
    }

    if (!confirm(`Ready to upload ${validBatches.length} batches? Rows with errors will be skipped.`)) {
      return;
    }

    setUploading(true);
    
    try {
      const response = await fetch('/api/upload-batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batches: validBatches }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      
      const message = result.errorCount > 0 
        ? `Uploaded ${result.successCount} batches. ${result.errorCount} failed.`
        : `Successfully uploaded ${result.successCount} batches!`;
        
      alert(message);
      router.push('/settings/pharmacy');
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      setShowPreview(false);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
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
              <h1 className="text-3xl font-bold text-gray-900">Upload Medication Batches</h1>
              <p className="text-gray-600 mt-1">Import batches from Drug Stock CSV</p>
            </div>
          </div>
        </div>

        {loadingMeds ? (
           <div className="text-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
             <p className="mt-4 text-gray-600">Loading medication database...</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Upload & Stats */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* File Upload */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-blue-600" />
                  Select CSV File
                </h2>
                
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    {file ? file.name : 'Select Drug Stock - Sheet2.csv'}
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
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Choose File
                  </label>
                </div>
              </div>

              {/* Stats Cards */}
              {showPreview && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Database className="w-5 h-5 mr-2 text-purple-600" />
                    Preview Statistics
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-gray-800">{stats.totalRows}</div>
                      <div className="text-sm text-gray-600">Total Batches</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.uniqueMedications}</div>
                      <div className="text-sm text-blue-800">Unique Medications</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-purple-600">{stats.multiBatchMedications}</div>
                      <div className="text-sm text-purple-800">Multi-batch Meds</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.foundMedications}</div>
                      <div className="text-sm text-green-800">Matched Meds</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.missingMedications}</div>
                      <div className="text-sm text-red-800">Missing Meds</div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-orange-600">{stats.existingBatches}</div>
                      <div className="text-sm text-orange-800">Duplicate Batches</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {showPreview && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-green-600" />
                    Data Preview (First 10 Rows)
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="py-2 px-3 text-left">Status</th>
                          <th className="py-2 px-3 text-left">Medicine</th>
                          <th className="py-2 px-3 text-left">Batch No</th>
                          <th className="py-2 px-3 text-left">Expiry</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">MRP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3">
                              {row.status === 'ready' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800" title={row.message}>
                                  <AlertCircle className="w-3 h-3 mr-1" /> {row.message}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-medium text-gray-900">{row.medicationName}</td>
                            <td className="py-2 px-3 text-gray-600">{row.batchNumber}</td>
                            <td className="py-2 px-3 text-gray-600">{row.expiryDate}</td>
                            <td className="py-2 px-3 text-right text-gray-600">{row.quantity}</td>
                            <td className="py-2 px-3 text-right text-gray-600">{row.mrp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Showing 10 of {stats.totalRows} rows. Only rows with "Ready" status will be uploaded.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Actions */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handlePreview}
                    disabled={!file}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Preview Data
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!showPreview || uploading || stats.foundMedications === 0}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {uploading ? 'Uploading...' : 'Upload Valid Batches'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                 <h3 className="text-lg font-semibold mb-4">Instructions</h3>
                 <ul className="space-y-2 text-sm text-gray-600 list-disc pl-4">
                   <li>Upload <strong>Drug Stock - Sheet2.csv</strong></li>
                   <li>Columns must match: Medicine, Batch No, Expiry (MMM-YY), Qty, Mrp...</li>
                   <li>Medications must exist in the database (matched by name)</li>
                   <li>Missing medications will be skipped</li>
                 </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadBatchesPage;
