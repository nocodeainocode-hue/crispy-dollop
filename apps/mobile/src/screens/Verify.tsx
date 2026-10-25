import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useApp, localDay } from '../store';
import { useServer } from '../server';
import { ApiError } from '../api';
import { Screen, Back, ActionBar, StepProgress, T } from '../components/ui';
import { c, pebble } from '../theme';
import type { Go } from '../nav';
import { useL, useH } from '../i18n';
import DayDone from './DayDone';

const withTimeout = <R,>(p: Promise<R>, ms: number) => new Promise<R>((res, rej) => {
  const t = setTimeout(() => rej(new ApiError(0, 'timeout')), ms);
  p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
});

const ROWS = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10]];

// Günlük kontrol: kendi beyanına dayanır (kamera/biyometri yok). Beyan şahitlere iletilir, "Evet" tekrar oynama akışına gider.
// Kayıt "Kaydet" anında yazılır (uygulama kapansa bile korunur); sunucu hatası yutulmaz, görünür bir mesaja düşer.
export default function Verify({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH();
  const { width } = useWindowDimensions();
  const [vs, setVs] = useState(0); // 0 soru, 1 dürtü, 2 gün tamam
  const [urge, setUrge] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [already, setAlready] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const doneToday = a.lastCheckIn > 0 && localDay(a.lastCheckIn) === localDay();

  const save = async () => {
    if (busy || urge === null) return;
    setBusy(true);
    const at = Date.now();
    let dup = false, fail = false;
    try { await withTimeout(srv.checkin(urge), 10000); }
    catch (e) { if (e instanceof ApiError && e.status === 409) dup = true; else fail = true; }
    if (dup) {
      // Sunucuda bugünün kontrolü zaten var: yerelde de işaretle, çiftleme yok
      if (!doneToday) a.set({ checkIns: [...a.checkIns, at], lastCheckIn: at });
      if (alive.current) { setAlready(true); setBusy(false); setVs(0); }
      return;
    }
    // Sunucuya ulaşılamasa da yerel kayıt geçerli; hata ise gün tamam ekranında görünür bir uyarı olarak gösterilir
    a.set({ checkIns: [...a.checkIns, at], lastCheckIn: at, points: a.points + 5, nextVerifyAt: at + 6 * 3600000 });
    if (urge >= 6) a.addEntry({ kind: 'tetik', mood: '', trigger: '', note: L.verify.entryNote(urge) });
    if (!alive.current) return;
    setNotice(fail ? L.verify.syncFail : null);
    setBusy(false);
    setVs(2);
  };
  const finish = (helper: string) => {
    if (helper) a.addEntry({ kind: 'iyi', mood: '', trigger: '', note: '', helper }); // Günlük'e "dayandım" + ne işe yaradı
    go('home');
  };

  // Günlük kontrol günde bir kez: bugün yapıldıysa soruları yeniden sorma
  if (doneToday && vs === 0) {
    return (
      <Screen>
        <Back onPress={() => go('home')} />
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
          <T size={44} lh={50} maxFontSizeMultiplier={1.3}>{L.verify.doneTitle}</T>
          {already && <T w="s" size={17} lh={24} style={{ marginTop: 12 }}>{L.verify.alreadySaved}</T>}
          <T w="r" size={17} lh={25} color={c.dim} style={{ marginTop: 12 }}>{L.verify.doneBody}</T>
        </View>
        <ActionBar label={L.common.backToPanel} onPress={() => go('home')} />
      </Screen>
    );
  }

  if (vs === 2) return <DayDone urge={urge} notice={notice} onDone={finish} />;

  const chipW = Math.min(88, Math.floor((Math.min(width, 430) - 32 - 30) / 4));

  return (
    <Screen>
      <Back onPress={() => (vs === 1 ? setVs(0) : go('home'))} />
      <StepProgress step={vs} total={2} />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28 }}>
        <T size={40} lh={46} maxFontSizeMultiplier={1.3}>{vs === 0 ? H.verifyQuestion : L.verify.urgeTitle}</T>
        <T w="r" size={18} lh={25} color={c.dim} style={{ marginTop: 12 }}>{vs === 0 ? L.verify.askSmall : L.verify.urgeSmall}</T>

        {vs === 1 && (
          <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}>
            {ROWS.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 5 }}>
                {row.map(i => {
                  const on = urge === i;
                  return (
                    <Pressable key={i} onPress={() => setUrge(i)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${i}`}
                      style={[pebble(60, i), { width: chipW, height: 60, marginHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? c.act : c.edge, backgroundColor: on ? c.act : c.surf }]}>
                      <T size={26} color={on ? c.onAct : c.fg} maxFontSizeMultiplier={1.2}>{i}</T>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5, marginTop: 8 }}>
              <T w="s" size={15} color={c.dim}>{L.verify.urgeLow}</T>
              <T w="s" size={15} color={c.dim}>{L.verify.urgeHigh}</T>
            </View>
          </View>
        )}
      </View>

      {vs === 0 && (
        <>
          {/* Hayır / Evet eşit ağırlıkta: ikisi de aynı boy ve aynı stil */}
          <ActionBar label={H.verifyNo} kind="ghost" height={72} onPress={() => setVs(1)} />
          <ActionBar label={H.verifyYes} kind="ghost" height={72} onPress={() => go('relapse')} />
        </>
      )}
      {vs === 1 && <ActionBar label={busy ? L.verify.saving : L.verify.save} disabled={urge === null || busy} onPress={save} />}
    </Screen>
  );
}
