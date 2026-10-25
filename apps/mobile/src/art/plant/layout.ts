// Saf TS (React Native'den bağımsız). 1..N gün için DETERMİNİSTİK bitki yerleşimi: herkes için aynı, Math.random yok.
// Kaynak: tuvaldeki Main/GunTamam/Kriz.dc.html `plant()` fonksiyonu. Filiz (30 gün) tuvalle birebir (kutu 340x400, top=40, bot=h-40,
// amp=36, SC=1,36; kriz 200x250, top=18, bot=h-14, amp=22, SC=.92, TK=.82). Fidan (60) ve Ağaç (90): her 30 günde bir dal (limb modeli).
// Yerleşim yalnız (goalDays, gün) ile belirlenir: gün n çıktısı n+1'in önekidir; gün durumları yalnızca HANGİ çizimin kullanılacağını seçer.
import { LEAF_VARIANTS, LEAF_PIVOT_Y, TULIP_PIVOT, TULIP_VARIANTS } from './paths';
import { Mat, Pt, apply, field, mul, r1, rotM, scaleM, trans, warpPath } from './wobble';

export type DayState = 'done' | 'today' | 'future' | 'rest' | 'curl';
export type SceneVariant = 'home' | 'crisis' | 'mini';
export type Stage = 'tohum' | 'filiz' | 'fidan' | 'agac';
export type Look = 'ink' | 'pencil' | 'today' | 'curl';

export const LIMB_DAYS = 30;
/** Aşama: <=7 tohum, <=30 filiz, <=60 fidan, diğerleri ağaç. */
export const stageFor = (goalDays: number): Stage => (goalDays <= 7 ? 'tohum' : goalDays <= 30 ? 'filiz' : goalDays <= 60 ? 'fidan' : 'agac');
export const limbCountFor = (goalDays: number) => Math.max(1, Math.ceil(goalDays / LIMB_DAYS));
/** Yaprak ölçeği aşamaya göre: filiz 1,36 (tuval), fidan ≈0,9, ağaç ≈0,78 (plan 5.2). */
const STAGE_SC: Record<Stage, number> = { tohum: 1.36, filiz: 1.36, fidan: 0.9, agac: 0.78 };

export interface Geo {
  w: number; h: number; top: number; bot: number; amp: number; SC: number; TK: number;
  wob: number;                                  // titreme genliği (px) = filtre scale · .38
  stem: { main: number; thin: number; pen: number }; penOp: number;
}
const GEO: Record<SceneVariant, Omit<Geo, 'SC'> & { SC: number }> = {
  home: { w: 340, h: 400, top: 40, bot: 360, amp: 36, SC: 1.36, TK: 1, wob: 0.91, stem: { main: 3.2, thin: 2.4, pen: 1.8 }, penOp: 0.7 },
  // mini = şahit portalı kemer penceresi (SahitPortal.dc.html): kutu 220x232, top=14, bot=h-16, amp=20, SC=.9, TK=.8
  mini: { w: 220, h: 232, top: 14, bot: 216, amp: 20, SC: 0.9, TK: 0.8, wob: 0.84, stem: { main: 3, thin: 2.2, pen: 1.6 }, penOp: 0.65 },
  crisis: { w: 200, h: 250, top: 18, bot: 236, amp: 22, SC: 0.92, TK: 0.82, wob: 0.84, stem: { main: 3, thin: 2.2, pen: 1.6 }, penOp: 0.65 },
};
export function geoFor(variant: SceneVariant, goalDays: number): Geo {
  const g = GEO[variant];
  return { ...g, SC: g.SC * (STAGE_SC[stageFor(goalDays)] / 1.36) };
}

/** Tuvaldeki sahte-rastgele sapma: frac(sin(i·12,9898)·43758,5453) − .5 (deterministik; sonuçlar .1'e yuvarlanır). */
export const jit = (i: number) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s) - 0.5; };

