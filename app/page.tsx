'use client';
import { useState } from 'react';
import UploadPanel from '@/components/UploadPanel';
import Overview from '@/components/Overview';
import TopThree from '@/components/TopThree';
import ItemTable from '@/components/ItemTable';
import type { VisionResult, EbayResult } from '@/lib/types';

export default function Page() {
  const [vision, setVision] = useState<VisionResult>();
  const [ebay, setEbay] = useState<EbayResult[]>();

  const onVision = (v: VisionResult) => {
    setVision(v);
    (window as any).__sibi_items = v.items;
  };
  const onEbay = (r: EbayResult[]) => setEbay(r);

  return (
    <div className="grid">
      <div style={{ gridColumn: '1 / -1' }}>
        <UploadPanel onVision={onVision} onEbay={onEbay} />
      </div>
      <Overview vision={vision} ebay={ebay} />
      <TopThree vision={vision} ebay={ebay} />
      <div style={{ gridColumn: '1 / -1' }}>
        <ItemTable vision={vision} ebay={ebay} />
      </div>
    </div>
  );
}
