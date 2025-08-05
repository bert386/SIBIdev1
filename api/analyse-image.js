import { IncomingForm } from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

export const config = { api: { bodyParser: false } };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.writeHead(405).end(JSON.stringify({ message: 'Only POST allowed' }));
  }

  try {
    const form = new IncomingForm({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) return res.writeHead(500).end(JSON.stringify({ message: "Form parsing failed" }));
      const imageFile = files.file?.[0];
      if (!imageFile) return res.writeHead(400).end(JSON.stringify({ message: "No file uploaded" }));

      const base64Image = fs.readFileSync(imageFile.filepath).toString('base64');

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "Extract a structured list of items from the image." },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Return only valid JSON with: title, platform, year (most likely release year as a number, even if not visible), category, and a search field like 'Game Title PC Game'."
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` }
                }
              ]
            }
          ],
          max_tokens: 1000
        })
      });

      const json = await response.json();
      let content = json.choices?.[0]?.message?.content || "";
      content = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "");

      let items = [];
      try {
        items = JSON.parse(content);
      } catch (err) {
        console.error("Parse error:", err);
      }

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ items }));
    });
  } catch (e) {
    res.writeHead(500).end(JSON.stringify({ message: "Internal error" }));
  }
}
