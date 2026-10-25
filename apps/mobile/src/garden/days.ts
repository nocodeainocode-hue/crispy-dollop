// Ana ekran ve Gün tamam için bahçe verisi: store'daki kayıtlardan gün durumları ve sayımlar.
// Saf TypeScript (React yok). Çizim art/plant'ta; burada yalnız "hangi gün hangi durumda" hesaplanır.
// Paket günü hesabı Home'daki ile aynı: geçen 24 saatlik dilim (startedAt'ten).
import { makeDayStates, type DayState } from '../art/plant';

export const DAY_MS = 86400000;

/** n. paket günü (1'den) zaman damgasından. Eskisiyle aynı hesap. */
export const packDayOf = (t: number, startedAt: number) => Math.floor((t - startedAt) / DAY_MS) + 1;

/** Her 7. paket günü yaprak yerine lale açar. Kaçıncı lale (1'den), lale günü değilse 0. */
export const tulipNo = (day: number) => (day > 0 && day % 7 === 0 ? day / 7 : 0);

/** Zor (tekrar oynama) günleri: yaprak silinmez, kenarı kıvrılır. Hedef aralığında, sıralı, tekrarsız. */
export function hardDays(relapses: readonly number[], startedAt: number, goal: number): number[] {
  return [...new Set(relapses.map(t => packDayOf(t, startedAt)).filter(d => d >= 1 && d <= goal))].sort((x, y) => x - y);
}

/** Kaçırılan günler: bugünden önceki, hiç günlük kontrolü olmayan ve zor gün olmayan günler. */
export function missedDays(checkIns: readonly number[], startedAt: number, day: number, goal: number, hard: readonly number[]): number[] {
  const seen = new Set<number>(checkIns.map(t => packDayOf(t, startedAt)));
  const skip = new Set<number>(hard);
  const out: number[] = [];
  for (let d = 1; d < Math.min(day, goal + 1); d++) if (!seen.has(d) && !skip.has(d)) out.push(d);
  return out;
}

/**
 * Bahçe sahnesinin gün durumları (art/plant makeDayStates): geçen gün done, zor gün curl, kaçırılan gün rest, bugün today
 * (kontrol yapıldıysa done), sonrası future. Bugün kontrolü yapılmış ve bugün tekrar oynanmışsa bugünün yaprağı da curl olur.
 */
export function gardenStates(o: { goal: number; day: number; done: boolean; hard: readonly number[]; checkIns: readonly number[]; startedAt: number }): DayState[] {
  const { goal, day, done, hard } = o;
  const rest = missedDays(o.checkIns, o.startedAt, day, goal, hard);
  const out = makeDayStates(goal, day, { assumeDoneToday: done, curl: [...hard], rest });
  if (done && day >= 1 && day <= goal && hard.includes(day)) out[day - 1] = 'curl';
  return out;
}

/** Erişilebilirlik özeti için sayımlar: açan laleler ve kenarı kıvrık yapraklar. Bugünün tomurcuğu (kontrol bekliyorsa) sayılmaz. */
export function gardenCounts(goal: number, day: number, done: boolean, hard: readonly number[]) {
  const upto = Math.min(day, goal) - (done ? 0 : 1);
  return { tulips: Math.max(0, Math.floor(upto / 7)), curled: hard.filter(d => d >= 1 && d <= Math.min(day, goal)).length };
}

/** Aşırı kısa etiket: "neden" kısa ve en çok 3 sözcükse (ör. "kızım için"), değilse boş. Uzun, kişisel metin sahnede ZORLA gösterilmez. */
export function whyLabel(reason: string): string | undefined {
  const t = reason.replace(/\s+/g, ' ').trim();
  if (!t || t.length > 22) return undefined;
  return t.split(' ').length <= 3 ? t : undefined;
}

// Ana ekran girişi (yaprakların sırayla belirmesi) takvim gününde bir kez: aynı gün tekrar açılışlarda durağan.
let introDay = '';
/** Bu takvim gününde giriş animasyonu henüz oynanmadıysa true döner ve günü işaretler. */
export const claimIntro = (dayKey: string) => { if (introDay === dayKey) return false; introDay = dayKey; return true; };
