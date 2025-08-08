import { NextResponse } from 'next/server';
import type { VisionItem, EbayResult } from '@/lib/types';
import { buildEbayActiveUrl, buildEbaySoldUrl, buildScraperUrl, parseSoldHtml, parseActiveCountHtml, median } from '@/lib/scraper';
import { fetchWithRetry } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = { items: VisionItem[] };

const SOLD_TIMEOUT = 40000;
const ACTIVE_TIMEOUT = 25000;
const OUTLIER_LOW = Number(process.env.SIBI_OUTLIER_LOW || 0.3);
const OUTLIER_HIGH = Number(process.env.SIBI_OUTLIER_HIGH || 2.0);

function buildQuery(item: VisionItem): string {
  // Prefer LEGO queries by set number when available
  if (item.brand?.toLowerCase() === 'lego' && item.set_number) {
    const name = item.official_name ? ` ${item.official_name}` : '';
    return `LEGO ${item.set_number}${name}`.trim();
  }

  // Fallback: title (+ year / platform) or provided search
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.year) parts.push(`(${item.year})`);
  if (item.platform) parts.push(String(item.platform));
  return (item.search || parts.join(' ')).trim();
}


function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const a = nums.slice().sort((x,y)=>x-y);
  const mid = Math.floor(a.length/2);
  return a.length % 2 ? a[mid] : (a[mid-1] + a[mid]) / 2;
}
function trimmedMedian(nums: number[]): number | null {
  if (nums.length >= 5) {
    const a = nums.slice().sort((x,y)=>x-y);
    a.shift(); a.pop();
    return median(a);
  }
  return median(nums);
}
function applyPriceFilters(rawPrices: number[], gpt?: number|null): {filtered:number[], mode:string} {
  let prices = rawPrices.filter(p => p !== 20 && p !== 20.0);
  const hasGpt = typeof gpt === 'number' && isFinite(gpt as number) && (gpt as number) > 0;
  if (hasGpt) {
    const lo = Number(process.env.SIBI_OUTLIER_LOW || 0.3) * (gpt as number);
    const hi = Number(process.env.SIBI_OUTLIER_HIGH || 2.0) * (gpt as number);
    const bounded = prices.filter(p => p >= lo && p <= hi);
    if (bounded.length >= 3) return { filtered: bounded.slice(0, 10), mode: 'gpt-bounds' };
    // fallback: trimmed
  }
  const nonAds = prices.slice(0, 25);
  const tm = trimmedMedian(nonAds);
  if (tm == null) return { filtered: [], mode: 'empty' };
  // keep values within 0.4x..2.5x of trimmed median
  const bounded = nonAds.filter(p => p >= tm*0.4 && p <= tm*2.5).slice(0, 10);
  return { filtered: bounded, mode: 'fallback-trimmed' };
}

` : '';
    return `LEGO ${item.set_number}${name}`.trim();
  }
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.year) parts.push(`(${item.year})
  if (item.platform) parts.push(String(item.platform));
  return (item.search || parts.join(' ')).trim();
}` : '';
    return `LEGO ${item.set_number}${name}`.trim();
  }
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.year) parts.push(`(${item.year})
  if (item.platform) parts.push(String(item.platform));
  return (item.search || parts.join(' ')).trim();
}

function filterPrices(raw: number[], gpt?: number|null): { list: number[], mode: string } {
  let list = raw.filter(p => Math.round(p*100)/100 !== 20.00);
  let mode = 'strict';
  if (typeof gpt === 'number') {
    const lo = Math.max(0, OUTLIER_LOW * gpt);
    const hi = OUTLIER_HIGH * gpt;
    list = list.filter(p => p >= lo && p <= hi);
  }
  list = list.slice(0, 10);
  if (list.length >= 3) return { list, mode };
  mode = 'fallback-trimmed';
  const raw2 = raw.filter(p => Math.round(p*100)/100 !== 20.00).slice(0, 15).sort((a,b)=>a-b);
  if (raw2.length >= 5) { raw2.shift(); raw2.pop(); }
  return { list: raw2.slice(0,10), mode };
}

async function processItem(item: VisionItem, idx: number, total: number): Promise<EbayResult> {
  const query = buildQuery(item);
  const soldUrl = buildEbaySoldUrl(query);
  const activeUrl = buildEbayActiveUrl(query);
  const soldScrape = buildScraperUrl(soldUrl);
  const activeScrape = buildScraperUrl(activeUrl);

  console.log(`🕷️ [${idx+1}/${total}] SOLD+ACTIVE start "${query}"
  try{
    const [soldRes, actRes] = await Promise.all([
      fetchWithRetry(soldScrape, { cache:'no-store', headers:{ 'Accept-Language':'en-AU,en;q=0.8' } }, SOLD_TIMEOUT, 1),
      fetchWithRetry(activeScrape, { cache:'no-store', headers:{ 'Accept-Language':'en-AU,en;q=0.8' } }, ACTIVE_TIMEOUT, 1),
    ]);
    const [soldHtml, actHtml] = await Promise.all([ soldRes.text(), actRes.text() ]);
    const parsedSold = parseSoldHtml(soldHtml);
    const activeInfo = parseActiveCountHtml(actHtml);

    const { list: filtered, mode } = filterPrices(parsedSold.prices, item.gpt_value_aud ?? null);
    const med = median(filtered);

    console.log(`🔢 [${idx+1}/${total}] PricesFiltered(m<=10): ${filtered.join(', ')} | median=${med ?? 'null'} | mode=${mode}
    console.log(`🔎 Active count method=${activeInfo.method} value=${activeInfo.count ?? 'null'}
    const soldCount = parsedSold.totalCount ?? filtered.length;
    const status: 'OK'|'NRS' = (filtered.length>0 && med!=null) ? 'OK' : 'NRS';

    return {
      title: query,
      sold_prices_aud: filtered,
      sold_links: [],
      avg_sold_aud: (medianValue ?? null),
      sold_90d: soldCount,
      available_now: activeInfo.count,
      sold_search_link: soldUrl,
      status,
    };
  } catch(e:any){
    console.error(`⚠️ [${idx+1}/${total}] Error "${query}":`, e?.message || e);
    return {
      title: query,
      sold_prices_aud: [],
      sold_links: [],
      avg_sold_aud: (medianValue ?? null),
      sold_90d: 0,
      available_now: null,
      sold_search_link: soldUrl,
      status: 'NRS',
    };
  }
}

export async function POST(req: Request){
  try{
    const body = await req.json() as Body;
    const total = body?.items?.length || 0;
    const MAX_ITEMS_PER_CALL = Number(process.env.SCRAPE_MAX_ITEMS_PER_CALL || 1);
    const items = (body?.items || []).slice(0, Math.min(total, MAX_ITEMS_PER_CALL));

    const results: EbayResult[] = [];
    for (let i=0;i<items.length;i++){
      results.push(await processItem(items[i], i, items.length));
    }
    const res = NextResponse.json(results);
    if (total > items.length) res.headers.set('x-sibi-next', String(items.length));
    return res;
  } catch(e:any){
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
