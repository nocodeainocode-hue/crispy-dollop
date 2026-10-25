import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useApp } from '../store';
import { vowExists } from '../vowStore';
import { useL, useH } from '../i18n';
import { Screen, Body, Back, T, Kicker } from '../components/ui';
import { c, alpha, pebble } from '../theme';

/** Kriz anında kendi yüzünden, kendi sesinden verdiği sözü izler (video yalnızca telefonda). Otomatik oynamaz. */
function VowPlayback({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, p => { p.loop = false; p.play(); });
  return <VideoView player={player} style={{ height: 300, backgroundColor: alpha(c.fg, 0.9), marginTop: 6, borderRadius: 24 }} nativeControls contentFit="cover" />;
}

/** Eğik kâğıt kart: dekoratif; içinde TextInput yok. */
function Card({ k, label, children, tilt }: { k: string; label: string; children: React.ReactNode; tilt: number }) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, transform: [{ rotate: `${tilt}deg` }] }}>
      <View style={[pebble(80, k), { position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, backgroundColor: c.shadow }]} />
      <View style={[pebble(80, k), { backgroundColor: c.surf, borderWidth: 2, borderColor: c.line, paddingHorizontal: 20, paddingVertical: 16 }]}>
        <Kicker color={c.dim}>{label}</Kicker>
        {children}
      </View>
    </View>
  );
}

/**
 * "Nedenim" sayfası: kullanıcının kendi sözleri, sözü (video), planı ve 3 adım; şahitlere haber durumu (tam, dürüst metin).
 * Kriz saati arkada işlemeye devam eder; burada yalnız kalan süre küçük gösterilir.
 */
export default function CrisisNote({ clock, summary, onBack }: { clock: string; summary: string; onBack: () => void }) {
  const a = useApp();
  const L = useL(), H = useH();
  const [watch, setWatch] = useState(false);
  const hasVow = !!a.vowUri && vowExists(a.vowUri);
  return (
    <Screen crisis>
      <Back onPress={onBack} right={<T size={30} maxFontSizeMultiplier={1}>{clock}</T>} />
      <Body>
        <View style={{ paddingBottom: 24 }}>
          {!!a.reason && <Card k="why" label={L.crisis.why} tilt={-1.2}><T w="s" size={18} lh={26} style={{ marginTop: 6 }}>{a.reason}</T></Card>}
          {!!a.letter && <Card k="future" label={L.crisis.future} tilt={1.2}><T w="s" size={18} lh={26} style={{ marginTop: 6 }}>{a.letter}</T></Card>}
          {!!a.plan && <Card k="plan" label={L.crisis.plan} tilt={-1.2}><T w="s" size={18} lh={26} style={{ marginTop: 6 }}>{a.plan}</T></Card>}
          {hasVow && (
            <Card k="vow" label={L.crisis.vowKicker} tilt={1.2}>
              {watch ? <VowPlayback uri={a.vowUri} /> : null}
              <Pressable onPress={() => setWatch(!watch)} accessibilityRole="button" style={{ marginTop: 8, minHeight: 56, justifyContent: 'center' }}>
                <T w="b" size={17} color={c.act}>{watch ? L.crisis.vowHide : L.crisis.vowWatch}</T>
              </Pressable>
            </Card>
          )}
          <Card k="now" label={L.crisis.now} tilt={-1.2}>
            {H.crisisSteps.map(t => <T key={t} w="s" size={18} lh={28} style={{ marginTop: 4 }}>{t}</T>)}
          </Card>
          {!!summary && <T w="r" size={15} lh={22} color={c.dim} style={{ paddingHorizontal: 20, marginTop: 18 }}>{summary}</T>}
          <Kicker color={c.dim} style={{ paddingHorizontal: 20, marginTop: 18 }}>{L.crisis.waveKicker}</Kicker>
          <T w="r" size={15} lh={22} color={c.dim} style={{ paddingHorizontal: 20, marginTop: 4 }}>{L.crisis.windNote}</T>
        </View>
      </Body>
    </Screen>
  );
}
