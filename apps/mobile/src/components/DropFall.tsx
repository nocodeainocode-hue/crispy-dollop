import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { c, F, alpha } from '../theme';
import { ND, EASE, dur } from './motion';

/**
 * Su damlası: destek mesajı gönderilince bir kez düşer, yüzeye değince halka açılır (View çizimi, sprite yok).
 * Tek seferliktir, sonsuz döngü yok; yalnızca opacity/transform (yerel sürücü). Hareketi azalt: damla yok, halka durağan.
 * Halka ödül değil, suyun yüzeye değmesidir; sayaç, puan ya da tekrar yok.
 */
export function DropFall({ note }: { note: string }) {
  const fall = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const still = dur(1) === 0;

  useEffect(() => {
    if (still) return;
    const a = Animated.parallel([
      Animated.timing(fall, { toValue: 1, duration: dur(1500), easing: Easing.bezier(0.5, 0, 0.9, 0.6), useNativeDriver: ND }),
      Animated.timing(ring, { toValue: 1, duration: dur(1600), delay: dur(1350), easing: EASE, useNativeDriver: ND }),
    ]);
    a.start();
    return () => a.stop();
  }, []);

  const dropStyle = still ? { opacity: 0 } : {
    opacity: fall.interpolate({ inputRange: [0, 0.08, 0.94, 1], outputRange: [0, 1, 1, 0] }),
    transform: [{ translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }) }],
  };
  const ringStyle = still ? { opacity: 0.6 } : {
    opacity: ring.interpolate({ inputRange: [0, 0.02, 1], outputRange: [0, 0.9, 0] }),
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.15] }) }],
  };

  return (
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 6 }}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: 150, height: 92, alignItems: 'center' }}>
        {/* Damla: bir köşesi sivri kare, 45° döndürülmüş (sivri uç yukarıda) */}
        <Animated.View style={[{ position: 'absolute', top: 0, width: 18, height: 18 }, dropStyle]}>
          <View style={{ width: 18, height: 18, backgroundColor: c.water, borderRadius: 9, borderTopRightRadius: 0, transform: [{ rotate: '-45deg' }] }} />
        </Animated.View>
        {/* Su yüzeyi: durağan gölcük + yüzeye değince açılan halka */}
        <View style={{ position: 'absolute', bottom: 8, width: 84, height: 16, borderRadius: 8, backgroundColor: c.waterWash, borderWidth: 2, borderColor: c.water }} />
        <Animated.View style={[{ position: 'absolute', bottom: 0, width: 150, height: 32, borderRadius: 16, borderWidth: 2, borderColor: alpha(c.water, 0.8) }, ringStyle]} />
      </View>
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.hand, fontSize: 24, lineHeight: 30, color: c.water }}>{note}</Text>
    </View>
  );
}
