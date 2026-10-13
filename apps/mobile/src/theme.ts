import { Platform } from 'react-native';

// QuitVow v3 — "Modernist": hairlines, sharp corners, one red accent. Koyu (varsayılan, marka) ve açık palet.
// Bileşenler `c` nesnesini okur; tema değişince `applyTheme` aynı nesnenin değerlerini değiştirir ve App içeriği yeniden kurulur.
type Palette = {
  bg: string; surf: string; fg: string; dim: string; mute: string; line: string; acc: string; acc2: string; cell: string; ink: string;
  glow: string;     // ekran üstündeki kırmızımsı ışık
  outer: string;    // geniş ekranda (web) telefon sütununun dışı
  subOn: string;    // seçili satırdaki (zemin = fg) ikincil metin
  blue: string;     // sudoku: kullanıcının yazdığı rakam
  amber: string;    // sudoku: ipucu
  tint: (a: number) => string; // metin renginin saydam hali (çizgi, zemin dokusu)
  grid: number;     // arka plan ızgarasının yoğunluğu
};

const DARK: Palette = {
  bg: '#0A0A0C', surf: '#101012', fg: '#E9E7E7', dim: '#A09C9C', mute: '#77736F',
  line: 'rgba(233,231,231,0.22)', acc: '#EC3013', acc2: '#FF5A3D', cell: '#34322F', ink: '#0A0A0C',
  glow: '#2A0E09', outer: '#000000', subOn: '#444444', blue: '#9ED0FF', amber: '#FFB703',
  tint: a => `rgba(233,231,231,${a})`, grid: 0.045,
};

const LIGHT: Palette = {
  bg: '#F3F1EC', surf: '#FFFFFF', fg: '#141416', dim: '#5B5752', mute: '#8C8781',
  line: 'rgba(20,20,22,0.16)', acc: '#E0300F', acc2: '#C42A0C', cell: '#D9D5CF', ink: '#F3F1EC',
  glow: '#F7DED5', outer: '#E4E1DB', subOn: '#BDB8B1', blue: '#1F67A8', amber: '#A86F00',
  tint: a => `rgba(20,20,22,${a})`, grid: 0.03,
};

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

export const F = {
  r: 'Archivo_400Regular', s: 'Archivo_600SemiBold', b: 'Archivo_800ExtraBold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' }) as string,
};
