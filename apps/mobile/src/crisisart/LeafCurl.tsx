import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { c } from '../theme';
import { EASE, ND, dur } from '../components/motion';
import { Leaf } from './geometry';

/**
 * "Yaprak silinmez, kenarı kıvrılır." Bir yaprak; üst kenarı 900 ms'de bir kez kıvrılır (alt kenarından katlanan şerit).
 * Hareketi azalt açıkken kıvrık hâl doğrudan durağan görünür. Süre, ödül ya da halka yok: tek, sakin hareket.
 */
export default function LeafCurl({ size = 150 }: { size?: number }) {
  const w = Math.round(size * 1.7), h = Math.round(size * 0.85);
  const v = useRef(new Animated.Value(dur(1) === 0 ? 1 : 0)).current;
  useEffect(() => {
    if (dur(1) === 0) { v.setValue(1); return; }
    const a = Animated.timing(v, { toValue: 1, duration: dur(900), easing: EASE, useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, []);
  const fw = w * 0.56, fh = h * 0.3;
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: w + 12, height: h + 12, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ rotate: '-7deg' }] }}>
        <Leaf w={w} h={h} kind="ink">
          <Animated.View style={{
            position: 'absolute', left: w * 0.3, top: h * 0.07, width: fw, height: fh, backgroundColor: c.sageWash, borderWidth: 1.6, borderColor: c.fg,
            borderTopLeftRadius: fh * 0.5, borderTopRightRadius: fh * 0.35, borderBottomRightRadius: fh * 0.5, borderBottomLeftRadius: fh * 0.4,
            borderBottomWidth: 3.2, opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
            transform: [{ rotate: '-9deg' }, { translateY: fh / 2 }, { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] }) }, { translateY: -fh / 2 }],
          }} />
        </Leaf>
      </View>
    </View>
  );
}
