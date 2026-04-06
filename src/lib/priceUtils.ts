// Utility functions for price calculations
// All prices are stored in kopecks (1 ruble = 100 kopecks)

export interface PriceDisplay {
  rubles: number;
  kopecks: number;
  /** e.g. "7" or "16,34" — number part only, no currency symbol */
  formatted: string;
}

/**
 * Format price from kopecks to display format
 * Format: "7" or "16,34" (comma-separated kopecks, no currency text)
 */
export function formatPrice(priceInKopecks: number): PriceDisplay {
  const rubles = Math.floor(priceInKopecks / 100);
  const kopecks = priceInKopecks % 100;
  
  let formatted = `${rubles}`;
  if (kopecks > 0) {
    formatted += `,${kopecks.toString().padStart(2, '0')}`;
  }
  
  return { rubles, kopecks, formatted };
}

/**
 * Calculate old price from current price and discount percentage
 * Formula: oldPrice = price / (1 - discount/100)
 */
export function calculateOldPrice(priceInKopecks: number, discountPercent: number): number {
  if (discountPercent <= 0 || discountPercent >= 100) return priceInKopecks;
  return Math.round(priceInKopecks / (1 - discountPercent / 100));
}

/**
 * Format price for display with currency symbol (text fallback)
 */
export function formatPriceString(priceInKopecks: number): string {
  return formatPrice(priceInKopecks).formatted;
}

/**
 * Get price parts for component display
 */
export function getPriceParts(priceInKopecks: number): { rubles: number; kopecks: number } {
  return {
    rubles: Math.floor(priceInKopecks / 100),
    kopecks: priceInKopecks % 100,
  };
}

/**
 * Parse price string with comma/dot support (rubles to kopecks)
 * Input: "8.50" or "8,50" → Output: 850 (kopecks)
 */
export function parseRublesToKopecks(value: string): number {
  if (!value || value.trim() === "") return 0;
  
  // Clean: keep only digits and separators
  let cleaned = value.replace(/[^0-9.,]/g, '');
  
  // Replace comma with dot
  cleaned = cleaned.replace(',', '.');
  
  // If multiple dots, keep only first
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  const rubles = parseFloat(cleaned);
  if (isNaN(rubles)) return 0;
  return Math.round(rubles * 100);
}

/**
 * Convert kopecks to rubles string for input display
 * Input: 850 → Output: "8.50"
 */
export function kopecksToRublesString(kopecks: number): string {
  if (!kopecks) return "";
  const rubles = kopecks / 100;
  // Only show decimals if there are kopecks
  if (kopecks % 100 === 0) {
    return rubles.toString();
  }
  return rubles.toFixed(2);
}
