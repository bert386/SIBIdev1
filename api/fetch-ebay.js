const cheerio = require('cheerio');
const fetch = require('node-fetch');

module.exports.handler = async function (req, res) {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      console.error("Invalid items payload");
      return res.status(400).json({ error: "Invalid payload" });
    }

    const results = await Promise.all(
      items.map(async (item) => {
        const query = encodeURIComponent(item.title);
        const url = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&_sop=13&LH_Complete=1&LH_Sold=1`;

        console.log(`🔍 Fetching solds for: ${item.title}`);
        console.log(`📄 URL: ${url}`);

        try {
          const response = await fetch(url);
          const html = await response.text();
          const $ = cheerio.load(html);
          const soldItems = [];

          $('li.s-item').each((i, el) => {
            const priceText = $(el).find('.s-item__price').text().replace(/[^\d.]/g, '');
            const price = parseFloat(priceText);
            const link = $(el).find('a.s-item__link').attr('href');

            if (!isNaN(price) && link) {
              soldItems.push({ price, link });
            }
          });

          const avg =
            soldItems.length > 0
              ? Math.round(
                  soldItems.reduce((sum, i) => sum + i.price, 0) / soldItems.length
                )
              : "NRS";

          console.log(`🧾 ${item.title} => Avg: ${avg} | Count: ${soldItems.length}`);

          return {
            title: item.title,
            value: avg,
            soldLinks: soldItems.map((i) => i.link),
          };
        } catch (err) {
          console.error(`❌ Error fetching for ${item.title}`, err);
          return {
            title: item.title,
            value: "ERR",
            soldLinks: [],
          };
        }
      })
    );

    res.status(200).json({ results });
  } catch (err) {
    console.error("❌ Server error", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
