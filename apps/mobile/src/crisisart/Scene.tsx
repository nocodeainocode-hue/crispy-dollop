import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing, Text } from 'react-native';
import { c, F, alpha } from '../theme';
import { ND, dur } from '../components/motion';
import { Bud, Leaf, Pt, Seg, TulipHead, bezier, clamp, jit, stemPoint } from './geometry';

// Kriz KESİT SAHNESİ: üstte gökyüzü, altında toprak; bir bitki ve altında kökler. Hepsi View (SVG yok).
//  - Bitki dürtü dalgasında sallanır: en çok MAX_SWAY derece, devrilmez. Genlik süreyle zarf gibi değişir (tepe ~%32, sonda ~%13).
//  - Kökler süre ilerledikçe sırayla uzar (10 sn'lik adımlarla; ara değer yok).
//  - Hareketi azalt açıkken bitki sabit (sonsuz döngü hiç başlamaz).
export const MAX_SWAY = 11;
export const PROG_STEPS = 90; // 15 dk / 10 sn

const reduced = () => dur(1) === 0;
const STOPS = Array.from({ length: 17 }, (_, i) => i / 16);
const SIN = STOPS.map(s => Math.sin(s * Math.PI * 2));
/** Dalga zarfı: başta orta, ~%32'de tepe (1), sonda ~%13. */
export const envelope = (p: number) => (p < 0.32 ? 0.35 + 0.65 * (p / 0.32) : 1 - 0.87 * ((p - 0.32) / 0.68));

