import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { c, currentTheme } from '../../theme';

// Tuval: her ekranın üstündeki `.grain` (feTurbulence baseFrequency .85, 2 oktav, seed 9; opaklık gündüz .5, gece .28; multiply / screen).
// react-native-svg filtre desteklemez ve karışım kipi yoktur: gren, deterministik bir 128 px'lik SVG döşemesine (Pattern) pişirilir
// (3 boy benek, ~2700 nokta, tek seferlik üretim). Gündüz: tuvaldeki renk matrisi tonu (.35 .30 .20 -> #594D33) düz saydam benek
// ("çarpma" yerine); gece: krem benek ("screen" yerine). Opaklık paletin grainA değeri (klasik görünümde 0: hiç çizilmez).

const TILE = 128;
function rnd(seed: number) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// 3 kova: her biri tek Path; her benek "M x y h.1" + yuvarlak uç ile nokta
function buildSpecks(): string[] {
  const r = rnd(9);
  const counts = [1400, 900, 400];
  const out = ['', '', ''];
  for (let b = 0; b < 3; b++) {
    for (let i = 0; i < counts[b]; i++) {
      out[b] += `M${(r() * TILE).toFixed(1)} ${(r() * TILE).toFixed(1)}h.1`;
    }
  }
  return out;
}
const SPECKS = buildSpecks();

/**
 * Kâğıt grenı: ekranın en üstüne, tüm alanı kaplayacak şekilde yerleştir (absoluteFill, dokunmayı geçirir). `opacity` verilmezse c.grainA.
 * Örn. ekran kökünün son çocuğu olarak <PaperGrain />.
 */
export const PaperGrain = memo(function PaperGrain({ opacity }: { opacity?: number }) {
  const a = opacity ?? c.grainA;
  if (!a) return null;
  const dark = currentTheme() === 'dark';
  const col = dark ? '#F2E9D4' : '#594D33';
  const k = dark ? 0.7 : 1;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="grainTile" x="0" y="0" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
            <Path d={SPECKS[0]} fill="none" stroke={col} strokeWidth={1.0} strokeLinecap="round" strokeOpacity={0.35 * k} />
            <Path d={SPECKS[1]} fill="none" stroke={col} strokeWidth={1.4} strokeLinecap="round" strokeOpacity={0.55 * k} />
            <Path d={SPECKS[2]} fill="none" stroke={col} strokeWidth={1.9} strokeLinecap="round" strokeOpacity={0.8 * k} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grainTile)" opacity={a} />
      </Svg>
    </View>
  );
});
