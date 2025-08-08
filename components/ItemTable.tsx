'use client';
import PricesModal from './PricesModal';
import type { VisionResult, EbayResult } from '@/lib/types';

export default function ItemTable({ vision, ebay }: { vision?: VisionResult, ebay?: EbayResult[] }) {
  const vItems = vision?.items || [];
  const map = new Map<string, EbayResult>();
  (ebay||[]).forEach(e => map.set(e.title, e));

  if (!vItems.length) return <div className="card"><div className="section-title">Item List</div><div>No data yet.</div></div>;

  return (
    <div className="card">
      <div className="section-title">Item List</div>
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Year</th>
            <th>Platform</th>
            <th>Cat</th>
            <th>Avail</th>
            <th>Sold</th>
            <th>$GPT</th>
            <th>$eBay</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {vItems.map((it, idx)=>{
            const e = map.get(it.search || it.title);
            const modalId = `m_${idx}`;
            return (
              <tr key={idx}>
                <td>{it.title}</td>
                <td>{it.year ?? '—'}</td>
                <td>{it.platform ?? '—'}</td>
                <td>{it.category}</td>
                <td>{e?.available_now ?? '—'}</td>
                <td>{e?.sold_90d ?? '—'}</td>
                <td>{it.gpt_value_aud ?? '—'}</td>
                <td>{e?.status === 'NRS' ? 'NRS' : (e?.avg_sold_aud ?? '—')}</td>
                <td>
                  {e?.sold_prices_aud?.length ? (
                    <>
                      <button className="btn secondary" onClick={()=> (window as any)[`open_${modalId}`]()}>eBay last solds</button>
                      <PricesModal id={modalId} title={it.title} prices={e.sold_prices_aud} links={e.sold_links} />
                    </>
                  ) : (e?.sold_search_link ? <a className="btn secondary" href={e.sold_search_link} target="_blank">View</a> : null)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
