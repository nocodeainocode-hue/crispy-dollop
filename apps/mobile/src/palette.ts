// Saf veri (React Native içe aktarımı yok): üç palet. Kaynak: docs/TASARIM-BAHCE-PLANI.md bölüm 3.1.
//  CLASSIC_*: bugünkü "Modernist" görünüm (koyu + kırmızı). DAY/NIGHT: "Büyüyen Bahçe" (gündüz kâğıt, gece derin yeşil).
// Mevcut token adları (bg, surf, fg ...) korunur ve yeni görünümde karşılığı yeni değerdir; bileşenler adlarla okuduğu için
// bayrak (EXPO_PUBLIC_SKIN) değişince tüm uygulama yeniden renklenir. Yeni anlamsal token'lar (act, clay, sage ...) altta.
export type Palette = {
  bg: string; surf: string; fg: string; dim: string; mute: string; line: string; acc: string; acc2: string; cell: string; ink: string;
  glow: string;     // ekran üstündeki ışık (klasik: kırmızımsı; Bahçe: zemin rengi)
  outer: string;    // geniş ekranda (web) telefon sütununun dışı
  subOn: string;    // seçili satırdaki (zemin = fg) ikincil metin
  blue: string;     // sudoku: kullanıcının yazdığı rakam
  amber: string;    // sudoku: ipucu / metin olarak hardal
  tint: (a: number) => string; // metin renginin saydam hali (çizgi, zemin dokusu)
  grid: number;     // arka plan ızgarasının yoğunluğu (Bahçe: 0)
  // --- Bahçe anlamsal token'ları (klasik görünümde en yakın klasik değere bağlıdır) ---
  edge: string;     // arayüz sınırı (kurşun çizgi), en az 3:1
  act: string; onAct: string;       // ana eylem (ada çayı) ve üstündeki yazı
  sage: string; sageWash: string;   // yaprak dolgusu, seçili/nefes kartı zemini
  clay: string; onClay: string; clayWash: string; // kriz düğmesi, el notu, uyarı yıkaması
  mustard: string;  // yalnız bugünün tomurcuğu ve küçük güneş (geniş dolgu değil)
  tulip: string;    // lale
  water: string; onWater: string; waterWash: string; // şahit dünyası
  soil: string; pot: string; sky: string;            // toprak, saksı, gökyüzü
  hill: string; hill2: string;      // tepeler
  shadow: string;   // sert kâğıt gölgesi (ink tabanlı)
  grainA: number;   // kâğıt gren opaklığı
};

export const CLASSIC_DARK: Palette = {
  bg: '#0A0A0C', surf: '#101012', fg: '#E9E7E7', dim: '#A09C9C', mute: '#77736F',
  line: 'rgba(233,231,231,0.22)', acc: '#EC3013', acc2: '#FF5A3D', cell: '#34322F', ink: '#0A0A0C',
  glow: '#2A0E09', outer: '#000000', subOn: '#444444', blue: '#9ED0FF', amber: '#FFB703',
  tint: a => `rgba(233,231,231,${a})`, grid: 0.045,
  edge: '#77736F', act: '#E9E7E7', onAct: '#0A0A0C', sage: '#34322F', sageWash: '#101012',
  clay: '#EC3013', onClay: '#0A0A0C', clayWash: '#2A0E09', mustard: '#FFB703', tulip: '#EC3013',
  water: '#9ED0FF', onWater: '#0A0A0C', waterWash: '#101012', soil: '#34322F', pot: '#34322F', sky: '#101012',
  hill: '#101012', hill2: '#34322F', shadow: 'rgba(0,0,0,0.4)', grainA: 0,
};

export const CLASSIC_LIGHT: Palette = {
  bg: '#F3F1EC', surf: '#FFFFFF', fg: '#141416', dim: '#5B5752', mute: '#8C8781',
  line: 'rgba(20,20,22,0.16)', acc: '#E0300F', acc2: '#C42A0C', cell: '#D9D5CF', ink: '#F3F1EC',
  glow: '#F7DED5', outer: '#E4E1DB', subOn: '#BDB8B1', blue: '#1F67A8', amber: '#A86F00',
  tint: a => `rgba(20,20,22,${a})`, grid: 0.03,
  edge: '#8C8781', act: '#141416', onAct: '#F3F1EC', sage: '#D9D5CF', sageWash: '#FFFFFF',
  clay: '#E0300F', onClay: '#F3F1EC', clayWash: '#F7DED5', mustard: '#A86F00', tulip: '#E0300F',
  water: '#1F67A8', onWater: '#F3F1EC', waterWash: '#FFFFFF', soil: '#D9D5CF', pot: '#D9D5CF', sky: '#FFFFFF',
  hill: '#FFFFFF', hill2: '#D9D5CF', shadow: 'rgba(20,20,22,0.12)', grainA: 0,
};

/** Bahçe, gündüz: kâğıt zemin, çay mürekkebi yazı. */
export const DAY: Palette = {
  bg: '#F4ECDB', surf: '#FBF6EA', fg: '#24352A', dim: '#4B5B4B', mute: '#4B5B4B',
  line: 'rgba(36,53,42,0.22)', acc: '#A24622', acc2: '#A24622', cell: '#E8DCC0', ink: '#F4ECDB',
  glow: '#F4ECDB', outer: '#E8DCC0', subOn: '#C3CDB8', blue: '#3F7089', amber: '#7A5200',
  tint: a => `rgba(36,53,42,${a})`, grid: 0,
  edge: '#6A7864', act: '#3B6748', onAct: '#FBF6EA', sage: '#8FAA87', sageWash: '#CBD9BE',
  clay: '#A24622', onClay: '#FBF6EA', clayWash: '#EDC3A8', mustard: '#DCA83F', tulip: '#CF5F44',
  water: '#3F7089', onWater: '#FBF6EA', waterWash: '#CFE0E6', soil: '#C9AE86', pot: '#C98660', sky: '#DCE5CC',
  hill: '#D5E0BF', hill2: '#B8CBA6', shadow: 'rgba(36,53,42,0.2)', grainA: 0.12,
};

/** Bahçe, gece: derin yeşil zemin, krem mürekkep yazı. */
export const NIGHT: Palette = {
  bg: '#1B2820', surf: '#243329', fg: '#F2E9D4', dim: '#C3CDB8', mute: '#C3CDB8',
  line: 'rgba(242,233,212,0.22)', acc: '#F0A584', acc2: '#F0A584', cell: '#2F3F33', ink: '#1B2820',
  glow: '#1B2820', outer: '#131C16', subOn: '#4B5B4B', blue: '#9CC3D6', amber: '#EBBD5C',
  tint: a => `rgba(242,233,212,${a})`, grid: 0,
  edge: '#8C9C86', act: '#A9CBA0', onAct: '#142019', sage: '#7FA27A', sageWash: '#314A39',
  clay: '#F0A584', onClay: '#2A1710', clayWash: '#5A3A2B', mustard: '#EBBD5C', tulip: '#F08C6D',
  water: '#9CC3D6', onWater: '#142019', waterWash: '#2A4350', soil: '#3B3A2C', pot: '#B9714D', sky: '#22362A',
  hill: '#2B4034', hill2: '#35503F', shadow: 'rgba(10,16,12,0.5)', grainA: 0.1,
};

/** "#RRGGBB" + alfa -> "rgba(r,g,b,a)". Sabit renkleri palete bağlı saydamlara çevirmek için. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
