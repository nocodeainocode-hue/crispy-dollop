import React, { memo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { F, c } from '../../theme';
import { ellipsePath, inkP, rectPath, wob } from './ink';

// Tuval: Sakinles.dc.html (.pk tohum paketi kartları, 6 adet) ve Metin.dc.html "Tohum paketi".
// Kart 130 yüksek, 1.8 mürekkep kenar, sert gölge 0 4px 0, zikzaklı kil-yıkama üst bant (20 px, 16 diş), hafif eğim.

/** Zikzaklı üst kenar: viewBox 0 0 100 20, 16 diş (tuvaldeki clip-path poligonu: 0 60% / 100% dönüşümlü). */
function zigzag(): string {
  let d = 'M0 0H100V12';
  for (let i = 15; i >= 0; i--) d += `L${i * 6.25} ${i % 2 === 1 ? 20 : 12}`;
  return d + 'Z';
}
const ZIG = zigzag();

/** Zikzaklı bant tek başına da kullanılabilir (genişlik: üst kapsayıcı, yükseklik 20 + 1.6 mürekkep gölge). */
export const ZigzagEdge = memo(function ZigzagEdge({ fill, ink, style }: { fill?: string; ink?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ height: 22 }, style]}>
      <Svg width="100%" height={22} viewBox="0 0 100 22" preserveAspectRatio="none">
        <G transform="translate(0 1.6)"><Path d={ZIG} fill={ink ?? c.fg} /></G>
        <Path d={ZIG} fill={fill ?? c.clayWash} />
      </Svg>
    </View>
  );
});

/** Tuvaldeki altı kartın köşe yarıçapları (sol-üst, sağ-üst, sağ-alt, sol-alt) ve eğimleri. */
export const PACKET_VARIANTS = [
  { r: [14, 18, 22, 16], rot: -1.2 },
  { r: [18, 14, 16, 22], rot: 1 },
  { r: [16, 22, 14, 18], rot: 0.8 },
  { r: [20, 14, 18, 16], rot: -1, },
  { r: [14, 20, 16, 22], rot: 1.2 },
  { r: [18, 16, 22, 14], rot: -0.8 },
] as const;

/**
 * Tohum paketi kartı (Sakinleş menüsü). `children` = 64x64 simge yuvası (CalmIcon ya da kendi çiziminiz), `label` altta Fraunces.
 * variant 0..5 köşe/eğim varyantı; basılınca tuvaldeki hover gibi 3 px yukarı çıkar ve düzelir.
 */
export const SeedPacket = memo(function SeedPacket({ label, children, variant = 0, height = 130, onPress, style, accessibilityLabel }: {
  label: string; children?: React.ReactNode; variant?: number; height?: number; onPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const v = PACKET_VARIANTS[((variant % 6) + 6) % 6];
  const radii = { borderTopLeftRadius: v.r[0], borderTopRightRadius: v.r[1], borderBottomRightRadius: v.r[2], borderBottomLeftRadius: v.r[3] };
  const body = (
    <>
      <View pointerEvents="none" style={[styles.shadow, radii, { backgroundColor: c.shadow }]} />
      <View style={[styles.card, radii, { height, backgroundColor: c.surf, borderColor: c.fg }]}>
        <ZigzagEdge style={styles.fold} />
        <View style={styles.ill}>{children}</View>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.nm, { color: c.fg, fontFamily: F.d }]}>{label}</Text>
      </View>
    </>
  );
  if (!onPress) return <View style={[{ transform: [{ rotate: `${v.rot}deg` }] }, style]}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [{ transform: [{ translateY: pressed ? -3 : 0 }, { rotate: `${pressed ? 0 : v.rot}deg` }] }, style]}
    >
      {body}
    </Pressable>
  );
});

// ------------------------------------------------------------------ paket içi simgeler (Sakinles.dc.html .ill, 64x64, wob scale 2)
export type CalmIconName = 'balloon' | 'sudoku' | 'memory' | 'xox' | 'senses' | 'countdown';

