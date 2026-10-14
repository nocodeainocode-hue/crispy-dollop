import React, { useEffect, useState } from 'react';
import { View, Pressable, Alert, PermissionsAndroid, Platform, Linking, AppState } from 'react-native';
import { Screen, Body, Back, ActionBar, NumRow, T, Kicker, Hair, Field } from '../components/ui';
import { Rise } from '../components/motion';
import { c } from '../theme';
import { useL } from '../i18n';
import { useApp } from '../store';
import { Shield } from '../../modules/shield';
import { useShield } from '../useShield';
import type { Go } from '../nav';

const NOTIF = 'android.permission.POST_NOTIFICATIONS' as any;

/** Bahis engeli: telefon içi DNS filtresi (Android). Açma, durum, "her zaman açık" önerisi, adres deneme. */
export default function ShieldScreen({ go }: { go: Go }) {
  const L = useL();
  const a = useApp();
  const s = useShield();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [probe, setProbe] = useState('');
  const [probeRes, setProbeRes] = useState<string | null>(null);
  // "Bahis sitesi engellendi" bildirimi için izin (Android 13+). Engel başka yoldan açıldıysa (güncelleme, "her zaman açık") hiç sorulmamış olabilir.
  const needsNotifPerm = Platform.OS === 'android' && Number(Platform.Version) >= 33;
  const [notifOk, setNotifOk] = useState(true);
  useEffect(() => {
    if (!needsNotifPerm) return;
    const check = () => PermissionsAndroid.check(NOTIF).then(setNotifOk).catch(() => {});
    check();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') check(); });
    return () => sub.remove();
  }, []);
  const askNotif = async () => {
    const r = await PermissionsAndroid.request(NOTIF).catch(() => null);
    if (r === PermissionsAndroid.RESULTS.GRANTED) setNotifOk(true);
    else if (r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) Linking.openSettings();
  };

  if (!Shield || !s) {
    return (
      <Screen>
        <Back onPress={() => go('profile')} />
        <Body><View style={{ padding: 16 }}><Kicker color={c.acc2}>{L.shield.kicker}</Kicker><T w="r" size={14} lh={20} color={c.dim} style={{ marginTop: 10 }}>{L.shield.unsupported}</T></View></Body>
      </Screen>
    );
  }

  const on = s.running && !s.privateDnsBypass;
  const enable = async () => {
    setBusy(true); setMsg(null);
    try {
      if (!(await Shield!.prepare())) { setMsg({ text: L.shield.denied, ok: false }); return; }
      if (!Shield!.start()) { setMsg({ text: L.shield.denied, ok: false }); return; }
      Shield!.refresh().catch(() => {}); // listeyi arka planda indir
      // "Bahis sitesi engellendi" bildirimi için (Android 13+ izin ister; vermezse engel yine çalışır)
      if (needsNotifPerm) PermissionsAndroid.request(NOTIF).then(r => setNotifOk(r === PermissionsAndroid.RESULTS.GRANTED)).catch(() => {});
    } finally { setBusy(false); }
  };
  const disable = () => {
    const doIt = () => { Shield!.stop(); setMsg(null); };
    if (a.pactStatus === 'active') Alert.alert(L.shield.offTitle, L.shield.offBody, [{ text: L.shield.cancel, style: 'cancel' }, { text: L.shield.offYes, style: 'destructive', onPress: doIt }]);
    else doIt();
  };
  const test = async () => {
    const name = probe.trim();
    if (!name) return;
    const r = await Shield!.check(name).catch(() => null);
    setProbeRes(r ? L.shield.testBlocked : L.shield.testOpen);
  };

  return (
    <Screen>
      <Back onPress={() => go('profile')} />
      <Body>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Kicker color={c.acc2}>{L.shield.kicker}</Kicker>
          <Rise y={12}><T size={44} ls={-1.6} lh={44} style={{ marginTop: 6 }}>{L.shield.title}</T></Rise>
          <T w="r" size={13.5} lh={20} color={c.dim} style={{ marginTop: 10 }}>{L.shield.intro}</T>
        </View>

        {/* Durum */}
        <View style={{ marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: on ? c.line : 'rgba(236,48,19,0.45)', backgroundColor: on ? c.tint(0.03) : 'rgba(236,48,19,0.07)', padding: 14 }}>
          <Kicker color={on ? c.fg : c.acc2}>{on ? L.shield.statusOn : s.wanted ? L.shield.statusOff : L.shield.statusNever}</Kicker>
          {on && <T w="r" size={13} color={c.dim} style={{ marginTop: 6 }}>{L.shield.blockedToday(s.blockedToday)}</T>}
          {s.wanted && !s.running && <T w="r" size={12.5} lh={18} color={c.dim} style={{ marginTop: 6 }}>{a.pactStatus === 'active' ? L.shield.offNotified : L.shield.offPlain}</T>}
          {s.privateDnsBypass && <T w="s" size={12.5} lh={18} color={c.acc2} style={{ marginTop: 8 }}>{L.shield.privateDns}</T>}
        </View>
        {on && !notifOk && (
          <Pressable onPress={askNotif} style={{ marginHorizontal: 16, marginBottom: 14, paddingVertical: 10 }}>
            <T w="r" size={12.5} lh={18} color={c.dim}>{L.shield.notifBody}</T>
            <T w="s" size={13} color={c.acc2} style={{ marginTop: 6 }}>{L.shield.notifBtn} →</T>
          </Pressable>
        )}

        <Hair />
        <NumRow no="01">{L.shield.how1}</NumRow>
        <NumRow no="02">{L.shield.how2(s.listSize)}</NumRow>
        <NumRow no="03" last>{a.pactStatus === 'active' ? L.shield.how3 : L.shield.how3NoPact}</NumRow>
        <Hair />

        {on && <>
          <Kicker color={c.dim} style={{ padding: 16, paddingBottom: 6 }}>{L.shield.alwaysOnTitle}</Kicker>
          <T w="r" size={12.5} lh={18} color={c.dim} style={{ paddingHorizontal: 16 }}>{L.shield.alwaysOnBody}</T>
          <Pressable onPress={() => Shield!.openVpnSettings()} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <T w="s" size={13} color={c.acc2}>{L.shield.openSettings} →</T>
          </Pressable>
          <Hair />
          <Kicker color={c.dim} style={{ padding: 16, paddingBottom: 8 }}>{L.shield.testTitle}</Kicker>
          <Field placeholder={L.shield.testPh} value={probe} onChangeText={t => { setProbe(t); setProbeRes(null); }} onSubmitEditing={test} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          <Pressable onPress={test} style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <T w="s" size={13} color={probeRes === L.shield.testBlocked ? c.fg : c.acc2}>{probeRes ?? L.shield.testBtn}</T>
          </Pressable>
          <T w="r" size={11.5} lh={16} color={c.mute} style={{ paddingHorizontal: 16, paddingBottom: 6 }}>{L.shield.otherVpn}</T>
        </>}
        {!on && !s.wanted && <T w="r" size={12} lh={17} color={c.mute} style={{ padding: 16 }}>{L.shield.consentNote}</T>}
        {!!msg && <T w="s" size={12.5} color={msg.ok ? c.fg : c.acc2} style={{ padding: 16 }}>{msg.text}</T>}
        <View style={{ flex: 1, minHeight: 16 }} />
      </Body>
      {on
        ? <ActionBar label={L.shield.disable} right="" kind="ghost" height={52} size={14} onPress={disable} />
        : <ActionBar label={busy ? L.shield.enabling : s.wanted ? L.shield.reenable : L.shield.enable} disabled={busy} onPress={enable} />}
    </Screen>
  );
}
