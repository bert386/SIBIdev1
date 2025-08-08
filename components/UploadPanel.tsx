'use client';
import { useState } from 'react';
import type { VisionResult, EbayResult, VisionItem } from '@/lib/types';

export default function UploadPanel({ onVision, onEbay, onFetchStart }: { onVision: (v: VisionResult)=>void; onEbay: (r: EbayResult[])=>void; onFetchStart?: (total?: number)=>void; }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [items, setItems] = useState<VisionItem[]>([]);

  async function analyse(files: File[]) {
    setBusy(true); setNote('Analysing images…');
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      const res = await fetch('/api/analyse-image', { method:'POST', body: fd });
      const json = await res.json();
      setItems(json.items || []);
      onVision(json as VisionResult);
      setNote(`Identified ${(json.items||[]).length} items`);
    } catch (e:any) {
      setNote(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const chunk = <T,>(arr:T[], size:number)=> Array.from({length: Math.ceil(arr.length/size)}, (_,i)=> arr.slice(i*size, i*size+size));

  async function getEbayBatched() {
    if (!items.length) return;
    onFetchStart?.(items.length);
    setBusy(true);
    try {
      const groups = chunk(items, 1); // client batch size
      let all: EbayResult[] = [];
      for (let i=0; i<groups.length; i++) {
        setNote(`Fetching eBay (${i+1}/${groups.length})…`);
        const res = await fetch('/api/fetch-ebay', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ items: groups[i] }) });
        const data = await res.json();
        all = all.concat(data as EbayResult[]);
      }
      onEbay(all);
      setNote(`Fetched eBay data for ${all.length} items`);
    } catch (e:any) {
      setNote(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{marginBottom:16, padding:12, border:'1px solid #eee', borderRadius:8}}>
      <input type="file" multiple onChange={e=> analyse(Array.from(e.target.files||[]))} />
      <button onClick={getEbayBatched} disabled={busy || items.length===0} style={{marginLeft:8}}>Get eBay Data</button>
      <div style={{opacity:.7, marginTop:6}}>{note}</div>
    </div>
  );
}
