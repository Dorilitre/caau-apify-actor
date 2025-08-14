import { Actor } from 'apify';
import { scrapeTikTokShop } from './lib/tiktok.js';
import { filterBrazil } from './lib/filters.js';
import { mapToSupabase } from './lib/mapping.js';

interface ActorInput {
  region?: string;
  limit?: number;
  isTrendingProducts?: boolean;
  keyword?: string;
  sortType?: 'PRICE_ASC' | 'PRICE_DESC' | 'BEST_SELLERS' | 'RELEVANCE';
  minPrice?: number;
  maxPrice?: number;
  requireBrazilSignals?: boolean;
  dropIfNoImage?: boolean;
  maxConcurrency?: number;
  debug?: boolean;
}

Actor.main(async () => {
  const input = await Actor.getInput<ActorInput>();
  
  // Set defaults
  const config = {
    region: input?.region || 'BR',
    limit: input?.limit || 20,
    isTrendingProducts: input?.isTrendingProducts || false,
    keyword: input?.keyword || 'baby',
    sortType: input?.sortType || 'RELEVANCE',
    minPrice: input?.minPrice,
    maxPrice: input?.maxPrice,
    requireBrazilSignals: input?.requireBrazilSignals ?? true,
    dropIfNoImage: input?.dropIfNoImage ?? true,
    maxConcurrency: input?.maxConcurrency || 5,
    debug: input?.debug || false,
  };

  if (config.debug) {
    console.log('Actor input configuration:', config);
  }

  // Create proxy configuration for Brazil residential proxies
  // This is critical for getting Brazilian results and avoiding captcha
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ['RESIDENTIAL'],
    countryCode: 'BR',
  });

  if (!proxyConfiguration) {
    throw new Error('Failed to create proxy configuration for Brazil');
  }

  console.log('🇧🇷 Using Brazilian residential proxy for authentic BR results');

  try {
    // Step 1: Scrape TikTok Shop
    console.log(`🔍 Starting TikTok Shop scraping for ${config.isTrendingProducts ? 'trending products' : `keyword: "${config.keyword}"`}`);
    const rawItems = await scrapeTikTokShop(config, proxyConfiguration);
    console.log(`📦 Scraped ${rawItems.length} raw items`);

    // Step 2: Filter for Brazil signals
    const filteredItems = filterBrazil(rawItems, config);
    console.log(`🇧🇷 After Brazil filtering: ${filteredItems.length} items kept`);

    // Step 3: Map to Supabase schema
    const mappedItems = filteredItems.map(item => mapToSupabase(item));
    console.log(`🗄️ Mapped ${mappedItems.length} items to Supabase schema`);

    // Step 4: Save to dataset with both raw and mapped data
    for (let i = 0; i < filteredItems.length; i++) {
      await Actor.pushData({
        raw: filteredItems[i],
        mapped: mappedItems[i],
      });
    }

    // Summary log
    console.log('\n📊 SCRAPING SUMMARY:');
    console.log(`   Total raw items: ${rawItems.length}`);
    console.log(`   Kept after Brazil filter: ${filteredItems.length}`);
    console.log(`   Successfully mapped: ${mappedItems.length}`);
    
    if (config.requireBrazilSignals && rawItems.length > filteredItems.length) {
      console.log(`   ⚠️  Filtered out ${rawItems.length - filteredItems.length} items without Brazil signals`);
    }

    console.log('\n✅ Actor completed successfully!');

  } catch (error) {
    console.error('❌ Actor failed:', error);
    throw error;
  }
});
