import { NextResponse } from 'next/server';
import { hasEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = {
      openai_key: hasEnv('OPENAI_API_KEY'),
      scraper_api_key: hasEnv('SCRAPER_API_KEY') || hasEnv('SCRAPER_KEY') || hasEnv('SCRAPERAPI_KEY'),
      scraper_base: process.env.SCRAPER_BASE || null,
      node: process.versions.node,
      env: process.env.VERCEL_ENV || null,
    };
    return NextResponse.json(res);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'error' }, { status: 500 });
  }
}
