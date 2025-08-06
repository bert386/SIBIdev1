
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { search, platform } = req.body;
  const encoded = encodeURIComponent(search);
  const url = `https://www.ebay.com.au/sch/i.html?_nkw=${encoded}&_sop=13&LH_Sold=1&LH_Complete=1`;

  console.log("🔍 eBay Search URL:", url);

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
      }
    });

    console.log("🧪 HTML preview:", html.substring(0, 1000));

    if (html.includes("Pardon our interruption") || html.includes("To continue, please verify")) {
      console.warn("🛑 Bot protection page received from eBay.");
      return res.status(500).json({ message: "Scraping blocked by eBay" });
    }

    const $ = cheerio.load(html);
    const items = [];
    const found = $('li.s-item').length;
    console.log(`🔍 Found ${found} listing items`);

    $('li.s-item').each((_, el) => {
      const title = $(el).find('.s-item__title').text().trim();
      const priceText = $(el).find('.s-item__price').first().text().trim();
      const link = $(el).find('.s-item__link').attr('href');

      if (!title || !priceText || !link) {
        console.warn('⚠️ Skipping item due to missing data:', { title, priceText, link });
        return;
      }

      const priceMatch = priceText.replace(/[^\d.]/g, '');
      const price = parseFloat(priceMatch);
      if (isNaN(price) || price <= 0) return;

      items.push({ title, price, link });
      if (items.length >= 10) return false;
    });

    const average = items.length > 0
      ? Math.round(items.reduce((sum, item) => sum + item.price, 0) / items.length)
      : 0;

    
    const openai = (await import('openai')).default;
    const client = new openai({ apiKey: process.env.OPENAI_API_KEY });
    
    const gptPrompt = `Estimate the average secondhand price in AUD for this item based on recent trends, platform and year: ${search}. Just return a number with no symbols or words.`;
    let gptEstimate = 0;

    try {
      const gptResponse = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: gptPrompt }],
      });
      const raw = gptResponse.choices[0].message.content.trim();
      gptEstimate = parseFloat(raw.replace(/[^\d.]/g, ''));
    } catch (e) {
      console.warn("⚠️ GPT estimate failed:", e.message);
    }

    const filteredPrices = items.filter(item => {
      return item.price >= 0.3 * gptEstimate && item.price <= 1.7 * gptEstimate;
    });

    const average = filteredPrices.length > 0
      ? Math.round(filteredPrices.reduce((sum, item) => sum + item.price, 0) / filteredPrices.length)
      : 0;

    return res.status(200).json({
      allPrices: items,
      filteredPrices,
      gptEstimate,
      average
    });

  } catch (err) {
    console.error("❌ Scraping error:", err.message);
    return res.status(500).json({ message: 'Scraping failed' });
  }
};
