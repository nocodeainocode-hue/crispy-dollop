import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, Alert, Platform } from 'react-native';
import { api, guardianTokens, ApiError } from '../api';
import { useApp } from '../store';
import { Screen, Body, Back, ActionBar, Field, T, Kicker, Hair } from '../components/ui';
import { c } from '../theme';
import { useL, useH, ago, type Dict } from '../i18n';

const leftFmt = (ms: number, L: Dict) => { const h = Math.max(0, Math.ceil(ms / 3600000)); return L.time.left(Math.floor(h / 24), h >= 24 ? h % 24 : h); };
const ask = (L: Dict, msg: string, ok: () => void) => (Platform.OS === 'web' ? window.confirm(msg) && ok() : Alert.alert(L.common.sure, msg, [{ text: L.common.cancel }, { text: L.common.yes, onPress: ok }]));

export default function GuardianApp() {
  const app = useApp();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { guardianTokens.get().then(t => { setToken(t); setReady(true); }); }, []);
  if (!ready) return <Screen><View /></Screen>;
  if (!token) return <Join onJoined={async t => { await guardianTokens.set(t); setToken(t); }} onBack={() => app.set({ role: 'none' })} />;
  return <Portal token={token} onLogout={async () => { await guardianTokens.del(); setToken(null); app.set({ role: 'none' }); }} />;
}

function Join({ onJoined, onBack }: { onJoined: (t: string) => void; onBack: () => void }) {
  const L = useL(), H = useH();
  const [code, setCode] = useState('');
  const [info, setInfo] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);
  const enc = encodeURIComponent(code.trim());

  const look = async () => { setBusy(true); setErr(''); try { setInfo(await api(`/public/invites/${enc}`)); } catch (e: any) { setErr(e.message); } setBusy(false); };
  const accept = async () => { setBusy(true); setErr(''); try { const r = await api(`/public/invites/${enc}/accept`, { method: 'POST', body: {} }); onJoined(r.token); } catch (e: any) { setErr(e.message); setBusy(false); } };
  const decline = async () => { setBusy(true); try { await api(`/public/invites/${enc}/decline`, { method: 'POST', body: {} }); setDeclined(true); } catch (e: any) { setErr(e.message); } setBusy(false); };

  return (
    <Screen>
      <Back onPress={info ? () => setInfo(null) : onBack} />
      <Body>
        {!info && !declined && <>
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <Kicker color={c.acc2}>{L.guardian.joinKicker}</Kicker>
            <T size={36} ls={-1.1} lh={38} style={{ marginTop: 6 }}>{L.guardian.joinTitle}</T>
            <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 10 }}>{L.guardian.joinBody}</T>
          </View>
          <Field placeholder="ABCDE-FGHJK" autoCapitalize="characters" autoCorrect={false} value={code} onChangeText={setCode} />
          {!!err && <T w="s" size={12} color={c.acc2} style={{ paddingHorizontal: 16 }}>{err}</T>}
        </>}
        {info && !declined && <>
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <Kicker color={c.acc2}>{L.guardian.inviteKicker}</Kicker>
            <T size={32} ls={-1} lh={34} style={{ marginTop: 6 }}>{L.guardian.inviteTitle(info.owner)}</T>
            <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 10 }}>{info.hideHabit ? L.guardian.inviteIntroHidden(info.goalDays, info.guardianName) : L.guardian.inviteIntro(info.habitLabel, info.goalDays, info.guardianName)}</T>
          </View>
          <Hair />
          {[info.hideHabit ? L.guardian.relapseInfoHidden : H.guardianRelapseInfo, L.guardian.bulletKey, L.guardian.bulletVideo(info.owner), L.guardian.bulletFree].map((t, i) => (
            <View key={i} style={{ paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderColor: c.line }}><T w="r" size={13} lh={18}>• {t}</T></View>
          ))}
          {!!err && <T w="s" size={12} color={c.acc2} style={{ padding: 16 }}>{err}</T>}
        </>}
        {declined && <View style={{ paddingHorizontal: 16 }}><T size={36} ls={-1}>{L.guardian.declinedTitle}</T><T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 10 }}>{L.guardian.declinedBody(info?.owner ?? '')}</T></View>}
        <View style={{ flex: 1, minHeight: 16 }} />
      </Body>
      {!info && !declined && <ActionBar label={busy ? L.guardian.searching : L.common.continue} disabled={busy || code.replace(/[^0-9a-z]/gi, '').length < 10} onPress={look} />}
      {info && !declined && info.status !== 'declined' && <>
        {info.status !== 'accepted' && <ActionBar label={L.guardian.decline} right="" kind="ghost" height={56} size={15} disabled={busy} onPress={decline} />}
        <ActionBar label={info.status === 'accepted' ? L.guardian.enterPortal : L.guardian.become} disabled={busy} onPress={accept} />
      </>}
      {declined && <ActionBar label={L.guardian.back} onPress={onBack} />}
    </Screen>
  );
}

