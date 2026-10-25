import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { F, applyTheme, c, currentTheme, pebble } from '../../theme';
import { ArchWindow, ArchShape, Cloud, Sway } from './ArchWindow';
import { BrandGlyph, BrandMark } from './BrandMark';
import { Envelope, GardenTag, PackPlant, Signature, StepLeaves, type PackTier } from './Extras';
import { GIcon, DockIcon, ICON_DEFS, type DockName, type IconName } from './Icons';
import { PaperGrain } from './Paper';
import { RootsGrow, Roots } from './Roots';
import { CalmIcon, SeedPacket, ZigzagEdge, type CalmIconName } from './SeedPacket';
import { Sprout, SproutInPot, SproutPot } from './Sprout';
import { Stamp } from './Stamp';
import { WaterDrop, DROP_DEMO } from './WaterDrop';

// GALERİ: Yardımcı çizimlerin tamamı alt alta, her satır etiketli; animasyonlu olanlarda "oynat" düğmesi. Web ve cihazda tek ekranda
// görsel kontrol için. Kullanım: <Preview /> (örn. geçici bir rotadan). Gündüz/Gece düğmesi paleti değiştirip içeriği yeniden kurar.

function Btn({ label, onPress, on }: { label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.btn, pebble(40, label), { backgroundColor: on ? c.act : c.surf, borderColor: on ? c.act : c.edge }]}>
      <Text allowFontScaling={false} style={{ fontFamily: F.s, fontSize: 15, color: on ? c.onAct : c.fg }}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={styles.sec}>
      <Text style={[styles.lab, { color: c.clay, fontFamily: F.b }]}>{title.toUpperCase()}</Text>
      {note ? <Text style={[styles.note, { color: c.dim, fontFamily: F.r }]}>{note}</Text> : null}
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}

function Cap({ children }: { children: string }) {
  return <Text style={[styles.cap, { color: c.dim, fontFamily: F.s }]}>{children}</Text>;
}

/** Basit bir lale (28x38 tuval ölçüsü, 3 petal) yalnız galeri içeriği için; gerçek lale bitki ajanında. */
function MiniTulip({ scale = 3 }: { scale?: number }) {
  const D = 'M14 36 C9 30 9 17 14 3 C19 17 19 30 14 36Z M13 36 C4 35 1 22 3 10 C10 15 13 24 13 36Z M15 36 C24 35 27 22 25 10 C18 15 15 24 15 36Z';
  return (
    <Svg width={28 * scale} height={38 * scale} viewBox="0 0 28 38">
      <Path d={D} transform="translate(1.6 1.4)" fill={c.tulip} />
      <Path d="M14 36 C9 30 9 17 14 3 C19 17 19 30 14 36Z" fill="none" stroke={c.fg} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M13 36 C4 35 1 22 3 10 C10 15 13 24 13 36Z" fill="none" stroke={c.fg} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M15 36 C24 35 27 22 25 10 C18 15 15 24 15 36Z" fill="none" stroke={c.fg} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  );
}

const CALM: { n: CalmIconName; l: string }[] = [
  { n: 'balloon', l: 'Balon' }, { n: 'sudoku', l: 'Sudoku' }, { n: 'memory', l: 'Hafıza' },
  { n: 'xox', l: 'XOX' }, { n: 'senses', l: '5-4-3-2-1' }, { n: 'countdown', l: 'Geri say' },
];
const DOCK: { n: DockName; l: string }[] = [
  { n: 'calm', l: 'Sakinleş' }, { n: 'journal', l: 'Günlük' }, { n: 'crisis', l: 'Krizdeyim' },
  { n: 'witness', l: 'Şahitler' }, { n: 'pack', l: 'Paketim' }, { n: 'profile', l: 'Ben' },
];

