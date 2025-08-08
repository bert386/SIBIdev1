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

function buildQuery(item: VisionItem) {
  const parts = [item.title];
  if (item.year) parts.push(`(${item.year})`);
  if (item.platform) parts.push(item.platform);
  return (item.search || parts.join(' ')).trim();
}

function applyFiltersAndMedian(rawPrices: number[], gpt?: number | null): { filtered: number[]; med: number | null; mode: string } {
  // drop exact 20
  let p = rawPrices.filter(v => Math.round(v * 100) / 100 !== 20);
  const original = p.length;
  let mode = 'gpt-bounds';
  if (gpt && isFinite(gpt)) {
    const lo = Math.floor(gpt * OUTLIER_LOW * 100) / 100;
    const hi = Math.ceil(gpt * OUTLIER_HIGH * 100) / 100;
    p = p.filter(v => v >= lo && v <= hi);
  }
  // take up to the first 10 valid solds
  let slice = p.slice(0, 10);
  let med = median(slice);
  if ((slice.length < 3 || med == null) && original > 0) {
    // fallback: trimmed non-GPT median (still drop $20)
    mode = 'fallback-trimmed';
    p = rawPrices.filter(v => Math.round(v * 100) / 100 !== 20).slice(0, 15);
    p.sort((a, b) => a - b);
    if (p.length >= 5) {
      p = p.slice(1, -1); // trim extremes
    }
    slice = p.slice(0, 10);
    med = median(slice);
  }
  return { filtered: slice, med, mode };
}

async function fetchSold(url: string): Promise<ReturnType<typeof parseSoldHtml>> {
  const scraper = buildScraperUrl(url);
  const attempt = async () => {
    const r = await fetchWithTimeout(scraper, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, SOLD_TIMEOUT);
    const html = await r.text();
    return parseSoldHtml(html);
  };
  try {
    return await attempt();
  } catch (e) {
    console.warn('⚠️ SOLD fetch error, retrying once:', (e as any)?.message || e);
    await sleep(1200);
    return await attempt();
  }
}

async function fetchActive(url: string): Promise<{ count: number | null; method: string }> {
  if (ACTIVE_MODE === 'none') return { count: null, method: 'skipped' };
  const scraper = buildScraperUrl(url);
  const attempt = async () => {
    const r = await fetchWithTimeout(scraper, { cache: 'no-store', headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, ACTIVE_TIMEOUT);
    const html = await r.text();
    return parseActiveCountHtml(html);
  };
  try {
    return await attempt();
  } catch (e) {
    console.warn('⚠️ ACTIVE fetch error, retrying once:', (e as any)?.message || e);
    await sleep(800);
    return await attempt();
  }
}

async function processItem(item: VisionItem, idx: number, total: number): Promise<EbayResult> {
  const started = Date.now();
  const query = buildQuery(item);
  const soldUrl = buildEbaySoldUrl(query);
  const activeUrl = buildEbayActiveUrl(query);

  console.log(`🕷️ [${idx+1}/${total}] SOLD start "${query}"`);
  const [soldRes, activeRes] = await Promise.all([
    fetchSold(soldUrl),
    fetchActive(activeUrl),
  ]);

  let status: 'OK' | 'NRS' = 'OK';
  const raw = soldRes.prices;
  const filter = applyFiltersAndMedian(raw, item.gpt_value_aud ?? null);
  const prices = filter.filtered;
  const med = filter.med;

  console.log(`🔢 [${idx+1}/${total}] PricesFiltered(m<=10): ${prices.join(', ')} | median=${med ?? 'null'} | mode=${filter.mode}${soldRes.fallbackUsed ? ' | price-fallback' : ''}`);

  if (!prices.length || med == null) status = 'NRS';

  const took = Date.now() - started;
  const result: EbayResult = {
    title: query,
    sold_prices_aud: prices,
    sold_links: [], // optional: could return soldRes.links.slice(0, prices.length)
    avg_sold_aud: status === 'OK' ? med : null,
    sold_90d: soldRes.totalCount ?? prices.length,
    available_now: activeRes.count,
    sold_search_link: soldUrl,
    status,
  };
  console.log(`🔎 Active count method=${activeRes.method} value=${activeRes.count ?? 'null'}`);
  console.log(`✅ [${idx+1}/${total}] Done "${query}" in ${took}ms`);
  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Body;
    const total = body?.items?.length || 0;
    if (!total) return NextResponse.json({ error: 'No items provided' }, { status: 400 });

    const MAX_ITEMS_PER_CALL = Number(process.env.SCRAPE_MAX_ITEMS_PER_CALL || 1);
    const items = (body.items || []).slice(0, Math.min(total, MAX_ITEMS_PER_CALL));
    const results: EbayResult[] = [];
    for (let i = 0; i < items.length; i++) {
      const r = await processItem(items[i], i, items.length);
      results.push(r);
      await sleep(Number(process.env.SCRAPE_DELAY_MS || 200));
    }
    const res = NextResponse.json(results);
    if (total > items.length) res.headers.set('x-sibi-next', String(items.length));
    return res;
  } catch (err: any) {
    console.error('⚠️ fetch-ebay error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
