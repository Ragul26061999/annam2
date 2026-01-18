'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Upload, FileText, Download, Eye, Calendar, User, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LabResult {
  id: string;
  order_number: string;
  test_name: string;
  test_cost: number;
  status: string;
  result_file_url?: string;
  result_uploaded_at?: string;
  result_uploaded_by?: string;
  result_notes?: string;
  created_at: string;
  preferred_collection_date?: string;
}

interface LabResultsTabProps {
  bedAllocationId: string;
  patientId: string;
}

export default function LabResultsTab({ bedAllocationId, patientId }: LabResultsTabProps) {
  const [loading, setLoading] = useState(true);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadNotes, setUploadNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLabResults();
  }, [patientId, bedAllocationId]);

  const loadLabResults = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_test_orders')
        .select(
          `
          id,
          order_number,
          status,
          preferred_collection_date,
          result_file_url,
          result_uploaded_at,
          result_uploaded_by,
          result_notes,
          created_at,
          test:lab_test_catalog(test_name, test_cost)
        `
        )
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        test_name: item.test?.test_name || 'Unknown Test',
        test_cost: item.test?.test_cost || 0
      }));

      setLabResults(formattedData);
    } catch (error) {
      console.error('Error loading lab results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (orderId: string, file: File) => {
    setUploading(orderId);
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}/${orderId}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lab-results')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('lab-results')
        .getPublicUrl(fileName);

      // Update lab_test_orders with file URL
      const { error: updateError } = await supabase
        .from('lab_test_orders')
        .update({
          result_file_url: urlData.publicUrl,
          result_uploaded_at: new Date().toISOString(),
          result_uploaded_by: 'current-user-id', // Replace with actual user ID
          result_notes: uploadNotes[orderId] || null,
          status: 'completed'
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      await loadLabResults();
      setUploadNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[orderId];
        return newNotes;
      });
      alert('Lab result uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (labResults.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h4 className="text-gray-900 font-medium">No Lab Tests Found</h4>
        <p className="text-gray-500 text-sm mt-1">Lab test results will appear here once ordered.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Laboratory Test Results</h3>
        <span className="text-sm text-gray-600">{labResults.length} test(s)</span>
      </div>

      {labResults.map((result) => (
        <div key={result.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">{result.test_name}</h4>
                {result.result_file_url && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded flex items-center gap-1">
                    <Check className="h-3 w-3" /> Result Available
                  </span>
                )}
                {!result.result_file_url && result.status === 'pending' && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(result.preferred_collection_date || result.created_at)}
                </span>
                <span>Order #{result.order_number}</span>
              </div>
            </div>
          </div>

          {result.result_file_url ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Result Uploaded</p>
                    {result.result_uploaded_at && (
                      <p className="text-xs text-green-700">
                        {formatDate(result.result_uploaded_at)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={result.result_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </a>
                  <a
                    href={result.result_file_url}
                    download
                    className="flex items-center gap-1 px-3 py-1.5 bg-white text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
              </div>
              {result.result_notes && (
                <p className="text-sm text-green-800 mt-2 pl-7">{result.result_notes}</p>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Upload Lab Result
                </label>
                <input
                  type="text"
                  placeholder="Add notes (optional)"
                  value={uploadNotes[result.id] || ''}
                  onChange={(e) => setUploadNotes({ ...uploadNotes, [result.id]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                />
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm w-fit">
                  {uploading === result.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Choose File
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(result.id, file);
                    }}
                    className="hidden"
                    disabled={uploading === result.id}
                  />
                </label>
                <p className="text-xs text-gray-600">Supported: PDF, Images, Word documents</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
