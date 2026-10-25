import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { F, c, currentTheme } from '../../theme';
import { useDrift } from './motion';
import { CLOUD_A, CLOUD_B, HILLS, NOTE_ARROW, POT_PACK, POT_SIGN, SOIL2, SUN, WHY, potBake } from './paths';

const soil2 = () => (currentTheme() === 'dark' ? SOIL2.dark : SOIL2.light);

/**
 * Üç katman tepe + toprak (Main.dc.html, 390x330): tepe 1 (hill), tepe 2 (hill2), toprak (soil); çizgiler, toprak çizikleri,
 * çakıllar, ot kümeleri. `variant: 'done'` Gün tamam'daki biraz sadeleşmiş hal (bir çakıl ve bir çizik eksik).
 * Yatay tam genişlik; `width` verilirse oranla ölçeklenir.
 */
export const Hills = React.memo(function Hills({ width = HILLS.w, variant = 'home' }: { width?: number; variant?: 'home' | 'done' }) {
  const s = width / HILLS.w, done = variant === 'done';
  return (
    <Svg width={width} height={HILLS.h * s} viewBox={`0 0 ${HILLS.w} ${HILLS.h}`}>
      <Path d={HILLS.h1Fill} fill={c.hill} />
      <Path d={HILLS.h1Line} fill="none" stroke={c.edge} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={HILLS.h2Fill} fill={c.hill2} />
      <Path d={HILLS.h2Line} fill="none" stroke={c.edge} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={HILLS.soilFill} fill={c.soil} />
      <Path d={HILLS.soilLine} fill="none" stroke={c.fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={done ? HILLS.marksDone : HILLS.marks} fill="none" stroke={c.fg} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      <G fill={soil2()} stroke={c.fg} strokeWidth={1.4}>
        {HILLS.pebbles.filter((_, i) => !(done && i === 0)).map((p, i) => <Ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} />)}
      </G>
      {HILLS.tufts.map((d, i) => <Path key={i} d={d} fill="none" stroke={c.fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />)}
    </Svg>
  );
});

/** Güneş (gündüz, 8 ışın) ya da ay (gece: hardal daireden bir ısırık, ışın yok). 86x86. */
export const Sun = React.memo(function Sun({ size = SUN.size }: { size?: number }) {
  const night = currentTheme() === 'dark';
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${SUN.size} ${SUN.size}`}>
      <Circle cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill={c.mustard} />
      {night ? <Circle cx={SUN.bite.cx} cy={SUN.bite.cy} r={SUN.bite.r} fill={c.bg} /> : null}
      <Circle cx={SUN.inkCx} cy={SUN.inkCy} r={SUN.r} fill="none" stroke={c.fg} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      {night ? null : <Path d={SUN.rays} fill="none" stroke={c.fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
    </Svg>
  );
});

/** Bulut: 'a' (92x40) ve 'b' (64x30). `drift` açıksa 46 sn'de -14..18 px gidip gelir (hareket azaltılmışsa durur). */
export function Cloud({ kind = 'a', drift = true, durationMs }: { kind?: 'a' | 'b'; drift?: boolean; durationMs?: number }) {
  const m = kind === 'a' ? CLOUD_A : CLOUD_B;
  const style = useDrift(durationMs, drift);
  return (
    <Animated.View style={[{ width: m.w, height: m.h }, style]} pointerEvents="none">
      <Svg width={m.w} height={m.h} viewBox={`0 0 ${m.w} ${m.h}`}>
        <Path d={m.d} fill={c.surf} stroke={c.edge} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

/** Saksı: 'sign' (imza ekranı, 96x52) ya da 'pack' (paket simgesi). */
export const Pot = React.memo(function Pot({ shape = 'sign', width }: { shape?: 'sign' | 'pack'; width?: number }) {
  if (shape === 'pack') {
    const w = width ?? POT_PACK.w * 1.4, h = (w * POT_PACK.h) / POT_PACK.w;
    return (
      <Svg width={w} height={h} viewBox={`${POT_PACK.x} ${POT_PACK.y} ${POT_PACK.w} ${POT_PACK.h}`} style={{ overflow: 'visible' }}>
        <Path d={potBake.pack.body} fill={c.pot} stroke={c.fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={potBake.pack.rim} fill="none" stroke={c.fg} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  const w = width ?? POT_SIGN.w, h = (w * POT_SIGN.h) / POT_SIGN.w;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${POT_SIGN.w} ${POT_SIGN.h}`} style={{ overflow: 'visible' }}>
      <Path d={potBake.sign.body} fill={c.pot} stroke={c.fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={potBake.sign.rim} fill="none" stroke={c.fg} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

/** El notu oku (26x20), bugün/kök notlarının yanında. `flip` -1 = yatay çevrik. */
export function NoteArrow({ flip = 1, color, width = 26 }: { flip?: 1 | -1; color?: string; width?: number }) {
  return (
    <Svg width={width} height={(width * 20) / 26} viewBox="0 0 26 20" style={{ transform: [{ scaleX: flip }] }}>
      <Path d={NOTE_ARROW} fill="none" stroke={color ?? c.clay} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** El yazısı not + ok (ör. "bugün"). Metin props ile gelir; bileşen metin bilmez. */
export function HandNote({ text, left = true, size = 23 }: { text: string; left?: boolean; size?: number }) {
  return (
    <View style={[st.note, { flexDirection: left ? 'row' : 'row-reverse' }]} pointerEvents="none">
      <Text style={{ fontFamily: F.hand, fontSize: size, lineHeight: size, color: c.clay }} allowFontScaling={false}>{text}</Text>
      <View style={{ marginTop: 6 }}><NoteArrow flip={left ? 1 : -1} /></View>
    </View>
  );
}

/** "Neden" etiketi: toprağa saplı kazık + kâğıt tabela (122x110), üstünde el yazısı metin. */
export const WhyTag = React.memo(function WhyTag({ text, width = WHY.w }: { text?: string; width?: number }) {
  const s = width / WHY.w;
  return (
    <View style={{ width: WHY.w * s, height: WHY.h * s }} pointerEvents="none">
      <Svg width={WHY.w * s} height={WHY.h * s} viewBox={`0 0 ${WHY.w} ${WHY.h}`}>
        <Path d={WHY.stake} fill="none" stroke={c.fg} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={WHY.board} fill={c.surf} stroke={c.fg} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {text ? (
        <Text allowFontScaling={false} style={{ position: 'absolute', left: 10 * s, top: 10 * s, width: 102 * s, textAlign: 'center', fontFamily: F.hand, fontSize: 22 * s, lineHeight: 23 * s, color: c.fg }}>{text}</Text>
      ) : null}
    </View>
  );
});

const st = StyleSheet.create({ note: { flexDirection: 'row', alignItems: 'center', gap: 2 } });
