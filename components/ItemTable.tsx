import type { VisionItem, EbayResult } from '@/lib/types';

export default function ItemTable({ items, ebay, status }: { items: VisionItem[]; ebay: EbayResult[]; status: 'idle'|'analysing'|'fetching'|'done'; }) {
  return (
    <table style={{width:'100%', borderCollapse:'collapse'}}>
      <thead><tr>
        <th style={th}>Item</th><th style={th}>Year</th><th style={th}>Platform</th><th style={th}>Category</th>
        <th style={th}>Avail</th><th style={th}>Sold</th><th style={th}>$GPT</th><th style={th}>$eBay</th>
      </tr></thead>
      <tbody>
        {items.map((it,i)=>{
          const e = ebay[i];
          return (
            <tr key={i}>
              <td style={td}>{it.title}</td>
              <td style={td}>{it.year ?? '—'}</td>
              <td style={td}>{it.platform ?? '—'}</td>
              <td style={td}>{it.category ?? '—'}</td>
              <td style={td}>{e?.available_now ?? (status==='fetching' ? '—' : '—')}</td>
              <td style={td}>{e?.sold_90d ?? (status==='fetching' ? '—' : '—')}</td>
              <td style={td}>{it.gpt_value_aud ?? '—'}</td>
              <td style={td}>{e ? (e.status==='NRS' ? 'NRS' : aud(e.avg_sold_aud||0)) : (status==='fetching' ? '—' : '—')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
const th: React.CSSProperties = { textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #eee' };
const td: React.CSSProperties = { padding:'6px 8px', borderBottom:'1px solid #f2f2f2' };
function aud(n:number){ return n.toLocaleString('en-AU',{ style:'currency', currency:'AUD', maximumFractionDigits:0}); }
