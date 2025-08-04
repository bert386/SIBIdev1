import axios from 'axios';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const searchURL = `https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=13`;
    const response = await axios.get(searchURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36',
      }
    });

    
    if (!response || !response.data) {
      console.error("Empty or invalid response from eBay");
      return res.status(500).json({ error: "Empty or invalid response from eBay" });
    }
    let $;
    try {
      $ = cheerio.load(response.data);
    } catch (loadErr) {
      console.error("Cheerio load error:", loadErr);
      return res.status(500).json({ error: "Failed to load HTML with Cheerio" });
    }
    
    const items = [];
    $('li.s-item').each((i, el) => {
      const title = $(el).find('.s-item__title').text().trim();
      const priceText = $(el).find('.s-item__price').first().text().replace(/[^\d.]/g, '');
      const price = parseFloat(priceText);
      const link = $(el).find('.s-item__link').attr('href');

      if (title && !isNaN(price)) {
        items.push({ title, price, link });
      }
    });

    const sliced = items.slice(0, 10);
    const avg = sliced.reduce((sum, i) => sum + i.price, 0) / (sliced.length || 1);
    return res.status(200).json({ items: sliced, average: avg });
  } catch (e) {
    console.error("Error in fetch-ebay:", e.message);
    return res.status(500).json({ error: e.message });
  }
}