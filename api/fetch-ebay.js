
import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }

    const results = [];

    for (const item of items) {
      const query = encodeURIComponent(item);
      const url = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;

      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      const soldItems = [];
      $("li.s-item").each((i, el) => {
        if (i >= 10) return false; // Only get 10 most recent
        const title = $(el).find(".s-item__title").text();
        const priceText = $(el).find(".s-item__price").first().text().replace(/[^\d.]/g, "");
        const price = parseFloat(priceText);
        const link = $(el).find("a.s-item__link").attr("href");

        if (!isNaN(price) && link) {
          soldItems.push({ title, price, link });
        }
      });

      if (soldItems.length === 0) {
        results.push({
          item,
          average: "NRS",
          sold: 0,
          available: 0,
          soldLinks: [],
        });
      } else {
        const prices = soldItems.map(x => x.price);
        const average = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);

        results.push({
          item,
          average: `$${average}`,
          sold: soldItems.length,
          available: 0,
          soldLinks: soldItems.map(x => x.link),
        });
      }
    }

    res.status(200).json({ results });
  } catch (err) {
    console.error("Error in fetch-ebay:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
