import React from 'react';
import { View, Animated } from 'react-native';
import { c } from '../theme';

// Paket kartlarındaki küçük bitki çizimleri (Filiz 30, Fidan 60, Ağaç 90). Yalnızca View ve borderRadius; sprite ve SVG yok.
// 100x112'lik bir tuvalde çizilir, `s` ile ölçeklenir. Renkler token'dan (mürekkep = c.fg).
// `sway` verilirse (usePulse değeri) bitki hafifçe sallanır; yalnızca seçili kartta verilir (ekranda tek sonsuz hareket).

type Side = 'l' | 'r';

export default function PackArt({ d, s = 1, sway }: { d: number; s?: number; sway?: Animated.Value }) {
  const u = (n: number) => n * s;
  const ink = c.fg;
  const bw = Math.max(1.5, 1.8 * s);

  // Yaprak: bir köşesi sivri, karşı köşesi yuvarlak. (x, y) sol-üst; `side` yaprağın baktığı yön; rot derece.
  const leaf = (key: string, x: number, y: number, w: number, h: number, side: Side, rot: number, fill = c.sage) => (
    <View key={key} style={{
      position: 'absolute', left: u(x), top: u(y), width: u(w), height: u(h), backgroundColor: fill, borderWidth: bw, borderColor: ink,
      borderTopLeftRadius: side === 'l' ? u(h) : u(2), borderBottomRightRadius: side === 'l' ? u(h) : u(2),
      borderTopRightRadius: side === 'r' ? u(h) : u(2), borderBottomLeftRadius: side === 'r' ? u(h) : u(2),
      transform: [{ rotate: `${rot}deg` }],
    }} />
  );
  const stem = (x: number, y: number, h: number, w = 3.2) => (
    <View style={{ position: 'absolute', left: u(x - w / 2), top: u(y), width: u(w), height: u(h), borderRadius: u(w), backgroundColor: ink }} />
  );
  const tulip = (x: number, y: number, k = 1) => (
    <View style={{
      position: 'absolute', left: u(x), top: u(y), width: u(13 * k), height: u(17 * k), backgroundColor: c.tulip, borderWidth: bw, borderColor: ink,
      borderTopLeftRadius: u(3), borderTopRightRadius: u(3), borderBottomLeftRadius: u(9 * k), borderBottomRightRadius: u(9 * k),
    }} />
  );

  let plant: React.ReactNode;
  if (d <= 30) {
    plant = <>
      {stem(50, 48, 34)}
      {leaf('a', 27, 52, 24, 14, 'l', -22)}
      {leaf('b', 50, 42, 24, 14, 'r', 22)}
    </>;
  } else if (d <= 60) {
    plant = <>
      {stem(50, 24, 60, 3.4)}
      {leaf('a', 26, 62, 24, 14, 'l', -22)}
      {leaf('b', 50, 52, 24, 14, 'r', 22)}
      {leaf('c', 27, 40, 22, 13, 'l', -22)}
      {leaf('d', 50, 32, 22, 13, 'r', 22)}
      {tulip(43.5, 6)}
    </>;
  } else {
    plant = <>
      {stem(50, 36, 48, 6)}
      <View style={{ position: 'absolute', left: u(34), top: u(52), width: u(18), height: u(3.4), backgroundColor: ink, borderRadius: u(2), transform: [{ rotate: '-35deg' }] }} />
      <View style={{ position: 'absolute', left: u(49), top: u(46), width: u(18), height: u(3.4), backgroundColor: ink, borderRadius: u(2), transform: [{ rotate: '35deg' }] }} />
      <View style={{
        position: 'absolute', left: u(13), top: u(4), width: u(74), height: u(40), backgroundColor: c.sage, borderWidth: bw + 0.4, borderColor: ink,
        borderTopLeftRadius: u(34), borderTopRightRadius: u(28), borderBottomRightRadius: u(24), borderBottomLeftRadius: u(30),
      }} />
      {tulip(66, 2, 0.8)}
    </>;
  }

  const potW = d <= 30 ? 40 : d <= 60 ? 48 : 52;
  // Yalnızca bitki sallanır; saksı sabit kalır. Dönüş merkezi saksı ağzı (tuvalde y=82; tuval merkezi y=56, fark 26).
  const rot = sway ? sway.interpolate({ inputRange: [0, 1], outputRange: ['-2.4deg', '2.4deg'] }) : null;
  return (
    <View style={{ width: u(100), height: u(112) }}>
      {rot
        ? <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: u(100), height: u(112), transform: [{ translateY: u(26) }, { rotate: rot }, { translateY: -u(26) }] }}>{plant}</Animated.View>
        : plant}
      <View style={{
        position: 'absolute', left: u(50 - (potW - 8) / 2), top: u(82), width: u(potW - 8), height: u(26), backgroundColor: c.pot, borderWidth: bw, borderColor: ink,
        borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: u(10), borderBottomRightRadius: u(12),
      }} />
      <View style={{ position: 'absolute', left: u(50 - potW / 2), top: u(78), width: u(potW), height: u(9), backgroundColor: c.pot, borderWidth: bw, borderColor: ink, borderRadius: u(5) }} />
    </View>
  );
}
