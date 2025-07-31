import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({ keepExtensions: true, multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err || !files.images) {
      return res.status(400).json({ error: 'Image upload failed' });
    }

    const imagePath = Array.isArray(files.images)
      ? files.images[0].filepath
      : files.images.filepath;

    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });

    const prompt = `You are an expert item evaluator. You work for people who buy and sell on eBay.
Your expertise is in analysing bulk lots of items, identifying them, and evaluating them.
You will identify each item including its title, its format/type/category (e.g., DVD, Wii, Sony PlayStation, VHS, comic book), and its release date.
You will return results in this format:
"Full item name including release year and item format, for example: Mario Kart 8 (2009) WiiU"
Respond only in JSON format with an array of objects, each having 'name', 'format', and 'year'.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "[]";

    res.status(200).json({ result });
  });
}
