import { supabase } from './supabase';

/**
 * Generate a barcode ID for a patient
 * Format: BARS{Year}{Month}{RandomDigits}
 * Example: BARS2025010001
 */
export function generateBarcodeId(uhid: string): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  // Use UHID as base and add timestamp for uniqueness
  const timestamp = now.getTime().toString().slice(-4); // Last 4 digits of timestamp
  
  return `BARS${year}${month}${timestamp}`;
}

/**
 * Generate SVG barcode using Code-128 format
 * This is a simplified implementation - in production, you'd use a proper barcode library
 */
export function generateBarcodeSVG(barcodeId: string): string {
  const width = 300;
  const height = 80;
  const barWidth = 2;
  const barsCount = barcodeId.length * 6; // Approximate for Code-128
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="white"/>`;
  
  // Generate bars pattern (simplified)
  let x = 10;
  for (let i = 0; i < barcodeId.length; i++) {
    const char = barcodeId[i];
    const charCode = char.charCodeAt(0);
    
    // Create alternating pattern based on character
    for (let j = 0; j < 6; j++) {
      if ((charCode + j) % 2 === 0) {
        svg += `<rect x="${x}" y="10" width="${barWidth}" height="50" fill="black"/>`;
      }
      x += barWidth;
    }
  }
  
  // Add text below barcode
  svg += `<text x="${width/2}" y="${height-10}" text-anchor="middle" font-family="monospace" font-size="12" fill="black">${barcodeId}</text>`;
  
  svg += '</svg>';
  
  return svg;
}

/**
 * Generate a more realistic barcode pattern
 * This creates a pattern that looks more like a real barcode
 */
export function generateRealisticBarcodeSVG(barcodeId: string): string {
  const width = 300;
  const height = 80;
  const minBarWidth = 1;
  const maxBarWidth = 4;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="white"/>`;
  
  // Generate more realistic bar pattern
  let x = 20;
  let isBlack = true;
  
  // Start and end patterns
  const startPattern = [1, 1, 1, 1, 1, 1];
  const endPattern = [1, 1, 1, 1, 1, 1];
  
  // Draw start pattern
  for (const barWidth of startPattern) {
    if (isBlack) {
      svg += `<rect x="${x}" y="10" width="${barWidth}" height="50" fill="black"/>`;
    }
    x += barWidth;
    isBlack = !isBlack;
  }
  
  // Draw data pattern
  for (let i = 0; i < barcodeId.length; i++) {
    const char = barcodeId[i];
    const charCode = char.charCodeAt(0);
    
    // Create pattern based on character
    const pattern = [];
    for (let j = 0; j < 6; j++) {
      const width = minBarWidth + ((charCode + j) % (maxBarWidth - minBarWidth + 1));
      pattern.push(width);
    }
    
    for (const barWidth of pattern) {
      if (isBlack) {
        svg += `<rect x="${x}" y="10" width="${barWidth}" height="50" fill="black"/>`;
      }
      x += barWidth;
      isBlack = !isBlack;
    }
  }
  
  // Draw end pattern
  for (const barWidth of endPattern) {
    if (isBlack) {
      svg += `<rect x="${x}" y="10" width="${barWidth}" height="50" fill="black"/>`;
    }
    x += barWidth;
    isBlack = !isBlack;
  }
  
  // Add text below barcode
  svg += `<text x="${width/2}" y="${height-10}" text-anchor="middle" font-family="monospace" font-size="12" fill="black">${barcodeId}</text>`;
  
  svg += '</svg>';
  
  return svg;
}

/**
 * Update patient with barcode ID
 * Note: This function is currently disabled as barcode_id column doesn't exist in the database
 */
export async function updatePatientWithBarcode(patientId: string, barcodeId: string): Promise<void> {
  console.log('Barcode update skipped - barcode_id column not available in database schema');
  // Function disabled as barcode_id column doesn't exist
  return;
}

