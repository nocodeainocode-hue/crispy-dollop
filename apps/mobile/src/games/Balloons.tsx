import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, Easing } from 'react-native';
import { ND, EASE, dur } from '../components/motion';
import { T } from '../components/ui';
import { c, alpha, pebble } from '../theme';
import { useL } from '../i18n';

// Gerçek balonlar: aşağıdan yükselir, havada sallanır, dokununca solarak kaybolur. Puan yok, sayaç yok, süre yok.
// Balonlar iki temada da görünür olmalı. Renkler palet token'ları (gece/gündüz paleti kendiliğinden değişir); her balon oluşurken okunur.
// Hareketi azalt açıkken balonlar yükselmez ve sallanmaz: sabit bir yerde durur, dokununca kaybolur.
const colors = () => [c.tulip, c.mustard, c.sage, c.water, c.clay, c.pot, c.act];
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
type B = { id: number; x: number; size: number; color: string; rise: number; sway: number; swayMs: number };

function Balloon({ b, h, onGone }: { b: B; h: number; onGone: (id: number) => void }) {
  const y = useRef(new Animated.Value(h + 40)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const [popped, setPopped] = useState(false);
  const total = b.size * 1.2 + 70; // gövde + düğüm + ip
  const still = dur(1) === 0;

  useEffect(() => {
    if (still) {
      y.setValue(Math.max(0, (h - total) * (0.1 + ((b.id * 37) % 70) / 100)));
      const t = setTimeout(() => onGone(b.id), b.rise);
      return () => clearTimeout(t);
    }
    const rise = Animated.timing(y, { toValue: -total - 20, duration: b.rise, easing: Easing.linear, useNativeDriver: ND });
    rise.start(({ finished }) => { if (finished) onGone(b.id); });
    const swayLoop = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: b.swayMs, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(sway, { toValue: 0, duration: b.swayMs, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    swayLoop.start();
    return () => { rise.stop(); swayLoop.stop(); };
  }, []);

  const doPop = () => {
    if (popped) return;
    setPopped(true);
    y.stopAnimation(); // olduğu yerde kaybolsun
    Animated.timing(pop, { toValue: 1, duration: dur(260), easing: EASE, useNativeDriver: ND }).start(() => onGone(b.id));
  };

  const w = b.size, bh = b.size * 1.2;
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: b.x, top: 0, width: w, transform: [{ translateY: y }, { translateX: sway.interpolate({ inputRange: [0, 1], outputRange: [-b.sway, b.sway] }) }, { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] }) }] }}>
      {!popped && (
        <Pressable onPressIn={doPop} hitSlop={10} accessibilityRole="button">
          {/* gövde */}
          <View style={{ width: w, height: bh, borderRadius: w / 2, borderBottomLeftRadius: w * 0.46, borderBottomRightRadius: w * 0.46, backgroundColor: b.color }}>
            <View style={{ position: 'absolute', left: w * 0.18, top: bh * 0.12, width: w * 0.2, height: bh * 0.3, borderRadius: w * 0.1, backgroundColor: 'rgba(255,255,255,0.45)', transform: [{ rotate: '20deg' }] }} />
          </View>
          {/* düğüm */}
          <View style={{ alignSelf: 'center', marginTop: -3, width: 10, height: 10, backgroundColor: b.color, transform: [{ rotate: '45deg' }] }} />
          {/* ip */}
          <View style={{ alignSelf: 'center', width: 1.5, height: 56, backgroundColor: c.tint(0.5) }} />
        </Pressable>
      )}
      {popped && (
        // sakin kayboluş: yalnızca solan bir halka (parçacık, sıçrama ya da aşma yok)
        <Animated.View pointerEvents="none" style={{ width: w, height: bh, borderRadius: w / 2, borderWidth: 3, borderColor: b.color, opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.3] }) }] }} />
      )}
    </Animated.View>
  );
}

export default function Balloons() {
  const L = useL();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [bs, setBs] = useState<B[]>([]);
  const idRef = useRef(0);

  const make = useCallback((w: number): B => {
    const s = 54 + Math.random() * 36;
    return { id: ++idRef.current, size: s, x: Math.random() * Math.max(10, w - s), color: pick(colors()), rise: 7500 + Math.random() * 6000, sway: 8 + Math.random() * 22, swayMs: 1600 + Math.random() * 1400 };
  }, []);

  useEffect(() => {
    if (!size.w) return;
    setBs(Array.from({ length: 4 }, () => make(size.w))); // başlangıçta birkaç balon
    const t = setInterval(() => setBs(prev => (prev.length >= 9 ? prev : [...prev, make(size.w)])), 750);
    return () => clearInterval(t);
  }, [size.w]);

  const gone = useCallback((id: number) => setBs(prev => prev.filter(x => x.id !== id)), []);

  return (
    <View style={{ flex: 1 }}>
      <View onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={[pebble(90, 'balloons'), { flex: 1, minHeight: 420, marginHorizontal: 16, overflow: 'hidden', borderWidth: 2, borderColor: c.edge, backgroundColor: alpha(c.sage, 0.14) }]}>
        {!!size.h && bs.map(b => <Balloon key={b.id} b={b} h={size.h} onGone={gone} />)}
      </View>
      <T w="s" size={15} color={c.dim} style={{ padding: 14 }}>{L.games.balloonHint}</T>
    </View>
  );
}
