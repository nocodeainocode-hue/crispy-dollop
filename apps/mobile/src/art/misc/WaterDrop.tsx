import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { c } from '../../theme';
import { ND, dur } from '../../components/motion';
import { BEZ_FALL, BEZ_OUT, inkP, isReduced } from './ink';

// Tuval: SahitPortal.dc.html (.drop, .ripple) ve Hareket.dc.html "Su damlası" (1,5 sn · tek damla · şahit destek gönderince).
// Düşme: 1.5 sn cubic-bezier(.5,0,.9,.6), opaklık 0->1 (ilk %15); halka: 1.6 sn ease-out, 1.35 sn gecikmeyle, ölçek .2->1.6, opaklık .9->0.
// Gecikme sırasında halka tuvaldeki "both" dolgusu gibi küçük (ölçek .2) görünür. Hareketi azalt: damla yok, halka .7 opaklıkta sabit.

export type DropGeometry = { dropLeft: number; dropTop: number; fall: number; dropW: number; dropH: number; rLeft: number; rTop: number; rW: number; rH: number; rTo: number };

/** Portal (342x252 pencere) ölçüleri. */
export const DROP_PORTAL: DropGeometry = { dropLeft: 158, dropTop: -24, fall: 246, dropW: 26, dropH: 34, rLeft: 131, rTop: 226, rW: 80, rH: 20, rTo: 1.6 };
/** Hareket sayfası demosu (356x180 sahne). */
export const DROP_DEMO: DropGeometry = { dropLeft: 225, dropTop: -10, fall: 110, dropW: 22, dropH: 30, rLeft: 196, rTop: 138, rW: 80, rH: 16, rTo: 1.7 };

const DROP = 'M13 2 C13 2 3 15 3 22 C3 28 8 32 13 32 C18 32 23 28 23 22 C23 15 13 2 13 2Z';
const HI = 'M8 22 C8 25 10 27 12 27';

/**
 * Su damlası + halka. `active` true olunca bir kez oynar; `playKey` değişince yeniden oynar (örn. destek gönderildikçe artır).
 * Kapsayıcı üst bileşenin (ör. ArchWindow içeriği) sol-üstüne mutlak yerleşir; `geometry` ile sahneye göre ayarlanır.
 */
export const WaterDrop = memo(function WaterDrop({ active = true, playKey = 0, onDone, geometry = DROP_PORTAL, highlight = true }: {
  active?: boolean; playKey?: number | string; onDone?: () => void; geometry?: DropGeometry; highlight?: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  const r = useRef(new Animated.Value(0)).current;
  const g = geometry;
  useEffect(() => {
    if (!active) return;
    t.setValue(0); r.setValue(0);
    if (isReduced()) return;
    const a = Animated.parallel([
      Animated.timing(t, { toValue: 1, duration: dur(1500), easing: Easing.linear, useNativeDriver: ND }),
      Animated.timing(r, { toValue: 1, duration: dur(1600), delay: dur(1350), easing: Easing.linear, useNativeDriver: ND }),
    ]);
    a.start(({ finished }) => { if (finished) onDone?.(); });
    return () => a.stop();
  }, [active, playKey]);
  if (!active) return null;
  const reduced = isReduced();
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [0, g.fall], easing: BEZ_FALL });
  const op = t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1], easing: BEZ_FALL });
  const rs = r.interpolate({ inputRange: [0, 1], outputRange: [0.2, g.rTo], easing: BEZ_OUT });
  const ro = r.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0], easing: BEZ_OUT });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={{ position: 'absolute', left: g.rLeft, top: g.rTop, width: g.rW, height: g.rH, opacity: reduced ? 0.7 : ro, transform: reduced ? undefined : [{ scale: rs }] }}>
        <Svg width={g.rW} height={g.rH}>
          <Ellipse cx={g.rW / 2} cy={g.rH / 2} rx={g.rW / 2 - 1.1} ry={g.rH / 2 - 1.1} fill="none" stroke={c.water} strokeWidth={2.2} />
        </Svg>
      </Animated.View>
      {reduced ? null : (
        <Animated.View style={{ position: 'absolute', left: g.dropLeft, top: g.dropTop, width: g.dropW, height: g.dropH, opacity: op, transform: [{ translateY: ty }] }}>
          <Svg width={g.dropW} height={g.dropH} viewBox="0 0 26 34">
            <Path d={DROP} fill={c.water} {...inkP(2)} />
            {highlight ? <Path d={HI} fill="none" stroke={c.surf} strokeWidth={2} strokeLinecap="round" opacity={0.8} /> : null}
          </Svg>
        </Animated.View>
      )}
    </View>
  );
});
