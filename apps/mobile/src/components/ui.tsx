import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, TextInput, TextInputProps, TextProps, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, F, BAHCE, alpha, pebble } from '../theme';
import { ND, EASE, dur, Rise, usePulse, usePress } from './motion';
import { tick } from '../haptics';
import { useL } from '../i18n';

// Bu dosya iki görünümü taşır: klasik (Modernist) ve Bahçe (BAHCE sabiti derleme zamanında belli; render sırasında değişmez).
// Bahçe: kâğıt zemin, çakıl (kusurlu yuvarlak) düğmeler, sert kâğıt gölgesi, Nunito/Fraunces. Bileşen API'leri iki görünümde aynıdır.

type W = 'r' | 's' | 'b';
export function T({ w, size = 14, color = c.fg, ls, lh, style, children, ...rest }: TextProps & { w?: W; size?: number; color?: string; ls?: number; lh?: number }) {
  // w verilmemişse ve boyut >= 26 ise başlık ailesi (Bahçe: Fraunces); açık w her zaman gövde ailesidir.
  const fam = w ? F[w] : size >= 26 ? F.d : F.b;
  // Bahçe başlıklarında harf aralığı ve satır yüksekliği sınırlanır: Türkçe aksanlar (Ğ İ Ş Ö Ü) kırpılmasın.
  const ls2 = BAHCE && ls != null ? Math.max(ls, -0.02 * size) : ls;
  const lh2 = BAHCE && lh != null ? Math.max(lh, Math.round(size * 1.12)) : lh;
  return <Text {...rest} style={[{ fontFamily: fam, fontSize: size, color, letterSpacing: ls2, lineHeight: lh2 }, BAHCE && Platform.OS === 'android' ? { includeFontPadding: false } : null, style]}>{children}</Text>;
}
/** Kicker: üst etiket. Klasik: monospace 10,5; Bahçe: Nunito ExtraBold 13 (okunabilir, büyük harf sabit dizelerde). */
export const Kicker = ({ children, color = c.fg, style }: { children: React.ReactNode; color?: string; style?: any }) => BAHCE
  ? <Text style={[{ fontFamily: F.mono, fontSize: 13, letterSpacing: 1.2, color }, style]}>{children}</Text>
  : <Text style={[{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.5, fontWeight: '700', color }, style]}>{children}</Text>;
export const Hair = ({ style }: { style?: ViewStyle }) => <View style={[{ height: 1, backgroundColor: c.line }, style]} />;

/** Telefon genişliğinde sütun. Klasik: koyu zemin + kırmızı ışık + ızgara. Bahçe: düz kâğıt/yeşil zemin; kriz ekranında gökyüzü tonu. */
export function Screen({ children, crisis }: { children: React.ReactNode; crisis?: boolean }) {
  const grid: any = !BAHCE && Platform.OS === 'web' ? {
    backgroundImage: `linear-gradient(${c.tint(c.grid)} 1px,transparent 1px),linear-gradient(90deg,${c.tint(c.grid)} 1px,transparent 1px)`,
    backgroundSize: '22px 22px',
  } : {};
  // İçerik durum çubuğunun altında başlar; alttaki butonlar sistem gezinme çubuğunun (sanal tuşlar) üstünde kalır
  const ins = useSafeAreaInsets();
  const wash: [string, string] = BAHCE ? [crisis ? c.sky : c.bg, c.bg] : [crisis ? '#5E1509' : c.glow, c.bg];
  return (
    <View style={{ flex: 1, backgroundColor: c.outer, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 430, backgroundColor: c.bg, overflow: 'hidden' }}>
        {(!BAHCE || crisis) && <LinearGradient colors={wash} locations={[0, crisis ? 0.72 : 0.55]} style={StyleSheet.absoluteFill} />}
        {!BAHCE && <View pointerEvents="none" style={[StyleSheet.absoluteFill, grid]} />}
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
      <Pressable onPress={onPress} hitSlop={12} style={{ minHeight: BAHCE ? 44 : undefined, justifyContent: 'center' }}><T w="s" size={BAHCE ? 16 : 13}>{label ?? L.common.back}</T></Pressable>
      {right}
    </View>
  );
}

/** Yan işaret: View ile çizilen ok (yazı tipi paketlerinde → glifi beklenmez). */
function Chevron({ color, size = 9 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: color, transform: [{ rotate: '45deg' }], marginRight: 4 }} />;
}

type ABProps = { label: string; right?: string; onPress: () => void; kind?: 'light' | 'red' | 'ghost' | 'water'; height?: number; size?: number; disabled?: boolean; glow?: boolean; hoverRed?: boolean };

