import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { c } from '../theme';
import { ND, dur } from '../components/motion';
import { buildLayout, dayState, limbT, stemSegs, shootSeg, itemFor, BOX, type Item, type DayState, type Seg } from './core';

// "PlantLite": görsel dosyası olmayan, yalnızca View ile çizilen bitki. Yerleşim core.ts'ten gelir.
// Geçen gün: sage dolgu + mürekkep çizgi. Bugün: hardal tomurcuk (nabız). Gelecek: kesik kurşun taslak.
// Zor gün: yaprak silinmez; kenarı kıvrılır (döndürülmüş, farklı köşe, kıvrık uç).

/** Bugünün tomurcuğu için nabız: 3,6 sn'lik devir, en çok 6 devir. Hareketi azalt açıkken durağan. */
export function useBudPulse(active: boolean, cycles = 6, cycleMs = 3600) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const half = dur(cycleMs / 2);
    if (!active || half === 0) { v.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
    ]), { iterations: cycles });
    loop.start();
    return () => loop.stop();
  }, [active]);
  return v;
}

// Yaprak köşe yarıçapları (22 birimlik yüksekliğe oranla): her gün için deterministik, asimetrik.
const SHAPES = [[3, 17, 5, 17], [17, 4, 17, 5], [5, 15, 6, 15], [15, 5, 15, 6]] as const;
const CURL = [11, 3, 11, 3] as const;
function leafRadii(day: number, h: number, curl: boolean) {
  const q = curl ? CURL : SHAPES[day % 4], f = h / 22;
  return { borderTopLeftRadius: q[0] * f, borderTopRightRadius: q[1] * f, borderBottomRightRadius: q[2] * f, borderBottomLeftRadius: q[3] * f };
}

type Geo = { s: number; bw: number; ox?: number; oy?: number };

function segView(sg: Seg, k: string, thick: number, color: string, g: Geo, opacity = 1) {
  const w = (sg.len + thick * 0.8) * g.s;
  return <View key={k} style={{ position: 'absolute', left: sg.cx * g.s - w / 2 - (g.ox ?? 0), top: sg.cy * g.s - thick / 2 - (g.oy ?? 0), width: w, height: thick, borderRadius: thick / 2, backgroundColor: color, opacity, transform: [{ rotate: `${sg.deg}deg` }] }} />;
}

/** Yaprak (bugün için tomurcuk: 0,62 ölçek, hardal). `g.ox/oy`: çocuk olarak konulacağı çapanın kaydırması. */
function leafView(it: Item, st: DayState, k: string, g: Geo, animatedStyle?: any) {
  const bud = st === 'bugun', curl = st === 'zor';
  const f = bud ? 0.62 : 1;
  const w = it.w * f * g.s, h = it.h * f * g.s;
  const mx = it.ax + it.dx * (it.w * f) / 2, my = it.ay + it.dy * (it.w * f) / 2; // çapadan uca doğru
  const base: any = {
    position: 'absolute', left: mx * g.s - w / 2 - (g.ox ?? 0), top: my * g.s - h / 2 - (g.oy ?? 0), width: w, height: h,
    ...leafRadii(it.day, h, curl),
  };
  const rot = `${it.rot + (curl ? 14 * it.side : 0)}deg`;
  if (st === 'gelecek') return <View key={k} style={[base, { borderWidth: Math.max(1.2, g.bw * 0.8), borderStyle: 'dashed', borderColor: c.edge, opacity: 0.85, transform: [{ rotate: rot }] }]} />;
  const fill = bud ? c.mustard : c.sage;
  const tf = animatedStyle ? [{ rotate: rot }, animatedStyle] : [{ rotate: rot }];
  const Node: any = animatedStyle ? Animated.View : View;
  return (
    <Node key={k} style={[base, { backgroundColor: fill, borderWidth: g.bw, borderColor: c.fg, transform: tf }]}>
      {curl && <View style={{ position: 'absolute', right: -h * 0.1, top: -h * 0.28, width: h * 0.62, height: h * 0.62, borderRadius: h * 0.14, backgroundColor: c.sageWash, borderWidth: Math.max(1.2, g.bw * 0.8), borderColor: c.fg, transform: [{ rotate: '28deg' }] }} />}
    </Node>
  );
}

function petal(k: string, u: number, x: number, y: number, w: number, h: number, rot: number, r: readonly [number, number, number, number], fill: string, bw: number, dashed = false) {
  return <View key={k} style={{
    position: 'absolute', left: x * u, top: y * u, width: w * u, height: h * u, backgroundColor: dashed ? 'transparent' : fill,
    borderWidth: bw, borderColor: dashed ? c.edge : c.fg, borderStyle: dashed ? 'dashed' : 'solid',
    borderTopLeftRadius: r[0] * u, borderTopRightRadius: r[1] * u, borderBottomRightRadius: r[2] * u, borderBottomLeftRadius: r[3] * u,
    transform: [{ rotate: `${rot}deg` }],
  }} />;
}

