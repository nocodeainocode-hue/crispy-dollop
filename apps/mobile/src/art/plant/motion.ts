// Bitki hareketi: tuvaldeki (Main/GunTamam/Kriz/Hareket) süre ve easing değerleri BİREBİR. Hepsi dur() ile sarılı;
// hareketi-azalt açıkken süre 0'dır ve sonsuz döngüler hiç başlamaz (son/durağan kare gösterilir).
// Mimari: sahnede TEK saat değeri (sanal ms) ve her parça kendi aralığını interpolate eder; yaprak başına Animated.Value yok.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { ND, dur } from '../../components/motion';

type Interp = Animated.AnimatedInterpolation<number>;

/** Hareketi-azalt açık mı (dur() 0 verir). */
export const isReduced = () => dur(1) === 0;

/** Tuvaldeki süreler (ms). */
export const MS = {
  unfurl: 1600, bloom: 1900, budOut: 1400, halo: 3400, pulse: 3600, introLeaf: 700, introTulip: 800,
  rootDemo: 4800, rootStep: 1000, sway: 7000, swayDone: 8000, gust: 28000, drift: 46000, wind: 3000,
} as const;
/** Üst sınırlar (kural): nabız en çok 6 devir; sallanma en çok 11 derece. */
export const PULSE_MAX_CYCLES = 6;
export const SWAY_MAX_DEG = 11;
/** Yaprak açılışında (Hareket.dc.html) açılırken 38 derece sallanarak oturur; GunTamam'da bu yok. */
export const UNFURL_SWING = 38;

