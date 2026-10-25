import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, PermissionsAndroid, Platform, Linking, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Body, Back, ActionBar, T, Kicker, Field, NumRow } from '../components/ui';
import { Pill } from '../components/PaperKit';
import { Rise } from '../components/motion';
import { c, F, pebble, alpha } from '../theme';
import { useL } from '../i18n';
import { useApp } from '../store';
import { Shield, shieldOn } from '../../modules/shield';
import { useShield } from '../useShield';
import type { Go } from '../nav';

const NOTIF = 'android.permission.POST_NOTIFICATIONS' as any;
const Section = ({ children }: { children: string }) => <Kicker color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 26, paddingBottom: 8 }}>{children}</Kicker>;
const Note = ({ children, color = c.dim, bold }: { children: string; color?: string; bold?: boolean }) => <T w={bold ? 's' : 'r'} size={15} lh={21} color={color} style={{ paddingHorizontal: 24 }}>{children}</T>;

/** Kapatma onayı: alttan açılan kâğıt kart (sistem Alert yerine Bahçe dili). Android geri tuşu vazgeçer. */
function ConfirmSheet({ visible, kicker, title, body, yes, no, onYes, onNo }: { visible: boolean; kicker: string; title: string; body: string; yes: string; no: string; onYes: () => void; onNo: () => void }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNo} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: alpha(c.fg, 0.32), justifyContent: 'flex-end', alignItems: 'center' }} onPress={onNo} accessibilityLabel={no}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 430, paddingHorizontal: 12, paddingBottom: Math.max(ins.bottom, 12) + 8 }}>
          <View style={[pebble(140, 'shield-off'), { backgroundColor: c.surf, borderWidth: 2, borderColor: c.clay, paddingVertical: 22, paddingHorizontal: 24 }]} accessibilityViewIsModal accessibilityLiveRegion="polite">
            <Kicker color={c.clay}>{kicker}</Kicker>
            <T size={26} lh={32} style={{ fontFamily: F.d, marginTop: 6 }}>{title}</T>
            <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 10 }}>{body}</T>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <View style={{ flex: 1 }}><Pill label={no} kind="ghost" onPress={onNo} /></View>
              <View style={{ flex: 1 }}><Pill label={yes} kind="crisis" onPress={onYes} /></View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Bahis engeli: telefon içi DNS filtresi (Android). Açma, durum, "her zaman açık" önerisi, adres deneme.
 * Bahçe dili: kâğıt durum kartı (açık = ada çayı, kapalı = kil uyarısı), çakıl düğmeler, numaralı "nasıl çalışır" satırları.
 */
