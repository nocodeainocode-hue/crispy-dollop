import { getLocales } from 'expo-localization';
import tr, { type Dict } from './tr';
import en from './en';
import { useApp, type HabitId } from '../store';
import { helplines, type Helplines } from '../helplines';

export type { Dict };
export type Lang = 'tr' | 'en';
export const LANGS: Lang[] = ['tr', 'en'];
const DICTS: Record<Lang, Dict> = { tr, en };

const loc = () => { try { return getLocales()[0]; } catch { return undefined; } };
/** Cihaz dili Türkçeyse Türkçe, değilse İngilizce. */
export const deviceLang = (): Lang => (loc()?.languageCode === 'tr' ? 'tr' : 'en');
/** Cihaz bölgesi (TR, US, GB…): yardım hatları ve para birimi buna göre seçilir. */
export const deviceRegion = (): string => loc()?.regionCode ?? '';
const deviceCurrency = (): string => loc()?.currencyCode ?? (deviceLang() === 'tr' ? 'TRY' : 'USD');

// Hook dışından (api.ts gibi) okunabilen geçerli dil; useL her çağrıldığında güncellenir.
let current: Lang = deviceLang();
export const currentLang = () => current;
export const dict = (l: Lang = current): Dict => DICTS[l];

/** Ekranlarda kullanılan sözlük. Kullanıcı Profil'den dil seçmediyse cihaz dili. */
export function useL(): Dict {
  const a = useApp();
  current = a.lang ?? deviceLang();
  return DICTS[current];
}
/** Seçili alışkanlığın paketi (metinler + seçenekler). Şimdilik yalnızca kumar. */
export function useH(): Dict['habits'][HabitId] {
  const L = useL();
  const a = useApp();
  return L.habits[a.habit] ?? L.habits.gambling;
}

/** Para: cihazın para birimiyle, kuruşsuz. Intl yoksa sembolsüz sayı. */
export function money(n: number, L: Dict = dict()): string {
  try { return new Intl.NumberFormat(L.locale, { style: 'currency', currency: deviceCurrency(), maximumFractionDigits: 0 }).format(n); }
  catch { return n.toLocaleString(L.locale); }
}
export function currencySymbol(L: Dict = dict()): string {
  try { return new Intl.NumberFormat(L.locale, { style: 'currency', currency: deviceCurrency() }).formatToParts(0).find(p => p.type === 'currency')?.value ?? deviceCurrency(); }
  catch { return deviceCurrency(); }
}

/** Süre (ms) → "2g 3s" / "2d 3h" */
export const fmtDur = (ms: number, L: Dict = dict()) => {
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return L.time.dur(d, h, m % 60);
};
/** Geçen süre → "3 dk önce" / "3 min ago" */
export const ago = (t: number | null | undefined, L: Dict = dict()) => {
  if (!t) return L.time.never;
  const m = Math.floor((Date.now() - t) / 60000);
  return m < 1 ? L.time.justNow : m < 60 ? L.time.minsAgo(m) : m < 1440 ? L.time.hoursAgo(Math.floor(m / 60)) : L.time.daysAgo(Math.floor(m / 1440));
};
/** "A, B ve C" / "A, B and C" */
export const joinNames = (names: string[], L: Dict = dict()) => names.join(', ').replace(/, ([^,]*)$/, ` ${L.and} $1`);

/** Cihaz bölgesine göre yardım hatları; bölge bilinmiyorsa Türkçe kullanıcıya Türkiye hatları. */
export function useHelp(): Helplines {
  const L = useL();
  return helplines(deviceRegion() || (current === 'tr' ? 'TR' : ''), L);
}

/** Günlük kaydındaki duygu/tetik kimliğini o dilin etiketine çevirir. Eski kayıtlardaki serbest metin olduğu gibi gösterilir. */
export const entryLabel = (k: string, H: Dict['habits'][HabitId], L: Dict) =>
  k === 'self' || k === 'Kendim bildirdim' ? L.relapse.selfReported : H.moods[k] ?? H.triggers[k] ?? k;
/** Analizde sayılacak gerçek bir tetik mi? ("kendim bildirdim" işareti tetik değildir.) */
export const isTrigger = (t?: string): t is string => !!t && t !== 'self' && t !== 'Kendim bildirdim';
