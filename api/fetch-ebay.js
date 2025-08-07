
import axios from 'axios';
import * as cheerio from 'cheerio';

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
  // PATCHED: enable JS Rendering
  const proxyUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(ebayUrl)}&render=true`;

  try {
    const { data: html } = await axios.get(proxyUrl);
    const $ = cheerio.load(html);

    const sItems = $('li.s-item').toArray();
    const items = [];
    for (const el of sItems) {
      const title = $(el).find('.s-item__title').text().trim();
      const priceText = $(el).find('.s-item__price').first().text().trim();
      const link = $(el).find('.s-item__link').attr('href');
      if (!title || !priceText || !link) continue;
      const priceMatch = priceText.replace(/[^\d.]/g, '');
      const price = parseFloat(priceMatch);
      if (isNaN(price)) continue;
      items.push({ title, price, link });
      if (items.length >= 10) break;
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
      qty: pricesUsed.length
    });
  } catch (err) {
    return res.status(500).json({ message: 'Scraping failed' });
  }
}
