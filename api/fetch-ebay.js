
const fetch = require('node-fetch');
const cheerio = require('cheerio');

module.exports.handler = async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Missing title" });
  }

  const query = encodeURIComponent(title);
  const url = `https://www.ebay.com.au/sch/i.html?_nkw=${query}&_sop=13&LH_Complete=1&LH_Sold=1`;

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    $('.s-item').each((i, el) => {
      const title = $(el).find('.s-item__title').text().trim();
      const price = $(el).find('.s-item__price').text().trim();
      const link = $(el).find('.s-item__link').attr('href');
      if (title && price && link) {
        results.push({ title, price, link });
      }
    });

    return res.status(200).json({ prices: results.slice(0, 10) });
  } catch (error) {
    return res.status(500).json({ error: error.toString() });
  }
};
