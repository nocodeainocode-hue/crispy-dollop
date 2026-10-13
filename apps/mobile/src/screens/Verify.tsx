import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useApp, localDay } from '../store';
import { useServer } from '../server';
import { Screen, Back, ActionBar, T, Kicker, Hair } from '../components/ui';
import { c } from '../theme';
import type { Go } from '../nav';
import { useL, useH } from '../i18n';
import DayDone from './DayDone';

// Günlük kontrol: kendi beyanına dayanır (kamera/biyometri yok). Beyan vasilere iletilir, "Evet" nüks akışına gider.
export default function Verify({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH();
  const [vs, setVs] = useState(0);
  const [urge, setUrge] = useState<number | null>(null);
  const doneToday = a.lastCheckIn > 0 && localDay(a.lastCheckIn) === localDay();

  const complete = (helper = '') => {
    const nextIn = (4 + Math.random() * 6) * 3600000; // sonraki kontrol hatırlatması: rastgele 4–10 saat
    srv.checkin(urge ?? undefined).catch(() => {}); // sunucuya bildir (çevrimdışıysa yerel kayıt yine de geçerli)
    a.set({ checkIns: [...a.checkIns, Date.now()], lastCheckIn: Date.now(), points: a.points + 5, nextVerifyAt: Date.now() + nextIn });
    if (urge !== null && urge >= 6) a.addEntry({ kind: 'tetik', mood: '', trigger: '', note: L.verify.entryNote(urge) });
    if (helper) a.addEntry({ kind: 'iyi', mood: '', trigger: '', note: '', helper }); // Günlük'e "dayandım" + ne işe yaradı
    go('home');
  };

  // Günlük kontrol günde bir kez: bugün yapıldıysa soruları yeniden sorma
  if (doneToday && vs === 0) {
    return (
      <Screen>
        <Back onPress={() => go('home')} />
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>
          <Kicker color={c.acc2}>{L.verify.doneKicker}</Kicker>
          <T size={36} ls={-1.1} lh={38} style={{ marginTop: 6 }}>{L.verify.doneTitle}</T>
          <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 10 }}>{L.verify.doneBody}</T>
        </View>
        <ActionBar label={L.common.backToPanel} onPress={() => go('home')} />
      </Screen>
    );
  }

  if (vs === 2) return <DayDone urge={urge} onDone={complete} />;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', height: 8, backgroundColor: c.cell }}>
        <View style={{ width: `${((vs + 1) / 3) * 100}%`, backgroundColor: c.acc }} />
      </View>
      <Back onPress={() => go('home')} />
      <T size={36} ls={-1.1} lh={36} style={{ paddingHorizontal: 16 }}>{vs === 0 ? H.verifyQuestion : vs === 1 ? L.verify.urgeTitle : L.verify.cleanTitle}</T>
      <T w="r" size={13} lh={19} color={c.dim} style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        {vs === 0 ? L.verify.askSmall : vs === 1 ? L.verify.urgeSmall : L.verify.cleanSmall}
      </T>

      <View style={{ flex: 1 }}>
        {vs === 0 && <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <ActionBar label={H.verifyYes} right="→" kind="ghost" height={84} size={20} onPress={() => go('relapse')} />
        </View>}
        {vs === 1 && <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderLeftWidth: 1, borderTopWidth: 1, borderColor: c.line }}>
            {Array.from({ length: 11 }, (_, i) => (
              <Pressable key={i} onPress={() => setUrge(i)} style={{ width: '25%', height: 64, borderRightWidth: 1, borderBottomWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: urge === i ? (i >= 6 ? c.acc : c.fg) : 'transparent' }}>
                <T size={22} color={urge === i ? c.ink : c.fg}>{i}</T>
              </Pressable>
            ))}
          </View>
        </View>}
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
        {L.verify.steps.map((t, i) => (
          <View key={t} style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 16, borderLeftWidth: i ? 1 : 0, borderColor: c.line, backgroundColor: vs === i ? c.fg : 'transparent' }}>
            <T size={11} color={vs === i ? c.ink : c.fg}>{t}</T>
          </View>
        ))}
      </View>
      {vs === 0 && <ActionBar label={H.verifyNo} onPress={() => setVs(1)} />}
      {vs === 1 && <ActionBar label={L.common.continue} disabled={urge === null} onPress={() => setVs(2)} />}
    </Screen>
  );
}
