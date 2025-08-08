import type { VisionResult, EbayResult } from '@/lib/types';

export default function Overview({ vision, ebay }: { vision?: VisionResult, ebay?: EbayResult[] }) {
  const totalItems = vision?.items?.length || 0;
  const totalGpt = vision?.items?.reduce((s,i)=> s + (i.gpt_value_aud || 0), 0) || 0;
  const totalEbay = (ebay||[]).reduce((s,i)=> s + (i.avg_sold_aud || 0), 0);
  const avgItem = totalItems ? (totalEbay/totalItems) : 0;

  return (
    <div className="card">
      <div className="section-title">Lot Overview</div>
      {totalItems === 0 ? <div>No data yet.</div> : (
        <div className="kv">
          <div>Total Items:</div><div>{totalItems}</div>
          <div>Total GPT Value:</div><div>${totalGpt.toFixed(2)} AUD</div>
          <div>Total eBay Value:</div><div>${totalEbay.toFixed(2)} AUD</div>
          <div>Avg Item Value:</div><div>${avgItem.toFixed(2)} AUD</div>
          <div>Lot Description:</div><div>{vision?.lot_summary || '—'}</div>
        </div>
      )}
    </div>
  );
}
