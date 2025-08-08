// app/api/analyse-image/route.ts
import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ImgUrlPart = { type: 'image_url'; image_url: { url: string } };
type TextPart = { type: 'text'; text: string };
type AnyPart = any;

function toDataUrl(file: File): Promise<string> {
  return file.arrayBuffer().then(buf => {
    const b64 = Buffer.from(buf).toString('base64');
    const mime = (file as File).type || 'image/png';
    return `data:${mime};base64,${b64}`;
  });
}

// Normalize any weird parts into Chat Completions-compatible ones
function normalizeParts(parts: AnyPart[]): (TextPart | ImgUrlPart)[] {
  const out: (TextPart | ImgUrlPart)[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (p.type === 'text' && typeof p.text === 'string') {
      out.push({ type: 'text', text: p.text });
      continue;
    }
    // Accept a few variants and coerce to image_url
    if (p.type === 'image_url' && p.image_url?.url) {
      out.push({ type: 'image_url', image_url: { url: String(p.image_url.url) } });
      continue;
    }
    if (p.type === 'input_image' && (p.image_url?.url || p.url || p.data_url)) {
      const url = p.image_url?.url || p.url || p.data_url;
      out.push({ type: 'image_url', image_url: { url: String(url) } });
      continue;
    }
    if (p.type === 'image' && p.url) {
      out.push({ type: 'image_url', image_url: { url: String(p.url) } });
      continue;
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || '';
    let parts: (TextPart | ImgUrlPart)[] = [];

    const basePrompt = [
      'You are an expert item evaluator for people buying and selling on eBay.',
      'Identify each distinct item and return structured JSON.',
      '',
      'For EVERY item return:',
      '- title (include release year in parentheses if obvious)',
      '- platform (Wii, PS3, DVD, VHS, etc.) or null',
      "- category in {'game','dvd','vhs','book','comic','toy','diecast','other'}",
      '- year (number|null)',
      '- gpt_value_aud (integer AUD; realistic and NOT identical across items)',
      '- search (concise query)',
      '',
      'Brand-specific rules:',
      '- LEGO: brand="LEGO", theme, set_number (3–6 digits), official_name, pieces, condition, quantity.',
      '  * If set_number is visible, search MUST be "LEGO {set_number} {official_name}".',
      '- Video games: include platform + region (PAL/NTSC) + edition (CIB/loose) + year.',
      '- Consoles/handhelds: include model code (e.g., HAC-001(-01)), storage, revision.',
      '- Funko: include Pop # and any sticker/exclusive.',
      '',
      'Return ONLY valid JSON with keys: lot_summary (string), items (array).',
      'Use integer dollars for gpt_value_aud (no cents).'
    ].join('\n');

    // Accept multipart/form-data OR JSON with a "messages" or "parts" array
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const files = [
        ...form.getAll('images'),
        ...form.getAll('image'),
        ...form.getAll('files'),
        ...form.getAll('file')
      ].filter(Boolean) as File[];

      if (!files.length) {
        return NextResponse.json({ error: 'No images uploaded' }, { status: 400 });
      }

      parts.push({ type: 'text', text: basePrompt });
      for (const f of files) {
        const url = await toDataUrl(f);
        parts.push({ type: 'image_url', image_url: { url } });
      }
    } else {
      const body = await req.json().catch(() => ({} as any));
      const candidate: any[] =
        (Array.isArray(body?.messages?.[1]?.content) ? body.messages[1].content :
         Array.isArray(body?.parts) ? body.parts :
         Array.isArray(body?.content) ? body.content : []);

      // Always prepend our text prompt
      const normalized = normalizeParts(candidate);
      parts = [{ type: 'text', text: basePrompt }, ...normalized];
    }

    // Debug what we're sending
    try {
      console.log('🧠 parts.types =', parts.map(p => (p as any).type));
    } catch {}

    const system = 'Be precise and consistent. Prefer exact identifiers (LEGO set number, console model code). Provide varied but realistic gpt_value_aud.';

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: parts as any }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let json: any;
    try { json = JSON.parse(raw); } catch { json = { lot_summary: '', items: [] }; }
    if (!json || !Array.isArray(json.items)) json = { lot_summary: json?.lot_summary || '', items: [] };

    (json.items || []).forEach((it: any, i: number) => {
      const sterm = it.search || it.title;
      console.log(`🧠 item#${i+1}: ${sterm} | gpt=${it.gpt_value_aud ?? '—'}`);
    });

    return NextResponse.json(json);
  } catch (err: any) {
    console.error('⚠️ analyse-image error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
