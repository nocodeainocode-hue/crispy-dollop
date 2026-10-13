import React, { useEffect, useState } from 'react';
import { View, Linking, Pressable, Animated } from 'react-native';
import { usePulse } from '../components/motion';
import { useApp, CRISIS_MS } from '../store';
import { useServer } from '../server';
import { Screen, Body, ActionBar, T, Kicker } from '../components/ui';
import Calm from './Calm';
import { useVideoPlayer, VideoView } from 'expo-video';
import { vowExists } from '../vowStore';
import { useL, useH, useHelp } from '../i18n';
import { c } from '../theme';
import type { Go } from '../nav';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const TOTAL = CRISIS_MS / 1000;

/** Kriz anında en çok işe yarayan şey: dikkati başka yere vermek. Bu yüzden tüm ekranın en vurgulu bloğu. */
function CalmBanner({ onPress }: { onPress: () => void }) {
  const p = usePulse(900);
  const L = useL();
  return (
    <Pressable onPress={onPress} style={{ borderTopWidth: 2, borderBottomWidth: 2, borderColor: c.acc, backgroundColor: 'rgba(236,48,19,0.14)', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <T size={21} ls={-0.5}>{L.crisis.calmTitle}</T>
        <T w="r" size={12} lh={17} color={c.dim} style={{ marginTop: 3 }}>{L.crisis.calmSub}</T>
      </View>
      <Animated.View style={{ transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }] }}><T size={26}>→</T></Animated.View>
    </Pressable>
  );
}

/** Kriz anında kendi yüzünden, kendi sesinden verdiği sözü izler (video yalnızca telefonda). Otomatik oynamaz. */
function VowPlayback({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, p => { p.loop = false; p.play(); });
  return <VideoView player={player} style={{ height: 300, backgroundColor: '#000', marginTop: 6 }} nativeControls contentFit="cover" />;
}

