import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, Alert, Platform, ScrollView, Text, Animated, useWindowDimensions } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { api, guardianTokens, ApiError } from '../api';
import { useApp } from '../store';
import { Screen, Body, Back, ActionBar, Field, T, Kicker } from '../components/ui';
import { Rise } from '../components/motion';
import { ArchWindow, Sway, WaterDrop, BrandMark, GIcon, isReduced } from '../art/misc';
import type { IconName } from '../art/misc';
import { TulipGlyph, useTulipBloom } from '../art/plant';
import { TULIP_H } from '../art/plant/paths';
import { c, F, pebble } from '../theme';
import { useL, useH, ago, type Dict } from '../i18n';

const leftFmt = (ms: number, L: Dict) => { const h = Math.max(0, Math.ceil(ms / 3600000)); return L.time.left(Math.floor(h / 24), h >= 24 ? h % 24 : h); };
const ask = (L: Dict, msg: string, ok: () => void) => (Platform.OS === 'web' ? window.confirm(msg) && ok() : Alert.alert(L.common.sure, msg, [{ text: L.common.cancel }, { text: L.common.yes, onPress: ok }]));

// Şahit tarafı "su" dünyasıdır: c.water / c.waterWash / c.onWater, ActionBar kind="water". Metin renkleri token çiftlerinden gelir.

/** Eğik kâğıt kart: hafif döndürülmüş, altında sert kâğıt gölgesi, kusurlu yuvarlak köşe. */
function Card({ children, tone = 'surf', tilt = 0, seed }: { children: React.ReactNode; tone?: 'surf' | 'clayWash'; tilt?: number; seed: string }) {
  const shape = pebble(44, seed);
  return (
    <View style={{ marginHorizontal: 16, marginVertical: 8, transform: [{ rotate: `${tilt}deg` }] }}>
      <View style={[shape, { position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, backgroundColor: c.shadow }]} />
      <View style={[shape, { backgroundColor: c[tone], borderWidth: 2, borderColor: c.line, paddingVertical: 14, paddingHorizontal: 18 }]}>{children}</View>
    </View>
  );
}

/** Davet maddesi: tuval çizgi simgesi (su rengi) + metin. Simge süstür, ekran okuyucudan gizli. */
const Bullet = ({ icon, text }: { icon: IconName; text: string }) => (
  <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: 26, alignItems: 'center', marginRight: 12 }}>
      <GIcon name={icon} size={24} color={c.water} />
    </View>
    <T w="r" size={16} lh={24} style={{ flex: 1 }}>{text}</T>
  </View>
);

// --- Kemer pencere (şahit portalı) ---
// Pencere 342x252 tuval ölçüsünde çizilir; dar telefonlarda (örn. 360 dp) bir kerede ölçeklenir. İçinde YALNIZCA gün sayısı ve lale
// vardır: sunucu şahide gün gün durum vermez; yaprak/boşluk/kıvrık çizmek ifşa olurdu. Lale sayısı = floor(gün / 7).
const WIN_W = 342, WIN_H = 252;
const STEM_EXTRA = [0, 6, 2, 8];   // sap boyu farkı (deterministik; her lale aynı boyda olmasın)

const AG = Animated.createAnimatedComponent(G);
/** Lale + sap (28 x (38 + sap) yerel uzay). `bloom` verilirse tomurcuktan açılır (kütüphane hareketi); verilmezse durağan. */
function TulipSvg({ i, tw, bloom }: { i: number; tw: number; bloom?: ReturnType<typeof useTulipBloom> }) {
  const stem = 22 + STEM_EXTRA[i % STEM_EXTRA.length];
  const vbH = TULIP_H + stem, top = TULIP_H - 1;
  return (
    <Svg width={tw} height={(tw * vbH) / 28} viewBox={`0 0 28 ${vbH}`} style={{ overflow: 'visible' }}>
      <Path d={`M14 ${top} C13 ${top + stem * 0.35} 15 ${top + stem * 0.7} 14 ${vbH}`} fill="none" stroke={c.fg} strokeWidth={2.2} strokeLinecap="round" />
      {bloom ? (
        <G>
          <AG opacity={bloom.budOpacity}><TulipGlyph look="today" part="bud" variant={i} /></AG>
          <AG originX={14} originY={TULIP_H} scale={bloom.scale} opacity={bloom.opacity}><TulipGlyph look="ink" variant={i} /></AG>
        </G>
      ) : <TulipGlyph look="ink" variant={i} />}
    </Svg>
  );
}
/** En yeni lale ilk gösterimde bir kez açılır (hareketi azalt açıksa doğrudan açık görünür). */
function BloomTulip({ i, tw }: { i: number; tw: number }) {
  const bloom = useTulipBloom(true, 0);
  return <TulipSvg i={i} tw={tw} bloom={bloom} />;
}

