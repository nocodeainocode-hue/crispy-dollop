// Saf TS. Tuvaldeki (Main/GunTamam/Kriz/Hareket/Kimlik .dc.html) SVG yol verileri BİREBİR; renk yok (renk bileşende token ile verilir).
// Titreme (feDisplacementMap) yollara pişirilmiştir: bkz. wobble.ts. Varyant sayısı küçük tutulur; yaprak i -> varyant i % N.
import { IDENT, Mat, mul, rotM, scaleM, trans, wobblePath } from './wobble';

// ---- Yaprak (46x22 kutu; sol-orta (1,5, 11,5) gövdeye bağlanan uç) ----
export const LEAF_D = 'M1.5 11.5 C6 3.2 18 0.8 31 2.4 C40 3.6 45 8.2 44.6 11 C43 18.4 30 21.6 18 19.8 C9.5 18.6 4 15.8 1.5 11.5 Z';
export const LEAF_VEIN = 'M2 11.4 C14 10.4 28 9 41 8.6 M15 10.6 L21 5.6 M24 10 L30 15';
export const LEAF_W = 46, LEAF_H = 22, LEAF_PIVOT_Y = 11;
/** Dolgu, çizgiden bu kadar kaçık (tuvalde translate(1.8 1.6)). */
export const WASH_DX = 1.8, WASH_DY = 1.6;

// ---- Lale (28x38 kutu; taban (14, 38)) ----
export const TULIP_OPEN = [
  'M14 36 C9 30 9 17 14 3 C19 17 19 30 14 36Z',
  'M13 36 C4 35 1 22 3 10 C10 15 13 24 13 36Z',
  'M15 36 C24 35 27 22 25 10 C18 15 15 24 15 36Z',
];
export const TULIP_BUD = 'M14 36 C7 31 6 20 14 6 C22 20 21 31 14 36Z';
export const TULIP_BUD_VEIN = 'M14 34 C12 26 12 18 14 10';
export const TULIP_W = 28, TULIP_H = 38, TULIP_PIVOT = { x: 14, y: 38 };
export const TULIP_WASH_DX = 1.6, TULIP_WASH_DY = 1.4;

// ---- Kıvrık yaprak (zor gün; Kimlik.dc.html "Zor gün" 104x80 çizimi). Yaprak kutusuna bağlanan matris aşağıda. ----
export const CURL_D = 'M10 52 C22 20 52 10 90 18 C92 40 70 62 40 62 C26 62 16 58 10 52Z';
export const CURL_VEIN = 'M12 52 C36 44 62 34 84 22';
export const CURL_FOLD = 'M90 18 L98 34 L80 30Z';
const CURL_BASE = { x: 10, y: 52 }, CURL_TIP = { x: 90, y: 18 };
const LEAF_BASE = { x: 1.5, y: 11.5 }, LEAF_TIP = { x: 44.6, y: 11 };
const lenC = Math.hypot(CURL_TIP.x - CURL_BASE.x, CURL_TIP.y - CURL_BASE.y);
const lenL = Math.hypot(LEAF_TIP.x - LEAF_BASE.x, LEAF_TIP.y - LEAF_BASE.y);
/** Kıvrık yaprak ölçeği (yaprakla aynı boy) ve eksenini yaprak eksenine hizalayan döndürme (derece). */
export const CURL_S = lenL / lenC;
const curlRot = (Math.atan2(LEAF_TIP.y - LEAF_BASE.y, LEAF_TIP.x - LEAF_BASE.x) - Math.atan2(CURL_TIP.y - CURL_BASE.y, CURL_TIP.x - CURL_BASE.x)) * 180 / Math.PI;
export const CURL_M: Mat = mul(mul(mul(trans(LEAF_BASE.x, LEAF_BASE.y), scaleM(CURL_S)), rotM(curlRot)), trans(-CURL_BASE.x, -CURL_BASE.y));
/** Lale gününe denk gelen zor günde boynu eğik lale (+18 derece, plan 5.3). */
export const TULIP_CURL_DEG = 18;

