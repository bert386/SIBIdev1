const cheerio = require("cheerio");
const axios = require("axios");

module.exports = async (req, res) => {
  try {
    const items = req.body.items;
    const results = [];

    for (const item of items) {
      const itemName = item.name;
      const query = encodeURIComponent(itemName);
      const ebayUrl = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;

      const response = await axios.get(ebayUrl);
      const $ = cheerio.load(response.data);

      const soldPrices = [];
      const soldLinks = [];

      $("li.s-item").each((i, el) => {
        const priceText = $(el).find(".s-item__price").first().text().replace(/[^\d.]/g, "");
        const href = $(el).find(".s-item__link").attr("href");
        if (priceText && href) {
          soldPrices.push(parseFloat(priceText));
          soldLinks.push(href);
        }
      });

      const avgValue = soldPrices.length
        ? `$${(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length).toFixed(2)} AUD`
        : "NRS";

      results.push({
        name: item.name,
        value: avgValue,
        sold: soldPrices.length,
        available: 0,
        link: ebayUrl,
        soldPrices,
        soldLinks
      });
    }

    const top3 = [...results]
      .filter(i => i.value !== "NRS")
      .sort((a, b) => parseFloat(b.value.replace("$", "")) - parseFloat(a.value.replace("$", "")))
      .slice(0, 3);

    const summary = `This lot contains ${results.length} items. Most valuable: ${top3[0]?.name || "N/A"}`;

    res.status(200).json({ items: results, top3, summary });
  } catch (e) {
    console.error("Error in fetch-ebay:", e);
    res.status(500).json({ error: "eBay fetch failed" });
  }
};