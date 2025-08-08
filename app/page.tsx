'use client';
import { useRef, useState } from 'react';
import UploadPanel from '@/components/UploadPanel';
import Overview from '@/components/Overview';
import TopThree from '@/components/TopThree';
import ItemTable from '@/components/ItemTable';
import type { VisionResult, EbayResult } from '@/lib/types';

export default function Page() {
  const [vision, setVision] = useState<VisionResult>();
  const [ebay, setEbay] = useState<EbayResult[]>();
  type FetchStatus = 'idle'|'analysing'|'fetching'|'done';
  const [status, setStatus] = useState<FetchStatus>('idle');
  const lotIdRef = useRef(0);

  const onVision = (v: VisionResult) => {
    lotIdRef.current += 1; // invalidate any in-flight ebay runs
    setVision(v);
    setEbay(undefined);
    setStatus('idle');
    (window as any).__sibi_items = v.items;
  };
  const onEbay = (r: EbayResult[]) => { setEbay(r); setStatus('done'); };

  return (
    <div className="grid">
      <div style={{ gridColumn: '1 / -1' }}>
        <UploadPanel onVision={onVision} onEbay={onEbay} onFetchStart={()=>setStatus('fetching')} />
      </div>
      <Overview vision={vision} ebay={ebay} status={status} />
      <TopThree vision={vision} ebay={ebay} status={status} />
      <div style={{ gridColumn: '1 / -1' }}>
        <ItemTable vision={vision} ebay={ebay} status={status} />
      </div>
    </div>
  );
}
