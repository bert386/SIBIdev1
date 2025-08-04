import { IncomingForm } from 'formidable';
import fs from 'fs';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const form = new IncomingForm({ multiples: true });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Error parsing form data' });
    }

    const images = Array.isArray(files.images) ? files.images : [files.images];

    const results = [];
    for (const img of images) {
      const buffer = fs.readFileSync(img.filepath);
      const base64Image = buffer.toString("base64");

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "List the items in this image. For each, give name, category (e.g. DVD, game, toy), platform (if applicable), and release year if known." },
                { type: "image_url", image_url: { url: `data:${img.mimetype};base64,${base64Image}` } }
              ],
            },
          ],
          max_tokens: 1000,
        });

        const content = response.choices[0].message.content;
        results.push({ filename: img.originalFilename, raw: content });
      } catch (e) {
        console.error("OpenAI error:", e.message);
        results.push({ filename: img.originalFilename, error: e.message });
      }
    }

    res.status(200).json({ results });
  });
}