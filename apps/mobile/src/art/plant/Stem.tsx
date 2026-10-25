import React, { useMemo } from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { c } from '../../theme';
import { DayStates, Layout, SceneVariant, buildLayout, progressDay, stemPaths } from './layout';

/**
 * Gövde ve dallar (Svg İÇİNDE <G>): ilerleme kadarı mürekkep, kalanı kurşun kesikli; lale sürgünleri durumuna göre.
 * Filiz 30 gün tek gövde; Fidan 60 (+sol dal), Ağaç 90 (+sağ dal): her 30 günde bir dal.
 */
export const StemLayer = React.memo(function StemLayer({ layout, states }: { layout: Layout; states: DayStates }) {
  const pd = progressDay(layout, states);
  const sp = useMemo(() => stemPaths(layout, pd, states), [layout, pd, states]);
  const st = layout.geo.stem;
  return (
    <G>
      {sp.pen.map((d, i) => d ? <Path key={'p' + i} d={d} fill="none" stroke={c.edge} strokeWidth={st.pen} strokeLinecap="round" strokeDasharray={[3, 4]} /> : null)}
      {sp.shootPen ? <Path d={sp.shootPen} fill="none" stroke={c.edge} strokeWidth={st.pen} strokeLinecap="round" strokeDasharray={[3, 4]} /> : null}
      {sp.ink.map((d, i) => d ? <Path key={'i' + i} d={d} fill="none" stroke={c.fg} strokeWidth={i === 0 ? st.main : st.thin + 0.3} strokeLinecap="round" /> : null)}
      {sp.shootInk ? <Path d={sp.shootInk} fill="none" stroke={c.fg} strokeWidth={st.thin} strokeLinecap="round" /> : null}
    </G>
  );
});

/** Tek başına gövde (yaprak/lale olmadan). */
export function Stem({ goalDays = 30, dayStates, variant = 'home', scale = 1 }: { goalDays?: number; dayStates: DayStates; variant?: SceneVariant; scale?: number }) {
  const layout = useMemo(() => buildLayout(goalDays, variant), [goalDays, variant]);
  const { w, h } = layout.geo;
  return (
    <Svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <StemLayer layout={layout} states={dayStates} />
    </Svg>
  );
}
