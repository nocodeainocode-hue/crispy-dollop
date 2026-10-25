// Saf TS (React Native içe aktarımı yok). Tuvaldeki el çizimi titremesinin "pişirilmiş" hali.
// Tuvalde titreme SVG filtresiyle (feTurbulence baseFrequency .03, feDisplacementMap scale 2.2-2.4) yapılır; react-native-svg filtre
// desteklemez. Burada aynı etki, yol koordinatlarına uygulanan küçük, yumuşak ve DETERMİNİSTİK bir kayma alanıyla verilir
// (dalga boyu ~33 px = 1/.03, genlik ≈ scale·0,38 px). Math.random yok: aynı girdi her cihazda aynı yolu verir.

/** SVG afin matrisi [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Mat = readonly [number, number, number, number, number, number];
export type Pt = { x: number; y: number };

export const IDENT: Mat = [1, 0, 0, 1, 0, 0];
export const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
export const trans = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const scaleM = (sx: number, sy: number = sx): Mat => [sx, 0, 0, sy, 0, 0];
export const rotM = (deg: number): Mat => {
  const r = (deg * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  return [co, si, -si, co, 0, 0];
};
export const apply = (m: Mat, x: number, y: number): Pt => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
export const r1 = (n: number) => Math.round(n * 10) / 10;
export const r2 = (n: number) => Math.round(n * 100) / 100;
/** RN-SVG `transform` için 6'lı dizi (doğrusal kısım 4, öteleme 2 ondalık). */
export const mat6 = (m: Mat): [number, number, number, number, number, number] => [Math.round(m[0] * 1e4) / 1e4, Math.round(m[1] * 1e4) / 1e4, Math.round(m[2] * 1e4) / 1e4, Math.round(m[3] * 1e4) / 1e4, r2(m[4]), r2(m[5])];

/** Kayma alanı: (x, y) noktasında [dx, dy]. `amp` piksel genliği; `seed` farklı yapraklara farklı biçim verir. */
export function field(x: number, y: number, amp: number, seed = 0): [number, number] {
  const p = seed * 1.7;
  const dx = Math.sin(x * 0.19 + y * 0.11 + p) * 0.6 + Math.sin(y * 0.23 - x * 0.07 + p * 1.3 + 1.1) * 0.4;
  const dy = Math.sin(y * 0.17 - x * 0.12 + p * 0.9 + 2.3) * 0.6 + Math.sin(x * 0.21 + y * 0.09 + p * 1.1 + 0.5) * 0.4;
  return [dx * amp, dy * amp];
}