export default function Crisis({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH(), help = useHelp();
  const [until] = useState(() => (a.crisisUntil > Date.now() ? a.crisisUntil : Date.now() + CRISIS_MS));
  const [now, setNow] = useState(Date.now());
  const [games, setGames] = useState(false);
  const [watch, setWatch] = useState(false);
  const hasVow = !!a.vowUri && vowExists(a.vowUri);
  // Vasilere bildirimin GERÇEK sonucu: sending | ok (n vasiye e-posta gitti) | none (kabul eden yok) | failed | resumed (kriz daha önce başlamıştı)
  const [notify, setNotify] = useState<'sending' | 'ok' | 'none' | 'failed' | 'resumed'>(a.crisisUntil > Date.now() ? 'resumed' : 'sending');
  const [notified, setNotified] = useState(0);

  useEffect(() => {
    if (a.crisisUntil !== until) {
      a.set({ crisisUntil: until });
      srv.crisis().then(r => { if (typeof r?.notified !== 'number') { setNotify('resumed'); return; } setNotified(r.notified); setNotify(r.notified > 0 ? 'ok' : 'none'); }).catch(() => setNotify('failed'));
      a.addEntry({ kind: 'kriz', mood: '', trigger: '', note: L.crisis.entryNote });
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, Math.round((until - now) / 1000));
  const el = TOTAL - left, prog = el / TOTAL;
  const ph = left % 14;
  const phase = left === 0 ? L.crisis.phaseOver : ph >= 10 ? L.crisis.phaseIn : ph >= 6 ? L.crisis.phaseHold : L.crisis.phaseOut;
  const wave = Array.from({ length: 30 }, (_, i) => ({ h: Math.round(8 + Math.exp(-Math.pow((i - 9) / 7, 2)) * 88), on: i / 30 <= prog }));
  // Genel bir model: senin dürtünün ölçümü değil. Dürtüler genelde dalga gibi yükselip alçalır.
  const text = left === 0 ? L.crisis.textOver : prog < 0.3 ? L.crisis.text1 : prog < 0.6 ? L.crisis.text2 : L.crisis.text3;

  const gs = a.guardians.slice(0, 3);
  const failedFor = (g: { status?: string }) => g.status === 'accepted' && notify === 'failed';
  const status = (g: { status?: string }) =>
    g.status === 'declined' ? L.crisis.stDeclined : g.status !== 'accepted' ? L.crisis.stNotAccepted
      : notify === 'sending' ? L.crisis.stSending : notify === 'ok' ? L.crisis.stOk : notify === 'failed' ? L.crisis.stFailed : L.crisis.stCall;
  const summary = gs.length === 0 ? L.crisis.sumSolo
    : notify === 'failed' ? L.crisis.sumFailed
    : notify === 'none' ? L.crisis.sumNone
    : notify === 'ok' ? L.crisis.sumOk(notified)
    : notify === 'resumed' ? L.crisis.sumResumed : '';

  if (games) return <Calm onBack={() => setGames(false)} />;

  return (
    <Screen crisis>
      <Body>
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <Kicker>{L.crisis.kicker}</Kicker>
          <T size={104} ls={-6} lh={96} style={{ marginTop: 6, textShadowColor: 'rgba(236,48,19,.8)', textShadowRadius: 32 }}>{mmss(left)}</T>
          <T size={26} ls={-0.5} lh={28} style={{ marginTop: 8 }}>{phase}</T>
          <Kicker style={{ marginTop: 16 }}>{L.crisis.waveKicker}</Kicker>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 96, borderBottomWidth: 1, borderColor: c.line, marginTop: 6 }}>
            {wave.map((w, i) => <View key={i} style={{ flex: 1, height: w.h, backgroundColor: w.on ? c.fg : c.line }} />)}
          </View>
          <T w="s" size={12} lh={17} style={{ marginTop: 6 }}>{text}</T>

          <Kicker color={c.acc2} style={{ marginTop: 18 }}>{L.crisis.why}</Kicker>
          <T w="s" size={16} lh={22} style={{ marginTop: 4 }}>{a.reason}</T>
          <Kicker color={c.acc2} style={{ marginTop: 14 }}>{L.crisis.future}</Kicker>
          <T w="s" size={16} lh={22} style={{ marginTop: 4 }}>{a.letter}</T>
          {hasVow && <>
            <Kicker color={c.acc2} style={{ marginTop: 14 }}>{L.crisis.vowKicker}</Kicker>
            {watch ? <VowPlayback uri={a.vowUri} /> : null}
            <Pressable onPress={() => setWatch(!watch)} style={{ marginTop: 6, borderWidth: 1, borderColor: c.line, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              <T w="s" size={14}>{watch ? L.crisis.vowHide : L.crisis.vowWatch}</T><T size={14}>{watch ? '■' : '▶'}</T>
            </Pressable>
          </>}
          {!!a.plan && <><Kicker color={c.acc2} style={{ marginTop: 14 }}>{L.crisis.plan}</Kicker><T w="s" size={16} lh={22} style={{ marginTop: 4 }}>{a.plan}</T></>}
          <Kicker color={c.acc2} style={{ marginTop: 14 }}>{L.crisis.now}</Kicker>
          <T w="s" size={14} lh={21} style={{ marginTop: 4 }}>{H.crisisSteps}</T>
        </View>

        <View style={{ flex: 1, minHeight: 16 }} />
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: c.line, paddingHorizontal: 16 }}>
          {gs.map((g, i) => (
            <Pressable key={g.id} onPress={() => g.phone && Linking.openURL(`tel:${g.phone}`)} style={{ flex: 1, paddingVertical: 8, paddingRight: 8, paddingLeft: i ? 10 : 0, borderRightWidth: i < gs.length - 1 ? 1 : 0, borderColor: c.line }}>
              <T size={15}>{g.name}</T>
              <T size={10} ls={0.4} color={failedFor(g) ? c.acc2 : c.fg} style={{ marginTop: 1 }}>{status(g)}</T>
            </Pressable>
          ))}
        </View>
        {!!summary && <T w="r" size={11.5} lh={16} color={c.dim} style={{ paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderColor: c.line }}>{summary}</T>}
        <CalmBanner onPress={() => setGames(true)} />
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: c.line }}>
          {!!help.lines[0] && <Pressable onPress={() => Linking.openURL(`tel:${help.lines[0].tel}`)} style={{ flex: 1, padding: 12, borderRightWidth: 1, borderColor: c.line }}><T w="s" size={12}>{`${help.lines[0].short} · ${L.help.support}`}</T></Pressable>}
          <Pressable onPress={() => Linking.openURL(`tel:${help.emergency}`)} style={{ flex: 1, padding: 12 }}><T w="s" size={12} color={c.acc2}>{`${help.emergency} · ${L.help.emergencyShort}`}</T></Pressable>
        </View>
      </Body>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 2 }}>
          <ActionBar label={left > 0 ? L.crisis.left(mmss(left)) : L.crisis.overcome} right="" disabled={left > 0} height={68}
            onPress={() => { a.set({ crisisUntil: 0, points: a.points + 10 }); go('home'); }} />
        </View>
      </View>
    </Screen>
  );
}
