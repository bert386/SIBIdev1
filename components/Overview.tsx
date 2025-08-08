import type { VisionItem, EbayResult } from '@/lib/types';

export default function Overview({ items, ebay, status }: { items: VisionItem[]; ebay: EbayResult[]; status: 'idle'|'analysing'|'fetching'|'done'; }) {
  const allDone = status==='done' && ebay.length===items.length && items.length>0;
  const totalGpt = items.reduce((s, it)=> s + (Number(it.gpt_value_aud)||0), 0);
  const totalEbay = allDone ? ebay.reduce((s, r)=> s + (Number(r.avg_sold_aud)||0), 0) : null;
  const avgItem = (allDone && items.length) ? (totalEbay! / items.length) : null;

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8, marginBottom:12}}>
      <Stat label="Total Items" value={String(items.length||'—')} />
      <Stat label="Total GPT Value" value={aud(totalGpt)} />
      <Stat label="Total eBay Value" value={totalEbay==null ? '—' : aud(totalEbay)} />
      <Stat label="Avg Item Value" value={avgItem==null ? '—' : aud(avgItem)} />
      {status==='fetching' && <div style={{gridColumn:'1 / -1',opacity:.7}}>Fetching eBay ({Math.min(ebay.length, items.length)}/{items.length})</div>}
    </div>
  );
}
function Stat({label, value}:{label:string; value:string}){
  return <div style={{border:'1px solid #eee',borderRadius:8,padding:10}}><div style={{opacity:.7,fontSize:12}}>{label}</div><div style={{fontWeight:700, fontSize:18}}>{value}</div></div>;
}
function aud(n:number){ return n.toLocaleString('en-AU',{ style:'currency', currency:'AUD', maximumFractionDigits:0}); }
