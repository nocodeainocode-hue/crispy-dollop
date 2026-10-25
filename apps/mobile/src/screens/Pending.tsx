import React, { useState } from 'react';
import { View, Pressable, Share, Platform } from 'react-native';
import { useApp } from '../store';
import { useServer } from '../server';
import VowRecorder, { type Vow } from '../components/VowRecorder';
import { Screen, Body, Back, ActionBar, Field, Opt, T, Kicker } from '../components/ui';
import { PaperCard, StatusMark, Stat, TextLink, TierPlant } from '../components/SetupParts';
import type { Go } from '../nav';
import { c, pebble } from '../theme';
import { useL, useH } from '../i18n';
import { shareVow, vowExists } from '../vowStore';

/** Şahitlerin: davet durumu, kodu yeniden gönderme, yeni şahit ekleme. Pakt şahit beklemeden başlar; anahtarlar kabul edildikçe devreye girer. */
export default function Guardians({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState({ name: '', email: '' });
  const [recording, setRecording] = useState(false);
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
          <T size={36} ls={-1.1} lh={40} style={{ marginTop: 6 }}>{L.guardians.title}</T>
          <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 10 }}>{gs.length === 0 ? L.guardians.soloBody : L.guardians.body}</T>
        </View>
        {gs.map(g => (
          <View key={g.id} style={[pebble(64, g.id), { marginHorizontal: 16, marginVertical: 5, minHeight: 64, borderWidth: 2, borderColor: g.status === 'accepted' ? c.act : c.line, backgroundColor: g.status === 'accepted' ? c.sageWash : c.surf, paddingVertical: 10, paddingLeft: 22, paddingRight: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 8 }}><T size={17} numberOfLines={1}>{g.name}</T><T w="r" size={14} color={c.dim} numberOfLines={1}>{g.email}</T></View>
              {/* Durum yalnız renk değil: simge + metin */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <StatusMark status={g.status ?? 'invited'} />
                <T w="s" size={13} color={g.status === 'declined' ? c.acc2 : c.fg}>{L.guardians.status[g.status ?? 'invited']}</T>
              </View>
            </View>
            {g.status === 'invited' && <TextLink label={L.guardians.resend} onPress={() => run(() => srv.resendInvite(g.id), L.guardians.resent)} />}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 }}>
          <Stat seed="keys" label={L.guardians.kGuardian} value={String(accepted)} />
          <Stat seed="video" label={L.guardians.kVideo} value={noVow ? L.guardians.vowNone : L.guardians.vowSet} />
        </View>

        {live < 3 && <View style={{ paddingTop: 18 }}>
          <Kicker color={c.dim} style={{ paddingHorizontal: 16, paddingBottom: 6 }}>{gs.some(g => g.status === 'declined') ? L.guardians.addReplace : L.guardians.add}</Kicker>
          <Field placeholder={L.guardians.phName} value={add.name} onChangeText={t => setAdd({ ...add, name: t })} />
          <Field placeholder={L.guardians.phEmail} keyboardType="email-address" autoCapitalize="none" value={add.email} onChangeText={t => setAdd({ ...add, email: t })} />
          <ActionBar label={L.guardians.sendInvite} right="" kind="ghost" height={60} size={19} disabled={busy || !add.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(add.email.trim())}
            onPress={() => run(async () => { await srv.addGuardian({ name: add.name.trim(), email: add.email.trim().toLowerCase() }); setAdd({ name: '', email: '' }); }, L.guardians.sent)} />
        </View>}
        <View style={{ paddingTop: 12 }}>
          <Opt label={L.setup.hideOpt} sub={a.hideHabit ? L.guardians.hidden : L.guardians.shown} on={a.hideHabit} onPress={() => run(() => srv.setHideHabit(!a.hideHabit))} />
          {gs.length > 0 && <Opt label={L.guardians.weeklyOpt} sub={L.guardians.weeklySub} on={a.weeklyDigest} onPress={() => run(() => srv.setWeeklyDigest(!a.weeklyDigest))} />}
        </View>
        {!!msg && <T w="s" size={14} lh={20} color={c.acc2} style={{ padding: 16 }}>{msg}</T>}
        <View style={{ flex: 1, minHeight: 16 }} />
        {/* Ana eylem tek çakıl düğme; ikincil eylemler 48 dp metin bağlantıları */}
        {noVow
          ? <ActionBar label={L.guardians.addVow} right="" kind="ghost" height={60} size={19} onPress={() => setRecording(true)} />
          : <ActionBar label={L.guardians.shareVow} right="" kind="ghost" height={60} size={19} onPress={() => run(async () => { if (!(await shareVow(a.vowUri, L.guardians.shareTitle))) throw new Error(L.guardians.shareUnavailable); })} />}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 }}>
          {noVow ? <View /> : <TextLink label={L.guardians.redoVow} onPress={() => setRecording(true)} />}
          <TextLink label={L.guardians.refresh} align="flex-end" onPress={() => run(srv.sync)} />
        </View>
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
      <View style={{ paddingHorizontal: 16 }}><Kicker color={c.acc2}>{L.vow.optional}</Kicker><T size={32} ls={-1} lh={36} style={{ marginTop: 4 }}>{L.vow.title}</T></View>
      <VowRecorder script={H.vowLater(a.name || '…')} onChange={setVow} onSkip={onBack} />
      <T w="r" size={13} lh={18} color={c.dim} style={{ paddingHorizontal: 16, paddingBottom: 6 }}>{L.vow.stays}</T>
      {!!err && <T w="s" size={14} color={c.acc2} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>{err}</T>}
      <ActionBar label={busy ? L.vow.uploading : L.vow.upload} disabled={!vow || busy} onPress={async () => {
        if (!vow) return; setBusy(true); setErr('');
        try { await srv.saveVow(vow.uri, vow.seconds, vow.mime); onBack(); } catch (e: any) { setErr(e.message); }
        setBusy(false);
      }} />
    </Screen>
  );
}

