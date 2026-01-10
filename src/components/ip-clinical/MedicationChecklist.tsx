import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Pill,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MedicationChecklistProps {
  bedAllocationId: string;
  date: string;
  currentUser?: any;
}

interface MedicationSchedule {
  schedule_id: string;
  patient_id: string;
  patient_name: string;
  patient_uhid: string;
  ip_number: string;
  medication_name: string;
  dosage: string;
  frequency_times: string[];
  meal_timing: string;
  instructions: string;
  administration_date: string;
  time_slot: string;
  scheduled_time: string;
  administration_status: 'pending' | 'administered' | 'skipped' | 'refused' | 'delayed';
  administered_at?: string;
  administration_notes?: string;
  day_number: number;
}

export default function MedicationChecklist({ bedAllocationId, date, currentUser }: MedicationChecklistProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [medications, setMedications] = useState<MedicationSchedule[]>([]);
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set(['Morning', 'Afternoon', 'Evening', 'Night']));

  useEffect(() => {
    loadMedications();
  }, [bedAllocationId, date]);

  const loadMedications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nurse_medication_checklist')
        .select('*')
        .eq('bed_allocation_id', bedAllocationId)
        .eq('administration_date', date)
        .order('time_slot', { ascending: true });

      if (error) {
        console.error('Error loading medication checklist:', error);
        throw error;
      }

      setMedications(data || []);
      console.log('Loaded medications:', data?.length || 0, 'for date:', date);
    } catch (err) {
      console.error('Failed to load medication checklist', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshChecklist = async () => {
    setRefreshing(true);
    try {
      await supabase.rpc('refresh_nurse_medication_checklist');
      console.log('Materialized view refreshed successfully');
      // Reload medications after refresh
      await loadMedications();
    } catch (error) {
      console.error('Error refreshing materialized view:', error);
      alert('Error refreshing medication checklist');
    } finally {
      setRefreshing(false);
    }
  };

  const administerMedication = async (scheduleId: string, timeSlot: string, status: string) => {
    // Allow medication administration even without a logged-in user for demo/testing
    // In production, you might want to uncomment the authentication check
    /*
    if (!currentUser?.id) {
      alert('You must be logged in to administer medications');
      return;
    }
    */

    // For now, use a default user ID or skip the user requirement
    const adminUserId = currentUser?.id || null;

    setSubmitting(prev => new Set(prev).add(`${scheduleId}-${timeSlot}`));
    
    try {
      const { error } = await supabase
        .rpc('administer_medication', {
          p_schedule_id: scheduleId,
          p_administration_date: date,
          p_time_slot: timeSlot,
          p_administered_by: adminUserId,
          p_status: status,
          p_notes: status === 'administered' ? 'Medication administered as scheduled' : null
        });

      if (error) {
        console.error('Error administering medication:', error);
        throw error;
      }

      // Refresh the checklist
      await loadMedications();
    } catch (err) {
      console.error('Failed to administer medication', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to administer medication'}`);
    } finally {
      setSubmitting(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${scheduleId}-${timeSlot}`);
        return newSet;
      });
    }
  };

  // Group medications by time slot
  const medicationsByTimeSlot = medications.reduce((acc, med) => {
    if (!acc[med.time_slot]) {
      acc[med.time_slot] = [];
    }
    acc[med.time_slot].push(med);
    return acc;
  }, {} as Record<string, MedicationSchedule[]>);

  const timeSlots = [
    { name: 'Morning', icon: '🌅', color: 'orange', time: '08:00 AM' },
    { name: 'Afternoon', icon: '☀️', color: 'blue', time: '12:00 PM' },
    { name: 'Evening', icon: '🌆', color: 'purple', time: '05:00 PM' },
    { name: 'Night', icon: '🌙', color: 'indigo', time: '09:00 PM' }
  ];

  const toggleSessionExpansion = (timeSlot: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(timeSlot)) {
        newSet.delete(timeSlot);
      } else {
        newSet.add(timeSlot);
      }
      return newSet;
    });
  };

  const getSessionStats = (timeSlot: string) => {
    const meds = medicationsByTimeSlot[timeSlot] || [];
    const administered = meds.filter(m => m.administration_status === 'administered').length;
    const pending = meds.filter(m => m.administration_status === 'pending').length;
    const total = meds.length;
    
    return { total, administered, pending };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'administered': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'skipped': return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'refused': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'delayed': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'administered': return 'bg-green-50 border-green-200 text-green-800';
      case 'skipped': return 'bg-gray-50 border-gray-200 text-gray-600';
      case 'refused': return 'bg-red-50 border-red-200 text-red-800';
      case 'delayed': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getSessionColor = (color: string) => {
    switch (color) {
      case 'orange': return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'blue': return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'purple': return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      case 'indigo': return 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100';
      default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Pill className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Medication Administration</h3>
            <p className="text-sm text-gray-500">
              {new Date(date).toLocaleDateString()} • {medications.length} medications scheduled
            </p>
          </div>
        </div>
        <button
          onClick={refreshChecklist}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {medications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Pill className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No medications scheduled for this date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {timeSlots.map((timeSlot) => {
            const slotMedications = medicationsByTimeSlot[timeSlot.name] || [];
            const stats = getSessionStats(timeSlot.name);
            const isExpanded = expandedSessions.has(timeSlot.name);
            const isCompleted = stats.total > 0 && stats.pending === 0;
            
            return (
              <div key={timeSlot.name} className={`rounded-xl border-2 transition-all duration-200 ${getSessionColor(timeSlot.color)}`}>
                {/* Session Header */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleSessionExpansion(timeSlot.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{timeSlot.icon}</span>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{timeSlot.name}</h4>
                        <p className="text-sm text-gray-600">{timeSlot.time}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {stats.administered}/{stats.total} Given
                        </p>
                        <p className="text-xs text-gray-600">
                          {stats.pending} pending
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Completed
                          </span>
                        )}
                        <ChevronDown 
                          className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medications List */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-white bg-opacity-50">
                    {slotMedications.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <Pill className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No medications scheduled for {timeSlot.name}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {slotMedications.map((med, index) => {
                          const isSubmitting = submitting.has(`${med.schedule_id}-${med.time_slot}`);
                          
                          return (
                            <div key={`${med.schedule_id}-${med.time_slot}`} className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h5 className="font-semibold text-gray-900">{med.medication_name}</h5>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(med.administration_status)}`}>
                                      {getStatusIcon(med.administration_status)}
                                      <span className="ml-1">{med.administration_status}</span>
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Dosage:</span>
                                      <span>{med.dosage}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Time:</span>
                                      <span>{med.scheduled_time}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Day:</span>
                                      <span>Day {med.day_number}</span>
                                    </div>
                                  </div>

                                  {med.instructions && (
                                    <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                                      <span className="font-medium">Instructions:</span> {med.instructions}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                  {med.administered_at && (
                                    <span>
                                      Administered at {new Date(med.administered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                                
                                {med.administration_status === 'pending' && (
  <div className="flex gap-2">
    <button
      onClick={() => administerMedication(med.schedule_id, med.time_slot, 'administered')}
      disabled={isSubmitting}
      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      {isSubmitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      Give
    </button>
    <button
      onClick={() => administerMedication(med.schedule_id, med.time_slot, 'skipped')}
      disabled={isSubmitting}
      className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      <XCircle className="h-4 w-4" />
      Skip
    </button>
    <button
      onClick={() => administerMedication(med.schedule_id, med.time_slot, 'refused')}
      disabled={isSubmitting}
      className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      <AlertCircle className="h-4 w-4" />
      Refused
    </button>
  </div>
)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
