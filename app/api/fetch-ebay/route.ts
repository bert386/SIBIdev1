import { NextResponse } from 'next/server';
import { buildEbayActiveUrl, buildEbaySoldUrl, buildScraperUrl, parseSoldHtml, median, parseActiveCountHtml } from '@/lib/scraper';
import type { VisionItem, EbayResult } from '@/lib/types';
import { fetchWithRetry, sleep } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = { items: VisionItem[] };

function filterPrices(rawPrices: number[], rawLinks: string[], gpt?: number | null) {
  const pairs = rawPrices.map((p, i) => ({ p, link: rawLinks[i] }));
  // drop $20 ads exactly
  let filtered = pairs.filter(x => Math.round(x.p * 100) / 100 !== 20);
  const lowPct = Number(process.env.SIBI_OUTLIER_LOW || 0.3);
  const highPct = Number(process.env.SIBI_OUTLIER_HIGH || 2.0);
  if (gpt && gpt > 0) {
    const lo = gpt * lowPct;
    const hi = gpt * highPct;
    filtered = filtered.filter(x => x.p >= lo && x.p <= hi);
  }
  // take first 10 remaining
  filtered = filtered.slice(0, 10);
  const prices = filtered.map(x => x.p);
  const links = filtered.map(x => x.link);
  return { prices, links, filteredCount: filtered.length };
}

async function processItem(item: VisionItem, idx: number, total: number): Promise<EbayResult> {
  const started = Date.now();
  const query = (item.search || `${item.title}${item.year ? ' ('+item.year+')' : ''}${item.platform ? ' ' + item.platform : ''}`).trim();
  const soldUrl = buildEbaySoldUrl(query);
  const activeUrl = buildEbayActiveUrl(query);
  const soldScrape = buildScraperUrl(soldUrl);
  const activeScrape = buildScraperUrl(activeUrl);

  try {
    console.log(`🕷️ [${idx+1}/${total}] SOLD start "${query}"`);
    const activeMode = String(process.env.SIBI_ACTIVE_MODE || 'all'); // 'none' | 'all'
    const soldPromise = fetchWithRetry(soldScrape, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, 40000, 1, 900);
    const activePromise = activeMode === 'all'
      ? fetchWithRetry(activeScrape, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, 25000, 1, 600)
      : null;

    const soldRes = await soldPromise;
    const soldHtml = await soldRes.text();
    const parsed = parseSoldHtml(soldHtml);
    let status: 'OK'|'NRS' = 'OK';
    if (parsed.noExactMatches || parsed.prices.length === 0) status = 'NRS';

    const filt = filterPrices(parsed.prices, parsed.links, item.gpt_value_aud ?? null);
    const med = median(filt.prices);
    console.log(`🔢 [${idx+1}/${total}] PricesFiltered(m<=10): ${filt.prices.join(', ')} | median=${med ?? 'null'}`);

    let activeCount: number | null = null;
    let activeMethod: string | null = null;
    if (activePromise) {
      try {
        const actRes = await activePromise;
        const actHtml = await actRes.text();
        const ac = parseActiveCountHtml(actHtml);
        activeCount = ac.count;
        activeMethod = ac.method;
        console.log(`🔎 Active count method=${ac.method} value=${ac.count ?? 'null'}`);
      } catch (e:any) {
        console.warn(`⚠️ Active fetch error "${query}":`, e?.message || e);
        activeCount = 0;
        activeMethod = 'timeout';
      }
    }

    const took = Date.now() - started;
    console.log(`✅ [${idx+1}/${total}] Done "${query}" in ${took}ms`);

    return {
      title: query,
      sold_prices_aud: filt.prices,  // filtered
      sold_links: filt.links,
      avg_sold_aud: status === 'OK' ? med : null, // median
      sold_90d: parsed.totalCount ?? filt.prices.length,
      available_now: activeCount,
      sold_search_link: soldUrl,
      status: (filt.prices.length ? 'OK' : 'NRS'),
      raw_sold_count: parsed.prices.length,
      filtered_count: filt.prices.length,
      active_parse_method: activeMethod || null,
    };
  } catch (e: any) {
    console.error(`⚠️ [${idx+1}/${total}] Error "${query}":`, e?.message || e);
    return {
      title: query,
      sold_prices_aud: [],
      sold_links: [],
      avg_sold_aud: null,
      sold_90d: 0,
      available_now: null,
      sold_search_link: soldUrl,
      status: 'NRS',
      raw_sold_count: 0,
      filtered_count: 0,
      active_parse_method: null,
    };
  }
}

export async function POST(req: Request) {
  try {
    console.log('🕷️ /fetch-ebay invoked');
    const body = await req.json() as Body;
    const total = body?.items?.length || 0;
    console.log(`🕷️ Received ${total} items`);
    const MAX_ITEMS_PER_CALL = Number(process.env.SCRAPE_MAX_ITEMS_PER_CALL || 1);
    const sliceEnd = Math.min(total, MAX_ITEMS_PER_CALL);
    const items = (body?.items || []).slice(0, sliceEnd);

    const results: EbayResult[] = [];
    for (let i = 0; i < items.length; i++) {
      const r = await processItem(items[i], i, items.length);
      results.push(r);
      const delayMs = Number(process.env.SCRAPE_DELAY_MS || 200);
      await sleep(delayMs);
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
