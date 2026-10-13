import React, { useEffect, useState } from 'react';
import { View, Pressable, Share, Platform } from 'react-native';
import { useApp } from '../store';
import { useServer } from '../server';
import VowRecorder, { type Vow } from '../components/VowRecorder';
import { Screen, Body, Back, ActionBar, Field, Opt, T, Kicker, Hair } from '../components/ui';
import type { Go } from '../nav';
import { c } from '../theme';
import { useL, useH } from '../i18n';
import { shareVow, vowExists } from '../vowStore';

/** Vasilerin: davet durumu, kodu yeniden gönderme, yeni vasi ekleme. Pakt vasi beklemeden başlar; anahtarlar kabul edildikçe devreye girer. */
export default function Guardians({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState({ name: '', email: '' });
  const [recording, setRecording] = useState(false);
  const [vow, setVow] = useState<Vow | null>(null);
  const gs = a.guardians.filter(g => g.status !== 'removed');
  const accepted = gs.filter(g => g.status === 'accepted').length;
  const live = gs.filter(g => g.status === 'invited' || g.status === 'accepted').length;
  const noVow = !a.vowSeconds || !vowExists(a.vowUri);

  const run = async (fn: () => Promise<void>, ok = '') => { setBusy(true); setMsg(''); try { await fn(); if (ok) setMsg(ok); } catch (e: any) { setMsg(e.message); } setBusy(false); };

  if (recording) return <VowScreen onBack={() => setRecording(false)} />;

  return (
    <Screen>
      <Back onPress={() => go('home')} />
      <Body>
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 }}>
          <Kicker color={c.acc2}>{gs.length === 0 ? L.guardians.kSolo : accepted >= 2 ? L.guardians.kActive : L.guardians.kCount(accepted)}</Kicker>
          <T size={36} ls={-1.1} lh={38} style={{ marginTop: 6 }}>{L.guardians.title}</T>
          <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 10 }}>{gs.length === 0 ? L.guardians.soloBody : L.guardians.body}</T>
        </View>
        <Hair />
        {gs.map(g => (
          <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: c.line }}>
            <View style={{ flex: 1 }}><T size={17}>{g.name}</T><T w="r" size={12} color={c.dim}>{g.email}</T></View>
            <View style={{ alignItems: 'flex-end' }}>
              <T size={10.5} ls={1} color={g.status === 'accepted' ? c.fg : g.status === 'declined' ? c.acc2 : c.dim}>{L.guardians.status[g.status ?? 'invited']}</T>
              {g.status === 'invited' && <Pressable onPress={() => run(() => srv.resendInvite(g.id), L.guardians.resent)}><T w="s" size={12} color={c.acc2} style={{ marginTop: 4 }}>{L.guardians.resend}</T></Pressable>}
            </View>
          </View>
        ))}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: c.line }}>
          <View style={{ flex: 1, padding: 14, borderRightWidth: 1, borderColor: c.line }}><Kicker>{L.guardians.kGuardian}</Kicker><T size={28} ls={-0.8}>{accepted}/2</T></View>
          <View style={{ flex: 1, padding: 14 }}><Kicker>{L.guardians.kVideo}</Kicker><T size={28} ls={-0.8}>{noVow ? '—' : '✓'}</T></View>
        </View>

        {live < 3 && <View style={{ paddingTop: 16 }}>
          <Kicker color={c.dim} style={{ paddingHorizontal: 16, paddingBottom: 6 }}>{gs.some(g => g.status === 'declined') ? L.guardians.addReplace : L.guardians.add}</Kicker>
          <Field placeholder={L.guardians.phName} value={add.name} onChangeText={t => setAdd({ ...add, name: t })} />
          <Field placeholder={L.guardians.phEmail} keyboardType="email-address" autoCapitalize="none" value={add.email} onChangeText={t => setAdd({ ...add, email: t })} />
          <ActionBar label={L.guardians.sendInvite} right="" kind="ghost" height={52} size={15} disabled={busy || !add.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(add.email.trim())}
            onPress={() => run(async () => { await srv.addGuardian({ name: add.name.trim(), email: add.email.trim().toLowerCase() }); setAdd({ name: '', email: '' }); }, L.guardians.sent)} />
        </View>}
        <View style={{ paddingTop: 12 }}>
          <Opt label={L.setup.hideOpt} sub={a.hideHabit ? L.guardians.hidden : L.guardians.shown} on={a.hideHabit} onPress={() => run(() => srv.setHideHabit(!a.hideHabit))} />
          {gs.length > 0 && <Opt label={L.guardians.weeklyOpt} sub={L.guardians.weeklySub} on={a.weeklyDigest} onPress={() => run(() => srv.setWeeklyDigest(!a.weeklyDigest))} />}
        </View>
        {!!msg && <T w="s" size={12} color={c.acc2} style={{ padding: 16 }}>{msg}</T>}
        <View style={{ flex: 1, minHeight: 16 }} />
        {noVow && <ActionBar label={L.guardians.addVow} right="" kind="ghost" height={56} size={15} onPress={() => setRecording(true)} />}
        {!noVow && <ActionBar label={L.guardians.shareVow} right="↗" kind="ghost" height={56} size={15} onPress={() => run(async () => { if (!(await shareVow(a.vowUri, L.guardians.shareTitle))) throw new Error(L.guardians.shareUnavailable); })} />}
        {!noVow && <ActionBar label={L.guardians.redoVow} right="" kind="ghost" height={52} size={14} onPress={() => setRecording(true)} />}
        <ActionBar label={L.guardians.refresh} right="↻" kind="ghost" height={60} size={15} onPress={() => run(srv.sync)} />
      </Body>
    </Screen>
  );
}

