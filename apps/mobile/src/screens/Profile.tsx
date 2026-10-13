import React, { useState } from 'react';
import { View, Pressable, Linking, Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { useApp } from '../store';
import { useServer } from '../server';
import { Screen, Body, Back, ActionBar, Field, T, Kicker, Hair } from '../components/ui';
import { Rise } from '../components/motion';
import { c } from '../theme';
import type { Go } from '../nav';
import { useL, useH, useHelp, currencySymbol, LANGS, dict, type Dict } from '../i18n';
import { shareVow, vowExists } from '../vowStore';

const DAY = 86400000;
const confirm = (L: Dict, msg: string, ok: () => void) =>
  Platform.OS === 'web' ? (window.confirm(msg) && ok()) : Alert.alert(L.common.sure, msg, [{ text: L.common.cancel }, { text: L.common.yes, onPress: ok }]);

const Row = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: c.line }}>
    <T w="s" size={13} color={c.dim}>{label}</T>
    <T size={14} color={accent ? c.acc2 : c.fg} style={{ flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>{value}</T>
  </View>
);
const LinkRow = ({ label, sub, onPress, danger }: { label: string; sub?: string; onPress: () => void; danger?: boolean }) => (
  <Pressable onPress={onPress} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: c.line }}>
    <View style={{ flex: 1 }}><T size={15} color={danger ? c.acc2 : c.fg}>{label}</T>{!!sub && <T w="r" size={12} color={c.dim} style={{ marginTop: 2 }}>{sub}</T>}</View>
    <T size={15} color={danger ? c.acc2 : c.dim}>→</T>
  </Pressable>
);
const Section = ({ children }: { children: string }) => <Kicker color={c.acc2} style={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8 }}>{children}</Kicker>;

