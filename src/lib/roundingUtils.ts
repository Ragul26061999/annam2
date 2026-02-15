/**
 * Universal rounding utility for the hospital management system.
 * All monetary amounts must be whole numbers (no decimals).
 *
 * Rule: if decimal >= 0.5 → round up, else round down.
 * Example: 25.75 → 26, 25.25 → 25, 25.50 → 26
 */
export function roundAmount(num: number): number {
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

/**
 * Format a number as a whole-number currency string (no decimals).
 * Example: 1234 → "1,234"
 */
export function formatCurrency(num: number): string {
  return roundAmount(num).toLocaleString('en-IN');
}

/**
 * Round and format for display with ₹ symbol.
 * Example: 1234.75 → "₹1,235"
 */
export function formatRupees(num: number): string {
  return `₹${formatCurrency(num)}`;
}
