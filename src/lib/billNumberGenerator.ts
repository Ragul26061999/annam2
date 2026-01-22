import { supabase } from './supabase';

/**
 * Generate a sequential bill number based on a prefix and the current date (YYMM).
 * Format: {PREFIX}{YYMM}-{SEQUENCE}
 * Example: OP2601-0001, IP2601-0001
 * 
 * @param prefix The prefix for the bill number (e.g., "OP", "IP", "PH")
 * @param tableName The table to check for existing bill numbers (default: "billing")
 * @param columnName The column to check for the bill number pattern (default: "bill_number")
 */
export async function generateSequentialBillNumber(
  prefix: string, 
  tableName: string = 'billing', 
  columnName: string = 'bill_number'
): Promise<string> {
  const now = new Date();
  const yearShort = now.getFullYear().toString().slice(-2); // e.g., "2026" -> "26"
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // e.g., "01"
  const dateCode = `${yearShort}${month}`; // "2601"
  const fullPrefix = `${prefix}${dateCode}`; // "OP2601"

  try {
    // Find the latest bill number matching the pattern
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .ilike(columnName, `${fullPrefix}-%`)
      .order(columnName, { ascending: false })
      .limit(1);

    if (error) {
      console.error(`Error generating bill number for prefix ${prefix}:`, error);
      // Fallback to random if DB fails, to prevent blocking, but try to maintain format
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${fullPrefix}-${random}`;
    }

    let sequence = 1;
    if (data && data.length > 0) {
      const lastBillNumber = data[0][columnName] as string;
      // Extract sequence part: "OP2601-0001" -> "0001"
      const parts = lastBillNumber.split('-');
      if (parts.length > 1) {
        const lastSequence = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    const sequenceStr = sequence.toString().padStart(4, '0');
    return `${fullPrefix}-${sequenceStr}`;
  } catch (error) {
    console.error('Error in generateSequentialBillNumber:', error);
    throw error;
  }
}
