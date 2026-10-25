import React, { useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { F, applyTheme, c, currentTheme } from '../../theme';
import { GardenScene } from './GardenScene';
import { Leaf, LeafGlyph } from './Leaf';
import { Roots } from './Roots';
import { Cloud, Hills, HandNote, Pot, Sun, WhyTag } from './Scenery';
import { Stem } from './Stem';
import { Tulip, TulipGlyph } from './Tulip';
import { DayState, buildLayout, makeDayStates } from './layout';
import { MS, useBudPulse, useLeafUnfurl, useTulipBloom } from './motion';
import { HALO_RGB } from './paths';
import { mat6, mul, rotM, scaleM, trans } from './wobble';

const AG = Animated.createAnimatedComponent(G);

/**
 * Galeri: bitki sanatının tüm bileşenleri ve durumları alt alta. Web ve cihazda tek ekranda görsel kontrol.
 * Kullanım: <PlantPreview /> (ör. geçici bir ekrandan). Animasyonlu satırlarda "oynat" düğmesi bulunur.
 */
export function PlantPreview() {
  const [theme, setTheme] = useState(currentTheme());
  const [ver, setVer] = useState(0);
  const flip = (t: 'light' | 'dark') => { applyTheme(t); setTheme(t); setVer(v => v + 1); };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={st.page} key={theme + ver}>
      <Text style={[st.h1, { color: c.fg }]}>Bitki sanatı galerisi</Text>
      <View style={st.rowWrap}>
        <Btn label="Gündüz" on={theme === 'light'} onPress={() => flip('light')} />
        <Btn label="Gece" on={theme === 'dark'} onPress={() => flip('dark')} />
      </View>

      <Section title="Yaprak durumları (46x22, 3x)">
        <View style={st.rowWrap}>
          <Cell label="geçti (ink)"><Leaf look="ink" width={138} /></Cell>
          <Cell label="bugün (hardal)"><Leaf look="today" width={138} /></Cell>
          <Cell label="gelecek (kurşun)"><Leaf look="pencil" width={138} /></Cell>
          <Cell label="zor gün (kıvrık)"><Leaf look="curl" width={138} /></Cell>
          <Cell label="dinlenme (tam + nokta)"><Leaf look="ink" width={138} restMark /></Cell>
        </View>
      </Section>

      <Section title="Lale durumları (28x38, 3x)">
        <View style={st.rowWrap}>
          <Cell label="açık (ink)"><Tulip look="ink" width={84} /></Cell>
          <Cell label="tomurcuk (bugün)"><Tulip look="today" width={84} /></Cell>
          <Cell label="gelecek (kurşun)"><Tulip look="pencil" width={84} /></Cell>
          <Cell label="boynu eğik (+18°)"><View style={{ transform: [{ rotate: '18deg' }], transformOrigin: '50% 100%' }}><Tulip look="curl" width={84} /></View></Cell>
        </View>
      </Section>

      <Section title="Gövde ve dallar">
        <View style={st.rowWrap}>
          <Cell label="Filiz 30 · gün 14"><Stem goalDays={30} dayStates={makeDayStates(30, 14)} scale={0.5} /></Cell>
          <Cell label="Fidan 60 · gün 45"><Stem goalDays={60} dayStates={makeDayStates(60, 45)} scale={0.5} /></Cell>
          <Cell label="Ağaç 90 · gün 75"><Stem goalDays={90} dayStates={makeDayStates(90, 75)} scale={0.5} /></Cell>
        </View>
      </Section>

      <Section title="Sahne parçaları">
        <View style={st.rowWrap}>
          <Cell label="güneş / ay (tema)"><Sun /></Cell>
          <Cell label="bulut a (46 sn kayar)"><Cloud kind="a" /></Cell>
          <Cell label="bulut b (58 sn)"><Cloud kind="b" durationMs={58000} /></Cell>
          <Cell label="saksı (imza)"><Pot shape="sign" /></Cell>
          <Cell label="saksı (paket)"><Pot shape="pack" /></Cell>
          <Cell label="neden etiketi"><WhyTag text="kızım için" /></Cell>
          <Cell label="el notu"><HandNote text="bugün" left /></Cell>
        </View>
        <Text style={[st.cap, { color: c.dim }]}>Tepeler + toprak (Ana ekran) / sadeleşmiş (Gün tamam)</Text>
        <View style={st.rowWrap}><Hills width={300} /><Hills width={300} variant="done" /></View>
      </Section>

      <Section title="Animasyonlar (oynat)">
        <View style={st.rowWrap}>
          <UnfurlDemo />
          <BloomDemo />
          <PulseDemo />
          <RootsDemo />
        </View>
      </Section>

      <Section title="Ana ekran sahnesi · Filiz 30 · gün 13 (bugün: yaprak)">
        <SceneRow>{k => <GardenScene goalDays={30} dayStates={makeDayStates(30, 13, { curl: [5], rest: [9] })} width={300} labels={{ today: 'bugün', why: 'kızım için' }} playKey={k} />}</SceneRow>
      </Section>
      <Section title="Ana ekran · gün 14 (bugün: lale tomurcuğu)">
        <SceneRow>{k => <GardenScene goalDays={30} dayStates={makeDayStates(30, 14)} width={300} labels={{ today: 'bugün' }} playKey={k} />}</SceneRow>
      </Section>
      <Section title="Gün tamam · taze yaprak (gün 13, 1,6 sn)">
        <SceneRow>{k => <GardenScene goalDays={30} dayStates={makeDayStates(30, 13, { assumeDoneToday: true })} width={300} freshDay={13} intro={false} hills="done" swayMs={MS.swayDone} swayDeg={0.7} playKey={k} />}</SceneRow>
      </Section>
      <Section title="Gün tamam · taze lale (gün 14, 1,9 sn + halka)">
        <SceneRow>{k => <GardenScene goalDays={30} dayStates={makeDayStates(30, 14, { assumeDoneToday: true })} width={300} freshDay={14} intro={false} hills="done" swayMs={MS.swayDone} swayDeg={0.7} playKey={k} />}</SceneRow>
      </Section>
      <Section title="Fidan 60 · gün 45 (sol dal)">
        <SceneRow>{k => <GardenScene goalDays={60} dayStates={makeDayStates(60, 45)} width={300} labels={{ today: 'bugün' }} playKey={k} />}</SceneRow>
      </Section>
      <Section title="Ağaç 90 · gün 75 (sol + sağ dal)">
        <SceneRow>{k => <GardenScene goalDays={90} dayStates={makeDayStates(90, 75)} width={300} labels={{ today: 'bugün' }} playKey={k} />}</SceneRow>
      </Section>
      <Section title="Kriz kesiti · kökler sırayla uzar, bitki en çok 11° sallanır">
        <CrisisRow />
      </Section>
      <Section title="Kemer pencere içeriği (mini) · rest/curl tam yaprak">
        <View style={st.rowWrap}>
          <MiniFrame><GardenScene goalDays={30} dayStates={makeDayStates(30, 14, { curl: [4], rest: [8] })} variant="mini" /></MiniFrame>
          <MiniFrame><GardenScene goalDays={90} dayStates={makeDayStates(90, 75)} variant="mini" width={260} /></MiniFrame>
        </View>
      </Section>
    </ScrollView>
  );
}

