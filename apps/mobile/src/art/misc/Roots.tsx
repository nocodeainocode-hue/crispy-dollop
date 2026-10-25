import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { c } from '../../theme';
import { APath, BEZ_OUT, inkP, isReduced, pathLen, wob } from './ink';
import { dur } from '../../components/motion';
import { useProgress, type Progress } from './Sprout';

// KÖKLER. İki tuval kaynağı:
//  1) Kriz.dc.html: 390x158 kesit, 6 kök (genişlik 4.4 / 3.2 / 3.2 / 3.2 / 3.2 / 3), her biri kriz ilerlemesinin bir aralığında uzar
//     (r0 0-.55, r1 0-.3, r2 .05-.36, r3 .15-.5, r4 .3-.72, r5 0-.2); arkada kesik "hayalet" yollar (3 5 kesik, 1.6, opaklık .4). wob scale 2.2.
//  2) Hareket.dc.html "Köklenme": 4 kök, her biri 4.8 sn ease-out, gecikmeler 0 / .6 / 1.4 / 2.4 sn; hareketi azalt: %65 çizili sabit.

const KRIZ = [
  { d: 'M270 4 C268 40 276 70 270 114', w: 4.4, s: 0, e: 0.55 },
  { d: 'M270 28 C250 38 230 42 212 56', w: 3.2, s: 0, e: 0.3 },
  { d: 'M272 52 C292 58 312 64 328 80', w: 3.2, s: 0.05, e: 0.36 },
  { d: 'M270 82 C250 92 236 102 224 124', w: 3.2, s: 0.15, e: 0.5 },
  { d: 'M271 100 C290 110 304 122 312 142', w: 3.2, s: 0.3, e: 0.72 },
  { d: 'M269 8 C262 18 248 20 238 30', w: 3, s: 0, e: 0.2 },
].map(r => ({ ...r, d: wob(r.d, 2.2), len: pathLen(r.d) }));

const DEMO = [
  { d: 'M178 62 C176 90 184 112 178 146', w: 4, delay: 0 },
  { d: 'M178 80 C158 90 140 94 124 108', w: 3, delay: 0.6 },
  { d: 'M180 100 C200 106 218 112 232 128', w: 3, delay: 1.4 },
  { d: 'M178 120 C160 130 150 140 142 160', w: 3, delay: 2.4 },
].map(r => ({ ...r, d: wob(r.d, 2.2), len: pathLen(r.d) }));

/**
 * Kriz kökleri (390x158 kesit koordinatı). progress 0..1 (kriz ilerlemesi) sayı ya da JS sürücülü Animated.Value; kökler sırayla uzar.
 * Hareketi azalt açıkken de ilerlemeye göre sabit çizilir (tuval: "kökler süreye göre sabit çizilir").
 */
export const Roots = memo(function Roots({ progress, width = 390, height = 158, style }: { progress: Progress; width?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  const p = useProgress(progress);
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={width} height={height} viewBox="0 0 390 158">
        <G>
          {KRIZ.map((r, i) => <Path key={'g' + i} d={r.d} fill="none" {...inkP(1.6)} strokeDasharray={[3, 5]} opacity={0.4} />)}
          {KRIZ.map((r, i) => (
            <APath
              key={i}
              d={r.d}
              fill="none"
              {...inkP(r.w)}
              strokeDasharray={[r.len, r.len]}
              strokeDashoffset={p.interpolate({ inputRange: [r.s, r.e], outputRange: [r.len, 0], extrapolate: 'clamp' })}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
});

/**
 * "Köklenme" demosu (Hareket sayfası): 4 kök, 4.8 sn ease-out, gecikmeli. `playKey` değişince yeniden çizilir. Koordinat uzayı 356x180 sahne.
 */
export const RootsGrow = memo(function RootsGrow({ playKey = 0, width = 356, height = 180, style }: { playKey?: number | string; width?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = isReduced();
  const t = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (isReduced()) { t.setValue(1); return; }
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration: dur(7200), easing: Easing.linear, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [playKey]);
  const lines = useMemo(() => DEMO, []);
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={width} height={height} viewBox="0 0 356 180">
        {lines.map((r, i) => <Path key={'g' + i} d={r.d} fill="none" {...inkP(1.6)} strokeDasharray={[3, 5]} opacity={0.4} />)}
        {lines.map((r, i) => (
          <APath
            key={i}
            d={r.d}
            fill="none"
            {...inkP(r.w)}
            strokeDasharray={[r.len, r.len]}
            strokeDashoffset={reduced ? r.len * 0.35 : t.interpolate({ inputRange: [r.delay / 7.2, (r.delay + 4.8) / 7.2], outputRange: [r.len, 0], easing: BEZ_OUT, extrapolate: 'clamp' })}
          />
        ))}
      </Svg>
    </View>
  );
});
