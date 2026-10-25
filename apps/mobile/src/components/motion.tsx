import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, AccessibilityInfo, Easing, Platform, ViewStyle } from 'react-native';

/** Yerel sürücü web'de yok; web'de JS sürücüsüne düşer. */
export const ND = Platform.OS !== 'web';
export const EASE = Easing.out(Easing.cubic);

// Sistem "hareketi azalt" ayarı: açılışta okunur ve CANLI izlenir (ayar uygulama açıkken değişirse hemen yansır).
// Açıkken animasyon süreleri 0 olur, sonsuz döngüler çalışmaz (erişilebilirlik).
let reduce = false;
const listeners = new Set<() => void>();
const setReduce = (v: boolean) => {
  const n = !!v;
  if (n === reduce) return;
  reduce = n;
  listeners.forEach(l => l());
};
try { AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce); } catch { /* web/test: dinleyici yok */ }
/** İlk okuma bitince çözülür (açılış kapısı bekleyecekse kullanır); asla reddedilmez. */
export const reduceMotionReady: Promise<boolean> = Promise.resolve()
  .then(() => AccessibilityInfo.isReduceMotionEnabled?.())
  .then(v => { setReduce(!!v); return reduce; })
  .catch(() => reduce);

export const dur = (ms: number) => (reduce ? 0 : ms);
/** Anlık değer (render dışı kod için); bileşenlerde `useReduceMotion()` kullan. */
export const isReduceMotion = () => reduce;

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = () => reduce;
/** Hareketi azalt açık mı? Ayar değişince bileşen yeniden çizilir. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Yukarı kayarak belirir; `delay` ile arka arkaya (stagger) sıralanır. */
export function Rise({ children, delay = 0, y = 14, ms = 420, style }: { children: React.ReactNode; delay?: number; y?: number; ms?: number; style?: ViewStyle | ViewStyle[] }) {
  const v = useRef(new Animated.Value(0)).current;
  const rm = useReduceMotion();
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: dur(ms), delay: reduce ? 0 : delay, easing: EASE, useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, []);
  useEffect(() => { if (rm) v.setValue(1); }, [rm]); // ayar açık/sonradan açıldıysa doğrudan son kare
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }, style as any]}>{children}</Animated.View>;
}

/**
 * Adım/ekran geçişi: `k` değişince içerik yandan kayarak ve solarak girer.
 * dir: 1 ileri (sağdan), -1 geri (soldan), 0 yalnızca yukarıdan hafif solma.
 * useLayoutEffect: yeni içerik boyanmadan önce başlangıç değeri verilir (bir kare parlama olmaz).
 */
