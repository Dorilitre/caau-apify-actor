import { describe, it, expect } from 'vitest';
import { filterBrazil } from './filters.js';

// Mock TikTok items for testing
const mockBrazilianItem = {
  product_id: '123',
  product_id_str: '123',
  title: 'Produto Brasileiro',
  cover: 'https://example.com/image.jpg',
  floor_price: '9999',
  format_price: 'R$ 99,99',
  currency: 'BRL',
  warehouse_region: 'São Paulo, Brasil',
  seller_product_info: {
    seller_name: 'Loja BR',
    seller_id_str: 'seller123'
  }
};

const mockVietnameseItem = {
  product_id: '456',
  product_id_str: '456',
  title: 'Vietnamese Product',
  cover: 'https://example.com/image2.jpg',
  floor_price: '586671556',
  format_price: '586.671.556₫',
  currency: 'VND',
  warehouse_region: 'Ho Chi Minh, Vietnam',
  seller_product_info: {
    seller_name: 'VN Shop',
    seller_id_str: 'seller456'
  }
};

const mockItemWithoutImage = {
  product_id: '789',
  product_id_str: '789',
  title: 'No Image Product',
  cover: '',
  img: [],
  floor_price: '5000',
  format_price: 'R$ 50,00',
  currency: 'BRL',
  warehouse_region: 'Rio de Janeiro, Brasil'
};

const mockExpensiveItem = {
  product_id: '999',
  product_id_str: '999',
  title: 'Expensive Product',
  cover: 'https://example.com/expensive.jpg',
  floor_price: '200000',
  format_price: 'R$ 2.000,00',
  currency: 'BRL',
  warehouse_region: 'Brasil'
};

describe('filterBrazil', () => {
  describe('Brazil signals filtering', () => {
    it('should keep Brazilian items when requireBrazilSignals is true', () => {
      const items = [mockBrazilianItem, mockVietnameseItem];
      const filtered = filterBrazil(items, { requireBrazilSignals: true });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].product_id).toBe('123');
    });

    it('should keep all items when requireBrazilSignals is false', () => {
      const items = [mockBrazilianItem, mockVietnameseItem];
      const filtered = filterBrazil(items, { requireBrazilSignals: false });
      
      expect(filtered).toHaveLength(2);
    });

    it('should detect Brazil signals from currency', () => {
      const itemWithBrlCurrency = {
        ...mockVietnameseItem,
        currency: 'BRL'
      };
      
      const filtered = filterBrazil([itemWithBrlCurrency], { requireBrazilSignals: true });
      expect(filtered).toHaveLength(1);
    });

    it('should detect Brazil signals from price format', () => {
      const itemWithRealSymbol = {
        ...mockVietnameseItem,
        format_price: 'R$ 123,45',
        currency: 'VND' // Even with VND currency, R$ symbol should be detected
      };
      
      const filtered = filterBrazil([itemWithRealSymbol], { requireBrazilSignals: true });
      expect(filtered).toHaveLength(1);
    });

    it('should detect Brazil signals from warehouse region', () => {
      const itemWithBrWarehouse = {
        ...mockVietnameseItem,
        warehouse_region: 'São Paulo, SP, Brasil'
      };
      
      const filtered = filterBrazil([itemWithBrWarehouse], { requireBrazilSignals: true });
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Image filtering', () => {
    it('should remove items without images when dropIfNoImage is true', () => {
      const items = [mockBrazilianItem, mockItemWithoutImage];
      const filtered = filterBrazil(items, { 
        requireBrazilSignals: true, 
        dropIfNoImage: true 
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].product_id).toBe('123');
    });

    it('should keep items without images when dropIfNoImage is false', () => {
      const items = [mockBrazilianItem, mockItemWithoutImage];
      const filtered = filterBrazil(items, { 
        requireBrazilSignals: true, 
        dropIfNoImage: false 
      });
      
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Price filtering', () => {
    it('should filter by minimum price', () => {
      const items = [mockBrazilianItem, mockExpensiveItem]; // 99.99 vs 2000.00
      const filtered = filterBrazil(items, { 
        requireBrazilSignals: true,
        minPrice: 1000
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].product_id).toBe('999'); // Only expensive item
    });

    it('should filter by maximum price', () => {
      const items = [mockBrazilianItem, mockExpensiveItem];
      const filtered = filterBrazil(items, { 
        requireBrazilSignals: true,
        maxPrice: 1000
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].product_id).toBe('123'); // Only cheaper item
    });

    it('should filter by price range', () => {
      const items = [mockBrazilianItem, mockExpensiveItem];
      const filtered = filterBrazil(items, { 
        requireBrazilSignals: true,
        minPrice: 50,
        maxPrice: 150
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].product_id).toBe('123');
    });

    it('should exclude non-BRL items when price filtering and requireBrazilSignals is active', () => {
      const items = [mockVietnameseItem]; // VND currency
      const filtered = filterBrazil(items, { 
        requireBrazilSignals: false, // Allow VND items
        minPrice: 100 // But apply price filter
      });
      
      // VND item should be excluded due to price filtering complexity
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Combined filtering', () => {
    it('should apply all filters together', () => {
      const items = [
        mockBrazilianItem,      // BR, has image, price 99.99
        mockVietnameseItem,     // VN, has image, price high
        mockItemWithoutImage,   // BR, no image, price 50.00
        mockExpensiveItem       // BR, has image, price 2000.00
      ];
      
      const filtered = filterBrazil(items, {
        requireBrazilSignals: true,
        dropIfNoImage: true,
        minPrice: 90,
        maxPrice: 1500
      });
      
      // Only mockBrazilianItem should pass all filters
      expect(filtered).toHaveLength(1);
      expect(filtered[0].product_id).toBe('123');
    });

    it('should return empty array when no items pass filters', () => {
      const items = [mockVietnameseItem];
      const filtered = filterBrazil(items, {
        requireBrazilSignals: true, // VN item will be filtered out
        dropIfNoImage: true
      });
      
      expect(filtered).toHaveLength(0);
    });

    it('should handle empty input array', () => {
      const filtered = filterBrazil([], {
        requireBrazilSignals: true,
        dropIfNoImage: true
      });
      
      expect(filtered).toHaveLength(0);
    });
  });
});
