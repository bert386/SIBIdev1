
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fuzz from 'fuzzball';

const BUNDLE_WORDS = [
  'lot', 'bundle', 'pick', 'collection', 'job lot', 'bulk', 'various', 'pick n mix', 'mixed'
];

function isBundleOrLot(title) {
  const lower = title.toLowerCase();
  return BUNDLE_WORDS.some(word => lower.includes(word));
}

function similarityScore(a, b) {
  // Fuzzball ratio (0-100)
  return fuzz.token_set_ratio(a, b);
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

        // Bundle/lot filtering (excluding "set")
        if (isBundleOrLot(title)) return;

        // Title similarity (80%+)
        const similarity = similarityScore(title, search);
        if (similarity < 80) return;

        const priceMatch = priceText.replace(/[^\d.]/g, '');
        const price = parseFloat(priceMatch);
        if (isNaN(price) || price <= 0) return;

        if (!items.some(i => i.title === title && i.price === price)) {
          items.push({ title, price, link, similarity });
        }
        if (items.length >= 30) return false;
      });
      if (items.length >= 30) break;
    }

    // Sort items by similarity (descending), then price
    items.sort((a, b) => b.similarity - a.similarity || a.price - b.price);

    // Remove highest/lowest if 4+ remain
    let filtered = items;
    if (filtered.length >= 4) {
      filtered = filtered.slice(1, -1);
    }

    const average = filtered.length > 0
      ? Math.round(filtered.reduce((sum, item) => sum + item.price, 0) / filtered.length)
      : 0;

    return res.status(200).json({ average, items: filtered });
  } catch (err) {
    console.error("❌ Scraping error:", err.message);
    return res.status(500).json({ message: 'Scraping failed' });
  }
}