export default function ShieldScreen({ go }: { go: Go }) {
  const L = useL();
  const a = useApp();
  const s = useShield();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [probe, setProbe] = useState('');
  const [probeRes, setProbeRes] = useState<boolean | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  // "Bahis sitesi engellendi" bildirimi için izin (Android 13+). Engel başka yoldan açıldıysa (güncelleme, "her zaman açık") hiç sorulmamış olabilir.
  const needsNotifPerm = Platform.OS === 'android' && Number(Platform.Version) >= 33;
  const [notifOk, setNotifOk] = useState(true);
  useEffect(() => { if (!a.shieldSeen) a.set({ shieldSeen: true }); }, []); // Ana ekrandaki davet şeridi bir kez görülünce kalkar
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
        <Body>
          <View style={{ paddingHorizontal: 24 }}>
            <Kicker color={c.dim}>{L.shield.kicker}</Kicker>
            <T size={36} lh={42} ls={-0.8} style={{ marginTop: 4 }}>{L.shield.title}</T>
            <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 12 }}>{L.shield.unsupported}</T>
          </View>
        </Body>
      </Screen>
    );
  }

  const on = shieldOn(s);
  const off = s.wanted && !on;
  const pact = a.pactStatus === 'active';
  // Şahitlere haber ancak aktif paktta ve daveti kabul etmiş şahit varsa gider; yoksa "haber gidecek" denmez
  const told = pact && a.guardians.some(g => g.status === 'accepted');

  const enable = async () => {
    setBusy(true); setMsg(null);
    try {
      if (!(await Shield!.prepare())) { setMsg(L.shield.denied); return; }
      if (!Shield!.start()) { setMsg(L.shield.failed); return; }
      Shield!.refresh().catch(() => {}); // listeyi arka planda indir
      // "Bahis sitesi engellendi" bildirimi için (Android 13+ izin ister; vermezse engel yine çalışır)
      if (needsNotifPerm) PermissionsAndroid.request(NOTIF).then(r => setNotifOk(r === PermissionsAndroid.RESULTS.GRANTED)).catch(() => {});
    } finally { setBusy(false); }
  };
  const disableNow = () => { setConfirmOff(false); Shield!.stop(); setMsg(null); };
  const offBody = [told ? L.shield.offBody : L.shield.offBodySolo, s.alwaysOn ? L.shield.offBodyAlwaysOn : ''].filter(Boolean).join('\n\n');
  const test = async () => {
    const name = probe.trim().replace(/^https?:\/\//, '').split('/')[0];
    if (!name) return;
    const r = await Shield!.check(name).catch(() => null);
    setProbeRes(!!r);
  };

  return (
    <Screen>
      <Back onPress={() => go('profile')} />
      <Body>
        <Rise y={12}>
          <View style={{ paddingHorizontal: 24, paddingBottom: 14 }}>
            <Kicker color={c.dim}>{L.shield.kicker}</Kicker>
            <T size={36} lh={42} ls={-0.8} style={{ marginTop: 4 }}>{L.shield.title}</T>
            <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 8 }}>{L.shield.intro}</T>
          </View>
        </Rise>

        {/* Durum kartı: açık = ada çayı kenar + sage yıkama; kapalı (kullanıcı istemişken) = kil uyarısı; hiç açılmadı = düz kâğıt */}
        <View accessibilityLiveRegion="polite" style={[pebble(120, 'shield-status'), { marginHorizontal: 16, paddingVertical: 20, paddingHorizontal: 24, backgroundColor: on ? c.sageWash : off ? c.clayWash : c.surf, borderWidth: 2, borderColor: on ? c.act : off ? c.clay : c.edge }]}>
          <Kicker color={on ? c.act : off ? c.clay : c.dim}>{on ? L.shield.statusOn : off ? L.shield.statusOff : L.shield.statusNever}</Kicker>
          <T size={26} lh={32} style={{ fontFamily: F.d, marginTop: 4 }}>{on ? L.shield.cardOn(s.blockedToday) : off ? L.shield.cardOff : L.shield.cardNever}</T>
          <T w="r" size={15} lh={21} color={c.dim} style={{ marginTop: 6 }}>
            {on ? (s.listSize ? L.shield.listReady(s.listSize) : L.shield.listPending) : off ? (told ? L.shield.offNotified : L.shield.offPlain) : L.shield.neverSub}
          </T>
          {s.privateDnsBypass && <T w="s" size={15} lh={21} color={c.clay} style={{ marginTop: 10 }}>{L.shield.privateDns}</T>}
        </View>

        {on && !notifOk && (
          <View style={{ paddingTop: 14 }}>
            <Note>{L.shield.notifBody}</Note>
            <View style={{ alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 10 }}><Pill label={L.shield.notifBtn} kind="ghost" onPress={askNotif} /></View>
          </View>
        )}

        <Section>{L.shield.howTitle}</Section>
        <View style={{ marginHorizontal: 16, borderWidth: 2, borderColor: c.line, borderRadius: 18, overflow: 'hidden', backgroundColor: c.surf }}>
          <NumRow no="01">{L.shield.how1}</NumRow>
          <NumRow no="02">{L.shield.how2}</NumRow>
          <NumRow no="03" last>{told ? L.shield.how3 : pact ? L.shield.how3Solo : L.shield.how3NoPact}</NumRow>
        </View>

        {on && <>
          <Section>{L.shield.alwaysOnTitle}</Section>
          <Note>{s.alwaysOn ? L.shield.alwaysOnDone : L.shield.alwaysOnBody}</Note>
          <View style={{ height: 8 }} />
          <Note color={c.clay} bold>{L.shield.alwaysOnWarn}</Note>
          <View style={{ alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 12 }}><Pill label={L.shield.openSettings} kind="ghost" onPress={() => Shield!.openVpnSettings()} /></View>

          <Section>{L.shield.testTitle}</Section>
          <Field placeholder={L.shield.testPh} value={probe} onChangeText={t => { setProbe(t); setProbeRes(null); }} onSubmitEditing={test} autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="search" />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <Pill label={L.shield.testBtn} kind="ghost" disabled={!probe.trim()} onPress={test} />
            {probeRes !== null && <T w="b" size={16} color={probeRes ? c.act : c.clay} style={{ marginLeft: 14, flexShrink: 1 }} accessibilityLiveRegion="polite">{probeRes ? L.shield.testBlocked : L.shield.testOpen}</T>}
          </View>
          <View style={{ height: 14 }} />
          <Note>{told ? L.shield.otherVpn : L.shield.otherVpnPlain}</Note>
        </>}

        {!!msg && <T w="s" size={15} lh={21} color={c.clay} style={{ paddingHorizontal: 24, paddingTop: 16 }} accessibilityLiveRegion="polite">{msg}</T>}
        <View style={{ flex: 1, minHeight: 24 }} />
      </Body>
      {on
        ? <ActionBar label={L.shield.disable} right="" kind="ghost" height={60} size={18} onPress={() => setConfirmOff(true)} />
        : <ActionBar label={busy ? L.shield.enabling : s.wanted ? L.shield.reenable : L.shield.enable} disabled={busy} height={68} onPress={enable} />}
      <ConfirmSheet visible={confirmOff} kicker={L.shield.kicker} title={L.shield.offTitle} body={offBody} yes={L.shield.offYes} no={L.shield.cancel} onYes={disableNow} onNo={() => setConfirmOff(false)} />
    </Screen>
  );
}
