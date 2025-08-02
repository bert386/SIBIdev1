
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

      for (let file of imageFiles) {
        const imageData = fs.readFileSync(file.filepath);
        const base64Image = imageData.toString("base64");

        const prompt = "You are an expert item evaluator, you work for people who buy and sell on eBay. " +
          "You specialise in analysing bulk lots of items. Identify each item including its title, " +
          "format/type/category (e.g. DVD, Wii, VHS, comic), and release year. Return results as JSON " +
          "with entries like: {\"name\": \"Mario Kart 8 (2009) WiiU\"}";

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: "data:image/jpeg;base64," + base64Image } }
            ]
          }],
          max_tokens: 800
        });

        const raw = response.choices[0].message.content.trim();
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(cleaned);
        results.push(...parsed);
      }

      res.status(200).json(results);
    } catch (e) {
      console.error("Error in analyse-image:", e);
      res.status(500).json({ error: "Failed to analyse images." });
    }
