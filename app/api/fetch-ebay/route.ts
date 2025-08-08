import { NextResponse } from 'next/server';
import { buildEbayActiveUrl, buildEbaySoldUrl, buildScraperUrl, parseSoldHtml, median, parseActiveCountHtml } from '@/lib/scraper';
import type { VisionItem, EbayResult } from '@/lib/types';
import { fetchWithTimeout, sleep } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = { items: VisionItem[] };

async function processItem(item: VisionItem, idx: number, total: number): Promise<EbayResult> {
  const started = Date.now();
  const query = (item.search || `${item.title}${item.year ? ' ('+item.year+')' : ''}${item.platform ? ' ' + item.platform : ''}`).trim();
  const soldUrl = buildEbaySoldUrl(query);
  const activeUrl = buildEbayActiveUrl(query);
  const soldScrape = buildScraperUrl(soldUrl);
  const activeScrape = buildScraperUrl(activeUrl);

  try {
    console.log(`🕷️ [${idx+1}/${total}] SOLD start "${query}"`);
    const soldRes = await fetchWithTimeout(soldScrape, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, 25000);
    const soldHtml = await soldRes.text();
    const parsed = parseSoldHtml(soldHtml);

    // Build (price,link) pairs
    const zipped = parsed.prices.map((p, i) => ({ p, link: parsed.links[i] || '' })).filter(z => typeof z.p === 'number');

    // 1) Drop advert price exactly 20
    let filtered = zipped.filter(z => z.p !== 20);

    // 2) GPT-bound filter: keep within [0.3x, 2.0x] of GPT estimate if present
    const gpt = (item as any).gpt_value_aud as number | undefined;
    if (typeof gpt === 'number' && isFinite(gpt) && gpt > 0) {
      const lo = 0.3 * gpt;
      const hi = 2.0 * gpt;
      filtered = filtered.filter(z => z.p >= lo && z.p <= hi);
    }

    // Take up to 10 after filtering (most recent first per _sop=13)
    const prices = filtered.slice(0, 10).map(z => z.p);
    const links = filtered.slice(0, 10).map(z => z.link);

    let status: 'OK'|'NRS' = 'OK';
    if (parsed.noExactMatches || prices.length === 0) status = 'NRS';

    const med = median(prices);
    console.log(`🔢 [${idx+1}/${total}] PricesFiltered(${prices.length}<=10): ${prices.join(', ')} | median=${med ?? 'null'}`);

    console.log(`🕷️ [${idx+1}/${total}] ACTIVE start "${query}"`);
    const actRes = await fetchWithTimeout(activeScrape, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, 20000);
    const actHtml = await actRes.text();
    const ac = parseActiveCountHtml(actHtml);
    const activeCount = ac.count;
    console.log(`🔎 Active count method=${ac.method} value=${activeCount ?? 'null'}`);

    const soldCount = parsed.totalCount ?? prices.length;
    const took = Date.now() - started;
    console.log(`✅ [${idx+1}/${total}] Done "${query}" in ${took}ms`);

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
    const workItems = (body?.items || []).slice(0, sliceEnd);

    if (!workItems.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const batchSize = Number(process.env.SCRAPE_CONCURRENCY || 2);
    const delayMs = Number(process.env.SCRAPE_DELAY_MS || 300);

    const results: EbayResult[] = [];
    for (let i = 0; i < workItems.length; i += batchSize) {
      const slice = workItems.slice(i, i + batchSize);
      const batch = await Promise.all(slice.map((it, j) => processItem(it, i + j, workItems.length)));
      results.push(...batch);
      if (i + batchSize < workItems.length) await sleep(delayMs);
    }

    const partial = (total > workItems.length);
    const res = NextResponse.json(results);
    if (partial) res.headers.set('x-sibi-next', String(workItems.length));
    return res;
  } catch (err: any) {
    console.error('⚠️ fetch-ebay error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
