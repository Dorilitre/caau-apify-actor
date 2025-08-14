import { describe, it, expect } from 'vitest';
import { mapToSupabase } from './mapping.js';

// Mock TikTok items for testing
const mockCompleteItem = {
  product_id: 123456789,
  product_id_str: '123456789',
  title: 'Produto Completo Brasileiro',
  cover: 'https://example.com/cover.jpg',
  img: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  floor_price: '9999',
  ceiling_price: '12999',
  format_price: 'R$ 99,99',
  currency: 'BRL',
  warehouse_region: 'São Paulo, Brasil',
  seller_product_info: {
    seller_name: 'Loja Exemplo',
    seller_id: 12345,
    seller_id_str: 'seller12345'
  },
  product_rating: '4.5',
  review_count: '89',
  sold_count: '150',
  global_sold_count: '200'
};

const mockMinimalItem = {
  product_id: 987,
  title: 'Produto Mínimo'
};

const mockVietnameseItem = {
  product_id_str: 'vn123',
  title: 'Vietnamese Product',
  cover: 'https://example.com/vn.jpg',
  floor_price: '586671556',
  format_price: '586.671.556₫',
  currency: 'VND',
  warehouse_region: 'Ho Chi Minh, Vietnam',
  seller_product_info: {
    seller_name: 'VN Shop',
    seller_id_str: 'vn_seller'
  },
  product_rating: 3.8,
  review_count: 25,
  sold_count: 75
};

