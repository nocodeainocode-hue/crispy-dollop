import React, { memo } from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { F, c } from '../../theme';
import { APath, inkP, pathLen, useLoop, wob } from './ink';
import { useProgress, type Progress } from './Sprout';

// Tekrar kullanılan küçük tuval parçaları: Envelope (SahitDavet), Signature (Imza), StepLeaves (Imza/Kontrol adım yaprakları),
// GardenTag (bahçe etiketi, "neden" notu), PackPlant (Paywall Filiz/Fidan/Ağaç saksıları).

// ------------------------------------------------------------------ Zarf (SahitDavet.dc.html, svg 250x190, wob 2.2)
const ENV_LETTER = wob('M44 96 V30 C44 24 48 20 54 20 H196 C202 20 206 24 206 30 V96Z', 2.2);
const ENV_LINES = wob('M62 44 H188 M62 62 H160', 2.2);
const ENV_TULIP = wob('M170 76 C164 66 164 56 168 48 C174 56 176 66 170 76Z', 2.2);
const ENV_STEM = wob('M169 78 C166 82 166 84 167 88', 2.2);
const ENV_BODY = wob('M12 70 L125 148 L238 70 V166 C238 172 234 176 228 176 H22 C16 176 12 172 12 166Z', 2.2);
const ENV_FOLD = wob('M12 168 L96 112 M238 168 L154 112', 2.2);
const ENV_FLAP = wob('M12 70 L125 150 L238 70', 2.2);

/**
 * Şahit daveti zarfı. Tuval: zarf 6 sn ±1.6° sallanır (alt-orta eksen), mektup 6 sn 8 px yukarı çıkıp iner, mühür 4.5 sn %8 nabız atar.
 * Mühür nabzı tuvaldeki gibi svg merkezinden ölçeklenir (transform-box: view-box). Hareketi azalt: hepsi durağan.
 */
export const Envelope = memo(function Envelope({ style }: { style?: StyleProp<ViewStyle> }) {
  const H = 190;
  const rock = useLoop(3000, 0.5);
  const peek = useLoop(3000, 0);
  const pulse = useLoop(2250, 0);
  const rot = rock.interpolate({ inputRange: [0, 1], outputRange: ['-1.6deg', '1.6deg'] });
  const up = peek.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const sc = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const half = H / 2;
  const layer = { position: 'absolute' as const, left: 0, top: 0, width: 250, height: H };
  return (
    <View pointerEvents="none" style={[{ width: 250, height: H }, style]}>
      <View style={{ width: 250, height: H }}>
        <Animated.View style={{ width: 250, height: H, transform: [{ translateY: half }, { rotate: rot }, { translateY: -half }] }}>
          <Animated.View style={[layer, { transform: [{ translateY: up }] }]}>
            <Svg width={250} height={H} viewBox="0 0 250 190">
              <Path d={ENV_LETTER} fill={c.surf} {...inkP(2.2)} />
              <Path d={ENV_LINES} fill="none" {...inkP(1.6)} stroke={c.edge} strokeDasharray={[2, 5]} />
              <Path d={ENV_TULIP} fill={c.tulip} {...inkP(1.6)} />
              <Path d={ENV_STEM} fill="none" {...inkP(1.8)} />
            </Svg>
          </Animated.View>
          <View style={layer}>
            <Svg width={250} height={H} viewBox="0 0 250 190">
              <Path d={ENV_BODY} fill={c.sageWash} {...inkP(2.4)} />
              <Path d={ENV_FOLD} fill="none" {...inkP(1.8)} opacity={0.6} />
              <Path d={ENV_FLAP} fill="none" {...inkP(2.4)} />
            </Svg>
          </View>
          <Animated.View style={[layer, { transform: [{ scale: sc }] }]}>
            <Svg width={250} height={H} viewBox="0 0 250 190">
              <Path d="M106 148a19 19 0 1 0 38 0a19 19 0 1 0 -38 0Z" fill={c.water} {...inkP(2)} />
              <Path d="M116 156 C116 146 122 140 134 140 C134 150 128 157 116 156Z M116 157 C121 151 125 148 130 145" fill="none" stroke={c.bg} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
});

// ------------------------------------------------------------------ İmza (Imza.dc.html, svg 190x54)
const SIG = 'M6 40 C14 10 26 8 24 30 C22 48 38 14 46 22 C52 28 44 44 56 38 C70 30 66 16 76 24 C84 32 80 44 94 34 C108 24 112 40 126 30 C140 20 150 40 184 18';
const SIG_LEN = pathLen(SIG);
const SIG_BASE = 'M6 46 C60 50 130 50 186 44';

/** El yazısı imza: progress 0..100 (HoldBar ilerlemesi) ile çizilerek belirir (tuval: stroke-dashoffset = 1 - p). */
export const Signature = memo(function Signature({ progress, width = 190, style }: { progress: Progress; width?: number; style?: StyleProp<ViewStyle> }) {
  const p = useProgress(progress);
  const h = (width * 54) / 190;
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={width} height={h} viewBox="0 0 190 54">
        <APath
          d={SIG}
          fill="none"
          {...inkP(2.6)}
          strokeDasharray={[SIG_LEN, SIG_LEN]}
          strokeDashoffset={p.interpolate({ inputRange: [0, 100], outputRange: [SIG_LEN, 0], extrapolate: 'clamp' })}
        />
        <Path d={SIG_BASE} fill="none" {...inkP(1.4)} stroke={c.edge} opacity={0.6} />
      </Svg>
    </View>
  );
});

