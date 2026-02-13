import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

// Parse expiry date from various formats (same as main upload)
function parseExpiryDate(value: any): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Excel serial number
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 0 && serial < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = Math.round(serial * 24 * 60 * 60 * 1000);
      const dt = new Date(excelEpoch.getTime() + ms);
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dt.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // YYYY-MM-DD
  const ymd = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`;

  // DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;

  // MM-YYYY
  const my = raw.match(/^(\d{1,2})[\/-](\d{4})$/);
  if (my) {
    const mo = Number(my[1]);
    const yr = Number(my[2]);
    const lastDay = new Date(yr, mo, 0).getDate();
    return `${yr}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  return null;
}

interface PreviewMedication {
  name: string;
  combination?: string;
  brand?: string;
  product?: string;
  category: string;
  batches: PreviewBatch[];
  status: 'new' | 'existing';
  existingMedicationId?: string;
}

interface PreviewBatch {
  batchNumber: string;
  expiryDate: string | null;
  quantity: number;
  purchaseRate: number;
  mrp: number;
  status: 'new' | 'existing' | 'duplicate';
  existingBatchId?: string;
  expiryStatus: 'valid' | 'expired' | 'expiring-soon';
}

interface PreviewResult {
  sheets: {
    name: string;
    rowCount: number;
    validRows: number;
    invalidRows: number;
  }[];
  medications: {
    total: number;
    new: number;
    existing: number;
  };
  batches: {
    total: number;
    new: number;
    existing: number;
    duplicate: number;
    expired: number;
    expiringSoon: number;
  };
  previewData: PreviewMedication[];
  errors: {
    row: number;
    sheet: string;
    message: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer as any);

    const result: PreviewResult = {
      sheets: [],
      medications: {
        total: 0,
        new: 0,
        existing: 0
      },
      batches: {
        total: 0,
        new: 0,
        existing: 0,
        duplicate: 0,
        expired: 0,
        expiringSoon: 0
      },
      previewData: [],
      errors: []
    };

    // Pre-load all existing medications and batches for comparison
    const { data: existingMeds } = await supabase
      .from('medications')
      .select('id, name');

    const { data: existingBatches } = await supabase
      .from('medicine_batches')
      .select('id, medicine_id, batch_number, expiry_date');

    const medicationMap = new Map<string, string>(); // name -> id
    const batchMap = new Map<string, string>(); // medicineId-batchNumber -> id

    if (existingMeds) {
      existingMeds.forEach(med => {
        medicationMap.set(med.name.toLowerCase().trim(), med.id);
      });
    }

    if (existingBatches) {
      existingBatches.forEach(batch => {
        batchMap.set(`${batch.medicine_id}-${batch.batch_number}`, batch.id);
      });
    }

    const medicationData = new Map<string, PreviewMedication>();

