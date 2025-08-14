# TikTok Shop BR Actor

A specialized Apify Actor for scraping TikTok Shop products with focus on the Brazilian market. Uses residential proxy in Brazil, filters for BR signals, and outputs data mapped to Supabase products schema.

## 🇧🇷 Why Brazilian Proxy?

This actor uses **Apify residential proxy in Brazil** for all scraping requests. This is critical because:

- **Authentic Brazilian results**: TikTok Shop shows different products, prices, and availability based on geographic location
- **Reduced captcha**: Brazilian IP addresses are less likely to trigger anti-bot measures when accessing BR content
- **Correct currency and stock**: Ensures we get BRL prices and Brazilian warehouse inventory
- **Regional compliance**: Respects TikTok's geo-targeting and provides accurate market data

## 🚀 Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your APIFY_TOKEN
   ```

3. **Run the actor**:
   ```bash
   pnpm start
   # or
   apify run
   ```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
APIFY_TOKEN=your_apify_token_here
APIFY_PROXY_GROUPS=RESIDENTIAL
APIFY_PROXY_COUNTRY_CODE=BR
```

## 📋 Input Configuration

### Example Input JSON

#### 1. Default Brazilian keyword search:
```json
{
  "region": "BR",
  "limit": 20,
  "isTrendingProducts": false,
  "keyword": "baby",
  "sortType": "RELEVANCE",
  "requireBrazilSignals": true,
  "dropIfNoImage": true
}
```

#### 2. Trending products:
```json
{
  "region": "BR",
  "limit": 50,
  "isTrendingProducts": true,
  "requireBrazilSignals": true,
  "dropIfNoImage": true,
  "debug": true
}
```

#### 3. Price-filtered search:
```json
{
  "region": "BR",
  "limit": 100,
  "keyword": "smartphone",
  "sortType": "PRICE_ASC",
  "minPrice": 100,
  "maxPrice": 1000,
  "requireBrazilSignals": true,
  "dropIfNoImage": false
}
```

### Input Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `region` | string | "BR" | Target region (BR, VN, US, etc.) |
| `limit` | integer | 20 | Max products to scrape (1-10000) |
| `isTrendingProducts` | boolean | false | Scrape trending instead of search |
| `keyword` | string | "baby" | Search keyword |
| `sortType` | enum | "RELEVANCE" | Sort order (PRICE_ASC, PRICE_DESC, BEST_SELLERS, RELEVANCE) |
| `minPrice` | number | - | Minimum price filter |
| `maxPrice` | number | - | Maximum price filter |
| `requireBrazilSignals` | boolean | true | Filter non-Brazilian products |
| `dropIfNoImage` | boolean | true | Remove products without images |
| `maxConcurrency` | integer | 5 | Concurrent requests limit |
| `debug` | boolean | false | Enable debug logging |

## 📊 Output Format

Each dataset item contains both raw and mapped data:

```json
{
  "raw": {
    "product_id": "123456789",
    "title": "Produto Exemplo",
    "cover": "https://example.com/image.jpg",
    "floor_price": "9999",
    "currency": "BRL",
    "warehouse_region": "São Paulo, Brasil",
    "seller_product_info": {
      "seller_name": "Loja Exemplo",
      "seller_id_str": "seller123"
    }
  },
  "mapped": {
    "title": "Produto Exemplo",
    "image_url": "https://example.com/image.jpg",
    "price": 99.99,
    "orders_24h": 150,
    "rating": 4.5,
    "reviews_count": 89,
    "trending_score": 0.75,
    "shop_name": "Loja Exemplo",
    "category_id": null,
    "commission_rate": null,
    "seller_id": "seller123",
    "seller_name": "Loja Exemplo",
    "platform_id": "123456789",
    "currency": "BRL"
  }
}
```

## 🗄️ Supabase Integration

### Table Schema Mapping

The `mapped` output matches the Supabase `products` table:

