'use client';
import type { VisionResult, EbayResult } from '@/lib/types';

export default function TopThree({ vision, ebay }: { vision?: VisionResult, ebay?: EbayResult[] }) {
  const items = vision?.items || [];
  let combined = items.map(i => ({
    ...i,
    ebay: (ebay||[]).find(e => e.title === (i.search || i.title)),
  }));
  combined.sort((a:any,b:any) => {
    const av = a.ebay?.avg_sold_aud ?? a.gpt_value_aud ?? 0;
    const bv = b.ebay?.avg_sold_aud ?? b.gpt_value_aud ?? 0;
    return bv - av;
  });

  const top3 = combined.slice(0,3);

  return (
    <div className="card">
      <div className="section-title">Top 3 Items</div>
      {top3.length === 0 ? <div>No data yet.</div> : (
        <div style={{ display:'grid', gap:12 }}>
          {top3.map((it:any, idx:number) => (
            <div key={idx} className="panel" style={{background:'transparent'}}>
              <div style={{ fontWeight:800 }}>{it.title} {it.year ? `(${it.year})` : ''} {it.platform ? `• ${it.platform}` : ''}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
                <span className="badge">Avail: {it.ebay?.available_now ?? '—'}</span>
                <span className="badge">Sold: {it.ebay?.sold_90d ?? '—'}</span>
                <span className="badge">$GPT: {it.gpt_value_aud ?? '—'}</span>
                <span className="badge">$eBay: {it.ebay?.avg_sold_aud ?? 'NRS'}</span>
              </div>
              <div className="prices" style={{marginTop:6}}>
                {(it.ebay?.sold_prices_aud || []).map((p:number, i:number) => <span key={i}>${p}</span>)}
              </div>
              {it.ebay?.sold_search_link && <a className="btn secondary" style={{marginTop:8, display:'inline-block'}} href={it.ebay.sold_search_link} target="_blank">View Solds</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
