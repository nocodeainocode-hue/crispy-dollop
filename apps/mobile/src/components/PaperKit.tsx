import React, { useRef, useState } from 'react';
import { View, Pressable, Animated, ViewStyle } from 'react-native';
import { c, pebble } from '../theme';
import { T } from './ui';
import { ND, EASE, dur } from './motion';

// Paket, Profil, Günlük ve Analiz ekranlarının paylaştığı küçük kâğıt/çakıl parçaları.
// Hepsi token renkleriyle, View ile çizilir (glif yok), dokunma hedefi >= 48 dp.

/** View ile çizilmiş ok (yazı tipinde ok glifi beklenmez). dir: sağ ya da aşağı. */
export function Chev({ color = c.dim, size = 9, dir = 'right' }: { color?: string; size?: number; dir?: 'right' | 'down' | 'up' }) {
  const rot = dir === 'right' ? '45deg' : dir === 'down' ? '135deg' : '-45deg';
  return <View style={{ width: size, height: size, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: color, transform: [{ rotate: rot }] }} />;
}

/** View ile çizilmiş onay işareti. */
export function Tick({ color = c.act, size = 14 }: { color?: string; size?: number }) {
  return <View style={{ width: size * 0.55, height: size, borderRightWidth: 3, borderBottomWidth: 3, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -size * 0.2 }} />;
}

/** Küçük yaprak işareti (liste madde imi). */
export function LeafMark({ size = 18, fill = c.sage }: { size?: number; fill?: string }) {
  return (
    <View style={{ width: size, height: size * 0.62, backgroundColor: fill, borderWidth: 1.6, borderColor: c.fg, borderTopLeftRadius: size * 0.62, borderBottomRightRadius: size * 0.62, borderTopRightRadius: 2, borderBottomLeftRadius: 2, transform: [{ rotate: '-25deg' }] }} />
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
    <Pressable onPress={onPress} disabled={disabled} onPressIn={p.onPressIn} onPressOut={p.onPressOut} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
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
    <Pressable onPress={onPress} onPressIn={p.onPressIn} onPressOut={p.onPressOut} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} style={{ marginRight: 8, marginBottom: 8 }}>
      <Animated.View style={[shape, { minHeight: 48, paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: on ? c.act : c.edge, backgroundColor: on ? c.sageWash : c.surf, transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }] }, style]}>
        {on && <View style={{ marginRight: 10 }}><Tick size={13} /></View>}
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
        <View style={{ marginLeft: 10, marginTop: open ? 4 : -2 }}><Chev dir={open ? 'up' : 'down'} size={8} /></View>
      </Pressable>
      {open && <View style={{ paddingBottom: 8 }}>{children}</View>}
    </View>
  );
}
