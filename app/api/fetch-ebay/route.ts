import { NextResponse } from 'next/server';
import { buildEbayActiveUrl, buildEbaySoldUrl, buildScraperUrl, parseSoldHtml, average } from '@/lib/scraper';
import type { VisionItem, EbayResult } from '@/lib/types';
import pLimit from 'p-limit';

export const runtime = 'nodejs';

type Body = { items: VisionItem[] };

export async function POST(req: Request) {
  try {
    const body = await req.json() as Body;
    if (!body?.items?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const limit = pLimit(2);
    const results: EbayResult[] = await Promise.all(body.items.map((item, idx) =>
      limit(async () => {
        const query = (item.search || `${item.title}${item.year ? ' ('+item.year+')' : ''}${item.platform ? ' ' + item.platform : ''}`).trim();
        const soldUrl = buildEbaySoldUrl(query);
        const activeUrl = buildEbayActiveUrl(query);
        const soldScrape = buildScraperUrl(soldUrl);
        const activeScrape = buildScraperUrl(activeUrl);

        console.log(`🕷️ [${idx+1}/${body.items.length}] Fetching SOLD for "${query}"`);
        const soldRes = await fetch(soldScrape, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } });
        const soldHtml = await soldRes.text();
        const parsed = parseSoldHtml(soldHtml);
        let status: 'OK'|'NRS' = 'OK';
        if (parsed.noExactMatches || parsed.prices.length === 0) status = 'NRS';

        // Limit to 10
        const prices = parsed.prices.slice(0, 10);
        const links = parsed.links.slice(0, 10);
        const avg = average(prices);

        console.log(`🔢 Prices: ${prices.join(', ')} | avg=${avg ?? 'null'}`);

        console.log(`🕷️ Fetching ACTIVE for "${query}"`);
        const actRes = await fetch(activeScrape, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } });
        const actHtml = await actRes.text();
        const activeCount = (() => {
          // Best-effort parse of results count
          const match = actHtml.replaceAll(',', '').match(/([0-9]+) results/ig);
          if (match && match.length) {
            const m = match[0].match(/([0-9]+)/);
            if (m) return Number(m[1]);
          }
          return null;
        })();

        const soldCount = parsed.totalCount ?? prices.length;

        const result: EbayResult = {
          title: query,
          sold_prices_aud: prices,
          sold_links: links,
          avg_sold_aud: status === 'OK' ? avg : null,
          sold_90d: soldCount,
          available_now: activeCount,
          sold_search_link: soldUrl,
          status,
        };
        return result;
      })
    ));

    return NextResponse.json(results);
  } catch (err: any) {
    console.error('⚠️ fetch-ebay error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
