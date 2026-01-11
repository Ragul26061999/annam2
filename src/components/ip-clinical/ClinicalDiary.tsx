import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, Stethoscope, FileText, 
  ChevronLeft, ChevronRight, Plus, Activity, Pill, Microscope, 
  Loader2, Filter, LayoutDashboard, ClipboardList
} from 'lucide-react';
import { getIPClinicalTimeline, ClinicalEvent } from '../../lib/ipClinicalService';
import DoctorOrders from './DoctorOrders';
import NurseRecords from './NurseRecords';
import CaseSheet from './CaseSheet';
import DischargeSummary from './DischargeSummary';

interface ClinicalDiaryProps {
  bedAllocationId: string;
  patientId: string;
  patientName: string;
  admissionDate: string;
  dischargeDate?: string;
  ipNumber?: string;
  defaultTab?: 'overview' | 'doctor' | 'nurse' | 'casesheet' | 'discharge';
}

export default function ClinicalDiary({ bedAllocationId, patientId, patientName, admissionDate, dischargeDate, ipNumber, defaultTab = 'overview' }: ClinicalDiaryProps) {
  // Debug logging to see what patient data is being passed
  console.log('ClinicalDiary received:', { bedAllocationId, patientId, patientName });

  // Helper to get local date string YYYY-MM-DD
  const getLocalDateString = (d: Date = new Date()) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<Record<string, ClinicalEvent[]>>({});
  // Default selected date: discharge date if exists, else today (but not after today if admission active?)
  // Actually, default to today or discharge date is reasonable.
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (dischargeDate) return getLocalDateString(new Date(dischargeDate));
    return getLocalDateString();
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'doctor' | 'nurse' | 'casesheet' | 'discharge'>(defaultTab);

  useEffect(() => {
    loadTimeline();
  }, [bedAllocationId, patientId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await getIPClinicalTimeline(bedAllocationId, patientId);
      setTimeline(data);
    } catch (err) {
      console.error('Failed to load timeline', err);
    } finally {
      setLoading(false);
    }
  };

  const getDayNumber = (dateStr: string) => {
    if (!admissionDate) return 1;
    
    const admission = new Date(admissionDate);
    // Treat dateStr (YYYY-MM-DD) as local time midnight
    const current = new Date(`${dateStr}T00:00:00`);
    
    admission.setHours(0,0,0,0);
    current.setHours(0,0,0,0);
    
    const diffTime = current.getTime() - admission.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
    return Math.max(1, diffDays + 1); // Ensure at least Day 1
  };

  // Generate full range of dates from admission to discharge (or today)
  const generateDateRange = () => {
    if (!admissionDate) return [];
    
    const start = new Date(admissionDate);
    start.setHours(0,0,0,0);
    
    const end = dischargeDate ? new Date(dischargeDate) : new Date();
    end.setHours(0,0,0,0);
    
    // Safety check: if start > end (future admission?), just show start
    if (start > end) return [getLocalDateString(start)];

    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(getLocalDateString(current));
      current.setDate(current.getDate() + 1);
    }
    
    // Ensure today is included if active and not already there (e.g. edge case)
    const today = getLocalDateString();
    if (!dischargeDate && !dates.includes(today) && new Date(today) >= start) {
       dates.push(today);
    }

    return dates.reverse(); // Newest first
  };

  const sortedDates = generateDateRange();
  const todayStr = getLocalDateString();
  
  const currentEvents = timeline[selectedDate] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Daily Overview', icon: LayoutDashboard },
    { id: 'doctor', label: "Doctor's Notes", icon: Stethoscope },
    { id: 'nurse', label: "Nurse's Record", icon: User },
    { id: 'casesheet', label: 'Case Sheet', icon: FileText },
    { id: 'discharge', label: 'Discharge Summary', icon: ClipboardList },
  ];

  const isDischarge = activeTab === 'discharge';

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Sidebar - Timeline Navigation */}
      <div className={`w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0 ${isDischarge ? 'hidden' : ''}`}>
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Timeline</h3>
        </div>
        
        <div className="flex-1 py-2">
          {/* Always show Today */}
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-l-4 ${selectedDate === todayStr ? 'bg-blue-50 border-blue-500' : 'border-transparent'}`}
          >
            <div>
              <span className="block font-bold text-gray-900 text-sm">Today</span>
              <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
            </div>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Day {getDayNumber(todayStr)}</span>
          </button>

          <div className="my-2 border-t border-gray-100"></div>

          {sortedDates.map(date => {
            if (date === todayStr) return null;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-l-4 ${selectedDate === date ? 'bg-blue-50 border-blue-500' : 'border-transparent'}`}
              >
                <div>
                  <span className="block font-medium text-gray-900 text-sm">{new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className="text-xs text-gray-500">{timeline[date]?.length || 0} Events</span>
                </div>
                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Day {getDayNumber(date)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Header & Tabs */}
        <div className="border-b border-gray-200">
          {!isDischarge && (
            <div className="px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <div className="text-sm text-gray-500">
                Viewing records for <span className="font-semibold text-gray-900">Day {getDayNumber(selectedDate)}</span>
              </div>
            </div>
          )}
          
          <div className={`flex px-6 gap-2 ${isDischarge ? 'pt-4 pb-4' : 'pb-4'}`}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 shadow-sm ring-1 ring-blue-200' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="max-w-5xl mx-auto p-6">
            
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Day Summary
                  </h3>
                  {currentEvents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      No events recorded for this date.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {currentEvents.map((event) => (
                        <div key={event.id} className="relative pl-6 border-l-2 border-gray-200 hover:border-blue-300 transition-colors group">
                          <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm
                            ${event.type === 'doctor_order' ? 'bg-teal-500' : 
                              event.type === 'nurse_record' ? 'bg-purple-500' : 
                              event.type === 'case_sheet' ? 'bg-orange-500' :
                              event.type === 'prescription' ? 'bg-green-500' :
                              'bg-blue-500'}`}></div>
                          
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded
                                  ${event.type === 'doctor_order' ? 'bg-teal-50 text-teal-700' : 
                                    event.type === 'nurse_record' ? 'bg-purple-50 text-purple-700' : 
                                    event.type === 'case_sheet' ? 'bg-orange-50 text-orange-700' :
                                    event.type === 'prescription' ? 'bg-green-50 text-green-700' :
                                    'bg-blue-50 text-blue-700'}`}>
                                  {event.title}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock size={12} />
                                  {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                              {event.creator && <span className="text-xs text-gray-400">By {event.creator}</span>}
                            </div>
                            <p className="text-gray-800 text-sm whitespace-pre-wrap">{event.content}</p>
                            
                            {event.metadata && (event.metadata.treatment || event.metadata.investigation || event.metadata.present_complaints || event.metadata.provisional_diagnosis) && (
                              <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {event.metadata.treatment && (
                                  <div>
                                    <span className="font-bold text-gray-500 block mb-1">Treatment</span>
                                    <p className="text-gray-700 bg-gray-50 p-2 rounded">{event.metadata.treatment}</p>
                                  </div>
                                )}
                                {event.metadata.investigation && (
                                  <div>
                                    <span className="font-bold text-gray-500 block mb-1">Investigation</span>
                                    <p className="text-gray-700 bg-gray-50 p-2 rounded">{event.metadata.investigation}</p>
                                  </div>
                                )}
                                {event.metadata.present_complaints && (
                                  <div>
                                    <span className="font-bold text-gray-500 block mb-1">Present Complaints</span>
                                    <p className="text-gray-700 bg-gray-50 p-2 rounded">{event.metadata.present_complaints}</p>
                                  </div>
                                )}
                                {event.metadata.provisional_diagnosis && (
                                  <div>
                                    <span className="font-bold text-gray-500 block mb-1">Diagnosis</span>
                                    <p className="text-gray-700 bg-gray-50 p-2 rounded">{event.metadata.provisional_diagnosis}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'doctor' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Doctor's Orders</h3>
                    <p className="text-sm text-gray-500">Manage prescriptions and clinical instructions</p>
                  </div>
                  <div className="p-2 bg-teal-50 rounded-lg">
                    <Stethoscope className="h-6 w-6 text-teal-600" />
                  </div>
                </div>
                <DoctorOrders 
                  bedAllocationId={bedAllocationId} 
                  date={selectedDate} 
                  patientId={patientId}
                  patientName={patientName}
                  currentUser={{ id: null }} // Pass current user if available
                  selectedTimelineDate={selectedDate} // Pass selected date for prescription start
                />
              </div>
            )}

            {activeTab === 'nurse' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Nurse's Record</h3>
                    <p className="text-sm text-gray-500">Track vitals, administration, and daily care</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <NurseRecords 
                  bedAllocationId={bedAllocationId} 
                  date={selectedDate} 
                  currentUser={{ id: null }} // Pass current user if available
                />
              </div>
            )}

            {activeTab === 'casesheet' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Case Sheet</h3>
                    <p className="text-sm text-gray-500">Comprehensive medical history and examination</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <CaseSheet bedAllocationId={bedAllocationId} patientId={patientId} selectedDate={selectedDate} />
              </div>
            )}

            {activeTab === 'discharge' && (
              <DischargeSummary 
                bedAllocationId={bedAllocationId}
                patient={{ name: patientName }}
                bedAllocation={{ admission_date: admissionDate, ip_number: ipNumber || 'N/A' }} 
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