const bez = Easing.bezier;
export const EZ = {
  unfurl: bez(0.2, 0.8, 0.2, 1),
  bloom: bez(0.2, 0.9, 0.3, 1.15),
  ease: bez(0.25, 0.1, 0.25, 1),
  inOut: bez(0.42, 0, 0.58, 1),
  out: bez(0, 0, 0.58, 1),
  linear: Easing.linear,
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const bloomClamped = (x: number) => Math.min(1, EZ.bloom(x));

/** Aralığı yinelenen noktalar olmadan kurar (start=0 ise baştaki kopya düşer). */
function ip(clock: Animated.Value, stops: Array<[number, number]>, easing: (x: number) => number): Interp {
  const pts: Array<[number, number]> = [];
  for (const s of stops) { const last = pts[pts.length - 1]; if (last && last[0] === s[0] && last[1] === s[1]) continue; pts.push(s); }
  return clock.interpolate({ inputRange: pts.map(p => p[0]), outputRange: pts.map(p => p[1]), extrapolate: 'clamp', easing });
}

// ---- Sahne saati ----
/** 0 -> total (sanal ms) doğrusal. Kapalıysa veya hareket azaltılmışsa doğrudan son değer. `k` değişince yeniden oynar. */
export function useSceneClock(total: number, enabled = true, k: unknown = 0): { clock: Animated.Value; done: boolean } {
  const run = enabled && !isReduced();
  const clock = useRef(new Animated.Value(run ? 0 : total)).current;
  const [done, setDone] = useState(!run);
  useEffect(() => {
    if (!enabled || isReduced()) { clock.setValue(total); setDone(true); return; }
    clock.setValue(0); setDone(false);
    const a = Animated.timing(clock, { toValue: total, duration: dur(total), easing: EZ.linear, useNativeDriver: false });
    a.start(({ finished }) => { if (finished) setDone(true); });
    return () => a.stop();
  }, [enabled, k, total]);
  return { clock, done };
}

// ---- Parça animasyon kurucuları (saat üzerinde) ----
export interface UnfurlAnim { scale: Interp; rotation: Interp; opacity: Interp }
/** Yaprak açılışı: 1,6 sn, cubic-bezier(.2,.8,.2,1); ölçek .1->1, opaklık 0->1 (%60'ta), 38° sallanma (Hareket). */
export function unfurlAnim(clock: Animated.Value, start = 0, swing: number = UNFURL_SWING): UnfurlAnim {
  const a = start, b = start + MS.unfurl;
  return {
    scale: ip(clock, [[0, 0.1], [a, 0.1], [b, 1]], EZ.unfurl),
    rotation: ip(clock, [[0, swing], [a, swing], [b, 0]], EZ.unfurl),
    opacity: ip(clock, [[0, 0], [a, 0], [a + MS.unfurl * 0.6, 1], [b, 1]], EZ.unfurl),
  };
}
export interface BloomAnim { budOpacity: Interp; scale: Interp; opacity: Interp; haloOpacity: Interp; haloScale: Interp }
/** Lale açılışı: tomurcuk 1,4 sn solar; açık lale 1,9 sn, cubic-bezier(.2,.9,.3,1.15) (hafif aşma), .25->1. Halka: tek seferlik 3,4 sn. */
export function bloomAnim(clock: Animated.Value, start = 0): BloomAnim {
  const b = start + MS.bloom, h = start + 200;
  return {
    budOpacity: ip(clock, [[0, 1], [start, 1], [start + MS.budOut * 0.6, 0], [start + MS.budOut, 0]], EZ.ease),
    scale: ip(clock, [[0, 0.25], [start, 0.25], [b, 1]], EZ.bloom),
    opacity: ip(clock, [[0, 0], [start, 0], [b, 1]], bloomClamped),
    haloOpacity: ip(clock, [[0, 0], [h, 0], [h + MS.halo * 0.35, 0.95], [h + MS.halo, 0]], EZ.inOut),
    haloScale: ip(clock, [[0, 0.7], [h, 0.7], [h + MS.halo * 0.35, 1.05], [h + MS.halo, 1.25]], EZ.inOut),
  };
}
export interface IntroAnim { scale: Interp; opacity: Interp }
/** Ana ekran girişi (leafIn): yaprak .7 sn, lale .8 sn; ölçek .15->1, opaklık 0->1; cubic-bezier(.2,.8,.2,1); gecikme gün sırasına göre. */
export function introAnim(clock: Animated.Value, delay: number, tulip = false): IntroAnim {
  const e = delay + (tulip ? MS.introTulip : MS.introLeaf);
  return { scale: ip(clock, [[0, 0.15], [delay, 0.15], [e, 1]], EZ.unfurl), opacity: ip(clock, [[0, 0], [delay, 0], [e, 1]], EZ.unfurl) };
}
/** Ana ekran giriş gecikmesi: 150 + gün·38 ms; büyük hedeflerde (60/90) son yaprak 30. günün gecikmesini geçmez. */
export const introDelay = (day: number, doneCount: number) => Math.round(150 + day * Math.min(38, (30 * 38) / Math.max(30, doneCount)));
export const introTotal = (maxDelay: number) => maxDelay + MS.introTulip;

// ---- Kancalar ----
/** Yaprak açılışı (1,6 sn). Dönüş AnimatedG'ye verilecek scale/rotation/opacity. `k` değişince yeniden oynar. */
export function useLeafUnfurl(play = true, k: unknown = 0, swing: number = UNFURL_SWING): UnfurlAnim {
  const { clock } = useSceneClock(MS.unfurl, play, k);
  return useMemo(() => unfurlAnim(clock, 0, swing), [clock, swing]);
}
/** Lale açılışı (1,9 sn, hafif aşma) + tek seferlik halka. */
export function useTulipBloom(play = true, k: unknown = 0): BloomAnim {
  const { clock } = useSceneClock(200 + MS.halo, play, k);
  return useMemo(() => bloomAnim(clock, 0), [clock]);
}
/** Tomurcuk nabzı: 3,6 sn döngü (yarısı büyür, yarısı döner), ölçek 1 -> 1,09, EN ÇOK 6 devir; sonra durur. Hareket azaltılmışsa hiç çalışmaz. */
export function useBudPulse(enabled = true, k: unknown = 0): Interp {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    if (!enabled || isReduced()) return;
    const half = dur(MS.pulse / 2);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: half, easing: EZ.inOut, useNativeDriver: false }),
        Animated.timing(v, { toValue: 0, duration: half, easing: EZ.inOut, useNativeDriver: false }),
      ]),
      { iterations: PULSE_MAX_CYCLES },
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, k]);
  return useMemo(() => v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }), [v]);
}

/** CSS anahtar kareleri (yüzde, derece) -> örneklenmiş doğrusal aralık; her aralıkta easing önceden pişirilir (yerel sürücü easing'li interpolate'i desteklemez). */
function bakeFrames(frames: ReadonlyArray<readonly [number, number]>, easing: (x: number) => number, samples = 8) {
  const input: number[] = [], output: string[] = [];
  for (let i = 0; i < frames.length - 1; i++) {
    const [p0, d0] = frames[i], [p1, d1] = frames[i + 1];
    for (let s = 0; s < samples; s++) { const f = s / samples; input.push((p0 + (p1 - p0) * f) / 100); output.push(Math.round((d0 + (d1 - d0) * easing(f)) * 1000) / 1000 + 'deg'); }
  }
  const [pl, dl] = frames[frames.length - 1];
  input.push(pl / 100); output.push(dl + 'deg');
  return { input, output };
}
/** Sakin esinti (Ana ekran ±0,9°, 7 sn; Gün tamam ±0,7°, 8 sn) ve kriz rüzgârı (28 sn, en çok 11°). */
export const GUST_FRAMES: ReadonlyArray<readonly [number, number]> = [[0, 0], [8, -3], [16, 4], [24, -6], [32, 8], [40, -10], [48, 11], [56, -9], [64, 7], [72, -5], [80, 3], [90, -1.5], [100, 0]];
export type SwayKind = 'calm' | 'gust';
/**
 * Sallanma stili (Animated.View style'ına yayılır; yerel sürücü). Dönüş boşsa ({}), hareket yok.
 * Dönme merkezi gövdenin tabanı: View'a transformOrigin '50% 100%' ver (SwayView bunu yapar).
 */
