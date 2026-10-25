import React, { useState } from 'react';
import { View, Pressable, Linking, Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { useApp } from '../store';
import { useServer } from '../server';
import { Screen, Body, Back, Field, T, Kicker } from '../components/ui';
import { Rise } from '../components/motion';
import { Pill, Chev, Tick } from '../components/PaperKit';
import { c, F, pebble } from '../theme';
import type { Go } from '../nav';
import { useL, useH, useHelp, currencySymbol, LANGS, dict, type Dict } from '../i18n';
import { shareVow, vowExists } from '../vowStore';

const DAY = 86400000;
const confirm = (L: Dict, msg: string, ok: () => void) =>
  Platform.OS === 'web' ? (window.confirm(msg) && ok()) : Alert.alert(L.common.sure, msg, [{ text: L.common.cancel }, { text: L.common.yes, onPress: ok }]);

// Çakıl satırlar: kâğıt zemin, kusurlu yuvarlak köşe. Bilgi satırı dekoratif kenar (line), dokunulan satır arayüz kenarı (edge, >= 3:1).
const Row = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <View style={[pebble(56, label), { marginHorizontal: 16, marginVertical: 4, minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 22, backgroundColor: c.surf, borderWidth: 2, borderColor: c.line }]}>
    <T w="s" size={15} color={c.dim}>{label}</T>
    <T w="b" size={16} color={accent ? c.acc2 : c.fg} style={{ flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>{value}</T>
  </View>
);
const LinkRow = ({ label, sub, onPress, danger }: { label: string; sub?: string; onPress: () => void; danger?: boolean }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={sub ? `${label}. ${sub}` : label}>
    <View style={[pebble(64, label), { marginHorizontal: 16, marginVertical: 4, minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 22, paddingRight: 20, backgroundColor: c.surf, borderWidth: 2, borderColor: danger ? c.clay : c.edge }]}>
      <View style={{ flex: 1 }}>
        <T w="b" size={16} lh={22} color={danger ? c.clay : c.fg}>{label}</T>
        {!!sub && <T w="r" size={14} lh={19} color={c.dim} style={{ marginTop: 1 }}>{sub}</T>}
      </View>
      <Chev color={danger ? c.clay : c.dim} />
    </View>
  </Pressable>
);
const Section = ({ children }: { children: string }) => <Kicker color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 10 }}>{children}</Kicker>;

