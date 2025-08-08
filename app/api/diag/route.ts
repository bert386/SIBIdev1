import { NextResponse } from 'next/server';
import { hasEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const res = {
    openai_key: hasEnv('OPENAI_API_KEY'),
    scraper_api_key: hasEnv('SCRAPER_API_KEY') || hasEnv('SCRAPER_KEY') || hasEnv('SCRAPERAPI_KEY'),
    env: process.env.VERCEL_ENV || null,
    node: process.versions.node,
  };
  return NextResponse.json(res);
}