function PortalWindow({ day, goal, tulips, tulipLabel, dayLabel, a11y, dropKey, dropOn, onDropDone }: {
  day: number; goal: number; tulips: number; tulipLabel: string; dayLabel: string; a11y: string; dropKey: number; dropOn: boolean; onDropDone: () => void;
}) {
  const { width } = useWindowDimensions();
  const s = Math.min(1, (Math.min(width, 430) - 32) / WIN_W);
  // Lale boyu ve aralığı sayıya göre: en çok 12 lale (90 gün) tek sıraya sığar, hafif üst üste binebilir.
  const tw = tulips <= 5 ? 40 : tulips <= 8 ? 34 : 28;
  const gap = Math.min(tw + 10, 300 / Math.max(1, tulips));
  return (
    <Rise y={12} ms={460} style={{ alignSelf: 'center', marginTop: 14, marginBottom: 8 }}>
      <View accessible accessibilityLabel={a11y} style={{ width: WIN_W * s, height: (WIN_H + 5) * s }}>
        <View style={{ width: WIN_W, height: WIN_H + 5, transform: [{ scale: s }], transformOrigin: '0% 0%' }}>
          <ArchWindow>
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 28, alignItems: 'center' }}>
              <Kicker color={c.dim}>{dayLabel}</Kicker>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text allowFontScaling={false} style={{ fontFamily: F.d, fontSize: 64, lineHeight: 70, color: c.fg }}>{day}</Text>
                <Text allowFontScaling={false} style={{ fontFamily: F.s, fontSize: 18, color: c.dim, marginLeft: 6 }}>{`/ ${goal}`}</Text>
              </View>
            </View>
            {tulips > 0 && (
              <Sway height={90} style={{ position: 'absolute', left: 0, right: 0, top: 116 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', height: 90 }}>
                  {Array.from({ length: tulips }, (_, i) => (
                    <View key={i} style={{ marginHorizontal: (gap - tw) / 2 }}>
                      {i === tulips - 1 ? <BloomTulip i={i} tw={tw} /> : <TulipSvg i={i} tw={tw} />}
                    </View>
                  ))}
                </View>
              </Sway>
            )}
            <WaterDrop active={dropOn} playKey={dropKey} onDone={onDropDone} />
          </ArchWindow>
        </View>
      </View>
      {tulips > 0 && <T w="s" size={15} color={c.dim} accessibilityElementsHidden importantForAccessibility="no" style={{ textAlign: 'center', marginTop: 6 }}>{tulipLabel}</T>}
    </Rise>
  );
}

