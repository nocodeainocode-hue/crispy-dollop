import React, { memo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';
import { F, c } from '../../theme';
import { inkP, wob } from './ink';

// Marka işareti. NOT: tuvalde (Kimlik.dc.html dahil) çizilmiş bir logo YOK; plan (F4-10, K15) tarifine göre tuval parçalarından kurulur:
// kemer (şahit portalı penceresiyle aynı biçim: Metin "Kemer pencere" 82x92, 41/41/14/14, 2.4 kenar, waterWash) + toprak
// + iki yapraklı filiz + tek hardal tomurcuk (İmza filizinin yolları). Wordmark "QuitVow" Fraunces 600.
// Uygulama ikonu üretimi bu bileşenin işi değildir; yalnız bileşen.

const W = 82, H = 92, BW = 2.4, I = BW / 2;
// kenar çizgisinin orta çizgisi (kenar içeri doğru): üst yarım daire yarıçap 41-1.2, alt köşe 14-1.2
const ARCH = `M${I} ${H - 14}V41A${41 - I} ${41 - I} 0 0 1 ${W - I} 41V${H - 14}A${14 - I} ${14 - I} 0 0 1 ${W - 14} ${H - I}H14A${14 - I} ${14 - I} 0 0 1 ${I} ${H - 14}Z`;
const SOIL = wob('M-2 70 C20 64 38 62 54 66 C66 68 76 66 86 70 L86 96 L-2 96Z', 2);
const SOIL_LINE = wob('M-2 70 C20 64 38 62 54 66 C66 68 76 66 86 70', 2);
// filiz (72x92 uzayı), 0.5 ölçek ve (41,66) tabanına oturtulur
const S = 0.5, TX = 41 - 36 * S, TY = 68 - 80 * S;
const STEM = wob('M36 80 C35 62 38 48 36 34', 2), L1 = wob('M36 58 C24 58 14 50 12 40 C24 38 34 46 36 58Z', 2), L2 = wob('M36 44 C48 44 58 36 60 26 C48 24 38 32 36 44Z', 2), BUD = wob('M36 36 C30 30 30 22 34 14 C40 20 40 30 36 36Z', 2);

/** Yalnız işaret (kemer + toprak + filiz + hardal tomurcuk). size = yükseklik. */
export const BrandGlyph = memo(function BrandGlyph({ size = 92 }: { size?: number }) {
  const w = (size * W) / H;
  const st = (n: number) => n / S; // filiz grubunda çizgi kalınlığı: ölçek öncesi birim
  return (
    <Svg width={w} height={size} viewBox={`0 0 ${W} ${H}`}>
      <Defs><ClipPath id="archClip"><Path d={ARCH} /></ClipPath></Defs>
      <Path d={ARCH} fill={c.waterWash} />
      <G clipPath="url(#archClip)">
        <Path d={SOIL} fill={c.soil} />
        <Path d={SOIL_LINE} fill="none" {...inkP(2)} />
        <G transform={`translate(${TX} ${TY}) scale(${S})`}>
          <Path d={STEM} fill="none" {...inkP(st(2.4))} />
          <Path d={L1} fill={c.sage} {...inkP(st(1.8))} />
          <Path d={L2} fill={c.sage} {...inkP(st(1.8))} />
          <Path d={BUD} fill={c.mustard} {...inkP(st(1.8))} />
        </G>
      </G>
      <Path d={ARCH} fill="none" {...inkP(BW)} />
    </Svg>
  );
});

/** İşaret + "QuitVow" yazısı. layout 'row' (işaret solda) ya da 'column'. wordmark=false ise yalnız işaret. */
export const BrandMark = memo(function BrandMark({ size = 56, wordmark = true, layout = 'row', style }: { size?: number; wordmark?: boolean; layout?: 'row' | 'column'; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityRole="image" accessibilityLabel="QuitVow" style={[styles.box, layout === 'column' && styles.col, { gap: Math.round(size * 0.22) }, style]}>
      <BrandGlyph size={size} />
      {wordmark ? <Text allowFontScaling={false} style={{ fontFamily: F.d, fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.6), letterSpacing: -0.5, color: c.fg }}>QuitVow</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center' },
  col: { flexDirection: 'column' },
});
