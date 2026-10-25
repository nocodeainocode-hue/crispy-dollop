import React, { useMemo } from 'react';
import { Animated } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { c } from '../../theme';
import { CRISIS, ROOTS_DEMO } from './paths';
import { isReduced, rootGrowAnim, useRootGrowth, useRootProgress } from './motion';
import { field, pathLength, warpPath } from './wobble';

const AP = Animated.createAnimatedComponent(Path);
type Spec = { d: string; w: number; len: number; s: number; e: number; delay: number };

// Kökler soil bölgesi koordinatında; titreme (feDisplacementMap scale 2.2) yola pişirilir. Hayalet kök aynı yolu kullanır (tuvalde de aynı filtre).
const bake = (d: string) => warpPath(d, (x, y) => { const [dx, dy] = field(x, y, 0.84, 4); return [x + dx, y + dy]; });
const SET_CRISIS: Spec[] = CRISIS.roots.map(r => { const d = bake(r.d); return { d, w: r.w, len: pathLength(d) + 1, s: r.s, e: r.e, delay: 0 }; });
const SET_DEMO: Spec[] = ROOTS_DEMO.roots.map(r => { const d = bake(r.d); return { d, w: r.w, len: pathLength(d) + 1, s: 0, e: 1, delay: r.delay }; });

export type RootSet = 'crisis' | 'demo';
export const ROOT_BOX = { crisis: { w: CRISIS.w, h: CRISIS.soilH }, demo: { w: ROOTS_DEMO.w, h: ROOTS_DEMO.h } } as const;

/**
 * Kökler (Svg İÇİNDE <G>): kurşun kesikli hayalet kök + üstüne mürekkep kök; kök, strokeDashoffset ile sırayla uzar.
 *  set 'crisis': ilerleme `prog` (0..1, geçen süre / toplam süre) ile; her kökün kendi penceresi var (tuvaldeki seg(s,e)); sayı verilirse
 *    değişimde 1 sn doğrusal geçişle yaklaşır, Animated.Value verilirse doğrudan sürer.
 *  set 'demo' (Hareket "Köklenme"): kendi kendine, her kök 4,8 sn ease-out, 0 / .6 / 1,4 / 2,4 sn gecikmeyle; `play`/`k` ile yeniden oynar.
 * Hareket azaltılmışsa: crisis süreye göre sabit çizilir; demo %65 uzamış durağan halde.
 */
export const RootsLayer = React.memo(function RootsLayer({ set = 'crisis', prog = 0, play = true, k = 0 }: { set?: RootSet; prog?: number | Animated.Value; play?: boolean; k?: unknown }) {
  const specs = set === 'crisis' ? SET_CRISIS : SET_DEMO;
  const p = useRootProgress(prog);
  const clock = useRootGrowth(play && set === 'demo', k);
  const reduced = isReduced();
  const offsets = useMemo(() => specs.map(sp => {
    if (set === 'crisis') return p.interpolate({ inputRange: [sp.s, sp.e], outputRange: [sp.len, 0], extrapolate: 'clamp' });
    return rootGrowAnim(clock, sp.delay).interpolate({ inputRange: [0, 1], outputRange: [sp.len, 0] });
  }), [set, p, clock]);
  return (
    <G>
      {specs.map((sp, i) => <Path key={'g' + i} d={sp.d} fill="none" stroke={c.fg} strokeWidth={1.6} strokeLinecap="round" strokeDasharray={[3, 5]} opacity={0.4} />)}
      {specs.map((sp, i) => (
        <AP key={'r' + i} d={sp.d} fill="none" stroke={c.fg} strokeWidth={sp.w} strokeLinecap="round" strokeDasharray={[sp.len, sp.len]}
          strokeDashoffset={set === 'demo' && reduced ? sp.len * 0.35 : (offsets[i] as unknown as number)} />
      ))}
    </G>
  );
});

/** Tek başına kökler (Galeri / kesit). */
export function Roots({ set = 'crisis', prog = 0, play = true, k = 0, scale = 1 }: { set?: RootSet; prog?: number | Animated.Value; play?: boolean; k?: unknown; scale?: number }) {
  const { w, h } = ROOT_BOX[set];
  return (
    <Svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`}>
      <RootsLayer set={set} prog={prog} play={play} k={k} />
    </Svg>
  );
}
