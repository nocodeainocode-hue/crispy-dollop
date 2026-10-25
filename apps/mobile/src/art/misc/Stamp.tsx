import React, { memo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { F, c } from '../../theme';

// Tuval: Paywall.dc.html (.seal). "Tek seferlik. Abonelik değil, yenilenmez." kesik çizgili kil damgası:
// 2.4 px kil kenar (dashed), köşe yarıçapları 26/20/28/22 (asimetrik), -1.2 derece, surf zemin, 14/18 iç boşluk, sol simge 34 px.
// Android'de asimetrik radius + dashed View kenarı güvenilmez; kenar SVG yoluyla çizilir (aynı yarıçaplar, aynı çizgi).

const RAD = [26, 20, 28, 22] as const; // sol-üst, sağ-üst, sağ-alt, sol-alt

function roundedPath(w: number, h: number, r: readonly number[], inset: number): string {
  const x0 = inset, y0 = inset, x1 = w - inset, y1 = h - inset;
  const [a, b, d, e] = r.map(v => Math.max(0, v - inset));
  return `M${x0 + a} ${y0}H${x1 - b}A${b} ${b} 0 0 1 ${x1} ${y0 + b}V${y1 - d}A${d} ${d} 0 0 1 ${x1 - d} ${y1}H${x0 + e}A${e} ${e} 0 0 1 ${x0} ${y1 - e}V${y0 + a}A${a} ${a} 0 0 1 ${x0 + a} ${y0}Z`;
}

/** "Yenilenmez" simgesi (Paywall .seal svg, 24 kutu): iki ok + çizgi. */
export const NoRenewIcon = memo(function NoRenewIcon({ size = 34, color }: { size?: number; color?: string }) {
  const col = color ?? c.clay;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" fill="none" stroke={col} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 3v4h-4M6 21v-4h4" fill="none" stroke={col} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 19L19 5" fill="none" stroke={col} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

/**
 * Kil damgası. `title` (Fraunces 22) + `text` (Nunito 700 17) varsayılan iki satır; `children` verilirse metin yuvası olarak onun yerine geçer.
 * `icon` null ise simge yok; verilmezse NoRenewIcon. Okunurluk için metin renkleri c.fg (kil yalnız kenar ve simge).
 */
export const Stamp = memo(function Stamp({ title = 'Tek seferlik.', text = 'Abonelik değil, yenilenmez.', icon, children, tilt = -1.2, style }: {
  title?: string; text?: string; icon?: React.ReactNode | null; children?: React.ReactNode; tilt?: number; style?: StyleProp<ViewStyle>;
}) {
  const [sz, setSz] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - sz.w) > 0.5 || Math.abs(height - sz.h) > 0.5) setSz({ w: width, h: height });
  };
  return (
    <View onLayout={onLayout} style={[styles.box, { transform: [{ rotate: `${tilt}deg` }] }, style]}>
      {sz.w > 0 ? (
        <Svg width={sz.w} height={sz.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={roundedPath(sz.w, sz.h, RAD, 1.2)} fill={c.surf} stroke={c.clay} strokeWidth={2.4} strokeDasharray={[7, 5]} strokeLinecap="butt" />
        </Svg>
      ) : null}
      {icon === null ? null : <View>{icon ?? <NoRenewIcon />}</View>}
      <View style={styles.col}>
        {children ?? (
          <>
            <Text style={[styles.t, { color: c.fg, fontFamily: F.d }]}>{title}</Text>
            <Text style={[styles.b, { color: c.fg, fontFamily: F.s }]}>{text}</Text>
          </>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 },
  col: { flex: 1 },
  t: { fontSize: 22, lineHeight: 24 },
  b: { fontSize: 17, lineHeight: 20, marginTop: 3 },
});
