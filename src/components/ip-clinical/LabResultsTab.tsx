'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Upload, FileText, Download, Eye, Calendar, User, Check, AlertCircle, Paperclip } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getPatientLabXrayAttachments, type LabXrayAttachment } from '../../lib/labXrayAttachmentService';

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
  const [labAttachments, setLabAttachments] = useState<LabXrayAttachment[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadNotes, setUploadNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLabResults();
  }, [patientId, bedAllocationId]);

  const loadLabResults = async () => {
    setLoading(true);
    try {
      // Fetch lab test orders
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

      // Fetch lab xray attachments
      try {
        const attachments = await getPatientLabXrayAttachments(patientId);
        // Filter only lab-type attachments
        const labOnlyAttachments = attachments.filter(att => att.test_type === 'lab');
        setLabAttachments(labOnlyAttachments);
      } catch (attachmentError) {
        console.error('Error loading lab attachments:', attachmentError);
        setLabAttachments([]);
      }
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

  const hasNoData = labResults.length === 0 && labAttachments.length === 0;

  if (hasNoData) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h4 className="text-gray-900 font-medium">No Lab Tests Found</h4>
        <p className="text-gray-500 text-sm mt-1">Lab test results and uploaded documents will appear here once ordered.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Laboratory Test Results</h3>
        <span className="text-sm text-gray-600">{labResults.length} test(s) • {labAttachments.length} uploaded document(s)</span>
      </div>

      {/* Display Lab Xray Attachments */}
      {labAttachments.length > 0 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Uploaded Documents ({labAttachments.length})
            </h4>
            <div className="space-y-3">
              {labAttachments.map((attachment) => (
                <div key={attachment.id} className="bg-white border border-blue-100 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-gray-900 truncate">{attachment.test_name}</h5>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                          Uploaded Document
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(attachment.uploaded_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {attachment.file_name}
                        </span>
                        <span>{(attachment.file_size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {attachment.file_url && (
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </a>
                      )}
                      <a
                        href={attachment.file_url}
                        download
                        className="flex items-center gap-1 px-3 py-1.5 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Individual lab test results display removed */}
    </div>
  );
}
