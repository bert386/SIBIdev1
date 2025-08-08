import formidable from 'formidable';
import fs from 'fs';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error parsing form' });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Placeholder AI analysis - replace with actual Vision call
    res.json([{ title: 'Sample Item', ai_estimated_value: 10 }]);
  });
}
