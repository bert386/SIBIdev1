export async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
