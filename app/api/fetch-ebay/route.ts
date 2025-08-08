// app/api/fetch-ebay/route.ts
import { NextResponse } from 'next/server';

// Keep imports loose to avoid type mismatches in your repo.
// If your project exposes these helpers, they will be used; otherwise this file
// has local fallbacks for median and fetch-with-timeout.
let _hasHelpers = true;
let parseSoldHtml: any, parseActiveCountHtml: any, buildEbaySoldUrl: any, buildEbayActiveUrl: any, buildScraperUrl: any;
try {
  // Your project utilities (preferred)
  ({ parseSoldHtml, parseActiveCountHtml, buildEbaySoldUrl, buildEbayActiveUrl, buildScraperUrl } = require('@/lib/scraper'));
} catch {
  _hasHelpers = false;
}

// ---- Local helpers (used if project helpers are missing) ----
function medianLocal(nums: number[]): number | null {
  if (!nums || nums.length === 0) return null;
  const a = nums.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round(((a[mid - 1] + a[mid]) / 2) * 100) / 100;
}

async function fetchWithTimeoutLocal(url: string, opts: any = {}, timeoutMs = 30000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

const SCRAPE_MAX_ITEMS_PER_CALL = Number(process.env.SCRAPE_MAX_ITEMS_PER_CALL ?? '1');
const SOLD_TIMEOUT_MS = Number(process.env.SIBI_SOLD_TIMEOUT_MS ?? '40000');
const ACTIVE_TIMEOUT_MS = Number(process.env.SIBI_ACTIVE_TIMEOUT_MS ?? '25000');
const ACTIVE_MODE = (process.env.SIBI_ACTIVE_MODE ?? 'all').toLowerCase(); // 'all' | 'none'
const OUTLIER_LOW = Number(process.env.SIBI_OUTLIER_LOW ?? '0.3');
const OUTLIER_HIGH = Number(process.env.SIBI_OUTLIER_HIGH ?? '2.0');

type VisionItem = any;
type EbayResult = any;

// Prefer LEGO set-number queries when present
function buildQuery(item: VisionItem): string {
  if (item?.brand?.toLowerCase?.() === 'lego' && item?.set_number) {
    const name = item?.official_name ? ` ${item.official_name}` : '';
    return `LEGO ${item.set_number}${name}`.trim();
  }
  const parts: string[] = [];
  if (item?.title) parts.push(item.title);
  if (item?.year) parts.push(`(${item.year})`);
  if (item?.platform) parts.push(String(item.platform));
  return (item?.search || parts.join(' ')).trim();
}

// Apply business rules to sold prices
function filterSoldPrices(raw: number[], gptValue?: number | null) {
  // Drop exact $20.00 adverts
  const noAds = raw.filter(v => Math.round(v * 100) / 100 !== 20);
  if (!gptValue || gptValue <= 0) {
    return { filtered: noAds, mode: 'no-gpt' as const };
  }
  const lo = OUTLIER_LOW * gptValue;
  const hi = OUTLIER_HIGH * gptValue;
  const bounded = noAds.filter(v => v >= lo && v <= hi);

  // If strict leaves <3 but we had some data, fallback to trimmed
  if (bounded.length < 3 && noAds.length > 0) {
    const a = noAds.slice().sort((x, y) => x - y);
    if (a.length >= 5) a.splice(0, 1), a.splice(a.length - 1, 1);
    return { filtered: a, mode: 'fallback-trimmed' as const };
  }
  return { filtered: bounded, mode: 'gpt-bounds' as const };
}

// Robust active count parsing fallback if project helper is missing
function parseActiveCountHtmlLocal(html: string): { count: number | null, method: string } {
  try {
    // try "of N results"
    const ofMatch = html.match(/of\s+([\d,]+)\s+results/i);
    if (ofMatch) return { count: Number(ofMatch[1].replace(/,/g, '')), method: 'text-of' };
    // try simple "N results"
    const nMatch = html.match(/([\d,]+)\s+results/i);
    if (nMatch) return { count: Number(nMatch[1].replace(/,/g, '')), method: 'text-simple' };
    // fallback: count list items (very rough)
    const liCount = (html.match(/<li\b[^>]*class=\"[^"]*s-item[^"]*\"/g) || []).length;
    if (liCount) return { count: liCount, method: 'li-count' };
  } catch {}
  return { count: null, method: 'none' };
}

function toMedian(nums: number[]): number | null {
  if (_hasHelpers && typeof require('@/lib/scraper').median === 'function') {
    try {
      const m = require('@/lib/scraper').median(nums);
      if (m !== undefined) return m;
    } catch {}
  }
  return medianLocal(nums);
}

async function getHtml(url: string, timeoutMs: number): Promise<string> {
  try {
    const res = await fetchWithTimeoutLocal(url, { headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, timeoutMs);
    return await res.text();
  } catch (e) {
    // retry once
    const res2 = await fetchWithTimeoutLocal(url, { headers: { 'Accept-Language': 'en-AU,en;q=0.8' } }, timeoutMs);
    return await res2.text();
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: VisionItem[] = Array.isArray(body?.items) ? body.items : [];
    const total = items.length;
    const work = items.slice(0, Math.min(total, SCRAPE_MAX_ITEMS_PER_CALL));

    const results: EbayResult[] = [];
    for (let idx = 0; idx < work.length; idx++) {
      const item = work[idx];
      const query = buildQuery(item);
      console.log(`🕷️ [${idx + 1}/${work.length}] SOLD+ACTIVE start: "${query}"`);

      // Build URLs (use project helpers if present; else construct basic eBay URLs)
      const soldUrl = _hasHelpers && buildEbaySoldUrl ? buildEbaySoldUrl(query) :
        `https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=13&LH_Sold=1&LH_Complete=1`;
      const activeUrl = _hasHelpers && buildEbayActiveUrl ? buildEbayActiveUrl(query) :
        `https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=13`;

      // Fetch SOLD and ACTIVE in parallel (ACTIVE optional)
      const soldP = getHtml(soldUrl, SOLD_TIMEOUT_MS);
      const activeP = (ACTIVE_MODE === 'all') ? getHtml(activeUrl, ACTIVE_TIMEOUT_MS) : Promise.resolve('');

      const [soldHtml, activeHtml] = await Promise.all([soldP, activeP]);

      // Parse SOLD
      let soldPrices: number[] = [];
      try {
        if (_hasHelpers && parseSoldHtml) {
          const parsed = await parseSoldHtml(soldHtml);
          // Prefer parsed.prices if available
          const p = Array.isArray(parsed?.prices) ? parsed.prices : [];
          soldPrices = p.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n) && n > 0);
        } else {
          // crude fallback: grab currency numbers like $12.34
          const matches = soldHtml.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/g) || [];
          soldPrices = matches.map(m => Number(m.replace(/[^\d.]/g, ''))).filter(n => n > 0);
        }
      } catch {
        soldPrices = [];
      }

      // Apply filters & median
      const gpt = Number(item?.gpt_value_aud) || null;
      const { filtered, mode } = filterSoldPrices(soldPrices, gpt);
      const last10 = filtered.slice(0, 10);
      const ebayMedian = toMedian(last10);

      // Parse ACTIVE count
      let available_now: number | null = null;
      let activeMethod = 'skip';
      if (ACTIVE_MODE === 'all') {
        try {
          if (_hasHelpers && parseActiveCountHtml) {
            const ac = parseActiveCountHtml(activeHtml);
            available_now = ac?.count ?? null;
            activeMethod = ac?.method ?? 'helper';
          } else {
            const ac = parseActiveCountHtmlLocal(activeHtml);
            available_now = ac.count;
            activeMethod = ac.method;
          }
        } catch {
          available_now = null;
          activeMethod = 'error';
        }
      }

      console.log(`🔢 PricesFiltered(m<=10): ${last10.join(', ')} | median=${ebayMedian ?? 'null'} | mode=${mode}`);
      if (ACTIVE_MODE === 'all') console.log(`🔎 Active count method=${activeMethod} value=${available_now ?? 'null'}`);

      const res: any = {
        title: item?.title ?? query,
        search_term: query,
        avg_sold_aud: ebayMedian, // UI expects this key
        sold_90d: last10.length || null,
        available_now,
        prices: last10,
        mode,
        status: (ebayMedian == null ? 'NRS' : 'OK'),
      };
      results.push(res);
      console.log(`✅ [${idx + 1}/${work.length}] Done "${query}"`);
    }

    // Signal partial processing if capped
    const partial = total > work.length;
    const resp = NextResponse.json(results);
    if (partial) resp.headers.set('x-sibi-next', String(work.length));
    return resp;
  } catch (err: any) {
    console.error('⚠️ fetch-ebay error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
