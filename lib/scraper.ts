import * as cheerio from 'cheerio';

/** Build ebay URLs (kept same as previous versions) */
export function buildEbaySoldUrl(q: string) {
  const query = encodeURIComponent(q);
  return `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;
}
export function buildEbayActiveUrl(q: string) {
  const query = encodeURIComponent(q);
  return `https://www.ebay.com.au/sch/i.html?_nkw=${query}`;
}
export function buildScraperUrl(target: string) {
  const base = process.env.SCRAPER_BASE || 'https://api.scraperapi.com';
  const key = process.env.SCRAPER_API_KEY || process.env.SCRAPER_KEY || process.env.SCRAPERAPI_KEY;
  if (!key) throw new Error('SCRAPER_API_KEY is not set');
  const url = new URL(base);
  url.searchParams.set('api_key', key);
  url.searchParams.set('url', target);
  return url.toString();
}

/** Parse a currency string like "AU $12.34" to a float */
export function parseCurrency(text: string): number | null {
  if (!text) return null;
  // remove commas and non-digits except dot
  const m = text.replace(/[,\s]/g, '').match(/(?:AU|USD|US)?\$?(-?\d+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return isNaN(v) ? null : v;
}

/** Robust sold results parser with fallbacks & ad detection */
export function parseSoldHtml(html: string): { prices: number[]; links: string[]; totalCount: number | null; fallbackUsed: boolean } {
  const $ = cheerio.load(html);
  const prices: number[] = [];
  const links: string[] = [];
  let fallbackUsed = false;

  // Parse rough total count from header if present
  let totalCount: number | null = null;
  const h = $('.srp-controls__count-heading').text() || $('.srp-controls__count').text();
  const hm = h.replace(/[,\s]/g, '').match(/of(\d+)/i) || h.replace(/[,\s]/g, '').match(/(\d+)results/i);
  if (hm) totalCount = Number(hm[1]);

  const cards = $('.s-item').toArray();
  for (const el of cards) {
    const card = $(el);

    // skip sponsored/ads
    const badge = card.find('.s-item__title--tag, .s-item__title--tagblock, .s-item__sep').text().toLowerCase();
    if (badge.includes('sponsored') || badge.includes('ad')) continue;

    // price via common selectors
    let priceText = card.find('.s-item__price').first().text().trim();
    if (!priceText) {
      priceText = card.find('.s-item__detail--primary .s-item__price').first().text().trim();
    }
    if (!priceText) {
      priceText = card.find('.s-item__details .s-item__price').first().text().trim();
    }

    if (!priceText) {
      // text scan fallback within the card, avoid shipping lines
      const txt = card.text();
      // remove lines that obviously include shipping/postage
      const cleaned = txt.split(/\n|\r/).filter(line => !/shipping|postage|delivery|estimated/i.test(line)).join(' ');
      const m = cleaned.match(/(?:AU|USD|US)?\$\s?\d+(?:\.\d{1,2})?/);
      if (m) { priceText = m[0]; fallbackUsed = true; }
    }
    const price = parseCurrency(priceText || '');
    if (price != null) {
      prices.push(price);
      const href = card.find('a.s-item__link').attr('href') || card.find('a').attr('href') || '';
      links.push(href);
    }
    if (prices.length >= 25) break; // collect enough, we'll filter later
  }

  return { prices, links, totalCount, fallbackUsed };
}

/** Active count parser with selector and text fallbacks */
export function parseActiveCountHtml(html: string): { count: number | null; method: string } {
  const $ = cheerio.load(html);
  const head = $('.srp-controls__count-heading').text() || $('.srp-controls__count').text();
  const cleaned = (head || '').replace(/[,\s]/g, '');
  let m = cleaned.match(/of(\d+)/i) || cleaned.match(/(\d+)results/i);
  if (m) return { count: Number(m[1]), method: 'heading' };

  // try page text
  const body = $.root().text().replace(/[,\s]/g, '');
  m = body.match(/of(\d+)results/i) || body.match(/(\d+)results/i);
  if (m) return { count: Number(m[1]), method: 'text-scan' };

  // fallback: count visible items
  const liCount = $('li.s-item').length;
  if (liCount) return { count: liCount, method: 'li-count' };

  return { count: null, method: 'none' };
}

export function average(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = nums.reduce((a, b) => a + b, 0);
  return Math.round((s / nums.length) * 100) / 100;
}

export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const a = nums.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  const value = a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  return Math.round(value * 100) / 100;
}
