// Bitki yerleşiminin tek kaynağı. Saf TypeScript: React Native içe aktarımı YOK, Math.random YOK.
// Aynı hedef gün sayısı için herkeste aynı bitki çıkar. Yerleşim yalnızca hedefe (goal) bağlıdır; gün durumu ayrıca hesaplanır.
// Tasarım: docs/TASARIM-BAHCE-PLANI.md bölüm 5.2 (Bahçe tuvali Main.dc.html ile birebir sayılar).
//
// Koordinat uzayı: 340 x 400 birimlik kutu; gövde tabanı y=360, tepe y=40. Çizen bileşen `s` ile ölçekler.

export type Pt = { x: number; y: number };
export type Stage = 'tohum' | 'filiz' | 'fidan' | 'agac';
/** tamam: büyümüş yaprak. bugun: bekleyen tomurcuk. gelecek: kesik taslak. zor: yaprak silinmez, kenarı kıvrılır. */
export type DayState = 'tamam' | 'bugun' | 'gelecek' | 'zor';

export const BOX = { w: 340, h: 400 } as const;
export const LIMB_DAYS = 30;
const AMP = 36, TOP = 40, BOT = 360, CX = BOX.w / 2, SC = 1.36;
const RAD = Math.PI / 180;

/** ≤7 tohum (deneme), ≤30 Filiz, ≤60 Fidan, diğerleri Ağaç. */
export const stageFor = (goal: number): Stage => (goal <= 7 ? 'tohum' : goal <= 30 ? 'filiz' : goal <= 60 ? 'fidan' : 'agac');

/** Her 7. paket günü yaprak yerine lale açar. */
export const isTulipDay = (day: number) => day > 0 && day % 7 === 0;
/** Kaçıncı lale (1'den), lale günü değilse 0. */
export const tulipNo = (day: number) => (isTulipDay(day) ? day / 7 : 0);
/** Verilen güne kadar açan lale sayısı. */
export const tulipsUpTo = (day: number) => Math.floor(Math.max(0, day) / 7);

/** Tamsayı karışımıyla deterministik sapma, [-0.5, 0.5). (sin tabanlı kesir motorlar arası farklı çıkabilir.) */
export function jit(i: number): number {
  let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) % 10000) / 10000 - 0.5;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const trunkAt = (t: number): Pt => ({ x: CX + AMP * Math.sin(6.4 * t + 0.55) * (1 - 0.42 * t), y: BOT - t * (BOT - TOP) });

export type Limb = {
  id: number;
  from: number;   // ilk gün
  to: number;     // son gün
  span: number;   // t normalizasyonunda kullanılan gün sayısı
  scale: number;  // yaprak ölçeği çarpanı
  at: (t: number) => Pt; // t: 0 (taban) .. 1 (uç)
};

const BRANCH_T = [0.4, 0.58, 0.28, 0.7, 0.2, 0.8]; // dalın gövdeden çıktığı yükseklik (t)

/** Gövde ve (Fidan/Ağaç'ta) her 30 günde bir dal. Dal 1 sol, dal 2 sağ, sonrası dönüşümlü. */
export function limbsFor(goal: number): Limb[] {
  const stage = stageFor(goal);
  if (stage === 'tohum' || stage === 'filiz') return [{ id: 0, from: 1, to: goal, span: goal, scale: 1, at: trunkAt }];
  const n = Math.ceil(goal / LIMB_DAYS);
  const base = stage === 'fidan' ? 0.9 : 0.78;
  const limbs: Limb[] = [{ id: 0, from: 1, to: LIMB_DAYS, span: LIMB_DAYS, scale: base, at: trunkAt }];
  for (let m = 1; m < n; m++) {
    const dir = m % 2 ? -1 : 1;
    const S = trunkAt(BRANCH_T[(m - 1) % BRANCH_T.length]);
    const E: Pt = { x: clamp(S.x + dir * 100, 28, BOX.w - 28), y: TOP + 16 + ((m - 1) % 3) * 30 };
    const C: Pt = { x: clamp(S.x + dir * 64, 20, BOX.w - 20), y: S.y - 10 };
    limbs.push({
      id: m, from: m * LIMB_DAYS + 1, to: Math.min(goal, (m + 1) * LIMB_DAYS), span: LIMB_DAYS, scale: base * (m > 2 ? 0.9 : 1),
      at: u => ({ x: (1 - u) * (1 - u) * S.x + 2 * (1 - u) * u * C.x + u * u * E.x, y: (1 - u) * (1 - u) * S.y + 2 * (1 - u) * u * C.y + u * u * E.y }),
    });
  }
  return limbs;
}

export type Item = {
  day: number; limb: number; tulip: boolean; side: 1 | -1; t: number;
  ax: number; ay: number;     // gövdeye bağlandığı nokta
  cx: number; cy: number;     // çizilen View'ın merkezi
  w: number; h: number;       // View boyutu (döndürülmeden önce)
  rot: number;                // React Native rotate (derece, saat yönü pozitif)
  tipX: number; tipY: number; // yaprak ucu / lale tepesi
  dx: number; dy: number;     // yaprağın birim yön vektörü (lale için 0)
  bx: number; by: number;     // lale tabanı (yaprakta = ax, ay)
};

export type Layout = { goal: number; stage: Stage; limbs: Limb[]; items: Item[] };
const cache = new Map<number, Layout>();