/** İmza videosu (isteğe bağlı): sonradan eklemek için tam ekran kayıt. Pakt başladıktan sonra yalnızca bir kez eklenebilir. */
export function VowScreen({ onBack }: { onBack: () => void }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH();
  const [vow, setVow] = useState<Vow | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <Screen>
      <Back onPress={onBack} />
      <View style={{ paddingHorizontal: 16 }}><Kicker color={c.acc2}>{L.vow.optional}</Kicker><T size={32} ls={-1} lh={34} style={{ marginTop: 4 }}>{L.vow.title}</T></View>
      <VowRecorder script={H.vowLater(a.name || '…')} onChange={setVow} />
      <T w="r" size={11.5} color={c.mute} style={{ paddingHorizontal: 16, paddingBottom: 6 }}>{L.vow.stays}</T>
      {!!err && <T w="s" size={12} color={c.acc2} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>{err}</T>}
      <ActionBar label={busy ? L.vow.uploading : L.vow.upload} disabled={!vow || busy} onPress={async () => {
        if (!vow) return; setBusy(true); setErr('');
        try { await srv.saveVow(vow.uri, vow.seconds, vow.mime); onBack(); } catch (e: any) { setErr(e.message); }
        setBusy(false);
      }} />
    </Screen>
  );
}

/** Süre doldu: pakt tamamlandı. */
export function Completed({ onLater }: { onLater: () => void }) {
  const a = useApp();
  const srv = useServer();
  const L = useL();
  const [discount, setDiscount] = useState(0);
  const [msg, setMsg] = useState('');
  useEffect(() => { srv.me().then(m => setDiscount(m.nextPackDiscount ?? 0)).catch(() => {}); }, []);
  const DAY = 86400000, end = a.startedAt + a.goalDays * DAY;
  // Dürüst özet: arada tekrar oynadıysa son temiz gün sayısı
  const clean = a.relapses.length ? Math.max(0, Math.floor((end - a.streakStartedAt) / DAY)) : null;
  const fmt = (t: number) => new Date(t).toLocaleDateString(L.locale);
  const cleanLine = clean === null ? L.completed.certClean : L.completed.certCleanLast(clean);
  const share = async () => {
    const text = L.completed.certText(a.name || '—', a.goalDays, fmt(a.startedAt), fmt(end), cleanLine);
    try {
      if (Platform.OS === 'web') { if ((navigator as any).share) await (navigator as any).share({ text }); else { await navigator.clipboard?.writeText(text); setMsg(L.completed.copied); } }
      else await Share.share({ message: text });
    } catch {}
  };
  return (
    <Screen>
      <Body>
        <View style={{ paddingHorizontal: 16, paddingTop: 30 }}>
          <Kicker color={c.acc2}>{L.completed.kicker}</Kicker>
          <T size={64} ls={-3} lh={60} style={{ marginTop: 8 }}>{L.completed.days(a.goalDays)}</T>
          <T w="r" size={14} lh={21} color={c.dim} style={{ marginTop: 16 }}>{clean === null ? L.completed.body : L.completed.bodyRelapsed(clean)}</T>
          {discount > 0 && <T w="s" size={14} lh={20} color={c.acc2} style={{ marginTop: 12 }}>{L.completed.discount(discount)}</T>}
        </View>
        {/* Tamamlama belgesi: paylaşılabilir; oyunlaştırma yok, yalnızca emeğin kaydı */}
        <View style={{ margin: 16, borderWidth: 2, borderColor: c.fg, padding: 18 }}>
          <Kicker color={c.acc2}>{L.completed.certKicker}</Kicker>
          <T size={30} ls={-1} lh={34} style={{ marginTop: 10 }}>{a.name || '—'}</T>
          <T w="s" size={15} style={{ marginTop: 10 }}>{L.completed.certPack(a.goalDays)}</T>
          <T w="r" size={13} color={c.dim} style={{ marginTop: 2 }}>{L.completed.certDates(fmt(a.startedAt), fmt(end))}</T>
          <T w="s" size={13} color={c.acc2} style={{ marginTop: 10 }}>{cleanLine}</T>
          <T size={12} color={c.mute} style={{ marginTop: 14 }}>QuitVow</T>
        </View>
        <Pressable onPress={share} style={{ marginHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: c.line, alignItems: 'center' }}><T w="s" size={14}>{L.completed.share}</T></Pressable>
        {!!msg && <T w="r" size={12} color={c.dim} style={{ paddingHorizontal: 16, paddingTop: 8 }}>{msg}</T>}
        <T w="r" size={12} lh={18} color={c.mute} style={{ padding: 16 }}>{L.completed.note}</T>
      </Body>
      <ActionBar label={L.completed.later} right="" kind="ghost" height={52} size={14} onPress={onLater} />
      <ActionBar label={L.completed.newPact} onPress={() => a.set({ startingNew: true, onboarded: false, pactStatus: 'none', crisisUntil: 0 })} />
    </Screen>
  );
}
