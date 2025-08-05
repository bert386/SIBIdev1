import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Error parsing form:", err);
      return res.status(500).json({ message: "Form parsing failed" });
    }

    const imageFile = files.file;
    if (!imageFile) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = imageFile[0].filepath;
    const fileBuffer = fs.readFileSync(filePath);

    // Simulated GPT-4 Vision API call
    const fakeResponse = [
      { title: "Grand Theft Auto V", category: "Video Game" },
      { title: "Finding Nemo DVD", category: "DVD" },
      { title: "Hot Wheels Redline", category: "Toy" }
    ];

    console.log("✅ Simulated OpenAI Vision result:", fakeResponse);
    return res.status(200).json({ items: fakeResponse });
  });
}
