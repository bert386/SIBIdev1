
import formidable from "formidable";
import fs from "fs";
import { Readable } from "stream";
import OpenAI from "openai";
import cheerio from "cheerio";
import axios from "axios";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  console.log("🟡 Parsing incoming form...");

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Form parsing failed:", err);
      return res.status(500).json({ error: "Form parsing failed" });
    }

    const file = files.file;

    if (!file) {
      console.error("❌ No image file found in the form data.");
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const fileData = fs.readFileSync(file[0].filepath);

    console.log("📤 Sending to OpenAI Vision...");
    const stream = Readable.from(fileData);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "List every item you can see in this photo. For each item, include:\n\n- Title\n- Platform (e.g., Wii, PS2, Xbox, PC, DVD, Book, etc.)\n- Release Year (if found)\n- Category (game, dvd, book, toy, etc.)\n- A suggested eBay search string that includes platform and category",
            },
            {
              type: "image_url",
              image_url: {
                url: "data:image/jpeg;base64," + fileData.toString("base64"),
              },
            },
          ],
        },
      ],
      temperature: 0.2,
    });

    const textResponse = response.choices[0]?.message?.content || "";
    console.log("🧠 Raw OpenAI response:", textResponse);

    let results = [];

    try {
      results = JSON.parse(textResponse);
    } catch (e) {
      console.error("❌ Failed to parse JSON:", e);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    // 🟡 Scraping eBay for sold listings...
    console.log("🟡 Scraping eBay for sold listings...");
    for (const item of results) {
      const query = item.search || item.title;
      const searchURL = `https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`;

      try {
        const { data: html } = await axios.get(searchURL, {
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });

        const $ = cheerio.load(html);
        const prices = [];

        $(".s-item").each((i, el) => {
          const priceText = $(el).find(".s-item__price").text().replace(/[^0-9.]/g, "");
          if (priceText) {
            prices.push(parseFloat(priceText));
          }
        });

        if (prices.length) {
          const avg = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);
          item.value = `$${avg} AUD`;
          console.log(`✅ ${item.title} → $${avg} from ${prices.length} results`);
        } else {
          item.value = "NRS";
          console.log(`⚠️ No sold prices found for: ${item.title}`);
        }
      } catch (err) {
        console.error(`❌ Scrape failed for ${item.title}:`, err.message);
        item.value = "ERR";
      }
    }

    // 🔚 Final response
    res.status(200).json({ results });
  });
}
