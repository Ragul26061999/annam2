'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download, Play, Package } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

type ImportStage = 'select' | 'preview' | 'importing' | 'complete';

type ImportMode = 'medications' | 'batches';

type DrugWiseBatch = {
  medicationName: string;
  batch_number: string;
  expiry_date: string;
  received_quantity: number;
  current_quantity: number;
  purchase_price: number;
  selling_price: number;
  vat_percent: number;
  packing: number;
};

type MedicationRow = {
  name: string;
  combination?: string;
  generic_name?: string;
  manufacturer?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  unit?: string;
  purchase_price?: number;
  selling_price?: number;
  mrp?: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  prescription_required?: boolean;
  hsn_code?: string;
  gst_percent?: number;
  cgst_percent?: number;
  sgst_percent?: number;
  igst_percent?: number;
};

interface ParsedData {
  mode: ImportMode;
  medications?: Map<string, DrugWiseBatch[]>;
  medicationRows?: MedicationRow[];
  errors: string[];
  totalMedications: number;
  totalBatches: number;
}

interface ImportProgress {
  current: number;
  total: number;
  currentMedication: string;
  success: number;
  failed: number;
  errors: string[];
}

const UploadBulkPage = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<ImportStage>('select');
  const [mode, setMode] = useState<ImportMode>('medications');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    currentMedication: '',
    success: 0,
    failed: 0,
    errors: []
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStage('select');
      setParsedData(null);
      setProgress({ current: 0, total: 0, currentMedication: '', success: 0, failed: 0, errors: [] });
    }
  };

  const handleParseFile = async () => {
    if (!file) return;

    try {
      const text = await file.text();

      const looksLikeDrugWiseReport = (t: string) => {
        const head = t.slice(0, 2000).toLowerCase();
        return head.includes('drug wise stock report') || head.includes('drug name') || head.includes('batch') && head.includes('exp');
      };

      if (mode === 'batches') {
        const parsed = parseDrugWiseStockReportCSV(text);

        if (parsed.medications.size === 0) {
          alert('No valid medications/batches found in the file. Please check the CSV format.');
          return;
        }

        const totalBatches = Array.from(parsed.medications.values()).reduce((sum, batches) => sum + batches.length, 0);

        setParsedData({
          mode,
          medications: parsed.medications,
          medicationRows: undefined,
          errors: parsed.errors,
          totalMedications: parsed.medications.size,
          totalBatches
        });
      } else {
        const parsed = parseMedicationTemplateCSV(text);

        if (parsed.rows.length === 0) {
          if (looksLikeDrugWiseReport(text)) {
            alert('This file looks like a Drug Wise Stock Report. Please switch to "Upload Batches" and try again.');
            return;
          }
          const extra = parsed.errors.length ? `\n\nDetails:\n- ${parsed.errors.slice(0, 5).join('\n- ')}` : '';
          alert(`No valid medications found in the file. Please check the CSV format.${extra}`);
          return;
        }

        setParsedData({
          mode,
          medications: undefined,
          medicationRows: parsed.rows,
          errors: parsed.errors,
          totalMedications: parsed.rows.length,
          totalBatches: 0
        });
      }

      setStage('preview');
    } catch (error: any) {
      alert(`Error parsing file: ${error.message}`);
    }
  };

  const normalizeMedicationName = (name: string) => name.trim().replace(/\s+/g, ' ');

  const parseNumber = (value: string | undefined): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[^0-9.\-]/g, '').trim();
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  const parseDDMMYYYYToISO = (value: string | undefined): string | null => {
    if (!value) return null;
    const raw = value.trim().split(' ')[0];
    const match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!match) return null;
    const d = Number(match[1]);
    const m = Number(match[2]);
    const y = Number(match[3]);
    if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dt = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(dt.getTime())) return null;
    const check = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
    if (check !== iso) return null;
    return iso;
  };

  const parseBoolean = (value: string | undefined): boolean | undefined => {
    if (value == null) return undefined;
    const v = value.trim().toLowerCase();
    if (!v) return undefined;
    if (v === 'true' || v === 'yes' || v === '1') return true;
    if (v === 'false' || v === 'no' || v === '0') return false;
    return undefined;
  };

  const parseMedicationTemplateCSV = (text: string): { rows: MedicationRow[]; errors: string[] } => {
    const errors: string[] = [];
    const lines = text
      .split(/\r?\n/)
      .map(l => l.replace(/\r/g, ''))
      .filter(l => l.trim() !== '');

    if (lines.length === 0) return { rows: [], errors };

    const header = lines[0].split(',').map(h => h.trim());
    const headerKey = (h: string) => h.toLowerCase().trim();
    const idx: Record<string, number> = {};
    for (let i = 0; i < header.length; i++) {
      const k = headerKey(header[i] || '');
      if (!k) continue;
      idx[k] = i;
    }

    if (typeof idx['name'] !== 'number') {
      errors.push('Missing required header: "name"');
      return { rows: [], errors };
    }

    const get = (cells: string[], key: string) => {
      const pos = idx[headerKey(key)];
      if (typeof pos !== 'number') return '';
      return (cells[pos] || '').trim();
    };

    const rows: MedicationRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',');
      const name = get(cells, 'name');
      if (!name) {
        errors.push(`line ${i + 1}: missing name`);
        continue;
      }

      const purchase_price = parseNumber(get(cells, 'purchase_price'));
      const selling_price = parseNumber(get(cells, 'selling_price'));
      const mrp = parseNumber(get(cells, 'mrp'));
      const minimum_stock_level = parseNumber(get(cells, 'minimum_stock_level'));
      const maximum_stock_level = parseNumber(get(cells, 'maximum_stock_level'));
      const gst_percent = parseNumber(get(cells, 'gst_percent'));
      const cgst_percent = parseNumber(get(cells, 'cgst_percent'));
      const sgst_percent = parseNumber(get(cells, 'sgst_percent'));
      const igst_percent = parseNumber(get(cells, 'igst_percent'));

      rows.push({
        name: normalizeMedicationName(name),
        combination: get(cells, 'combination') || undefined,
        generic_name: get(cells, 'generic_name') || undefined,
        manufacturer: get(cells, 'manufacturer') || undefined,
        category: get(cells, 'category') || undefined,
        dosage_form: get(cells, 'dosage_form') || undefined,
        strength: get(cells, 'strength') || undefined,
        unit: get(cells, 'unit') || undefined,
        purchase_price: Number.isFinite(purchase_price) ? purchase_price : undefined,
        selling_price: Number.isFinite(selling_price) ? selling_price : undefined,
        mrp: Number.isFinite(mrp) ? mrp : undefined,
        minimum_stock_level: Number.isFinite(minimum_stock_level) ? minimum_stock_level : undefined,
        maximum_stock_level: Number.isFinite(maximum_stock_level) ? maximum_stock_level : undefined,
        prescription_required: parseBoolean(get(cells, 'prescription_required')),
        hsn_code: get(cells, 'hsn_code') || undefined,
        gst_percent: Number.isFinite(gst_percent) ? gst_percent : undefined,
        cgst_percent: Number.isFinite(cgst_percent) ? cgst_percent : undefined,
        sgst_percent: Number.isFinite(sgst_percent) ? sgst_percent : undefined,
        igst_percent: Number.isFinite(igst_percent) ? igst_percent : undefined
      });
    }

    return { rows, errors };
  };

  const parseDrugWiseStockReportCSV = (text: string): { medications: Map<string, DrugWiseBatch[]>; errors: string[] } => {
    const errors: string[] = [];
    const medicationMap = new Map<string, DrugWiseBatch[]>();
    const lines = text
      .split(/\r?\n/)
      .map(l => l.replace(/\r/g, ''));

    console.log('🔍 Starting CSV parse, total lines:', lines.length);

    let currentMedicationName: string | null = null;
    let headerIndex: Record<string, number> | null = null;

    const isMostlyEmpty = (line: string) => !line.trim() || /^,\s*,\s*,/.test(line) || line.replace(/,/g, '').trim() === '';

    const normalizeHeaderKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

    const toDenseCells = (cells: string[]) => cells.map(c => c.trim()).filter(Boolean);

    const buildHeaderIndex = (cells: string[]) => {
      const idx: Record<string, number> = {};
      const dense = toDenseCells(cells);
      for (let i = 0; i < dense.length; i++) {
        const raw = dense[i];
        if (!raw) continue;
        idx[normalizeHeaderKey(raw)] = i;
      }
      return idx;
    };

    const getCell = (cells: string[], idx: Record<string, number>, keys: string[]) => {
      const dense = toDenseCells(cells);
      for (const k of keys) {
        const pos = idx[normalizeHeaderKey(k)];
        if (typeof pos === 'number' && pos >= 0 && pos < dense.length) {
          const v = (dense[pos] || '').trim();
          if (v) return v;
        }
      }
      return '';
    };

    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
      const line = lines[lineNo];
      if (isMostlyEmpty(line)) continue;

      const cells = line.split(',');
      const firstCell = (cells[0] || '').trim();

      if (normalizeHeaderKey(firstCell) === 'drugname') {
        const candidates = cells.slice(1).map(c => c.trim()).filter(Boolean);
        const nameCell = candidates.length ? candidates[candidates.length - 1] : '';
        if (nameCell) {
          currentMedicationName = normalizeMedicationName(nameCell);
          console.log('📦 Found medication section:', currentMedicationName);
        }
        continue;
      }

      if (cells.some(c => normalizeHeaderKey(c.trim()) === 'slno') && cells.some(c => normalizeHeaderKey(c.trim()) === 'batch')) {
        headerIndex = buildHeaderIndex(cells);
        console.log('📋 Found header row, keys:', Object.keys(headerIndex));
        continue;
      }

      if (!headerIndex) continue;
      if (!/^\d+$/.test(firstCell)) continue;

      const medNameFromRow = getCell(cells, headerIndex, ['drug name', 'drugname', 'name']);
      const medicationName = normalizeMedicationName(currentMedicationName || medNameFromRow || '');
      if (!medicationName) continue;

      const batchNumber = getCell(cells, headerIndex, ['batch', 'batchno', 'batchnumber']);
      const expiryRaw = getCell(cells, headerIndex, ['exp. date', 'exp date', 'expirydate', 'expiry date']);
      if (!batchNumber || !expiryRaw) {
        console.log('⚠️ Skipping row - missing batch or expiry:', { medicationName, batchNumber, expiryRaw });
        continue;
      }

      const expiryISO = parseDDMMYYYYToISO(expiryRaw);
      if (!expiryISO) {
        errors.push(`${medicationName} [line ${lineNo + 1}]: invalid expiry date "${expiryRaw}"`);
        continue;
      }

      const purQty = parseNumber(getCell(cells, headerIndex, ['pur qty', 'purqty', 'purchaseqty', 'purchase qty']));
      const stockQty = parseNumber(getCell(cells, headerIndex, ['stock_qty', 'stock qty', 'stockqty', 'stock']));
      const rate = parseNumber(getCell(cells, headerIndex, ['rate', 'purchaseprice', 'purchase price']));
      const mrp = parseNumber(getCell(cells, headerIndex, ['mrp', 'sellingprice', 'selling price']));
      const packing = parseNumber(getCell(cells, headerIndex, ['packing', 'pack']));
      const vat = parseNumber(getCell(cells, headerIndex, ['vat', 'gst', 'gst%']));

      const batch: DrugWiseBatch = {
        medicationName,
        batch_number: batchNumber,
        expiry_date: expiryISO,
        received_quantity: Math.max(0, Math.trunc(purQty)),
        current_quantity: Math.max(0, Math.trunc(stockQty)),
        purchase_price: Math.max(0, rate),
        selling_price: Math.max(0, mrp),
        vat_percent: Math.max(0, vat),
        packing: Math.max(0, Math.trunc(packing))
      };

      const key = medicationName.toLowerCase();
      const list = medicationMap.get(key) || [];
      list.push(batch);
      medicationMap.set(key, list);
      console.log('✅ Added batch:', { medicationName, batch_number: batchNumber, expiry: expiryISO, qty: stockQty });
    }

    for (const [key, batches] of medicationMap.entries()) {
      const seen = new Set<string>();
      const deduped: DrugWiseBatch[] = [];
      for (const b of batches) {
        const k = `${b.batch_number}__${b.expiry_date}`;
        if (seen.has(k)) continue;
        seen.add(k);
        deduped.push(b);
      }
      medicationMap.set(key, deduped);
    }

    console.log('🎉 Parse complete! Found:', medicationMap.size, 'medications with', Array.from(medicationMap.values()).reduce((sum, b) => sum + b.length, 0), 'batches');
    console.log('Medications:', Array.from(medicationMap.keys()));

    return { medications: medicationMap, errors };
  };

  const generateMedicineCode = (name: string) => {
    const base = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'MED';
    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `${base}-${suffix}`;
  };

  const findMedicationIdByName = async (name: string): Promise<{ id: string; name: string } | null> => {
    const exact = await supabase
      .from('medications')
      .select('id, name')
      .eq('name', name)
      .limit(1);
    if (!exact.error && exact.data && exact.data.length) return exact.data[0] as any;

    const ilike = await supabase
      .from('medications')
      .select('id, name')
      .ilike('name', name)
      .limit(1);
    if (!ilike.error && ilike.data && ilike.data.length) return ilike.data[0] as any;
    return null;
  };

  const replaceExistingBatches = async (medicationId: string) => {
    // Canonical FK is medicine_id (per PHARMACY_DATABASE_SCHEMA.md).
    // Using non-existent columns (like medication_id) will cause PostgREST 400 errors.
    const del = await supabase.from('medicine_batches').delete().eq('medicine_id', medicationId);
    if (!del.error) return;

    await supabase.from('medicine_batches').update({ is_active: false }).eq('medicine_id', medicationId);
  };

  const upsertMedicationFromRow = async (row: MedicationRow): Promise<{ id: string } | null> => {
    const existing = await findMedicationIdByName(row.name);
    if (existing) {
      const { error } = await supabase
        .from('medications')
        .update({
          name: row.name,
          combination: row.combination || null,
          generic_name: row.generic_name || null,
          manufacturer: row.manufacturer || null,
          category: row.category || null,
          dosage_form: row.dosage_form || null,
          strength: row.strength || null,
          unit: row.unit || 'units',
          purchase_price: row.purchase_price ?? 0,
          selling_price: row.selling_price ?? 0,
          mrp: row.mrp ?? row.selling_price ?? 0,
          minimum_stock_level: row.minimum_stock_level ?? 10,
          maximum_stock_level: row.maximum_stock_level ?? null,
          prescription_required: row.prescription_required ?? false,
          hsn_code: row.hsn_code || null,
          gst_percent: row.gst_percent ?? null,
          cgst_percent: row.cgst_percent ?? null,
          sgst_percent: row.sgst_percent ?? null,
          igst_percent: row.igst_percent ?? null,
          status: 'active',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Medication update error:', error);
        throw error;
      }
      return { id: existing.id };
    }

    const { data: created, error: createError } = await supabase
      .from('medications')
      .insert({
        medicine_code: generateMedicineCode(row.name),
        name: row.name,
        combination: row.combination || null,
        generic_name: row.generic_name || null,
        manufacturer: row.manufacturer || null,
        category: row.category || null,
        dosage_form: row.dosage_form || null,
        strength: row.strength || null,
        unit: row.unit || 'units',
        purchase_price: row.purchase_price ?? 0,
        selling_price: row.selling_price ?? 0,
        mrp: row.mrp ?? row.selling_price ?? 0,
        minimum_stock_level: row.minimum_stock_level ?? 10,
        maximum_stock_level: row.maximum_stock_level ?? null,
        prescription_required: row.prescription_required ?? false,
        hsn_code: row.hsn_code || null,
        gst_percent: row.gst_percent ?? null,
        cgst_percent: row.cgst_percent ?? null,
        sgst_percent: row.sgst_percent ?? null,
        igst_percent: row.igst_percent ?? null,
        total_stock: 0,
        available_stock: 0,
        status: 'active',
        is_active: true
      })
      .select('id')
      .single();

    if (createError || !created) {
        console.error('Medication insert error:', createError);
        throw createError;
      }
    return { id: (created as any).id };
  };

  const handleStartImport = async () => {
    if (!parsedData) return;

    setStage('importing');
    setProgress({
      current: 0,
      total: parsedData.totalMedications,
      currentMedication: '',
      success: 0,
      failed: 0,
      errors: [...parsedData.errors]
    });

    try {
      let success = 0;
      let failed = 0;
      const errors: string[] = [...parsedData.errors];
      let current = 0;

      if (parsedData.mode === 'medications') {
        const rows = parsedData.medicationRows || [];
        for (const row of rows) {
          const medicationName = row.name;
          current++;
          setProgress(prev => ({ ...prev, current, currentMedication: medicationName }));

          try {
            await upsertMedicationFromRow(row);
            success++;
            setProgress(prev => ({ ...prev, success }));
          } catch (err: any) {
            failed++;
            errors.push(`${medicationName}: ${err?.message || 'unknown error'}`);
            setProgress(prev => ({ ...prev, failed, errors }));
          }
        }
      } else {
        const medications = parsedData.medications;
        if (!medications) throw new Error('No parsed batch data present');

        for (const [, batches] of medications.entries()) {
          const medicationName = batches[0]?.medicationName;
          if (!medicationName) continue;

          current++;
          setProgress(prev => ({ ...prev, current, currentMedication: medicationName }));

          try {
            const existing = await findMedicationIdByName(medicationName);

            let medicationId: string;
            if (existing) {
              medicationId = existing.id;
            } else {
              const payload = {
                name: medicationName,
                unit: 'units',
                total_stock: 0,
                available_stock: 0,
                minimum_stock_level: 10,
                status: 'active',
                is_active: true
              };
              console.log('Inserting medication payload:', payload);
              const { data: created, error: createError } = await supabase
                .from('medications')
                .insert(payload)
                .select('id, name')
                .single();

              if (createError || !created) {
                failed++;
                console.error('Medication insert error:', createError);
                errors.push(`${medicationName}: failed to create medication - ${createError?.message || JSON.stringify(createError) || 'unknown error'}`);
                continue;
              }

              medicationId = (created as any).id;
            }

            await replaceExistingBatches(medicationId);

            const batchRows = batches.map(b => ({
              medicine_id: medicationId,
              batch_number: b.batch_number,
              expiry_date: b.expiry_date,
              current_quantity: b.current_quantity,
              received_quantity: b.received_quantity || b.current_quantity,
              received_date: new Date().toISOString().split('T')[0],
              purchase_price: b.purchase_price,
              selling_price: b.selling_price,
              status: 'active',
              is_active: true
            }));

            const { error: batchError } = await supabase
              .from('medicine_batches')
              .insert(batchRows);
            if (batchError) {
              console.error('Batch insert error:', batchError);
              failed++;
              errors.push(`${medicationName}: failed inserting batches - ${batchError.message}`);
              continue;
            }

            const totalStock = batchRows.reduce((sum, r) => sum + (Number(r.current_quantity) || 0), 0);
            const lastPricing = batchRows.find(r => r.purchase_price || r.selling_price);

            const { error: updateError } = await supabase
              .from('medications')
              .update({
                total_stock: totalStock,
                available_stock: totalStock,
                purchase_price: lastPricing?.purchase_price || 0,
                selling_price: lastPricing?.selling_price || 0,
                mrp: lastPricing?.selling_price || 0,
                updated_at: new Date().toISOString(),
                is_active: true,
                status: 'active'
              })
              .eq('id', medicationId);

            if (updateError) {
              console.error('Medication stock update error:', updateError);
              failed++;
              errors.push(`${medicationName}: batches inserted but failed to update stock totals - ${updateError.message}`);
              continue;
            }

            success++;
            setProgress(prev => ({ ...prev, success }));
          } catch (err: any) {
            failed++;
            errors.push(`${medicationName}: ${err?.message || 'unknown error'}`);
            setProgress(prev => ({ ...prev, failed, errors }));
          }
        }
      }

      setProgress(prev => ({ ...prev, currentMedication: 'Complete!' }));
      setStage('complete');
    } catch (error: any) {
      alert(`Error during import: ${error.message}`);
      setStage('preview');
    }
  };

  const downloadTemplate = () => {
    const template = `name,combination,generic_name,manufacturer,category,dosage_form,strength,unit,purchase_price,selling_price,mrp,minimum_stock_level,maximum_stock_level,prescription_required,hsn_code,gst_percent,cgst_percent,sgst_percent,igst_percent
Paracetamol 500mg,Paracetamol,Paracetamol,ABC Pharma,Analgesic,Tablet,500mg,tablets,2.50,5.00,5.00,100,1000,false,30049099,12,6,6,12
Amoxicillin 250mg,Amoxicillin,Amoxicillin,XYZ Pharma,Antibiotic,Capsule,250mg,capsules,5.00,10.00,10.00,50,500,true,30042090,12,6,6,12`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medication_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/settings/pharmacy')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Pharmacy Settings</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bulk Upload</h1>
              <p className="text-gray-600">Upload medications master or stock batches from CSV</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Choose Upload Type</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('medications');
                setStage('select');
                setParsedData(null);
                setProgress({ current: 0, total: 0, currentMedication: '', success: 0, failed: 0, errors: [] });
              }}
              className={`px-4 py-3 rounded-lg border-2 text-left transition-all duration-200 ${
                mode === 'medications'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-900">Upload Medications</div>
              <div className="text-sm text-gray-600">Create/update medication master data</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('batches');
                setStage('select');
                setParsedData(null);
                setProgress({ current: 0, total: 0, currentMedication: '', success: 0, failed: 0, errors: [] });
              }}
              className={`px-4 py-3 rounded-lg border-2 text-left transition-all duration-200 ${
                mode === 'batches'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-900">Upload Batches</div>
              <div className="text-sm text-gray-600">Import stock batches (Drug Wise Stock Report)</div>
            </button>
          </div>
        </div>

        {/* Instructions Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Instructions
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            {mode === 'medications' ? (
              <>
                <li>• Download the template CSV file below</li>
                <li>• Fill in your medication master data following the template format</li>
                <li>• Required fields: name (prices optional but recommended)</li>
                <li>• Upload the completed CSV file and preview</li>
              </>
            ) : (
              <>
                <li>• Upload the Drug Wise Stock Report CSV</li>
                <li>• The import will create the medication (if missing) and then import its batches</li>
                <li>• Existing batches for the medication will be replaced</li>
              </>
            )}
          </ul>
        </div>

        {/* Template Download */}
        {mode === 'medications' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Download Template</h3>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
          </div>
        )}

        {/* Stage 1: File Selection */}
        {stage === 'select' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Upload CSV File</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Choose CSV File
              </label>
              
              {file && (
                <div className="mt-4 text-sm text-gray-600">
                  Selected: <span className="font-semibold">{file.name}</span>
                </div>
              )}
            </div>

            {file && (
              <button
                onClick={handleParseFile}
                className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Parse & Preview
              </button>
            )}
          </div>
        )}

        {/* Stage 2: Preview & Stats */}
        {stage === 'preview' && parsedData && (
          <>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Import Preview
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm text-purple-700 mb-1">Total Medications</div>
                  <div className="text-3xl font-bold text-purple-700">{parsedData.totalMedications}</div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-700 mb-1">Total Batches</div>
                  <div className="text-3xl font-bold text-blue-700">{parsedData.totalBatches}</div>
                </div>
              </div>

              {parsedData.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Parse Warnings ({parsedData.errors.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {parsedData.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        • {error}
                      </div>
                    ))}
                    {parsedData.errors.length > 5 && (
                      <div className="text-sm text-yellow-600 italic">...and {parsedData.errors.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleStartImport}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold"
              >
                <Play className="w-5 h-5" />
                Start Import ({parsedData.totalMedications} {parsedData.mode === 'batches' ? 'medications' : 'rows'})
              </button>
            </div>

            {/* Detailed preview for batches mode */}
            {parsedData.mode === 'batches' && parsedData.medications && (
              <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Medications & Batches Preview
                </h4>
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {Array.from(parsedData.medications.entries()).map(([key, batches]) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="font-semibold text-gray-800 mb-2">{batches[0]?.medicationName || key}</div>
                      <div className="text-sm text-gray-600 mb-2">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left p-2">Batch</th>
                            <th className="text-left p-2">Expiry</th>
                            <th className="text-right p-2">Stock</th>
                            <th className="text-right p-2">Purchase</th>
                            <th className="text-right p-2">Selling</th>
                            <th className="text-right p-2">VAT%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batches.map((b, idx) => (
                            <tr key={idx} className="border-t border-gray-100">
                              <td className="p-2 font-mono text-xs">{b.batch_number}</td>
                              <td className="p-2 text-xs">{b.expiry_date}</td>
                              <td className="p-2 text-right">{b.current_quantity}</td>
                              <td className="p-2 text-right">{b.purchase_price.toFixed(2)}</td>
                              <td className="p-2 text-right">{b.selling_price.toFixed(2)}</td>
                              <td className="p-2 text-right">{b.vat_percent}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed preview for medications mode */}
            {parsedData.mode === 'medications' && parsedData.medicationRows && (
              <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Medications Preview
                </h4>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Generic</th>
                        <th className="text-left p-2">Form</th>
                        <th className="text-left p-2">Strength</th>
                        <th className="text-right p-2">Purchase</th>
                        <th className="text-right p-2">Selling</th>
                        <th className="text-right p-2">Stock Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.medicationRows.map((row, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="p-2 font-medium">{row.name}</td>
                          <td className="p-2">{row.generic_name || '-'}</td>
                          <td className="p-2">{row.dosage_form || '-'}</td>
                          <td className="p-2">{row.strength || '-'}</td>
                          <td className="p-2 text-right">{row.purchase_price ? row.purchase_price.toFixed(2) : '-'}</td>
                          <td className="p-2 text-right">{row.selling_price ? row.selling_price.toFixed(2) : '-'}</td>
                          <td className="p-2 text-right">{row.minimum_stock_level ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Stage 3: Importing Progress */}
        {stage === 'importing' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Importing Medications...</h3>
            
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress: {progress.current} / {progress.total}</span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-semibold">Currently processing:</span>
              </div>
              <div className="text-lg font-bold text-blue-900 mt-1">{progress.currentMedication}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-700 mb-1">Success</div>
                <div className="text-2xl font-bold text-green-700">{progress.success}</div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-700 mb-1">Failed</div>
                <div className="text-2xl font-bold text-red-700">{progress.failed}</div>
              </div>
            </div>
          </div>
        )}

        {/* Stage 4: Complete */}
        {stage === 'complete' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Import Complete
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Success</span>
                </div>
                <div className="text-3xl font-bold text-green-700">{progress.success}</div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Failed</span>
                </div>
                <div className="text-3xl font-bold text-red-700">{progress.failed}</div>
              </div>
            </div>

            {progress.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {progress.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700">
                      {index + 1}. {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/settings/pharmacy/edit-medication')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200"
              >
                View Medications
              </button>
              <button
                onClick={() => {
                  setStage('select');
                  setFile(null);
                  setParsedData(null);
                  setProgress({ current: 0, total: 0, currentMedication: '', success: 0, failed: 0, errors: [] });
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadBulkPage;
