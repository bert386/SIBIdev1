
import { IncomingForm } from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST allowed' });
  }

  try {
    const form = new IncomingForm({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ Error parsing form:", err);
        return res.status(500).json({ message: "Form parsing failed" });
      }

      const imageFile = files.file?.[0];
      if (!imageFile) {
        console.error("❌ No image file received:", files);
        return res.status(400).json({ message: "No file uploaded" });
      }

      const filePath = imageFile.filepath;
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');

      if (!OPENAI_API_KEY) {
        console.error("❌ Missing OpenAI API key");
        return res.status(500).json({ message: "Missing OpenAI API key" });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that extracts a structured list of items from an image."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "List the items in this image as JSON. Each item must include: title, platform (e.g. PC, PS2, Xbox), year (most likely release year as a number, even if not visible — use general knowledge), category (e.g. game, dvd), and a generated search field like 'Farming Simulator 2014 PC Game'. Return ONLY valid JSON: [{ title, platform, year, category, search }]"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
        }),
      });

      const json = await response.json();
      let content = json.choices?.[0]?.message?.content || "";
      console.log("🧠 Raw OpenAI response:", content);

      content = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "");

      let items = [];
      try {
        items = JSON.parse(content);
        items = items.map(item => {
          const yearSuffix = item.year ? ` ${item.year}` : '';
          const platform = item.platform || '';
          const category = item.category || '';
          const search = `${item.title} ${platform} ${category}${yearSuffix}`.trim();
          return { ...item, search };
        });
        console.log("✅ Parsed items:", items);
      } catch (parseErr) {
        console.error("❌ Failed to parse JSON:", parseErr, "\nContent:", content);
        return res.status(500).json({ message: "OpenAI response could not be parsed", content });
      }

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ items }));
    });
  } catch (e) {
    console.error("❌ Critical API error:", e);
    res.status(500).json({ message: "Internal server error", error: e.message });
  }
}
