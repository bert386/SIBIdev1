import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'Invalid payload format. Expected { items: [...] }' });
  }

  const results = [];

  for (const item of items) {
    const encoded = encodeURIComponent(item.search);
    const url = `https://www.ebay.com.au/sch/i.html?_nkw=${encoded}&_sop=13&LH_Sold=1&LH_Complete=1`;

    console.log("🔍 [eBay Search]:", item.search);
    console.log("🔍 eBay Search URL:", url);

    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);
      const scraped = [];

      $('li.s-item').each((_, el) => {
        const title = $(el).find('.s-item__title').text().trim();
        const priceText = $(el).find('.s-item__price').first().text().trim();
        const link = $(el).find('.s-item__link').attr('href');

        if (!title || !priceText || !link) return;

        const priceMatch = priceText.replace(/[^\d.]/g, '');
        const price = parseFloat(priceMatch);

        if (isNaN(price) || price <= 0) return;

        scraped.push({ title, price, link });
        if (scraped.length >= 10) return false;
      });

      const avg = scraped.length > 0
        ? Math.round(scraped.reduce((sum, i) => sum + i.price, 0) / scraped.length)
        : 0;

      console.log(`🟢 Success: ${scraped.length} items found for "${item.search}"`);

      results.push({
        title: item.title,
        platform: item.platform,
        year: item.year,
        category: item.category,
        search: item.search,
        average: avg,
        solds: scraped
      });
    } catch (err) {
      console.error(`❌ Error scraping "${item.search}":`, err.message);
      results.push({
        title: item.title,
        platform: item.platform,
        year: item.year,
        category: item.category,
        search: item.search,
        average: 0,
        solds: [],
        error: err.message
      });
    }
  }

  return res.status(200).json({ results });
}