export function useSway(kind: SwayKind = 'calm', o: { deg?: number; ms?: number; enabled?: boolean } = {}): { transform?: Array<{ rotate: Animated.AnimatedInterpolation<string> }> } {
  const v = useRef(new Animated.Value(0)).current;
  const on = (o.enabled ?? true) && !isReduced();
  const ms = o.ms ?? (kind === 'gust' ? MS.gust : MS.sway);
  const deg = Math.min(SWAY_MAX_DEG, o.deg ?? 0.9);
  const baked = useMemo(
    () => (kind === 'gust' ? bakeFrames(GUST_FRAMES, EZ.inOut, 6) : bakeFrames([[0, -deg], [50, deg], [100, -deg]], EZ.inOut, 10)),
    [kind, deg],
  );
  useEffect(() => {
    v.setValue(0);
    if (!on) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur(ms), easing: EZ.linear, useNativeDriver: ND }));
    loop.start();
    return () => loop.stop();
  }, [on, ms, kind]);
  const rot = useMemo(() => v.interpolate({ inputRange: baked.input, outputRange: baked.output }), [v, baked]);
  return on ? { transform: [{ rotate: rot }] } : {};
}

/** Bulut kayması: -14 -> 18 px, 46 sn ease-in-out, gidip gelir (alternate). Hareket azaltılmışsa durur. */
export function useDrift(ms: number = MS.drift, enabled = true): { transform?: Array<{ translateX: Animated.AnimatedInterpolation<number> }> } {
  const v = useRef(new Animated.Value(0)).current;
  const on = enabled && !isReduced();
  useEffect(() => {
    v.setValue(0);
    if (!on) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: dur(ms), easing: EZ.inOut, useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: dur(ms), easing: EZ.inOut, useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [on, ms]);
  const x = useMemo(() => v.interpolate({ inputRange: [0, 1], outputRange: [-14, 18] }), [v]);
  return on ? { transform: [{ translateX: x }] } : {};
}

/**
 * Kök ilerlemesi (kriz): prog 0..1 (geçen süre / toplam süre). Sayı verilirse her değişimde 1 sn doğrusal geçişle (tuvaldeki
 * transition: stroke-dashoffset 1s linear) yaklaşır; Animated.Value verilirse aynen kullanılır. Hareket azaltılmışsa anında.
 */
export function useRootProgress(prog: number | Animated.Value): Animated.Value {
  const own = useRef(new Animated.Value(typeof prog === 'number' ? prog : 0)).current;
  useEffect(() => {
    if (typeof prog !== 'number') return;
    const a = Animated.timing(own, { toValue: prog, duration: dur(MS.rootStep), easing: EZ.linear, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [typeof prog === 'number' ? prog : 0]);
  return typeof prog === 'number' ? own : prog;
}
/** Kök uzaması (Hareket "Köklenme" demosu): her kök 4,8 sn ease-out, sıralı gecikmeli. Dönen saat sanal ms'dir. */
export function useRootGrowth(play = true, k: unknown = 0, total = 2400 + MS.rootDemo): Animated.Value {
  return useSceneClock(total, play, k).clock;
}
/** Kökün çizilme ilerlemesi (0..1) saat üzerinde. */
export const rootGrowAnim = (clock: Animated.Value, delay: number): Interp => ip(clock, [[0, 0], [delay, 0], [delay + MS.rootDemo, 1]], EZ.out);

/** Rüzgâr çizgisi: strokeDasharray [50,110] kaydırma; tek döngü değeri (3 sn), gecikmeler faz kaydırmasıyla (dash periyodu 160). */
export function useWind(enabled = true): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;
  const on = enabled && !isReduced();
  useEffect(() => {
    v.setValue(0);
    if (!on) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur(MS.wind), easing: EZ.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [on]);
  return v;
}
export function windOffset(v: Animated.Value, delayMs: number): Interp {
  const d = clamp01(delayMs / MS.wind) || 0.0001;
  return v.interpolate({ inputRange: [0, d, d + 0.0001, 1], outputRange: [-160 * (1 - d), -160, 0, -160 * (1 - d)] });
}