/** Klasik: tam genişlik çubuk (light = kemik, red = uyarı, ghost = çizgi). Basınca hafifçe küçülür, ok sağa kayar. */
function ClassicActionBar({ label, right = '→', onPress, kind = 'light', height = 72, size = 18, disabled, glow, hoverRed = true }: ABProps) {
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

/**
 * Bahçe: çakıl düğme. Altında 4 px aşağıda duran sert kâğıt gölgesi; basınca düğme 3 px gömülür. light = ada çayı (ana eylem),
 * red = kil (kriz/uyarı), water = şahit dünyası, ghost = yalnız kenar. Yükseklik 60-84 dp arasına sıkıştırılır (dokunma hedefi).
 */
function PebbleActionBar({ label, right = '→', onPress, kind = 'light', height = 72, size = 18, disabled }: ABProps) {
  const pr = usePress(3); // basınca 3 px gömülme (yerel sürücü)
  const h = Math.max(60, Math.min(height, 84));
  const shape = pebble(h, label);
  const ghost = kind === 'ghost';
  const bg = kind === 'red' ? c.clay : kind === 'water' ? c.water : ghost ? 'transparent' : c.act;
  const fg = kind === 'red' ? c.onClay : kind === 'water' ? c.onWater : ghost ? c.fg : c.onAct;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
      <Pressable onPress={() => { tick(); onPress(); }} disabled={disabled} onPressIn={pr.onPressIn} onPressOut={pr.onPressOut} accessibilityRole="button" accessibilityLabel={label}>
        <View style={{ height: h + 4 }}>
          {!ghost && !disabled && <View style={[shape, { position: 'absolute', left: 0, right: 0, top: 4, height: h, backgroundColor: c.shadow }]} />}
          <Animated.View style={[shape, { height: h, backgroundColor: bg, borderWidth: ghost ? 2 : 0, borderColor: c.edge, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, opacity: disabled ? 0.5 : 1 }, pr.style]}>
            <T w="b" size={Math.max(19, Math.min(size, 24))} color={fg} style={{ flexShrink: 1 }} numberOfLines={2}>{label}</T>
            {!!right && <Chevron color={fg} />}
          </Animated.View>
        </View>
      </Pressable>
    </View>
  );
}
export const ActionBar: React.ComponentType<ABProps> = BAHCE ? PebbleActionBar : ClassicActionBar;

/** Basılı tutarak onaylama. Klasik: kemik zemin → kırmızı ilerleme. Bahçe: ada çayı çakıl, içinde açılan ilerleme. */
export function HoldBar({ label, pct, onDown, onUp }: { label: string; pct: number; onDown: () => void; onUp: () => void }) {
  if (BAHCE) {
    const h = 76, shape = pebble(h, label);
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
        <Pressable onPressIn={onDown} onPressOut={onUp} accessibilityRole="button" accessibilityLabel={label}>
          <View style={{ height: h + 4 }}>
            <View style={[shape, { position: 'absolute', left: 0, right: 0, top: 4, height: h, backgroundColor: c.shadow }]} />
            <View style={[shape, { height: h, backgroundColor: c.act, overflow: 'hidden', justifyContent: 'center' }]}>
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: alpha(c.onAct, 0.26) }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 }}>
                <T w="b" size={21} color={c.onAct}>{label}</T>
                <T w="b" size={21} color={c.onAct}>{pct ? `${pct}%` : ''}</T>
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    );
  }
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

/** Numaralı satır (sözleşme tablosu): 50 px indeks sütunu | metin */
export function NumRow({ no, children, last }: { no: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: last ? 0 : 1, borderColor: c.line }}>
      <View style={{ width: 50, paddingVertical: 11, paddingLeft: 16, paddingRight: 8, borderRightWidth: 1, borderColor: c.line }}><T size={BAHCE ? 15 : 13} numberOfLines={1}>{no}</T></View>
      <View style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 12 }}>{typeof children === 'string' ? <T w="r" size={BAHCE ? 15 : 13} lh={BAHCE ? 22 : 18}>{children}</T> : children}</View>
    </View>
  );
}

export function Field(p: TextInputProps & { label?: string }) {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
      {!!p.label && <Kicker color={c.dim} style={{ marginBottom: 6 }}>{p.label}</Kicker>}
      <TextInput placeholderTextColor={c.mute} selectionColor={c.acc} {...p}
        style={[BAHCE
          ? { fontFamily: F.r, fontSize: 17, color: c.fg, backgroundColor: c.surf, borderWidth: 2, borderColor: c.edge, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18, minHeight: 52 }
          : { fontFamily: F.r, fontSize: 15, color: c.fg, backgroundColor: c.surf, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 0 },
          p.multiline && { minHeight: 120, textAlignVertical: 'top' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null, p.style]} />
    </View>
  );
}

