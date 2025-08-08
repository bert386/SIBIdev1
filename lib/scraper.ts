import * as cheerio from 'cheerio';

export function buildEbaySoldUrl(q: string){
  const query = encodeURIComponent(q);
  return `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;
}
export function buildEbayActiveUrl(q: string){
  const query = encodeURIComponent(q);
  return `https://www.ebay.com.au/sch/i.html?_nkw=${query}`;
}
export function buildScraperUrl(target: string){
  const base = process.env.SCRAPER_BASE || 'https://api.scraperapi.com';
  const key = process.env.SCRAPER_API_KEY || process.env.SCRAPER_KEY || process.env.SCRAPERAPI_KEY;
  if (!key) throw new Error('SCRAPER_API_KEY is not set');
  const url = `${base}?api_key=${encodeURIComponent(key)}&url=${encodeURIComponent(target)}&country_code=au&device_type=desktop`;
  return url;
}

export function parseSoldHtml(html: string): { prices: number[], links: string[], totalCount?: number, usedFallback?: boolean }{
  const $ = cheerio.load(html);
  const items = $('li.s-item');
  const prices: number[] = [];
  const links: string[] = [];
  let usedFallback = false;

  items.each((_, el)=>{
    const row = $(el);
    const badge = row.find('[aria-label="Sponsored"], .s-item__subtitle:contains("Sponsored")').text().trim();
    if (badge && /sponsored/i.test(badge)) return;

    let priceText = row.find('.s-item__price').first().text().trim();
    if (!priceText) priceText = row.find('.s-item__detail--primary .s-item__price').first().text().trim();
    if (!priceText) priceText = row.find('.s-item__details .s-item__price').first().text().trim();

    if (!priceText){
      usedFallback = true;
      const txt = row.text().replace(/(shipping|postage).*/i,' ');
      const m = txt.match(/A?\$?\s?([0-9]{1,4}(?:[.,][0-9]{2})?)/);
      if (m) priceText = m[0];
    }

    if (!priceText) return;
    const m2 = priceText.replace(',', '').match(/([0-9]+(?:\.[0-9]{2})?)/);
    if (!m2) return;
    const val = parseFloat(m2[1]);
    if (!isNaN(val)) {
      prices.push(val);
      const href = row.find('a.s-item__link').attr('href');
      if (href) links.push(href);
    }
  });

  let totalCount: number|undefined;
  const hdr = $('.srp-controls__count-heading, .srp-controls__count').first().text();
  if (hdr) {
    const m = hdr.replace(/,/g,'').match(/of\s+([0-9]+)/i) || hdr.replace(/,/g,'').match(/([0-9]+)\s+results/i);
    if (m) totalCount = Number(m[1]);
  }
  if (!totalCount) totalCount = items.length;

  return { prices, links, totalCount, usedFallback };
}

export function parseActiveCountHtml(html: string): { count: number|null, method: string }{
  const $ = cheerio.load(html);
  const hdr = $('.srp-controls__count-heading, .srp-controls__count').first().text();
  if (hdr) {
    const m = hdr.replace(/,/g,'').match(/of\s+([0-9]+)/i) || hdr.replace(/,/g,'').match(/([0-9]+)\s+results/i);
    if (m) return { count: Number(m[1]), method: 'heading' };
  }
  const txt = $.text().replace(/,/g,'');
  const m2 = txt.match(/([0-9]+)\s+results/i);
  if (m2) return { count: Number(m2[1]), method: 'text-scan' };
  const liCount = $('li.s-item').length;
  if (liCount>0) return { count: liCount, method: 'li-count' };
  return { count: null, method: 'none' };
}

export function average(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = nums.reduce((a,b)=>a+b,0);
  return Math.round((s/nums.length)*100)/100;
}
export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const a = nums.slice().sort((x,y)=>x-y);
  const mid = Math.floor(a.length/2);
  return a.length%2 ? a[mid] : Math.round(((a[mid-1]+a[mid])/2)*100)/100;
}
