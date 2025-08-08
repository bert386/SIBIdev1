import OpenAI from 'openai';
export const OPENAI_MODEL = process.env.SIBI_VISION_MODEL || 'gpt-4o';
let _client: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  _client = new OpenAI({ apiKey });
  return _client;
}
