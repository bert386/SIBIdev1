
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
    // Find all li.s-item in DOM order
    const allLis = $('li.s-item').toArray();
    // Find separator index for "Results matching fewer words"
    let separatorIndex = -1;
    $('h3').each((i, el) => {
      const heading = $(el).text().trim();
      if (heading === "Results matching fewer words") {
        // Find the first li.s-item that follows this h3
        const nextLi = $(el).nextAll('li.s-item').get(0);
        separatorIndex = allLis.findIndex(li => li === nextLi);
      }
    });

    let aboveNodes, belowNodes;
    if (separatorIndex > -1) {
      aboveNodes = allLis.slice(0, separatorIndex);
      belowNodes = allLis.slice(separatorIndex);
    } else {
      aboveNodes = allLis;
      belowNodes = [];
    }

    function extractItems(nodes, maxResults) {
      const items = [];
      for (const el of nodes) {
        const title = $(el).find('.s-item__title').text().trim();
        const priceText = $(el).find('.s-item__price').first().text().trim();
        const link = $(el).find('.s-item__link').attr('href');
        if (!title || !priceText || !link) continue;
        if (isAdOrShop(title)) continue;
        const priceMatch = priceText.replace(/[^\d.]/g, '');
        const price = parseFloat(priceMatch);
        if (isNaN(price) || price <= 0) continue;
        if (!items.some(i => i.title === title && i.price == price)) {
          items.push({ title, price, link });
        }
        if (items.length >= maxResults) break;
      }
      return items;
    }

    let items = extractItems(aboveNodes, 10);
    let usedFallback = false;
    if (!items.length) {
      // fallback: use first 5 below separator
      items = extractItems(belowNodes, 5);
      usedFallback = true;
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
      usedFallback
    });
  } catch (err) {
    console.error("❌ Scraping error:", err.message);
    return res.status(500).json({ message: 'Scraping failed' });
  }
}