describe('mapToSupabase', () => {
  describe('Required fields', () => {
    it('should map title correctly', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.title).toBe('Produto Completo Brasileiro');
    });

    it('should provide default title for missing title', () => {
      const item = { ...mockCompleteItem };
      delete item.title;
      const mapped = mapToSupabase(item);
      expect(mapped.title).toBe('Untitled Product');
    });

    it('should map platform_id from product_id_str', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.platform_id).toBe('123456789');
    });

    it('should fallback to product_id for platform_id', () => {
      const item = { ...mockCompleteItem };
      delete item.product_id_str;
      const mapped = mapToSupabase(item);
      expect(mapped.platform_id).toBe('123456789');
    });

    it('should generate fallback platform_id when none exists', () => {
      const mapped = mapToSupabase(mockMinimalItem);
      expect(mapped.platform_id).toMatch(/^tiktok_\d+_[a-z0-9]+$/);
    });
  });

  describe('Image handling', () => {
    it('should prefer cover image', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.image_url).toBe('https://example.com/cover.jpg');
    });

    it('should fallback to first img array item', () => {
      const item = { ...mockCompleteItem };
      delete item.cover;
      const mapped = mapToSupabase(item);
      expect(mapped.image_url).toBe('https://example.com/img1.jpg');
    });

    it('should handle missing images', () => {
      const mapped = mapToSupabase(mockMinimalItem);
      expect(mapped.image_url).toBe(null);
    });
  });

  describe('Price handling', () => {
    it('should parse floor_price correctly', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.price).toBe(9999);
    });

    it('should fallback to ceiling_price', () => {
      const item = { ...mockCompleteItem };
      delete item.floor_price;
      const mapped = mapToSupabase(item);
      expect(mapped.price).toBe(12999);
    });

    it('should fallback to format_price parsing', () => {
      const item = { 
        ...mockCompleteItem,
        format_price: 'R$ 123,45'
      };
      delete item.floor_price;
      delete item.ceiling_price;
      const mapped = mapToSupabase(item);
      expect(mapped.price).toBe(123.45);
    });

    it('should handle Vietnamese prices', () => {
      const mapped = mapToSupabase(mockVietnameseItem);
      expect(mapped.price).toBe(586671556);
    });

    it('should default to 0 for unparseable prices', () => {
      const mapped = mapToSupabase(mockMinimalItem);
      expect(mapped.price).toBe(0);
    });
  });

  describe('Sales and rating data', () => {
    it('should map sold_count to orders_24h', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.orders_24h).toBe(150);
    });

    it('should fallback to global_sold_count', () => {
      const item = { ...mockCompleteItem };
      delete item.sold_count;
      const mapped = mapToSupabase(item);
      expect(mapped.orders_24h).toBe(200);
    });

    it('should parse rating correctly', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.rating).toBe(4.5);
    });

    it('should handle numeric rating', () => {
      const mapped = mapToSupabase(mockVietnameseItem);
      expect(mapped.rating).toBe(3.8);
    });

    it('should map review_count correctly', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.reviews_count).toBe(89);
    });

    it('should default missing values to 0', () => {
      const mapped = mapToSupabase(mockMinimalItem);
      expect(mapped.orders_24h).toBe(0);
      expect(mapped.rating).toBe(0);
      expect(mapped.reviews_count).toBe(0);
    });
  });

  describe('Trending score calculation', () => {
    it('should calculate trending score based on sales and rating', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      // Formula: (150/1000 * 0.6) + (4.5/5 * 0.4) = 0.09 + 0.36 = 0.45
      expect(mapped.trending_score).toBe(0.45);
    });

    it('should handle zero values', () => {
      const mapped = mapToSupabase(mockMinimalItem);
      expect(mapped.trending_score).toBe(0);
    });

    it('should cap values at 1.0', () => {
      const highPerformingItem = {
        ...mockCompleteItem,
        sold_count: '5000', // High sales
        product_rating: '5.0' // Perfect rating
      };
      const mapped = mapToSupabase(highPerformingItem);
      expect(mapped.trending_score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Seller information', () => {
    it('should map seller information correctly', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.shop_name).toBe('Loja Exemplo');
      expect(mapped.seller_id).toBe('seller12345');
      expect(mapped.seller_name).toBe('Loja Exemplo');
    });

    it('should handle missing seller info', () => {
      const mapped = mapToSupabase(mockMinimalItem);
      expect(mapped.shop_name).toBe(null);
      expect(mapped.seller_id).toBe(null);
      expect(mapped.seller_name).toBe(null);
    });

    it('should fallback to numeric seller_id', () => {
      const item = {
        ...mockCompleteItem,
        seller_product_info: {
          seller_name: 'Test Shop',
          seller_id: 99999
          // No seller_id_str
        }
      };
      const mapped = mapToSupabase(item);
      expect(mapped.seller_id).toBe('99999');
    });
  });

  describe('Currency normalization', () => {
    it('should normalize to BRL for Brazilian items', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.currency).toBe('BRL');
    });

    it('should keep original currency for non-Brazilian items', () => {
      const mapped = mapToSupabase(mockVietnameseItem);
      expect(mapped.currency).toBe('VND');
    });

    it('should detect BRL from price format even with different currency', () => {
      const item = {
        ...mockVietnameseItem,
        format_price: 'R$ 123,45', // Brazilian format
        currency: 'VND' // But currency says VND
      };
      const mapped = mapToSupabase(item);
      expect(mapped.currency).toBe('BRL'); // Should normalize to BRL
    });

    it('should detect BRL from warehouse region', () => {
      const item = {
        ...mockVietnameseItem,
        warehouse_region: 'São Paulo, Brasil',
        currency: 'USD'
      };
      const mapped = mapToSupabase(item);
      expect(mapped.currency).toBe('BRL');
    });
  });

  describe('Fixed fields', () => {
    it('should set category_id to null', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.category_id).toBe(null);
    });

    it('should set commission_rate to null', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      expect(mapped.commission_rate).toBe(null);
    });
  });

  describe('Complete mapping', () => {
    it('should produce valid Supabase object', () => {
      const mapped = mapToSupabase(mockCompleteItem);
      
      // Check all required fields are present
      expect(mapped).toHaveProperty('title');
      expect(mapped).toHaveProperty('image_url');
      expect(mapped).toHaveProperty('price');
      expect(mapped).toHaveProperty('orders_24h');
      expect(mapped).toHaveProperty('rating');
      expect(mapped).toHaveProperty('reviews_count');
      expect(mapped).toHaveProperty('trending_score');
      expect(mapped).toHaveProperty('shop_name');
      expect(mapped).toHaveProperty('category_id');
      expect(mapped).toHaveProperty('commission_rate');
      expect(mapped).toHaveProperty('seller_id');
      expect(mapped).toHaveProperty('seller_name');
      expect(mapped).toHaveProperty('platform_id');
      expect(mapped).toHaveProperty('currency');

      // Check types
      expect(typeof mapped.title).toBe('string');
      expect(typeof mapped.price).toBe('number');
      expect(typeof mapped.orders_24h).toBe('number');
      expect(typeof mapped.rating).toBe('number');
      expect(typeof mapped.reviews_count).toBe('number');
      expect(typeof mapped.trending_score).toBe('number');
      expect(typeof mapped.platform_id).toBe('string');
      expect(typeof mapped.currency).toBe('string');
    });
  });
});