| Supabase Field | TikTok Source | Transformation |
|----------------|---------------|----------------|
| `title` | `title` | Direct mapping |
| `image_url` | `cover` or `img[0]` | First valid image URL |
| `price` | `floor_price` or `format_price` | Parsed to number |
| `orders_24h` | `sold_count` or `global_sold_count` | Parsed to integer |
| `rating` | `product_rating` | Parsed to float |
| `reviews_count` | `review_count` | Parsed to integer |
| `trending_score` | Calculated | `(sales*0.6 + rating*0.4)` |
| `shop_name` | `seller_product_info.seller_name` | Direct mapping |
| `category_id` | - | `null` (not available) |
| `commission_rate` | - | `null` (not available) |
| `seller_id` | `seller_product_info.seller_id_str` | String conversion |
| `seller_name` | `seller_product_info.seller_name` | Same as shop_name |
| `platform_id` | `product_id_str` or `product_id` | Unique identifier |
| `currency` | `currency` or detected | Normalized to BRL when BR signals |

### Trending Score Formula

```
trending_score = (normalized_sales * 0.6) + (normalized_rating * 0.4)

Where:
- normalized_sales = min(sold_count / 1000, 1)
- normalized_rating = min(rating / 5, 1)
```

## 🔧 n8n Integration

### Quick Setup

1. Import the workflow: `n8n/tiktok_to_supabase.json`
2. Configure these variables in the "Set Config" node:
   - `APIFY_TOKEN`: Your Apify API token
   - `ACTOR_ID`: `your-actor-id` (after publishing)
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase service role key
   - `SUPABASE_TABLE`: `products`

### Workflow Steps

1. **Set Config** - Define all configuration variables
2. **Start Actor** - POST to Apify API with input JSON
3. **Get Dataset Items** - Retrieve results using `defaultDatasetId`
4. **Map to Supabase** - Extract `mapped` objects from results
5. **Supabase Upsert** - Insert/update with conflict resolution on `platform_id`

### Supabase Upsert Configuration

**URL**: `{{SUPABASE_URL}}/rest/v1/{{SUPABASE_TABLE}}?on_conflict=platform_id`

**Headers**:
```json
{
  "apikey": "{{SUPABASE_KEY}}",
  "Authorization": "Bearer {{SUPABASE_KEY}}",
  "Content-Type": "application/json",
  "Prefer": "resolution=merge-duplicates,return=representation"
}
```

**Body**: `{{$items().map(i => i.json)}}`

### Security Notes

- Use **service_role** key only in secure server environments
- Configure Row Level Security (RLS) policies in Supabase
- Never expose service_role key in client-side code
- Consider using **anon** key with proper RLS for public access

## 🧪 Testing

Run tests with:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests once
pnpm test:run
```

### Test Coverage

- `parsePrice()` - Price parsing from various formats
- `pickImageUrl()` - Image URL selection logic
- `filterBrazil()` - Brazilian market signal detection
- `mapToSupabase()` - Schema mapping accuracy
- Mock data includes both VN and BR samples to verify filtering

## 🏗️ Development

### Build

```bash
pnpm build
```

### Linting & Formatting

```bash
pnpm lint
pnpm lint:fix
pnpm format
```

### Type Checking

```bash
pnpm type-check
```

## 🚨 Limitations & Tips

### Common Issues

1. **Captcha**: If you encounter captcha, the Brazilian proxy should help reduce this
2. **Rate Limiting**: Adjust `maxConcurrency` if you hit rate limits
3. **No Results**: Try relaxing `requireBrazilSignals` to `false` for testing
4. **Price Parsing**: Some prices may not parse correctly due to formatting variations

### Optimization Tips

- Start with small `limit` values for testing
- Use `debug: true` to understand filtering behavior
- Monitor the filtering stats in logs
- Adjust price ranges based on your target market

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📞 Support

For issues related to:
- **Apify platform**: Check [Apify documentation](https://docs.apify.com/)
- **TikTok Shop changes**: Monitor for UI/API changes that may affect scraping
- **Supabase integration**: Refer to [Supabase documentation](https://supabase.com/docs)

---

**Note**: This actor is designed for legitimate business intelligence and market research purposes. Please respect TikTok's terms of service and rate limits.