export function StepTransition({ k, dir = 1, children, style }: { k: string | number; dir?: number; children: React.ReactNode; style?: ViewStyle }) {
  const v = useRef(new Animated.Value(1)).current;
  useLayoutEffect(() => {
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration: dur(340), easing: EASE, useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [k]);
  const x = dir === 0 ? 0 : dir * 36, y = dir === 0 ? 12 : 0;
  return (
    <Animated.View style={[{ flex: 1, opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [x, 0] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

/** Sonsuz nabız (0→1→0). Dönüş: Animated.Value (opacity/scale için interpolate et). Hareketi azalt açıkken 0'da durur. */
export function usePulse(ms = 1000) {
  const v = useRef(new Animated.Value(0)).current;
  const rm = useReduceMotion();
  useEffect(() => {
    if (rm) { v.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [rm, ms]);
  return v;
}

/** 0'dan hedefe sayar (ana ekrandaki gün sayacı). */
export function useCountUp(target: number, ms = 900, delay = 150) {
  const rm = useReduceMotion();
  const [n, setN] = useState(reduce ? target : 0);
  useEffect(() => {
    if (rm) { setN(target); return; }
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setN(Math.round(value)));
    const a = Animated.timing(v, { toValue: target, duration: ms, delay, easing: EASE, useNativeDriver: false });
    a.start();
    return () => { a.stop(); v.removeListener(id); };
  }, [target, rm]);
  return n;
}

/** Tek bir değerle sürülen giriş dalgası (0→1); hücre ızgarası gibi çok öğeli yerlerde ucuzdur. */
export function useIntro(ms = 1300, delay = 250) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const rm = useReduceMotion();
  useEffect(() => {
    if (rm) { v.setValue(1); return; }
    const a = Animated.timing(v, { toValue: 1, duration: ms, delay, easing: Easing.out(Easing.quad), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [rm]);
  return v;
}

// ---------------------------------------------------------------------------
// Bahçe hareket kancaları: hepsi hareketi azaltı canlı izler, yerel sürücü kullanır, ucuzdur.
// ---------------------------------------------------------------------------

/**
 * Nefes: 0 → 1 (nefes al, `inMs`) → 1'de bekle (`holdMs`, 0 olabilir) → 0 (ver, `outMs`) ve yeniden. Dönüş: Animated.Value 0..1
 * (ölçek/opaklık için interpolate et). Geçişler sinüs yumuşatmalı; devir birleşimleri değer sabitken olduğundan JS yeniden başlatması görünmez.
 * Hareketi azalt açıkken döngü yok: değer 0.5'te durur (disk orta boyda, sabit).
 */
export function useBreath(inMs: number, holdMs: number, outMs: number) {
  const v = useRef(new Animated.Value(reduce ? 0.5 : 0)).current;
  const rm = useReduceMotion();
  useEffect(() => {
    if (rm) { v.setValue(0.5); return; }
    v.setValue(0);
    const e = Easing.inOut(Easing.sin);
    const steps: Animated.CompositeAnimation[] = [Animated.timing(v, { toValue: 1, duration: inMs, easing: e, useNativeDriver: ND })];
    if (holdMs > 0) steps.push(Animated.timing(v, { toValue: 1, duration: holdMs, useNativeDriver: ND })); // aynı değere yerel "bekleme"
    steps.push(Animated.timing(v, { toValue: 0, duration: outMs, easing: e, useNativeDriver: ND }));
    const loop = Animated.loop(Animated.sequence(steps));
    loop.start();
    return () => loop.stop();
  }, [rm, inMs, holdMs, outMs]);
  return v;
}

/** Sallanma açısının üst sınırı (derece): kriz sahnesindeki yapısal güvence, bitki hiçbir koşulda bundan fazla eğilmez. */
export const SWAY_MAX_DEG = 11;

/**
 * Esinti/sallanma: -maxDeg ile +maxDeg arasında sinüs gibi salınan değer (DERECE cinsinden; maxDeg en çok 11).
 * `degrees(v, maxDeg)` ile rotate dizgisine çevir. Hareketi azalt açıkken 0°'de durur.
 */
export function useSway(maxDeg: number, periodMs: number) {
  const v = useRef(new Animated.Value(0)).current;
  const rm = useReduceMotion();
  const m = Math.min(Math.abs(maxDeg), SWAY_MAX_DEG);
  useEffect(() => {
    if (rm || m === 0) { v.setValue(0); return; }
    const q = periodMs / 4;
    // 0 → +m (çeyrek, sin çıkış) → -m (yarım, sin giriş-çıkış) → 0 (çeyrek, sin giriş): hız birleşimlerde süreklidir.
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: m, duration: q, easing: Easing.out(Easing.sin), useNativeDriver: ND }),
      Animated.timing(v, { toValue: -m, duration: q * 2, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: q, easing: Easing.in(Easing.sin), useNativeDriver: ND }),
    ]));
    v.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [rm, m, periodMs]);
  return v;
}

/** `useSway` değerini `rotate` dizgisine çevirir: transform: [{ rotate: degrees(sway, 8) }]. */
export const degrees = (v: Animated.Value, maxDeg: number) => {
  const m = Math.min(Math.max(Math.abs(maxDeg), 0.01), SWAY_MAX_DEG);
  return v.interpolate({ inputRange: [-m, m], outputRange: [`${-m}deg`, `${m}deg`], extrapolate: 'clamp' });
};

const GROW_EASE = Easing.bezier(0.2, 0.8, 0.2, 1); // aşma/yay yok: sakin, tek açılış
/**
 * Açılış: ölçek .6→1 + opaklık 0→1 (varsayılan 800 ms, gecikme yok, aşma yok). `trigger` değişince bir kez oynar
 * (ilk bağlanmada da); `false/null/undefined` iken gizli (0) bekler. Dönüş doğrudan Animated.View'e verilecek stildir.
 * Hareketi azalt açıkken doğrudan açık.
 */
export function useGrow(trigger: unknown = true, ms = 800) {
  const v = useRef(new Animated.Value(0)).current;
  const off = trigger === false || trigger == null;
  useEffect(() => {
    if (off) { v.setValue(0); return; }
    if (reduce) { v.setValue(1); return; }
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration: ms, easing: GROW_EASE, useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [trigger, ms]);
  return useMemo(() => ({ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }), [v]);
}

/**
 * Basılınca gömülme: düğme `depth` px (varsayılan 3) aşağı iner, bırakınca döner. Kullanım:
 * `const p = usePress(); <Pressable onPressIn={p.onPressIn} onPressOut={p.onPressOut}><Animated.View style={p.style}/></Pressable>`
 */
export function usePress(depth = 3) {
  const v = useRef(new Animated.Value(0)).current;
  const to = useCallback((x: number) => { Animated.timing(v, { toValue: x, duration: dur(x ? 80 : 160), easing: EASE, useNativeDriver: ND }).start(); }, [v]);
  return useMemo(() => ({
    style: { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, depth] }) }] },
    onPressIn: () => to(1),
    onPressOut: () => to(0),
  }), [v, to, depth]);
}