    // Process each sheet
    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;
      let validRows = 0;
      let invalidRows = 0;

      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber] = String(cell.value || '').trim();
      });

      // Map column names
      const colMap: Record<string, number> = {};
      headers.forEach((h, idx) => {
        if (!h) return;
        const lower = h.toLowerCase().replace(/\s+/g, '');
        if (lower.includes('medicine')) colMap['medicine'] = idx;
        else if (lower.includes('batchno') || lower === 'batchno') colMap['batch'] = idx;
        else if (lower.includes('purchaserat') || lower.includes('purchaserate')) colMap['purchaseRate'] = idx;
        else if (lower === 'mrp') colMap['mrp'] = idx;
        else if (lower.includes('expiry') || lower.includes('expirydt')) colMap['expiry'] = idx;
        else if (lower === 'qty' || lower === 'quantity') colMap['qty'] = idx;
        else if (lower === 'pack') colMap['pack'] = idx;
        else if (lower.includes('combination')) colMap['combination'] = idx;
        else if (lower.includes('iv') || lower.includes('im')) colMap['route'] = idx;
        else if (lower.includes('ampolue') || lower.includes('ampoule')) colMap['ampoule'] = idx;
        else if (lower.includes('brand')) colMap['brand'] = idx;
        else if (lower.includes('product')) colMap['product'] = idx;
      });

      if (!colMap['medicine']) {
        result.errors.push({
          row: 0,
          sheet: sheetName,
          message: `Could not find "Medicine" column`
        });
        continue;
      }

      // Process each data row
      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);

        const getCellValue = (key: string): any => {
          const colIdx = colMap[key];
          if (!colIdx) return null;
          const cell = row.getCell(colIdx);
          return cell.value;
        };

        const medicineName = String(getCellValue('medicine') || '').trim();
        if (!medicineName) {
          invalidRows++;
          continue; // Skip empty rows
        }

        validRows++;

        const batchNumber = String(getCellValue('batch') || '').trim();
        const purchaseRate = parseFloat(String(getCellValue('purchaseRate') || '0')) || 0;
        const mrp = parseFloat(String(getCellValue('mrp') || '0')) || 0;
        const expiryRaw = getCellValue('expiry');
        const qty = parseFloat(String(getCellValue('qty') || '0')) || 0;
        const combination = String(getCellValue('combination') || '').trim();
        const brand = String(getCellValue('brand') || '').trim();
        const product = String(getCellValue('product') || '').trim();

        // Determine category
        const lower = `${medicineName} ${combination} ${product}`.toLowerCase();
        let category = 'General Medicine';
        if (lower.includes('injection') || lower.includes('iv') || lower.includes('im')) category = 'Injectable';
        else if (lower.includes('tablet') || lower.includes('tab')) category = 'Tablet';
        else if (lower.includes('capsule') || lower.includes('cap')) category = 'Capsule';
        else if (lower.includes('syrup') || lower.includes('suspension') || lower.includes('liquid')) category = 'Liquid';
        else if (lower.includes('cream') || lower.includes('ointment') || lower.includes('gel')) category = 'Topical';

        // Check if medication exists
        const existingMedId = medicationMap.get(medicineName.toLowerCase().trim());
        const medStatus = existingMedId ? 'existing' : 'new';

        // Get or create medication in preview data
        let medPreview = medicationData.get(medicineName);
        if (!medPreview) {
          medPreview = {
            name: medicineName,
            combination: combination || undefined,
            brand: brand || undefined,
            product: product || undefined,
            category,
            batches: [],
            status: medStatus,
            existingMedicationId: existingMedId
          };
          medicationData.set(medicineName, medPreview);
        }

        // Process batch if exists
        if (batchNumber) {
          const expiryDate = parseExpiryDate(expiryRaw);
          
          // Check expiry status
          let expiryStatus: 'valid' | 'expired' | 'expiring-soon' = 'valid';
          if (expiryDate) {
            const expiry = new Date(expiryDate);
            const now = new Date();
            const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
            
            if (expiry < now) {
              expiryStatus = 'expired';
            } else if (expiry < threeMonthsFromNow) {
              expiryStatus = 'expiring-soon';
            }
          }

          // Check if batch exists
          let batchStatus: 'new' | 'existing' | 'duplicate' = 'new';
          let existingBatchId: string | undefined;

          if (existingMedId) {
            const batchKey = `${existingMedId}-${batchNumber}`;
            existingBatchId = batchMap.get(batchKey);
            if (existingBatchId) {
              batchStatus = 'existing';
            }
          }

          medPreview.batches.push({
            batchNumber,
            expiryDate,
            quantity: qty,
            purchaseRate,
            mrp,
            status: batchStatus,
            existingBatchId,
            expiryStatus
          });
        }
      }

      result.sheets.push({
        name: sheetName,
        rowCount: worksheet.rowCount - 1, // Exclude header
        validRows,
        invalidRows
      });
    }

    // Calculate totals
    result.previewData = Array.from(medicationData.values());
    result.medications.total = result.previewData.length;
    result.medications.new = result.previewData.filter(m => m.status === 'new').length;
    result.medications.existing = result.previewData.filter(m => m.status === 'existing').length;

    result.previewData.forEach(med => {
      result.batches.total += med.batches.length;
      result.batches.new += med.batches.filter(b => b.status === 'new').length;
      result.batches.existing += med.batches.filter(b => b.status === 'existing').length;
      result.batches.duplicate += med.batches.filter(b => b.status === 'duplicate').length;
      result.batches.expired += med.batches.filter(b => b.expiryStatus === 'expired').length;
      result.batches.expiringSoon += med.batches.filter(b => b.expiryStatus === 'expiring-soon').length;
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