/** 1..goal günü için yerleşim. Sonuç önbelleklenir; çağıran değiştirmemeli. */
export function buildLayout(goalIn: number): Layout {
  const goal = Math.max(1, Math.round(goalIn));
  const hit = cache.get(goal);
  if (hit) return hit;
  const limbs = limbsFor(goal);
  const items: Item[] = [];
  for (const limb of limbs) {
    for (let day = limb.from; day <= limb.to; day++) {
      const m = day - limb.from;
      const t = ((m + 0.5) / limb.span) * 0.97 + 0.02;
      const a = limb.at(t);
      const side: 1 | -1 = day % 2 ? 1 : -1;
      const j = jit(day);
      const k0 = (1.08 - 0.52 * t) * (1 + j * 0.14);
      if (isTulipDay(day)) {
        const tx = a.x + side * 34 * k0, ty = a.y - 34 * k0;
        const St = 1.2 * (k0 + 0.12) * Math.sqrt(limb.scale);
        const W = 28 * St, H = 38 * St;
        const bx = tx, by = ty - 8;
        const rot = side * (8 + (j + 0.5) * 6);
        const sr = Math.sin(rot * RAD), cr = Math.cos(rot * RAD);
        items.push({
          day, limb: limb.id, tulip: true, side, t, ax: a.x, ay: a.y,
          cx: bx + sr * (H / 2), cy: by - cr * (H / 2), w: W, h: H, rot,
          tipX: bx + sr * H, tipY: by - cr * H, dx: 0, dy: 0, bx: tx, by: ty,
        });
      } else {
        const k = k0 * SC * limb.scale;
        const w = 46 * k, h = 22 * k;
        const r = -(34 + (j + 0.5) * 22) * RAD;
        const dx = side * Math.cos(r), dy = Math.sin(r);
        items.push({
          day, limb: limb.id, tulip: false, side, t, ax: a.x, ay: a.y,
          cx: a.x + dx * (w / 2), cy: a.y + dy * (w / 2), w, h, rot: Math.atan2(dy, dx) / RAD,
          tipX: a.x + dx * w, tipY: a.y + dy * w, dx, dy, bx: a.x, by: a.y,
        });
      }
    }
  }
  const out = { goal, stage: stageFor(goal), limbs, items };
  cache.set(goal, out);
  return out;
}

/** Bugünün (kontrolü bekleyen ya da yeni açılan) öğesi; hedef aşıldıysa son gün. */
export const itemFor = (layout: Layout, day: number): Item | undefined => layout.items[clamp(day, 1, layout.goal) - 1];

/** Gün durumu. Geçen gün (tekrar oynama yoksa) tamamdır; utandıran "boş" gün yoktur. */
export function dayState(i: number, ctx: { today: number; doneToday: boolean; hard: ReadonlySet<number> }): DayState {
  if (i > ctx.today) return 'gelecek';
  if (i === ctx.today && !ctx.doneToday) return 'bugun';
  return ctx.hard.has(i) ? 'zor' : 'tamam';
}
export function dayStates(goal: number, ctx: { today: number; doneToday: boolean; hard: ReadonlySet<number> }): DayState[] {
  return Array.from({ length: goal }, (_, i) => dayState(i + 1, ctx));
}

/** Dalın bugüne kadar "mürekkep" olan kısmı (0: henüz başlamadı, 1: uca kadar). */
export function limbT(limb: Limb, today: number, doneToday: boolean): number {
  const dd = today - limb.from + 1 - (doneToday ? 0 : 0.5);
  if (dd <= 0) return 0;
  return Math.min(1, (dd / limb.span) * 0.97 + 0.02);
}

export type Seg = { cx: number; cy: number; len: number; deg: number };

/** Dalın [t0, t1] aralığını kısa doğru parçalarına böler (her parça bir View). */
export function stemSegs(limb: Limb, t0: number, t1: number, step = 18): Seg[] {
  if (t1 <= t0 + 1e-6) return [];
  let len = 0, prev = limb.at(t0);
  for (let i = 1; i <= 24; i++) { const p = limb.at(t0 + ((t1 - t0) * i) / 24); len += Math.hypot(p.x - prev.x, p.y - prev.y); prev = p; }
  const n = Math.max(1, Math.ceil(len / step));
  const out: Seg[] = [];
  let a = limb.at(t0);
  for (let i = 1; i <= n; i++) {
    const b = limb.at(t0 + ((t1 - t0) * i) / n);
    out.push({ cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, len: Math.hypot(b.x - a.x, b.y - a.y), deg: Math.atan2(b.y - a.y, b.x - a.x) / RAD });
    a = b;
  }
  return out;
}

/** Lale günü kısa sürgün (gövde noktasından lale tabanına). */
export function shootSeg(it: Item): Seg {
  const dx = it.bx - it.ax, dy = it.by - it.ay;
  return { cx: (it.ax + it.bx) / 2, cy: (it.ay + it.by) / 2, len: Math.hypot(dx, dy), deg: Math.atan2(dy, dx) / RAD };
}

/** n. lale için sıra sayısı sözcüğü gibi yazılar i18n'dedir; burada yalnızca sayılar. */
export const gardenCounts = (goal: number, day: number, hard: ReadonlySet<number>) => {
  let curled = 0;
  hard.forEach(d => { if (d <= day && d >= 1) curled++; });
  return { tulips: tulipsUpTo(Math.min(day, goal)), curled };
};
