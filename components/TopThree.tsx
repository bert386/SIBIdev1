import type { VisionItem, EbayResult } from '@/lib/types';

export default function TopThree({ items, ebay, status }: { items: VisionItem[]; ebay: EbayResult[]; status: 'idle'|'analysing'|'fetching'|'done'; }) {
  const done = status==='done' && ebay.length===items.length;
  const getScore = (i:number)=> done ? (ebay[i]?.avg_sold_aud ?? 0) : (items[i]?.gpt_value_aud ?? 0);
  const ranked = items.map((it,i)=>({i,score:getScore(i)})).sort((a,b)=>b.score-a.score).slice(0,3);

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8, marginBottom:12}}>
      {ranked.map(({i})=>{
        const e = ebay[i];
        return (
          <div key={i} style={{border:'1px solid #eee',borderRadius:8,padding:10}}>
            <div style={{fontWeight:600}}>{items[i].title}</div>
            <div style={{display:'flex',gap:8,marginTop:6,fontSize:12,opacity:.8}}>
              <Badge label="Avail" value={e?.available_now ?? (status==='fetching' ? '—' : '—')} />
              <Badge label="Sold" value={e?.sold_90d ?? (status==='fetching' ? '—' : '—')} />
              <Badge label="$GPT" value={items[i].gpt_value_aud ?? '—'} />
              <Badge label="$eBay" value={e ? (e.status==='NRS' ? 'NRS' : aud(e.avg_sold_aud||0)) : (status==='fetching' ? '—' : '—')} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Badge({label,value}:{label:string;value:any}){ return <span><b>{label}:</b> {String(value)}</span>; }
function aud(n:number){ return n.toLocaleString('en-AU',{ style:'currency', currency:'AUD', maximumFractionDigits:0}); }
