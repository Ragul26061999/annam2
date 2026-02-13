import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '../../../../src/lib/supabase-admin';
import ExcelJS from 'exceljs';

// Generate a unique medication code
function generateMedicationCode(name: string, index: number): string {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `MED-${prefix}-${timestamp}${index}`;
}

// Derive category from medication name or combination
function deriveCategory(name: string, combination: string, product: string): string {
  const lower = `${name} ${combination} ${product}`.toLowerCase();

  if (lower.includes('injection') || lower.includes('iv') || lower.includes('im')) return 'Injectable';
  if (lower.includes('tablet') || lower.includes('tab')) return 'Tablet';
  if (lower.includes('capsule') || lower.includes('cap')) return 'Capsule';
  if (lower.includes('syrup') || lower.includes('suspension') || lower.includes('liquid')) return 'Liquid';
  if (lower.includes('cream') || lower.includes('ointment') || lower.includes('gel')) return 'Topical';
  if (lower.includes('drop') || lower.includes('eye') || lower.includes('ear')) return 'Drops';
  if (lower.includes('inhaler') || lower.includes('nebulizer')) return 'Respiratory';
  if (lower.includes('powder') || lower.includes('sachet')) return 'Powder';
  return 'General Medicine';
}

// Parse expiry date from various formats
function parseExpiryDate(value: any): string | null {
  if (!value) return null;

  // Already a Date object (from ExcelJS)
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

  // MMM-YY or MMM-YYYY
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  const mmmyy = raw.match(/^([a-zA-Z]{3})[\s\-\/](\d{2,4})$/);
  if (mmmyy) {
    const mo = months[mmmyy[1].toLowerCase()];
    let yr = Number(mmmyy[2]);
    if (yr < 100) yr += 2000;
    if (mo) {
      const lastDay = new Date(yr, mo, 0).getDate();
      return `${yr}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  return null;
}

interface RowResult {
  row: number;
  sheet: string;
  medicineName: string;
  batchNumber: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = requireSupabaseAdmin();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer as any);

    const results: RowResult[] = [];
    let totalProcessed = 0;
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Cache for medication lookups to avoid repeated DB calls
    const medicationCache = new Map<string, string>(); // name -> id

    // Pre-load all existing medications into cache
    const { data: existingMeds } = await supabase
      .from('medications')
      .select('id, name');

    if (existingMeds) {
      for (const med of existingMeds) {
        medicationCache.set(med.name.toLowerCase().trim(), med.id);
      }
    }

    // Process each sheet
    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;

      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber] = String(cell.value || '').trim();
      });

      // Map column names (handle variations between sheets)
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
        results.push({
          row: 0,
          sheet: sheetName,
          medicineName: '',
          batchNumber: '',
          status: 'error',
          message: `Sheet "${sheetName}": Could not find "Medicine" column`
        });
        continue;
      }

      // Process each data row (skip header)
      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        totalProcessed++;

        const getCellValue = (key: string): any => {
          const colIdx = colMap[key];
          if (!colIdx) return null;
          const cell = row.getCell(colIdx);
          return cell.value;
        };

        const medicineName = String(getCellValue('medicine') || '').trim();
        if (!medicineName) {
          skippedCount++;
          continue; // Skip empty rows
        }

        const batchNumber = String(getCellValue('batch') || '').trim();
        const purchaseRate = parseFloat(String(getCellValue('purchaseRate') || '0')) || 0;
        const mrp = parseFloat(String(getCellValue('mrp') || '0')) || 0;
        const expiryRaw = getCellValue('expiry');
        const qty = parseFloat(String(getCellValue('qty') || '0')) || 0;
        const pack = parseFloat(String(getCellValue('pack') || '1')) || 1;
        const combination = String(getCellValue('combination') || '').trim();
        const route = String(getCellValue('route') || '').trim();
        const ampoule = String(getCellValue('ampoule') || '').trim();
        const brand = String(getCellValue('brand') || '').trim();
        const product = String(getCellValue('product') || '').trim();

        try {
          // Step 1: Find or create medication
          let medicationId = medicationCache.get(medicineName.toLowerCase().trim());

          if (!medicationId) {
            // Create new medication
            const medCode = generateMedicationCode(medicineName, totalProcessed);
            const category = deriveCategory(medicineName, combination, product);

            const { data: newMed, error: medError } = await supabase
              .from('medications')
              .insert({
                medication_code: medCode,
                name: medicineName,
                generic_name: combination || null,
                combination: combination || null,
                manufacturer: brand || null,
                category: category,
                dosage_form: product || null,
                strength: ampoule || null,
                unit: product?.toLowerCase().includes('tablet') || product?.toLowerCase().includes('tab') ? 'tablets' :
                      product?.toLowerCase().includes('injection') ? 'ampoules' : 'units',
                total_stock: 0,
                available_stock: 0,
                minimum_stock_level: 10,
                purchase_price: purchaseRate,
                selling_price: mrp,
                mrp: mrp,
                prescription_required: true,
                status: 'active',
                is_active: true,
              })
              .select('id')
              .single();

            if (medError) {
              // Try to find it again (might have been created by a concurrent row)
              const { data: found } = await supabase
                .from('medications')
                .select('id')
                .ilike('name', medicineName)
                .limit(1)
                .single();

              if (found) {
                medicationId = found.id;
                medicationCache.set(medicineName.toLowerCase().trim(), found.id);
              } else {
                results.push({
                  row: rowNum,
                  sheet: sheetName,
                  medicineName,
                  batchNumber,
                  status: 'error',
                  message: `Failed to create medication: ${medError.message}`
                });
                errorCount++;
                continue;
              }
            } else if (newMed) {
              medicationId = newMed.id;
              medicationCache.set(medicineName.toLowerCase().trim(), newMed.id);
            }
          }

          if (!medicationId) {
            results.push({
              row: rowNum,
              sheet: sheetName,
              medicineName,
              batchNumber,
              status: 'error',
              message: 'Could not resolve medication ID'
            });
            errorCount++;
            continue;
          }

          // Step 2: Insert batch (if batch number exists)
          if (!batchNumber) {
            // No batch info - just update medication prices if needed
            await supabase
              .from('medications')
              .update({
                purchase_price: purchaseRate || undefined,
                selling_price: mrp || undefined,
                mrp: mrp || undefined,
                updated_at: new Date().toISOString()
              })
              .eq('id', medicationId);

            results.push({
              row: rowNum,
              sheet: sheetName,
              medicineName,
              batchNumber: '(none)',
              status: 'success',
              message: 'Medication created/updated (no batch data)'
            });
            successCount++;
            continue;
          }

          // Check if batch already exists for this medication
          const { data: existingBatch } = await supabase
            .from('medicine_batches')
            .select('id')
            .eq('medicine_id', medicationId)
            .eq('batch_number', batchNumber)
            .limit(1)
            .single();

          if (existingBatch) {
            results.push({
              row: rowNum,
              sheet: sheetName,
              medicineName,
              batchNumber,
              status: 'skipped',
              message: 'Batch already exists'
            });
            skippedCount++;
            continue;
          }

          // Parse expiry date
          const expiryDate = parseExpiryDate(expiryRaw);

          // Insert batch
          const { error: batchError } = await supabase
            .from('medicine_batches')
            .insert({
              medicine_id: medicationId,
              batch_number: batchNumber,
              expiry_date: expiryDate || '2099-12-31',
              received_quantity: qty || 0,
              current_quantity: qty || 0,
              purchase_price: purchaseRate,
              selling_price: mrp,
              status: 'active',
              is_active: true,
            });

          if (batchError) {
            results.push({
              row: rowNum,
              sheet: sheetName,
              medicineName,
              batchNumber,
              status: 'error',
              message: `Batch insert failed: ${batchError.message}`
            });
            errorCount++;
            continue;
          }

          // Update medication stock totals
          const { data: med } = await supabase
            .from('medications')
            .select('total_stock, available_stock')
            .eq('id', medicationId)
            .single();

          if (med) {
            await supabase
              .from('medications')
              .update({
                total_stock: (med.total_stock || 0) + (qty || 0),
                available_stock: (med.available_stock || 0) + (qty || 0),
                purchase_price: purchaseRate || undefined,
                selling_price: mrp || undefined,
                mrp: mrp || undefined,
                updated_at: new Date().toISOString()
              })
              .eq('id', medicationId);
          }

          results.push({
            row: rowNum,
            sheet: sheetName,
            medicineName,
            batchNumber,
            status: 'success',
            message: 'Medication & batch uploaded'
          });
          successCount++;

        } catch (err: any) {
          results.push({
            row: rowNum,
            sheet: sheetName,
            medicineName,
            batchNumber,
            status: 'error',
            message: err.message || 'Unknown error'
          });
          errorCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessed,
      successCount,
      errorCount,
      skippedCount,
      results: results.slice(0, 100), // Return first 100 results for display
      allResults: results
    });

  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