function GalleryBody() {
  const { width: W } = useWindowDimensions();
  const inner = Math.max(280, W - 32);
  // --- Sprout / İmza: tek sahne değeri (0..100), JS sürücülü
  const hold = useRef(new Animated.Value(34)).current;
  const [done, setDone] = useState(false);
  const play = () => { hold.setValue(0); Animated.timing(hold, { toValue: 100, duration: 2200, easing: Easing.linear, useNativeDriver: false }).start(); };
  const release = () => { Animated.timing(hold, { toValue: 0, duration: 600, easing: Easing.linear, useNativeDriver: false }).start(); };
  // --- Su damlası
  const [dropOn, setDropOn] = useState(false);
  const [dropKey, setDropKey] = useState(0);
  const tdrop = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (tdrop.current) clearTimeout(tdrop.current); }, []);
  const sendDrop = () => {
    if (tdrop.current) clearTimeout(tdrop.current);
    setDropOn(true); setDropKey(k => k + 1);
    tdrop.current = setTimeout(() => setDropOn(false), 5000);
  };
  const [demoDropKey, setDemoDropKey] = useState(0);
  // --- Kökler
  const kriz = useRef(new Animated.Value(0.45)).current;
  const [rootKey, setRootKey] = useState(0);
  const growRoots = () => { kriz.setValue(0); Animated.timing(kriz, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: false }).start(); };
  // --- Paket seçimi
  const [tier, setTier] = useState<PackTier>('fidan');
  const [sel, setSel] = useState<number | null>(null);
  const rw = Math.min(390, inner), rh = (rw * 158) / 390;

  return (
    <>
      <Section title="Filiz (imza anı)" note="progress 0..100; HoldBar'ın ilerlemesine bağlanır. Tek Animated.Value ile büyür.">
        <View style={styles.rowTop}>
          {[0, 34, 70, 100].map(p => (
            <View key={p} style={styles.cell}><View style={styles.sproutBox}><Sprout progress={p} /></View><Cap>{`%${p}`}</Cap></View>
          ))}
        </View>
        <View style={[styles.rowTop, { marginTop: 14 }]}>
          <Btn label="oynat 2,2 sn" onPress={play} />
          <Btn label="bırak" onPress={release} />
          <Btn label={done ? 'hold' : 'done'} onPress={() => setDone(d => !d)} on={done} />
        </View>
        <View style={[styles.rowTop, { marginTop: 14, alignItems: 'flex-end' }]}>
          <View style={styles.cell}><SproutInPot progress={hold} state={done ? 'done' : 'hold'} /><Cap>{done ? 'SproutInPot: done' : 'SproutInPot: hold'}</Cap></View>
          <View style={styles.cell}><SproutPot /><Cap>SproutPot</Cap></View>
        </View>
        <View style={{ marginTop: 14 }}>
          <Signature progress={hold} />
          <Cap>Signature (aynı ilerleme)</Cap>
        </View>
      </Section>

      <Section title="Tohum paketi (Sakinleş)" note="Zikzaklı üst bant, hafif eğim, 130 yükseklik; basınca 3 px kalkar ve düzelir.">
        <View style={styles.grid}>
          {CALM.map((m, i) => (
            <View key={m.n} style={styles.gcell}>
              <SeedPacket label={m.l} variant={i} onPress={() => setSel(i)}><CalmIcon name={m.n} /></SeedPacket>
            </View>
          ))}
        </View>
        <Cap>{sel === null ? 'dokun: kart basılabilir' : `seçilen: ${CALM[sel].l}`}</Cap>
        <View style={{ marginTop: 10 }}><ZigzagEdge /><Cap>ZigzagEdge (tek başına)</Cap></View>
      </Section>

      <Section title="Kemer pencere (şahit portalı)" note="Yalnız gün sayısı + lale. Su damlası destek gönderilince oynar (1,5 sn düşme, halka 1,35 sn sonra).">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ paddingBottom: 8 }}>
            <ArchWindow>
              <View style={{ position: 'absolute', left: 61, top: 12, width: 220, height: 232 }}>
                <Sway height={232} style={{ width: 220 }}>
                  <View style={{ position: 'absolute', left: 70, top: 26 }}><MiniTulip scale={2.6} /></View>
                  <Text allowFontScaling={false} style={{ position: 'absolute', left: 0, top: 132, width: 220, textAlign: 'center', fontFamily: F.d, fontSize: 64, lineHeight: 70, color: c.fg }}>14</Text>
                </Sway>
              </View>
              <WaterDrop active={dropOn} playKey={dropKey} />
            </ArchWindow>
          </View>
        </ScrollView>
        <View style={[styles.rowTop, { marginTop: 14 }]}>
          <Btn label="Destek gönder" onPress={sendDrop} on={dropOn} />
          <Btn label="demo damla" onPress={() => setDemoDropKey(k => k + 1)} />
        </View>
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
          <View>
            <View style={{ width: 356, height: 180, backgroundColor: c.sky, borderColor: c.edge, borderWidth: 1.6, borderRadius: 24, overflow: 'hidden' }}>
              <WaterDrop key={demoDropKey} active={demoDropKey > 0} playKey={demoDropKey} geometry={DROP_DEMO} highlight={false} />
            </View>
            <Cap>Hareket sayfası demo geometrisi</Cap>
          </View>
        </View>
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}>
          <View><ArchShape /><Cap>ArchShape 82x92</Cap></View>
          <View><Cloud /><Cap>Cloud</Cap></View>
        </View>
      </Section>

      <Section title="Damga (tek seferlik)" note="Kesik çizgili kil kenar 2,4 px, 26/20/28/22 köşe, -1,2 derece. Metin yuvası.">
        <Stamp />
        <Cap>varsayılan (tuval metni)</Cap>
        <View style={{ height: 14 }} />
        <Stamp title="Tek seferlik ödeme." text="Abonelik değildir." />
        <Cap>başlık + metin</Cap>
        <View style={{ height: 14 }} />
        <Stamp icon={null}><Text style={{ fontFamily: F.s, fontSize: 17, color: c.fg }}>Metin yuvası: serbest içerik, simge yok.</Text></Stamp>
        <Cap>children yuvası, icon=null</Cap>
      </Section>

      <Section title="Dock ve çizgi simgeleri" note="Tuvaldeki yol verileri; pasif c.dim, seçili c.fg, kriz düğmesi c.onClay. (Paketim simgesi tuvalde yok: yaklaşık.)">
        <View style={[styles.dock, { backgroundColor: c.surf, borderColor: c.edge }]}>
          {DOCK.map((d, i) => d.n === 'crisis' ? (
            <View key={d.n} style={[styles.cri, { backgroundColor: c.clay }]}><DockIcon name="crisis" /><Text allowFontScaling={false} style={{ fontFamily: F.b, fontSize: 13, color: c.onClay }}>{d.l}</Text></View>
          ) : (
            <View key={d.n} style={styles.dk}><DockIcon name={d.n} active={i === 0} /><Text allowFontScaling={false} style={{ fontFamily: F.s, fontSize: 12, color: i === 0 ? c.fg : c.dim }}>{d.l}</Text></View>
          ))}
        </View>
        <View style={[styles.grid, { marginTop: 14 }]}>
          {(Object.keys(ICON_DEFS) as IconName[]).map(n => (
            <View key={n} style={styles.icell}><GIcon name={n} size={28} /><Cap>{n}</Cap></View>
          ))}
        </View>
      </Section>

      <Section title="Marka işareti" note="Kemer + toprak + iki yapraklı filiz + hardal tomurcuk + QuitVow. Tuvalde logo çizili değil: plan tarifine göre tuval parçalarından kuruldu.">
        <View style={styles.rowTop}>
          <BrandMark size={64} />
          <BrandMark size={72} layout="column" />
          <BrandGlyph size={40} />
        </View>
      </Section>

      <Section title="Kökler" note="Kriz: 6 kök kriz ilerlemesine göre sırayla uzar (0..1). Köklenme demosu: 4.8 sn ease-out, gecikmeli.">
        <View style={{ backgroundColor: c.soil, width: rw, borderRadius: 12, overflow: 'hidden' }}>
          <Roots progress={kriz} width={rw} height={rh} />
        </View>
        <View style={[styles.rowTop, { marginTop: 10 }]}>
          <Btn label="oynat 8 sn" onPress={growRoots} />
          <Btn label="%45" onPress={() => kriz.setValue(0.45)} />
          <Btn label="%100" onPress={() => kriz.setValue(1)} />
        </View>
        <View style={{ marginTop: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ backgroundColor: c.soil, width: 356, height: 180, borderRadius: 24, overflow: 'hidden' }}>
              <RootsGrow playKey={rootKey} />
            </View>
          </ScrollView>
          <View style={[styles.rowTop, { marginTop: 10 }]}><Btn label="Köklenme oynat" onPress={() => setRootKey(k => k + 1)} /></View>
        </View>
      </Section>

      <Section title="Zarf (şahit daveti)" note="Zarf 6 sn ±1,6° sallanır, mektup 8 px çıkıp iner, mühür %8 nabız atar. Hareketi azalt: durağan.">
        <Envelope />
      </Section>

      <Section title="Adım yaprakları, bahçe etiketi" note="StepLeaves: öncekiler dolu, şimdiki hardal, sonrakiler kesik kurşun. GardenTag: neden notu.">
        <StepLeaves count={9} current={7} size="sm" />
        <Cap>sm 22x14 (İmza, 8/9)</Cap>
        <View style={{ height: 10 }} />
        <StepLeaves count={3} current={1} size="md" />
        <Cap>md 30x18 (Kontrol, 2/3)</Cap>
        <View style={{ height: 14 }} />
        <GardenTag text="kızım için" />
        <Cap>GardenTag</Cap>
      </Section>

      <Section title="Paket bitkileri (Paywall)" note="Filiz 30 / Fidan 60 / Ağaç 90 gün. Seçili olan 5 sn ±2,4° sallanır.">
        <View style={styles.rowTop}>
          {(['filiz', 'fidan', 'agac'] as PackTier[]).map(t => (
            <Pressable key={t} onPress={() => setTier(t)} style={[styles.pk, { borderColor: tier === t ? c.act : c.edge, borderWidth: tier === t ? 3 : 2, backgroundColor: tier === t ? c.sageWash : c.surf }]}>
              <PackPlant tier={t} swaying={tier === t} />
              <Cap>{t === 'agac' ? 'Ağaç' : t === 'fidan' ? 'Fidan' : 'Filiz'}</Cap>
            </Pressable>
          ))}
        </View>
      </Section>
    </>
  );
}

