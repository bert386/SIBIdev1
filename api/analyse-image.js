const formidable = require("formidable");
const fs = require("fs");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports.config = { api: { bodyParser: false } };

module.exports.default = async function handler(req, res) {
  const form = new formidable.IncomingForm({ multiples: true });
  form.parse(req, async (err, fields, files) => {
    try {
      const imageFiles = Array.isArray(files.images) ? files.images : [files.images];
      const results = [];

      for (const imageFile of imageFiles) {
        const imageData = fs.readFileSync(imageFile.filepath);
        const base64Image = imageData.toString("base64");

        const completion = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "system",
              content:
                "You are an expert item evaluator working for professional eBay sellers. You specialise in bulk lots. For each item you see, return its full name, release year, and format (e.g. 'Wii game', 'DVD', 'Comic Book', 'VHS'). Return results in strict JSON as an array of strings like: ['Mario Kart 8 (2009) WiiU', 'The Matrix (1999) DVD']."
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Please identify and return all items visible in the photo." },
                { type: "image_url", image_url: { url: `data:${imageFile.mimetype};base64,${base64Image}` } }
              ]
            }
          ],
          max_tokens: 500
        });

        const reply = completion.choices[0].message.content;
        results.push(JSON.parse(reply));
      }

      res.status(200).json({ items: results.flat() });
    } catch (err) {
      console.error("Image analysis failed:", err);
      res.status(500).json({ error: "Image analysis failed" });
    }
  });
};