/** Yan yana seçenek hapı (Gece/Gündüz/Sistem, dil). Seçili: ada çayı kenar + sageWash + onay işareti. >= 48 dp. */
function Seg<K extends string>({ label, options, value, onPick }: { label: string; options: { key: K; text: string }[]; value: K | null | undefined; onPick: (k: K) => void }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <T w="s" size={15} color={c.dim} style={{ paddingHorizontal: 8, marginBottom: 8 }}>{label}</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map(o => {
          const on = value === o.key;
          return (
            <Pressable key={o.key} onPress={() => onPick(o.key)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.text} style={{ flex: 1 }}>
              <View style={[pebble(52, o.key), { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 2, borderColor: on ? c.act : c.edge, backgroundColor: on ? c.sageWash : c.surf }]}>
                {on && <View style={{ marginRight: 8 }}><Tick size={12} /></View>}
                <T w="b" size={15} color={c.fg} numberOfLines={1}>{o.text}</T>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Profil: paket, kalan gün, hesap ve ayarlar. Yalnızca gerçekten çalışan ayarlar vardır. */
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

  const streak = Math.max(1, Math.min(day, Math.floor((Date.now() - (a.streakStartedAt || a.startedAt)) / DAY) + 1));
  const pct = Math.max(0, Math.min(100, (day / Math.max(1, a.goalDays)) * 100));

  return (
    <Screen>
      <Back onPress={() => go('home')} />
      <Body>
        <Rise y={12}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 18 }}>
            <View style={[pebble(64, a.name || 'q'), { width: 64, height: 64, backgroundColor: c.sageWash, borderWidth: 2, borderColor: c.edge, alignItems: 'center', justifyContent: 'center' }]}>
              <T size={32} lh={38} color={c.fg} style={{ fontFamily: F.d }}>{initial}</T>
            </View>
            <View style={{ marginLeft: 16, flex: 1 }}>
              <T size={28} lh={34} ls={-0.5}>{a.name || L.profile.noName}</T>
              <T w="r" size={15} lh={20} color={c.dim} style={{ marginTop: 2 }}>{a.email || L.profile.noEmail}</T>
            </View>
          </View>
        </Rise>

        {/* Paket kartı: bitki gibi büyüyen ilerleme çubuğu, geçen ve kalan gün. */}
        <View style={[pebble(120, 'member'), { marginHorizontal: 16, paddingVertical: 20, paddingHorizontal: 24, backgroundColor: c.surf, borderWidth: 2, borderColor: c.line }]}>
          <Kicker color={c.dim}>{L.profile.membership}</Kicker>
          <T size={26} lh={32} style={{ fontFamily: F.d, marginTop: 4 }}>{planName}</T>
          <View style={{ height: 12, borderRadius: 6, backgroundColor: c.sageWash, marginTop: 14, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: 12, borderRadius: 6, backgroundColor: c.act }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <T w="b" size={16} color={c.fg}>{`${L.profile.day} ${day} / ${a.goalDays}`}</T>
            <T w="s" size={15} color={c.dim}>{completed ? L.profile.expired : L.profile.leftDays(left)}</T>
          </View>
        </View>
        <View style={{ height: 8 }} />
        <Row label={L.profile.streak} value={L.profile.streakDays(streak)} />
        <Row label={L.profile.start} value={new Date(a.startedAt).toLocaleDateString(L.locale)} />
        <LinkRow label={pack && !completed ? L.profile.myPack : completed ? L.profile.pickContinue : L.profile.continueWithPack} sub={pack ? L.profile.subPack : L.profile.subNoPack} onPress={() => go('plan')} />

        <Section>{L.profile.myPact}</Section>
        <LinkRow label={L.profile.guardians} sub={a.guardians.length ? L.profile.guardiansSub(accepted) : L.profile.guardiansNone} onPress={() => go('guardians')} />
        <LinkRow label={L.profile.vow} sub={a.vowSeconds && vowExists(a.vowUri) ? L.profile.vowAdded(a.vowSeconds) : L.profile.vowNone} onPress={() => { if (a.vowSeconds && vowExists(a.vowUri)) shareVow(a.vowUri, L.guardians.shareTitle).then(ok => { if (!ok) flash(L.guardians.shareUnavailable, false); }); else go('vow'); }} />
        <LinkRow label={L.profile.journal} onPress={() => go('journal')} />
        <LinkRow label={L.profile.calm} onPress={() => go('calm')} />

        <Section>{L.profile.account}</Section>
        <Field label={L.profile.nameLabel} placeholder={L.profile.namePh} value={name} onChangeText={setName} />
        <T w="r" size={14} lh={19} color={c.dim} style={{ paddingHorizontal: 24, marginTop: -2, marginBottom: 10 }}>{L.profile.nameNote}</T>
        <View style={{ paddingHorizontal: 16, alignItems: 'flex-start' }}>
          <Pill label={L.profile.saveName} kind="ghost" disabled={busy || name.trim().length < 2 || name.trim() === a.name} onPress={saveName} />
        </View>
        <View style={{ height: 18 }} />
        <Field label={L.profile.lossLabel(currencySymbol(L))} placeholder={L.profile.lossPh} keyboardType="numeric" value={loss} onChangeText={setLoss} />
        <T w="r" size={14} lh={19} color={c.dim} style={{ paddingHorizontal: 24, marginTop: -2, marginBottom: 10 }}>{L.profile.lossNote}</T>
        <View style={{ paddingHorizontal: 16, alignItems: 'flex-start' }}>
          <Pill label={L.profile.saveLoss} kind="ghost" disabled={(Number(loss) || 0) === a.monthlyLoss} onPress={saveLoss} />
        </View>

        <Section>{L.help.title}</Section>
        {help.lines.map(h => <LinkRow key={h.tel} label={h.name} sub={h.sub} onPress={() => Linking.openURL(`tel:${h.tel}`)} />)}
        <LinkRow label={`${L.help.emergency} · ${help.emergency}`} sub={L.help.emergencyLong} onPress={() => Linking.openURL(`tel:${help.emergency}`)} />

        <Section>{L.profile.app}</Section>
        <Row label={L.profile.version} value={Constants.expoConfig?.version ?? '—'} />
        <Seg label={L.profile.appearance} value={a.theme} onPick={t => a.set({ theme: t })}
          options={(['system', 'light', 'dark'] as const).map(t => ({ key: t, text: L.profile.themes[t] }))} />
        <Seg label={L.profile.language} value={LANGS.find(l => L === dict(l)) ?? null} onPick={l => { a.set({ lang: l }); srv.setLocale(l).catch(() => {}); }}
          options={LANGS.map(l => ({ key: l, text: dict(l).langName }))} />
        <T w="r" size={13} lh={19} color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6 }}>{H.disclaimer}</T>

        <View style={{ height: 14 }} />
        <LinkRow label={L.profile.logout} sub={L.profile.logoutSub} onPress={logout} />
        <View style={{ height: 24 }} />
        <LinkRow label={L.profile.delete} sub={L.profile.deleteSub} onPress={del} danger />
        <View style={{ height: 28 }} />
      </Body>
      {!!msg && (
        <View accessibilityLiveRegion="polite" style={[pebble(56, 'toast'), { marginHorizontal: 16, marginBottom: 10, paddingVertical: 12, paddingHorizontal: 22, backgroundColor: msg.ok ? c.fg : c.clayWash }]}>
          <T w="s" size={15} lh={21} color={msg.ok ? c.bg : c.fg}>{msg.text}</T>
        </View>
      )}
    </Screen>
  );
}
