import { NextResponse } from 'next/server';
import { buildEbayActiveUrl, buildEbaySoldUrl, buildScraperUrl, parseSoldHtml, median, parseActiveCountHtml } from '@/lib/scraper';
import type { VisionItem, EbayResult } from '@/lib/types';
import { fetchWithTimeout, sleep } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = { items: VisionItem[] };

function withinGptBounds(price: number, gpt?: number | null): boolean {
  if (typeof gpt !== 'number' || Number.isNaN(gpt)) return true;
  const lo = 0.3 * gpt;
  const hi = 2.0 * gpt;
  return price >= lo && price <= hi;
}

async function processItem(item: VisionItem, idx: number, total: number): Promise<EbayResult> {
  const started = Date.now();
  const query = (item.search || `${item.title}${item.year ? ' (' + item.year + ')' : ''}${item.platform ? ' ' + item.platform : ''}`).trim();
  const soldUrl = buildEbaySoldUrl(query);
  const activeUrl = buildEbayActiveUrl(query);
  const soldScrape = buildScraperUrl(soldUrl);
  const activeScrape = buildScraperUrl(activeUrl);

  try {
    console.log(`🕷️ [${idx + 1}/${total}] SOLD start "${query}"`);
    const soldRes = await fetchWithTimeout(soldScrape, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, 25000);
    const soldHtml = await soldRes.text();
    const parsed = parseSoldHtml(soldHtml);

    let status: 'OK' | 'NRS' = 'OK';
    let prices = parsed.prices;
    let links = parsed.links;

    // Apply filters
    const filtered: number[] = [];
    const filteredLinks: string[] = [];
    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      const l = links[i];
      if (p === 20) continue; // ignore $20 adverts
      if (!withinGptBounds(p, item.gpt_value_aud)) continue; // GPT bound filter
      filtered.push(p);
      filteredLinks.push(l);
    }

    if (parsed.noExactMatches || filtered.length === 0) status = 'NRS';

    // Limit to 10 valid items
    prices = filtered.slice(0, 10);
    links = filteredLinks.slice(0, 10);

    const med = median(prices);
    console.log(`🔢 [${idx + 1}/${total}] PricesFiltered(${prices.length}<=10): ${prices.join(', ')} | median=${med ?? 'null'}`);

    // ACTIVE
    console.log(`🕷️ [${idx + 1}/${total}] ACTIVE start "${query}"`);
    const actRes = await fetchWithTimeout(activeScrape, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, 20000);
    const actHtml = await actRes.text();
    const ac = parseActiveCountHtml(actHtml);
    const activeCount = ac.count;
    console.log(`🔎 Active count method=${ac.method} value=${activeCount ?? 'null'}`);

    const soldCount = parsed.totalCount ?? prices.length;
    const took = Date.now() - started;
    console.log(`✅ [${idx + 1}/${total}] Done "${query}" in ${took}ms`);

    return {
      title: query,
      sold_prices_aud: prices,
      sold_links: links,
      avg_sold_aud: status === 'OK' ? med : null,
      sold_90d: soldCount,
      available_now: activeCount,
      sold_search_link: soldUrl,
      status,
    };
  } catch (e: any) {
    console.error(`⚠️ [${idx + 1}/${total}] Error "${query}":`, e?.message || e);
    return {
      title: query,
      sold_prices_aud: [],
      sold_links: [],
      avg_sold_aud: null,
      sold_90d: 0,
      available_now: null,
      sold_search_link: soldUrl,
      status: 'NRS',
    };
  }
}

export async function POST(req: Request) {
  try {
    console.log('🕷️ /fetch-ebay invoked');
    const body = await req.json() as Body;
    const total = body?.items?.length || 0;
    console.log(`🕷️ Received ${total} items`);
    const MAX_ITEMS_PER_CALL = Number(process.env.SCRAPE_MAX_ITEMS_PER_CALL || 2);
    const sliceEnd = Math.min(total, MAX_ITEMS_PER_CALL);
    const items = (body?.items || []).slice(0, sliceEnd);

    const batchSize = Number(process.env.SCRAPE_CONCURRENCY || 2);
    const delayMs = Number(process.env.SCRAPE_DELAY_MS || 300);
    const results: EbayResult[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const slice = items.slice(i, i + batchSize);
      const batch = await Promise.all(slice.map((it, j) => processItem(it, i + j, items.length)));
      results.push(...batch);
      if (i + batchSize < items.length) await sleep(delayMs);
    }

    const partial = (total > items.length);
    const res = NextResponse.json(results);
    if (partial) res.headers.set('x-sibi-next', String(items.length));
    return res;
  } catch (err: any) {
    console.error('⚠️ fetch-ebay error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
