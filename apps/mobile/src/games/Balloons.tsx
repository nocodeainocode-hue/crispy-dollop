import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, Easing } from 'react-native';
import { ND } from '../components/motion';
import { T, Kicker } from '../components/ui';
import { c, alpha, BAHCE } from '../theme';
import { useL } from '../i18n';

// Gerçek balonlar: aşağıdan yükselir, havada sallanır, dokununca parçalanarak patlar. Puan yok, süre yok.
// Balonlar iki temada da görünür olmalı (nötr gri dahil). Bahçe: sakin, doygunluğu düşük tonlar.
const COLORS = BAHCE ? ['#CF5F44', '#DCA83F', '#6BA38A', '#7A9CC6', '#C97AA0', '#A7A29C', '#8FAA87'] : ['#EC3013', '#FFB703', '#2EC4B6', '#8E7DFF', '#FF6FA3', '#A7A29C', '#4CC9F0'];
type B = { id: number; x: number; size: number; color: string; rise: number; sway: number; swayMs: number };

function Particle({ angle, dist, color, delay }: { angle: number; dist: number; color: string; delay: number }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(p, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(); }, []);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: color, left: '50%', top: '40%', marginLeft: -4,
      opacity: p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.9, 0] }),
      transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] }) }, { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist + 18] }) }, { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }],
    }} />
  );
}

function Balloon({ b, h, onGone, onPopped }: { b: B; h: number; onGone: (id: number) => void; onPopped: () => void }) {
  const y = useRef(new Animated.Value(h + 40)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const [popped, setPopped] = useState(false);
  const total = b.size * 1.2 + 70; // gövde + düğüm + ip

  useEffect(() => {
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
    onPopped();
    y.stopAnimation(); // olduğu yerde patlasın
    Animated.timing(pop, { toValue: 1, duration: 230, easing: Easing.out(Easing.back(2)), useNativeDriver: ND }).start(() => onGone(b.id));
  };

  const w = b.size, bh = b.size * 1.2;
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: b.x, top: 0, width: w, transform: [{ translateY: y }, { translateX: sway.interpolate({ inputRange: [0, 1], outputRange: [-b.sway, b.sway] }) }, { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] }) }] }}>
      {!popped && (
        <Pressable onPressIn={doPop} hitSlop={10}>
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
        <>
          {/* patlama: halka + parçalar */}
          <Animated.View pointerEvents="none" style={{ width: w, height: bh, borderRadius: w / 2, borderWidth: 3, borderColor: b.color, opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.7] }) }] }} />
          {Array.from({ length: 10 }, (_, i) => <Particle key={i} angle={(i / 10) * Math.PI * 2} dist={w * (0.55 + (i % 3) * 0.18)} color={i % 2 ? b.color : c.fg} delay={0} />)}
        </>
      )}
    </Animated.View>
  );
}

export default function Balloons() {
  const L = useL();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [bs, setBs] = useState<B[]>([]);
  const idRef = useRef(0);
  const [count, setCount] = useState(0); // bu oturumda patlatılan balon sayısı (puan/rekor değil, yalnızca sayaç)
  const onPopped = useCallback(() => setCount(n => n + 1), []);

  const make = useCallback((w: number): B => {
    const s = 54 + Math.random() * 36;
    return { id: ++idRef.current, size: s, x: Math.random() * Math.max(10, w - s), color: COLORS[Math.floor(Math.random() * COLORS.length)], rise: 7500 + Math.random() * 6000, sway: 8 + Math.random() * 22, swayMs: 1600 + Math.random() * 1400 };
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
      <View onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ flex: 1, minHeight: 420, overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, backgroundColor: BAHCE ? alpha(c.sage, 0.14) : 'rgba(76,201,240,0.05)' }}>
        {!!size.h && bs.map(b => <Balloon key={b.id} b={b} h={size.h} onGone={gone} onPopped={onPopped} />)}
        <View pointerEvents="none" style={{ position: 'absolute', top: 10, left: 14 }}>
          <Kicker color={c.dim}>{L.games.popped}</Kicker>
          <T size={46} ls={-2} lh={50}>{count}</T>
        </View>
      </View>
      <T w="s" size={12} color={c.dim} style={{ padding: 12 }}>{L.games.balloonHint}</T>
    </View>
  );
}
