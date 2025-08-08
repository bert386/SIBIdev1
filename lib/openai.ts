import OpenAI from 'openai';
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey: key });
}
