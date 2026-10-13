import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../store';
import { Screen, Body, Back, ActionBar, Field, Opt, T, Kicker, Hair } from '../components/ui';
import { c } from '../theme';
import Analysis from '../components/Analysis';
import type { Go } from '../nav';

import { useL, useH, entryLabel, isTrigger } from '../i18n';

export default function Journal({ go }: { go: Go }) {
  const a = useApp();
  const L = useL(), H = useH();
  const KIND: Record<string, string> = { tetik: L.journal.kindTrigger, kriz: L.journal.kindCrisis, nuks: H.kindRelapse, iyi: L.journal.kindResisted };
  const [mood, setMood] = useState('');
  const [trg, setTrg] = useState('');
  const [note, setNote] = useState('');

  const pattern = useMemo(() => {
    const cr = a.entries.filter(e => e.kind !== 'iyi');
    const h: Record<number, number> = {}; cr.forEach(e => { const k = new Date(e.at).getHours(); h[k] = (h[k] || 0) + 1; });
    const t: Record<string, number> = {}; a.entries.forEach(e => isTrigger(e.trigger) && (t[e.trigger] = (t[e.trigger] || 0) + 1));
    const th = Object.entries(h).sort((x, y) => y[1] - x[1])[0], tt = Object.entries(t).sort((x, y) => y[1] - x[1])[0];
    return { hour: th ? L.journal.hourAround(th[0]) : '—', trig: tt ? entryLabel(tt[0], H, L) : '—' };
  }, [a.entries, L, H]);

  const save = (kind: 'tetik' | 'iyi') => {
    a.addEntry({ kind, mood, trigger: trg, note: kind === 'iyi' ? note || L.journal.resistedNote : note });
    if (kind === 'iyi') a.set({ points: a.points + 3 });
    setMood(''); setTrg(''); setNote('');
  };

  return (
    <Screen>
      <Back onPress={() => go('home')} />
      <Body>
        <T size={36} ls={-1.1} lh={36} style={{ paddingHorizontal: 16 }}>{L.journal.title}</T>
        <T w="r" size={13} lh={19} color={c.dim} style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 }}>{H.journalIntro}{a.triggerTimes.length ? L.journal.riskTimes(a.triggerTimes.map(id => H.when[id] ?? id).join(' · ')) : ''}</T>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
          <View style={{ flex: 1, padding: 14, borderRightWidth: 1, borderColor: c.line }}><Kicker>{L.journal.riskiestHour}</Kicker><T size={18} style={{ marginTop: 4 }}>{pattern.hour}</T></View>
          <View style={{ flex: 1, padding: 14 }}><Kicker>{L.journal.topTrigger}</Kicker><T size={18} style={{ marginTop: 4 }}>{pattern.trig}</T></View>
        </View>

        <Analysis entries={a.entries} pack={a.goalDays > 7} go={go} />

        <Kicker color={c.acc2} style={{ padding: 16, paddingBottom: 8 }}>{L.journal.feel}</Kicker>
        <Hair />{Object.entries(H.moods).map(([m, label]) => <Opt key={m} label={label} on={mood === m} onPress={() => setMood(mood === m ? '' : m)} />)}
        <Kicker color={c.acc2} style={{ padding: 16, paddingBottom: 8 }}>{L.journal.trigger}</Kicker>
        <Hair />{Object.entries(H.triggers).map(([m, label]) => <Opt key={m} label={label} on={trg === m} onPress={() => setTrg(trg === m ? '' : m)} />)}
        <View style={{ paddingTop: 14 }}><Field label={L.journal.note} value={note} onChangeText={setNote} placeholder="…" /></View>

        <Kicker color={c.acc2} style={{ padding: 16, paddingBottom: 8 }}>{L.journal.history}</Kicker>
        <Hair />
        {a.entries.length === 0 && <T w="r" size={13} color={c.dim} style={{ padding: 16 }}>{L.journal.empty}</T>}
        {a.entries.map(e => (
          <View key={e.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: c.line }}>
            <View style={{ width: 92, padding: 12, borderRightWidth: 1, borderColor: c.line }}><Kicker color={e.kind === 'nuks' ? c.acc2 : c.fg}>{KIND[e.kind]}</Kicker></View>
            <View style={{ flex: 1, padding: 12 }}>
              <T w="s" size={13}>{[e.mood, e.trigger].filter(Boolean).map(x => entryLabel(x, H, L)).concat(e.helper ? [L.done.helpers[e.helper] ?? e.helper] : [], e.note ? [e.note] : []).join(' · ') || '—'}</T>
              <T w="r" size={11} color={c.mute} style={{ marginTop: 2 }}>{new Date(e.at).toLocaleString(L.locale)}</T>
            </View>
          </View>
        ))}
        <View style={{ height: 14 }} />
      </Body>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}><ActionBar label={L.journal.resisted} right="" kind="ghost" height={64} size={15} onPress={() => save('iyi')} /></View>
        <View style={{ flex: 1 }}><ActionBar label={L.journal.save} right="" height={64} size={15} disabled={!mood && !trg} onPress={() => save('tetik')} /></View>
      </View>
    </Screen>
  );
}