/** "Ayrıntılar / Gizle" düğmesi (>=48 dp): ana akışta kısa metin, gerisi buradan açılır. */
const MoreToggle = ({ open, onPress, label, hide }: { open: boolean; onPress: () => void; label: string; hide: string }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 20 }}>
    <T w="s" size={16} color={c.water} style={{ textDecorationLine: 'underline' }}>{open ? hide : label}</T>
  </Pressable>
);

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
  const [more, setMore] = useState(false);
  const enc = encodeURIComponent(code.trim());

  const look = async () => { setBusy(true); setErr(''); try { setInfo(await api(`/public/invites/${enc}`)); } catch (e: any) { setErr(e.message); } setBusy(false); };
  const accept = async () => { setBusy(true); setErr(''); try { const r = await api(`/public/invites/${enc}/accept`, { method: 'POST', body: {} }); onJoined(r.token); } catch (e: any) { setErr(e.message); setBusy(false); } };
  const decline = async () => { setBusy(true); try { await api(`/public/invites/${enc}/decline`, { method: 'POST', body: {} }); setDeclined(true); } catch (e: any) { setErr(e.message); } setBusy(false); };

  return (
    <Screen>
      <Back onPress={info ? () => { setInfo(null); setMore(false); } : onBack} />
      <Body>
        {!info && !declined && <>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <BrandMark size={48} style={{ marginBottom: 16 }} />
            <Kicker color={c.water}>{L.guardian.joinKicker}</Kicker>
            <T size={38} ls={-1.1} lh={44} style={{ marginTop: 6 }}>{L.guardian.joinTitle}</T>
            <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 10 }}>{L.guardian.joinBody}</T>
          </View>
          <Field placeholder="ABCDE-FGHJK" autoCapitalize="characters" autoCorrect={false} value={code} onChangeText={setCode} />
          {!!err && <T w="s" size={15} color={c.clay} style={{ paddingHorizontal: 16 }}>{err}</T>}
        </>}
        {info && !declined && <>
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <BrandMark size={48} style={{ marginBottom: 16 }} />
            <Kicker color={c.water}>{L.guardian.inviteKicker}</Kicker>
            <T size={32} ls={-1} lh={37} style={{ marginTop: 6 }}>{L.guardian.inviteTitle(info.owner)}</T>
            <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 10 }}>{info.hideHabit ? L.guardian.inviteIntroHidden(info.goalDays) : L.guardian.inviteIntro(info.habitLabel, info.goalDays)}</T>
          </View>
          <Card seed="invite" tilt={-0.4}>
            <Bullet icon="heart" text={info.hideHabit ? L.guardian.relapseInfoHidden : H.guardianRelapseInfo} />
            <Bullet icon="witness" text={L.guardian.bulletKey} />
            {more && <>
              <Bullet icon="eyeOff" text={L.guardian.bulletVideo} />
              <Bullet icon="check" text={L.guardian.bulletFree} />
            </>}
          </Card>
          <MoreToggle open={more} onPress={() => setMore(m => !m)} label={L.guardian.details} hide={L.guardian.hideDetails} />
          {!!err && <T w="s" size={15} color={c.clay} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>{err}</T>}
        </>}
        {declined && <View style={{ paddingHorizontal: 16 }}><T size={38} ls={-1} lh={44}>{L.guardian.declinedTitle}</T><T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 10 }}>{L.guardian.declinedBody(info?.owner ?? '')}</T></View>}
        <View style={{ flex: 1, minHeight: 16 }} />
      </Body>
      {!info && !declined && <ActionBar kind="water" label={busy ? L.guardian.searching : L.common.continue} disabled={busy || code.replace(/[^0-9a-z]/gi, '').length < 10} onPress={look} />}
      {info && !declined && info.status !== 'declined' && <>
        {info.status !== 'accepted' && <ActionBar label={L.guardian.decline} right="" kind="ghost" height={60} size={19} disabled={busy} onPress={decline} />}
        <ActionBar kind="water" label={info.status === 'accepted' ? L.guardian.enterPortal : L.guardian.become} disabled={busy} onPress={accept} />
      </>}
      {declined && <ActionBar kind="water" label={L.guardian.back} onPress={onBack} />}
    </Screen>
  );
}

