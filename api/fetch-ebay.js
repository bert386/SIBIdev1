
const cheerio = require("cheerio");
const fetch = require("node-fetch");

module.exports = async function handler(req, res) {
  const items = req.body.items;
  const results = [];

  for (const item of items) {
    const query = encodeURIComponent(item.name);
    const searchURL = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;

    console.log("🔍 Fetching sold items from:", searchURL);

    try {
      const response = await fetch(searchURL);
      const html = await response.text();
      const $ = cheerio.load(html);

      const soldItems = [];
      $("li.s-item").each((i, el) => {
        if (i >= 10) return false;
        const title = $(el).find("h3.s-item__title").text().trim();
        const priceText = $(el).find(".s-item__price").first().text().replace(/[^\d.]/g, "");
        const link = $(el).find("a.s-item__link").attr("href");
        const price = parseFloat(priceText);
        if (title && price && link) {
          soldItems.push({ title, price, link });
        }
      });

      const avgPrice = soldItems.length ? (soldItems.reduce((acc, x) => acc + x.price, 0) / soldItems.length).toFixed(2) : "NRS";
      const soldLinks = soldItems.map(x => x.link);

      console.log(`✅ ${item.name} — Avg: ${avgPrice}, Sold Count: ${soldItems.length}`);

      results.push({
        name: item.name,
        platform: item.platform || "-",
        averagePrice: soldItems.length ? `$${avgPrice} AUD` : "NRS",
        soldCount: soldItems.length,
        activeCount: 0,
        ebayViewLink: searchURL,
        soldLinks
      });
    } catch (err) {
      console.error("❌ Error fetching eBay data for:", item.name, err);
      results.push({
        name: item.name,
        platform: item.platform || "-",
        averagePrice: "NRS",
        soldCount: 0,
        activeCount: 0,
        ebayViewLink: searchURL,
        soldLinks: []
      });
    }
  }

  res.status(200).json({ results });
};
