import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../store';
import { useServer } from '../server';
import { Screen, Body, Back, ActionBar, Opt, Field, T, Kicker } from '../components/ui';
import LeafCurl from '../crisisart/LeafCurl';
import HelpRow from '../crisisart/HelpRow';
import { c, pebble } from '../theme';
import type { Go } from '../nav';
import { useL, useH } from '../i18n';

// Tekrar oynadım: utandırmayan, sakin bir duraklama. Yaprak silinmez, kenarı kıvrılır. Puan, ceza ya da damga dili yok.
// Kendini bildirme akışı ve sunucu çağrısı (srv.relapse) aynı; yalnızca görünüm ve metin değişti.
export default function Relapse({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [self, setSelf] = useState(true);
  const [note, setNote] = useState('');
  const [step, setStep] = useState(0); // 0 form, 1 sonuç
  const days = Math.floor((Date.now() - (a.streakStartedAt || a.startedAt)) / 86400000); // kıvrılan temiz seri (silinmez)
  const packDay = Math.min(a.goalDays, Math.floor((Date.now() - a.startedAt) / 86400000) + 1);

  const acc = a.guardians.filter(g => g.status === 'accepted').length;
  const acts = [
    acc > 0 ? L.relapse.actNotify(acc) : a.guardians.length ? L.relapse.actNone : L.relapse.actSolo,
    L.relapse.actReset(Math.max(0, a.goalDays - packDay)),
    a.guardians.length ? L.relapse.actAdvice : L.relapse.actAdviceSolo,
  ];

  const restart = async () => {
    setBusy(true); setErr('');
    try {
      await srv.relapse(self, note); // sunucu: seri sıfırlanır + şahitlere haber; apply() yerel durumu günceller
      a.addEntry({ kind: 'nuks', mood: '', trigger: self ? 'self' : '', note });
      go('home');
    } catch { setErr(L.relapse.fail); }
    setBusy(false);
  };

  if (step === 0) return (
    <Screen>
      <Back onPress={() => go('home')} />
      <Body>
        <View style={{ paddingHorizontal: 16 }}>
          <Kicker color={c.dim}>{H.relapseKicker}</Kicker>
          <T size={44} ls={-0.8} lh={50} style={{ marginTop: 6 }}>{L.relapse.title}</T>
          <T w="s" size={19} lh={27} style={{ marginTop: 8, marginBottom: 14 }}>{L.relapse.body}</T>
        </View>
        <Opt label={L.relapse.self} on={self} onPress={() => setSelf(true)} />
        <Opt label={L.relapse.noticed} on={!self} onPress={() => setSelf(false)} />
        <View style={{ paddingTop: 16 }}><Field label={L.relapse.noteLabel} multiline placeholder={L.relapse.notePh} value={note} onChangeText={setNote} /></View>
        <HelpRow style={{ marginBottom: 8 }} />
      </Body>
      <ActionBar label={L.relapse.report} onPress={() => setStep(1)} />
    </Screen>
  );

  return (
    <Screen>
      <Back onPress={() => setStep(0)} />
      <Body>
        <View style={{ paddingHorizontal: 16 }}>
          <Kicker color={c.dim}>{H.relapseResultKicker(new Date().toLocaleTimeString(L.locale, { hour: '2-digit', minute: '2-digit' }))}</Kicker>
          <T size={40} ls={-0.8} lh={46} style={{ marginTop: 6 }}>{L.relapse.resultTitle}</T>
          <View style={{ alignItems: 'center', marginTop: 8 }}><LeafCurl size={112} /></View>
          <T size={56} ls={-1} lh={64} maxFontSizeMultiplier={1.1} style={{ textAlign: 'center' }}>{L.relapse.days(days)}</T>
          <T w="s" size={18} lh={26} style={{ textAlign: 'center', marginTop: 4 }}>{L.relapse.daysReal(days)}</T>
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 18, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: c.surf, borderWidth: 2, borderColor: c.line, ...pebble(120, 'acts') }}>
          {acts.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 }}>
              <View style={{ width: 9, height: 8, marginTop: 8, marginRight: 12, backgroundColor: c.sage, borderWidth: 1.4, borderColor: c.fg, borderTopLeftRadius: 5, borderTopRightRadius: 2, borderBottomRightRadius: 5, borderBottomLeftRadius: 2 }} />
              <T w="r" size={16} lh={23} style={{ flex: 1 }}>{t}</T>
            </View>
          ))}
        </View>
        <HelpRow style={{ marginTop: 16, marginBottom: 8 }} />
      </Body>
      {!!err && <T w="s" size={15} lh={21} color={c.clay} style={{ paddingHorizontal: 16, paddingTop: 8 }}>{err}</T>}
      <ActionBar label={busy ? L.relapse.sending : L.relapse.restart} disabled={busy} onPress={restart} />
    </Screen>
  );
}
