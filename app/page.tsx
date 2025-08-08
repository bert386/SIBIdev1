'use client';
import { useRef, useState } from 'react';
import UploadPanel from '@/components/UploadPanel';
import Overview from '@/components/Overview';
import TopThree from '@/components/TopThree';
import ItemTable from '@/components/ItemTable';
import type { VisionItem, VisionResult, EbayResult } from '@/lib/types';

type FetchStatus = 'idle'|'analysing'|'fetching'|'done';

export default function Page(){
  const [items, setItems] = useState<VisionItem[]>([]);
  const [ebay, setEbay] = useState<EbayResult[]>([]);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const lotIdRef = useRef(0);

  const onVision = (v: VisionResult) => {
    lotIdRef.current += 1;
    setItems(v.items || []);
    setEbay([]);
    setStatus('idle');
  };
  const onFetchStart = () => setStatus('fetching');
  const onEbay = (r: EbayResult[]) => { setEbay(r); setStatus('done'); };

  return (
    <main>
      <UploadPanel onVision={onVision} onEbay={onEbay} onFetchStart={onFetchStart}/>
      <Overview items={items} ebay={ebay} status={status}/>
      <TopThree items={items} ebay={ebay} status={status}/>
      <ItemTable items={items} ebay={ebay} status={status}/>
    </main>
  );
}
