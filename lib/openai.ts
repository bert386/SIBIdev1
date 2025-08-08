import OpenAI from 'openai';

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/**
 * Lazily create an OpenAI client at runtime only.
 * Avoids throwing during Next.js build when env vars aren't available.
 */
export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey: key });
}