/** İki yavaş sinüs x zarf. Hepsi native sürücüde; JS'e hiçbir değer taşınmaz. Ekran başına tam iki sonsuz döngü. */
function useSway(prog: number) {
  const amp = useRef(new Animated.Value(0)).current;
  const u1 = useRef(new Animated.Value(0)).current;
  const u2 = useRef(new Animated.Value(0)).current;
  const still = reduced();
  useEffect(() => {
    if (still) { amp.setValue(0); return; }
    const a = Animated.timing(amp, { toValue: envelope(prog) * MAX_SWAY, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [prog, still]);
  useEffect(() => {
    if (still) return;
    const l1 = Animated.loop(Animated.timing(u1, { toValue: 1, duration: 5300, easing: Easing.linear, useNativeDriver: ND }));
    const l2 = Animated.loop(Animated.timing(u2, { toValue: 1, duration: 8900, easing: Easing.linear, useNativeDriver: ND }));
    l1.start(); l2.start();
    return () => { l1.stop(); l2.stop(); };
  }, [still]);
  return useMemo(() => {
    const o1 = u1.interpolate({ inputRange: STOPS, outputRange: SIN });
    const o2 = u2.interpolate({ inputRange: STOPS, outputRange: SIN });
    const mix = Animated.add(Animated.multiply(o1, 0.62), Animated.multiply(o2, 0.38));
    return Animated.multiply(mix, amp).interpolate({ inputRange: [-MAX_SWAY, MAX_SWAY], outputRange: [`-${MAX_SWAY}deg`, `${MAX_SWAY}deg`], extrapolate: 'clamp' });
  }, []);
}

// Kök yolları (kübik Bézier kontrol noktaları, kök dibi (0,0), birim: 150 yükseklikli toprak). [başlangıç, bitiş] = ilerleme penceresi.
const P = (x: number, y: number): Pt => ({ x, y });
const ROOTS: { pts: [Pt, Pt, Pt, Pt]; s: number; e: number; w: number }[] = [
  { pts: [P(0, 2), P(-2, 38), P(6, 68), P(0, 112)], s: 0, e: 0.55, w: 4.2 },
  { pts: [P(0, 26), P(-20, 36), P(-40, 40), P(-58, 54)], s: 0, e: 0.3, w: 3.2 },
  { pts: [P(2, 50), P(22, 56), P(42, 62), P(58, 78)], s: 0.05, e: 0.36, w: 3.2 },
  { pts: [P(0, 80), P(-20, 90), P(-34, 100), P(-46, 122)], s: 0.15, e: 0.5, w: 3.2 },
  { pts: [P(1, 98), P(20, 108), P(34, 120), P(42, 140)], s: 0.3, e: 0.72, w: 3.2 },
  { pts: [P(-1, 6), P(-8, 16), P(-22, 18), P(-32, 28)], s: 0, e: 0.2, w: 3 },
];
const ROOT_N = 8;
const ROOT_SAMPLES = ROOTS.map(r => bezier(r.pts, ROOT_N));

export type SceneProps = {
  day: number;       // paket günü (1 tabanlı)
  goal: number;      // paket günü sayısı
  prog: number;      // 0..1 kriz ilerlemesi (üst bileşen 10 sn adımına yuvarlar)
  rooting: string;   // toprak bandındaki el notu (<=3 kelime)
  steps?: string[];  // gökyüzünde el notları (yer varsa; her biri <=3 kelime)
};

function SceneImpl({ day, goal, prog, rooting, steps }: SceneProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const rot = useSway(prog);
  const { w, h } = size;

  const gy = Math.round(h * 0.6);                 // zemin çizgisi
  const gw = Math.round(Math.min(w * 0.5, 190));  // bitki grubu genişliği
  const gh = Math.max(40, gy - 4);                // bitki grubu yüksekliği
  const cx = Math.round(w * 0.7);
  const s = clamp(gh / 230, 0.5, 1.15);
  const soilH = h - gy;
  const rk = clamp(Math.min(soilH / 150, w / 330), 0.3, 1.2);

  const plant = useMemo(() => {
    if (!w) return null;
    const nInk = clamp(Math.min(day, 30), 1, 30);
    const nPen = clamp(Math.max(0, goal - day), 0, 5);
    const M = nInk + nPen;
    const t = (i: number) => 0.04 + 0.92 * ((i + 0.5) / M);
    const tNow = 0.04 + 0.92 * (nInk / M);
    const tEnd = nPen ? Math.min(1, t(M - 1) + 0.04) : tNow;
    const out: React.ReactNode[] = [];
    // gövde: dolu çizgi (geçen), kesik kurşun (gelecek)
    const N = 22;
    for (let j = 0; j < N; j++) {
      const t0 = (j / N) * tEnd, t1 = ((j + 1) / N) * tEnd;
      const a = stemPoint(t0, gw, gh), b = stemPoint(t1, gw, gh);
      if ((t0 + t1) / 2 <= tNow) out.push(<Seg key={`s${j}`} a={a} b={b} w={Math.max(2.6, 3.6 * s)} color={c.fg} />);
      else if (j % 2 === 0) out.push(<Seg key={`s${j}`} a={a} b={b} w={2} color={c.edge} opacity={0.8} />);
    }
    const startDay = Math.max(1, day - nInk + 1);
    for (let i = 0; i < M; i++) {
      const isInk = i < nInk;
      const dayNum = isInk ? startDay + i : day + (i - nInk) + 1;
      const tt = t(i), p = stemPoint(tt, gw, gh);
      const side: 1 | -1 = i % 2 ? 1 : -1, j = jit(dayNum);
      const k = (1.08 - 0.52 * tt) * (1 + j * 0.14) * s;
      const kind = isInk ? 'ink' : 'pencil';
      if (dayNum % 7 === 0) {
        // her 7. gün: kısa dal + lale
        const tip: Pt = { x: p.x + side * 30 * k, y: p.y - 30 * k };
        out.push(<Seg key={`b${i}`} a={p} b={tip} w={2.2} color={isInk ? c.fg : c.edge} opacity={isInk ? 1 : 0.8} />);
        const q = clamp(1.05 * (k + 0.1), 0.6, 1.4);
        out.push(<TulipHead key={`t${i}`} q={q} kind={kind} left={tip.x - 11 * q * 1.1} top={tip.y - 21 * q * 1.05} />);
      } else {
        const lw = 42 * k, lh = 20 * k;
        out.push(<Leaf key={`l${i}`} w={lw} h={lh} kind={kind} flip={side} rot={j * 22 - 8} left={side === 1 ? p.x : p.x - lw} top={p.y - lh} />);
      }
    }
    const top = stemPoint(tNow, gw, gh);
    out.push(<Bud key="bud" s={s} left={top.x - 6.5 * s} top={top.y - 15 * s} />);
    return out;
  }, [w, gw, gh, s, day, goal]);

  const roots = useMemo(() => {
    if (!w || soilH < 30) return null;
    const out: React.ReactNode[] = [];
    ROOTS.forEach((r, ri) => {
      const pts = ROOT_SAMPLES[ri].map(p => ({ x: cx + p.x * rk, y: gy + p.y * rk }));
      const q = clamp((prog - r.s) / (r.e - r.s), 0, 1) * ROOT_N;
      for (let i = 0; i < ROOT_N; i++) {
        const a = pts[i], b = pts[i + 1];
        const f = clamp(q - i, 0, 1);
        if (f <= 0) { if (i % 2 === 0) out.push(<Seg key={`g${ri}-${i}`} a={a} b={b} w={1.6} color={c.fg} opacity={0.3} />); continue; }
        const bb = f >= 1 ? b : { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
        out.push(<Seg key={`r${ri}-${i}`} a={a} b={bb} w={Math.max(2, r.w * rk)} color={c.fg} />);
      }
    });
    return out;
  }, [w, soilH, cx, gy, rk, prog]);

  return (
    <View style={{ flex: 1, minHeight: 110, overflow: 'hidden' }} onLayout={e => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}>
      {!!w && <>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: gy, backgroundColor: c.sky }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: gy, bottom: 0, backgroundColor: c.soil }} />
        {/* toprakta taşlar */}
        {soilH >= 50 && [[0.1, 0.35, 22, 12], [0.86, 0.5, 18, 10], [0.2, 0.78, 20, 11]].map(([fx, fy, sw, sh], i) => (
          <View key={i} pointerEvents="none" style={{ position: 'absolute', left: w * fx, top: gy + soilH * fy, width: sw, height: sh, backgroundColor: alpha(c.fg, 0.14), borderWidth: 1.4, borderColor: alpha(c.fg, 0.7), borderTopLeftRadius: sh * 0.6, borderTopRightRadius: sh * 0.5, borderBottomRightRadius: sh * 0.55, borderBottomLeftRadius: sh * 0.45 }} />
        ))}
        {roots}
        {/* zemin çizgisi ve çimen */}
        <View pointerEvents="none" style={{ position: 'absolute', left: -4, right: -4, top: gy - 1.5, height: 3, borderRadius: 2, backgroundColor: c.fg }} />
        {[-26, -12, 16, 30].map((dx, i) => (
          <View key={i} pointerEvents="none" style={{ position: 'absolute', left: cx + dx, top: gy - 11, width: 2, height: 10, borderRadius: 1, backgroundColor: c.fg, transform: [{ rotate: `${(i % 2 ? 1 : -1) * (14 + i * 4)}deg` }] }} />
        ))}
        {/* bitki: alt-orta pivot (transformOrigin'e bağlı değil): [+h/2, döndür, -h/2] */}
        <Animated.View importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: cx - gw / 2, top: gy - gh, width: gw, height: gh, transform: [{ translateY: gh / 2 }, { rotate: rot }, { translateY: -gh / 2 }] }}>
          {plant}
        </Animated.View>
        {/* el notları */}
        {!!steps && steps.length > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 16, top: 10, maxWidth: Math.max(120, cx - gw / 2 - 12) }}>
            {steps.map(t => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <View style={{ width: 7, height: 6, marginRight: 8, backgroundColor: c.fg, opacity: 0.55, borderTopLeftRadius: 4, borderTopRightRadius: 3, borderBottomRightRadius: 4, borderBottomLeftRadius: 2 }} />
                <Text maxFontSizeMultiplier={1.2} style={{ flexShrink: 1, fontFamily: F.hand, fontSize: 23, lineHeight: 28, color: c.fg }}>{t}</Text>
              </View>
            ))}
          </View>
        )}
        {soilH >= 42 && (
          <Text maxFontSizeMultiplier={1.2} style={{ position: 'absolute', left: 16, bottom: 8, fontFamily: F.hand, fontSize: 24, lineHeight: 28, color: c.fg }}>{rooting}</Text>
        )}
      </>}
    </View>
  );
}

const CrisisScene = React.memo(SceneImpl);
export default CrisisScene;
