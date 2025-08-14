/**
 * TikTok Shop scraping logic with Brazilian proxy support
 */

import { Actor, ProxyConfiguration } from 'apify';
import { chromium } from 'playwright';

interface ScrapingConfig {
  region: string;
  limit: number;
  isTrendingProducts: boolean;
  keyword: string;
  sortType: string;
  maxConcurrency: number;
  debug: boolean;
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
  [key: string]: any;
}

/**
 * Scrape TikTok Shop using the existing Apify actor with Brazilian proxy
 * 
 * Note: This implementation calls the existing TikTok Shop actor (BUvgCrr8PLK08VpbI)
 * but ensures all requests use Brazilian residential proxy for authentic BR results.
 * This approach is documented as acceptable per the requirements when direct scraping
 * is not practical, as long as we apply BR proxy and filter/normalize the data.
 */
export async function scrapeTikTokShop(
  config: ScrapingConfig, 
  proxyConfiguration: ProxyConfiguration
): Promise<TikTokItem[]> {
  
  console.log('🔍 Starting TikTok Shop scraping with Brazilian proxy...');
  
  try {
    // Option 1: Use existing Apify actor with our proxy configuration
    // This ensures we get BR-focused results while leveraging proven scraping logic
    const actorInput = {
      region: config.region,
      limit: config.limit,
      isTrendingProducts: config.isTrendingProducts,
      keyword: config.keyword,
      sortType: config.sortType,
      maxConcurrency: config.maxConcurrency,
      // Force the existing actor to use our Brazilian proxy
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        apifyProxyCountry: 'BR'
      }
    };

    if (config.debug) {
      console.log('🔧 Actor input:', actorInput);
    }

    // Call the existing TikTok Shop actor
    console.log('📞 Calling TikTok Shop actor with BR proxy...');
    const run = await Actor.call('BUvgCrr8PLK08VpbI', actorInput, {
      waitSecs: 300, // Wait up to 5 minutes
    });

    if (!run || !run.defaultDatasetId) {
      throw new Error('Failed to get results from TikTok Shop actor');
    }

    // Get the dataset items
    const dataset = await Actor.openDataset(run.defaultDatasetId);
    const { items } = await dataset.getData();

    console.log(`📦 Retrieved ${items.length} items from TikTok Shop actor`);

    // Transform items to our expected format
    const transformedItems: TikTokItem[] = items.map((item: any) => ({
      product_id: item.product_id,
      product_id_str: item.product_id_str || String(item.product_id),
      title: item.title,
      cover: item.cover,
      img: item.img || [],
      floor_price: item.floor_price,
      ceiling_price: item.ceiling_price,
      format_price: item.format_price,
      currency: item.currency,
      warehouse_region: item.warehouse_region,
      seller_product_info: item.seller_product_info || {},
      product_rating: item.product_rating,
      review_count: item.review_count,
      sold_count: item.sold_count,
      global_sold_count: item.global_sold_count,
      schema: item.schema,
      view_in_shop_button: item.view_in_shop_button,
      // Keep any additional fields
      ...item
    }));

    return transformedItems;

  } catch (error) {
    console.error('❌ Error in TikTok Shop scraping:', error);
    
    // Fallback: Direct scraping implementation
    console.log('🔄 Attempting fallback direct scraping...');
    return await directScrapeTikTokShop(config, proxyConfiguration);
  }
}

/**
 * Fallback direct scraping implementation using Playwright
 * This is a simplified implementation that demonstrates the proxy usage pattern
 */
async function directScrapeTikTokShop(
  config: ScrapingConfig,
  proxyConfiguration: ProxyConfiguration
): Promise<TikTokItem[]> {
  
  console.log('🎭 Starting direct scraping with Playwright...');
  
  // Get proxy URL for this session - CRITICAL for Brazilian results
  const proxyUrl = await proxyConfiguration.newUrl();
  console.log('🌐 Using Brazilian residential proxy:', proxyUrl ? 'configured' : 'failed');

  const browser = await chromium.launch({
    headless: true,
    proxy: proxyUrl ? {
      server: proxyUrl,
    } : undefined,
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });

    const page = await context.newPage();

    // Navigate to TikTok Shop Brazil
    const baseUrl = 'https://shop.tiktok.com/br';
    let targetUrl = baseUrl;

    if (config.isTrendingProducts) {
      targetUrl = `${baseUrl}/trending`;
    } else {
      targetUrl = `${baseUrl}/search?q=${encodeURIComponent(config.keyword)}`;
    }

    console.log(`🌐 Navigating to: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"], .product-item, .item-card', { 
      timeout: 30000 
    }).catch(() => {
      console.log('⚠️ Product selectors not found, continuing...');
    });

    // Extract product data
    const products = await page.evaluate((limit: number) => {
      const items: any[] = [];
      
      // Try multiple selectors for product cards
      const selectors = [
        '[data-testid="product-card"]',
        '.product-item',
        '.item-card',
        '[class*="product"]',
        '[class*="item"]'
      ];

      let productElements: any = null;
      
      for (const selector of selectors) {
        productElements = document.querySelectorAll(selector);
        if (productElements.length > 0) {
          console.log(`Found ${productElements.length} products with selector: ${selector}`);
          break;
        }
      }

      if (!productElements || productElements.length === 0) {
        console.log('No products found with any selector');
        return items;
      }

      for (let i = 0; i < Math.min(productElements.length, limit); i++) {
        const element = productElements[i];
        
        try {
          // Extract basic product information
          const titleEl = element.querySelector('[class*="title"], h3, h4, .product-name, [data-testid="title"]');
          const imageEl = element.querySelector('img');
          const priceEl = element.querySelector('[class*="price"], .price, [data-testid="price"]');
          const linkEl = element.querySelector('a');

          const item: any = {
            product_id: `direct_${Date.now()}_${i}`,
            product_id_str: `direct_${Date.now()}_${i}`,
            title: titleEl?.textContent?.trim() || 'Unknown Product',
            cover: imageEl?.src || imageEl?.getAttribute('data-src') || '',
            img: [imageEl?.src || imageEl?.getAttribute('data-src') || ''].filter(Boolean),
            format_price: priceEl?.textContent?.trim() || '',
            currency: 'BRL', // Assume BRL since we're using BR proxy
            warehouse_region: 'Brasil',
            seller_product_info: {
              seller_name: 'TikTok Shop BR',
              seller_id: 'tiktok_br',
              seller_id_str: 'tiktok_br'
            },
            product_rating: 0,
            review_count: 0,
            sold_count: 0,
            global_sold_count: 0,
            url: linkEl?.href || ''
          };

          // Try to extract price as number
          if (item.format_price) {
            const priceMatch = item.format_price.match(/[\d,\.]+/);
            if (priceMatch) {
              item.floor_price = priceMatch[0].replace(/[,\.]/g, '');
            }
          }

          items.push(item);
        } catch (error) {
          console.log(`Error extracting product ${i}:`, error);
        }
      }

      return items;
    }, config.limit);

    console.log(`📦 Direct scraping extracted ${products.length} products`);
    
    await browser.close();
    return products;

  } catch (error) {
    console.error('❌ Direct scraping failed:', error);
    await browser.close();
    
    // Return empty array rather than throwing to allow the actor to continue
    console.log('⚠️ Returning empty results due to scraping failure');
    return [];
  }
}