// ---- Gövde ve dallar ----
export interface Branch { fx: number; fy: number; c1x: number; c1y: number; c2x: number; c2y: number; ex: number; ey: number; amp: number; ph: number }
export interface Limb { index: number; startDay: number; days: number; branch?: Branch }
/** [çatallanma t, yön, uç x (merkeze göre), uç y] (340x400 kutuda; kutu ölçeğine uydurulur). 1. dal sol (31-60), 2. dal sağ (61-90). */
const BRANCHES: ReadonlyArray<readonly [number, 1 | -1, number, number]> = [
  [0.55, -1, -105, 70], [0.3, 1, 108, 100], [0.78, -1, -70, 48], [0.66, 1, 80, 62], [0.9, 1, 40, 20],
];
export function trunkPoint(g: Geo, t: number): Pt {
  return { x: g.w / 2 + g.amp * Math.sin(t * 6.4 + 0.55) * (1 - 0.42 * t), y: g.bot - t * (g.bot - g.top) };
}
function buildLimbs(g: Geo, goalDays: number): Limb[] {
  const n = limbCountFor(goalDays), out: Limb[] = [];
  for (let L = 0; L < n; L++) {
    const start = L * LIMB_DAYS, days = Math.min(LIMB_DAYS, goalDays - start);
    if (L === 0) { out.push({ index: 0, startDay: 0, days }); continue; }
    const [t0, s, ex, ey] = BRANCHES[(L - 1) % BRANCHES.length];
    const sx = g.w / 340, sy = g.h / 400, F = trunkPoint(g, t0), E = { x: g.w / 2 + ex * sx, y: ey * sy };
    out.push({ index: L, startDay: start, days, branch: { fx: F.x, fy: F.y, c1x: F.x + s * 45 * sx, c1y: F.y - 8 * sy, c2x: E.x - s * 5 * sx, c2y: E.y + 70 * sy, ex: E.x, ey: E.y, amp: 6 * sx, ph: L * 1.3 } });
  }
  return out;
}
/** Dal/gövde üzerindeki nokta, t in [0,1] (ham, titremesiz). */
export function limbPoint(g: Geo, limb: Limb, t: number): Pt {
  const b = limb.branch;
  if (!b) return trunkPoint(g, t);
  const u = 1 - t, a = u * u * u, bb = 3 * u * u * t, cc = 3 * u * t * t, d = t * t * t;
  const wig = b.amp * Math.sin(t * 6.4 + 0.55 + b.ph) * (1 - 0.42 * t) * Math.min(1, t * 6);
  return { x: a * b.fx + bb * b.c1x + cc * b.c2x + d * b.ex + wig, y: a * b.fy + bb * b.c1y + cc * b.c2y + d * b.ey };
}

// ---- Parçalar ----
export interface LeafPlace {
  kind: 'leaf'; day: number; limb: number; variant: number;
  /** Gövdeye bağlandığı nokta (titreme dahil): yaprak sol-orta. Animasyon pivotu. */
  ax: number; ay: number; side: 1 | -1; rot: number; k: number;
  /** Yaprak yerel (46x22) -> sahne matrisi; bugün tomurcuğu için 0,62 ölçekli sürümü. */
  m: Mat; mToday: Mat;
  /** CSS kutusunun sol/üst (tuval hesabı; not oku konumu için). */
  left: number; top: number;
}
export interface TulipPlace {
  kind: 'tulip'; day: number; limb: number; variant: number;
  /** Lale tabanı (pivot). */
  ax: number; ay: number; side: 1 | -1; rot: number; k: number;
  /** Sürgünün ucu (halka merkezi için) ve sürgün yolu (titremeli). */
  tipX: number; tipY: number; shoot: string;
  m: Mat; left: number; top: number;
}
export type Place = LeafPlace | TulipPlace;

export interface Layout {
  goalDays: number; stage: Stage; variant: SceneVariant; geo: Geo; limbs: Limb[];
  byDay: Place[];           // dizin = gün - 1
  leaves: LeafPlace[]; tulips: TulipPlace[];
}

const cache = new Map<string, Layout>();

