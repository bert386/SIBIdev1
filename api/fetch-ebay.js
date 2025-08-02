
const fetch = require('node-fetch');
const cheerio = require('cheerio');

module.exports = async function handler(req, res) {
  const { itemName } = req.query;

  if (!itemName) {
    return res.status(400).json({ error: "Missing itemName query parameter" });
  }

  const encodedQuery = encodeURIComponent(itemName + ' site:ebay.com.au');
  const ebaySearchURL = `https://www.ebay.com.au/sch/i.html?_nkw=${encodedQuery}&LH_Complete=1&LH_Sold=1`;

  try {
    const response = await fetch(ebaySearchURL);
    const body = await response.text();
    const $ = cheerio.load(body);

    const results = [];

    $('.s-item').each((i, elem) => {
      const title = $(elem).find('.s-item__title').text().trim();
      const priceText = $(elem).find('.s-item__price').first().text().replace(/[^\d.]/g, '');
      const price = parseFloat(priceText);
      const link = $(elem).find('.s-item__link').attr('href');

      if (title && price && link) {
        results.push({ title, price, link });
      }
    });

    const top10 = results.slice(0, 10);
    const avgPrice = top10.reduce((sum, r) => sum + r.price, 0) / (top10.length || 1);

    res.status(200).json({
      itemName,
      avgPrice: Math.round(avgPrice * 100) / 100,
      soldLinks: top10.map(r => r.link),
      soldPrices: top10.map(r => r.price)
    });
  } catch (err) {
    console.error("eBay fetch error:", err);
    res.status(500).json({ error: "Failed to fetch sold items from eBay" });
  }
};
