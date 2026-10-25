import React, { useEffect, useState } from 'react';
import { View, Share, Platform, Pressable, useWindowDimensions, PixelRatio } from 'react-native';
import { useApp } from '../store';
import { useServer } from '../server';
import { Screen, Body, Back, ActionBar, T, Kicker } from '../components/ui';
import { Rise } from '../components/motion';
import { Pill, Fold } from '../components/PaperKit';
import PackArt from '../components/PackArt';
import { GIcon, Stamp } from '../art/misc';
import { packPrices, recoverPurchases, withPack } from '../purchase';
import { c, F, pebble } from '../theme';
import type { Go } from '../nav';

import { useL, useH, entryLabel, isTrigger } from '../i18n';

const DAY = 86400000;

/** Paket kartı: Filiz/Fidan/Ağaç. Sütun (3 yan yana) ya da dar ekran / büyük yazıda satır düzeni. radio rolü, seçili durum biçimle de belli (kalın ada çayı kenar + onay). Seçili kartın bitkisi sallanır (ekranda tek sonsuz hareket). */
function PackCard({ d, name, days, price, on, onPress, row }: { d: number; name: string; days: string; price: string; on: boolean; onPress: () => void; row: boolean }) {
  const shape = pebble(row ? 96 : 200, `pack${d}`);
  const border = on ? 3 : 2;
  const art = <PackArt d={d} height={row ? 72 : 92} swaying={on} />;
  const check = (
    <View style={{ position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: c.act, alignItems: 'center', justifyContent: 'center' }}>
      <GIcon name="check" size={18} color={c.onAct} strokeWidth={3} />
    </View>
  );
  return (
    <View style={row ? { marginBottom: 14 } : { flex: 1 }}>
      <View style={[shape, { position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, backgroundColor: c.shadow }]} />
      <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${name}, ${days}${price ? ', ' + price : ''}`}>
        <View style={[shape, row
          ? { minHeight: 96, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 48 }
          : { minHeight: 196, alignItems: 'center', paddingTop: 14, paddingHorizontal: 6 },
          { borderWidth: border, borderColor: on ? c.act : c.edge, backgroundColor: on ? c.sageWash : c.surf }]}>
          {art}
          <View style={row ? { flex: 1, marginLeft: 14 } : { alignItems: 'center', marginTop: 6, alignSelf: 'stretch' }}>
            <T size={22} lh={26} maxFontSizeMultiplier={1.3} style={{ fontFamily: F.d }}>{name}</T>
            <T w="s" size={15} lh={20} color={c.dim} maxFontSizeMultiplier={1.3}>{days}</T>
            {!!price && <T size={22} lh={28} maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: F.d, marginTop: row ? 2 : 6 }}>{price}</T>}
          </View>
          {on && check}
        </View>
      </Pressable>
    </View>
  );
}

/** Tek seferlik damgası (art/misc Stamp: kesik çizgili kil kenar, -1,2 derece). Fiyattan önce görünür; ilk cümle başlık, kalanı metin. */
function OneTime({ text }: { text: string }) {
  const i = text.indexOf('. ');
  const head = i > 0 ? text.slice(0, i + 1) : text, rest = i > 0 ? text.slice(i + 2) : '';
  return (
    <View accessible accessibilityLabel={text} style={{ marginHorizontal: 24, marginTop: 14, marginBottom: 20 }}>
      <Stamp title={head} text={rest} />
    </View>
  );
}

/** Paketle açılanlar: en fazla 3 kısa satır. */
function Includes({ on }: { on: boolean }) {
  const L = useL();
  return (
    <View style={{ paddingHorizontal: 24, marginTop: 6 }}>
      {[L.plan.inc1, L.plan.inc2, L.plan.inc3].map(t => (
        <View key={t} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36 }}>
          <GIcon name="leaf" size={22} color={on ? c.act : c.edge} />
          <T w="s" size={16} lh={22} style={{ marginLeft: 12, flex: 1 }}>{t}</T>
        </View>
      ))}
    </View>
  );
}

/** Paketim: mevcut plan, paketle açılanlar, denemeden pakete geçiş, paylaşılabilir özet. */
export default function Plan({ go, paywall, onLater }: { go: Go; paywall?: boolean; onLater?: () => void }) {
  const a = useApp();
  const srv = useServer();
  const L = useL(), H = useH();
  const UP = [30, 60, 90];
  const pack = a.goalDays > 7;
  const day = Math.min(a.goalDays, Math.floor((Date.now() - a.startedAt) / DAY) + 1);
  const [demo, setDemo] = useState<boolean | null>(null);
  const [canBuy, setCanBuy] = useState(true); // Play ödemesi bağlanana kadar üretimde false: paketler "yakında"
  const [pick, setPick] = useState(90); // 90 gün önceden seçili; tek dokunuşla değiştirilir
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null); // ok: bilgi (mürekkep), değilse hata (kil)

  const [discount, setDiscount] = useState(0);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [priceErr, setPriceErr] = useState('');
  useEffect(() => {
    srv.me().then(m => {
      setDemo(m.demoPurchases); setCanBuy(m.demoPurchases || !!m.playEnabled); setDiscount(m.nextPackDiscount ?? 0);
      if (!m.demoPurchases && m.playEnabled) { packPrices().then(r => { setPrices(r.prices); setPriceErr(r.error ?? ''); }); recoverPurchases(srv); }
    }).catch(() => {});
  }, []);

  const upgrade = async () => {
    if (!pick) return;
    setBusy(true); setMsg(null);
    try { if (await withPack(srv, pick, () => srv.upgrade(pick))) { setMsg({ text: L.plan.upgraded(pick), ok: true }); setPick(0); } }
    catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setBusy(false);
  };

  // Uzman/terapist özeti: sunucu özeti + telefondaki günlükten tetikler. Paylaşımı kullanıcı kendisi yapar; QuitVow kimseye göndermez.
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

  // 3 yan yana kart dar ekranda (360 dp) ya da büyük yazı ölçeğinde kırpılır: liste düzenine düş.
  const { width } = useWindowDimensions();
  const row = width < 400 || PixelRatio.getFontScale() > 1.15;

  const trialDone = !pack && (paywall || a.pactStatus === 'completed');
  const left = Math.max(0, a.goalDays - day);
  const sub = pack ? `${L.plan.tierDays(a.goalDays)} · ${L.plan.dayLeft(day, left)}` : trialDone ? L.plan.sTrialDone : L.plan.dayLeft(day, left);
  const priceOf = (d: number) => (demo ? L.plan.demoTag : prices[d] ?? '');

  return (
    <Screen>
      {paywall ? <View style={{ height: 4 }} /> : <Back onPress={() => go('home')} />}
      <Body>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          {pack && <Kicker color={c.dim}>{L.plan.kMyPack}</Kicker>}
          <Rise y={12}><T size={pack ? 44 : 40} ls={-0.8} lh={48} style={{ marginTop: pack ? 4 : 0 }}>{pack ? (L.plan.tier[a.goalDays] ?? L.plan.tierDays(a.goalDays)) : L.plan.tGrow}</T></Rise>
          <T w="s" size={17} lh={24} color={c.dim} style={{ marginTop: 4 }}>{sub}</T>
        </View>

        {pack && (
          <Rise delay={80} y={10}><View style={{ alignItems: 'center', marginTop: 18, marginBottom: 6 }}><PackArt d={a.goalDays} height={130} swaying /></View></Rise>
        )}

        {!pack && canBuy && <>
          <OneTime text={L.packs.oneTime} />
          <View accessibilityRole="radiogroup" style={row ? { paddingHorizontal: 16 } : { flexDirection: 'row', paddingHorizontal: 16, gap: 12 }}>
            {UP.map(d => <PackCard key={d} d={d} name={L.plan.tier[d]} days={L.plan.tierDays(d)} price={priceOf(d)} on={pick === d} onPress={() => setPick(d)} row={row} />)}
          </View>
          {trialDone && <T w="r" size={15} lh={22} color={c.dim} style={{ paddingHorizontal: 24, marginTop: 18 }}>{L.plan.keepNote}</T>}
        </>}
        {!pack && !canBuy && <T w="s" size={15} lh={22} color={c.dim} style={{ paddingHorizontal: 24, marginTop: 14 }}>{L.plan.soon}</T>}

        <View style={{ height: 14 }} />
        <Includes on={pack} />

        {!pack && canBuy && <>
          {demo && discount > 0 && <T w="s" size={14} lh={20} color={c.acc2} style={{ paddingHorizontal: 24, paddingTop: 10 }}>{L.plan.discount(discount)}</T>}
          {demo ? <T w="r" size={14} lh={20} color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 10 }}>{L.plan.demo}</T>
            : !!priceErr && <T w="r" size={14} lh={20} color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 10 }}>{L.plan.priceFail}{__DEV__ ? ` (${priceErr})` : ''}</T>}
        </>}

        {paywall && <T size={26} lh={32} color={c.clay} style={{ fontFamily: F.hand, textAlign: 'center', marginTop: 16 }} maxFontSizeMultiplier={1.3}>{L.plan.hand}</T>}

        <View style={{ marginTop: 6 }}>
          <Fold label={L.plan.more}>
            {pack && <T w="r" size={15} lh={22} color={c.dim} style={{ marginBottom: 10 }}>{H.reportBody}</T>}
            <T w="r" size={14} lh={21} color={c.dim}>{L.plan.free}</T>
          </Fold>
        </View>
        <View style={{ flex: 1, minHeight: 16 }} />
      </Body>
      {!!msg && <T w="s" size={15} lh={21} color={msg.ok ? c.fg : c.clay} style={{ paddingHorizontal: 24, paddingTop: 6 }}>{msg.text}</T>}
      {!pack && canBuy && <ActionBar label={busy ? L.plan.processing : pick ? L.plan.buy(pick, prices[pick]) : L.plan.pickFirst} disabled={!pick || busy} onPress={upgrade} />}
      {pack && <ActionBar label={busy ? L.plan.preparing : L.plan.share} disabled={busy} onPress={share} />}
      {!pack && paywall && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 12 }}>
          <View style={{ flex: 1 }}><Pill label={L.plan.later} kind="ghost" minHeight={64} onPress={() => onLater?.()} /></View>
          <View style={{ flex: 1 }}><Pill label={L.plan.crisisLink} kind="crisis" minHeight={64} onPress={() => go('crisis')} /></View>
        </View>
      )}
    </Screen>
  );
}
