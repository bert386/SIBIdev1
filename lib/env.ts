export function getScraperKey(): { value: string, source: string } {
  const candidates = ['SCRAPER_API_KEY', 'SCRAPER_KEY', 'SCRAPERAPI_KEY'];
  for (const k of candidates) {
    const v = process.env[k];
    if (v && v.trim()) return { value: v, source: k };
  }
  throw new Error('SCRAPER_API_KEY is not set');
}
export function hasEnv(name: string) {
  const v = process.env[name];
  return !!(v && v.trim());
}
