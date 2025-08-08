# SIBI (Should I Buy It)
A minimal, complete Next.js (app dir) build with:
- Vision analyse (OpenAI GPT-4o)
- LEGO set-number specific queries
- eBay sold/active scrape via ScraperAPI
- Median-of-last-10 (after filters)
- UI gating (no partial totals)

## Env
OPENAI_API_KEY
SCRAPER_API_KEY (or SCRAPER_KEY / SCRAPERAPI_KEY)

Optional:
SIBI_VISION_MODEL=gpt-4o
SCRAPE_MAX_ITEMS_PER_CALL=1
SIBI_OUTLIER_LOW=0.3
SIBI_OUTLIER_HIGH=2.0
