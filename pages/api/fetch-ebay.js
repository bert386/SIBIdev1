import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const apiKey = process.env.SCRAPER_API_KEY || process.env.SCRAPERAPI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing Scraper API key' });

  const url = `https://api.scraperapi.com?api_key=${apiKey}&url=https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=12&LH_Sold=1&LH_Complete=1`;

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const items = [];
    $('li.s-item').each((_, el) => {
      const title = $(el).find('.s-item__title').text();
      const link = $(el).find('.s-item__link').attr('href');
      items.push({ title, link });
    });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
