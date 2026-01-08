import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Clock, FileText } from 'lucide-react';
import { getIPCaseSheet, createOrUpdateIPCaseSheet, IPCaseSheet, getIPProgressNotes, createIPProgressNote, IPProgressNote } from '../../lib/ipClinicalService';

interface CaseSheetProps {
  bedAllocationId: string;
  patientId: string;
}

export default function CaseSheet({ bedAllocationId, patientId }: CaseSheetProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [caseSheet, setCaseSheet] = useState<Partial<IPCaseSheet>>({});
  const [progressNotes, setProgressNotes] = useState<IPProgressNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [bedAllocationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sheetData, notesData] = await Promise.all([
        getIPCaseSheet(bedAllocationId),
        getIPProgressNotes(bedAllocationId)
      ]);
      setCaseSheet(sheetData || {});
      setProgressNotes(notesData || []);
    } catch (err) {
      console.error('Failed to load case sheet data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: keyof IPCaseSheet, value: string) => {
    // Optimistic update
    setCaseSheet(prev => ({ ...prev, [field]: value }));
  };

  const handleBlurField = async (field: keyof IPCaseSheet, value: string) => {
    if (!bedAllocationId) return;
    setSaving(true);
    try {
      await createOrUpdateIPCaseSheet(bedAllocationId, patientId, { [field]: value });
    } catch (err) {
      console.error(`Failed to save ${field}`, err);
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
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Case Sheet
          </h3>
          {saving && <span className="text-xs text-green-600 flex items-center gap-1"><Save className="h-3 w-3" /> Saving...</span>}
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.key} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{section.label}</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={section.rows}
                value={(caseSheet[section.key as keyof IPCaseSheet] as string) || ''}
                onChange={(e) => handleSaveField(section.key as keyof IPCaseSheet, e.target.value)}
                onBlur={(e) => handleBlurField(section.key as keyof IPCaseSheet, e.target.value)}
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
