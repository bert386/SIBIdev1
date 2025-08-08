import type { VisionResult, EbayResult } from '@/lib/types';

export default function Overview({ vision, ebay, status }: { vision?: VisionResult, ebay?: EbayResult[], status: 'idle'|'analysing'|'fetching'|'done' }) {
  const totalItems = vision?.items?.length || 0;
  const totalGpt = vision?.items?.reduce((s,i)=> s + (i.gpt_value_aud || 0), 0) || 0;
  const allDone = status === 'done' && !!vision?.items?.length && (ebay?.length === vision?.items?.length);
  const totalEbay = allDone ? (ebay||[]).reduce((s,i)=> s + (i.avg_sold_aud || 0), 0) : null;
  const avgItem = (allDone && totalItems) ? (Number(totalEbay)/totalItems) : null;

  return (
    <div className="card">
      <div className="section-title">Lot Overview</div>
      {totalItems === 0 ? <div>No data yet.</div> : (
        <div className="kv">
          <div>Total Items:</div><div>{totalItems}</div>
          <div>Total GPT Value:</div><div>${totalGpt.toFixed(2)} AUD</div>
          <div>Total eBay Value:</div><div>{totalEbay==null ? '—' : `$${Number(totalEbay).toFixed(2)} AUD`}</div>
          <div>Avg Item Value:</div><div>{avgItem==null ? '—' : `$${Number(avgItem).toFixed(2)} AUD`}</div>
          <div>Lot Description:</div><div>{vision?.lot_summary || '—'}</div>
        </div>
      )}
    </div>
  );
}
