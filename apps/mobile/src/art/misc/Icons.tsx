import React, { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { c } from '../../theme';

// Tuvaldeki çizgi simgeleri (Main.dc.html dock, Kontrol/Kriz/GunTamam/SahitDavet/Paywall içi). Yol verileri tuvalden birebir.
// Simgeler `.wob` almaz (tuvalde düz svg), bu yüzden doğrudan çizilir. Renk varsayılan c.fg; dock'ta pasif c.dim.

type El = { p: string } | { c: readonly [number, number, number] } | { r: readonly [number, number, number, number, number] };
type Def = { vb: number; w: number; els: readonly El[] };

export const ICON_DEFS = {
  // --- dock (28 kutu, 1.8) ---
  calm: { vb: 28, w: 1.8, els: [{ c: [14, 14, 4.5] }, { p: 'M14 3.5a10.5 10.5 0 1 1 -9 5.2' }] },
  journal: { vb: 28, w: 1.8, els: [{ p: 'M7 4.5h14a1.5 1.5 0 0 1 1.5 1.5v17a1.5 1.5 0 0 1 -1.5 1.5H7z' }, { p: 'M11 10h8M11 14h8M11 18h5' }] },
  crisis: { vb: 28, w: 2, els: [{ p: 'M3 15c3-7 6-7 8 0s5 7 8 0 4-6 6-3' }] },
  witness: { vb: 28, w: 1.8, els: [{ c: [9.5, 14, 5] }, { p: 'M14.5 14H25M21 14v4M24.5 14v3' }] },
  profile: { vb: 28, w: 1.8, els: [{ c: [14, 10, 4.8] }, { p: 'M5 24c1-5 5-7.5 9-7.5s8 2.5 9 7.5' }] },
  // YAKLAŞIK: tuval dock'unda "Paketim" yok; tohum paketi (zikzaklı üst) ve yaprak, aynı çizgi diliyle.
  pack: { vb: 28, w: 1.8, els: [{ p: 'M7 4.5h14v19a1.5 1.5 0 0 1 -1.5 1.5h-11A1.5 1.5 0 0 1 7 23.5z' }, { p: 'M7 9l2.3-2.5L11.7 9l2.3-2.5L16.3 9l2.3-2.5L21 9' }, { p: 'M10.5 21c0-4 2.5-6.5 7-6.5 0 4-2.5 6.5-7 6.5z' }] },
  // --- genel (tuval) ---
  leaf: { vb: 28, w: 2, els: [{ p: 'M5 22C5 11 12 5 24 5c0 11-6 18-17 18' }, { p: 'M5 23C10 17 14 14 19 11' }] },
  eyeOff: { vb: 28, w: 2, els: [{ p: 'M3 14C6 8.5 10 6 14 6s8 2.5 11 8c-3 5.5-7 8-11 8S6 19.5 3 14z' }, { c: [14, 14, 3.4] }, { p: 'M5 23L23 5' }] },
  heart: { vb: 28, w: 2, els: [{ p: 'M14 24C6 18 3.5 14 3.5 10.5A5.5 5.5 0 0 1 14 8a5.5 5.5 0 0 1 10.5 2.5C24.5 14 22 18 14 24z' }] },
  drop: { vb: 24, w: 2.2, els: [{ p: 'M12 3C12 3 5.5 11 5.5 15.2A6.5 6.5 0 0 0 12 21.5a6.5 6.5 0 0 0 6.5-6.3C18.5 11 12 3 12 3z' }] },
  back: { vb: 24, w: 2, els: [{ p: 'M15 5 8 12l7 7' }] },
  check: { vb: 24, w: 2.6, els: [{ p: 'M5 12.5l4.5 4.5L19 7' }] },
  arrowRight: { vb: 24, w: 2.6, els: [{ p: 'M5 12h13M13 6l6 6-6 6' }] },
  replay: { vb: 24, w: 2.2, els: [{ p: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5' }] },
  video: { vb: 24, w: 2, els: [{ r: [3, 7, 13, 11, 2.5] }, { p: 'M16 11l5-3v8l-5-3' }] },
  phone: { vb: 24, w: 2.2, els: [{ p: 'M5 4.5h4l1.6 4-2.2 1.4a11 11 0 0 0 5.7 5.7l1.4-2.2 4 1.6v4a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3 6.5a2 2 0 0 1 2-2z' }] },
  mail: { vb: 24, w: 1.9, els: [{ r: [3, 5.5, 18, 13, 2] }, { p: 'M3.5 7l8.5 6 8.5-6' }] },
  noRenew: { vb: 24, w: 2.4, els: [{ p: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3' }, { p: 'M18 3v4h-4M6 21v-4h4' }, { p: 'M5 19L19 5' }] },
} as const satisfies Record<string, Def>;

export type IconName = keyof typeof ICON_DEFS;

/** Tuval simgesi. `size` görünen kenar (dock 28, Krizdeyim 26, geri 22); strokeWidth verilmezse tuvaldeki kalınlık. */
export const GIcon = memo(function GIcon({ name, size = 24, color, strokeWidth }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const def: Def = ICON_DEFS[name];
  const col = color ?? c.fg;
  const sw = strokeWidth ?? def.w;
  const common = { fill: 'none', stroke: col, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${def.vb} ${def.vb}`}>
      {def.els.map((e, i) => {
        if ('p' in e) return <Path key={i} d={e.p} {...common} />;
        if ('c' in e) return <Circle key={i} cx={e.c[0]} cy={e.c[1]} r={e.c[2]} {...common} />;
        return <Rect key={i} x={e.r[0]} y={e.r[1]} width={e.r[2]} height={e.r[3]} rx={e.r[4]} {...common} />;
      })}
    </Svg>
  );
});

/** Dock simgeleri (Sakinleş, Günlük, Krizdeyim, Şahitler, Paketim, Ben). Pasif renk c.dim, seçili c.fg. */
export type DockName = 'calm' | 'journal' | 'crisis' | 'witness' | 'pack' | 'profile';
export const DockIcon = memo(function DockIcon({ name, active = false, size, color }: { name: DockName; active?: boolean; size?: number; color?: string }) {
  return <GIcon name={name} size={size ?? (name === 'crisis' ? 26 : 28)} color={color ?? (name === 'crisis' ? c.onClay : active ? c.fg : c.dim)} />;
});
