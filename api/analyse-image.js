
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { askGPT } from './utils/ask-gpt';
import { scrapeEbayData } from './utils/scrape-ebay';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = formidable({ multiples: true, uploadDir: '/tmp', keepExtensions: true });
  const [fields, files] = await form.parse(req);

  const images = Array.isArray(files.images) ? files.images : [files.images];
  const results = [];

  for (const file of images) {
    const imagePath = file.filepath;
    const imageBuffer = await promisify(fs.readFile)(imagePath);

    const gptResponse = await askGPT(imageBuffer);
    const ebayData = await scrapeEbayData(gptResponse.title, gptResponse.category, gptResponse.platform);

    results.push({
      ...gptResponse,
      ...ebayData
    });
  }

  res.status(200).json({ results });
};

export default handler;