function Portal({ token, onLogout }: { token: string; onLogout: () => void }) {
  const L = useL(), H = useH();
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try { setMe(await api('/guardian/me', { token })); setErr(''); }
    catch (e: any) { setErr(e.message); if (e instanceof ApiError && e.status === 401) onLogout(); }
  }, [token]);
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);
  const act = async (path: string, body: object = {}) => { try { await api(path, { token, method: 'POST', body }); await load(); } catch (e: any) { setErr(e.message); } };

  if (!me) return <Screen><View style={{ padding: 16 }}>{err ? <T w="s" color={c.acc2}>{err}</T> : <T w="r" color={c.dim}>{L.common.loading}</T>}</View></Screen>;
  const u = me.unlock, sh = me.shield;

  return (
    <Screen>
      <Body>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 }}>
          <Kicker color={c.acc2}>{L.guardian.kGuardian(me.guardian.name)}</Kicker>
          <T size={36} ls={-1.1} lh={38} style={{ marginTop: 6 }}>{me.owner}</T>
          <T w="r" size={13} color={c.dim}>{me.pact.hideHabit ? L.guardian.goalHidden : me.pact.habitLabel}</T>
        </View>
        {!!err && <T w="s" size={12} color={c.acc2} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{err}</T>}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
          <View style={{ flex: 1, padding: 14, borderRightWidth: 1, borderColor: c.line }}><Kicker>{L.guardian.day}</Kicker><T size={36} ls={-1.5}>{me.pact.day}<T size={16} color={c.mute}> /{me.pact.goalDays}</T></T>{!!me.lastRelapse && <T w="r" size={11.5} color={c.dim}>{L.guardian.streak(me.streakDays)}</T>}</View>
          <View style={{ flex: 1, padding: 14 }}><Kicker>{L.guardian.lastCheck}</Kicker><T size={17} style={{ marginTop: 6 }}>{ago(me.lastCheckIn, L)}</T><T w="r" size={11.5} color={c.dim}>{L.guardian.status[me.pact.status] ?? me.pact.status}</T></View>
        </View>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: c.line }}>
          {/* Bahis engeli (v2): yalnızca cihazdan sinyal geliyorsa gösterilir; v1'de bu kutu yok. */}
          {sh && sh.shield !== 'unknown' && (
            <View style={{ flex: 1, padding: 14, borderRightWidth: 1, borderColor: c.line }}>
              <Kicker>{me.pact.hideHabit ? L.guardian.shieldHidden : H.guardianShield}</Kicker>
              <T size={17} color={sh.shield === 'off' ? c.acc2 : c.fg} style={{ marginTop: 6 }}>{sh.shield === 'on' ? L.guardian.on : L.guardian.off}</T>
              <T w="r" size={11.5} color={c.dim}>{L.guardian.signal(ago(sh.lastSeen, L))}</T>
            </View>
          )}
          <View style={{ flex: 1, padding: 14, borderRightWidth: sh && sh.shield !== 'unknown' ? 0 : 1, borderColor: c.line }}>
            <Kicker>{L.guardian.appSignal}</Kicker>
            <T size={17} style={{ marginTop: 6 }}>{sh ? ago(sh.lastSeen, L) : L.guardian.none}</T>
            <T w="r" size={11.5} color={c.dim}>{L.guardian.signalNote}</T>
          </View>
          <View style={{ flex: 1, padding: 14 }}><Kicker>{me.pact.hideHabit ? L.guardian.lastSetback : H.guardianLastRelapse}</Kicker><T size={17} style={{ marginTop: 6 }}>{me.lastRelapse ? ago(me.lastRelapse, L) : L.guardian.none}</T>{!!me.lastCrisis && <T w="r" size={11.5} color={c.dim}>{L.guardian.lastCrisis(ago(me.lastCrisis, L))}</T>}</View>
        </View>

        {u && <View style={{ padding: 16, borderBottomWidth: 1, borderColor: c.acc }}>
          <Kicker color={c.acc2}>{L.guardian.unlockKicker}</Kicker>
          <T size={22} ls={-0.5} lh={26} style={{ marginTop: 6 }}>{L.guardian.unlockTitle(me.owner)}</T>
          <T w="r" size={12.5} lh={18} color={c.dim} style={{ marginTop: 6 }}>{L.guardian.unlockBody(u.approvals, u.need, u.readyAt > Date.now() ? leftFmt(u.readyAt - Date.now(), L) : L.guardian.waitDone)}</T>
          {u.iApproved
            ? <ActionBar label={L.guardian.withdraw} right="" kind="ghost" height={56} size={15} onPress={() => act('/guardian/unlock/withdraw')} />
            : <ActionBar label={L.guardian.useKey} kind="red" height={64} size={17} hoverRed={false} onPress={() => ask(L, L.guardian.approveConfirm, () => act('/guardian/unlock/approve'))} />}
        </View>}

        <View style={{ paddingTop: 14 }}>
          <Field label={L.guardian.supportLabel} multiline maxLength={280} placeholder={L.guardian.supportPh} value={msg} onChangeText={t => { setMsg(t); setSent(false); }} style={{ minHeight: 80 }} />
          <ActionBar label={sent ? L.guardian.sent : L.guardian.send} right="" kind="ghost" height={52} size={15} disabled={!msg.trim() || sent}
            onPress={async () => { await act('/guardian/support', { text: msg }); setSent(true); setMsg(''); }} />
        </View>
        <View style={{ flex: 1, minHeight: 12 }} />
        <Pressable onPress={() => ask(L, L.guardian.logoutConfirm, onLogout)} style={{ padding: 16, borderTopWidth: 1, borderColor: c.line }}><T w="s" size={12} color={c.dim}>{L.guardian.logout}</T></Pressable>
      </Body>
    </Screen>
  );
}
