import React, { useState } from 'react';
import { View, Pressable, Platform, Alert } from 'react-native';
import { useApp } from '../store';
import { useL, fmtDur, type Dict } from '../i18n';
import { useServer } from '../server';
import { Screen, Body, Back, ActionBar, T, Kicker } from '../components/ui';
import { useNow } from './Home';
import { c } from '../theme';
import type { Go } from '../nav';

const confirm = (L: Dict, msg: string, ok: () => void) =>
  Platform.OS === 'web' ? (window.confirm(msg) && ok()) : Alert.alert(L.common.sure, msg, [{ text: L.common.cancel }, { text: L.common.yes, onPress: ok }]);

/** Çıkış: vasi onayları artık gerçek (vasiler kendi telefonlarında onaylar). 2 anahtar + 72 saat. */
export default function Exit({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL();
  const now = useNow(1000);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const u = a.unlock;
  const keys = a.guardians.filter(g => g.status === 'accepted').slice(0, 2);
  const need = u?.need ?? 2;
  const appr = u?.approvals.length ?? 0;
  const readyAt = u?.readyAt ?? 0;
  const waitLeft = u ? Math.max(0, readyAt - now) : 0;
  const ready = !!u && appr >= need && waitLeft === 0;
  // Kabul etmiş vasi yoksa anahtar yerine 7 günlük zaman kilidi (sunucu kuralı)
  const solo = u ? !!u.solo : keys.length === 0;

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); try { await fn(); } catch (e: any) { setErr(e.message); } setBusy(false); };
  const msg = solo ? (!u ? L.exit.soloNone : waitLeft > 0 ? L.exit.soloWaiting(fmtDur(waitLeft, L)) : L.exit.soloReady)
    : !u ? L.exit.msgNone(need)
    : appr >= need ? (waitLeft > 0 ? L.exit.msgWaiting(need, fmtDur(waitLeft, L)) : L.exit.msgReady(need))
    : L.exit.msgPending(appr, need);

  return (
    <Screen>
      <Back onPress={() => go('home')} />
      <Body>
        <T size={36} ls={-1.1} lh={36} style={{ paddingHorizontal: 16 }}>{solo ? L.exit.soloTitle : L.exit.title}</T>
        <T w="r" size={13} lh={19} color={c.dim} style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 }}>{solo ? L.exit.soloBody : L.exit.body}</T>
        {solo && <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, padding: 14 }}>
          <Kicker color={c.acc2}>{L.exit.soloCard}</Kicker>
          <T size={52} ls={-2} style={{ marginTop: 4 }}>{u && waitLeft > 0 ? fmtDur(waitLeft, L) : L.exit.soloDays}</T>
          {!!a.letter && <><Kicker color={c.acc2} style={{ marginTop: 14 }}>{L.crisis.future}</Kicker><T w="s" size={15} lh={21} style={{ marginTop: 4 }}>{a.letter}</T></>}
          <T w="r" size={12} lh={17} color={c.dim} style={{ marginTop: 12 }}>{L.exit.soloAdd}</T>
        </View>}
        {!solo && <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
          {keys.map((g, i) => {
            const ok = !!u?.approvals.includes(g.id);
            return (
              <View key={g.id} style={{ flex: 1, height: 190, padding: 14, justifyContent: 'space-between', borderRightWidth: i < keys.length - 1 ? 1 : 0, borderColor: c.line, backgroundColor: ok ? c.fg : 'transparent' }}>
                <Kicker color={ok ? c.ink : c.fg}>{L.exit.key(i + 1)}</Kicker>
                <T size={52} ls={-2} color={ok ? c.ink : c.fg}>{ok ? '✓' : '○'}</T>
                <View>
                  <T size={20} color={ok ? c.ink : c.fg}>{g.name}</T>
                  <T size={11} ls={0.4} color={ok ? c.ink : c.fg}>{ok ? L.exit.approved : u ? L.exit.waiting : L.exit.noRequest}</T>
                </View>
              </View>
            );
          })}
        </View>}
        <T size={13} style={{ padding: 16 }}>{msg}</T>
        {!!err && <T w="s" size={12} color={c.acc2} style={{ paddingHorizontal: 16 }}>{err}</T>}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => confirm(L, L.exit.deleteConfirm, () => run(srv.deleteAccount))} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: c.line }}>
          <T w="s" size={12} color={c.dim}>{L.exit.deleteLink}</T>
        </Pressable>
        {!u && <ActionBar label={L.exit.start} right="" kind="ghost" height={60} size={16} disabled={busy} onPress={() => confirm(L, solo ? L.exit.soloStartConfirm : L.exit.startConfirm, () => run(srv.requestUnlock))} />}
        {ready && <ActionBar label={L.exit.end} kind="red" height={64} size={16} hoverRed={false} disabled={busy} onPress={() => confirm(L, L.exit.endConfirm, () => run(srv.completeUnlock))} />}
      </Body>
      <ActionBar label={L.exit.stay} disabled={busy} onPress={() => run(async () => { if (u) await srv.cancelUnlock(); go('home'); })} />
    </Screen>
  );
}
