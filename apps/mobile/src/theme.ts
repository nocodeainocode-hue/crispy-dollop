import { Platform } from 'react-native';
import { CLASSIC_DARK, CLASSIC_LIGHT, DAY, NIGHT, alpha, type Palette } from './palette';

// QuitVow görünümü. İki "skin": 'classic' (v3 Modernist: hairline, keskin köşe, tek kırmızı vurgu) ve 'bahce' (Büyüyen Bahçe).
// Bayrak derleme zamanında okunur. Varsayılan 'bahce'; eski görünüm yalnızca EXPO_PUBLIC_SKIN=classic ile (geri dönüş yolu, F10'da silinir).
// Bileşenler `c` nesnesini okur; tema değişince `applyTheme` aynı nesnenin değerlerini değiştirir ve App içeriği yeniden kurulur.
export type SkinName = 'classic' | 'bahce';
export const SKIN: SkinName = process.env.EXPO_PUBLIC_SKIN === 'classic' ? 'classic' : 'bahce';
export const BAHCE = SKIN === 'bahce';

export { alpha };
export type { Palette };

const DARK: Palette = BAHCE ? NIGHT : CLASSIC_DARK;
const LIGHT: Palette = BAHCE ? DAY : CLASSIC_LIGHT;

export type ThemeName = 'dark' | 'light';
export type ThemePref = ThemeName | 'system';
export const c: Palette = { ...DARK };
let current: ThemeName = 'dark';
export const currentTheme = () => current;
/** Paleti değiştirir (aynı nesne). Çağıran, içeriği yeniden kurmalı (App bunu `key` ile yapar). */
export function applyTheme(t: ThemeName) {
  if (t === current) return;
  Object.assign(c, t === 'dark' ? DARK : LIGHT);
  current = t;
}

// Yazı aileleri. Bahçe: Nunito (gövde/düğme), Fraunces (büyük başlık ve sayılar), Caveat (el notu). Özel ailelere fontWeight VERİLMEZ
// (Android sentetik kalın üretir); ağırlık dosya adındadır. Klasik: Archivo (d ve hand eski karşılıklara bağlı).
export const F = BAHCE
  ? { r: 'Nunito_500Medium', s: 'Nunito_700Bold', b: 'Nunito_800ExtraBold', d: 'Fraunces_600SemiBold', hand: 'Caveat_600SemiBold', mono: 'Nunito_800ExtraBold' }
  : {
      r: 'Archivo_400Regular', s: 'Archivo_600SemiBold', b: 'Archivo_800ExtraBold', d: 'Archivo_800ExtraBold', hand: 'Archivo_600SemiBold',
      mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' }) as string,
    };

/**
 * "Kusurlu yuvarlak": her köşesi farklı yarıçaplı çakıl biçimi. Aynı (h, seed) her zaman aynı biçimi verir; Math.random yok.
 * Her dikey kenarda iki köşenin oranı toplamı <= 1 (taşma/kırpılma olmaz). Klasik görünümde keskin köşe (0).
 */
const PEBBLES = [[0.53, 0.43, 0.57, 0.47], [0.47, 0.55, 0.42, 0.5], [0.56, 0.46, 0.5, 0.4], [0.42, 0.5, 0.5, 0.48]] as const;
function hash(s: string | number) { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
export function pebble(h: number, seed: string | number = 0) {
  if (!BAHCE) return { borderRadius: 0 };
  const [tl, tr, br, bl] = PEBBLES[hash(seed) % PEBBLES.length];
  return { borderTopLeftRadius: Math.round(h * tl), borderTopRightRadius: Math.round(h * tr), borderBottomRightRadius: Math.round(h * br), borderBottomLeftRadius: Math.round(h * bl) };
}

/** Kenar boşluğu, dokunma hedefi ve hareket süresi ölçekleri (tek yerden). */
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const HIT = { min: 48, primary: 60, crisis: 84 } as const;
