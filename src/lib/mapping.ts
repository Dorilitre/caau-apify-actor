/**
 * Maps TikTok Shop items to Supabase products table schema
 */

import { 
  parsePrice, 
  pickImageUrl, 
  calculateTrendingScore, 
  normalizeCurrency, 
  cleanPlatformId,
  hasBrazilianCurrency,
  isBrazilianWarehouse
} from './utils.js';

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
  [key: string]: any;
}

interface SupabaseProduct {
  title: string;
  image_url: string | null;
  price: number;
  orders_24h: number;
  rating: number;
  reviews_count: number;
  trending_score: number;
  shop_name: string | null;
  category_id: number | null;
  commission_rate: number | null;
  seller_id: string | null;
  seller_name: string | null;
  platform_id: string;
  currency: string;
}

/**
 * Map a TikTok Shop item to Supabase products table schema
 */
export function mapToSupabase(item: TikTokItem): SupabaseProduct {
  // Determine if item has Brazil signals for currency normalization
  const hasBrazilSignals = hasBrazilianCurrency(item.format_price, item.currency) || 
                          isBrazilianWarehouse(item.warehouse_region);

  // Platform ID (required, unique)
  const platformId = cleanPlatformId(item.product_id_str || item.product_id);

  // Title (required)
  const title = item.title?.trim() || 'Untitled Product';

  // Image URL
  const imageUrl = pickImageUrl(item.cover, item.img);

  // Price parsing
  let price = 0;
  if (item.floor_price) {
    price = parsePrice(item.floor_price);
  } else if (item.ceiling_price) {
    price = parsePrice(item.ceiling_price);
  } else if (item.format_price) {
    price = parsePrice(item.format_price);
  }

  // Orders/sales data
  let orders24h = 0;
  if (item.sold_count) {
    orders24h = parseInt(String(item.sold_count)) || 0;
  } else if (item.global_sold_count) {
    orders24h = parseInt(String(item.global_sold_count)) || 0;
  }

  // Rating
  const rating = item.product_rating ? parseFloat(String(item.product_rating)) : 0;

  // Reviews count
  const reviewsCount = item.review_count ? parseInt(String(item.review_count)) : 0;

  // Calculate trending score using our formula
  // Formula: (normalized_sales * 0.6) + (normalized_rating * 0.4)
  const trendingScore = calculateTrendingScore(orders24h, rating);

  // Seller information
  const sellerInfo = item.seller_product_info;
  const shopName = sellerInfo?.seller_name?.trim() || null;
  const sellerId = sellerInfo?.seller_id_str || 
                   (sellerInfo?.seller_id ? String(sellerInfo.seller_id) : null);
  const sellerName = shopName; // Same as shop_name for TikTok Shop

  // Currency normalization
  const currency = normalizeCurrency(item.currency, item.format_price, hasBrazilSignals);

  // Category ID - keeping null as specified, could implement mapping later
  const categoryId = null;

  // Commission rate - not available in TikTok data, keeping null
  const commissionRate = null;

  const mapped: SupabaseProduct = {
    title,
    image_url: imageUrl,
    price,
    orders_24h: orders24h,
    rating,
    reviews_count: reviewsCount,
    trending_score: trendingScore,
    shop_name: shopName,
    category_id: categoryId,
    commission_rate: commissionRate,
    seller_id: sellerId,
    seller_name: sellerName,
    platform_id: platformId,
    currency
  };

  return mapped;
}
