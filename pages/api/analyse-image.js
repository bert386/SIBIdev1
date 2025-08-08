import formidable from 'formidable';
import fs from 'fs';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form data:', err);
      return res.status(500).json({ error: 'Error parsing form data' });
    }
    try {
      const filePath = files.image.filepath;
      const imageBuffer = fs.readFileSync(filePath);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = "Identify each item in this image, returning JSON with fields: title, platform, category, year, ai_estimated_value (AUD)";
      const result = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an assistant that identifies products in images." },
          { role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` }
          ] }
        ],
        max_tokens: 800
      });

      const textOutput = result.choices[0].message.content;
      res.status(200).json({ raw: textOutput });

    } catch (error) {
      console.error('Error analysing image:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