/** Süre doldu: pakt tamamlandı. İndirim ya da ödül vaadi yok; yalnızca emeğin kaydı ("bahçe belgesi"). */
export function Completed({ onLater }: { onLater: () => void }) {
  const a = useApp();
  const L = useL();
  const [msg, setMsg] = useState('');
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
          <T size={64} ls={-3} lh={72} style={{ marginTop: 8 }}>{L.completed.days(a.goalDays)}</T>
          <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 12 }}>{clean === null ? L.completed.body : L.completed.bodyRelapsed(clean)}</T>
        </View>
        {/* Bahçe belgesi: paylaşılabilir; oyunlaştırma yok, yalnızca emeğin kaydı */}
        <PaperCard seed="garden-certificate" tilt={-0.9} pad={18}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Kicker color={c.acc2}>{L.completed.certKicker}</Kicker>
              <T size={30} ls={-1} lh={36} style={{ marginTop: 10 }}>{a.name || '—'}</T>
              {/* Paket adı tek yerden (L.plan.tier); deneme için "Ücretsiz deneme" */}
              <T w="s" size={16} style={{ marginTop: 10 }}>{L.completed.certPack(L.plan.tier[a.goalDays] ?? L.setup.packTrialKind, a.goalDays)}</T>
              <T w="r" size={14} color={c.dim} style={{ marginTop: 2 }}>{L.completed.certDates(fmt(a.startedAt), fmt(end))}</T>
              <T w="s" size={14} color={c.act} style={{ marginTop: 10 }}>{cleanLine}</T>
            </View>
            {/* Tamamlanan paketin saksı bitkisi (Filiz/Fidan/Ağaç); deneme için çizim yok */}
            <View style={{ marginLeft: 8 }}><TierPlant d={a.goalDays} height={88} /></View>
          </View>
          <T size={13} color={c.dim} style={{ marginTop: 14 }}>QuitVow</T>
        </PaperCard>
        <Pressable onPress={share} accessibilityRole="button" accessibilityLabel={L.completed.share} style={{ marginHorizontal: 16, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><T w="s" size={16} color={c.act}>{L.completed.share}</T></Pressable>
        {!!msg && <T w="r" size={14} color={c.dim} style={{ paddingHorizontal: 16, paddingTop: 4 }}>{msg}</T>}
        <T w="r" size={14} lh={20} color={c.dim} style={{ padding: 16 }}>{L.completed.note}</T>
      </Body>
      <ActionBar label={L.completed.later} right="" kind="ghost" height={60} size={19} onPress={onLater} />
      <ActionBar label={L.completed.newPact} onPress={() => a.set({ startingNew: true, onboarded: false, pactStatus: 'none', crisisUntil: 0 })} />
    </Screen>
  );
}