// ------------------------------------------------------------------ Adım yaprakları (Imza 22x14 gap 6, Kontrol 30x18 gap 10)
const SD_WASH = 'M1.5 9 C5 2.5 14 .8 22 1.8 C27 2.6 29 6 28.6 8.4 C27.4 14 19 16.4 11 15.4 C6 14.6 3 12.4 1.5 9Z';

/** Adım göstergesi: `current` 0 tabanlı; öncekiler dolu yaprak, şimdiki hardal, sonrakiler kesik kurşun taslak. size 'sm' (22x14) | 'md' (30x18). */
export const StepLeaves = memo(function StepLeaves({ count, current, size = 'md', style }: { count: number; current: number; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle> }) {
  const sm = size === 'sm';
  const w = sm ? 22 : 30, h = sm ? 14 : 18;
  return (
    <View accessibilityLabel={`Adım ${current + 1} / ${count}`} style={[styles.row, { gap: sm ? 6 : 10 }, style]}>
      {Array.from({ length: count }, (_, i) => {
        const off = i > current, cur = i === current;
        return (
          <Svg key={i} width={w} height={h} viewBox="0 0 30 18">
            {off ? null : <Path d={SD_WASH} transform="translate(1.4 1.2)" fill={cur ? c.mustard : c.sage} />}
            <Path d={SD_WASH} fill="none" stroke={off ? c.edge : c.fg} strokeWidth={sm ? 1.7 : 1.6} strokeLinejoin="round" strokeDasharray={off ? (sm ? [2.4, 2.8] : [2.6, 3]) : undefined} />
          </Svg>
        );
      })}
    </View>
  );
});

// ------------------------------------------------------------------ Bahçe etiketi (Main/GunTamam: "kızım için")
const TAG_STEM = 'M60 44 l3 62';
const TAG_BOARD = 'M8 8 C30 3 90 3 112 8 C117 20 117 36 112 46 C90 51 30 51 8 46 C3 34 3 20 8 8Z';

/** Bahçe etiketi: toprağa saplı tahta, "neden" notu (el yazısı). Tuvalde 122x110; metin 22 px Caveat, en çok iki satır. */
export const GardenTag = memo(function GardenTag({ text, width = 122, style }: { text: string; width?: number; style?: StyleProp<ViewStyle> }) {
  const k = width / 122;
  return (
    <View style={[{ width, height: 110 * k }, style]}>
      <Svg width={width} height={110 * k} viewBox="0 0 122 110">
        <Path d={TAG_STEM} fill="none" {...inkP(3.4)} />
        <Path d={TAG_BOARD} fill={c.surf} {...inkP(1.8)} />
      </Svg>
      <View style={{ position: 'absolute', left: 10 * k, top: 10 * k, width: 102 * k, height: 38 * k, justifyContent: 'center' }}>
        <Text allowFontScaling={false} numberOfLines={2} style={{ textAlign: 'center', fontFamily: F.hand, fontSize: 22 * k, lineHeight: 23 * k, color: c.fg }}>{text}</Text>
      </View>
    </View>
  );
});

