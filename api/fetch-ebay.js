
import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { search } = req.query;
    if (!search) return res.status(400).json({ error: "Missing search query" });

    const query = encodeURIComponent(`${search} site:ebay.com.au`);
    const url = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1&_sop=13`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);
    const items = [];

    $("li.s-item").each((_, el) => {
      const title = $(el).find("h3.s-item__title").text().trim();
      const priceText = $(el).find(".s-item__price").first().text().replace(/[^\d.]/g, "");
      const link = $(el).find("a.s-item__link").attr("href");

      const price = parseFloat(priceText);
      if (!isNaN(price) && title && link) {
        items.push({ title, price, link });
      }
    });

    const top10 = items.slice(0, 10);
    const avgPrice =
      top10.reduce((sum, item) => sum + item.price, 0) / (top10.length || 1);

    console.log(`🔍 Search: ${search}`);
    console.log(`📦 Found ${top10.length} sold items`);
    top10.forEach((item, i) =>
      console.log(` ${i + 1}. ${item.title} – $${item.price} – ${item.link}`)
    );
    console.log(`💰 Avg Price: $${avgPrice.toFixed(2)}`);

    res.status(200).json({ avg: avgPrice.toFixed(2), solds: top10 });
  } catch (err) {
    console.error("❌ Error in fetch-ebay:", err);
    res.status(500).json({ error: "Failed to fetch eBay data" });
  }
}
