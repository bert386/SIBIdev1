export function getScraperKey(): { value: string, source: string } {
  const candidates = ['SCRAPER_API_KEY', 'SCRAPER_KEY', 'SCRAPERAPI_KEY'];
  for (const name of candidates) {
    const raw = process.env[name];
    if (raw && raw.trim().length) {
      return { value: raw, source: name };
    }
  }
  throw new Error('SCRAPER_API_KEY is not set');
}

export function hasEnv(name: string): boolean {
  const raw = process.env[name];
  return !!(raw && raw.trim().length);
}
