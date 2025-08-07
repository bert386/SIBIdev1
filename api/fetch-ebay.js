
import axios from 'axios';
import * as cheerio from 'cheerio';

function isAdOrShop(title) {
  const t = title.toLowerCase();
  return t.includes('shop on ebay') || t.includes('ad') || t === '';
}

function calcMedian(prices) {
  if (!prices.length) return 0;
  const sorted = prices.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { search } = req.body;
  const encoded = encodeURIComponent(search);
  const ebayUrl = `https://www.ebay.com.au/sch/i.html?_nkw=${encoded}&_sop=13&LH_Sold=1&LH_Complete=1`;

  const scraperApiKey = process.env.SCRAPER_API_KEY;
  const proxyUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(ebayUrl)}`;

  console.log("🔍 eBay Search URL via ScraperAPI:", proxyUrl);

  try {
    const { data: html } = await axios.get(proxyUrl);
    console.log("🧪 HTML preview:", html.substring(0, 1000));

    if (html.includes("Pardon our interruption") || html.includes("To continue, please verify")) {
      console.warn("🛑 Bot protection page received from eBay.");
      return res.status(500).json({ message: "Scraping blocked by eBay" });
    }

    const $ = cheerio.load(html);
    const items = [];
    const selectors = ['li.s-item', '.s-item__wrapper'];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const title = $(el).find('.s-item__title').text().trim();
        const priceText = $(el).find('.s-item__price').first().text().trim();
        const link = $(el).find('.s-item__link').attr('href');

        if (!title || !priceText || !link) return;

        // Exclude eBay ad/shop results
        if (isAdOrShop(title)) return;

        const priceMatch = priceText.replace(/[^\d.]/g, '');
        const price = parseFloat(priceMatch);
        if (isNaN(price) || price <= 0) return;

        if (!items.some(i => i.title === title && i.price == price)) {
          items.push({ title, price, link });
        }
        if (items.length >= 10) return false;
      });
      if (items.length >= 10) break;
    }

    const pricesUsed = items.map(i => i.price);
    const median = calcMedian(pricesUsed);
    const min = pricesUsed.length ? Math.min(...pricesUsed) : 0;
    const max = pricesUsed.length ? Math.max(...pricesUsed) : 0;

    return res.status(200).json({
      median,
      min,
      max,
      prices: pricesUsed,
      items
    });
  } catch (err) {
    console.error("❌ Scraping error:", err.message);
    return res.status(500).json({ message: 'Scraping failed' });
  }
}