// ---- Animasyon demoları ----
const leafM = mul(mul(mul(mul(trans(60, 90), scaleM(-1, 1)), rotM(-34)), scaleM(1.6)), trans(0, -11));
function Stage({ children, label, onPlay }: { children: React.ReactNode; label: string; onPlay?: () => void }) {
  return (
    <View style={st.cell}>
      <View style={[st.stage, { backgroundColor: c.sky, borderColor: c.edge }]}>{children}</View>
      <View style={st.rowWrap}>
        <Text style={[st.cap, { color: c.fg, flex: 1 }]}>{label}</Text>
        {onPlay ? <Btn label="oynat" onPress={onPlay} small /> : null}
      </View>
    </View>
  );
}
function UnfurlDemo() {
  const [k, setK] = useState(0);
  const a = useLeafUnfurl(true, k);
  return (
    <Stage label="Yaprak açılışı · 1,6 sn" onPlay={() => setK(v => v + 1)}>
      <Svg width={180} height={120} viewBox="0 0 180 120">
        <Path d="M60 110 C58 100 62 90 60 70" fill="none" stroke={c.fg} strokeWidth={3.2} strokeLinecap="round" />
        <AG originX={60} originY={90} scale={a.scale} rotation={a.rotation} opacity={a.opacity}><G transform={mat6(leafM)}><LeafGlyph look="ink" variant={2} /></G></AG>
      </Svg>
    </Stage>
  );
}
function BloomDemo() {
  const [k, setK] = useState(0);
  const b = useTulipBloom(true, k);
  return (
    <Stage label="Lale açılışı · 1,9 sn, hafif aşma + halka" onPlay={() => setK(v => v + 1)}>
      <Svg width={180} height={120} viewBox="0 0 180 120">
        <Defs><RadialGradient id="ph" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={HALO_RGB} stopOpacity={0.6} /><Stop offset="0.68" stopColor={HALO_RGB} stopOpacity={0} /><Stop offset="1" stopColor={HALO_RGB} stopOpacity={0} /></RadialGradient></Defs>
        <AG originX={90} originY={64} scale={b.haloScale} opacity={b.haloOpacity}><Circle cx={90} cy={64} r={60} fill="url(#ph)" /></AG>
        <Path d="M90 112 C89 100 91 90 90 80" fill="none" stroke={c.fg} strokeWidth={3.2} strokeLinecap="round" />
        <G transform={mat6(mul(mul(trans(90, 86), scaleM(1.7)), trans(-14, -38)))}>
          <AG opacity={b.budOpacity}><TulipGlyph look="today" part="bud" /></AG>
          <AG originX={14} originY={38} scale={b.scale} opacity={b.opacity}><TulipGlyph look="ink" /></AG>
        </G>
      </Svg>
    </Stage>
  );
}
function PulseDemo() {
  const [k, setK] = useState(0);
  const p = useBudPulse(true, k);
  return (
    <Stage label="Tomurcuk nabzı · 3,6 sn, en çok 6 devir" onPlay={() => setK(v => v + 1)}>
      <Svg width={180} height={120} viewBox="0 0 180 120">
        <Path d="M60 110 C58 100 62 90 60 70" fill="none" stroke={c.fg} strokeWidth={3.2} strokeLinecap="round" />
        <AG originX={60} originY={90} scale={p}><G transform={mat6(mul(mul(mul(mul(trans(60, 90), rotM(-40)), scaleM(1.6)), scaleM(0.62)), trans(0, -11)))}><LeafGlyph look="today" variant={2} /></G></AG>
      </Svg>
    </Stage>
  );
}
function RootsDemo() {
  const [k, setK] = useState(0);
  return (
    <Stage label="Köklenme · 4,8 sn, sıralı" onPlay={() => setK(v => v + 1)}>
      <View style={{ width: 180, height: 120, overflow: 'hidden' }}>
        <View style={{ transform: [{ scale: 0.5 }], transformOrigin: '0% 0%', width: 356, height: 180, marginTop: -30, marginLeft: -4 }}>
          <Roots set="demo" play k={k} />
        </View>
      </View>
    </Stage>
  );
}
function SceneRow({ children }: { children: (k: number) => React.ReactNode }) {
  const [k, setK] = useState(0);
  return (
    <View>
      <Btn label="oynat" onPress={() => setK(v => v + 1)} small />
      <View style={[st.frame, { borderColor: c.edge, backgroundColor: c.bg }]}>{children(k)}</View>
    </View>
  );
}
function CrisisRow() {
  const [p, setP] = useState(0.3);
  const states = useMemo(() => makeDayStates(30, 14) as DayState[], []);
  return (
    <View>
      <View style={st.rowWrap}>
        <Btn label="başa" onPress={() => setP(0)} small />
        <Btn label="+%25" onPress={() => setP(v => Math.min(1, v + 0.25))} small />
        <Text style={[st.cap, { color: c.dim }]}>kök ilerlemesi %{Math.round(p * 100)} (1 sn geçişle)</Text>
      </View>
      <View style={[st.frame, { borderColor: c.edge }]}>
        <GardenScene goalDays={30} dayStates={states} variant="crisis" width={300} rootProgress={p} labels={{ roots: 'kök salıyorsun' }} />
      </View>
    </View>
  );
}
function MiniFrame({ children }: { children: React.ReactNode }) {
  return <View style={{ width: 260, height: 190, borderTopLeftRadius: 130, borderTopRightRadius: 130, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderWidth: 3, borderColor: c.fg, backgroundColor: c.waterWash, overflow: 'hidden' }}><View style={{ alignItems: 'center' }}>{children}</View></View>;
}

