'use client';
import { useRef, useState } from 'react';
import type { VisionResult, VisionItem, EbayResult } from '@/lib/types';

type Props = {
  onVision: (v: VisionResult) => void;
  onEbay: (r: EbayResult[]) => void;
};

export default function UploadPanel({ onVision, onEbay }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [identified, setIdentified] = useState<any[]>([]);
  const [note, setNote] = useState('');
async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options as any);
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${(text || '').slice(0,200)}`);
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return { data, res };
}

  const [progress, setProgress] = useState(0);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setImages(Array.from(files));
  };

  const analyse = async () => {
    if (images.length === 0) return;
    setBusy(true); setProgress(0);
    try {
      const fd = new FormData();
      images.forEach(f => fd.append('images', f));
      const res = await fetch('/api/analyse-image', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Analyse failed');
      onVision(json as VisionResult);
      setIdentified((json as VisionResult).items || []);
      setNote(`Identified ${(json as VisionResult).items?.length || 0} items`);
    } catch (e:any) {
      setNote(`Error: ${e.message}`); console.error(e);
    } finally {
      setBusy(false); setProgress(100);
    }
  };

  // legacy single-call kept for reference
  const getEbay = async (items: VisionItem[]) => {
    setBusy(true); setProgress(0);
    try {
      // simple fake progress
      const id = setInterval(() => setProgress(p => Math.min(95, p + 5)), 400);
      const res = await fetch('/api/fetch-ebay', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      clearInterval(id);
      if (!res.ok) throw new Error(json?.error || 'Fetch eBay failed');
      onEbay(json as EbayResult[]);
      setNote(`Fetched eBay data for ${(json as EbayResult[]).length} items`);
      setProgress(100);
    } catch (e:any) {
      setNote(`Error: ${e.message}`); console.error(e);
    } finally {
      setBusy(false);
    }
  };

const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const getEbayBatched = async (items: VisionItem[]) => {
  const BATCH_SIZE = 1; // keep requests <60s
  if (!items?.length) return;
  setBusy(true); setProgress(0); setNote('');
  try {
    const groups = chunk(items, BATCH_SIZE);
    const all: EbayResult[] = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      setNote(`Fetching eBay (${i+1}/${groups.length})...`);
      // simple staged progress per batch
      setProgress(Math.round(((i) / groups.length) * 95));
      const res = await fetch('/api/fetch-ebay', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ items: group }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Fetch eBay failed');
      all.push(...json as EbayResult[]);
    }
    onEbay(all);
    (window as any).__sibi_ebay = all;
    setNote(`Fetched eBay data for ${all.length} items`);
    setProgress(100);
  } catch (e:any) {
    alert(e.message);
  } finally {
    setBusy(false);
  }
};

  return (
    <div className="panel">
      <div className="row">
        <input ref={inputRef} type="file" multiple accept="image/*" onChange={(e)=>handleFiles(e.target.files)} />
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <button className="btn" onClick={analyse} disabled={busy || images.length===0}>Analyse Image</button>
          <button className="btn secondary" onClick={()=>getEbayBatched(identified)} disabled={busy || identified.length===0}>Get eBay Data</button>
        </div>
        <div className="progress"><div style={{ width: `${progress}%` }} /></div>
      
        {note && <div style={{color:'var(--muted)'}}>{note}</div>}
      </div>
    </div>
  );
}