function Portal({ token, onLogout }: { token: string; onLogout: () => void }) {
  const L = useL(), H = useH();
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [drop, setDrop] = useState(0);        // başarılı her gönderimde 1 artar; damla yalnızca bu durumda düşer
  const [dropSeen, setDropSeen] = useState(0); // oynatılıp biten damla sayısı: drop > dropSeen iken damla/halka çizilir
  const scroller = useRef<ScrollView>(null);
  const [supportErr, setSupportErr] = useState('');
  const [more, setMore] = useState(false);

  const load = useCallback(async () => {
    try { setMe(await api('/guardian/me', { token })); setErr(''); }
    catch (e: any) { setErr(e.message); if (e instanceof ApiError && e.status === 401) onLogout(); }
  }, [token]);
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);
  // Hareketi azalt açıksa damla düşmez, halka durağan kalır; kısa süre sonra kaldır (kalıcı bir "halka" kalmasın).
  useEffect(() => {
    if (drop === 0 || !isReduced()) return;
    const t = setTimeout(() => setDropSeen(drop), 2400);
    return () => clearTimeout(t);
  }, [drop]);
  const act = async (path: string, body: object = {}) => { try { await api(path, { token, method: 'POST', body }); await load(); } catch (e: any) { setErr(e.message); } };
  // Aynı /guardian/support çağrısı; fark: başarı ayrı bilinir (damla yalnız başarıda düşer, hata düğmenin yanında görünür).
  const sendSupport = async () => {
    setSupportErr('');
    try {
      await api('/guardian/support', { token, method: 'POST', body: { text: msg } }); setSent(true); setMsg(''); setDrop(d => d + 1);
      scroller.current?.scrollTo({ y: 0, animated: true });   // damla pencerede düşer; pencere görünür olsun
      await load();
    }
    catch (e: any) { setSupportErr(e.message); }
  };

  if (!me) return <Screen><View style={{ padding: 16 }}>{err ? <T w="s" size={16} color={c.clay}>{err}</T> : <T w="r" size={16} color={c.dim}>{L.common.loading}</T>}</View></Screen>;
  const u = me.unlock, sh = me.shield;
  const hidden = !!me.pact.hideHabit;
  // Pencerede yalnız gün sayısı ve lale sayısı: gün gün durum sunucudan gelmez, çizilmez.
  const day = Math.min(me.pact.day, me.pact.goalDays), tulips = Math.floor(day / 7);
  const shieldKnown = !!sh && sh.shield !== 'unknown';

  return (
    <Screen>
      {/* Body ile aynı ayarlar; damla pencerede düştüğü için gönderince başa kaydırmak üzere ref gerekir. */}
      <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 16, paddingBottom: 4, paddingTop: 8 }}>
          <BrandMark size={40} style={{ marginBottom: 14 }} />
          <Kicker color={c.water}>{L.guardian.kGuardian(me.guardian.name)}</Kicker>
          <T size={36} ls={-1.1} lh={42} style={{ marginTop: 6 }}>{me.owner}</T>
          <T w="r" size={16} color={c.dim}>{hidden ? L.guardian.goalHidden : me.pact.habitLabel}</T>
        </View>
        {!!err && <T w="s" size={15} color={c.clay} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{err}</T>}

        <PortalWindow day={day} goal={me.pact.goalDays} tulips={tulips} dayLabel={L.guardian.day} tulipLabel={L.guardian.tulips(tulips)} a11y={L.guardian.winLabel(day, me.pact.goalDays, tulips)}
          dropKey={drop} dropOn={drop > dropSeen} onDropDone={() => setDropSeen(drop)} />

        <Card seed="check" tilt={0.4}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Kicker color={c.dim}>{L.guardian.lastCheck}</Kicker>
              <T size={19} style={{ marginTop: 4 }}>{ago(me.lastCheckIn, L)}</T>
              <T w="r" size={15} color={c.dim}>{L.guardian.status[me.pact.status] ?? me.pact.status}</T>
            </View>
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <Kicker color={c.dim}>{hidden ? L.guardian.lastSetback : H.guardianLastRelapse}</Kicker>
              <T size={19} style={{ marginTop: 4 }}>{me.lastRelapse ? ago(me.lastRelapse, L) : L.guardian.none}</T>
              {!!me.lastRelapse && <T w="r" size={15} color={c.dim}>{L.guardian.streak(me.streakDays)}</T>}
            </View>
          </View>
        </Card>

        {/* Engel kapalıysa her zaman görünür; diğer sinyaller "Ayrıntılar" altında */}
        {shieldKnown && sh.shield === 'off' && (
          <Card seed="shield" tone="clayWash" tilt={-0.5}>
            <Kicker color={c.fg}>{hidden ? L.guardian.shieldHidden : H.guardianShield}</Kicker>
            <T size={19} style={{ marginTop: 4 }}>{L.guardian.off}</T>
            <T w="r" size={15} color={c.fg}>{L.guardian.signal(ago(sh.lastSeen, L))}</T>
          </Card>
        )}
        <MoreToggle open={more} onPress={() => setMore(m => !m)} label={L.guardian.details} hide={L.guardian.hideDetails} />
        {more && (
          <Card seed="more" tilt={0.3}>
            <Kicker color={c.dim}>{L.guardian.appSignal}</Kicker>
            <T size={19} style={{ marginTop: 4 }}>{sh ? ago(sh.lastSeen, L) : L.guardian.none}</T>
            <T w="r" size={15} color={c.dim}>{L.guardian.signalNote}</T>
            {shieldKnown && sh.shield === 'on' && <View style={{ marginTop: 12 }}>
              <Kicker color={c.dim}>{hidden ? L.guardian.shieldHidden : H.guardianShield}</Kicker>
              <T size={19} style={{ marginTop: 4 }}>{L.guardian.on}</T>
              <T w="r" size={15} color={c.dim}>{L.guardian.signal(ago(sh.lastSeen, L))}</T>
            </View>}
            {!!me.lastCrisis && <T w="r" size={15} color={c.dim} style={{ marginTop: 12 }}>{L.guardian.lastCrisis(ago(me.lastCrisis, L))}</T>}
          </Card>
        )}

        {u && <>
          <Card seed="unlock" tone="clayWash" tilt={-0.4}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden><GIcon name="witness" size={22} color={c.fg} /></View>
              <Kicker color={c.fg}>{L.guardian.unlockKicker}</Kicker>
            </View>
            <T size={24} lh={29} style={{ marginTop: 6 }}>{L.guardian.unlockTitle(me.owner)}</T>
            <T w="r" size={16} lh={23} color={c.fg} style={{ marginTop: 6 }}>{L.guardian.unlockBody(u.approvals, u.need, u.readyAt > Date.now() ? leftFmt(u.readyAt - Date.now(), L) : L.guardian.waitDone)}</T>
          </Card>
          {u.iApproved
            ? <ActionBar label={L.guardian.withdraw} right="" kind="ghost" height={60} size={19} onPress={() => act('/guardian/unlock/withdraw')} />
            : <ActionBar label={L.guardian.useKey} kind="water" onPress={() => ask(L, L.guardian.approveConfirm, () => act('/guardian/unlock/approve'))} />}
        </>}

        <View style={{ paddingTop: 14 }}>
          <Field label={L.guardian.supportLabel} multiline maxLength={280} placeholder={L.guardian.supportPh} value={msg} onChangeText={t => { setMsg(t); setSent(false); setSupportErr(''); }} style={{ minHeight: 88 }} />
          <ActionBar kind="water" label={sent ? L.guardian.sent : L.guardian.send} right="" disabled={!msg.trim() || sent} onPress={sendSupport} />
          {!!supportErr && <T w="s" size={15} color={c.clay} style={{ paddingHorizontal: 16 }}>{supportErr}</T>}
          {drop > 0 && sent && <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.hand, fontSize: 24, lineHeight: 30, color: c.water, textAlign: 'center', paddingTop: 10, paddingBottom: 6 }}>{L.guardian.dropNote}</Text>}
        </View>
        <View style={{ flex: 1, minHeight: 12 }} />
        <Pressable onPress={() => ask(L, L.guardian.logoutConfirm, onLogout)} accessibilityRole="button" style={{ minHeight: 56, justifyContent: 'center', paddingHorizontal: 16, borderTopWidth: 1, borderColor: c.line }}>
          <T w="s" size={16} color={c.dim}>{L.guardian.logout}</T>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
