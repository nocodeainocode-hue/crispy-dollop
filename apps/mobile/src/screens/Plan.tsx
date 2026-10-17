import React, { useEffect, useState } from 'react';
import { View, Share, Platform, Pressable } from 'react-native';
import { useApp } from '../store';
import { useServer } from '../server';
import { Screen, Body, Back, ActionBar, Opt, NumRow, T, Kicker, Hair } from '../components/ui';
import { Rise } from '../components/motion';
import { packPrices, recoverPurchases, withPack } from '../purchase';
import { c } from '../theme';
import type { Go } from '../nav';

import { useL, useH, entryLabel, isTrigger } from '../i18n';

const DAY = 86400000;

/** Paketim: mevcut plan, paketle açılanlar, denemeden pakete geçiş, uzman raporu. */
export default function Plan({ go, paywall, onLater }: { go: Go; paywall?: boolean; onLater?: () => void }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH();
  const UP = [30, 60, 90].map(d => ({ d, l: L.packs.name(d), sub: L.packs.short[d] }));
  const pack = a.goalDays > 7;
  const day = Math.min(a.goalDays, Math.floor((Date.now() - a.startedAt) / DAY) + 1);
  const [demo, setDemo] = useState<boolean | null>(null);
  const [canBuy, setCanBuy] = useState(true); // Play ödemesi bağlanana kadar üretimde false: paketler "yakında"
  const [pick, setPick] = useState(90); // 90 gün önceden seçili; tek dokunuşla değiştirilir
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null); // ok: bilgi (beyaz), değilse hata (kırmızı)

  const [discount, setDiscount] = useState(0);
  const [prices, setPrices] = useState<Record<number, string>>({});
  useEffect(() => {
    srv.me().then(m => {
      setDemo(m.demoPurchases); setCanBuy(m.demoPurchases || !!m.playEnabled); setDiscount(m.nextPackDiscount ?? 0);
      if (!m.demoPurchases && m.playEnabled) { packPrices().then(setPrices); recoverPurchases(srv); }
    }).catch(() => {});
  }, []);

  const upgrade = async () => {
    if (!pick) return;
    setBusy(true); setMsg(null);
    try { if (await withPack(srv, pick, () => srv.upgrade(pick))) { setMsg({ text: L.plan.upgraded(pick), ok: true }); setPick(0); } }
    catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setBusy(false);
  };

  // Uzman/terapist raporu: sunucu özeti + telefondaki günlükten tetikler. Paylaşımı kullanıcı kendisi yapar; QuitVow kimseye göndermez.
  const share = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await srv.report();
      const trig = Object.entries(a.entries.reduce((m: Record<string, number>, e) => { if (isTrigger(e.trigger)) m[e.trigger] = (m[e.trigger] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 3);
      const fmt = (t: number) => new Date(t).toLocaleDateString(L.locale);
      const text = [
        L.plan.rTitle(a.name),
        L.plan.rHabit(r.habitLabel),
        L.plan.rPact(r.goalDays, r.day, fmt(r.startedAt)),
        L.plan.rCheckins(r.checkins, r.avgUrge),
        L.plan.rCrises(r.crises),
        H.reportRelapses(r.relapses.length, r.relapses.map((x: any) => fmt(x.at) + (x.self ? L.plan.rSelf : '')).join('; ')),
        trig.length ? L.plan.rTriggers(trig.map(([k, n]) => `${entryLabel(k, H, L)} (${n})`).join(', ')) : '',
        '',
        L.plan.rDisclaimer,
      ].filter(Boolean).join('\n');
      if (Platform.OS === 'web') {
        if ((navigator as any).share) await (navigator as any).share({ text }); else { await navigator.clipboard?.writeText(text); setMsg({ text: L.plan.copied, ok: true }); }
      } else await Share.share({ message: text });
    } catch (e: any) { if (!/cancel|dismiss|abort/i.test(String(e?.message))) setMsg({ text: e.message ?? L.plan.reportFail, ok: false }); }
    setBusy(false);
  };

  return (
    <Screen>
      {paywall ? <View style={{ height: 38 }} /> : <Back onPress={() => go('home')} />}
      <Body>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Kicker color={c.acc2}>{!pack && (paywall || a.pactStatus === 'completed') ? L.plan.kTrialDone : L.plan.kMyPack}</Kicker>
          <Rise y={12}><T size={36} ls={-1.1} lh={38} style={{ marginTop: 6 }}>{pack ? L.plan.tPack(a.goalDays) : paywall || a.pactStatus === 'completed' ? L.plan.tKept(a.goalDays) : L.plan.tTrial}</T></Rise>
          <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 10 }}>{!pack && a.pactStatus === 'completed' ? L.plan.trialDoneSmall : L.plan.progress(day, Math.max(0, a.goalDays - day), pack)}</T>
        </View>
        <Hair />
        <Kicker color={c.dim} style={{ padding: 16, paddingBottom: 8 }}>{L.plan.unlocks}</Kicker>
        <NumRow no={pack ? '✓' : '—'}>{L.plan.u1}</NumRow>
        <NumRow no={pack ? '✓' : '—'}>{L.plan.u2}</NumRow>
        <NumRow no={pack ? '✓' : '—'} last>{L.plan.u3}</NumRow>
        <T w="r" size={12} lh={17} color={c.mute} style={{ padding: 16, paddingTop: 10 }}>{L.plan.free}</T>

        {!pack && !canBuy && <T w="r" size={12.5} lh={18} color={c.dim} style={{ paddingHorizontal: 16 }}>{L.plan.soon}</T>}
        {!pack && canBuy && <>
          <Kicker color={c.dim} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{L.plan.upgradeKicker}</Kicker>
          <Hair />
          {UP.map((x, i) => <Opt key={x.d} delay={80 + i * 60} label={x.l} sub={prices[x.d] ? `${prices[x.d]} · ${x.sub}` : x.sub} on={pick === x.d} onPress={() => setPick(x.d)} />)}
          {demo && discount > 0 && <T w="s" size={12.5} lh={18} color={c.acc2} style={{ paddingHorizontal: 16, paddingTop: 10 }}>{L.plan.discount(discount)}</T>}
          <T w="r" size={11.5} lh={16} color={c.mute} style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            {demo === false ? L.plan.billingPending : L.plan.demo}
          </T>
        </>}
        {pack && <>
          <Kicker color={c.dim} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{L.plan.reportKicker}</Kicker>
          <T w="r" size={12.5} lh={18} color={c.dim} style={{ paddingHorizontal: 16 }}>{H.reportBody}</T>
        </>}
        {!!msg && <T w="s" size={12.5} color={msg.ok ? c.fg : c.acc2} style={{ padding: 16 }}>{msg.text}</T>}
        <View style={{ flex: 1, minHeight: 16 }} />
      </Body>
      {paywall && (
        <Pressable onPress={() => go('crisis')} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: c.line, flexDirection: 'row', justifyContent: 'space-between' }}>
          <T w="s" size={13} color={c.acc2}>{L.plan.crisisLink}</T><T w="s" size={13} color={c.acc2}>→</T>
        </Pressable>
      )}
      {!pack && paywall && <ActionBar label={L.plan.later} right="" kind="ghost" height={52} size={14} onPress={() => onLater?.()} />}
      {!pack && canBuy && <ActionBar label={busy ? L.plan.processing : pick ? L.plan.buy(pick) : L.plan.pickFirst} disabled={!pick || busy} onPress={upgrade} />}
      {pack && <ActionBar label={busy ? L.plan.preparing : L.plan.share} disabled={busy} onPress={share} />}
    </Screen>
  );
}
