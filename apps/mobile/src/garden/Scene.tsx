import React, { useMemo, useState } from 'react';
import { View, Text, Animated, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { c, F, currentTheme } from '../theme';
import { PlantLite } from './Plant';
import { BOX, buildLayout, itemFor, dayState } from './core';

// Bahçe sahnesi: gökyüzü (zemin), güneş/ay, iki tepe (yarım elips), toprak şeridi ve bitki.
// Tepeler "daire + dikey ölçek" ile yarım elips olur (borderRadius yalnız dairesel).

function Hill({ cx, top, rx, ry, color }: { cx: number; top: number; rx: number; ry: number; color: string }) {
  // Dairenin merkezi (top + ry); dikey ölçek ry/rx ile elips olur, üst kenar `top`ta kalır.
  return <View pointerEvents="none" style={{ position: 'absolute', left: cx - rx, top: top + ry - rx, width: rx * 2, height: rx * 2, borderRadius: rx, backgroundColor: color, transform: [{ scaleY: ry / rx }] }} />;
}

function Sun({ size, right, top }: { size: number; right: number; top: number }) {
  const night = currentTheme() === 'dark';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right, top, width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.mustard, borderWidth: 2, borderColor: c.fg }} />
      {night && <View style={{ position: 'absolute', left: size * 0.3, top: -size * 0.08, width: size * 0.9, height: size * 0.9, borderRadius: size * 0.45, backgroundColor: c.bg }} />}
    </View>
  );
}

export type SceneProps = {
  goal: number; day: number; doneToday: boolean; hard: readonly number[];
  /** Bugünün tomurcuğunun yanında el yazısı not (Caveat, ≥22 sp). Boşsa gösterilmez. */
  note?: string;
  opening?: Animated.Value;
  pulse?: boolean;
  a11yLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function GardenScene({ goal, day, doneToday, hard, note, opening, pulse = true, a11yLabel, style }: SceneProps) {
  const [sz, setSz] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSz(p => (Math.abs(p.w - width) < 1 && Math.abs(p.h - height) < 1 ? p : { w: width, h: height }));
  };
  const { w, h } = sz;
  const soilH = Math.max(44, Math.min(90, h * 0.16));
  const soilTop = h - soilH;
  // Ölçek: bitki (taban toprak çizgisinin hemen altı, tepe sahnenin üstünden taşmaz) ve genişliğe sığar; 2 ondalığa yuvarlanır (memo kararlı kalsın).
  const s = h > 0 && w > 0 ? Math.round(Math.max(0.4, Math.min(1.15, (w / BOX.w) * 1.04, (soilTop + 2) / 360)) * 100) / 100 : 1;
  const ox = (w - BOX.w * s) / 2, oy = soilTop + 10 - 360 * s;

  const layout = useMemo(() => buildLayout(goal), [goal]);
  const today = Math.min(Math.max(1, day), goal);
  const it = itemFor(layout, today);
  const budVisible = !!note && !!it && dayState(today, { today, doneToday, hard: new Set(hard) }) === 'bugun';
  let noteStyle: any = null;
  if (budVisible && it) {
    const X = ox + it.tipX * s, Y = oy + it.tipY * s;
    // Not, bitkinin dış tarafına (daha az yaprak olan yana) konur; sığmazsa öbür yana
    let right = X >= w / 2;
    if (right && X + 14 + 96 > w - 6) right = false;
    else if (!right && X - 14 - 96 < 6) right = true;
    noteStyle = right ? { left: X + 14 } : { right: w - (X - 14) };
    noteStyle.top = Math.max(2, Y - 20);
  }

  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={a11yLabel}>
      {w > 0 && h > 0 && (
        <>
          <Sun size={44} right={22} top={8} />
          <Hill cx={w * 0.72} top={soilTop - h * 0.2} rx={w * 0.85} ry={h * 0.17} color={c.hill} />
          <Hill cx={w * 0.26} top={soilTop - h * 0.09} rx={w * 0.8} ry={h * 0.13} color={c.hill2} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: soilH, backgroundColor: c.soil, borderTopWidth: 2, borderColor: c.fg, borderTopLeftRadius: 38, borderTopRightRadius: 30 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: ox, top: oy, width: BOX.w * s, height: BOX.h * s }}>
            <PlantLite goal={goal} day={day} doneToday={doneToday} hard={hard} s={s} opening={opening} pulse={pulse} />
          </View>
          {noteStyle && (
            // Bahçe etiketi: yoğun yapraklarda da okunsun diye kâğıt zeminli küçük çakıl; el yazısı kil rengi
            <View pointerEvents="none" style={[{ position: 'absolute', paddingHorizontal: 12, paddingVertical: 2, backgroundColor: c.surf, borderWidth: 1.5, borderColor: c.edge, borderTopLeftRadius: 18, borderTopRightRadius: 14, borderBottomRightRadius: 19, borderBottomLeftRadius: 13 }, noteStyle]}>
              <Text style={{ fontFamily: F.hand, fontSize: 24, lineHeight: 30, color: c.clay }}>{note}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