// ---- Pişirilmiş (titreşimli) varyantlar ----
const LEAF_AMP = 0.8, TULIP_AMP = 0.7;
export const LEAF_VARIANTS = 8;
export const TULIP_VARIANTS = 4;
export const leafBake = Array.from({ length: LEAF_VARIANTS }, (_, v) => ({
  blade: wobblePath(LEAF_D, LEAF_AMP, v + 1),
  vein: wobblePath(LEAF_VEIN, LEAF_AMP, v + 1),
  curl: wobblePath(CURL_D, LEAF_AMP / CURL_S, v + 1),
  curlVein: wobblePath(CURL_VEIN, LEAF_AMP / CURL_S, v + 1),
  curlFold: wobblePath(CURL_FOLD, LEAF_AMP / CURL_S, v + 1),
}));
export const tulipBake = Array.from({ length: TULIP_VARIANTS }, (_, v) => ({
  petals: TULIP_OPEN.map(d => wobblePath(d, TULIP_AMP, v + 1)),
  bud: wobblePath(TULIP_BUD, TULIP_AMP, v + 1),
  budVein: wobblePath(TULIP_BUD_VEIN, TULIP_AMP, v + 1),
}));

// ---- Saksı (Hareket/Imza "basılı tut" 96x52; Kimlik paket simgesi) ----
export const POT_SIGN = { w: 96, h: 52, body: 'M8 4 H88 L82 40 C81 46 76 48 72 48 H24 C20 48 15 46 14 40 Z', rim: 'M4 4 H92' };
export const POT_PACK = { x: 20, y: 76, w: 60, h: 36, body: 'M30 80 H70 L66 104 C65 108 62 109 59 109 H41 C38 109 35 108 34 104Z', rim: 'M27 80 H73' };
export const potBake = { sign: { body: wobblePath(POT_SIGN.body, 0.8, 3), rim: wobblePath(POT_SIGN.rim, 0.8, 3) }, pack: { body: wobblePath(POT_PACK.body, 0.8, 3), rim: wobblePath(POT_PACK.rim, 0.8, 3) } };

// ---- Güneş / ay (86x86) ve bulutlar ----
export const SUN = { size: 86, cx: 45, cy: 44, r: 19, inkCx: 43, inkCy: 42, bite: { cx: 53, cy: 37, r: 15 }, rays: 'M43 12 v-7 M43 72 v7 M11 42 h-7 M75 42 h7 M20 19 l-5 -5 M66 65 l5 5 M66 19 l5 -5 M20 65 l-5 5' };
export const CLOUD_A = { w: 92, h: 40, d: 'M14 32 C4 32 3 20 13 19 C13 8 28 5 33 14 C38 4 56 6 56 18 C68 14 76 24 68 31 C66 33 62 32 60 32 Z' };
export const CLOUD_B = { w: 64, h: 30, d: 'M10 24 C2 24 2 14 10 14 C10 6 22 4 26 11 C30 4 44 6 44 14 C54 12 58 22 50 24 Z' };

// ---- Tepeler / toprak (Main.dc.html 390x330) ----
export const HILLS = {
  w: 390, h: 330,
  h1Fill: 'M0 80 C60 40 120 30 190 56 C250 80 320 40 390 60 L390 330 L0 330Z', h1Line: 'M0 80 C60 40 120 30 190 56 C250 80 320 40 390 60',
  h2Fill: 'M0 140 C70 112 150 108 215 128 C285 148 340 120 390 124 L390 330 L0 330Z', h2Line: 'M0 140 C70 112 150 108 215 128 C285 148 340 120 390 124',
  soilFill: 'M-10 178 C60 150 130 142 195 146 C260 144 330 152 400 180 L400 330 L-10 330Z', soilLine: 'M-10 178 C60 150 130 142 195 146 C260 144 330 152 400 180',
  marks: 'M40 204 l10 -4 M62 220 l12 -3 M300 206 l10 -3 M330 224 l12 -4 M120 230 l12 -3 M250 238 l10 -3 M24 246 l9 -3 M350 250 l10 -3 M190 246 l12 -3',
  marksDone: 'M40 204 l10 -4 M62 220 l12 -3 M300 206 l10 -3 M330 224 l12 -4 M120 230 l12 -3 M250 238 l10 -3 M24 246 l9 -3 M350 250 l10 -3',
  pebbles: [{ cx: 96, cy: 192, rx: 9, ry: 5.5 }, { cx: 312, cy: 198, rx: 7, ry: 4.5 }, { cx: 294, cy: 204, rx: 4, ry: 3 }],
  tufts: ['M262 152 q-3 -14 -10 -20 M262 152 q0 -16 2 -24 M262 152 q4 -12 12 -18', 'M128 158 q-2 -12 -8 -17 M128 158 q1 -13 3 -20 M128 158 q4 -10 10 -14'],
};
/** soil2 paletinde yok: tuvaldeki sabit değer (gündüz/gece). */
export const SOIL2 = { light: '#B79B72', dark: '#4A4733' };
/** Hardal halka (tek seferlik): tuvalde rgba(235,189,92,.6) sabit. */
export const HALO_RGB = '#EBBD5C';

