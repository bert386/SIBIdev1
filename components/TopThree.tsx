import type { VisionItem, EbayResult } from '@/lib/types';

export default function TopThree({ items, ebay, status }:{ items:VisionItem[], ebay:EbayResult[], status:'idle'|'analysing'|'fetching'|'done' }){
  const done = status==='done' && ebay.length === items.length;
  const score = (i:number) => done ? (ebay[i]?.avg_sold_aud || 0) : (items[i]?.gpt_value_aud || 0);
  const ranked = items.map((_,i)=>({i, s: score(i)})).sort((a,b)=> b.s-a.s).slice(0,3);
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {ranked.map(({i})=>{
        const e = ebay[i];
        const ebayCell = e ? (e.status==='NRS' ? 'NRS' : formatAud(e.avg_sold_aud||0)) : (status==='fetching'?'—':'—');
        const avail = e?.available_now ?? (status==='fetching'?'—':'—');
        const sold  = e?.sold_90d      ?? (status==='fetching'?'—':'—');
        return (
          <div key={i} className="rounded-lg border bg-white/5 p-3">
            <div className="font-medium text-sm mb-1">{items[i].title}</div>
            <div className="flex gap-2 text-xs">
              <Badge label="Avail" value={String(avail)} />
              <Badge label="Sold" value={String(sold)} />
              <Badge label="$GPT" value={items[i].gpt_value_aud==null?'—':formatAud(items[i].gpt_value_aud)} />
              <Badge label="$eBay" value={ebayCell} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Badge({label, value}:{label:string, value:string}){ return <div className="px-2 py-1 rounded bg-black/30">{label}: {value}</div>; }
function formatAud(n:number){ return n.toLocaleString('en-AU',{ style:'currency', currency:'AUD' }); }