/** Seçenek. Klasik: çizgili satır, seçilince zemin dolar. Bahçe: kâğıt kart (çakıl), seçilince ada çayı kenar + sage yıkama + çizilmiş onay. */
export function Opt({ label, on, onPress, sub, delay = 0 }: { label: string; on: boolean; onPress: () => void; sub?: string; delay?: number }) {
  const sel = useRef(new Animated.Value(on ? 1 : 0)).current;
  const press = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(sel, { toValue: on ? 1 : 0, duration: dur(240), easing: EASE, useNativeDriver: false }).start(); }, [on]);
  const bg = sel.interpolate({ inputRange: [0, 1], outputRange: [c.tint(0), c.fg] });
  const fg = sel.interpolate({ inputRange: [0, 1], outputRange: [c.fg, c.ink] });
  const subC = sel.interpolate({ inputRange: [0, 1], outputRange: [c.dim, c.subOn] });
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: dur(100), useNativeDriver: false }).start();
  if (BAHCE) {
    const shape = pebble(64, label);
    return (
      <Rise delay={delay} y={10} ms={360}>
        <Pressable onPress={() => { tick(); onPress(); }} onPressIn={() => to(1)} onPressOut={() => to(0)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label}>
          <Animated.View style={[shape, { marginHorizontal: 16, marginVertical: 5, minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 22, paddingRight: 18, borderWidth: 2, borderColor: on ? c.act : c.line, backgroundColor: on ? c.sageWash : c.surf, transform: [{ translateX: press.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }] }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.b, fontSize: 17, color: c.fg }}>{label}</Text>
              {!!sub && <Text style={{ fontFamily: F.r, fontSize: 14, color: c.dim, marginTop: 2, lineHeight: 20 }}>{sub}</Text>}
            </View>
            <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: on ? c.act : c.edge, backgroundColor: on ? c.act : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on && <View style={{ width: 8, height: 14, borderRightWidth: 3, borderBottomWidth: 3, borderColor: c.onAct, transform: [{ rotate: '45deg' }], marginTop: -3 }} />}
            </View>
          </Animated.View>
        </Pressable>
      </Rise>
    );
  }
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
 * kutu yukarı kayar -> vurgu çizgisi yukarıdan aşağı "çizilir" -> metin solarak gelir -> kaynak en son.
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
      <View style={{ backgroundColor: alpha(c.acc, BAHCE ? 0.1 : 0.07), borderWidth: BAHCE ? 2 : 1, borderColor: alpha(c.acc, BAHCE ? 0.4 : 0.35), borderRadius: BAHCE ? 22 : 0, overflow: 'hidden', paddingVertical: 14, paddingLeft: 18, paddingRight: 14 }}>
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 4, backgroundColor: c.acc, height: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.acc2, marginRight: 8, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }] }} />
          <Kicker color={c.acc2}>{L.science}</Kicker>
        </View>
        <Animated.View style={{ opacity: body, transform: [{ translateY: body.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          <T w="r" size={BAHCE ? 15 : 13.5} lh={BAHCE ? 22 : 20} color={c.fg} style={{ marginTop: 8 }}>{children}</T>
        </Animated.View>
        <Animated.Text style={{ fontFamily: BAHCE ? F.r : F.mono, fontSize: BAHCE ? 13 : 10, color: c.mute, marginTop: 10, lineHeight: BAHCE ? 18 : 14, opacity: source }}>{src}</Animated.Text>
      </View>
    </Animated.View>
  );
}

/** Adım ilerleme çubuğu. Klasik: ince, kırmızı. Bahçe: yuvarlak uçlu, ada çayı; her adımda yumuşakça uzar. */
export function StepProgress({ step, total }: { step: number; total: number }) {
  const v = useRef(new Animated.Value((step + 1) / total)).current;
  useEffect(() => { Animated.timing(v, { toValue: (step + 1) / total, duration: dur(450), easing: EASE, useNativeDriver: false }).start(); }, [step]);
  if (BAHCE) {
    return (
      <View style={{ marginHorizontal: 16, height: 8, borderRadius: 4, backgroundColor: c.sageWash, overflow: 'hidden' }}>
        <Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: c.act, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      </View>
    );
  }
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
    <Pressable onPress={onPress} hitSlop={10} style={BAHCE
      ? { borderWidth: 2, borderColor: c.edge, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8, minHeight: 40, justifyContent: 'center' }
      : { borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 }}>
      {BAHCE
        ? <Text style={{ fontFamily: F.mono, fontSize: 13, letterSpacing: 1, color: c.fg }}>{label}</Text>
        : <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, fontWeight: '700', color: c.fg }}>{label}</Text>}
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
