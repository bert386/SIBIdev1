import * as cheerio from 'cheerio';
import { getScraperKey as requireEnv } from './env';

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
  const { value: key, source } = requireEnv();
  console.log(`🔐 Using scraper key from ${source}`);
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


export function extractResultsCountFromText(txt: string): number | null {
  if (!txt) return null;
  const clean = txt.replace(/[ ,.,,]/g, ' ').replace(/\s+/g,' ').trim();
  // Prefer patterns like "1-48 of 2,345 results"
  let m = clean.match(/of\s+([0-9]{1,3}(?:\s[0-9]{3})*)\s+results/i);
  if (m && m[1]) {
    const n = Number(m[1].replace(/\s/g, ''));
    if (!Number.isNaN(n) && n > 0) return n;
  }
  // Fallback: "... 2345 results"
  m = clean.match(/([0-9]{1,3}(?:\s[0-9]{3})*)\s+results/i);
  if (m && m[1]) {
    const n = Number(m[1].replace(/\s/g, ''));
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}

export function parseActiveCountHtml(html: string): { count: number | null, method: string } {
  const $ = cheerio.load(html);
  const candidates: string[] = [];
  candidates.push($('.srp-controls__count-heading').text());
  candidates.push($('.srp-controls__count').text());
  candidates.push($('.srp-controls__count-heading [aria-live]').text());
  // try nearby BOLD spans that often wrap the count
  const boldSpan = $('.srp-controls__count-heading .BOLD').first().parent().text();
  candidates.push(boldSpan);
  // As a last resort, scan the first 2000 chars of body text
  candidates.push($('body').text().slice(0, 2000));

  for (const c of candidates) {
    const n = extractResultsCountFromText(c);
    if (n) return { count: n, method: 'text-scan' };
  }

  // Last-ditch: count visible items (page size), not a true total
  const liCount = $('li.s-item').length;
  if (liCount > 0) return { count: liCount, method: 'li-count' };

  return { count: null, method: 'none' };
}

export function average(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = nums.reduce((a, b) => a + b, 0);
  return Math.round((s / nums.length) * 100) / 100;
}
