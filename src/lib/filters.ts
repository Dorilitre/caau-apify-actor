/**
 * Filters for Brazilian market signals and price ranges
 */

import { hasBrazilianCurrency, isBrazilianWarehouse, parsePrice } from './utils.js';

interface FilterOptions {
  requireBrazilSignals?: boolean;
  minPrice?: number;
  maxPrice?: number;
  dropIfNoImage?: boolean;
}

interface TikTokItem {
  product_id?: string | number;
  product_id_str?: string;
  title?: string;
  cover?: string;
  img?: string[];
  floor_price?: string | number;
  ceiling_price?: string | number;
  format_price?: string;
  currency?: string;
  warehouse_region?: string;
  seller_product_info?: {
    seller_name?: string;
    seller_id?: string | number;
    seller_id_str?: string;
  };
  product_rating?: string | number;
  review_count?: string | number;
  sold_count?: string | number;
  global_sold_count?: string | number;
  schema?: any;
  view_in_shop_button?: {
    schema?: any;
  };
  [key: string]: any;
}

/**
 * Check if an item has Brazilian market signals
 */
function hasBrazilSignals(item: TikTokItem): boolean {
  // Check currency signals
  if (hasBrazilianCurrency(item.format_price, item.currency)) {
    return true;
  }

  // Check warehouse region
  if (isBrazilianWarehouse(item.warehouse_region)) {
    return true;
  }

  // Check for BR domains or paths in schema/URLs
  const checkForBrUrls = (obj: any): boolean => {
    if (!obj) return false;
    
    const jsonStr = JSON.stringify(obj).toLowerCase();
    return jsonStr.includes('/br-') || 
           jsonStr.includes('.br/') || 
           jsonStr.includes('brazil') || 
           jsonStr.includes('brasil');
  };

  if (checkForBrUrls(item.schema) || checkForBrUrls(item.view_in_shop_button?.schema)) {
    return true;
  }

  return false;
}

/**
 * Check if item has valid image
 */
function hasValidImage(item: TikTokItem): boolean {
  if (item.cover && item.cover.trim()) {
    return true;
  }
  
  if (item.img && item.img.length > 0) {
    return item.img.some(imgUrl => imgUrl && imgUrl.trim() && 
      (imgUrl.startsWith('http') || imgUrl.startsWith('//')));
  }
  
  return false;
}

/**
 * Check if item price is within specified range
 */
function isPriceInRange(item: TikTokItem, minPrice?: number, maxPrice?: number): boolean {
  if (!minPrice && !maxPrice) {
    return true;
  }

  let price = 0;
  
  // Try to get price from various fields
  if (item.floor_price) {
    price = parsePrice(item.floor_price);
  } else if (item.ceiling_price) {
    price = parsePrice(item.ceiling_price);
  } else if (item.format_price) {
    price = parsePrice(item.format_price);
  }

  if (price === 0) {
    return true; // If we can't parse price, don't filter it out
  }

  // For non-BRL currencies when requireBrazilSignals is active, 
  // we should be more strict about price filtering
  const itemHasBrSignals = hasBrazilSignals(item);
  if (!itemHasBrSignals && item.currency && item.currency !== 'BRL' && item.currency !== 'R$') {
    // If it's clearly not BRL and we can't convert, it's safer to exclude
    // when price filtering is requested
    if (minPrice || maxPrice) {
      return false;
    }
  }

  if (minPrice && price < minPrice) {
    return false;
  }

  if (maxPrice && price > maxPrice) {
    return false;
  }

  return true;
}

/**
 * Filter items based on Brazilian market signals and other criteria
 */
export function filterBrazil(items: TikTokItem[], options: FilterOptions): TikTokItem[] {
  const {
    requireBrazilSignals = true,
    minPrice,
    maxPrice,
    dropIfNoImage = true
  } = options;

  console.log(`🔍 Filtering ${items.length} items with options:`, {
    requireBrazilSignals,
    minPrice,
    maxPrice,
    dropIfNoImage
  });

  const filtered = items.filter(item => {
    // Check Brazil signals requirement
    if (requireBrazilSignals && !hasBrazilSignals(item)) {
      return false;
    }

    // Check image requirement
    if (dropIfNoImage && !hasValidImage(item)) {
      return false;
    }

    // Check price range
    if (!isPriceInRange(item, minPrice, maxPrice)) {
      return false;
    }

    return true;
  });

  const stats = {
    original: items.length,
    afterBrazilFilter: filtered.length,
    filteredOut: items.length - filtered.length
  };

  console.log('📊 Filter results:', stats);

  if (requireBrazilSignals && stats.filteredOut > 0) {
    console.log(`🇧🇷 Filtered out ${stats.filteredOut} items without Brazil signals`);
  }

  return filtered;
}
