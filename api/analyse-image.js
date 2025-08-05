import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.writeHead(405).end(JSON.stringify({ message: 'Only POST allowed' }));
  }

  try {
    const form = new IncomingForm({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ Error parsing form:", err);
        res.writeHead(500).end(JSON.stringify({ message: "Form parsing failed" }));
        return;
      }

      const imageFile = files.file?.[0];
      if (!imageFile) {
        return res.writeHead(400).end(JSON.stringify({ message: "No file uploaded" }));
      }

      const filePath = imageFile.filepath;
      const fileBuffer = fs.readFileSync(filePath);

      const fakeResponse = [
        { title: "Grand Theft Auto V", category: "Video Game" },
        { title: "Finding Nemo DVD", category: "DVD" },
        { title: "Hot Wheels Redline", category: "Toy" }
      ];

      console.log("✅ Simulated OpenAI Vision result:", fakeResponse);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ items: fakeResponse }));
    });
  } catch (e) {
    console.error("❌ Critical API error:", e);
    res.writeHead(500).end(JSON.stringify({ message: "Internal server error" }));
  }
}