/** 1..goalDays için yerleşim (önbellekli). Aynı girdi her zaman aynı çıktıyı verir. */
export function buildLayout(goalDays: number, variant: SceneVariant = 'home'): Layout {
  const goal = Math.max(1, Math.round(goalDays));
  const key = goal + '|' + variant;
  const hit = cache.get(key);
  if (hit) return hit;
  const g = geoFor(variant, goal), limbs = buildLimbs(g, goal);
  const tkEff = g.TK * (stageFor(goal) === 'fidan' || stageFor(goal) === 'agac' ? 0.7 : 1);
  const LH = 22;
  const byDay: Place[] = [], leaves: LeafPlace[] = [], tulips: TulipPlace[] = [];
  const wob = (x: number, y: number): [number, number] => { const [dx, dy] = field(x, y, g.wob, 4); return [x + dx, y + dy]; };
  for (let i = 1; i <= goal; i++) {
    const L = Math.floor((i - 1) / LIMB_DAYS), limb = limbs[L], m = i - limb.startDay;
    const t = (m - 0.5) / limb.days * 0.97 + 0.02;
    const p = limbPoint(g, limb, t), side: 1 | -1 = i % 2 ? 1 : -1, j = jit(i);
    const k = (1.08 - 0.52 * t) * (1 + j * 0.14);
    const [wx, wy] = wob(p.x, p.y);
    if (i % 7 === 0) {
      const tx = p.x + side * 34 * k * tkEff, ty = p.y - 34 * k * tkEff;
      const raw = 'M' + r1(p.x) + ' ' + r1(p.y) + ' Q' + r1(p.x + side * 26 * k * tkEff) + ' ' + r1(p.y - 4) + ' ' + r1(tx) + ' ' + r1(ty + 2);
      const left = r1(tx - 14), top = r1(ty - 46 * tkEff), rot = r1(side * (8 + (j + 0.5) * 6)), kk = r1(1.2 * (k + 0.12) * tkEff);
      const [ax, ay] = wob(left + TULIP_PIVOT.x, top + TULIP_PIVOT.y);
      const mat = mul(mul(mul(trans(ax, ay), rotM(rot)), scaleM(kk)), trans(-TULIP_PIVOT.x, -TULIP_PIVOT.y));
      const place: TulipPlace = { kind: 'tulip', day: i, limb: L, variant: i % TULIP_VARIANTS, ax, ay, side, rot, k: kk, tipX: tx, tipY: ty, shoot: warpPath(raw, wob), m: mat, left, top };
      byDay.push(place); tulips.push(place);
    } else {
      const x = r1(p.x), y = r1(p.y - LH / 2), rot = r1(-(34 + (j + 0.5) * 22)), kk = r1(k * g.SC), kt = r1(kk * 0.62);
      const mk = (s: number): Mat => mul(mul(mul(mul(trans(wx, wy), scaleM(side, 1)), rotM(rot)), scaleM(s)), trans(0, -LEAF_PIVOT_Y));
      const place: LeafPlace = { kind: 'leaf', day: i, limb: L, variant: i % LEAF_VARIANTS, ax: wx, ay: wy, side, rot, k: kk, m: mk(kk), mToday: mk(kt), left: x, top: y };
      byDay.push(place); leaves.push(place);
    }
  }
  const out: Layout = { goalDays: goal, stage: stageFor(goal), variant, geo: g, limbs, byDay, leaves, tulips };
  cache.set(key, out);
  return out;
}

// ---- Gün durumları ----
/** Dizi (gün-1 dizinli) veya {gün: durum} haritası; eksik = future. */
export type DayStates = ReadonlyArray<DayState> | Readonly<Record<number, DayState>>;
export const stateOf = (states: DayStates, day: number): DayState => (Array.isArray(states) ? (states as ReadonlyArray<DayState>)[day - 1] : (states as Record<number, DayState>)[day]) ?? 'future';

/** Paket gününden durum dizisi: geçen gün done (rest/curl listelenenler ayrı), bugün today (assumeDoneToday ise done), sonrası future. */
export function makeDayStates(goalDays: number, day: number, o: { assumeDoneToday?: boolean; rest?: number[]; curl?: number[] } = {}): DayState[] {
  const out: DayState[] = [];
  for (let i = 1; i <= goalDays; i++) {
    out.push(i > day ? 'future' : i === day ? (o.assumeDoneToday ? 'done' : 'today') : o.curl?.includes(i) ? 'curl' : o.rest?.includes(i) ? 'rest' : 'done');
  }
  return out;
}

/** Bir günün hangi çizimle çizileceği. Paylaşılan yüzeyde (mini) rest/curl tam yaprak; kriz'de bugün de mürekkep (tuvaldeki gibi). */
export function lookOf(state: DayState, variant: SceneVariant): Look {
  switch (state) {
    case 'future': return 'pencil';
    case 'today': return variant === 'home' ? 'today' : 'ink';
    case 'curl': return variant === 'mini' ? 'ink' : 'curl';
    default: return 'ink'; // done, rest
  }
}

