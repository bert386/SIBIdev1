# SIBI (Should I Buy It)

Mobile-first Next.js app that:
- Analyzes 1–N uploaded images with OpenAI Vision
- Identifies items (title, platform, category, year, GPT-est value in AUD)
- Scrapes eBay.com.au last solds via your Scraper API for the last 10 most recent
- Computes averages, counts sold vs available, and shows direct sold links

## Quick Start

```bash
npm i
cp .env.example .env.local
# fill keys
npm run dev
```

Deploy on Vercel. Set env vars: `OPENAI_API_KEY`, `SCRAPER_API_KEY`, `OPENAI_MODEL` (default `gpt-4o`), optional `SCRAPER_BASE`.

## Logs
Vercel logs show steps with prefixes: 🧠 (OpenAI), 🕷️ (Scraper), 🔢 (calcs), ✅ (done), ⚠️ (errors).
