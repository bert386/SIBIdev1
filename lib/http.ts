export async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function sleep(ms: number) {
  await new Promise(r => setTimeout(r, ms));
}


export async function fetchWithRetry(url: string, opts: RequestInit = {}, timeoutMs = 20000, retries = 1, backoffMs = 700): Promise<Response> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const res = await fetchWithTimeout(url, opts, timeoutMs);
      return res;
    } catch (e: any) {
      const msg = (e?.name || '') + ':' + (e?.message || '');
      const isAbort = /AbortError/i.test(msg) || /aborted/i.test(msg);
      if (attempt > retries || !isAbort) throw e;
      await sleep(backoffMs * attempt);
    }
  }
}