export interface PlantItem { place: Place; look: Look; rest: boolean }
export function classify(layout: Layout, states: DayStates): PlantItem[] {
  return layout.byDay.map(place => {
    const s = stateOf(states, place.day);
    return { place, look: lookOf(s, layout.variant), rest: s === 'rest' && layout.variant !== 'mini' };
  });
}

/** Gövdenin mürekkep çizdiği "gün" konumu: bugün varsa gün-0,5, yoksa son geçen gün. */
export function progressDay(layout: Layout, states: DayStates): number {
  let last = 0;
  for (let i = 1; i <= layout.goalDays; i++) {
    const s = stateOf(states, i);
    if (s === 'today') return i - 0.5;
    if (s !== 'future') last = i;
  }
  return last;
}

function smoothD(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = 'M' + r1(pts[0].x) + ' ' + r1(pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    d += ' Q' + r1(pts[i].x) + ' ' + r1(pts[i].y) + ' ' + r1(mx) + ' ' + r1(my);
  }
  const l = pts[pts.length - 1];
  return d + ' L' + r1(l.x) + ' ' + r1(l.y);
}
function seg(layout: Layout, limb: Limb, a: number, b: number): string {
  if (b <= a) return '';
  const g = layout.geo, n = Math.max(2, Math.round((b - a) * 40)), pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const p = limbPoint(g, limb, a + (b - a) * i / n), [dx, dy] = field(p.x, p.y, g.wob, 4);
    pts.push({ x: p.x + dx, y: p.y + dy });
  }
  return smoothD(pts);
}

export interface StemPaths { ink: string[]; pen: string[]; shootInk: string; shootPen: string }
const stemCache = new Map<string, StemPaths>();
/** Gövde/dal yolları: ilerleme (gün cinsinden) kadarı mürekkep, kalanı kurşun kesikli. Sürgünler lale durumuna göre. */
export function stemPaths(layout: Layout, pd: number, states: DayStates): StemPaths {
  const key = layout.goalDays + '|' + layout.variant + '|' + pd;
  const hit = stemCache.get(key);
  let base = hit;
  if (!base) {
    const ink: string[] = [], pen: string[] = [];
    for (const limb of layout.limbs) {
      const m = pd - limb.startDay;
      const tNow = m <= 0 ? 0 : Math.min(1, m / limb.days * 0.97 + 0.02);
      ink.push(m <= 0 ? '' : seg(layout, limb, 0, tNow));
      pen.push(seg(layout, limb, tNow, 1));
    }
    base = { ink, pen, shootInk: '', shootPen: '' };
    if (stemCache.size > 400) stemCache.clear();
    stemCache.set(key, base);
  }
  let shootInk = '', shootPen = '';
  for (const tp of layout.tulips) { if (stateOf(states, tp.day) === 'future') shootPen += tp.shoot; else shootInk += tp.shoot; }
  return { ink: base.ink, pen: base.pen, shootInk, shootPen };
}

/** "bugün" el notunun konumu (sahne kutusu koordinatı) ve yönü; bugün yoksa null. */
export function todayNote(layout: Layout, states: DayStates): { x: number; y: number; left: boolean } | null {
  for (const pl of layout.byDay) {
    if (stateOf(states, pl.day) !== 'today') continue;
    const left = pl.side < 0;
    return pl.kind === 'tulip'
      ? { x: left ? pl.left - 92 : pl.left + 44, y: pl.top + 8, left }
      : { x: left ? pl.left - 108 : pl.left + 82, y: pl.top - 6, left };
  }
  return null;
}

/** Erişilebilirlik özeti için sayımlar. */
export function summarize(layout: Layout, states: DayStates): { day: number; goal: number; tulips: number; curled: number } {
  let day = 0, tulips = 0, curled = 0;
  for (const pl of layout.byDay) {
    const s = stateOf(states, pl.day);
    if (s !== 'future') { day = pl.day; if (pl.kind === 'tulip') tulips++; if (s === 'curl' && layout.variant !== 'mini') curled++; }
  }
  return { day, goal: layout.goalDays, tulips, curled };
}

export { apply };
