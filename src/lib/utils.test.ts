import { describe, it, expect } from 'vitest';
import { 
  parsePrice, 
  pickImageUrl, 
  hasBrazilianCurrency, 
  isBrazilianWarehouse,
  calculateTrendingScore,
  normalizeCurrency,
  cleanPlatformId
} from './utils.js';

describe('parsePrice', () => {
  it('should parse numeric prices correctly', () => {
    expect(parsePrice(123.45)).toBe(123.45);
    expect(parsePrice(0)).toBe(0);
  });

  it('should parse string prices correctly', () => {
    expect(parsePrice('123.45')).toBe(123.45);
    expect(parsePrice('586671556')).toBe(586671556);
    expect(parsePrice('586.671.556')).toBe(586671556);
  });

  it('should handle Brazilian currency format', () => {
    expect(parsePrice('R$ 123,45')).toBe(123.45);
    expect(parsePrice('R$ 1.234,56')).toBe(1234.56);
  });

  it('should handle Vietnamese currency format', () => {
    expect(parsePrice('586.671.556₫')).toBe(586671556);
    expect(parsePrice('123₫')).toBe(123);
  });

  it('should handle invalid inputs', () => {
    expect(parsePrice('')).toBe(0);
    expect(parsePrice(undefined)).toBe(0);
    expect(parsePrice('invalid')).toBe(0);
  });
});

describe('pickImageUrl', () => {
  it('should prefer cover image', () => {
    const cover = 'https://example.com/cover.jpg';
    const images = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];
    expect(pickImageUrl(cover, images)).toBe(cover);
  });

  it('should fallback to first image in array', () => {
    const images = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];
    expect(pickImageUrl('', images)).toBe(images[0]);
    expect(pickImageUrl(undefined, images)).toBe(images[0]);
  });

  it('should handle empty inputs', () => {
    expect(pickImageUrl('', [])).toBe(null);
    expect(pickImageUrl(undefined, undefined)).toBe(null);
  });

  it('should filter invalid URLs', () => {
    const images = ['', 'invalid-url', 'https://example.com/valid.jpg'];
    expect(pickImageUrl('', images)).toBe('https://example.com/valid.jpg');
  });
});

describe('hasBrazilianCurrency', () => {
  it('should detect BRL currency', () => {
    expect(hasBrazilianCurrency('R$ 123,45', 'BRL')).toBe(true);
    expect(hasBrazilianCurrency('123,45', 'BRL')).toBe(true);
    expect(hasBrazilianCurrency('123,45', 'R$')).toBe(true);
  });

  it('should detect R$ symbol in price string', () => {
    expect(hasBrazilianCurrency('R$ 123,45')).toBe(true);
    expect(hasBrazilianCurrency('123,45 R$')).toBe(true);
  });

  it('should not detect non-Brazilian currencies', () => {
    expect(hasBrazilianCurrency('$123.45', 'USD')).toBe(false);
    expect(hasBrazilianCurrency('123₫', 'VND')).toBe(false);
  });
});

describe('isBrazilianWarehouse', () => {
  it('should detect Brazilian states', () => {
    expect(isBrazilianWarehouse('São Paulo, Brasil')).toBe(true);
    expect(isBrazilianWarehouse('RJ')).toBe(true);
    expect(isBrazilianWarehouse('Rio de Janeiro')).toBe(true);
    expect(isBrazilianWarehouse('Brazil')).toBe(true);
  });

  it('should not detect non-Brazilian regions', () => {
    expect(isBrazilianWarehouse('Vietnam')).toBe(false);
    expect(isBrazilianWarehouse('Ho Chi Minh')).toBe(false);
    expect(isBrazilianWarehouse('')).toBe(false);
    expect(isBrazilianWarehouse(undefined)).toBe(false);
  });
});

describe('calculateTrendingScore', () => {
  it('should calculate score correctly', () => {
    expect(calculateTrendingScore(500, 4.5, 1000, 5)).toBe(0.66);
    expect(calculateTrendingScore(1000, 5, 1000, 5)).toBe(1);
    expect(calculateTrendingScore(0, 0)).toBe(0);
  });

  it('should handle edge cases', () => {
    expect(calculateTrendingScore(2000, 6, 1000, 5)).toBe(1); // Capped at 1
    expect(calculateTrendingScore(-100, -1)).toBe(0); // Negative values
  });
});

describe('normalizeCurrency', () => {
  it('should normalize to BRL when Brazil signals detected', () => {
    expect(normalizeCurrency('VND', 'R$ 123', true)).toBe('BRL');
    expect(normalizeCurrency('USD', '123', true)).toBe('BRL');
  });

  it('should keep original currency when no Brazil signals', () => {
    expect(normalizeCurrency('VND', '123₫', false)).toBe('VND');
    expect(normalizeCurrency('USD', '$123', false)).toBe('USD');
  });

  it('should default to USD when no currency provided', () => {
    expect(normalizeCurrency(undefined, '123', false)).toBe('USD');
  });
});

describe('cleanPlatformId', () => {
  it('should handle string IDs', () => {
    expect(cleanPlatformId('123456789')).toBe('123456789');
    expect(cleanPlatformId('  abc123  ')).toBe('abc123');
  });

  it('should convert numeric IDs to strings', () => {
    expect(cleanPlatformId(123456789)).toBe('123456789');
  });

  it('should generate fallback IDs for invalid inputs', () => {
    const id1 = cleanPlatformId('');
    const id2 = cleanPlatformId(null);
    const id3 = cleanPlatformId(undefined);
    
    expect(id1).toMatch(/^tiktok_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^tiktok_\d+_[a-z0-9]+$/);
    expect(id3).toMatch(/^tiktok_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2); // Should be unique
  });
});
