import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { API_URL } from './api';

/**
 * Sunucu paket satabiliyor mu: demo (geliştirme) ya da Google Play bağlı. Giriş gerektirmez.
 * Kural: BİLİNMİYORSA "açık" varsayılır (null); "yakında" yalnızca sunucu açıkça `billing:false` derse gösterilir.
 * Eski sürümde ilk istek bir kez takılırsa (soğuk sunucu, yavaş ağ) cevap "kapalı" sayılıp uygulama kapanana kadar saklanıyordu.
 */
export type Billing = { demo: boolean; billing: boolean };

const TTL = 60_000;          // başarılı cevap en çok 1 dakika geçerli (sunucu ayarı değişince uygulama kapatılmadan da güncellenir)
const TIMEOUT = 8_000;
let cache: { at: number; v: Billing } | null = null;

async function fetchBilling(): Promise<Billing | null> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = setTimeout(() => ctl?.abort(), TIMEOUT);
  try {
    const r = await fetch(API_URL + '/health', ctl ? { signal: ctl.signal } : undefined);
    const h = await r.json();
    const v = { demo: !!h.demo, billing: !!h.billing };
    cache = { at: Date.now(), v };
    return v;
  } catch { return null; }
  finally { clearTimeout(t); }
}
const load = (force = false): Promise<Billing | null> =>
  !force && cache && Date.now() - cache.at < TTL ? Promise.resolve(cache.v) : fetchBilling();

/** null: bilinmiyor (yükleniyor ya da ulaşılamadı). Ulaşılamazsa birkaç kez yeniden dener; uygulama öne gelince tazeler. */
export function useBilling(): Billing | null {
  const [b, setB] = useState<Billing | null>(cache?.v ?? null);
  useEffect(() => {
    let on = true, tries = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const run = (force = false) => load(force).then(x => {
      if (!on) return;
      if (x) setB(x);
      else if (tries++ < 5) timer = setTimeout(() => run(true), 4000);
    });
    run();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') run(true); });
    return () => { on = false; if (timer) clearTimeout(timer); sub.remove(); };
  }, []);
  return b;
}
