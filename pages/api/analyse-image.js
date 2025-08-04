
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function handler(req, res) {
  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      res.status(500).json({ error: 'Form parsing failed' });
      return;
    }

    const imageFile = files.image;
    if (!imageFile || Array.isArray(imageFile)) {
      res.status(400).json({ error: 'No image uploaded' });
      return;
    }

    const imageData = fs.readFileSync(imageFile.filepath);

    try {
      console.log("📤 Sending to OpenAI...");
      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'List all items in this photo and identify each with title, type (game, dvd, book, etc.), platform if applicable, and year if visible.' },
              {
                type: 'image_url',
                image_url: {
                  mime_type: imageFile.mimetype,
                  data: imageData.toString('base64'),
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      console.log("✅ OpenAI result received.");
      res.status(200).json({ result: visionResponse.choices[0].message.content });
    } catch (error) {
      console.error('OpenAI error:', error.message);
      res.status(500).json({ error: 'OpenAI call failed' });
    }
  });
}

export default handler;
