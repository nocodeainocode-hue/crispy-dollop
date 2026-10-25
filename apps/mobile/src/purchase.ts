import { Platform } from 'react-native';
import { ApiError } from './api';

/**
 * Google Play ile tek seferlik paket satın alma. Sunucu makbuzu Google'a doğrulatır ve ürünü tüketir
 * (apps/api/src/play.ts); istemci yalnızca satın almayı başlatır ve belgeyi (token) sunucuya iletir.
 * expo-iap yalnızca Android'de yüklenir: web ve geliştirme ortamı kütüphaneyi hiç görmez.
 */
const iap = () => require('expo-iap') as typeof import('expo-iap');
const sku = (days: number) => `pack_${days}`;
export const PACK_DAYS = [30, 60, 90];
/** Liste fiyatı (store/ODEME-REHBERI.md). Yalnızca mağaza fiyatı alınamayan ortamlarda (demo sunucu, web, Expo Go) gösterilir; gerçek Android'de Play'in yerel fiyatı geçerlidir. */
export const LIST_PRICES: Record<number, string> = { 30: '349 ₺', 60: '549 ₺', 90: '749 ₺' };

type Srv = {
  me: () => Promise<{ demoPurchases: boolean; playEnabled?: boolean; billingRef?: string }>;
  playPurchase: (productId: string, purchaseToken: string) => Promise<void>;
};

let connected: Promise<boolean> | null = null;
const connect = () => (connected ??= iap().initConnection().then(Boolean).catch(() => { connected = null; return false; }));

/** Mağazadaki yerel fiyatlar (örn. { 30: '₺149,00' }). Ulaşılamazsa boş döner; ekran fiyatsız çalışır. */
export type PackPrices = { prices: Record<number, string>; error?: string };
export async function packPrices(): Promise<PackPrices> {
  if (Platform.OS !== 'android') return { prices: {}, error: 'yalnızca Android' };
  if (!(await connect())) return { prices: {}, error: 'Play Store bağlantısı kurulamadı' };
  try {
    const list: any = await iap().fetchProducts({ skus: PACK_DAYS.map(sku), type: 'in-app' });
    const prices: Record<number, string> = {};
    for (const p of Array.isArray(list) ? list : []) { const d = PACK_DAYS.find(x => sku(x) === p.id); if (d && p.displayPrice) prices[d] = p.displayPrice; }
    return Object.keys(prices).length ? { prices } : { prices, error: 'Play ürünleri bulamadı (' + (Array.isArray(list) ? list.length : 0) + ' ürün döndü)' };
  } catch (e: any) { return { prices: {}, error: String(e?.message ?? e).slice(0, 120) }; }
}

class Cancelled extends Error {}
export const isCancelled = (e: unknown) => e instanceof Cancelled;

/** Play satın alma penceresini açar; bitince satın alma belgesini verir. Kullanıcı vazgeçerse Cancelled fırlatır. */
function buyOnPlay(days: number, accountRef: string): Promise<{ productId: string; purchaseToken: string }> {
  const m = iap();
  return new Promise((resolve, reject) => {
    const subs: { remove: () => void }[] = [];
    const done = () => subs.forEach(s => s.remove());
    subs.push(m.purchaseUpdatedListener(p => {
      if (p.productId !== sku(days) || !p.purchaseToken) return;
      done(); resolve({ productId: p.productId, purchaseToken: p.purchaseToken });
    }));
    subs.push(m.purchaseErrorListener(e => {
      done();
      reject(e.code === m.ErrorCode.UserCancelled ? new Cancelled() : new Error(e.message));
    }));
    m.requestPurchase({ type: 'in-app', request: { google: { skus: [sku(days)], obfuscatedAccountId: accountRef } } })
      .catch(e => { done(); reject(String(e?.code ?? '') === m.ErrorCode.UserCancelled ? new Cancelled() : e); });
  });
}

/** Satın alınmış ama sunucuya bildirilememiş paketleri (ağ kesildi, uygulama kapandı) yeniden bildirir. Sunucu aynı belgeyi ikinci kez saymaz. */
export async function recoverPurchases(srv: Srv): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const m = await srv.me();
    if (m.demoPurchases || !m.playEnabled || !m.billingRef || !(await connect())) return;
    const list = await iap().getAvailablePurchases();
    for (const p of list) {
      if (!p.purchaseToken || !PACK_DAYS.some(d => sku(d) === p.productId)) continue;
      if ((p as any).obfuscatedAccountIdAndroid && (p as any).obfuscatedAccountIdAndroid !== m.billingRef) continue; // başka hesabın satın alması
      await srv.playPurchase(p.productId, p.purchaseToken).catch(() => {});
    }
  } catch { /* bir sonraki açılışta yeniden denenir */ }
}

/**
 * Bir paket hakkı gerektiren işlemi (paketle pakt kurmak, denemeden pakete geçmek) çalıştırır.
 * Önce işlemi dener: hak varsa (ya da demo ise) para istenmez. Sunucu 402 (satın alma gerekli) derse
 * Google Play ödemesi açılır, belge sunucuya iletilir ve işlem bir kez daha denenir.
 * Kullanıcı ödemeden vazgeçerse sessizce çıkar (false döner).
 */
export async function withPack(srv: Srv, days: number, action: () => Promise<void>): Promise<boolean> {
  try { await action(); return true; }
  catch (e) {
    // 402 hem "paket için satın alma gerekli" hem "deneme kullanıldı" demek; yalnızca paket günlerinde ödeme açılır
    if (!(e instanceof ApiError) || e.status !== 402 || !PACK_DAYS.includes(days)) throw e;
    if (Platform.OS !== 'android') throw new Error('Paket satın alma şu an yalnızca Android\'de açık.');
    const m = await srv.me();
    if (!m.playEnabled || !m.billingRef || !(await connect())) throw new Error('Ödeme şu an kullanılamıyor. Biraz sonra tekrar dene.');
    try {
      const p = await buyOnPlay(days, m.billingRef);
      await srv.playPurchase(p.productId, p.purchaseToken);
    } catch (err) { if (isCancelled(err)) return false; throw err; }
    await action();
    return true;
  }
}
