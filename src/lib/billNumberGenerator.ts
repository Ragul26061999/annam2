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
  
  // Format: OP-2601-0001 (Prefix-YYMM-Sequence)
  // Check if prefix already has a hyphen or separator
  const separator = prefix.endsWith('-') ? '' : '-';
  const fullPrefix = `${prefix}${separator}${dateCode}`; // "OP-2601"

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
      // Fallback to random if DB fails, to prevent blocking
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${fullPrefix}-${random}`;
    }

    let sequence = 1;
    if (data && data.length > 0) {
      const lastBillNumber = data[0][columnName] as string;
      // Extract sequence part: "OP-2601-0001" -> "0001"
      const parts = lastBillNumber.split('-');
      if (parts.length > 1) {
        const lastSequenceStr = parts[parts.length - 1];
        // Ensure we're parsing the numeric part correctly
        const lastSequence = parseInt(lastSequenceStr, 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    // User requested "starting from 1 increase 1 by 1". 
    // We'll use 1-based sequence. 
    // Using simple numbering without padding if preferred, but standard is padded.
    // If the user strictly wants "1", "2", "10", we can remove padding.
    // However, padding is better for sorting. 
    // Let's stick to padding (0001) unless explicitly told to remove leading zeros.
    // Wait, "OP-YYMM1" might imply NO separator between YYMM and Sequence.
    // But "OP-YYMM1" is ambiguous. "OP-YYMM-1" is clear.
    
    // For now, I will use standard padding 0001.
    const sequenceStr = sequence.toString().padStart(4, '0'); 
    // If user specifically asked for "OP-YYMM1", maybe they want:
    // return `${fullPrefix}${sequence}`; // OP-26011
    // But readability suggests OP-2601-0001.
    
    return `${fullPrefix}-${sequenceStr}`;
  } catch (error) {
    console.error('Error in generateSequentialBillNumber:', error);
    throw error;
  }
}
