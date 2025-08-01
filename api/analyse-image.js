
const formidable = require("formidable");
const fs = require("fs");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

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
          "with entries like: {\"name\": \"Mario Kart 8 (2009) Wii\"}";

        const response = await openai.createChatCompletion({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: "data:image/jpeg;base64," + base64Image }
                }
              ]
            }
          ],
          max_tokens: 800,
        });

        const text = response.data.choices[0].message.content;
        const parsed = JSON.parse(text);
        results.push(...parsed);
      }

      res.status(200).json(results);
    } catch (e) {
      console.error("Error in analyse-image:", e);
      res.status(500).json({ error: "Failed to analyse images." });
    }
  });
};
