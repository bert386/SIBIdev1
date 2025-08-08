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
    } catch (e:any) {
      alert(e.message);
    } finally {
      setBusy(false); setProgress(100);
    }
  };

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
          <button className="btn secondary" onClick={()=>getEbay((window as any).__sibi_items || [])} disabled={busy}>Get eBay Data</button>
        </div>
        <div className="progress"><div style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  );
}
