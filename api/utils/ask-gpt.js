
import OpenAI from 'openai';
const openai = new OpenAI();

export async function askGPT(imageBuffer) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identify each item with title, format (game, DVD, toy), and platform if applicable.' },
          { type: 'image_url', image_url: { image: imageBuffer.toString('base64') } }
        ]
      }
    ]
  });

  const text = response.choices[0].message.content;
  return JSON.parse(text);
}
