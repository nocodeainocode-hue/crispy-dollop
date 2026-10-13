import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, TextInput, TextInputProps, TextProps, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, F } from '../theme';
import { ND, EASE, dur, Rise, usePulse } from './motion';
import { useL } from '../i18n';

type W = 'r' | 's' | 'b';
export function T({ w = 'b', size = 14, color = c.fg, ls, lh, style, children, ...rest }: TextProps & { w?: W; size?: number; color?: string; ls?: number; lh?: number }) {
  return <Text {...rest} style={[{ fontFamily: F[w], fontSize: size, color, letterSpacing: ls, lineHeight: lh }, style]}>{children}</Text>;
}
/** Monospace kicker, uppercase tracking */
export const Kicker = ({ children, color = c.fg, style }: { children: React.ReactNode; color?: string; style?: any }) => (
  <Text style={[{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, fontWeight: '700', color }, style]}>{children}</Text>
);
export const Hair = ({ style }: { style?: ViewStyle }) => <View style={[{ height: 1, backgroundColor: c.line }, style]} />;

/** Phone-width column on near-black ground with the red radial glow + faint 22px grid */
export function Screen({ children, crisis }: { children: React.ReactNode; crisis?: boolean }) {
  const grid: any = Platform.OS === 'web' ? {
    backgroundImage: `linear-gradient(${c.tint(c.grid)} 1px,transparent 1px),linear-gradient(90deg,${c.tint(c.grid)} 1px,transparent 1px)`,
    backgroundSize: '22px 22px',
  } : {};
  // İçerik durum çubuğunun altında başlar; alttaki butonlar sistem gezinme çubuğunun (sanal tuşlar) üstünde kalır
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.outer, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 430, backgroundColor: c.bg, overflow: 'hidden' }}>
        <LinearGradient colors={crisis ? ['#5E1509', c.bg] : [c.glow, c.bg]} locations={[0, crisis ? 0.72 : 0.55]} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, grid]} />
        <View style={{ flex: 1, paddingTop: Platform.OS === 'web' ? 18 : Math.max(ins.top + 8, 24), paddingBottom: ins.bottom }}>{children}</View>
      </View>
    </View>
  );
}
export const Body = ({ children, pad = true }: { children: React.ReactNode; pad?: boolean }) => (
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
);

export function Back({ onPress, label, right }: { onPress: () => void; label?: string; right?: React.ReactNode }) {
  const L = useL();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
      <Pressable onPress={onPress} hitSlop={12}><T w="s" size={13}>{label ?? L.common.back}</T></Pressable>
      {right}
    </View>
  );
}

/** Full-width action bar. light = bone on black, red = alert, ghost = hairline top. Basınca hafifçe küçülür, ok sağa kayar. */
export function ActionBar({ label, right = '→', onPress, kind = 'light', height = 72, size = 18, disabled, glow, hoverRed = true }:
  { label: string; right?: string; onPress: () => void; kind?: 'light' | 'red' | 'ghost'; height?: number; size?: number; disabled?: boolean; glow?: boolean; hoverRed?: boolean }) {
  const press = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: dur(v ? 90 : 220), easing: EASE, useNativeDriver: ND }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => to(1)} onPressOut={() => to(0)}>
      {({ hovered }: any) => {
        const bg = kind === 'red' ? (hovered ? '#DD2B0F' : c.acc) : kind === 'ghost' ? (hovered ? c.fg : 'transparent') : hovered && hoverRed ? c.acc : c.fg;
        const fg = kind === 'ghost' ? (hovered ? c.ink : c.fg) : c.ink;
        return (
          <Animated.View style={[{ height, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, opacity: disabled ? 0.45 : 1, borderTopWidth: kind === 'ghost' ? 1 : 0, borderColor: c.line, transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) }] },
            glow ? { shadowColor: c.acc, shadowOpacity: 0.65, shadowRadius: 34, shadowOffset: { width: 0, height: 0 } } : null]}>
            <T size={size} color={fg} ls={-0.3}>{label}</T>
            {!!right && <Animated.View style={{ transform: [{ translateX: press.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }] }}><T size={size} color={fg}>{right}</T></Animated.View>}
          </Animated.View>
        );
      }}
    </Pressable>
  );
}

/** Press-and-hold bar: bone fill → red progress */
export function HoldBar({ label, pct, onDown, onUp }: { label: string; pct: number; onDown: () => void; onUp: () => void }) {
  return (
    <Pressable onPressIn={onDown} onPressOut={onUp} style={{ height: 78, backgroundColor: c.fg, justifyContent: 'center', overflow: 'hidden' } as any}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: c.acc }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <T size={20} color={c.ink}>{label}</T>
        <T size={20} color={c.ink}>{pct ? `${pct}%` : ''}</T>
      </View>
    </Pressable>
  );
}

/** Numbered row like the contract table: 44px index column | text */
export function NumRow({ no, children, last }: { no: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: last ? 0 : 1, borderColor: c.line }}>
      <View style={{ width: 50, paddingVertical: 11, paddingLeft: 16, paddingRight: 8, borderRightWidth: 1, borderColor: c.line }}><T size={13} numberOfLines={1}>{no}</T></View>
      <View style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 12 }}>{typeof children === 'string' ? <T w="r" size={13} lh={18}>{children}</T> : children}</View>
    </View>
  );
}

export function Field(p: TextInputProps & { label?: string }) {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
      {!!p.label && <Kicker color={c.dim} style={{ marginBottom: 6 }}>{p.label}</Kicker>}
      <TextInput placeholderTextColor={c.mute} selectionColor={c.acc} {...p}
        style={[{ fontFamily: F.r, fontSize: 15, color: c.fg, backgroundColor: c.surf, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 0 },
          p.multiline && { minHeight: 120, textAlignVertical: 'top' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null, p.style]} />
    </View>
  );
}

