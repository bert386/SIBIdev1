
import axios from 'axios';
import * as cheerio from 'cheerio';

function isShopOnEbay(title) {
  return title.toLowerCase().includes('shop on ebay');
}

function calcMedian(prices) {
  if (!prices.length) return 0;
  const sorted = prices.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function calcMean(prices) {
  if (!prices.length) return 0;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { search } = req.body;
  const encoded = encodeURIComponent(search);
  const ebayUrl = `https://www.ebay.com.au/sch/i.html?_nkw=${encoded}&_sop=13&LH_Sold=1&LH_Complete=1`;

  const scraperApiKey = process.env.SCRAPER_API_KEY;
  const proxyUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(ebayUrl)}&render=true`;

  try {
    const { data: html } = await axios.get(proxyUrl);
    const $ = cheerio.load(html);

    // Find the <ul> containing sold results
    const ul = $('ul.srp-results.srp-list.clearfix').first();
    const lis = ul.children('li.s-item').toArray();

    // Walk the <ul> in DOM order to split above/below the separator
    let above = [], below = [];
    let foundSeparator = false;
    lis.forEach((el) => {
      // The separator is a <div> sibling (but not a li), but we can detect in DOM order
      // Find the immediate <li> before or after a "Results matching fewer words" div sibling
      if (!foundSeparator) {
        // Check if the next sibling is a <div> with the separator text
        const next = $(el).next();
        if (next.is('div') && next.text().trim() === "Results matching fewer words") {
          foundSeparator = true;
        }
      }
      if (!foundSeparator) {
        above.push(el);
      } else {
        below.push(el);
      }
    });

    // Remove "Shop on eBay" and limit counts
    function extractItems(nodes, maxResults) {
      const items = [];
      for (const el of nodes) {
        const title = $(el).find('.s-item__title').text().trim();
        if (!title || isShopOnEbay(title)) continue;
        const priceText = $(el).find('.s-item__price').first().text().trim();
        const link = $(el).find('.s-item__link').attr('href');
        if (!priceText || !link) continue;
        const priceMatch = priceText.replace(/[^\d.]/g, '');
        const price = parseFloat(priceMatch);
        if (isNaN(price)) continue;
        if (!items.some(i => i.title === title && i.price == price)) {
          items.push({ title, price, link });
        }
        if (items.length >= maxResults) break;
      }
      return items;
    }

    let items = extractItems(above, 10);
    let usedBelow = false, usedFallback = false;
    if (!items.length) {
      items = extractItems(below, 5);
      usedBelow = !!items.length;
      if (!items.length) {
        items = extractItems(lis, 5);
        usedFallback = !!items.length;
      }
    }

    const pricesUsed = items.map(i => i.price);
    const median = calcMedian(pricesUsed);
    const mean = calcMean(pricesUsed);
    const min = pricesUsed.length ? Math.min(...pricesUsed) : 0;
    const max = pricesUsed.length ? Math.max(...pricesUsed) : 0;

    return res.status(200).json({
      median,
      mean,
      min,
      max,
      prices: pricesUsed,
      items,
      qty: pricesUsed.length,
      usedBelow,
      usedFallback
    });
  } catch (err) {
    return res.status(500).json({ message: 'Scraping failed' });
  }
}
