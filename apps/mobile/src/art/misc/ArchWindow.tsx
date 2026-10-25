import React, { memo } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { c } from '../../theme';
import { inkP, useLoop } from './ink';

// Tuval: SahitPortal.dc.html (kemer pencere) ve Metin.dc.html "Kemer pencere" (82x92, 41 41 14 14, 2.4 kenar, waterWash).
// Portal penceresi: 342x252, üst yarım daire (yarıçap = genişlik/2), alt köşe 30, 3 px mürekkep kenar, sert gölge 0 5px 0,
// içinde bulut + tepe (sageWash) + toprak. Şahit penceresinde YALNIZ gün sayısı + lale gösterilir: içerik `children` yuvasına verilir.

const CLOUD = 'M40 60 C30 60 30 48 40 47 C40 38 54 36 58 44 C62 36 78 38 78 48 C88 46 94 58 84 60Z';
const HILL_FILL = 'M-4 170 C60 140 130 136 190 152 C250 168 300 140 346 150 L346 260 L-4 260Z';
const HILL_LINE = 'M-4 170 C60 140 130 136 190 152 C250 168 300 140 346 150';
const SOIL_FILL = 'M-4 210 C70 196 140 192 200 200 C260 204 300 198 346 206 L346 260 L-4 260Z';
const SOIL_LINE = 'M-4 210 C70 196 140 192 200 200 C260 204 300 198 346 206';
const GRASS = 'M30 232 l10 -3 M80 224 l12 -3 M270 230 l10 -3 M300 222 l10 -3';

/** Portal sahnesi (342x252 koordinat): bulut, tepe, toprak, otlar. Pencerenin içine arka plan olarak çizilir. */
export const PortalScene = memo(function PortalScene({ width = 342, height = 252 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 342 252" preserveAspectRatio="xMidYMax slice" style={styles.scene}>
      <Path d={CLOUD} fill={c.surf} stroke={c.edge} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d={HILL_FILL} fill={c.sageWash} />
      <Path d={HILL_LINE} fill="none" {...inkP(1.6)} stroke={c.edge} />
      <Path d={SOIL_FILL} fill={c.soil} />
      <Path d={SOIL_LINE} fill="none" {...inkP(2)} />
      <Path d={GRASS} fill="none" {...inkP(1.4)} opacity={0.45} />
    </Svg>
  );
});

/** Tek başına bulut (Main/Portal'daki yumuşak bulut: surf dolgu, edge 1.6 çizgi). */
export const Cloud = memo(function Cloud({ width = 92, height = 40, viewBox = '0 0 92 40', d = 'M14 32 C4 32 3 20 13 19 C13 8 28 5 33 14 C38 4 56 6 56 18 C68 14 76 24 68 31 C66 33 62 32 60 32 Z', style }: { width?: number; height?: number; viewBox?: string; d?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={width} height={height} viewBox={viewBox}>
        <Path d={d} fill={c.surf} stroke={c.edge} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
});

/**
 * Kemer pencere. `children` = içerik yuvası (padding kutusuna göre mutlak konum; tuvaldeki bitki left 61 top 12).
 * scene=false ise yalnız waterWash zemin. Dış gölge 5 px aşağıda sert katman (Android'de elevation yerine).
 */
export const ArchWindow = memo(function ArchWindow({ width = 342, height = 252, scene = true, children, style }: {
  width?: number; height?: number; scene?: boolean; children?: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const radii = { borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 };
  return (
    <View style={[{ width, height }, style]}>
      <View pointerEvents="none" style={[styles.shadow, radii, { backgroundColor: c.shadow }]} />
      <View style={[styles.win, radii, { width, height, borderColor: c.fg, backgroundColor: c.waterWash }]}>
        {scene ? <PortalScene width={width} height={height} /> : null}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">{children}</View>
      </View>
    </View>
  );
});

/** Küçük kemer (Metin: 82x92, 41 41 14 14, 2.4 kenar, waterWash): marka ve etiket kullanımı için içsiz kemer. */
export const ArchShape = memo(function ArchShape({ width = 82, height = 92, children, style }: { width?: number; height?: number; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width, height, borderWidth: 2.4, borderColor: c.fg, backgroundColor: c.waterWash, overflow: 'hidden', borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }, style]}>{children}</View>
  );
});

/**
 * Hafif sallanma (SahitPortal `.sway`: 8 sn, ±0.7°, alt-orta eksen). `height` gerekli (eksen alt orta olsun diye).
 * Hareketi azalt açıkken döngü çalışmaz, açı 0'da durur.
 */
export function Sway({ amp = 0.7, ms = 8000, height, children, style }: { amp?: number; ms?: number; height: number; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(ms / 2, 0.5);
  const rot = v.interpolate({ inputRange: [0, 1], outputRange: [`${-amp}deg`, `${amp}deg`] });
  const half = height / 2;
  return (
    <Animated.View style={[{ height, transform: [{ translateY: half }, { rotate: rot }, { translateY: -half }] }, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', left: 0, right: 0, top: 5, bottom: -5 },
  win: { borderWidth: 3, overflow: 'hidden' },
  scene: { position: 'absolute', left: 0, top: 0 },
});
