import { useEffect, useState } from 'react';
import { API_URL } from './api';

/** Sunucu paket satabiliyor mu: demo (geliştirme) ya da Google Play bağlı. Giriş gerektirmez; uygulama boyunca bir kez sorulur. */
export type Billing = { demo: boolean; billing: boolean };
let cached: Promise<Billing> | null = null;
const load = () => (cached ??= fetch(API_URL + '/health').then(r => r.json()).then(h => ({ demo: !!h.demo, billing: !!h.billing })).catch(() => { cached = null; return { demo: false, billing: false }; }));

/** null: henüz bilinmiyor */
export function useBilling(): Billing | null {
  const [b, setB] = useState<Billing | null>(null);
  useEffect(() => { let on = true; load().then(x => on && setB(x)); return () => { on = false; }; }, []);
  return b;
}
