import React, { useRef, useState } from 'react';
import { View, Pressable, Animated, ViewStyle } from 'react-native';
import { c, pebble } from '../theme';
import { T } from './ui';
import { ND, EASE, dur } from './motion';
import { GIcon } from '../art/misc';
import { tick } from '../haptics';

// Paket, Profil, Günlük ve Analiz ekranlarının paylaştığı küçük kâğıt/çakıl parçaları.
// Simgeler art/misc kütüphanesindendir (tuvaldeki yol verileri); renkler token'dan, dokunma hedefi >= 48 dp.

/** Yan işaret (liste satırı, Katlı bölüm): kütüphanenin "geri" ok başı simgesi döndürülerek. dir: sağ, aşağı ya da yukarı. */
export function Chev({ color = c.dim, size = 9, dir = 'right' }: { color?: string; size?: number; dir?: 'right' | 'down' | 'up' }) {
  const rot = dir === 'right' ? '180deg' : dir === 'down' ? '-90deg' : '90deg'; // simge sola bakar
  return (
    <View style={{ transform: [{ rotate: rot }] }}>
      <GIcon name="back" size={Math.round(size * 2.2)} color={color} strokeWidth={2.8} />
    </View>
  );
}

function usePress() {
  const v = useRef(new Animated.Value(0)).current;
  const to = (x: number) => Animated.timing(v, { toValue: x, duration: dur(x ? 80 : 160), easing: EASE, useNativeDriver: ND }).start();
  return { v, onPressIn: () => to(1), onPressOut: () => to(0) };
}

/** İkincil/yardımcı düğme (çakıl). ghost: yalnız kenar; solid: ada çayı; clay: kil kenar ve yazı (uyarı). En az 52 dp. */
export function Pill({ label, onPress, kind = 'ghost', disabled, minHeight = 52, style }: { label: string; onPress: () => void; kind?: 'ghost' | 'solid' | 'clay' | 'crisis'; disabled?: boolean; minHeight?: number; style?: ViewStyle }) {
  const p = usePress();
  const shape = pebble(Math.max(minHeight, 52), label);
  const filled = kind === 'solid' || kind === 'crisis';
  const bg = kind === 'solid' ? c.act : kind === 'crisis' ? c.clay : 'transparent';
  const fg = kind === 'solid' ? c.onAct : kind === 'crisis' ? c.onClay : kind === 'clay' ? c.clay : c.fg;
  const bd = kind === 'clay' ? c.clay : c.edge;
  return (
    <Pressable onPress={() => { tick(); onPress(); }} disabled={disabled} onPressIn={p.onPressIn} onPressOut={p.onPressOut} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      <Animated.View style={[shape, { minHeight, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: filled ? 0 : 2, borderColor: bd, opacity: disabled ? 0.5 : 1, transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }] }, style]}>
        <T w="b" size={16} color={fg} style={{ textAlign: 'center' }}>{label}</T>
      </Animated.View>
    </Pressable>
  );
}

/** Seçilebilir çip (çakıl). Seçili: sageWash zemin + ada çayı kenar + onay işareti (durum yalnız renkle değil biçimle de ayrılır). En az 48 dp. */
export function Chip({ label, on, onPress, style }: { label: string; on: boolean; onPress: () => void; style?: ViewStyle }) {
  const p = usePress();
  const shape = pebble(52, label);
  return (
    <Pressable onPress={() => { tick(); onPress(); }} onPressIn={p.onPressIn} onPressOut={p.onPressOut} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} style={{ marginRight: 8, marginBottom: 8 }}>
      <Animated.View style={[shape, { minHeight: 48, paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: on ? c.act : c.edge, backgroundColor: on ? c.sageWash : c.surf, transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }] }, style]}>
        {on && <View style={{ marginRight: 8, marginLeft: -4 }}><GIcon name="check" size={20} color={c.act} strokeWidth={3} /></View>}
        <T w="s" size={15} lh={20} color={c.fg} style={{ flexShrink: 1 }}>{label}</T>
      </Animated.View>
    </Pressable>
  );
}

/** Katlı bölüm ("Neden?", "Ayrıntılar"): varsayılan kapalı; açınca içerik görünür. */
export function Fold({ label, children, open: open0 = false }: { label: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(open0);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={label} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center' }}>
        <T w="b" size={15} color={c.dim}>{label}</T>
        <View style={{ marginLeft: 6 }}><Chev dir={open ? 'up' : 'down'} size={8} /></View>
      </Pressable>
      {open && <View style={{ paddingBottom: 8 }}>{children}</View>}
    </View>
  );
}
