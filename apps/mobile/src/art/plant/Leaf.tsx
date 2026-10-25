import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { c } from '../../theme';
import { CURL_D, CURL_FOLD, CURL_M, CURL_S, CURL_VEIN, LEAF_H, LEAF_VARIANTS, LEAF_W, WASH_DX, WASH_DY, leafBake } from './paths';
import { mat6 } from './wobble';

export type LeafLook = 'ink' | 'pencil' | 'today' | 'curl';
const WASH_T: [number, number, number, number, number, number] = [1, 0, 0, 1, WASH_DX, WASH_DY];
const CURL_T = mat6(CURL_M);

/**
 * Yaprak çizimi (46x22 yerel uzay; sol-orta uç gövdeye bağlanır) — Svg İÇİNDE kullanılacak <G>.
 *  ink: sage dolgu (çizgiden 1,8/1,6 kaçık) + mürekkep kontur 1,7 + damar 1,1 (opaklık .7)
 *  today: hardal tomurcuk (dolgu hardal, damar yok; sahnede 0,62 ölçekle yerleştirilir)
 *  pencil: kurşun kesikli taslak (dolgu yok), opaklık `penOp`
 *  curl: kenarı kıvrık yaprak (silinmez): dolgu + kontur + damar + kıvrık uç (clayWash)
 * Renkler render anında c'den okunur. `variant` titreşim varyantı (0..7).
 */
export const LeafGlyph = React.memo(function LeafGlyph({ look = 'ink', variant = 0, penOp = 0.7, restMark = false }: { look?: LeafLook; variant?: number; penOp?: number; restMark?: boolean }) {
  const b = leafBake[((variant % LEAF_VARIANTS) + LEAF_VARIANTS) % LEAF_VARIANTS];
  if (look === 'pencil') {
    return (
      <G opacity={penOp}>
        <Path d={b.blade} fill="none" stroke={c.edge} strokeWidth={1.5} strokeLinejoin="round" strokeDasharray={[3, 3.4]} />
        <Path d={b.vein} fill="none" stroke={c.edge} strokeWidth={1.1} strokeLinecap="round" opacity={0.45} />
      </G>
    );
  }
  if (look === 'curl') {
    return (
      <G>
        <G transform={WASH_T}><G transform={CURL_T}><Path d={b.curl} fill={c.sage} /></G></G>
        <G transform={CURL_T}>
          <Path d={b.curl} fill="none" stroke={c.fg} strokeWidth={1.7 / CURL_S} strokeLinejoin="round" />
          <Path d={b.curlVein} fill="none" stroke={c.fg} strokeWidth={1.1 / CURL_S} strokeLinecap="round" opacity={0.7} />
          <Path d={b.curlFold} fill={c.clayWash} stroke={c.fg} strokeWidth={1.5 / CURL_S} strokeLinejoin="round" strokeLinecap="round" />
        </G>
      </G>
    );
  }
  const today = look === 'today';
  return (
    <G>
      <Path d={b.blade} transform={WASH_T} fill={today ? c.mustard : c.sage} />
      <Path d={b.blade} fill="none" stroke={c.fg} strokeWidth={1.7} strokeLinejoin="round" />
      {today ? null : <Path d={b.vein} fill="none" stroke={c.fg} strokeWidth={1.1} strokeLinecap="round" opacity={0.7} />}
      {restMark ? <Circle cx={22} cy={25} r={1.2} fill={c.edge} opacity={0.7} /> : null}
    </G>
  );
});

/** Tek başına yaprak (Galeri, rozet, simge): `width` px; yükseklik oranla. */
export function Leaf({ look = 'ink', variant = 0, width = LEAF_W * 2, rot = 0, restMark = false }: { look?: LeafLook; variant?: number; width?: number; rot?: number; restMark?: boolean }) {
  const h = (width * LEAF_H) / LEAF_W;
  return (
    <Svg width={width} height={h * (look === 'curl' ? 1.6 : 1)} viewBox={look === 'curl' ? '-2 -14 52 34' : `0 0 ${LEAF_W} ${LEAF_H}`} style={{ overflow: 'visible', transform: [{ rotate: rot + 'deg' }] }}>
      <LeafGlyph look={look} variant={variant} restMark={restMark} />
    </Svg>
  );
}
