import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const scraperUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(`https://www.ebay.com.au/sch/i.html?_nkw=${query}&_sop=13&LH_Sold=1&LH_Complete=1`)}`;
    const { data } = await axios.get(scraperUrl);

    const $ = cheerio.load(data);
    const results = [];

    $('.s-item').each((i, el) => {
      const title = $(el).find('.s-item__title').text();
      const price = $(el).find('.s-item__price').text();
      const link = $(el).find('.s-item__link').attr('href');
      const image = $(el).find('.s-item__image-img').attr('src');
      if (title && price && link) {
        results.push({ title, price, link, image });
      }
    });

    res.status(200).json({ items: results.slice(0, 10) });

  } catch (error) {
    console.error('Error fetching eBay data:', error);
    res.status(500).json({ error: error.message });
  }
}