/** Profil: üyelik, kalan gün, hesap ve ayarlar. Yalnızca gerçekten çalışan ayarlar vardır. */
export default function Profile({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH(), help = useHelp();
  const [name, setName] = useState(a.name);
  const [loss, setLoss] = useState(a.monthlyLoss ? String(a.monthlyLoss) : '');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const pack = a.goalDays > 7, completed = a.pactStatus === 'completed';
  const day = Math.min(a.goalDays, Math.floor((Date.now() - a.startedAt) / DAY) + 1);
  const left = Math.max(0, a.goalDays - day);
  const planName = completed ? (pack ? L.profile.planCompletedPack(a.goalDays) : L.profile.planCompletedTrial) : pack ? L.profile.planPack(a.goalDays) : L.profile.planTrial;
  const initial = (a.name || a.email || '?').trim().charAt(0).toUpperCase();
  const accepted = a.guardians.filter(g => g.status === 'accepted').length;
  const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };

  const saveName = async () => {
    setBusy(true);
    try { await srv.updateName(name.trim()); flash(L.profile.nameSaved); } catch (e: any) { flash(e.message, false); }
    setBusy(false);
  };
  const saveLoss = () => { a.set({ monthlyLoss: Number(loss) || 0 }); flash(L.profile.lossSaved); };
  const logout = () => confirm(L, L.profile.logoutConfirm, async () => { await srv.logout(); a.reset(); });
  const del = () => confirm(L, L.profile.deleteConfirm, async () => { setBusy(true); try { await srv.deleteAccount(); } catch (e: any) { flash(e.message, false); setBusy(false); } });

  return (
    <Screen>
      <Back onPress={() => go('home')} />
      <Body>
        <Rise y={12}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 18 }}>
            <View style={{ width: 64, height: 64, backgroundColor: c.fg, alignItems: 'center', justifyContent: 'center' }}><T size={32} color={c.ink}>{initial}</T></View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <T size={26} ls={-0.8} lh={30}>{a.name || L.profile.noName}</T>
              <T w="r" size={12.5} color={c.dim} style={{ marginTop: 2 }}>{a.email || L.profile.noEmail}</T>
            </View>
          </View>
        </Rise>
        <Hair />

        <Section>{L.profile.membership}</Section>
        <Hair />
        <Row label={L.profile.plan} value={planName} accent={!pack} />
        <Row label={L.profile.day} value={`${day} / ${a.goalDays}`} />
        <Row label={L.profile.streak} value={L.profile.streakDays(Math.max(1, Math.min(day, Math.floor((Date.now() - (a.streakStartedAt || a.startedAt)) / DAY) + 1)))} />
        <Row label={L.profile.left} value={completed ? L.profile.expired : L.profile.leftDays(left)} />
        <Row label={L.profile.start} value={new Date(a.startedAt).toLocaleDateString(L.locale)} />
        <LinkRow label={pack && !completed ? L.profile.myPack : completed ? L.profile.pickContinue : L.profile.continueWithPack} sub={pack ? L.profile.subPack : L.profile.subNoPack} onPress={() => go('plan')} />

        <Section>{L.profile.account}</Section>
        <Hair />
        <Field label={L.profile.nameLabel} placeholder={L.profile.namePh} value={name} onChangeText={setName} style={{ marginTop: 4 }} />
        <ActionBar label={L.profile.saveName} right="" kind="ghost" height={48} size={14} disabled={busy || name.trim().length < 2 || name.trim() === a.name} onPress={saveName} />
        <View style={{ paddingTop: 14 }}>
          <Field label={L.profile.lossLabel(currencySymbol(L))} placeholder={L.profile.lossPh} keyboardType="numeric" value={loss} onChangeText={setLoss} />
          <T w="r" size={11.5} lh={16} color={c.mute} style={{ paddingHorizontal: 16, marginBottom: 8 }}>{L.profile.lossNote}</T>
        </View>
        <ActionBar label={L.profile.saveLoss} right="" kind="ghost" height={48} size={14} disabled={(Number(loss) || 0) === a.monthlyLoss} onPress={saveLoss} />

        <Section>{L.profile.myPact}</Section>
        <Hair />
        <LinkRow label={L.profile.guardians} sub={a.guardians.length ? L.profile.guardiansSub(accepted) : L.profile.guardiansNone} onPress={() => go('guardians')} />
        <LinkRow label={L.profile.vow} sub={a.vowSeconds && vowExists(a.vowUri) ? L.profile.vowAdded(a.vowSeconds) : L.profile.vowNone} onPress={() => { if (a.vowSeconds && vowExists(a.vowUri)) shareVow(a.vowUri, L.guardians.shareTitle).then(ok => { if (!ok) flash(L.guardians.shareUnavailable, false); }); else go('vow'); }} />
        <LinkRow label={L.profile.journal} sub={L.profile.journalSub} onPress={() => go('journal')} />
        <LinkRow label={L.profile.calm} sub={L.profile.calmSub} onPress={() => go('calm')} />

        <Section>{L.help.title}</Section>
        <Hair />
        {help.lines.map(h => <LinkRow key={h.tel} label={h.name} sub={h.sub} onPress={() => Linking.openURL(`tel:${h.tel}`)} />)}
        <LinkRow label={`${L.help.emergency} · ${help.emergency}`} sub={L.help.emergencyLong} onPress={() => Linking.openURL(`tel:${help.emergency}`)} />

        <Section>{L.profile.app}</Section>
        <Hair />
        <Row label={L.profile.version} value={Constants.expoConfig?.version ?? '—'} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: c.line }}>
          <T w="s" size={13} color={c.dim}>{L.profile.appearance}</T>
          <View style={{ flexDirection: 'row' }}>
            {(['dark', 'light', 'system'] as const).map(t => (
              <Pressable key={t} onPress={() => a.set({ theme: t })} style={{ marginLeft: 8, borderWidth: 1, borderColor: a.theme === t ? c.fg : c.line, backgroundColor: a.theme === t ? c.fg : 'transparent', paddingHorizontal: 10, paddingVertical: 5 }}>
                <T size={12} color={a.theme === t ? c.ink : c.fg}>{L.profile.themes[t]}</T>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: c.line }}>
          <T w="s" size={13} color={c.dim}>{L.profile.language}</T>
          <View style={{ flexDirection: 'row' }}>
            {LANGS.map(l => (
              <Pressable key={l} onPress={() => { a.set({ lang: l }); srv.setLocale(l).catch(() => {}); }} style={{ marginLeft: 8, borderWidth: 1, borderColor: L === dict(l) ? c.fg : c.line, backgroundColor: L === dict(l) ? c.fg : 'transparent', paddingHorizontal: 10, paddingVertical: 5 }}>
                <T size={12} color={L === dict(l) ? c.ink : c.fg}>{dict(l).langName}</T>
              </Pressable>
            ))}
          </View>
        </View>
        <T w="r" size={11.5} lh={16} color={c.mute} style={{ paddingHorizontal: 16, paddingTop: 10 }}>{H.disclaimer}</T>
        <LinkRow label={L.profile.logout} sub={L.profile.logoutSub} onPress={logout} />
        <LinkRow label={L.profile.delete} sub={L.profile.deleteSub} onPress={del} danger />

        {!!msg && <T w="s" size={12.5} color={msg.ok ? c.fg : c.acc2} style={{ padding: 16 }}>{msg.text}</T>}
        <View style={{ height: 24 }} />
      </Body>
    </Screen>
  );
}
