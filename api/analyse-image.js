
import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const form = new formidable.IncomingForm({ keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parsing error:", err);
        return res.status(500).json({ error: "Form parsing failed" });
      }

      const image = files.images[0] || files.images;
      const imageData = fs.readFileSync(image.filepath);

      const gptResponse = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are helping identify items in a photo of a bulk lot for resale purposes. Return a JSON array of up to 12 items. Each object should include title, format (e.g., DVD, game, book), and year if visible. Be concise.`,
              },
              {
                type: "image_url",
                image_url: {
                  detail: "low",
                  image: `data:image/jpeg;base64,${imageData.toString("base64")}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const textResponse = gptResponse.choices[0].message.content;
      const jsonMatch = textResponse.match(/\[.*\]/s);
      const parsedItems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      res.status(200).json({ items: parsedItems });
    });
  } catch (error) {
    console.error("Image analysis failed:", error);
    res.status(500).json({ error: "Image analysis failed" });
  }
}