// ------------------------------------------------------------------ Paket bitkileri (Paywall.dc.html .pk .pl, 100x112, wob 2)
export type PackTier = 'filiz' | 'fidan' | 'agac';
const W2 = (d: string) => wob(d, 2);
const PK = {
  filiz: {
    stems: W2('M50 78 C49 66 52 58 50 48'), sw: 3,
    leaves: [W2('M50 62 C40 62 32 56 30 48 C40 46 48 52 50 62Z'), W2('M51 54 C61 54 69 48 71 40 C61 38 53 44 51 54Z')],
    pot: W2('M30 80 H70 L66 104 C65 108 62 109 59 109 H41 C38 109 35 108 34 104Z'), rim: W2('M27 80 H73'),
  },
  fidan: {
    stems: W2('M50 82 C48 62 54 46 49 24'), sw: 3.2,
    leaves: [W2('M49 68 C37 68 28 62 26 54 C38 52 47 58 49 68Z'), W2('M51 58 C63 58 72 52 74 44 C62 42 53 48 51 58Z'), W2('M49 46 C38 46 30 40 28 33 C39 31 47 36 49 46Z'), W2('M50 36 C60 36 67 31 69 24 C59 22 52 27 50 36Z')],
    tulip: W2('M49 26 C44 20 44 12 48 6 C54 12 54 20 49 26Z'),
    pot: W2('M26 82 H74 L69 105 C68 109 65 110 62 110 H38 C35 110 32 109 31 105Z'), rim: W2('M23 82 H77'),
  },
  agac: {
    stems: W2('M50 82 C49 66 51 52 50 38 M50 56 C42 52 36 46 32 40 M50 48 C58 44 64 38 68 32'), sw: 3.4,
    canopy: W2('M50 34 C30 38 14 30 16 18 C18 6 34 2 46 8 C60 2 80 6 84 18 C86 30 68 38 50 34Z'),
    veins: W2('M30 20 C34 14 40 14 44 18 M54 14 C60 10 68 12 70 18 M40 28 C46 24 54 26 58 30'),
    tulip: W2('M72 22 C68 16 68 10 71 5 C76 10 76 16 72 22Z'),
    pot: W2('M24 82 H76 L71 105 C70 109 67 110 64 110 H36 C33 110 30 109 29 105Z'), rim: W2('M21 82 H79'),
  },
} as const;

/** Filiz / Fidan / Ağaç saksı çizimi. `swaying` (seçili kart): 5 sn ±2.4° sallanma, alt-orta eksen; hareketi azalt açıkken durağan. */
export const PackPlant = memo(function PackPlant({ tier, swaying = false, height = 112, style }: { tier: PackTier; swaying?: boolean; height?: number; style?: StyleProp<ViewStyle> }) {
  const k = height / 112;
  const v = useLoop(2500, 0.5, undefined, swaying);
  const rot = swaying ? v.interpolate({ inputRange: [0, 1], outputRange: ['-2.4deg', '2.4deg'] }) : '0deg';
  const half = height / 2;
  const d = PK[tier];
  return (
    <Animated.View pointerEvents="none" style={[{ width: 100 * k, height }, { transform: [{ translateY: half }, { rotate: rot }, { translateY: -half }] }, style]}>
      <Svg width={100 * k} height={height} viewBox="0 0 100 112">
        <Path d={d.stems} fill="none" {...inkP(d.sw)} />
        {'canopy' in d ? <Path d={d.canopy} fill={c.sage} {...inkP(2)} /> : null}
        {'leaves' in d ? d.leaves.map((l, i) => <Path key={i} d={l} fill={c.sage} {...inkP(1.8)} />) : null}
        {'veins' in d ? <Path d={d.veins} fill="none" {...inkP(1.4)} opacity={0.7} /> : null}
        {'tulip' in d ? <Path d={d.tulip} fill={c.tulip} {...inkP(tier === 'agac' ? 1.6 : 1.8)} /> : null}
        <Path d={d.pot} fill={c.pot} {...inkP(2)} />
        <Path d={d.rim} fill="none" {...inkP(3.4)} />
      </Svg>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
