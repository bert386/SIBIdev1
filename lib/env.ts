export function getScraperKey(): { value: string, source: string } {
  const names = ['SCRAPER_API_KEY','SCRAPER_KEY','SCRAPERAPI_KEY'];
  for (const n of names){
    const v = process.env[n];
    if (v && v.trim().length) return { value: v, source: n };
  }
  throw new Error('SCRAPER_API_KEY is not set');
}
export function hasEnv(name: string): boolean {
  const v = process.env[name];
  return !!(v && v.trim().length);
}
