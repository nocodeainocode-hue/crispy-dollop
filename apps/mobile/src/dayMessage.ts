import type { Dict } from './i18n';

/** Temiz seride kutlanan günler */
export const MILESTONES = [1, 3, 7, 14, 21, 30, 45, 60, 75, 90];

export type DayCtx = {
  streak: number;          // temiz seri (gün)
  day: number;             // paket günü
  goal: number;            // paket uzunluğu
  urge: number | null;     // bugünkü en yüksek dürtü (0–10)
  triggerTimes: string[];  // kurulumda seçilen riskli zaman kimlikleri
  reason: string;          // "neden bırakıyorum"
  letter: string;          // gelecekteki sana mektup
  now: Date;
};

/** İlk cümle (çok uzunsa kısaltılır): kendi yazdığı metinden alıntı için */
export const firstSentence = (s: string, max = 110) => {
  const t = (s.trim().match(/^[^.!?…]*[.!?…]?/)?.[0] ?? '').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

/**
 * "Gün tamam" ekranındaki kişisel cümle. Rastgele değil, bağlama göre öncelikli seçilir:
 * zor gün (yüksek dürtü) → temiz seride dönüm noktası → kişinin riskli zamanı → sırayla dönen kişisel içerik.
 * Belirli bir günde hep aynı cümle çıkar; sürpriz/şans hissi bilinçli olarak yok.
 */
export function dayMessage(L: Dict, x: DayCtx): string {
  if (x.urge !== null && x.urge >= 6) return L.done.highUrge(x.urge);
  if (MILESTONES.includes(x.streak) && L.done.milestone[x.streak]) return L.done.milestone[x.streak];
  const dow = x.now.getDay(), h = x.now.getHours();
  if (x.triggerTimes.includes('weekend') && (dow === 0 || dow === 6)) return L.done.risky.weekend;
  if (x.triggerTimes.includes('night') && (h >= 22 || h < 5)) return L.done.risky.night;
  if (x.triggerTimes.includes('afterwork') && h >= 17 && h < 21) return L.done.risky.afterwork;
  const pool = [
    x.reason.trim() ? L.done.reason(firstSentence(x.reason)) : '',
    x.letter.trim() ? L.done.letter(firstSentence(x.letter)) : '',
    L.done.left(Math.max(0, x.goal - x.day)),
  ].filter(Boolean);
  return pool[x.day % pool.length];
}
