import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { c } from '../../theme';
import { APath, inkP, wob } from './ink';

// Tuval: Imza.dc.html (.sprout, .hold) ve Hareket.dc.html "Basılı tut, filiz büyür". İmza anı: tohum -> filiz.
// svg 72x92, wob (scale 2); kök-gövde 3.2; yapraklar 1.8; ölçek 0.22 + 0.78p (alt-orta eksen), yapraklar p 0.45..0.8 arasında belirir.

/** 0..100 sayı ya da (JS sürücülü) Animated.Value. Animated.Value verilirse React yeniden çizilmeden büyür. */
export type Progress = number | Animated.Value;

export function useProgress(p: Progress): Animated.Value {
  const own = useRef(new Animated.Value(typeof p === 'number' ? p : 0)).current;
  useEffect(() => { if (typeof p === 'number') own.setValue(p); }, [p, own]);
  return typeof p === 'number' ? own : p;
}

const STEM = wob('M36 80 C35 62 38 48 36 34', 2);
const LEAF1 = wob('M36 58 C24 58 14 50 12 40 C24 38 34 46 36 58Z', 2);
const LEAF2 = wob('M36 44 C48 44 58 36 60 26 C48 24 38 32 36 44Z', 2);
const BUD = wob('M36 36 C30 30 30 22 34 14 C40 20 40 30 36 36Z', 2);

/** Filiz: progress 0..100. width 72 varsayılan (yükseklik 92/72 oranı). */
export const Sprout = memo(function Sprout({ progress, width = 72, style }: { progress: Progress; width?: number; style?: StyleProp<ViewStyle> }) {
  const p = useProgress(progress);
  const h = (width * 92) / 72;
  const scale = p.interpolate({ inputRange: [0, 100], outputRange: [0.22, 1], extrapolate: 'clamp' });
  // alt-orta eksende ölçek: merkez ekseninde ölçekleyip alta kaydır (h * (1 - s) / 2)
  const ty = p.interpolate({ inputRange: [0, 100], outputRange: [h * 0.39, 0], extrapolate: 'clamp' });
  const leafOp = p.interpolate({ inputRange: [0, 45, 80, 100], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  return (
    <Animated.View pointerEvents="none" style={[{ width, height: h, transform: [{ translateY: ty }, { scale }] }, style]}>
      <Svg width={width} height={h} viewBox="0 0 72 92">
        <Path d={STEM} fill="none" {...inkP(3.2)} />
        <APath d={LEAF1} fill={c.sage} {...inkP(1.8)} opacity={leafOp} />
        <APath d={LEAF2} fill={c.sage} {...inkP(1.8)} opacity={leafOp} />
        <Path d={BUD} fill={c.mustard} {...inkP(1.8)} />
      </Svg>
    </Animated.View>
  );
});

const POT = wob('M8 4 H88 L82 40 C81 46 76 48 72 48 H24 C20 48 15 46 14 40 Z', 2);
const RIM = wob('M4 4 H92', 2);

/** Saksı (96x52): tuvaldeki imza düğmesinin altındaki kil saksı. */
export const SproutPot = memo(function SproutPot({ width = 96, style }: { width?: number; style?: StyleProp<ViewStyle> }) {
  const h = (width * 52) / 96;
  return (
    <View pointerEvents="none" style={[{ width, height: h }, style]}>
      <Svg width={width} height={h} viewBox="0 0 96 52">
        <Path d={POT} fill={c.pot} {...inkP(2)} />
        <Path d={RIM} fill="none" {...inkP(3.4)} />
      </Svg>
    </View>
  );
});

/**
 * Tuvaldeki 170x170 imza kutusunun içindeki filiz + saksı kümesi (disk ve halka HoldBar'ın).
 * state 'hold': tuvaldeki basılı-tutma yerleşimi (filiz üstte, top 6). 'done': söz verildi yerleşimi (filiz saksıya oturur, top 34, tam boy).
 */
export const SproutInPot = memo(function SproutInPot({ progress = 0, state = 'hold' }: { progress?: Progress; state?: 'hold' | 'done' }) {
  return (
    <View pointerEvents="none" style={styles.box}>
      <View style={{ position: 'absolute', left: 49, top: state === 'done' ? 34 : 6 }}>
        <Sprout progress={state === 'done' ? 100 : progress} />
      </View>
      <SproutPot style={{ position: 'absolute', left: 37, top: 92 }} />
    </View>
  );
});

const styles = StyleSheet.create({ box: { width: 170, height: 170 } });
