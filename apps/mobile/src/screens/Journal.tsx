import React, { useMemo, useState } from 'react';
import { View, PixelRatio } from 'react-native';
import { useApp } from '../store';
import { Screen, Body, Back, ActionBar, Field, T, Kicker } from '../components/ui';
import { Rise } from '../components/motion';
import { Chip } from '../components/PaperKit';
import { c, F, pebble } from '../theme';
import Analysis from '../components/Analysis';
import type { Go } from '../nav';

import { useL, useH, entryLabel, isTrigger } from '../i18n';

/** Örüntü kutusu: hafif eğik kâğıt kart (yalnız dekoratif; içinde giriş alanı yok). */
const Stat = ({ label, value, tilt }: { label: string; value: string; tilt: number }) => (
  <View style={[pebble(104, label), { flex: 1, minHeight: 96, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: c.surf, borderWidth: 2, borderColor: c.line, transform: [{ rotate: `${tilt}deg` }] }]}>
    <Kicker color={c.dim}>{label}</Kicker>
    <T size={21} lh={26} numberOfLines={2} style={{ marginTop: 6, fontFamily: F.d }}>{value}</T>
  </View>
);

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

  // Kayıt: yalnızca günlüğe yazılır. (Puan yazımı kaldırıldı: dayanmak ödül avı değildir.)
  const save = (kind: 'tetik' | 'iyi') => {
    a.addEntry({ kind, mood, trigger: trg, note: kind === 'iyi' ? note || L.journal.resistedNote : note });
    setMood(''); setTrg(''); setNote('');
  };

  // Büyük yazı ölçeğinde iki düğme yan yana sığmaz: alt alta.
  const stack = PixelRatio.getFontScale() > 1.15;

  return (
    <Screen>
      <Back onPress={() => go('home')} />
      <Body>
        <Rise y={12}>
          <T size={40} ls={-0.8} lh={46} style={{ paddingHorizontal: 24 }}>{L.journal.title}</T>
          <T w="r" size={16} lh={23} color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 16 }}>{H.journalIntro}{a.triggerTimes.length ? L.journal.riskTimes(a.triggerTimes.map(id => H.when[id] ?? id).join(' · ')) : ''}</T>
        </Rise>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12 }}>
          <Stat label={L.journal.riskiestHour} value={pattern.hour} tilt={-1.2} />
          <Stat label={L.journal.topTrigger} value={pattern.trig} tilt={1.2} />
        </View>

        <Analysis entries={a.entries} pack={a.goalDays > 7} go={go} />

        <Kicker color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 10 }}>{L.journal.feel}</Kicker>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }}>
          {Object.entries(H.moods).map(([m, label]) => <Chip key={m} label={label} on={mood === m} onPress={() => setMood(mood === m ? '' : m)} />)}
        </View>
        <Kicker color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 10 }}>{L.journal.trigger}</Kicker>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }}>
          {Object.entries(H.triggers).map(([m, label]) => <Chip key={m} label={label} on={trg === m} onPress={() => setTrg(trg === m ? '' : m)} />)}
        </View>
        <View style={{ paddingTop: 18 }}><Field label={L.journal.note} value={note} onChangeText={setNote} placeholder="…" /></View>

        <Kicker color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 10 }}>{L.journal.history}</Kicker>
        {a.entries.length === 0 && <T w="r" size={15} lh={22} color={c.dim} style={{ paddingHorizontal: 24 }}>{L.journal.empty}</T>}
        {a.entries.map(e => (
          <View key={e.id} style={[pebble(72, e.id), { marginHorizontal: 16, marginVertical: 4, minHeight: 64, paddingVertical: 12, paddingHorizontal: 22, backgroundColor: c.surf, borderWidth: 2, borderColor: c.line }]}>
            <Kicker color={e.kind === 'nuks' ? c.clay : c.dim}>{KIND[e.kind]}</Kicker>
            <T w="s" size={15} lh={21} style={{ marginTop: 3 }}>{[e.mood, e.trigger].filter(Boolean).map(x => entryLabel(x, H, L)).concat(e.helper ? [L.done.helpers[e.helper] ?? e.helper] : [], e.note ? [e.note] : []).join(' · ') || '—'}</T>
            <T w="r" size={13} lh={18} color={c.dim} style={{ marginTop: 2 }}>{new Date(e.at).toLocaleString(L.locale)}</T>
          </View>
        ))}
        <View style={{ height: 14 }} />
      </Body>
      <View style={stack ? undefined : { flexDirection: 'row' }}>
        <View style={stack ? undefined : { flex: 1 }}><ActionBar label={L.journal.resisted} right="" kind="ghost" height={64} size={19} onPress={() => save('iyi')} /></View>
        <View style={stack ? undefined : { flex: 1 }}><ActionBar label={L.journal.save} right="" height={64} size={19} disabled={!mood && !trg} onPress={() => save('tetik')} /></View>
      </View>
    </Screen>
  );
}
