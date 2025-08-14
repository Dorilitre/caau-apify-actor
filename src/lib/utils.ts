/**
 * Utility functions for parsing prices, images, and other data transformations
 */

/**
 * Parse price from various formats to a numeric value
 * Handles formats like: "586671556", "586.671.556₫", "R$ 123,45", "$12.34"
 */
export function parsePrice(priceStr: string | number | undefined): number {
  if (typeof priceStr === 'number') {
    return priceStr;
  }
  
  if (!priceStr || typeof priceStr !== 'string') {
    return 0;
  }

  // Remove currency symbols and common separators
  let cleaned = priceStr
    .replace(/[R$₫$€£¥₹]/g, '') // Remove currency symbols
    .replace(/[,\s]/g, '') // Remove commas and spaces
    .replace(/\./g, ''); // Remove dots (assuming they're thousands separators)

  // If the original had decimal places (like R$ 123,45), handle it
  if (priceStr.includes(',') && !priceStr.includes('.')) {
    // Likely Brazilian format: R$ 123,45
    const parts = priceStr.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = parts[0].replace(/[^\d]/g, '') + '.' + parts[1].replace(/[^\d]/g, '');
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Pick the best image URL from available options
 */
export function pickImageUrl(cover?: string, images?: string[]): string | null {
  if (cover && cover.trim()) {
    return cover.trim();
  }
  
  if (images && images.length > 0) {
    // Find the first valid image URL
    for (const img of images) {
      if (img && img.trim() && (img.startsWith('http') || img.startsWith('//'))) {
        return img.trim();
      }
    }
  }
  
  return null;
}

/**
 * Detect if a price string contains Brazilian currency signals
 */
export function hasBrazilianCurrency(priceStr: string | undefined, currency?: string): boolean {
  if (currency === 'BRL' || currency === 'R$') {
    return true;
  }
  
  if (!priceStr) {
    return false;
  }
  
  return priceStr.includes('R$') || priceStr.includes('BRL');
}

/**
 * List of Brazilian states and territories for warehouse region detection
 */
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 
  'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 
  'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 
  'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 
  'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins',
  'Brasil', 'Brazil', 'BR'
];

/**
 * Check if warehouse region indicates Brazil
 */
export function isBrazilianWarehouse(warehouseRegion?: string): boolean {
  if (!warehouseRegion) {
    return false;
  }
  
  const region = warehouseRegion.toUpperCase();
  return BRAZILIAN_STATES.some(state => 
    region.includes(state.toUpperCase())
  );
}

/**
 * Calculate a simple trending score based on available metrics
 * Formula: (normalized_sales * 0.6) + (normalized_rating * 0.4)
 */
export function calculateTrendingScore(
  soldCount: number = 0, 
  rating: number = 0, 
  maxSold: number = 1000, 
  maxRating: number = 5
): number {
  const normalizedSales = Math.min(soldCount / maxSold, 1);
  const normalizedRating = Math.min(rating / maxRating, 1);
  
  return Math.round((normalizedSales * 0.6 + normalizedRating * 0.4) * 100) / 100;
}

/**
 * Normalize currency to BRL when Brazil signals are detected
 */
export function normalizeCurrency(
  originalCurrency?: string, 
  priceStr?: string, 
  hasBrazilSignals: boolean = false
): string {
  if (hasBrazilSignals || hasBrazilianCurrency(priceStr, originalCurrency)) {
    return 'BRL';
  }
  
  return originalCurrency || 'USD';
}

/**
 * Clean and validate platform ID
 */
export function cleanPlatformId(productId: any): string {
  if (typeof productId === 'string' && productId.trim()) {
    return productId.trim();
  }
  
  if (typeof productId === 'number') {
    return String(productId);
  }
  
  // Generate a fallback ID if none exists
  return `tiktok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
