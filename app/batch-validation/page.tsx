'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Search } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

interface BatchRow {
  id: string;
  medicine_ref_id: string | null;
  batch_number: string;
  current_quantity: number;
  legacy_code: string | null;
  medication_name: string;
  dosage_form: string | null;
}

interface BatchRowRaw {
  id: string;
  batch_number: string;
  current_quantity: number;
  legacy_code: string | null;
  medicine_ref_id: string | null;
}

const PublicBatchValidationPage = () => {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [medicationSort, setMedicationSort] = useState<'asc' | 'desc' | null>(null);
  const [selectedDosageForm, setSelectedDosageForm] = useState<string>('');
  const [availableDosageForms, setAvailableDosageForms] = useState<string[]>([]);

  const [rows, setRows] = useState<BatchRow[]>([]);
  const [draftLegacy, setDraftLegacy] = useState<Record<string, string>>({});
  const [draftQty, setDraftQty] = useState<Record<string, number>>({});

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchRows = async (pageOverride?: number) => {
    try {
      setLoading(true);
      setLoadError(null);
      const pageToFetch = pageOverride ?? currentPage;
      const from = (pageToFetch - 1) * pageSize;
      const to = from + pageSize - 1;

      // For filtering and sorting, we need to fetch all data first
      const shouldFetchAll = medicationSort || selectedDosageForm || searchTerm.trim();
      
      let query = supabase
        .from('medicine_batches')
        .select('id,batch_number,current_quantity,legacy_code,medicine_id,medication_id', { count: 'exact' })
        .eq('is_active', true)
        .order('batch_number');

      // Always fetch all data for client-side filtering
      // This ensures medication name search works properly

      const { data, error, count } = await query;
      if (error) {
        console.error('Error fetching batches (Supabase raw):', error);
        console.error('Error fetching batches (Supabase):', {
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
          stringified: (() => {
            try {
              return JSON.stringify(error);
            } catch {
              return null;
            }
          })(),
        });

        const msg = (error.message || '').toLowerCase();
        if (msg.includes('legacy_code') && msg.includes('column')) {
          setLoadError('Missing column legacy_code in medicine_batches. Apply the migration and reload this page.');
        } else if (msg.includes('permission') || msg.includes('row level security') || msg.includes('rls')) {
          setLoadError('Permission denied while reading medicine_batches (RLS). Check Supabase RLS policies for this table.');
        } else {
          setLoadError(error.message || 'Failed to load batches.');
        }
        return;
      }

      const batchRowsRaw: BatchRowRaw[] = (data || []).map((r: any) => ({
        id: r.id as string,
        batch_number: r.batch_number as string,
        current_quantity: Number(r.current_quantity) || 0,
        legacy_code: r.legacy_code ?? null,
        medicine_ref_id: (r.medicine_id || r.medication_id || null) as string | null,
      }));

      const medicineIds = Array.from(
        new Set(batchRowsRaw.map((r: BatchRowRaw) => r.medicine_ref_id).filter(Boolean))
      ) as string[];

      let medNameById: Record<string, string> = {};
      let meds: any[] | null = null;
      if (medicineIds.length > 0) {
        const { data: medsData, error: medsError } = await supabase
          .from('medications')
          .select('id,name,dosage_form')
          .in('id', medicineIds);

        if (medsError) {
          console.error('Error fetching medications for batch validation:', {
            message: medsError.message,
            details: (medsError as any).details,
            hint: (medsError as any).hint,
            code: (medsError as any).code,
          });
        } else {
          meds = medsData;
          for (const m of meds || []) {
            medNameById[(m as any).id] = (m as any).name || '';
          }
          
          // Extract unique dosage forms
          const dosageForms = Array.from(
            new Set((meds || []).map((m: any) => m.dosage_form).filter(Boolean))
          ) as string[];
          setAvailableDosageForms(dosageForms);
        }
      }

      const nextRows: BatchRow[] = batchRowsRaw.map((r: BatchRowRaw) => {
        const med = meds?.find((m: any) => m.id === r.medicine_ref_id);
        const medicationName = r.medicine_ref_id ? (medNameById[r.medicine_ref_id] || '') : '';
        const dosageForm = med?.dosage_form || null;
        
        // Debug logging for specific medications
        if (medicationName.toLowerCase().includes('acitrom') || medicationName.toLowerCase().includes('zerodol')) {
          console.log('Found medication:', {
            batch_id: r.id,
            medication_name: medicationName,
            medicine_ref_id: r.medicine_ref_id,
            dosage_form: dosageForm
          });
        }
        
        return {
          ...r,
          medication_name: medicationName,
          dosage_form: dosageForm
        };
      });

      // Apply client-side filtering and sorting
      let filteredRows = nextRows;
      
      // Filter by search term (including medication names)
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) {
        console.log('Searching for:', trimmedSearch);
        console.log('All medication names:', nextRows.map(r => ({ name: r.medication_name, lower: r.medication_name.toLowerCase() })));
        console.log('Available medication names:', nextRows.map(r => r.medication_name).filter(name => name.toLowerCase().includes(trimmedSearch.toLowerCase())));
        
        filteredRows = filteredRows.filter(row => {
          const batchMatch = row.batch_number.toLowerCase().includes(trimmedSearch.toLowerCase());
          const medMatch = row.medication_name.toLowerCase().includes(trimmedSearch.toLowerCase());
          const legacyMatch = row.legacy_code && row.legacy_code.toLowerCase().includes(trimmedSearch.toLowerCase());
          
          // Debug logging for troubleshooting
          if (trimmedSearch.toLowerCase() === 'zero' || trimmedSearch.toLowerCase() === 'zerodol' || trimmedSearch.toLowerCase() === 'ze' || trimmedSearch.toLowerCase() === 'zer') {
            console.log('Search debug for "' + trimmedSearch + '":', {
              medication_name: row.medication_name,
              medication_name_lower: row.medication_name.toLowerCase(),
              search_term_lower: trimmedSearch.toLowerCase(),
              batchMatch,
              medMatch,
              legacyMatch,
              shouldInclude: batchMatch || medMatch || legacyMatch
            });
          }
          
          return batchMatch || medMatch || legacyMatch;
        });
        
        console.log('Filtered results count:', filteredRows.length);
      }
      
      // Filter by dosage form
      if (selectedDosageForm) {
        filteredRows = filteredRows.filter(row => row.dosage_form === selectedDosageForm);
      }
      
      // Sort by medication name
      if (medicationSort) {
        filteredRows = [...filteredRows].sort((a, b) => {
          const nameA = a.medication_name.toLowerCase();
          const nameB = b.medication_name.toLowerCase();
          return medicationSort === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
      }
      
      // Update total for filtered results
      setTotal(filteredRows.length);
      
      // Apply pagination
      const paginatedRows = filteredRows.slice(from, to + 1);
      setRows(paginatedRows);
      setDraftLegacy(prev => {
        const next = { ...prev };
        for (const r of nextRows) {
          if (next[r.id] === undefined) next[r.id] = r.legacy_code ?? '';
        }
        return next;
      });
      setDraftQty(prev => {
        const next = { ...prev };
        for (const r of nextRows) {
          if (next[r.id] === undefined) next[r.id] = r.current_quantity;
        }
        return next;
      });
    } catch (e) {
      const anyErr = e as any;
      console.error('Error fetching batches (unexpected):', {
        message: anyErr?.message,
        name: anyErr?.name,
        stack: anyErr?.stack,
        raw: anyErr,
      });
      setLoadError(anyErr?.message || 'Failed to load batches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [currentPage, pageSize, medicationSort, selectedDosageForm, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const rangeText = useMemo(() => {
    if (total === 0) return 'Showing 0-0 of 0';
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, total);
    return `Showing ${start}-${end} of ${total}`;
  }, [currentPage, pageSize, total]);

  const saveRow = async (id: string) => {
    try {
      setSavingId(id);
      const legacy_code = (draftLegacy[id] ?? '').trim() || null;
      const current_quantity = Number(draftQty[id]);

      const { error } = await supabase
        .from('medicine_batches')
        .update({ legacy_code, current_quantity, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setRows(prev => prev.map(r => (r.id === id ? { ...r, legacy_code, current_quantity } : r)));
    } catch (e) {
      console.error('Error saving batch row:', e);
      alert('Failed to save. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Batch Validation</h1>
            <p className="text-gray-600">Validate and update legacy codes</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by batch number, medication name, or legacy code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort by Medication Name</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMedicationSort(medicationSort === 'asc' ? null : 'asc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  medicationSort === 'asc'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                A-Z
              </button>
              <button
                onClick={() => setMedicationSort(medicationSort === 'desc' ? null : 'desc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  medicationSort === 'desc'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Z-A
              </button>
              {medicationSort && (
                <button
                  onClick={() => setMedicationSort(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Dosage Form</label>
            <select
              value={selectedDosageForm}
              onChange={(e) => setSelectedDosageForm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Dosage Forms</option>
              {availableDosageForms.map((form) => (
                <option key={form} value={form}>
                  {form}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">{rangeText}</div>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Prev
            </button>
            <div className="text-sm text-gray-700 font-medium">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
            {loadError}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No batches found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-3">
                    <div className="text-xs text-gray-500">Medication</div>
                    <div className="font-semibold text-gray-900 break-words">{r.medication_name || '-'}</div>
                    {r.dosage_form && (
                      <div className="text-xs text-gray-600 mt-1">{r.dosage_form}</div>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <div className="text-xs text-gray-500">Batch Number</div>
                    <div className="font-semibold text-gray-900 break-all">{r.batch_number}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-gray-500">Count</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDraftQty(prev => ({
                          ...prev,
                          [r.id]: Math.max(0, (prev[r.id] ?? r.current_quantity) - 1)
                        }))}
                        className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50"
                        type="button"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={draftQty[r.id] ?? r.current_quantity}
                        onChange={(e) => setDraftQty(prev => ({
                          ...prev,
                          [r.id]: Math.max(0, parseInt(e.target.value || '0', 10) || 0)
                        }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => setDraftQty(prev => ({
                          ...prev,
                          [r.id]: (prev[r.id] ?? r.current_quantity) + 1
                        }))}
                        className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50"
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-4">
                    <div className="text-xs text-gray-500">Legacy Code</div>
                    <input
                      value={draftLegacy[r.id] ?? ''}
                      onChange={(e) => setDraftLegacy(prev => ({ ...prev, [r.id]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter legacy code"
                    />
                  </div>
                  <div className="sm:col-span-2 flex sm:justify-end">
                    <button
                      onClick={() => saveRow(r.id)}
                      disabled={savingId === r.id}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {savingId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicBatchValidationPage;
