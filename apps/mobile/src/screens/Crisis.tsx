import React, { useEffect, useMemo, useState } from 'react';
import { View, Linking, Pressable, Text, AppState, useWindowDimensions } from 'react-native';
import { useApp, CRISIS_MS } from '../store';
import { useServer } from '../server';
import { Screen, T } from '../components/ui';
import Calm from './Calm';
import CrisisStage, { skyHalo } from '../crisisart/CrisisStage';
import CrisisNote from '../crisisart/CrisisNote';
import PebbleBtn from '../crisisart/PebbleBtn';
import HelpRow from '../crisisart/HelpRow';
import { useL, useH } from '../i18n';
import { useHapticsScope } from '../haptics';
import { c, F, pebble } from '../theme';
import type { Go } from '../nav';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const TOTAL = CRISIS_MS / 1000;

// Kriz: tek ekran, kaydırmasız. Ortada kesit sahnesi (art/plant GardenScene "crisis": rüzgârda en çok 11° sallanan bitki, süreyle uzayan kökler,
// nefes diski); süre ve nefes komutu sahnenin sol üst gökyüzünde, altta sabit eylemler. Haptik: kriz kapsamı (en çok tek hafif titreşim), oyunlarda sessiz.
// Kriz kilidi (crisisUntil), şahit bildirimi (srv.crisis) ve süre mantığı aynı; yalnızca görünüm değişti.
export default function Crisis({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH();
  const { height: winH } = useWindowDimensions();
  const [until] = useState(() => (a.crisisUntil > Date.now() ? a.crisisUntil : Date.now() + CRISIS_MS));
  const [now, setNow] = useState(Date.now());
  const [games, setGames] = useState(false);
  const [note, setNote] = useState(false);
  // Şahitlere bildirimin GERÇEK sonucu: sending | ok (n şahide e-posta gitti) | none (kabul eden yok) | failed | resumed (kriz daha önce başlamıştı)
  const [notify, setNotify] = useState<'sending' | 'ok' | 'none' | 'failed' | 'resumed'>(a.crisisUntil > Date.now() ? 'resumed' : 'sending');
  const [notified, setNotified] = useState(0);
  // Nefes döngüsünün başlangıcı: komut metni ve disk aynı andan sayar. Ekran geri gelince (oyun/Nedenim) ve uygulama öne gelince baştan ("Nefes al").
  const [cyc, setCyc] = useState(() => ({ t0: Date.now(), k: 0 }));
  const resetBreath = () => setCyc(p => ({ t0: Date.now(), k: p.k + 1 }));
  useHapticsScope(games ? 'quiet' : 'crisis');

  useEffect(() => {
    if (a.crisisUntil !== until) {
      a.set({ crisisUntil: until });
      srv.crisis().then(r => { if (typeof r?.notified !== 'number') { setNotify('resumed'); return; } setNotified(r.notified); setNotify(r.notified > 0 ? 'ok' : 'none'); }).catch(() => setNotify('failed'));
      a.addEntry({ kind: 'kriz', mood: '', trigger: '', note: L.crisis.entryNote });
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') { setNow(Date.now()); setCyc(p => ({ t0: Date.now(), k: p.k + 1 })); } });
    return () => { clearInterval(t); sub.remove(); };
  }, []);

  const left = Math.max(0, Math.round((until - now) / 1000));
  const el = TOTAL - left;
  // Nefes: 10 sn'lik devir, "al 4 · ver 6" (tutma yok). İlk komut her zaman "Nefes al"; disk (useBreath) aynı başlangıçtan döner.
  const bsec = Math.max(0, Math.round((now - cyc.t0) / 1000));
  const phase = left === 0 ? L.crisis.phaseOver : bsec % 10 < 4 ? L.crisis.phaseIn : L.crisis.phaseOut;
  // Kök ilerlemesi (geçen süre / toplam süre); sahne 10 sn adımına yuvarlar ve React.memo ile her saniye yeniden çizilmez
  const prog = Math.min(1, Math.max(0, el / TOTAL));
  const day = Math.max(1, Math.min(a.goalDays, Math.floor((now - a.startedAt) / 86400000) + 1));

  const gs = a.guardians.slice(0, 3);
  const summary = gs.length === 0 ? L.crisis.sumSolo
    : notify === 'failed' ? L.crisis.sumFailed
    : notify === 'none' ? L.crisis.sumNone
    : notify === 'ok' ? L.crisis.sumOk(notified)
    : notify === 'resumed' ? L.crisis.sumResumed : '';
  // Ana ekranda tek kısa satır; tam (dürüst) metin "Nedenim" sayfasında
  const status = gs.length === 0 ? '' : notify === 'sending' ? L.crisis.sending : notify === 'ok' ? L.crisis.told(notified)
    : notify === 'none' ? L.crisis.toldNone : notify === 'failed' ? L.crisis.toldFail : '';

  const steps = useMemo(() => H.crisisSteps, [H.crisisSteps]); // sahne yeterince yüksekse gökyüzü el notları çıkar (3 adım "Nedenim" sayfasında da var)
  // Zor (tekrar oynama) günleri: yaprak silinmez, kenarı kıvrılır (Ana ekranla aynı hesap)
  const hard = useMemo(() => [...new Set(a.relapses.map(t => Math.floor((t - a.startedAt) / 86400000) + 1).filter(d => d >= 1 && d <= a.goalDays))].sort((x, y) => x - y), [a.relapses, a.startedAt, a.goalDays]);
  const overText = left === 0 ? L.crisis.stillHard : L.crisis.breath;
  const tSize = winH >= 720 ? 72 : winH >= 640 ? 64 : 56;

  if (games) return <Calm onBack={() => { setGames(false); resetBreath(); }} />;
  if (note) return <CrisisNote clock={mmss(left)} summary={summary} onBack={() => { setNote(false); resetBreath(); }} />;

  return (
    <Screen crisis>
      <View style={{ flex: 1 }}>
        {/* üst: el notu + Nedenim */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
            <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: F.hand, fontSize: 30, lineHeight: 34, color: c.clay, flexShrink: 1 }}>{L.crisis.wind}</Text>
            <Pressable onPress={() => setNote(true)} accessibilityRole="button" accessibilityLabel={L.crisis.myWhy}
              style={[pebble(48, 'nedenim'), { minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', borderWidth: 2, borderColor: c.fg, backgroundColor: c.surf, transform: [{ rotate: '1.2deg' }] }]}>
              <T w="b" size={17} maxFontSizeMultiplier={1.2}>{L.crisis.myWhy}</T>
            </Pressable>
          </View>
        </View>

        {/* orta: kesit sahnesi (esner); süre ve nefes komutu sol üst gökyüzünde, bitki sağda */}
        <View style={{ flex: 1, marginTop: 4 }}>
          <CrisisStage goalDays={a.goalDays} day={day} hard={hard} rootProgress={prog} rooting={L.crisis.rooting} steps={steps} breathKey={cyc.k}>
            <T size={tSize} lh={Math.round(tSize * 1.1)} ls={-1} maxFontSizeMultiplier={1} style={[{ fontVariant: ['tabular-nums'] }, skyHalo()]} accessibilityLabel={mmss(left)}>{mmss(left)}</T>
            <View accessibilityLiveRegion="polite">
              <T size={28} lh={34} maxFontSizeMultiplier={1.2} style={skyHalo()}>{phase}</T>
              <T w="s" size={15} lh={20} color={c.dim} maxFontSizeMultiplier={1.2} style={[{ marginTop: 2 }, skyHalo()]}>{overText}</T>
            </View>
          </CrisisStage>
        </View>

        {/* alt: sabit eylemler (kaydırma yok) */}
        <View style={{ paddingTop: 10 }}>
          {gs.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
              {gs.map((g, i) => {
                const ok = g.status === 'accepted';
                const can = ok && !!g.phone;
                const sub = g.status === 'declined' ? L.crisis.stDeclined : !ok ? L.crisis.stNotAccepted : !g.phone ? L.crisis.noPhone : L.crisis.call;
                return (
                  <PebbleBtn key={g.id} h={72} kind="soft" flex={1} label={`${g.name}, ${sub}`} seed={g.id} tilt={i % 2 ? 0.8 : -0.8}
                    onPress={can ? () => { Linking.openURL(`tel:${g.phone}`).catch(() => {}); } : undefined} style={{ minWidth: 0 }}>
                    <View style={{ flex: 1, opacity: can ? 1 : 0.65, alignItems: 'center' }}>
                      <T w="b" size={gs.length > 2 ? 16 : 19} lh={22} maxFontSizeMultiplier={1.2} numberOfLines={1}>{g.name}</T>
                      <T w="s" size={14} lh={18} color={can ? c.act : c.dim} maxFontSizeMultiplier={1.2} numberOfLines={1}>{sub}</T>
                    </View>
                  </PebbleBtn>
                );
              })}
            </View>
          )}
          <View style={{ minHeight: 30, justifyContent: 'center', paddingHorizontal: 20 }}>
            {gs.length === 0
              ? <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: F.hand, fontSize: 26, lineHeight: 30, color: c.clay }}>{L.crisis.alone}</Text>
              : !!status && <T w="s" size={15} lh={20} color={notify === 'failed' ? c.clay : c.dim} maxFontSizeMultiplier={1.2}>{status}</T>}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
            <PebbleBtn h={64} kind="act" flex={1.15} label={L.crisis.calmBtn} onPress={() => setGames(true)}>
              <T w="b" size={20} color={c.onAct} maxFontSizeMultiplier={1.2}>{L.crisis.calmBtn}</T>
            </PebbleBtn>
            <PebbleBtn h={64} kind="soft" flex={1} label={left > 0 ? L.crisis.left(mmss(left)) : L.crisis.overcome} disabled={left > 0}
              onPress={() => { a.set({ crisisUntil: 0 }); go('home'); }}>
              <T w="b" size={left > 0 ? 17 : 20} lh={20} maxFontSizeMultiplier={1.2} style={{ textAlign: 'center', flexShrink: 1 }} numberOfLines={2}>{left > 0 ? L.crisis.left(mmss(left)) : L.crisis.overcome}</T>
            </PebbleBtn>
          </View>
          <HelpRow style={{ marginTop: 10, marginBottom: 6 }} />
        </View>
      </View>
    </Screen>
  );
}
