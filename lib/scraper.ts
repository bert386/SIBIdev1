import * as cheerio from 'cheerio';

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
  url.searchParams.set('country_code', 'au');
  url.searchParams.set('render', 'false');
  return url.toString();
}

function textToPrice(s: string): number | null {
  const m = s.replace(/[,\s]/g, '').match(/(?:AU|US|USD)?\$(-?\d+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return isNaN(v) ? null : v;
}

export function parseSoldHtml(html: string): { prices: number[]; links: string[]; totalCount: number | null; fallbackUsed: boolean } {
  const $ = cheerio.load(html);
  const prices: number[] = [];
  const links: string[] = [];
  let fallbackUsed = false;

  // total count from header if present
  let totalCount: number | null = null;
  const hdr = $('.srp-controls__count-heading').text() || $('.srp-controls__count').text() || $('body').text();
  const countMatch = hdr.replace(/[,\s]/g, '').match(/of(\d+)results/i) || hdr.replace(/[,\s]/g, '').match(/(\d+)results/i);
  if (countMatch) totalCount = Number(countMatch[1]);

  const items = $('li.s-item');
  items.each((_, el) => {
    const card = $(el);
    const ad = card.text().toLowerCase().includes('sponsored') || card.text().toLowerCase().includes('ad');
    if (ad) return;
    const priceText = card.find('.s-item__price').first().text()
      || card.find('.s-item__detail--primary .s-item__price').first().text()
      || card.find('.s-item__details .s-item__price').first().text();
    let price = priceText ? textToPrice(priceText) : null;
    if (price == null) {
      // fallback scan
      const t = card.text();
      const lines = t.split(/\n|\r/).map(s => s.trim()).filter(Boolean).filter(s => !/shipping/i.test(s));
      for (const ln of lines) {
        const v = textToPrice(ln);
        if (v != null) { price = v; fallbackUsed = true; break; }
      }
    }
    if (price != null) prices.push(price);
    const href = card.find('a.s-item__link').attr('href');
    if (href) links.push(href);
  });

  return { prices, links, totalCount, fallbackUsed };
}

export function parseActiveCountHtml(html: string): { count: number | null, method: string } {
  const $ = cheerio.load(html);
  let method = 'none';
  const hdr = $('.srp-controls__count-heading').text() || $('.srp-controls__count').text();
  if (hdr) {
    const m = hdr.replace(/[,\s]/g, '').match(/of(\d+)results/i) || hdr.replace(/[,\s]/g, '').match(/(\d+)results/i);
    if (m) return { count: Number(m[1]), method: 'heading' };
  }
  const bodyText = $('body').text();
  const m2 = bodyText.replace(/[,\s]/g, '').match(/of(\d+)results/i) || bodyText.replace(/[,\s]/g, '').match(/(\d+)results/i);
  if (m2) return { count: Number(m2[1]), method: 'text-scan' };
  const liCount = $('li.s-item').length;
  if (liCount) return { count: liCount, method: 'li-count' };
  return { count: null, method };
}

export function average(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = nums.reduce((a,b)=>a+b, 0);
  return Math.round((s / nums.length) * 100) / 100;
}
export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const a = nums.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  const med = a.length % 2 ? a[mid] : (a[mid-1] + a[mid]) / 2;
  return Math.round(med * 100) / 100;
}