// ---- Kriz sahnesi (Kriz.dc.html) ----
export const CRISIS = {
  w: 390, h: 458, skyH: 300, soilTop: 300, soilH: 158,
  plantX: 170, plantY: 62, plantW: 200, plantH: 250,
  wind: [
    { d: 'M120 60 C170 48 200 76 250 60 S330 50 390 64', delay: 0 },
    { d: 'M60 110 C120 98 150 126 210 110 S300 100 390 114', delay: 900 },
    { d: 'M150 168 C200 158 230 182 280 168 S350 160 390 172', delay: 1800 },
    { d: 'M0 40 C40 32 70 52 110 40', delay: 2200 },
  ],
  groundLine: 'M-6 20 C60 10 120 14 190 16 C260 18 330 10 396 20', groundTuft: 'M60 16 q-2 -10 -8 -14 M60 16 q1 -11 3 -16 M60 16 q4 -9 9 -12',
  soilMarks: 'M24 40 l10 -3 M60 120 l12 -3 M330 60 l10 -3 M350 110 l12 -4 M120 70 l12 -3 M210 130 l10 -3 M30 90 l9 -3 M300 140 l10 -3',
  soilPebbles: [{ cx: 96, cy: 46, rx: 9, ry: 5.5 }, { cx: 344, cy: 84, rx: 7, ry: 4.5 }, { cx: 60, cy: 142, rx: 8, ry: 5 }],
  // Kökler: soil bölgesinde (390x158); [yol, çizgi kalınlığı, ilerleme penceresi başlangıcı, bitişi] (prog = geçen süre / toplam süre)
  roots: [
    { d: 'M270 4 C268 40 276 70 270 114', w: 4.4, s: 0, e: 0.55 },
    { d: 'M270 28 C250 38 230 42 212 56', w: 3.2, s: 0, e: 0.3 },
    { d: 'M272 52 C292 58 312 64 328 80', w: 3.2, s: 0.05, e: 0.36 },
    { d: 'M270 82 C250 92 236 102 224 124', w: 3.2, s: 0.15, e: 0.5 },
    { d: 'M271 100 C290 110 304 122 312 142', w: 3.2, s: 0.3, e: 0.72 },
    { d: 'M269 8 C262 18 248 20 238 30', w: 3, s: 0, e: 0.2 },
  ],
  rootArrow: 'M2 6 C12 20 24 18 31 8 M31 8 L24 8.6 M31 8 L29.6 15.4',
};

// ---- Hareket sayfası "Köklenme" kartı (356x180 sahne): 4,8 sn ease-out, sıralı gecikme ----
export const ROOTS_DEMO = {
  w: 356, h: 180, soilTop: 62,
  roots: [
    { d: 'M178 62 C176 90 184 112 178 146', w: 4, delay: 0 },
    { d: 'M178 80 C158 90 140 94 124 108', w: 3, delay: 600 },
    { d: 'M180 100 C200 106 218 112 232 128', w: 3, delay: 1400 },
    { d: 'M178 120 C160 130 150 140 142 160', w: 3, delay: 2400 },
  ],
  ms: 4800,
};

// ---- El notu oku ("bugün" oku, 26x20) ----
export const NOTE_ARROW = 'M2 6 C8 16 17 15 22 8 M22 8 L15.5 8.4 M22 8 L21 14.5';
// ---- "Neden" etiketi (122x110) ----
export const WHY = { w: 122, h: 110, stake: 'M60 44 l3 62', board: 'M8 8 C30 3 90 3 112 8 C117 20 117 36 112 46 C90 51 30 51 8 46 C3 34 3 20 8 8Z' };

export { IDENT };
