import { NextResponse } from 'next/server';
import { getOpenAI, OPENAI_MODEL } from '@/lib/openai';
import type { VisionResult, VisionItem } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function systemPrompt(){
  return `You are an expert item evaluator for eBay bulk lots (AU market).
Return STRICT JSON only with:
{
  "lot_summary": "short sentence",
  "items": [
    {
      "title": "...",                 // exact item name
      "platform": "Wii/DVD/PS3/etc",  // or null
      "category": "dvd|vhs|game|toy|lego|book|electronics|other",
      "year": 2008,                   // or null
      "gpt_value_aud": 12,            // integer AUD (no cents)
      "search": "Title (Year) Platform",

      "brand": "LEGO",
      "theme": "Botanical",
      "set_number": "10281",
      "official_name": "Bonsai Tree",
      "pieces": 878,
      "condition": "sealed|new|used",
      "quantity": 1
    }
  ]
}
Rules:
- Create DISTINCT, realistic gpt_value_aud per item (do NOT reuse the same value).
- Prefer exact identification: for LEGO include set_number + official_name; for video games include platform and year; for DVDs include series/season.
- Build the search string to be highly discriminative. Use: LEGO {set_number} {official_name} when available.`;
}

export async function POST(req: Request){
  try{
    const form = await req.formData();
    const files = form.getAll('images');
    if (!files || files.length===0) return NextResponse.json({ error:'No images uploaded' }, { status: 400 });

    const parts: any[] = [{ type:'text', text: systemPrompt() }];
    for (const f of files){
      if (!(f instanceof File)) continue;
      const b = Buffer.from(await (f as File).arrayBuffer()).toString('base64');
      parts.push({ type:'input_image', image_url: { url: `data:${(f as File).type};base64,${b}` } });
    }

    const completion = await getOpenAI().chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON.' },
        { role: 'user', content: parts }
      ],
      temperature: 0.4,
    });
    const raw = completion.choices?.[0]?.message?.content || '{}';
    const json = JSON.parse(raw) as VisionResult;

    json.items = (json.items||[]).map((it:any)=>({
      title: it.title,
      platform: it.platform ?? null,
      category: it.category ?? null,
      year: (typeof it.year==='number') ? it.year : null,
      gpt_value_aud: (typeof it.gpt_value_aud==='number') ? Math.round(it.gpt_value_aud) : null,
      search: it.search || null,
      brand: it.brand || null,
      theme: it.theme || null,
      set_number: it.set_number || null,
      official_name: it.official_name || null,
      pieces: (typeof it.pieces==='number') ? it.pieces : null,
      condition: it.condition || null,
      quantity: (typeof it.quantity==='number') ? it.quantity : 1,
    }));

    // simple enrichment if all GPT values equal
    const values = json.items.map(i=>i.gpt_value_aud).filter(v=>typeof v==='number') as number[];
    const uniqueVals = new Set(values);
    if (uniqueVals.size<=1 && json.items.length > 1){
      const enrich = await getOpenAI().chat.completions.create({
        model: OPENAI_MODEL,
        response_format: { type:'json_object' },
        messages: [
          { role:'system', content: 'Adjust gpt_value_aud so each item has a distinct realistic integer AUD price. Keep same array length and order.' },
          { role:'user', content: JSON.stringify({ items: json.items }) }
        ],
        temperature: 0.4,
      });
      const raw2 = enrich.choices?.[0]?.message?.content || '{}';
      const fixed = JSON.parse(raw2) as { items:any[] };
      if (Array.isArray(fixed.items) && fixed.items.length===json.items.length){
        json.items = json.items.map((it,idx)=>({
          ...it,
          gpt_value_aud: (typeof fixed.items[idx]?.gpt_value_aud==='number') ? Math.round(fixed.items[idx].gpt_value_aud) : it.gpt_value_aud,
          search: fixed.items[idx]?.search || it.search
        }));
      }
    }

    console.log('✅ Items identified:', json.items?.length || 0);
    return NextResponse.json(json);
  }catch(e:any){
    console.error(e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