const W = (d: string) => wob(d, 2);
const BALLOON = W(ellipsePath(32, 24, 16, 20)), B_KNOT = W('M32 44 l-4 5 h8z'), B_STR = W('M32 49 q-5 5 0 9 q4 3 0 6'), B_HI = W('M24 14 q2 -5 7 -6');
const SU_BOX = W(rectPath(8, 8, 48, 48, 5)), SU_GRID = W('M24 8v48M40 8v48M8 24h48M8 40h48');
const ME_A = W(rectPath(6, 14, 30, 40, 5)), ME_A_LEAF = W('M14 44 C14 32 22 26 30 26 C30 38 24 44 14 44Z');
const ME_B = W(rectPath(28, 12, 30, 40, 5)), ME_B_TULIP = W('M43 42 C37 38 37 30 43 20 C49 30 49 38 43 42Z');
const XO_GRID = W('M23 8v48M41 8v48M8 23h48M8 41h48'), XO_X1 = W('M11 11l9 9M20 11l-9 9'), XO_X2 = W('M44 44l9 9M53 44l-9 9');
const SE_EYE = W('M4 34 C14 18 26 14 32 14 C38 14 50 18 60 34 C50 50 38 54 32 54 C26 54 14 50 4 34Z'), SE_LASH = W('M18 10l3 6M32 6v7M46 10l-3 6');
const CD_LINE = W('M18 36h28');

/** Sakinleş paket simgeleri. Rakamlar RN Text ile (SVG metni özel yazı tipini garanti etmez). size 64 = tuvaldeki boyut. */
export const CalmIcon = memo(function CalmIcon({ name, size = 64 }: { name: CalmIconName; size?: number }) {
  const k = size / 64;
  const num = (text: string, x: number, base: number, fs: number, color: string, center = false) => (
    <Text allowFontScaling={false} style={{ position: 'absolute', left: center ? 0 : x * k, top: (base - fs * 0.86) * k, width: center ? size : undefined, textAlign: center ? 'center' : 'left', fontFamily: F.d, fontSize: fs * k, lineHeight: fs * k, color }}>{text}</Text>
  );
  let g: React.ReactNode = null;
  if (name === 'balloon') {
    g = (<>
      <Path d={BALLOON} fill={c.clayWash} {...inkP(2)} />
      <Path d={B_KNOT} fill={c.clay} {...inkP(2)} />
      <Path d={B_STR} fill="none" {...inkP(1.6)} />
      <Path d={B_HI} fill="none" {...inkP(1.6)} opacity={0.6} />
    </>);
  } else if (name === 'sudoku') {
    g = (<>
      <Path d={SU_BOX} fill={c.bg} {...inkP(2)} />
      <Path d={SU_GRID} fill="none" {...inkP(1.3)} />
    </>);
  } else if (name === 'memory') {
    g = (<>
      <G transform="rotate(-9 22 34)">
        <Path d={ME_A} fill={c.sageWash} {...inkP(2)} />
        <Path d={ME_A_LEAF} fill={c.sage} {...inkP(1.5)} />
      </G>
      <G transform="rotate(8 44 34)">
        <Path d={ME_B} fill={c.bg} {...inkP(2)} />
        <Path d={ME_B_TULIP} fill={c.tulip} {...inkP(1.5)} />
      </G>
    </>);
  } else if (name === 'xox') {
    g = (<>
      <Path d={XO_GRID} fill="none" {...inkP(2.4)} />
      <Path d={XO_X1} fill="none" {...inkP(2.6)} stroke={c.clay} />
      <Circle cx={32} cy={32} r={6} fill="none" {...inkP(2.6)} stroke={c.act} />
      <Path d={XO_X2} fill="none" {...inkP(2.6)} stroke={c.clay} />
    </>);
  } else if (name === 'senses') {
    g = (<>
      <Path d={SE_EYE} fill={c.bg} {...inkP(2)} />
      <Circle cx={32} cy={34} r={11} fill={c.sageWash} {...inkP(2)} />
      <Circle cx={32} cy={34} r={4.5} fill={c.fg} />
      <Path d={SE_LASH} fill="none" {...inkP(1.8)} />
    </>);
  } else {
    g = (<>
      <Circle cx={32} cy={34} r={25} fill={c.bg} {...inkP(2)} />
      <Path d={CD_LINE} fill="none" {...inkP(1.8)} />
    </>);
  }
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 64 64" style={styles.visible}>{g}</Svg>
      {name === 'sudoku' ? (<>{num('5', 12, 21, 12, c.fg)}{num('3', 28, 37, 12, c.fg)}{num('7', 44, 53, 12, c.fg)}</>) : null}
      {name === 'countdown' ? (<>{num('100', 0, 30, 15, c.fg, true)}{num('−7', 0, 51, 15, c.clay, true)}</>) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  shadow: { position: 'absolute', left: 0, right: 0, top: 4, bottom: -4 },
  card: { borderWidth: 1.8 },
  fold: { position: 'absolute', left: -1.8, right: -1.8, top: -1.8 },
  ill: { position: 'absolute', left: '50%', marginLeft: -32, top: 26, width: 64, height: 64 },
  nm: { position: 'absolute', left: 0, right: 0, bottom: 12, textAlign: 'center', fontSize: 21, lineHeight: 24 },
  visible: { overflow: 'visible' },
});
