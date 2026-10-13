export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

export class ApiError extends Error { constructor(public status: number, m: string) { super(m); } }

export async function api<T = any>(path: string, opts: { method?: string; token?: string | null; body?: unknown } = {}): Promise<T> {
  const res = await fetch(API + path, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Hata ${res.status}`);
  return data as T;
}

/** Yetkili video indirme: <video src> header gönderemediği için blob'a çevrilir (token URL'de taşınmaz). */
export async function fetchBlobUrl(path: string, token: string): Promise<string> {
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError(res.status, 'Video alınamadı');
  return URL.createObjectURL(await res.blob());
}

export const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* özel pencere */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* */ } },
};
export const fmtDate = (t?: number | null) => (t ? new Date(t).toLocaleString('tr-TR') : '—');
export const ago = (t?: number | null) => {
  if (!t) return 'hiç';
  const m = Math.floor((Date.now() - t) / 60000);
  return m < 1 ? 'az önce' : m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.floor(m / 60)} sa önce` : `${Math.floor(m / 1440)} gün önce`;
};
