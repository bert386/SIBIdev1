import type { VisionItem, EbayResult } from '@/lib/types';
export default function ItemTable({ items, ebay, status }:{ items:VisionItem[], ebay:EbayResult[], status:'idle'|'analysing'|'fetching'|'done' }){
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <thead className="text-left opacity-70"><tr><th className="py-1">Item</th><th>Year</th><th>Platform</th><th>Cat</th><th>Avail</th><th>Sold</th><th>$GPT</th><th>$eBay</th><th>Link</th></tr></thead>
        <tbody>
          {items.map((it,i)=>{
            const e = ebay[i];
            const ebayCell = e ? (e.status==='NRS' ? 'NRS' : formatAud(e.avg_sold_aud||0)) : (status==='fetching'?'—':'—');
            const avail = e?.available_now ?? (status==='fetching'?'—':'—');
            const sold  = e?.sold_90d      ?? (status==='fetching'?'—':'—');
            return (
              <tr key={i} className="border-t border-white/10">
                <td className="py-2">{it.title}</td>
                <td>{it.year ?? '—'}</td>
                <td>{it.platform ?? '—'}</td>
                <td>{it.category ?? '—'}</td>
                <td>{avail}</td>
                <td>{sold}</td>
                <td>{it.gpt_value_aud==null?'—':formatAud(it.gpt_value_aud)}</td>
                <td>{ebayCell}</td>
                <td>{e ? <a className="underline" href={e.sold_search_link} target="_blank" rel="noreferrer">View</a>: '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function formatAud(n:number){ return n.toLocaleString('en-AU',{ style:'currency', currency:'AUD' }); }
