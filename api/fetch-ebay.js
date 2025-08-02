
const fetch = require("node-fetch");
const cheerio = require("cheerio");

module.exports = async function handler(req, res) {
  const items = req.body.items;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Missing or invalid items array" });
  }

  const results = [];

  for (const item of items) {
    const query = encodeURIComponent(item.name);
    const url = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&_sacat=0&LH_Sold=1&LH_Complete=1`;

    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      const soldItems = [];

      $("li.s-item").each((index, element) => {
        const priceText = $(element).find(".s-item__price").first().text().replace(/[^\d.]/g, "");
        const link = $(element).find(".s-item__link").attr("href");

        const price = parseFloat(priceText);
        if (!isNaN(price) && link) {
          soldItems.push({ price, link });
        }

        if (soldItems.length >= 10) return false;
      });

      results.push({
        item: item.name,
        prices: soldItems.map(s => s.price),
        links: soldItems.map(s => s.link)
      });
    } catch (err) {
      console.error("Scraping failed for:", item.name, err.message);
      results.push({ item: item.name, error: "Scraping failed" });
    }
  }

  res.status(200).json({ results });
};
