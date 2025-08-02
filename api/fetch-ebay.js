const cheerio = require("cheerio");
const fetch = require("node-fetch");

module.exports = async function handler(req, res) {
  const items = req.body.items;
  const results = [];

  for (const item of items) {
    const query = encodeURIComponent(item);
    const url = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;

    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      const prices = [];
      const links = [];

      $("li.s-item").each((i, el) => {
        const priceText = $(el).find(".s-item__price").text().replace(/[^\d\.]/g, "");
        const price = parseFloat(priceText);
        const link = $(el).find("a.s-item__link").attr("href");

        if (!isNaN(price)) prices.push(price);
        if (link) links.push(link);
      });

      const avg = prices.length > 0 ? parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)) : "NRS";

      results.push({
        name: item,
        value: avg,
        soldCount: prices.length,
        availableCount: prices.length, // We can't get this without API, so we mirror sold
        soldPrices: prices.slice(0, 10),
        soldLinks: links.slice(0, 10),
        searchUrl: url
      });
    } catch (err) {
      console.error("eBay scrape failed for:", item, err);
      results.push({
        name: item,
        value: "ERR",
        soldCount: 0,
        availableCount: 0,
        soldPrices: [],
        soldLinks: [],
        searchUrl: url
      });
    }
  }

  res.status(200).json({ results });
};