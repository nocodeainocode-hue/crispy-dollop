import { useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import { Animated, Easing } from 'react-native';
import { Path } from 'react-native-svg';
import { c } from '../../theme';
import { ND, dur } from '../../components/motion';

// Yardımcı çizimlerin ortak altyapısı: tuvaldeki "el çizimi titreme" (feTurbulence + feDisplacementMap) yol koordinatlarına
// pişirilir; ölçü/yol yardımcıları; hareketi azalt kontrolü; döngü kancası. Math.random yok: her çağrı aynı sonucu verir.

/** Sistem "hareketi azalt" açık mı? (motion.tsx'teki `reduce` dışa açık değil; dur(1) onu yansıtır.) */
export const isReduced = () => dur(1) === 0;

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Animated.createAnimatedComponent(Path): strokeDashoffset / opacity sürmek için (useNativeDriver: false). */
export const APath = Animated.createAnimatedComponent(Path) as unknown as ComponentType<any>;

/** Tuvaldeki `.ink` / `.inkf`: mürekkep çizgisi (yuvarlak uç ve birleşim). Renk render anında c.fg'den okunur. */
export const inkP = (w = 2) => ({ stroke: c.fg, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

// ------------------------------------------------------------------ gürültü (feTurbulence benzeri)
function h2(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul((seed | 0) + 1, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
const fade = (t: number) => t * t * (3 - 2 * t);
function vnoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = fade(x - x0), fy = fade(y - y0);
  const a = h2(x0, y0, seed), b = h2(x0 + 1, y0, seed), cc = h2(x0, y0 + 1, seed), d = h2(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * fx) * (1 - fy) + (cc + (d - cc) * fx) * fy;
}
/** baseFrequency .03, 2 oktav: 0..1 arası yumuşak alan (ortalama .5). */
export function turb(x: number, y: number, seed: number): number {
  return (vnoise(x * 0.03, y * 0.03, seed) + 0.5 * vnoise(x * 0.06 + 17, y * 0.06 + 31, seed + 5)) / 1.5;
}

// ------------------------------------------------------------------ yol ayrıştırma
type Seg = { t: 'M' | 'L' | 'C' | 'Q' | 'Z'; p: number[] };

/** SVG yol verisini mutlak M/L/C/Q/Z dizisine çevirir. Yay (a/A) içeren yollar desteklenmez (null). */
function parseAbs(d: string): Seg[] | null {
  if (/[aA]/.test(d)) return null;
  const toks = d.match(/[MmLlHhVvCcSsQqTtZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!toks) return [];
  const out: Seg[] = [];
  let i = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0, lx = 0, ly = 0, last = '';
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/^[A-Za-z]$/.test(toks[i])) cmd = toks[i++];
    else if (cmd === '') return null;
    const rel = cmd === cmd.toLowerCase();
    const K = cmd.toUpperCase();
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    if (K === 'Z') { out.push({ t: 'Z', p: [] }); cx = sx; cy = sy; last = 'Z'; continue; }
    if (K === 'M' || K === 'L') {
      const x = num() + ox, y = num() + oy;
      out.push({ t: K, p: [x, y] });
      cx = x; cy = y; last = K;
      if (K === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
    } else if (K === 'H') {
      const x = num() + ox; out.push({ t: 'L', p: [x, cy] }); cx = x; last = 'L';
    } else if (K === 'V') {
      const y = num() + oy; out.push({ t: 'L', p: [cx, y] }); cy = y; last = 'L';
    } else if (K === 'C') {
      const a = num() + ox, b = num() + oy, e = num() + ox, f = num() + oy, x = num() + ox, y = num() + oy;
      out.push({ t: 'C', p: [a, b, e, f, x, y] }); lx = e; ly = f; cx = x; cy = y; last = 'C';
    } else if (K === 'S') {
      const e = num() + ox, f = num() + oy, x = num() + ox, y = num() + oy;
      const a = last === 'C' ? 2 * cx - lx : cx, b = last === 'C' ? 2 * cy - ly : cy;
      out.push({ t: 'C', p: [a, b, e, f, x, y] }); lx = e; ly = f; cx = x; cy = y; last = 'C';
    } else if (K === 'Q') {
      const a = num() + ox, b = num() + oy, x = num() + ox, y = num() + oy;
      out.push({ t: 'Q', p: [a, b, x, y] }); lx = a; ly = b; cx = x; cy = y; last = 'Q';
    } else if (K === 'T') {
      const x = num() + ox, y = num() + oy;
      const a = last === 'Q' ? 2 * cx - lx : cx, b = last === 'Q' ? 2 * cy - ly : cy;
      out.push({ t: 'Q', p: [a, b, x, y] }); lx = a; ly = b; cx = x; cy = y; last = 'Q';
    } else return null;
  }
  return out;
}

const cache = new Map<string, string>();

/**
 * Tuvaldeki `.wob` filtresini (feTurbulence baseFrequency .03, 2 oktav + feDisplacementMap scale) yol koordinatlarına pişirir.
 * Yer değiştirme tuvaldeki gibi iki eksende de aynı değerdir (varsayılan kanal A) ve svg uzayındaki konuma bağlıdır; düz çizgiler
 * ~22 birimde bir bölünür ki titreme eğriye dönüşsün. Sabit giriş -> sabit çıkış (Math.random yok).
 */
export function wob(d: string, scale = 2, seed = 4): string {
  const key = `${seed}|${scale}|${d}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const segs = parseAbs(d);
  if (!segs) return d;
  const dp = (x: number, y: number) => { const k = scale * (turb(x, y, seed) - 0.5); return `${r2(x + k)} ${r2(y + k)}`; };
  let out = '', px = 0, py = 0, sx = 0, sy = 0;
  const line = (x: number, y: number) => {
    const len = Math.hypot(x - px, y - py);
    const n = Math.max(1, Math.ceil(len / 22));
    for (let k = 1; k <= n; k++) out += `L${dp(px + ((x - px) * k) / n, py + ((y - py) * k) / n)}`;
  };
  for (const s of segs) {
    const p = s.p;
    if (s.t === 'M') { out += `M${dp(p[0], p[1])}`; px = p[0]; py = p[1]; sx = px; sy = py; }
    else if (s.t === 'L') { line(p[0], p[1]); px = p[0]; py = p[1]; }
    else if (s.t === 'C') { out += `C${dp(p[0], p[1])} ${dp(p[2], p[3])} ${dp(p[4], p[5])}`; px = p[4]; py = p[5]; }
    else if (s.t === 'Q') { out += `Q${dp(p[0], p[1])} ${dp(p[2], p[3])}`; px = p[2]; py = p[3]; }
    else { if (Math.hypot(sx - px, sy - py) > 0.01) line(sx, sy); out += 'Z'; px = sx; py = sy; }
  }
  cache.set(key, out);
  return out;
}

/** Yolun yaklaşık uzunluğu (strokeDasharray ile "çizilerek belirme" için). */
export function pathLen(d: string): number {
  const segs = parseAbs(d);
  if (!segs) return 0;
  let len = 0, px = 0, py = 0, sx = 0, sy = 0;
  for (const s of segs) {
    const p = s.p;
    if (s.t === 'M') { px = p[0]; py = p[1]; sx = px; sy = py; }
    else if (s.t === 'L') { len += Math.hypot(p[0] - px, p[1] - py); px = p[0]; py = p[1]; }
    else if (s.t === 'C') {
      let ax = px, ay = py;
      for (let k = 1; k <= 24; k++) {
        const t = k / 24, u = 1 - t;
        const x = u * u * u * px + 3 * u * u * t * p[0] + 3 * u * t * t * p[2] + t * t * t * p[4];
        const y = u * u * u * py + 3 * u * u * t * p[1] + 3 * u * t * t * p[3] + t * t * t * p[5];
        len += Math.hypot(x - ax, y - ay); ax = x; ay = y;
      }
      px = p[4]; py = p[5];
    } else if (s.t === 'Q') {
      let ax = px, ay = py;
      for (let k = 1; k <= 16; k++) {
        const t = k / 16, u = 1 - t;
        const x = u * u * px + 2 * u * t * p[0] + t * t * p[2];
        const y = u * u * py + 2 * u * t * p[1] + t * t * p[3];
        len += Math.hypot(x - ax, y - ay); ax = x; ay = y;
      }
      px = p[2]; py = p[3];
    } else { len += Math.hypot(sx - px, sy - py); px = sx; py = sy; }
  }
  return len;
}

// ------------------------------------------------------------------ temel biçimler (yaya göre kübik Bezier)
const KAPPA = 0.5523;
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const kx = KAPPA * rx, ky = KAPPA * ry;
  return `M${cx + rx} ${cy}C${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry}C${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy}C${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry}C${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy}Z`;
}
export function rectPath(x: number, y: number, w: number, h: number, r = 0): string {
  const k = KAPPA * r;
  return `M${x + r} ${y}H${x + w - r}C${x + w - r + k} ${y} ${x + w} ${y + r - k} ${x + w} ${y + r}V${y + h - r}C${x + w} ${y + h - r + k} ${x + w - r + k} ${y + h} ${x + w - r} ${y + h}H${x + r}C${x + r - k} ${y + h} ${x} ${y + h - r + k} ${x} ${y + h - r}V${y + r}C${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y}Z`;
}

// ------------------------------------------------------------------ hareket
/**
 * Sonsuz 0->1->0 döngü (her yön `halfMs`). Hareketi azalt açıksa döngü ÇALIŞMAZ ve değer `rest`te kalır (son/durağan kare).
 * Dönüş: Animated.Value (transform/opacity için interpolate et; ND ile yerel sürücü).
 */
export function useLoop(halfMs: number, rest = 0, easing: (t: number) => number = Easing.inOut(Easing.ease), enabled = true): Animated.Value {
  const v = useRef(new Animated.Value(rest)).current;
  useEffect(() => {
    if (!enabled || isReduced()) { v.setValue(rest); return; }
    v.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: dur(halfMs), easing, useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: dur(halfMs), easing, useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [halfMs, enabled]);
  return v;
}

/** CSS cubic-bezier(.5,0,.9,.6) ve ease-out (0,0,.58,1) karşılıkları. */
export const BEZ_FALL = Easing.bezier(0.5, 0, 0.9, 0.6);
export const BEZ_OUT = Easing.bezier(0, 0, 0.58, 1);
