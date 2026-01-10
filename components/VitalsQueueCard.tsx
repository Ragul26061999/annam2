'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  Phone, 
  Activity, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Edit3,
  XCircle
} from 'lucide-react';
import { getQueueEntries, updateQueueStatus, type QueueEntry } from '../src/lib/outpatientQueueService';
import { useRouter } from 'next/navigation';

interface VitalsQueueCardProps {
  selectedDate: string;
  onRefresh?: () => void;
}

export default function VitalsQueueCard({ selectedDate, onRefresh }: VitalsQueueCardProps) {
  const router = useRouter();
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadQueueEntries();
  }, [selectedDate]);

  const loadQueueEntries = async () => {
    try {
      setLoading(true);
      const result = await getQueueEntries(selectedDate, 'waiting');
      if (result.success && result.entries) {
        setQueueEntries(result.entries);
      } else {
        setError(result.error || 'Failed to load queue');
      }
    } catch (err) {
      console.error('Error loading queue:', err);
      setError('Failed to load queue entries');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterVitals = async (entry: QueueEntry) => {
    if (!entry.patient) return;
    
    setProcessingId(entry.id);
    try {
      // Mark as in progress
      await updateQueueStatus(entry.id, 'in_progress');
      
      // Navigate to vitals entry page
      router.push(`/outpatient/enter-vitals/${entry.patient.id}?queueId=${entry.id}`);
    } catch (err) {
      console.error('Error starting vitals entry:', err);
      setProcessingId(null);
    }
  };

  const handleCancelQueue = async (queueId: string) => {
    if (!confirm('Are you sure you want to cancel this queue entry?')) return;
    
    setProcessingId(queueId);
    try {
      await updateQueueStatus(queueId, 'cancelled');
      await loadQueueEntries();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error cancelling queue entry:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const calculateWaitTime = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="ml-3 text-gray-600">Loading queue...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error Loading Queue</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (queueEntries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patients Waiting</h3>
          <p className="text-gray-600">All patients have completed their vitals entry for today.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Patients Waiting for Vitals
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {queueEntries.length} patient{queueEntries.length !== 1 ? 's' : ''} in queue
            </p>
          </div>
          <button
            onClick={loadQueueEntries}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh Queue"
          >
            <Activity className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {queueEntries.map((entry, index) => {
          const patient = entry.patient;
          if (!patient) return null;

          const waitTime = calculateWaitTime(entry.created_at);
          const isProcessing = processingId === entry.id;

          return (
            <div 
              key={entry.id} 
              className="p-5 hover:bg-orange-50/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Queue Number Badge */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                      <div className="text-center">
                        <div className="text-white font-bold text-xl">{entry.queue_number}</div>
                        <div className="text-white/80 text-[10px] font-medium">TOKEN</div>
                      </div>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{patient.name}</h3>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        Waiting
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-xs">{patient.patient_id}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{patient.phone}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="capitalize">{patient.gender}</span>
                        <span>•</span>
                        <span>{patient.age || 'N/A'} yrs</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-orange-600 font-medium">Wait: {waitTime}</span>
                      </div>
                    </div>

                    {patient.primary_complaint && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg inline-block">
                        <span className="font-medium text-gray-700">Complaint:</span> {patient.primary_complaint}
                      </div>
                    )}

                    {entry.notes && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Note: {entry.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEnterVitals(entry)}
                    disabled={isProcessing}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4" />
                        <span>Enter Vitals</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleCancelQueue(entry.id)}
                    disabled={isProcessing}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cancel Queue Entry"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Priority Indicator */}
              {entry.priority > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-medium text-red-600">
                    {entry.priority === 2 ? 'URGENT' : 'HIGH PRIORITY'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