/** Lale: 3 taç yaprağı (bugün: kapalı hardal tomurcuk, gelecek: kesik taslak, zor: boynu eğik). */
function tulipView(it: Item, st: DayState, k: string, g: Geo, animatedStyle?: any) {
  const W = it.w * g.s, H = it.h * g.s, u = W / 28;
  const bw = Math.max(1.2, g.bw * 0.85);
  const tilt = st === 'zor' ? 18 * it.side : 0;
  const rot = `${it.rot + tilt}deg`;
  const wrap: any = { position: 'absolute', left: it.cx * g.s - W / 2 - (g.ox ?? 0), top: it.cy * g.s - H / 2 - (g.oy ?? 0), width: W, height: H };
  let kids: React.ReactNode;
  if (st === 'gelecek') kids = petal('f', u, 7.5, 3, 13, 30, 0, [2, 10, 5, 6], c.tulip, bw, true);
  else if (st === 'bugun') kids = petal('b', u, 7.5, 7, 13, 26, 0, [2, 10, 6, 6], c.mustard, bw);
  else kids = [
    petal('l', u, 1, 8, 12, 26, -16, [10, 2, 6, 6], c.tulip, bw),
    petal('r', u, 15, 8, 12, 26, 16, [2, 10, 6, 6], c.tulip, bw),
    petal('c', u, 8.5, 2, 11, 30, 0, [2, 9, 5, 6], c.tulip, bw),
  ];
  const tf = animatedStyle ? [{ rotate: rot }, animatedStyle] : [{ rotate: rot }];
  const Node: any = animatedStyle ? Animated.View : View;
  return <Node key={k} style={[wrap, { transform: tf }]}>{kids}</Node>;
}

const itemView = (it: Item, st: DayState, k: string, g: Geo, anim?: any) => (it.tulip ? tulipView(it, st, k, g, anim) : leafView(it, st, k, g, anim));

/** Tek öğe için hareketli sarmalayıcı: çapa noktasında 1x1'lik bir View; çocuk bunun etrafında ölçeklenir. */
function Anchored({ it, st, g, style, kid }: { it: Item; st: DayState; g: Geo; style: any; kid: (g: Geo) => React.ReactNode }) {
  const px = (it.tulip ? it.bx : it.ax) * g.s, py = (it.tulip ? it.by : it.ay) * g.s;
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: px, top: py, width: 1, height: 1 }, style]}>{kid({ ...g, ox: px, oy: py })}</Animated.View>;
}

/** Bugünün tomurcuğu: nabız atar (en çok 6 devir). */
function Bud({ it, g, pulse }: { it: Item; g: Geo; pulse: boolean }) {
  const v = useBudPulse(pulse);
  const sc = { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }) };
  return <>{itemView(it, 'bugun', 'bud', g, sc)}</>;
}

export type PlantProps = {
  goal: number;
  day: number;            // bugünün paket günü (1..goal)
  doneToday: boolean;     // bugünün kontrolü yapıldı mı (yaprak açık)
  hard: readonly number[]; // zor (tekrar oynama) günleri
  s: number;              // ölçek: kutu BOX.w*s x BOX.h*s
  opening?: Animated.Value; // 0→1: bugünün yaprağı/lalesi ölçek+opaklıkla açılır (Gün tamam)
  pulse?: boolean;        // bugünün tomurcuğu nabız atsın
};

/**
 * Bitki. Sahne (gövde, taslaklar, geçen yapraklar) tek kez hesaplanıp memolanır; yalnızca bugünün öğesi ayrı ve canlıdır.
 * Yeniden çizim yalnızca hedef, gün, durum, ölçek ya da tema değişince olur.
 */
function PlantImpl({ goal, day, doneToday, hard, s, opening, pulse = true }: PlantProps) {
  const hardKey = hard.join(',');
  const themeKey = c.bg; // tema değişince App içeriği yeniden kurar; yine de anahtar olarak kullanılır
  const today = Math.min(Math.max(1, day), goal);
  const layout = useMemo(() => buildLayout(goal), [goal]);
  const bw = Math.max(1.5, 2 * s);
  const g: Geo = { s, bw };

  const stat = useMemo(() => {
    const hs = new Set(hard);
    const nodes: React.ReactNode[] = [];
    const thick = Math.max(2, 3.2 * s);
    // Gövde / dallar: mürekkep (bugüne kadar) + kurşun (sonrası)
    for (const limb of layout.limbs) {
      const tNow = limbT(limb, today, doneToday);
      stemSegs(limb, 0, tNow).forEach((sg, i) => nodes.push(segView(sg, `si${limb.id}-${i}`, thick, c.fg, g)));
      stemSegs(limb, tNow, 1).forEach((sg, i) => nodes.push(segView(sg, `sp${limb.id}-${i}`, Math.max(1.5, 1.8 * s), c.edge, g, 0.7)));
    }
    const live = (it: Item, st: DayState) => it.day === today && ((st === 'bugun' && pulse) || (!!opening && st !== 'bugun'));
    for (const it of layout.items) {
      const st = dayState(it.day, { today, doneToday, hard: hs });
      if (it.tulip) nodes.push(segView(shootSeg(it), `sh${it.day}`, Math.max(1.8, 2.4 * s), st === 'gelecek' ? c.edge : c.fg, g, st === 'gelecek' ? 0.7 : 1));
      if (live(it, st)) continue; // bugünün canlı öğesi aşağıda ayrı çizilir
      nodes.push(itemView(it, st, `it${it.day}`, g));
    }
    return nodes;
  }, [layout, today, doneToday, hardKey, s, themeKey, pulse, !!opening]);

  const it = itemFor(layout, today);
  const hs = useMemo(() => new Set(hard), [hardKey]);
  const st = it ? dayState(it.day, { today, doneToday, hard: hs }) : 'tamam';
  return (
    <View pointerEvents="none" style={{ width: BOX.w * s, height: BOX.h * s }} collapsable={false}>
      {stat}
      {it && st === 'bugun' && pulse && <Bud it={it} g={g} pulse />}
      {it && opening && st !== 'bugun' && (
        <Anchored it={it} st={st} g={g}
          style={{ opacity: opening, transform: [{ scale: opening.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}
          kid={gg => itemView(it, st, 'open', gg)} />
      )}
    </View>
  );
}

export const PlantLite = React.memo(PlantImpl, (a, b) => a.goal === b.goal && a.day === b.day && a.doneToday === b.doneToday && a.s === b.s && a.opening === b.opening && a.pulse === b.pulse && a.hard.join(',') === b.hard.join(','));
