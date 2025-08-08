import type { VisionItem, EbayResult } from '@/lib/types';

export default function Overview({ items, ebay, status }:{ items:VisionItem[], ebay:EbayResult[], status:'idle'|'analysing'|'fetching'|'done' }){
  const allDone = status==='done' && ebay.length === items.length && items.length>0;
  const totalGpt = items.reduce((s,i)=> s + (Number(i.gpt_value_aud)||0), 0);
  const totalEbay = allDone ? ebay.reduce((s,e)=> s + (Number(e.avg_sold_aud)||0),0) : null;
  const avgItem = allDone && items.length ? (totalEbay!/items.length) : null;
  return (
    <div className="grid grid-cols-2 gap-3 my-3">
      <Stat label="Total Items" value={String(items.length||'—')}/>
      <Stat label="Total GPT Value" value={formatAud(totalGpt)}/>
      <Stat label="Total eBay Value" value={totalEbay==null ? '—' : formatAud(totalEbay)}/>
      <Stat label="Avg Item Value" value={avgItem==null ? '—' : formatAud(avgItem)}/>
      {status==='fetching' && <div className="col-span-2 text-xs opacity-70">Fetching eBay ({Math.min(ebay.length, items.length)}/{items.length})…</div>}
    </div>
  );
}
function Stat({label, value}:{label:string, value:string}){ return <div className="rounded-lg border bg-white/5 p-3"><div className="text-xs opacity-70">{label}</div><div className="text-lg">{value}</div></div>; }
function formatAud(n:number){ return n.toLocaleString('en-AU',{ style:'currency', currency:'AUD' }); }