// ---- küçük yardımcılar ----
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <Text style={[st.h2, { color: c.fg }]}>{title}</Text>
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={[st.cell, { alignItems: 'flex-start' }]}>
      <View style={[st.tile, { borderColor: c.edge, backgroundColor: c.surf }]}>{children}</View>
      <Text style={[st.cap, { color: c.dim }]}>{label}</Text>
    </View>
  );
}
function Btn({ label, onPress, on, small }: { label: string; onPress: () => void; on?: boolean; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[st.btn, small && { height: 32, paddingHorizontal: 12 }, { backgroundColor: on ? c.act : c.surf, borderColor: on ? c.act : c.edge }]}>
      <Text style={{ fontFamily: F.s, fontSize: small ? 13 : 15, color: on ? c.onAct : c.fg }}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  page: { padding: 16, paddingBottom: 80, maxWidth: 720, alignSelf: 'center', width: '100%' },
  h1: { fontFamily: F.d, fontSize: 30, lineHeight: 34 },
  h2: { fontFamily: F.d, fontSize: 20, lineHeight: 24 },
  cap: { fontFamily: F.s, fontSize: 12, lineHeight: 16, marginTop: 4 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  cell: { marginBottom: 8 },
  tile: { minWidth: 96, minHeight: 72, padding: 12, borderWidth: 1.5, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stage: { width: 180, height: 120, borderWidth: 1.5, borderRadius: 18, overflow: 'hidden' },
  frame: { borderWidth: 1.5, borderRadius: 18, overflow: 'hidden', alignSelf: 'flex-start', marginTop: 8 },
  btn: { height: 40, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

export default PlantPreview;