/** Selectable hairline option. Seçilince zemin yumuşakça dolar, onay işareti büyür; listede sırayla girer (`delay`). */
export function Opt({ label, on, onPress, sub, delay = 0 }: { label: string; on: boolean; onPress: () => void; sub?: string; delay?: number }) {
  const sel = useRef(new Animated.Value(on ? 1 : 0)).current;
  const press = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(sel, { toValue: on ? 1 : 0, duration: dur(240), easing: EASE, useNativeDriver: false }).start(); }, [on]);
  const bg = sel.interpolate({ inputRange: [0, 1], outputRange: [c.tint(0), c.fg] });
  const fg = sel.interpolate({ inputRange: [0, 1], outputRange: [c.fg, c.ink] });
  const subC = sel.interpolate({ inputRange: [0, 1], outputRange: [c.dim, c.subOn] });
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: dur(100), useNativeDriver: false }).start();
  return (
    <Rise delay={delay} y={10} ms={360}>
      <Pressable onPress={onPress} onPressIn={() => to(1)} onPressOut={() => to(0)}>
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: c.line, backgroundColor: bg, paddingVertical: 13, paddingHorizontal: 16, transform: [{ translateX: press.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }] }}>
          <View style={{ flex: 1 }}>
            <Animated.Text style={{ fontFamily: F.b, fontSize: 15, color: fg }}>{label}</Animated.Text>
            {!!sub && <Animated.Text style={{ fontFamily: F.r, fontSize: 12, color: subC, marginTop: 2 }}>{sub}</Animated.Text>}
          </View>
          <Animated.Text style={{ fontFamily: F.b, fontSize: 15, color: fg, transform: [{ scale: sel.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) }] }}>{on ? '✓' : '○'}</Animated.Text>
        </Animated.View>
      </Pressable>
    </Rise>
  );
}

/**
 * Onboarding'de "neden böyle çalışıyor" notu. Dikkat çeksin diye sırayla belirir:
 * kutu yukarı kayar -> kırmızı çizgi yukarıdan aşağı "çizilir" -> metin solarak gelir -> kaynak en son.
 * Başlıktaki nokta nabız gibi atar.
 */
export function Science({ children, src }: { children: string; src: string }) {
  const box = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const body = useRef(new Animated.Value(0)).current;
  const source = useRef(new Animated.Value(0)).current;
  const pulse = usePulse(800);
  const L = useL();
  useEffect(() => {
    const t = (v: Animated.Value, ms: number, native: boolean) => Animated.timing(v, { toValue: 1, duration: dur(ms), easing: EASE, useNativeDriver: native });
    const seq = Animated.sequence([Animated.delay(dur(380)), t(box, 420, ND), t(bar, 480, false), t(body, 520, ND), t(source, 400, ND)]);
    seq.start();
    return () => seq.stop();
  }, []);
  return (
    <Animated.View style={{ marginHorizontal: 16, marginTop: 18, opacity: box, transform: [{ translateY: box.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      <View style={{ backgroundColor: 'rgba(236,48,19,0.07)', borderWidth: 1, borderColor: 'rgba(236,48,19,0.35)', paddingVertical: 14, paddingLeft: 18, paddingRight: 14 }}>
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 4, backgroundColor: c.acc, height: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.acc2, marginRight: 8, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }] }} />
          <Kicker color={c.acc2}>{L.science}</Kicker>
        </View>
        <Animated.View style={{ opacity: body, transform: [{ translateY: body.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          <T w="r" size={13.5} lh={20} color={c.fg} style={{ marginTop: 8 }}>{children}</T>
        </Animated.View>
        <Animated.Text style={{ fontFamily: F.mono, fontSize: 10, color: c.mute, marginTop: 10, lineHeight: 14, opacity: source }}>{src}</Animated.Text>
      </View>
    </Animated.View>
  );
}

/** Adım ilerleme çubuğu: ince, kırmızı, her adımda yumuşakça uzar; adımlar arasında işaretler var. */
export function StepProgress({ step, total }: { step: number; total: number }) {
  const v = useRef(new Animated.Value((step + 1) / total)).current;
  useEffect(() => { Animated.timing(v, { toValue: (step + 1) / total, duration: dur(450), easing: EASE, useNativeDriver: false }).start(); }, [step]);
  return (
    <View style={{ height: 3, backgroundColor: c.tint(0.14) }}>
      <Animated.View style={{ height: 3, backgroundColor: c.acc, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }} pointerEvents="none">
        {Array.from({ length: total - 1 }, (_, i) => <View key={i} style={{ flex: 1, borderRightWidth: 1, borderColor: c.bg }} />)}
      </View>
    </View>
  );
}

/** Sağ üstteki rozet: tek başına konumlanmaz, TopChips satırında dizilir (uzun dillerde üst üste binmesin). */
function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 }}>
      <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, fontWeight: '700', color: c.fg }}>{label}</Text>
    </Pressable>
  );
}

/** Sağ üst köşe: "PROFİL" (varsa) ve "VASİ" rozetleri. VASİ aynı uygulamada vasi tarafına geçirir. */
export function TopChips({ onGuardian, onProfile }: { onGuardian: () => void; onProfile?: () => void }) {
  const L = useL();
  return (
    <View style={{ position: 'absolute', top: Platform.OS === 'web' ? 20 : 54, right: 16, zIndex: 10, flexDirection: 'row' }}>
      {onProfile && <Chip label={L.chips.profile} onPress={onProfile} />}
      <Chip label={L.chips.guardian} onPress={onGuardian} />
    </View>
  );
}
