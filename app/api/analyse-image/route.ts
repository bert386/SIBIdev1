import { getOpenAI, OPENAI_MODEL } from '@/lib/openai';
import { NextResponse } from 'next/server';
import type { VisionResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll('images');
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No images uploaded' }, { status: 400 });
    }

    // Build image parts for chat
    const parts: any[] = [
      { type: 'text', text: 'Analyze these images and return strict JSON.' }
    ];

    for (const f of files) {
      if (!(f instanceof File)) continue;
      const arrayBuffer = await f.arrayBuffer();
      const b64 = Buffer.from(arrayBuffer).toString('base64');
      const mime = f.type || 'image/png';
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${b64}` }
      });
    }

    const system = `You are an expert item evaluator for eBay bulk lots.
Assign **realistic and varied** values — do NOT give the same value to multiple items; consider title, platform, series/season numbers, box set vs single, disc count hints, and relative demand.
Identify each distinct item with keys:
- title (string)
- platform (string|null)
- category: one of [game,dvd,vhs,book,comic,toy,diecast,other]
- year (number|null)
- gpt_value_aud (number|null) — your estimated value in AUD
- search (string) — a concise query INCLUDING title, year, and platform when available, e.g. "Rayman Raving Rabbids (2006) Wii game".
Also return lot_summary (1-2 sentences).
Provide realistic, non-identical 'gpt_value_aud' per item (do not reuse the same value).
Return ONLY valid JSON with keys: lot_summary, items (array of the above). Use integer dollars for gpt_value_aud (no cents).`;

    console.log('🧠 Calling OpenAI for vision...');
    const completion = await getOpenAI().chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: parts as any }
      ],
      temperature: 0.4,
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    console.log('🧠 Raw OpenAI result:', raw.slice(0, 500));
    const json = JSON.parse(raw) as VisionResult;
    console.log('✅ Items identified:', json.items?.length || 0);
    json.items?.forEach((it, i)=> console.log(`🧠 item#${i+1}:`, it.search || it.title));
    json.items = json.items?.map(it => ({
      ...it,
      platform: it.platform ?? null,
      year: it.year ?? null,
      gpt_value_aud: it.gpt_value_aud ?? null,
    })) || [];

    
    // Optional fallback: if all GPT values identical, and SIBI_JITTER_GPT_VALUES==='true', apply tiny offsets for UX clarity.
    try {
      const jitterEnabled = process.env.SIBI_JITTER_GPT_VALUES === 'true';
      const vals = (json.items || []).map(i => i.gpt_value_aud).filter(v => typeof v === 'number') as number[];
      const unique = new Set(vals);
      if (jitterEnabled && vals.length > 1 && unique.size <= 1) {
        json.items = json.items.map((it, idx) => {
          if (typeof it.gpt_value_aud === 'number') {
            const deltaPattern = [-2, -1, 0, 1, 2, -1, 1, -2, 2, 0];
            const delta = deltaPattern[idx % deltaPattern.length];
            it.gpt_value_aud = Math.max(1, it.gpt_value_aud + delta);
          }
          return it;
        });
        console.log('🧠 Applied jitter fallback to GPT values (env:SIBI_JITTER_GPT_VALUES=true)');
      }
    } catch {}
    // Log each item clearly
    (json.items || []).forEach((it, i) => console.log(`🧠 item#${i+1}:`, { search: it.search || it.title, gpt_value_aud: it.gpt_value_aud }));
    
    return NextResponse.json(json);
  } catch (err: any) {
    console.error('⚠️ analyse-image error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
