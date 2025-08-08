export async function fetchWithTimeout(url: string, init: RequestInit={}, timeoutMs=20000): Promise<Response>{
  const controller = new AbortController();
  const t = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally { clearTimeout(t); }
}
export async function sleep(ms: number){ await new Promise(r=>setTimeout(r, ms)); }
export async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number, retries=1): Promise<Response>{
  try{
    return await fetchWithTimeout(url, init, timeoutMs);
  } catch(err){
    if (retries<=0) throw err;
    await sleep(500);
    return await fetchWithRetry(url, init, timeoutMs, retries-1);
  }
}
