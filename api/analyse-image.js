const formidable = require("formidable");
const fs = require("fs");
const { OpenAI } = require("openai");

const openai = new OpenAI();

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Formidable error:", err);
      return res.status(500).json({ error: "Form parsing failed" });
    }

    const imageFile = files.image?.[0] || files.image;

    if (!imageFile) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imageData = fs.readFileSync(imageFile.filepath);
    const base64Image = imageData.toString("base64");

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an assistant extracting item info from images."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify each item in the image. Return a JSON array with title, platform, year, category, and a search string combining them (e.g. 'Halo 3 Xbox 360 2007 Game')." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 1000
      });

      const raw = completion.choices?.[0]?.message?.content || "[]";
      console.log("🧠 Raw OpenAI response:", raw);

      const items = JSON.parse(raw);
      console.log("✅ Parsed items:", items);

      return res.status(200).json({ items });
    } catch (err) {
      console.error("❌ OpenAI or JSON parse error:", err);
      return res.status(500).json({ error: "AI analysis failed" });
    }
  });
};