import React, { useRef } from 'react';
import { View, Pressable, Animated, ViewStyle } from 'react-native';
import { c, pebble } from '../theme';
import { EASE, ND, dur } from '../components/motion';

export type BtnKind = 'act' | 'clay' | 'water' | 'soft' | 'sand' | 'wash';

/** Düğme türünün zemin, yazı ve kenar renkleri (hepsi palet token'ı). */
export const btnColors = (kind: BtnKind) => {
  switch (kind) {
    case 'clay': return { bg: c.clay, fg: c.onClay, border: 'transparent' };
    case 'water': return { bg: c.water, fg: c.onWater, border: 'transparent' };
    case 'soft': return { bg: c.surf, fg: c.fg, border: c.edge };
    case 'sand': return { bg: c.cell, fg: c.fg, border: c.edge };
    case 'wash': return { bg: c.clayWash, fg: c.fg, border: c.edge };
    default: return { bg: c.act, fg: c.onAct, border: 'transparent' };
  }
};

/**
 * Kriz/zor an düğmesi: çakıl biçimli, altında 4 px sert kâğıt gölgesi, basınca 3 px gömülür.
 * ui.tsx'teki ActionBar tam genişlik ve 24 px iç boşluk ister; kriz düğmeleri yan yana durur, bu yüzden ayrı.
 * `h` 64-84 dp (dokunma hedefi). `children` verilmezse yalnız `label` çizilir (çağıran Text koyar).
 */
export default function PebbleBtn({ h = 64, kind = 'act', onPress, disabled, label, flex, tilt = 0, seed, style, children }: {
  h?: number; kind?: BtnKind; onPress?: () => void; disabled?: boolean; label: string; flex?: number; tilt?: number; seed?: string | number;
  style?: ViewStyle; children: React.ReactNode;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: dur(v ? 80 : 160), easing: EASE, useNativeDriver: ND }).start();
  const shape = pebble(h, seed ?? label);
  const col = btnColors(kind);
  const soft = kind === 'soft' || kind === 'sand' || kind === 'wash';
  return (
    <Pressable onPress={onPress} disabled={disabled || !onPress} onPressIn={() => to(1)} onPressOut={() => to(0)}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled || !onPress }}
      style={[{ flex, transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined }, style]}>
      <View style={{ height: h + 4 }}>
        {!disabled && <View style={[shape, { position: 'absolute', left: 0, right: 0, top: 4, height: h, backgroundColor: c.shadow }]} />}
        <Animated.View style={[shape, {
          height: h, backgroundColor: col.bg, borderWidth: soft ? 2 : 0, borderColor: col.border, opacity: disabled ? 0.55 : 1,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14,
          transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }],
        }]}>
          {children}
        </Animated.View>
      </View>
    </Pressable>
  );
}
