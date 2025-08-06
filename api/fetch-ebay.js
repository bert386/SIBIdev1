
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { search, platform } = req.body;
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
    const found = $('li.s-item').length;
    console.log(`🔍 Found ${found} listing items`);

    $('li.s-item').each((_, el) => {
      const title = $(el).find('.s-item__title').text().trim();
      const priceText = $(el).find('.s-item__price').first().text().trim();
      const link = $(el).find('.s-item__link').attr('href');

      if (title.includes('Shop on eBay')) {
        console.warn('🚫 Skipping ad listing:', title);
        return;
      }

      if (!title || !priceText || !link) {
        console.warn('⚠️ Skipping item due to missing data:', { title, priceText, link });
        return;
      }

      const priceMatch = priceText.replace(/[^\d.]/g, '');
      const price = parseFloat(priceMatch);
      if (isNaN(price) || price <= 0) return;

      items.push({ title, price, link });
      if (items.length >= 10) return false;
    });

    const average = items.length > 0
      ? Math.round(items.reduce((sum, item) => sum + item.price, 0) / items.length)
      : 0;

    return res.status(200).json({ average, items });
  } catch (err) {
    console.error("❌ Scraping error:", err.message);
    return res.status(500).json({ message: 'Scraping failed' });
  }
};