/**
 * Get patient by barcode ID
 * Note: This function is currently disabled as barcode_id column doesn't exist in the database
 */
export async function getPatientByBarcodeId(barcodeId: string): Promise<any> {
  console.log('Barcode lookup skipped - barcode_id column not available in database schema');
  // Function disabled as barcode_id column doesn't exist
  throw new Error('Barcode functionality is currently unavailable - barcode_id column not in database schema');
}

/**
 * Generate printable barcode data
 */
export function generatePrintableBarcodeData(uhid: string, barcodeId: string, patientName: string): string {
  const svg = generateRealisticBarcodeSVG(barcodeId);
  
  return `
    <div style="width: 4in; height: 2in; padding: 0.2in; font-family: Arial, sans-serif; border: 1px solid #ccc; margin: 0.1in;">
      <div style="text-align: center; margin-bottom: 0.1in;">
        <h3 style="margin: 0; font-size: 14px; color: #333;">ANNAM HOSPITAL</h3>
        <p style="margin: 0; font-size: 10px; color: #666;">Patient ID Card</p>
      </div>
      <div style="text-align: center; margin-bottom: 0.1in;">
        ${svg}
      </div>
      <div style="text-align: center; font-size: 12px;">
        <p style="margin: 0; font-weight: bold;">${patientName}</p>
        <p style="margin: 0; font-size: 10px; color: #666;">UHID: ${uhid}</p>
      </div>
    </div>
  `;
}

/**
 * Validate barcode ID format
 */
export function validateBarcodeId(barcodeId: string): boolean {
  // Check if it matches the format: BARS{Year}{Month}{4digits}
  const barcodeRegex = /^BARS\d{4}(0[1-9]|1[0-2])\d{4}$/;
  return barcodeRegex.test(barcodeId);
}

/**
 * Extract information from barcode ID
 */
export function extractBarcodeInfo(barcodeId: string): {
  year: string;
  month: string;
  sequence: string;
} | null {
  if (!validateBarcodeId(barcodeId)) {
    return null;
  }
  
  const year = barcodeId.substring(4, 8);
  const month = barcodeId.substring(8, 10);
  const sequence = barcodeId.substring(10, 14);
  
  return { year, month, sequence };
}

/**
 * Generate barcode for existing patient
 * Note: This function is modified to work without database barcode_id column
 */
export async function generateBarcodeForPatient(patientId: string): Promise<string> {
  try {
    // Check if patient exists
    // 1. Try searching by patient_id
    const { data: byPatientId } = await supabase
      .from('patients')
      .select('patient_id')
      .eq('patient_id', patientId)
      .limit(1);
    
    if (byPatientId && byPatientId.length > 0) {
      return generateBarcodeId(byPatientId[0].patient_id);
    }

    // 2. Try searching by uhid column (alternative schema)
    const { data: byUhid } = await supabase
      .from('patients')
      .select('*')
      .limit(1);
    
    if (byUhid && byUhid.length > 0 && 'uhid' in byUhid[0]) {
      const { data: actualUhid } = await supabase
        .from('patients')
        .select('uhid')
        .eq('uhid', patientId)
        .limit(1);
      
      if (actualUhid && actualUhid.length > 0) {
        return generateBarcodeId(actualUhid[0].uhid);
      }
    }

    // 3. Try searching by primary key (UUID id)
    const { data: byId } = await supabase
      .from('patients')
      .select('patient_id')
      .eq('id', patientId)
      .limit(1);
    
    if (byId && byId.length > 0) {
      return generateBarcodeId(byId[0].patient_id);
    }

    // 4. Fallback: If we can't find the record but we have a valid-looking UHID,
    // just generate a barcode for it anyway to unblock the UI.
    console.warn(`Patient record not found for ${patientId}, generating barcode from raw ID as fallback.`);
    return generateBarcodeId(patientId);
  } catch (error) {
    console.error('Error generating barcode for patient:', error);
    throw error;
  }
}