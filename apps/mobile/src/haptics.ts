import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Haptik: expo-haptics sarmalayıcıları. Kurallar:
 * - Seyrek: iki titreşim arası en az 800 ms (ikincisi sessizce düşer); basılı tutarken periyodik titreşim yok.
 * - Kullanıcı kapatabilir (setHapticsEnabled; store'daki `haptics` tercihiyle eşitlenir).
 * - Web'de ve her hata durumunda sessiz: hiçbir çağrı atmaz, uygulamayı bozmaz.
 * - Kapsam: 'crisis' içinde yalnız TEK ve HAFİF titreşim (kapsam girişinden bu yana); 'quiet' içinde (oyunlar) hiç.
 * expo-haptics tembel yüklenir: yerel modül yoksa/yüklenemezse açılış çökmez, haptik sessizce kapanır.
 */
type H = typeof import('expo-haptics');
let mod: H | null | undefined;
const lib = (): H | null => {
  if (mod !== undefined) return mod;
  try { mod = Platform.OS === 'web' ? null : (require('expo-haptics') as H); } catch { mod = null; }
  return mod;
};

let enabled = true;
/** Açma/kapama bayrağı (store başlangıçta ve tercih değişince çağırır). */
export const setHapticsEnabled = (on: boolean) => { enabled = !!on; };
export const hapticsEnabled = () => enabled;

export type HapticsScope = 'crisis' | 'quiet' | null;
let scope: HapticsScope = null;
let crisisSpent = false;
/** Kapsamı elle ayarla (kancayı tercih et). Her girişte kriz hakkı yenilenir. */
export const setHapticsScope = (s: HapticsScope) => { scope = s; crisisSpent = false; };
/** Ekran açıkken kapsamı uygular, kapanınca kaldırır: Crisis → 'crisis', oyunlar → 'quiet'. */
export function useHapticsScope(s: HapticsScope) {
  useEffect(() => {
    setHapticsScope(s);
    return () => { if (scope === s) setHapticsScope(null); };
  }, [s]);
}

const MIN_GAP_MS = 800;
let last = 0;
/** false: çalma; 'light': yalnız hafif; 'full': istenen şiddet. */
function gate(): false | 'light' | 'full' {
  if (!enabled || scope === 'quiet') return false;
  const now = Date.now();
  if (now >= last && now - last < MIN_GAP_MS) return false;
  if (scope === 'crisis') {
    if (crisisSpent) return false;
    crisisSpent = true; last = now;
    return 'light';
  }
  last = now;
  return 'full';
}

/** Sırayla dener, ilk başarılıda durur; hata fırlatmaz. */
function attempt(...steps: Array<() => Promise<unknown>>) {
  (async () => { for (const s of steps) { try { await s(); return; } catch { /* sıradakini dene */ } } })().catch(() => {});
}

function playLight(H: H) {
  if (Platform.OS === 'android') {
    attempt(
      () => H.performAndroidHapticsAsync(H.AndroidHaptics.Segment_Tick), // API 34+
      () => H.performAndroidHapticsAsync(H.AndroidHaptics.Clock_Tick),   // tüm sürümler
      () => H.selectionAsync(),
    );
  } else {
    attempt(() => H.impactAsync(H.ImpactFeedbackStyle.Light));
  }
}

function playMedium(H: H) {
  if (Platform.OS === 'android') {
    attempt(
      () => H.performAndroidHapticsAsync(H.AndroidHaptics.Confirm),      // API 30+
      () => H.impactAsync(H.ImpactFeedbackStyle.Medium),
    );
  } else {
    attempt(() => H.impactAsync(H.ImpactFeedbackStyle.Medium));
  }
}

/** Hafif: seçim, düğme basışı. */
export function tick() {
  try {
    const g = gate(); if (!g) return;
    const H = lib(); if (!H) return;
    playLight(H);
  } catch { /* sessiz */ }
}

/** Orta: gün kapanışı gibi tek ve sakin yerleşme anı. Kriz kapsamında hafife iner. */
export function settle() {
  try {
    const g = gate(); if (!g) return;
    const H = lib(); if (!H) return;
    if (g === 'light') playLight(H); else playMedium(H);
  } catch { /* sessiz */ }
}

/** Hiçbir şey yapmaz (ayrı bir dal gerektirmeden "haptik yok" geçmek için). */
export const none = () => {};

export const haptic = { tick, settle, none };