// ---- Yol çözümleyici: M m L l H h V v C c S s Q q Z z -> mutlak M/L/C/Q/Z ----
export type Cmd = { t: 'M' | 'L' | 'C' | 'Q' | 'Z'; v: number[] };
const NUM = /[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g;

export function parsePath(d: string): Cmd[] {
  const tok = d.match(NUM) ?? [];
  const out: Cmd[] = [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = '', lastC: [number, number] | null = null;
  const n = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase();
    const u = cmd.toUpperCase();
    if (u === 'Z') { out.push({ t: 'Z', v: [] }); cx = sx; cy = sy; lastC = null; continue; }
    if (u === 'M') {
      let x = n(), y = n();
      if (rel) { x += cx; y += cy; }
      out.push({ t: 'M', v: [x, y] }); cx = sx = x; cy = sy = y; cmd = rel ? 'l' : 'L'; lastC = null;
    } else if (u === 'L') {
      let x = n(), y = n();
      if (rel) { x += cx; y += cy; }
      out.push({ t: 'L', v: [x, y] }); cx = x; cy = y; lastC = null;
    } else if (u === 'H') {
      let x = n(); if (rel) x += cx;
      out.push({ t: 'L', v: [x, cy] }); cx = x; lastC = null;
    } else if (u === 'V') {
      let y = n(); if (rel) y += cy;
      out.push({ t: 'L', v: [cx, y] }); cy = y; lastC = null;
    } else if (u === 'C') {
      const a = [n(), n(), n(), n(), n(), n()];
      if (rel) for (let k = 0; k < 6; k += 2) { a[k] += cx; a[k + 1] += cy; }
      out.push({ t: 'C', v: a }); lastC = [a[2], a[3]]; cx = a[4]; cy = a[5];
    } else if (u === 'S') {
      const a = [n(), n(), n(), n()];
      if (rel) for (let k = 0; k < 4; k += 2) { a[k] += cx; a[k + 1] += cy; }
      const r1x = lastC ? 2 * cx - lastC[0] : cx, r1y = lastC ? 2 * cy - lastC[1] : cy;
      out.push({ t: 'C', v: [r1x, r1y, a[0], a[1], a[2], a[3]] }); lastC = [a[0], a[1]]; cx = a[2]; cy = a[3];
    } else if (u === 'Q') {
      const a = [n(), n(), n(), n()];
      if (rel) for (let k = 0; k < 4; k += 2) { a[k] += cx; a[k + 1] += cy; }
      out.push({ t: 'Q', v: a }); cx = a[2]; cy = a[3]; lastC = null;
    } else { i++; } // desteklenmeyen komut: atla
  }
  return out;
}

/** Her noktaya `fn` uygulayıp yolu yeniden yazar (2 ondalık). */
export function mapPath(cmds: Cmd[], fn: (x: number, y: number) => [number, number]): string {
  let s = '';
  for (const c of cmds) {
    if (c.t === 'Z') { s += 'Z'; continue; }
    const v: number[] = [];
    for (let k = 0; k < c.v.length; k += 2) { const [x, y] = fn(c.v[k], c.v[k + 1]); v.push(r2(x), r2(y)); }
    s += (s ? ' ' : '') + c.t + v.join(' ');
  }
  return s;
}

/** Yolu yerel uzayda titreştirir (yaprak/lale/saksı gibi küçük biçimler için). */
export function wobblePath(d: string, amp: number, seed = 0): string {
  return mapPath(parsePath(d), (x, y) => { const [dx, dy] = field(x, y, amp, seed); return [x + dx, y + dy]; });
}

/** Yolu sahne uzayında verilen matris + alan ile dönüştürür. */
export function warpPath(d: string, fn: (x: number, y: number) => [number, number]): string {
  return mapPath(parsePath(d), fn);
}

/** Yaklaşık yol uzunluğu (strokeDasharray ile "çizilme" için; react-native-svg pathLength desteklemez). */
export function pathLength(d: string): number {
  const cmds = parsePath(d);
  let len = 0, cx = 0, cy = 0, sx = 0, sy = 0;
  for (const c of cmds) {
    if (c.t === 'M') { cx = sx = c.v[0]; cy = sy = c.v[1]; }
    else if (c.t === 'L') { len += Math.hypot(c.v[0] - cx, c.v[1] - cy); cx = c.v[0]; cy = c.v[1]; }
    else if (c.t === 'Z') { len += Math.hypot(sx - cx, sy - cy); cx = sx; cy = sy; }
    else if (c.t === 'C') {
      let px = cx, py = cy;
      for (let s = 1; s <= 24; s++) {
        const t = s / 24, u = 1 - t;
        const x = u * u * u * cx + 3 * u * u * t * c.v[0] + 3 * u * t * t * c.v[2] + t * t * t * c.v[4];
        const y = u * u * u * cy + 3 * u * u * t * c.v[1] + 3 * u * t * t * c.v[3] + t * t * t * c.v[5];
        len += Math.hypot(x - px, y - py); px = x; py = y;
      }
      cx = c.v[4]; cy = c.v[5];
    } else {
      let px = cx, py = cy;
      for (let s = 1; s <= 16; s++) {
        const t = s / 16, u = 1 - t;
        const x = u * u * cx + 2 * u * t * c.v[0] + t * t * c.v[2];
        const y = u * u * cy + 2 * u * t * c.v[1] + t * t * c.v[3];
        len += Math.hypot(x - px, y - py); px = x; py = y;
      }
      cx = c.v[2]; cy = c.v[3];
    }
  }
  return len;
}
