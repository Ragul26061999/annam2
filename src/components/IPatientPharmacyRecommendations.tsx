'use client';

import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  X, 
  Plus, 
  Loader2,
  FileText,
  ShoppingCart,
  User
} from 'lucide-react';
import {
  getIPatientMedicationRecommendations,
  saveMedicationRecommendations,
  updateRecommendationStatus,
  convertRecommendationsToPrescription,
  getPatientMedicationRecommendations,
  type IPatientRecommendationRequest,
  type MedicationRecommendation
} from '../lib/pharmacyRecommendationService';

interface IPatientPharmacyRecommendationsProps {
  patientId: string;
  patientData?: {
    diagnosis: string;
    allergies: string[];
    current_medications: string[];
    vital_signs?: any;
    lab_results?: any;
  };
  doctorId?: string;
  onRecommendationProcessed?: () => void;
}

export default function IPatientPharmacyRecommendations({
  patientId,
  patientData,
  doctorId,
  onRecommendationProcessed
}: IPatientPharmacyRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<MedicationRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setRecommendations([]);
      setError(null);
      return;
    }

    loadExistingRecommendations();
  }, [patientId]);

  const loadExistingRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPatientMedicationRecommendations(patientId);
      setRecommendations(data);
    } catch (err: any) {
      console.error('Error loading recommendations:', err);
      setError('Failed to load existing recommendations');
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    if (!patientData?.diagnosis) {
      setError('Patient diagnosis is required to generate recommendations');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const request: IPatientRecommendationRequest = {
        patient_id: patientId,
        diagnosis: patientData.diagnosis,
        allergies: patientData.allergies || [],
        current_medications: patientData.current_medications || [],
        vital_signs: patientData.vital_signs,
        lab_results: patientData.lab_results
      };

      const newRecommendations = await getIPatientMedicationRecommendations(request);
      
      // Save to database
      await saveMedicationRecommendations(newRecommendations);
      
      setRecommendations(prev => [...newRecommendations, ...prev]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error generating recommendations:', err);
      setError(err.message || 'Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const handleRecommendationSelect = (recommendationId: string) => {
    setSelectedRecommendations(prev => 
      prev.includes(recommendationId)
        ? prev.filter(id => id !== recommendationId)
        : [...prev, recommendationId]
    );
  };

  const handleStatusUpdate = async (
    recommendationId: string, 
    status: 'approved' | 'rejected'
  ) => {
    try {
      await updateRecommendationStatus(recommendationId, status, doctorId);
      await loadExistingRecommendations();
      onRecommendationProcessed?.();
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError('Failed to update recommendation status');
    }
  };

  const handleConvertToPrescription = async () => {
    if (!doctorId || selectedRecommendations.length === 0) {
      setError('Please select recommendations and ensure doctor ID is provided');
      return;
    }

    try {
      await convertRecommendationsToPrescription(patientId, doctorId, selectedRecommendations);
      await loadExistingRecommendations();
      setSelectedRecommendations([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onRecommendationProcessed?.();
    } catch (err: any) {
      console.error('Error converting to prescription:', err);
      setError('Failed to convert to prescription');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'dispensed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'dispensed': return <ShoppingCart className="w-4 h-4" />;
      case 'rejected': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pill className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">
            Pharmacy Recommendations
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateRecommendations}
            disabled={generating || !patientData?.diagnosis}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Plus className="w-4 h-4" /> Generate Recommendations</>
            )}
          </button>
        </div>
      </div>

      {/* Patient Info Summary */}
      {patientData && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Diagnosis:</span> {patientData.diagnosis}
            </div>
            <div>
              <span className="font-semibold">Allergies:</span> {patientData.allergies?.join(', ') || 'None'}
            </div>
            <div>
              <span className="font-semibold">Current Meds:</span> {patientData.current_medications?.join(', ') || 'None'}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          <span>Operation completed successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Recommendations List */}
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {/* Batch Actions */}
              {selectedRecommendations.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-800">
                    {selectedRecommendations.length} recommendation(s) selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(selectedRecommendations[0], 'approved')}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      Approve Selected
                    </button>
                    <button
                      onClick={handleConvertToPrescription}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                    >
                      Convert to Prescription
                    </button>
                  </div>
                </div>
              )}

              {/* Recommendation Cards */}
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`border rounded-lg p-4 space-y-3 ${
                    selectedRecommendations.includes(rec.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRecommendations.includes(rec.id)}
                        onChange={() => handleRecommendationSelect(rec.id)}
                        disabled={rec.status !== 'pending'}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{rec.medication_name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(rec.status)}`}>
                            {getStatusIcon(rec.status)}
                            {rec.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div><span className="font-medium">Generic:</span> {rec.generic_name || 'N/A'}</div>
                          <div><span className="font-medium">Dosage:</span> {rec.dosage}</div>
                          <div><span className="font-medium">Frequency:</span> {rec.frequency}</div>
                          <div><span className="font-medium">Duration:</span> {rec.duration}</div>
                          <div><span className="font-medium">Quantity:</span> {rec.quantity}</div>
                          <div><span className="font-medium">Recommended:</span> {new Date(rec.recommendation_date).toLocaleDateString()}</div>
                        </div>

                        {rec.instructions && (
                          <div className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Instructions:</span> {rec.instructions}
                          </div>
                        )}

                        {rec.reason_for_recommendation && (
                          <div className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Reason:</span> {rec.reason_for_recommendation}
                          </div>
                        )}

                        {rec.notes && (
                          <div className="text-sm text-gray-500 mt-2 italic">
                            {rec.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {rec.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(rec.id, 'approved')}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(rec.id, 'rejected')}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Pill className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">No pharmacy recommendations available</p>
              <p className="text-sm">Generate recommendations based on patient diagnosis and clinical data</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