/** Galeri ekranı. */
export default function Preview() {
  const [rev, setRev] = useState(0);
  const [grain, setGrain] = useState(true);
  const dark = currentTheme() === 'dark';
  const switchTheme = (t: 'dark' | 'light') => { applyTheme(t); setRev(r => r + 1); };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={[styles.h1, { color: c.fg, fontFamily: F.d }]}>Yardımcı çizimler</Text>
        <View style={styles.rowTop}>
          <Btn label="Gündüz" onPress={() => switchTheme('light')} on={!dark} />
          <Btn label="Gece" onPress={() => switchTheme('dark')} on={dark} />
          <Btn label={grain ? 'Gren: açık' : 'Gren: kapalı'} onPress={() => setGrain(g => !g)} on={grain} />
        </View>
        <View key={rev}><GalleryBody /></View>
      </ScrollView>
      {grain ? <PaperGrain /> : null}
    </View>
  );
}
export { Preview };

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 80 },
  h1: { fontSize: 34, lineHeight: 38, marginBottom: 12 },
  sec: { marginTop: 36 },
  lab: { fontSize: 14, letterSpacing: 1.4 },
  note: { fontSize: 14, lineHeight: 19, marginTop: 4 },
  cap: { fontSize: 13, marginTop: 4 },
  btn: { minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  rowTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  cell: { alignItems: 'center' },
  sproutBox: { width: 72, height: 92 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gcell: { width: '46%' },
  icell: { width: 72, alignItems: 'center' },
  dock: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1.5, borderTopLeftRadius: 36, borderTopRightRadius: 30 },
  dk: { alignItems: 'center', gap: 5, width: 58 },
  cri: { alignItems: 'center', justifyContent: 'center', gap: 5, width: 86, height: 70, marginTop: -18, borderTopLeftRadius: 38, borderTopRightRadius: 32, borderBottomRightRadius: 36, borderBottomLeftRadius: 30 },
  pk: { width: 104, paddingVertical: 12, alignItems: 'center', borderRadius: 26 },
});
