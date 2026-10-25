import React, { useEffect, useState } from 'react';
import { View, Pressable, Platform, Alert } from 'react-native';
import { useApp } from '../store';
import { useL, fmtDur, type Dict } from '../i18n';
import { useServer } from '../server';
import { Screen, Body, Back, ActionBar, T, Kicker } from '../components/ui';
import HelpRow from '../crisisart/HelpRow';
import { GIcon } from '../art/misc';
import { c, pebble } from '../theme';
import type { Go } from '../nav';

const confirm = (L: Dict, msg: string, ok: () => void) =>
  Platform.OS === 'web' ? (window.confirm(msg) && ok()) : Alert.alert(L.common.sure, msg, [{ text: L.common.cancel }, { text: L.common.yes, onPress: ok }]);

/** Saniyelik saat (Home'a bağlı kalmasın diye burada yerel). */
function useTick(step = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), step); return () => clearInterval(t); }, [step]);
  return n;
}

/**
 * Çıkış: iki anahtar (şahit onayı) + 72 saat bekleme; şahit yoksa 7 günlük zaman kilidi (sunucu kuralı). Sakin ve sade anlatım.
 * Sunucu çağrıları ve durum mantığı aynı; birincil eylem "Kalıyorum".
 */
export default function Exit({ go }: { go: Go }) {
  const a = useApp();
  const srv = useServer();
  const L = useL();
  const now = useTick(1000);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [why, setWhy] = useState(false);
  const u = a.unlock;
  const keys = a.guardians.filter(g => g.status === 'accepted').slice(0, 2);
  const need = u?.need ?? 2;
  const appr = u?.approvals.length ?? 0;
  const readyAt = u?.readyAt ?? 0;
  const waitLeft = u ? Math.max(0, readyAt - now) : 0;
  const ready = !!u && appr >= need && waitLeft === 0;
  // Kabul etmiş şahit yoksa anahtar yerine 7 günlük zaman kilidi (sunucu kuralı)
  const solo = u ? !!u.solo : keys.length === 0;

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); try { await fn(); } catch (e: any) { setErr(e.message); } setBusy(false); };
  const msg = solo ? (!u ? L.exit.soloNone : waitLeft > 0 ? L.exit.soloWaiting(fmtDur(waitLeft, L)) : L.exit.soloReady)
    : !u ? L.exit.msgNone(need)
    : appr >= need ? (waitLeft > 0 ? L.exit.msgWaiting(need, fmtDur(waitLeft, L)) : L.exit.msgReady(need))
    : L.exit.msgPending(appr, need);
  const counting = !solo && !!u && appr >= need && waitLeft > 0;

  return (
    <Screen>
      <Back onPress={() => go('home')} />
      <Body>
        <T size={40} ls={-0.8} lh={46} style={{ paddingHorizontal: 16 }}>{solo ? L.exit.soloTitle : L.exit.title}</T>
        <T w="s" size={18} lh={26} style={{ paddingHorizontal: 16, paddingTop: 8 }}>{solo ? L.exit.soloBody : L.exit.body}</T>
        <Pressable onPress={() => setWhy(!why)} accessibilityRole="button" accessibilityState={{ expanded: why }} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 }}>
          <T w="b" size={16} color={c.act}>{L.exit.why}</T>
        </Pressable>
        {why && <T w="r" size={15} lh={22} color={c.dim} style={{ paddingHorizontal: 16, paddingBottom: 6 }}>{L.exit.whyBody}</T>}

        {solo && (
          <View style={[pebble(150, 'solo'), { marginHorizontal: 16, marginTop: 8, padding: 18, backgroundColor: c.surf, borderWidth: 2, borderColor: c.edge }]}>
            <Kicker color={c.dim}>{L.exit.soloCard}</Kicker>
            <T size={56} ls={-1} lh={64} maxFontSizeMultiplier={1.1} style={{ marginTop: 2 }}>{u && waitLeft > 0 ? fmtDur(waitLeft, L) : L.exit.soloDays}</T>
            {!!a.letter && <T w="s" size={16} lh={23} style={{ marginTop: 10 }}>{a.letter}</T>}
            <T w="r" size={15} lh={21} color={c.dim} style={{ marginTop: 12 }}>{L.exit.soloAdd}</T>
          </View>
        )}

        {!solo && (
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8 }}>
            {keys.map((g, i) => {
              const ok = !!u?.approvals.includes(g.id);
              return (
                <View key={g.id} style={[pebble(150, g.id), { flex: 1, minHeight: 150, padding: 14, justifyContent: 'space-between', backgroundColor: ok ? c.sageWash : c.surf, borderWidth: 2, borderColor: ok ? c.act : c.edge, transform: [{ rotate: `${i % 2 ? 1 : -1}deg` }] }]}>
                  <Kicker color={c.dim}>{L.exit.key(i + 1)}</Kicker>
                  <View style={{ height: 34, justifyContent: 'center' }}>
                    {ok ? <GIcon name="check" size={32} color={c.act} strokeWidth={3} /> : <View style={{ width: 26, height: 20, borderWidth: 2.4, borderColor: c.edge, borderStyle: 'dashed', borderRadius: 10 }} />}
                  </View>
                  <View>
                    <T w="b" size={20} lh={24} numberOfLines={1}>{g.name}</T>
                    <T w="s" size={14} lh={18} color={c.dim}>{ok ? L.exit.approved : u ? L.exit.waiting : L.exit.noRequest}</T>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!solo && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Kicker color={c.dim}>{L.exit.wait}</Kicker>
            <T size={56} ls={-1} lh={64} maxFontSizeMultiplier={1.1} style={{ marginTop: 2 }}>{counting ? fmtDur(waitLeft, L) : L.exit.hours72}</T>
          </View>
        )}
        <T w="s" size={16} lh={23} style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>{msg}</T>
        {!!err && <T w="s" size={15} lh={21} color={c.clay} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{err}</T>}

        <HelpRow style={{ marginBottom: 8 }} />
        {!u && <ActionBar label={L.exit.start} right="" kind="ghost" height={60} size={19} disabled={busy} onPress={() => confirm(L, solo ? L.exit.soloStartConfirm : L.exit.startConfirm, () => run(srv.requestUnlock))} />}
        {ready && <ActionBar label={L.exit.end} right="" kind="red" height={64} size={19} disabled={busy} onPress={() => confirm(L, L.exit.endConfirm, () => run(srv.completeUnlock))} />}

        {/* hesap silme: ayrı bölüm */}
        <View style={{ flex: 1, minHeight: 12 }} />
        <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 12, paddingTop: 12, borderTopWidth: 2, borderColor: c.line }}>
          <Kicker color={c.dim}>{L.exit.accountKicker}</Kicker>
          <Pressable onPress={() => confirm(L, L.exit.deleteConfirm, () => run(srv.deleteAccount))} accessibilityRole="button" style={{ minHeight: 52, justifyContent: 'center' }}>
            <T w="s" size={16} lh={22} color={c.clay}>{L.exit.deleteLink}</T>
          </Pressable>
        </View>
      </Body>
      <ActionBar label={L.exit.stay} right="" disabled={busy} onPress={() => run(async () => { if (u) await srv.cancelUnlock(); go('home'); })} />
    </Screen>
  );
}
