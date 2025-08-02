
const fetch = require("node-fetch");
const cheerio = require("cheerio");

module.exports = async function handler(req, res) {
  const items = req.body.items;
  const results = [];

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid items format" });
  }

  for (const item of items) {
    const query = encodeURIComponent(item);
    const url = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;

    try {
      console.log("eBay fetch for", item);
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      const soldPrices = [];
      const soldLinks = [];

      $("li.s-item").each((i, el) => {
        const priceText = $(el).find(".s-item__price").text().replace(/[^\d\.]/g, "");
        const price = parseFloat(priceText);
        const link = $(el).find("a.s-item__link").attr("href");

        if (!isNaN(price)) soldPrices.push(price);
        if (link) soldLinks.push(link);
      });

      console.log("Sold Prices:", soldPrices);
      console.log("Sold Links:", soldLinks);

      const avg =
        soldPrices.length > 0
          ? parseFloat((soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length).toFixed(2))
          : "NRS";

      results.push({
        name: item,
        value: avg,
        sold: soldPrices.length,
        available: soldPrices.length, // approximate
        soldPrices: soldPrices.slice(0, 10),
        soldLinks: soldLinks.slice(0, 10),
        link: url
      });
    } catch (err) {
      console.error("eBay scrape failed for:", item, err);
      results.push({
        name: item,
        value: "ERR",
        sold: 0,
        available: 0,
        soldPrices: [],
        soldLinks: [],
        link: url
      });
    }
  }

  const sorted = results
    .filter(r => typeof r.value === "number")
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const summary = `This lot contains ${results.length} items. Most valuable: ${
    sorted[0]?.name || "N/A"
  }`;

  res.status(200).json({
    top3: sorted,
    items: results,
    summary
  });
};
