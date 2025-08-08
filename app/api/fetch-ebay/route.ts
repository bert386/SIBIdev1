import { NextResponse } from 'next/server';
import { buildEbayActiveUrl, buildEbaySoldUrl, buildScraperUrl, parseSoldHtml, parseActiveCountHtml, median } from '@/lib/scraper';
import type { VisionItem, EbayResult } from '@/lib/types';
import { fetchWithTimeout, sleep } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = { items: VisionItem[] };

const SOLD_TIMEOUT = 40000;
const ACTIVE_TIMEOUT = 25000;
const OUTLIER_LOW = Number(process.env.SIBI_OUTLIER_LOW || 0.3);
const OUTLIER_HIGH = Number(process.env.SIBI_OUTLIER_HIGH || 2.0);
const ACTIVE_MODE = (process.env.SIBI_ACTIVE_MODE || 'all').toLowerCase(); // 'all' | 'none'

function buildQuery(item: VisionItem): string {
  // LEGO preference
  if (item.brand?.toLowerCase() === 'lego' && item.set_number) {
    const name = item.official_name ? ` ${item.official_name}` : '';
    return `LEGO ${item.set_number}${name}`.trim();
  }
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.year) parts.push(`(${item.year})`);
  if (item.platform) parts.push(String(item.platform));
  return (item.search || parts.join(' ')).trim();
}

async function fetchWithRetry(url: string, timeout: number, label: string): Promise<string> {
  for (let attempt=1; attempt<=2; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { cache:'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, timeout);
      return await res.text();
    } catch (e: any) {
      if (attempt === 2) throw e;
      console.log(`↻ retry ${label} after error:`, e?.message || e);
      await sleep(600);
    }
  }
  return '';
}

function applyFiltersAndMedian(raw: number[], gpt?: number | null): { filtered: number[]; med: number | null; mode: string } {
  // remove exact 20.00 (ads)
  let p = raw.filter(v => Math.round(v*100)/100 !== 20);
  const origCount = p.length;

  let mode = 'gpt-bounds';
  if (typeof gpt === 'number' && gpt > 0) {
    const lo = OUTLIER_LOW * gpt;
    const hi = OUTLIER_HIGH * gpt;
    p = p.filter(v => v >= lo && v <= hi);
  }

  if (p.length >= 3) {
    const used = p.slice(0, 10);
    return { filtered: used, med: median(used), mode };
  }

  // fallback trimmed median
  mode = 'fallback-trimmed';
  p = raw.filter(v => Math.round(v*100)/100 !== 20).slice(0, 15).sort((a,b)=>a-b);
  if (p.length >= 5) p = p.slice(1, -1);
  const used = p.slice(0, 10);
  return { filtered: used, med: median(used), mode };
}

async function processItem(item: VisionItem, idx: number, total: number): Promise<EbayResult> {
  const query = buildQuery(item);
  const soldUrl = buildEbaySoldUrl(query);
  const activeUrl = buildEbayActiveUrl(query);
  const soldScrape = buildScraperUrl(soldUrl);
  const activeScrape = buildScraperUrl(activeUrl);

  console.log(`🕷️ [${idx+1}/${total}] SOLD+ACTIVE start "${query}"`);

  const [soldHtml, activeHtml] = await Promise.all([
    fetchWithRetry(soldScrape, SOLD_TIMEOUT, 'sold'),
    (ACTIVE_MODE === 'none' ? Promise.resolve('') : fetchWithRetry(activeScrape, ACTIVE_TIMEOUT, 'active')),
  ]);

  const sold = parseSoldHtml(soldHtml);
  let activeCount: number | null = 0;
  if (ACTIVE_MODE !== 'none') {
    const ac = parseActiveCountHtml(activeHtml);
    activeCount = ac.count;
    console.log(`🔎 Active count method=${ac.method} value=${activeCount ?? 'null'}`);
  }

  const { filtered, med, mode } = applyFiltersAndMedian(sold.prices, item.gpt_value_aud ?? null);
  console.log(`🔢 [${idx+1}/${total}] PricesFiltered(m<=10): ${filtered.join(', ')} | median=${med ?? 'null'} | mode=${mode}${sold.fallbackUsed ? ' | price-fallback' : ''}`);

  const status: 'OK'|'NRS' = (filtered.length > 0 && med != null) ? 'OK' : 'NRS';
  const soldCount = sold.totalCount ?? filtered.length;

  return {
    title: query,
    sold_prices_aud: filtered,
    sold_links: sold.links.slice(0, filtered.length),
    avg_sold_aud: status==='OK' ? med : null,
    sold_90d: soldCount,
    available_now: activeCount,
    sold_search_link: soldUrl,
    status,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Body;
    const total = body?.items?.length || 0;
    if (!total) return NextResponse.json({ error: 'No items provided' }, { status: 400 });

    // server-side cap to stay under 60s
    const MAX_ITEMS_PER_CALL = Number(process.env.SCRAPE_MAX_ITEMS_PER_CALL || 1);
    const work = body.items.slice(0, Math.min(total, MAX_ITEMS_PER_CALL));
    const batchSize = Number(process.env.SCRAPE_CONCURRENCY || 2);
    const delayMs = Number(process.env.SCRAPE_DELAY_MS || 300);

    const results: EbayResult[] = [];
    for (let i = 0; i < work.length; i += batchSize) {
      const slice = work.slice(i, i + batchSize);
      const batch = await Promise.all(slice.map((it, j) => processItem(it, i + j, work.length)));
      results.push(...batch);
      await sleep(delayMs);
    }

    const res = NextResponse.json(results);
    if (total > work.length) res.headers.set('x-sibi-next', String(work.length));
    return res;
  } catch (e: any) {
    console.error('⚠️ fetch-ebay error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
