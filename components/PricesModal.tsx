'use client';
import { useRef, useEffect } from 'react';

export default function PricesModal({ id, title, prices, links, note }:{ id:string, title:string, prices:number[], links:string[], note?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    (window as any)[`open_${id}`] = () => ref.current?.showModal();
    (window as any)[`close_${id}`] = () => ref.current?.close();
  }, [id]);
  return (
    <dialog ref={ref}>
      <h3 style={{marginTop:0}}>{title} — Last {prices.length} (filtered) sold</h3>
      {note && <div style={{color:'var(--muted)'}}>{note}</div>}
      <ul>
        {prices.map((p,i)=>(
          <li key={i}><a href={links[i]} target="_blank">${p}</a></li>
        ))}
      </ul>
      <div style={{display:'flex', justifyContent:'flex-end'}}>
        <button className="btn" onClick={()=>ref.current?.close()}>Close</button>
      </div>
    </dialog>
  );
}
