import React, { useRef } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { T } from '../components/ui';
import { c } from '../theme';
import { EASE, ND, dur } from '../components/motion';

const TOOTH = 22;                       // dönmüş karenin kenarı
const DIAG = Math.round(TOOTH * 1.414); // diş genişliği
const TH = Math.round(DIAG / 2);        // diş yüksekliği
const TEETH = 14;

/**
 * Tohum paketi kartı: c.surf kâğıt, ±1,2 derece eğik, üst kenarı View ile zikzaklı (dönmüş kareler, alt yarısı kırpılır).
 * İçinde TextInput yok (eğim yalnız dekoratif kartlarda). Dokunma hedefi >= 64 dp. Sert kâğıt gölgesi 4 px aşağıda.
 */
export default function SeedPacket({ title, sub, index, tone, onPress }: { title: string; sub?: string; index: number; tone: string; onPress: () => void }) {
  const press = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: dur(v ? 80 : 160), easing: EASE, useNativeDriver: ND }).start();
  const tilt = index % 2 ? 1.2 : -1.2;
  return (
    <Pressable onPress={onPress} onPressIn={() => to(1)} onPressOut={() => to(0)} accessibilityRole="button" accessibilityLabel={sub ? `${title}. ${sub}` : title}
      style={{ marginHorizontal: 16, marginTop: 14, transform: [{ rotate: `${tilt}deg` }] }}>
      <Animated.View style={{ transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }] }}>
        {/* zikzaklı üst kenar */}
        <View style={{ height: TH, overflow: 'hidden' }} pointerEvents="none">
          {Array.from({ length: TEETH }, (_, i) => (
            <View key={i} style={{ position: 'absolute', left: DIAG / 2 + i * DIAG - TOOTH / 2, top: TH - TOOTH / 2, width: TOOTH, height: TOOTH, backgroundColor: c.surf, borderWidth: 2, borderColor: c.edge, transform: [{ rotate: '45deg' }] }} />
          ))}
        </View>
        <View>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, backgroundColor: c.shadow, borderBottomLeftRadius: 26, borderBottomRightRadius: 20 }} />
          <View style={{ minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 18, paddingRight: 20, backgroundColor: c.surf, borderWidth: 2, borderTopWidth: 0, borderColor: c.edge, borderBottomLeftRadius: 26, borderBottomRightRadius: 20 }}>
            {/* tohum */}
            <View style={{ width: 36, height: 26, marginRight: 16, backgroundColor: tone, borderWidth: 2, borderColor: c.fg, borderTopLeftRadius: 16, borderTopRightRadius: 9, borderBottomRightRadius: 15, borderBottomLeftRadius: 8, transform: [{ rotate: '-18deg' }] }} />
            <View style={{ flex: 1 }}>
              <T size={22} lh={26} maxFontSizeMultiplier={1.2}>{title}</T>
              {!!sub && <T w="r" size={15} lh={20} color={c.dim} maxFontSizeMultiplier={1.2} style={{ marginTop: 1 }}>{sub}</T>}
            </View>
            <View style={{ width: 10, height: 10, marginLeft: 10, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: c.fg, transform: [{ rotate: '45deg' }] }} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}
