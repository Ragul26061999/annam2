import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Clock, FileText } from 'lucide-react';
import { getIPCaseSheet, createOrUpdateIPCaseSheet, IPCaseSheet, getIPProgressNotes, createIPProgressNote, IPProgressNote } from '../../lib/ipClinicalService';

interface CaseSheetProps {
  bedAllocationId: string;
  patientId: string;
  selectedDate?: string;
}

export default function CaseSheet({ bedAllocationId, patientId, selectedDate }: CaseSheetProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [caseSheet, setCaseSheet] = useState<Partial<IPCaseSheet>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [progressNotes, setProgressNotes] = useState<IPProgressNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [bedAllocationId, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sheetData, notesData] = await Promise.all([
        getIPCaseSheet(bedAllocationId, selectedDate),
        getIPProgressNotes(bedAllocationId)
      ]);
      setCaseSheet(sheetData || {});
      setProgressNotes(notesData || []);
      setHasChanges(false); // Reset changes flag when loading new data
    } catch (err) {
      console.error('Failed to load case sheet data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: keyof IPCaseSheet, value: string) => {
    // Update local state and mark as changed
    setCaseSheet(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    if (!bedAllocationId || !hasChanges) {
      console.log('Save aborted - missing data:', { bedAllocationId, hasChanges });
      return;
    }
    
    console.log('Current caseSheet state:', caseSheet);
    console.log('Filtered caseSheet (only defined fields):', 
      Object.fromEntries(
        Object.entries(caseSheet).filter(([_, value]) => value !== undefined && value !== null && value !== '')
      )
    );
    
    setSaving(true);
    try {
      console.log('Attempting to save case sheet:', { bedAllocationId, patientId, selectedDate, caseSheet });
      await createOrUpdateIPCaseSheet(bedAllocationId, patientId, caseSheet, selectedDate);
      setHasChanges(false);
      console.log('Case sheet saved successfully');
    } catch (err: any) {
      console.error('Failed to save case sheet:', err);
      console.error('Error details:', {
        message: err?.message || 'Unknown error',
        details: err?.details || null,
        hint: err?.hint || null,
        code: err?.code || null,
        bedAllocationId,
        patientId,
        selectedDate,
        caseSheetData: caseSheet
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setNoteSaving(true);
    try {
      const note = await createIPProgressNote(bedAllocationId, newNote, new Date().toISOString());
      setProgressNotes(prev => [note, ...prev]);
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note', err);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, fieldIndex: number, totalFields: number) => {
    // ONLY handle Tab key, completely ignore Enter key
    if (e.key === 'Tab') {
      e.preventDefault();
      // Move to next field or wrap around to first
      const nextFieldIndex = fieldIndex + 1 >= totalFields ? 0 : fieldIndex + 1;
      const nextTextArea = document.querySelector(`textarea[data-field-index="${nextFieldIndex}"]`) as HTMLTextAreaElement;
      if (nextTextArea) {
        nextTextArea.focus();
        // Position cursor at end of text
        const len = nextTextArea.value.length;
        nextTextArea.setSelectionRange(len, len);
      }
    }
    // Completely ignore Enter key - let browser handle it naturally
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  }

  const sections = [
    { key: 'present_complaints', label: 'Present Complaints', rows: 3 },
    { key: 'history_present_illness', label: 'History of Present Illness', rows: 4 },
    { key: 'past_history', label: 'Past History', rows: 3 },
    { key: 'family_history', label: 'Family History', rows: 3 },
    { key: 'personal_history', label: 'Personal History', rows: 3 },
    { key: 'examination_notes', label: 'Physical Examination (General + Systemic)', rows: 6 },
    { key: 'provisional_diagnosis', label: 'Provisional Diagnosis', rows: 2 },
    { key: 'investigation_summary', label: 'Investigations (Summary)', rows: 3 },
    { key: 'treatment_plan', label: 'Treatment Plan', rows: 3 },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Case Sheet
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Date: {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleSaveAll}
              disabled={!hasChanges || saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Case Sheet
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={section.key} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{section.label}</label>
              <textarea
                data-field-index={index}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={section.rows}
                value={(caseSheet[section.key as keyof IPCaseSheet] as string) || ''}
                onChange={(e) => handleSaveField(section.key as keyof IPCaseSheet, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index, sections.length)}
                placeholder={`Enter ${section.label.toLowerCase()}...`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-purple-600" />
          Daily Progress Notes
        </h3>

        <div className="mb-6 space-y-3">
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            rows={3}
            placeholder="Add a new progress note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || noteSaving}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {noteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Note
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {progressNotes.length === 0 ? (
            <p className="text-center text-gray-500 py-4 text-sm">No progress notes yet.</p>
          ) : (
            progressNotes.map((note) => (
              <div key={note.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 text-sm">
                      {new Date(note.note_date).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(note.note_date).toLocaleTimeString()}
                    </span>
                  </div>
                  {note.created_by && (
                    <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-600">
                      Dr. {note.created_by}
                    </span>
                  )}
                </div>
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
