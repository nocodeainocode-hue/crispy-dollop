import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, Easing, Platform, ViewStyle } from 'react-native';

/** Yerel sürücü web'de yok; web'de JS sürücüsüne düşer. */
export const ND = Platform.OS !== 'web';
export const EASE = Easing.out(Easing.cubic);

// Sistem "hareketi azalt" ayarı açıksa animasyon süreleri 0 olur (erişilebilirlik).
let reduce = false;
AccessibilityInfo.isReduceMotionEnabled?.().then(v => { reduce = !!v; }).catch(() => {});
export const dur = (ms: number) => (reduce ? 0 : ms);

/** Yukarı kayarak belirir; `delay` ile arka arkaya (stagger) sıralanır. */
export function Rise({ children, delay = 0, y = 14, ms = 420, style }: { children: React.ReactNode; delay?: number; y?: number; ms?: number; style?: ViewStyle | ViewStyle[] }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: dur(ms), delay: reduce ? 0 : delay, easing: EASE, useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, []);
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

/** Sonsuz nabız (0→1→0). Dönüş: Animated.Value (opacity/scale için interpolate et). */
export function usePulse(ms = 1000) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return v;
}

/** 0'dan hedefe sayar (ana ekrandaki gün sayacı). */
export function useCountUp(target: number, ms = 900, delay = 150) {
  const [n, setN] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) { setN(target); return; }
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setN(Math.round(value)));
    const a = Animated.timing(v, { toValue: target, duration: ms, delay, easing: EASE, useNativeDriver: false });
    a.start();
    return () => { a.stop(); v.removeListener(id); };
  }, [target]);
  return n;
}

/** Tek bir değerle sürülen giriş dalgası (0→1); hücre ızgarası gibi çok öğeli yerlerde ucuzdur. */
export function useIntro(ms = 1300, delay = 250) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    const a = Animated.timing(v, { toValue: 1, duration: ms, delay, easing: Easing.out(Easing.quad), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, []);
  return v;
}
