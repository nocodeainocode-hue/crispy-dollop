import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G } from 'react-native-svg';
import { LeafGlyph } from '../art/plant';
import { dur } from '../components/motion';

const AG = Animated.createAnimatedComponent(G);

/**
 * "Yaprak silinmez, kenarı kıvrılır." art/plant yaprak çizimi (look "ink" -> "curl"): 900 ms'de bir kez, ortadaki 360 ms'de iki katman
 * çapraz solar (kütüphanede kıvrılma hareketi yok; iki hâl aynı çerçevede üst üste durur). Başka hareket, süre, halka ya da ödül yok.
 * Hareketi azalt açıkken kıvrık hâl doğrudan durağan görünür. Ekran okuyucudan gizli (başlık ve sayı zaten anlatıyor).
 */
export default function CurlLeaf({ width = 190 }: { width?: number }) {
  const v = useRef(new Animated.Value(dur(1) === 0 ? 1 : 0)).current;
  useEffect(() => {
    if (dur(1) === 0) { v.setValue(1); return; }
    const a = Animated.timing(v, { toValue: 1, duration: dur(900), easing: Easing.linear, useNativeDriver: false }); // SVG öznitelikleri: JS sürücü
    a.start();
    return () => a.stop();
  }, []);
  const ink = v.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [1, 1, 0, 0] });
  const curl = v.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0, 1, 1] });
  const h = Math.round((width * 34) / 52);
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width, height: h, transform: [{ rotate: '-7deg' }] }}>
      <Svg width={width} height={h} viewBox="-2 -14 52 34" style={{ overflow: 'visible' }}>
        <AG opacity={ink}><LeafGlyph look="ink" variant={2} /></AG>
        <AG opacity={curl}><LeafGlyph look="curl" variant={2} /></AG>
      </Svg>
    </View>
  );
}
