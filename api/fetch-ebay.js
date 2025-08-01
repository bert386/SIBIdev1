
const cheerio = require('cheerio');
const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  const items = req.body.items;
  const results = [];

  for (const item of items) {
    const query = encodeURIComponent(item.name);
    const ebaySoldUrl = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&_sop=13&LH_Complete=1&LH_Sold=1`;

    try {
      const response = await fetch(ebaySoldUrl);
      const html = await response.text();
      const $ = cheerio.load(html);
      const soldItems = [];

      $('li.s-item').each((i, el) => {
        const title = $(el).find('h3.s-item__title').text().trim();
        const priceText = $(el).find('.s-item__price').first().text().replace(/[^\d.]/g, '');
        const price = parseFloat(priceText);
        const link = $(el).find('a.s-item__link').attr('href');

        if (title && !isNaN(price) && link) {
          soldItems.push({ title, price, link });
        }
      });

      const topItems = soldItems.slice(0, 10);
      const averagePrice = topItems.length ? (topItems.reduce((sum, i) => sum + i.price, 0) / topItems.length).toFixed(2) : "NRS";

      results.push({
        name: item.name,
        platform: item.platform || "-",
        value: averagePrice === "NRS" ? "NRS" : `$${averagePrice} AUD`,
        ebay: topItems.map(i => ({ ...i })),
        view: `https://www.ebay.com.au/sch/i.html?_nkw=${query}&_sop=13&LH_Complete=1&LH_Sold=1`
      });
    } catch (err) {
      console.error("eBay fetch error:", err);
      results.push({
        name: item.name,
        platform: item.platform || "-",
        value: "NRS",
        ebay: [],
        view: `https://www.ebay.com.au/sch/i.html?_nkw=${query}&_sop=13&LH_Complete=1&LH_Sold=1`
      });
    }
  }

  res.status(200).json({ results });
};
