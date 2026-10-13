import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../store';
import { useServer } from '../server';
import { Screen, Body, Back, ActionBar, NumRow, Field, T, Kicker, Hair } from '../components/ui';
import { c } from '../theme';
import type { Go } from '../nav';
import { useL, useH } from '../i18n';

export default function Relapse({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [self, setSelf] = useState(true);
  const [note, setNote] = useState('');
  const [step, setStep] = useState(0); // 0 form, 1 sonuç
  const [struck, setStruck] = useState(false);
  const days = Math.floor((Date.now() - (a.streakStartedAt || a.startedAt)) / 86400000); // bozulan temiz seri
  const packDay = Math.min(a.goalDays, Math.floor((Date.now() - a.startedAt) / 86400000) + 1);
  const loss = self ? 25 : 50;

  useEffect(() => { if (step === 1) { const t = setTimeout(() => setStruck(true), 300); return () => clearTimeout(t); } }, [step]);

  const acc = a.guardians.filter(g => g.status === 'accepted').length;
  const acts = [
    L.relapse.actPoints(loss, Math.max(0, a.points - loss)),
    acc > 0 ? L.relapse.actNotify(acc) : a.guardians.length ? L.relapse.actNone : L.relapse.actSolo,
    L.relapse.actReset(Math.max(0, a.goalDays - packDay)),
    a.guardians.length ? L.relapse.actAdvice : L.relapse.actAdviceSolo,
  ];

  const restart = async () => {
    setBusy(true); setErr('');
    try {
      await srv.relapse(self, note); // sunucu: seri sıfırlanır + vasilere haber; apply() yerel durumu günceller
      a.addEntry({ kind: 'nuks', mood: '', trigger: self ? 'self' : '', note });
      a.set({ points: Math.max(0, a.points - loss) });
      go('home');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  if (step === 0) return (
    <Screen>
      <Back onPress={() => go('home')} />
      <Body>
        <View style={{ paddingHorizontal: 16 }}>
          <Kicker color={c.acc2}>{H.relapseKicker}</Kicker>
          <T size={34} ls={-1} lh={35} style={{ marginTop: 6 }}>{L.relapse.title}</T>
          <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 10, marginBottom: 14 }}>{L.relapse.body}</T>
        </View>
        <Hair />
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: c.line }}>
          {[[L.relapse.self, true], [L.relapse.noticed, false]].map(([l, v], i) => (
            <View key={String(l)} style={{ flex: 1, borderLeftWidth: i ? 1 : 0, borderColor: c.line }}>
              <ActionBar label={String(l)} right="" kind={self === v ? 'light' : 'ghost'} hoverRed={false} height={52} size={13} onPress={() => setSelf(v as boolean)} />
            </View>
          ))}
        </View>
        <View style={{ paddingTop: 16 }}><Field label={L.relapse.noteLabel} multiline placeholder={L.relapse.notePh} value={note} onChangeText={setNote} /></View>
      </Body>
      <ActionBar label={L.relapse.report} kind="red" onPress={() => setStep(1)} />
    </Screen>
  );

  return (
    <Screen>
      <Body>
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <Kicker color={c.acc2}>{H.relapseResultKicker(new Date().toLocaleTimeString(L.locale, { hour: '2-digit', minute: '2-digit' }))}</Kicker>
          <T size={34} ls={-1} lh={35} style={{ marginTop: 6 }}>{L.relapse.resultTitle}</T>
          <View style={{ marginTop: 18, marginBottom: 4, paddingVertical: 6 }}>
            <T size={64} ls={-3}>{L.relapse.days(days)}</T>
            <View style={{ position: 'absolute', left: 0, top: '50%', height: 6, width: struck ? '100%' : '0%', backgroundColor: c.acc }} />
            {struck && <View style={{ position: 'absolute', right: 0, top: -6, borderWidth: 3, borderColor: c.acc, backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2, transform: [{ rotate: '-8deg' }] }}><T size={18} ls={1} color={c.acc}>{L.relapse.broken}</T></View>}
          </View>
          <T w="r" size={13} lh={19} color={c.dim}>{L.relapse.daysReal(days)}</T>
        </View>
        <Hair style={{ marginTop: 14 }} />
        {acts.map((t, i) => <NumRow key={i} no={`0${i + 1}`}>{t}</NumRow>)}
        <View style={{ flex: 1 }} />
      </Body>
      {!!err && <T w="s" size={12} color={c.acc2} style={{ padding: 16 }}>{err}</T>}
      <ActionBar label={busy ? L.relapse.sending : L.relapse.restart} disabled={busy} onPress={restart} />
    </Screen>
  );
}
