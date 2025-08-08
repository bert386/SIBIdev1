import { NextResponse } from 'next/server';
import { getOpenAI, OPENAI_MODEL } from '@/lib/openai';
import type { VisionResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const data = await req.formData();
  const files = data.getAll('files') as File[];

  const system = `You are an expert item evaluator for AU eBay bulk lots.
Return ONLY JSON: {"lot_summary": string, "items":[{title, platform, category, year, gpt_value_aud, search, brand, theme, set_number, official_name, pieces, condition, quantity}...]}

Rules:
- Identify distinct items. Title should be precise, include series/season if present.
- Provide integer AUD values for gpt_value_aud; DO NOT make every item the same price; consider box set vs single, season number, demand.
- Build a concise search string. For LEGO, prefer: "LEGO {set_number} {official_name}".
- Add brand-specific fields when visible:
  * LEGO: brand="LEGO", theme, set_number (3-6 digits), official_name, pieces, condition, quantity.
- If year is visible on the box/media, include it; else null.`;

  const messages: any[] = [{ role: 'system', content: system }];
  for (const f of files) {
    const b = await f.arrayBuffer();
    messages.push({ role: 'user', content: [{ type: 'text', text: 'Identify all items in these photos.' }, { type: 'image_url', image_url: { url: `data:${f.type};base64,${Buffer.from(b).toString('base64')}` } }] });
  }

  const completion = await getOpenAI().chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' as const },
    messages,
    temperature: 0.35,
  });

  const content = completion.choices?.[0]?.message?.content || '{}';
  const json = JSON.parse(content) as VisionResult;

  // Enrichment pass for LEGO when set_number missing or names generic
  try {
    const need = (json.items || []).some(it => (it.brand?.toLowerCase()==='lego') && !it.set_number);
    if (need) {
      const payload = { items: json.items.map(it => ({ title: it.title, brand: it.brand||null, theme: it.theme||null, official_name: it.official_name||null })) };
      const sys2 = `You improve LEGO metadata. Return ONLY JSON {"items":[{set_number, official_name, search}]}. Use text you can read from boxes to recover set_number and official_name.`;
      const completion2 = await getOpenAI().chat.completions.create({
        model: OPENAI_MODEL, response_format: { type: 'json_object' as const },
        messages: [{ role:'system', content: sys2 }, { role:'user', content: JSON.stringify(payload) }], temperature: 0.2,
      });
      const json2 = JSON.parse(completion2.choices?.[0]?.message?.content || '{}');
      if (Array.isArray(json2.items)) {
        json.items = json.items.map((it, i) => ({
          ...it,
          set_number: json2.items[i]?.set_number ?? it.set_number ?? null,
          official_name: json2.items[i]?.official_name ?? it.official_name ?? null,
          search: json2.items[i]?.search || it.search || it.title
        }));
      }
    }
  } catch {}

  return NextResponse.json(json);
}
