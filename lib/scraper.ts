import * as cheerio from 'cheerio';

export function buildEbaySoldUrl(query: string) {
  const params = new URLSearchParams({
    _nkw: query,
    LH_Sold: '1',
    LH_Complete: '1',
    _sop: '13',
    rt: 'nc',
  });
  return `https://www.ebay.com.au/sch/i.html?${params.toString()}`;
}

export function buildEbayActiveUrl(query: string) {
  const params = new URLSearchParams({ _nkw: query, _sop: '12', rt: 'nc' });
  return `https://www.ebay.com.au/sch/i.html?${params.toString()}`;
}

export function buildScraperUrl(targetUrl: string) {
  const base = process.env.SCRAPER_BASE || 'https://api.scraperapi.com';
  const key = process.env.SCRAPER_API_KEY;
  if (!key) throw new Error('SCRAPER_API_KEY is not set');
  const u = new URL(base);
  if (u.hostname.includes('scraperapi.com')) {
    // ScraperAPI style
    const qs = new URLSearchParams({ api_key: key, url: targetUrl });
    return `${u.origin}${u.pathname}?${qs.toString()}`;
  } else {
    // Generic: append ?api_key=...&url=...
    const qs = new URLSearchParams({ api_key: key, url: targetUrl });
    return `${base}?${qs.toString()}`;
  }
}

export type ParsedSold = {
  prices: number[];
  links: string[];
  totalCount: number | null;
  noExactMatches: boolean;
};

export function parseCurrencyToNumber(txt: string): number | null {
  const m = txt.replace(',', '').replace(' ', ' ').match(/([0-9]+(?:\.[0-9]{1,2})?)/);
  return m ? Number(m[1]) : null;
}

export function parseSoldHtml(html: string): ParsedSold {
  const $ = cheerio.load(html);
  const items: number[] = [];
  const links: string[] = [];

  // Detect "no exact matches"
  const pageText = $('body').text();
  const noExact =
    /no exact matches/i.test(pageText) ||
    /We didn't find any results/i.test(pageText);

  $('li.s-item').each((_, el) => {
    if (items.length >= 10) return;
    const priceTxt = $(el).find('.s-item__price').first().text().trim();
    const link = $(el).find('a.s-item__link').attr('href') || '';
    const price = parseCurrencyToNumber(priceTxt);
    if (price && link) {
      items.push(price);
      links.push(link);
    }
  });

  // Fallback selectors
  if (items.length === 0) {
    $('.srp-results .s-item__wrapper').each((_, el) => {
      if (items.length >= 10) return;
      const priceTxt = $(el).find('.s-item__price').first().text().trim();
      const link = $(el).find('a').attr('href') || '';
      const price = parseCurrencyToNumber(priceTxt);
      if (price && link) {
        items.push(price);
        links.push(link);
      }
    });
  }

  // Count (best-effort)
  let totalCount: number | null = null;
  const countTxt = $('.srp-controls__count-heading .BOLD').first().text().replace(/[,\.]/g, '');
  const n = Number(countTxt);
  if (!Number.isNaN(n) && n > 0) totalCount = n;

  return { prices: items, links, totalCount, noExactMatches: noExact };
}

export function average(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = nums.reduce((a, b) => a + b, 0);
  return Math.round((s / nums.length) * 100) / 100;
}
