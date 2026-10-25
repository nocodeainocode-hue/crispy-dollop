import React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { c } from '../../theme';
import { TULIP_H, TULIP_VARIANTS, TULIP_W, TULIP_WASH_DX, TULIP_WASH_DY, tulipBake } from './paths';

export type TulipLook = 'ink' | 'pencil' | 'today' | 'curl';
const WASH_T: [number, number, number, number, number, number] = [1, 0, 0, 1, TULIP_WASH_DX, TULIP_WASH_DY];

/**
 * Lale çizimi (28x38 yerel uzay; taban (14, 38)) — Svg İÇİNDE kullanılacak <G>.
 *  part 'open' (varsayılan): üç taç yaprak. ink/curl: tulip dolgu + mürekkep kontur 1,7; pencil: kurşun kesikli kontur, dolgu yok.
 *  part 'bud': tomurcuk (bugün: clayWash dolgu + kontur + damar). look 'today' her zaman tomurcuk çizer.
 * (curl: boyun eğikliği yerleşim matrisinde, bkz. GardenScene.)
 */
export const TulipGlyph = React.memo(function TulipGlyph({ look = 'ink', part = 'open', variant = 0 }: { look?: TulipLook; part?: 'open' | 'bud'; variant?: number }) {
  const b = tulipBake[((variant % TULIP_VARIANTS) + TULIP_VARIANTS) % TULIP_VARIANTS];
  if (look === 'today' || part === 'bud') {
    return (
      <G>
        <Path d={b.bud} transform={WASH_T} fill={c.clayWash} />
        <Path d={b.bud} fill="none" stroke={c.fg} strokeWidth={1.7} strokeLinejoin="round" />
        <Path d={b.budVein} fill="none" stroke={c.fg} strokeWidth={1.1} strokeLinecap="round" opacity={0.65} />
      </G>
    );
  }
  if (look === 'pencil') {
    return (
      <G>
        {b.petals.map((d, i) => <Path key={i} d={d} fill="none" stroke={c.edge} strokeWidth={1.5} strokeLinejoin="round" strokeDasharray={[3, 3.4]} />)}
      </G>
    );
  }
  return (
    <G>
      <Path d={b.petals.join(' ')} transform={WASH_T} fill={c.tulip} />
      {b.petals.map((d, i) => <Path key={i} d={d} fill="none" stroke={c.fg} strokeWidth={1.7} strokeLinejoin="round" />)}
    </G>
  );
});

/** Tek başına lale: `width` px. part 'bud' tomurcuk. */
export function Tulip({ look = 'ink', part = 'open', variant = 0, width = TULIP_W * 2 }: { look?: TulipLook; part?: 'open' | 'bud'; variant?: number; width?: number }) {
  return (
    <Svg width={width} height={(width * TULIP_H) / TULIP_W} viewBox={`0 0 ${TULIP_W} ${TULIP_H}`} style={{ overflow: 'visible' }}>
      <TulipGlyph look={look} part={part} variant={variant} />
    </Svg>
  );
}
