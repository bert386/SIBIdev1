'use client';
import { useRef, useState } from 'react';
import type { VisionResult, VisionItem, EbayResult } from '@/lib/types';

type Props = { onVision: (v: VisionResult)=>void; onEbay: (r: EbayResult[])=>void; onFetchStart?: (total?: number)=>void; };

async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options as any);
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${(text||'').slice(0,160)}`);
  }
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status} ${res.statusText}`);
  return { data, res };
}
function chunk<T>(arr: T[], size: number){ const out:T[][]=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; }

export default function UploadPanel({ onVision, onEbay, onFetchStart }: Props){
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [identified, setIdentified] = useState<VisionItem[]>([]);
  const [note, setNote] = useState('');

  const onFiles = (files: FileList|null) => { if(!files) return; setImages(Array.from(files)); };

  async function analyse(){
    if (!images.length) return;
    const fd = new FormData();
    images.forEach(f => fd.append('images', f));
    setBusy(true); setNote('Analysing images…');
    try{
      const { data } = await fetchJSON('/api/analyse-image',{ method:'POST', body: fd as any });
      onVision(data as VisionResult);
      setIdentified((data as VisionResult).items || []);
      setNote(`Identified ${(data as VisionResult).items?.length || 0} items`);
    } catch(e:any){ setNote(`Error: ${e.message}`); console.error(e); }
    finally { setBusy(false); }
  }

  async function getEbayBatched(items: VisionItem[]){
    if (!items?.length) return;
    onFetchStart?.(items.length);
    const BATCH_SIZE = 1;
    setBusy(true); setNote('Fetching eBay (0/'+items.length+')…');
    try{
      const groups = chunk(items, BATCH_SIZE);
      const all: EbayResult[] = [];
      for (let i=0;i<groups.length;i++){
        setNote(`Fetching eBay (${i}/${groups.length})…`);
        const { data } = await fetchJSON('/api/fetch-ebay',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ items: groups[i] }) });
        all.push(...(data as EbayResult[]));
      }
      onEbay(all);
      setNote(`Fetched eBay data for ${all.length} items`);
    } catch(e:any){ setNote(`Error: ${e.message}`); console.error(e); }
    finally { setBusy(false); }
  }

  return (
    <div className="border rounded-xl p-3 bg-white/5">
      <div className="flex gap-2 items-center">
        <input ref={inputRef} type="file" multiple accept="image/*" onChange={e=>onFiles(e.target.files)} className="text-sm"/>
        <button className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50" disabled={busy || !images.length} onClick={analyse}>Analyse Image(s)</button>
        <button className="px-3 py-1 rounded bg-emerald-600 text-white text-sm disabled:opacity-50" disabled={busy || !identified.length} onClick={()=>getEbayBatched(identified)}>Get eBay Data</button>
      </div>
      {note && <div className="text-xs opacity-70 mt-1">{note}</div>}
    </div>
  );
}
