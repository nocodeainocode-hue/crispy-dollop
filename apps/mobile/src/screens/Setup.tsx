import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, PixelRatio, Platform, useWindowDimensions } from 'react-native';
import { useApp } from '../store';
import { useServer } from '../server';
import { API_URL } from '../api';
import { useBilling } from '../billing';
import { packPrices, withPack, LIST_PRICES } from '../purchase';
import VowRecorder, { type Vow } from '../components/VowRecorder';
import { Screen, Body, Back, ActionBar, Field, Opt, T, Kicker, TopChips, StepProgress } from '../components/ui';
import { Why, PaperCard, PaperLine, CheckRow, TextLink, PlusMark, Dot, PackPick, OneTimeStamp, SignHold, TierPlant } from '../components/SetupParts';
import { useL, useH, currencySymbol, joinNames } from '../i18n';
import { StepTransition, Rise } from '../components/motion';
import { tick, settle } from '../haptics';
import { c, F, pebble } from '../theme';

const TOTAL = 10; // alışkanlık adımı + L.setup.steps (9)
const PAID = [30, 60, 90]; // Filiz / Fidan / Ağaç; adlar L.plan.tier'dan (tek yer), deneme ayrı satır
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Setup() {
  const app = useApp();
  const srv = useServer();
  const L = useL(), H = useH();
  // Seçenekler kimlik olarak saklanır (types/when), ekranda o dilin etiketi gösterilir
  const STEPS = [H.stepName, ...L.setup.steps];
  // Dar ekranda ya da büyük yazıda üç paket kartı yan yana sığmaz: kart solda, bilgi sağda (Plan ile aynı mantık, daha dar eşik)
  const { width: winW } = useWindowDimensions();
  const packRow = winW < 340 || PixelRatio.getFontScale() > 1.3;
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1); // 1 ileri, -1 geri: geçiş animasyonunun yönü
  const [viaLogin, setViaLogin] = useState(false); // 1. adımdan "Zaten hesabım var" ile hesap adımına atlandı: geri, 1. adıma döner
  const [notice, setNotice] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [when, setWhen] = useState<string[]>([]);
  const [loss, setLoss] = useState('');
  const [plan, setPlan] = useState('');
  const [reason, setReason] = useState('');
  const [gs, setGs] = useState([{ id: 'g1', name: '', email: '', phone: '' }, { id: 'g2', name: '', email: '', phone: '' }, { id: 'g3', name: '', email: '', phone: '' }]);
  const [goal, setGoal] = useState(30);
  const bill = useBilling();
  const canBuy = bill?.billing !== false; // bilinmiyorken engelleme; sunucu zaten paketi doğrular
  const [prices, setPrices] = useState<Record<number, string>>({});
  // Sunucu bilinmiyorken (null) de fiyat çekilir; "yakında" ve demo dışında her durumda dener
  useEffect(() => { if (bill?.billing !== false && !bill?.demo) packPrices().then(r => setPrices(r.prices)); }, [bill]);
  const priceOf = (d: number): string | undefined =>
    prices[d] ?? (bill?.demo || Platform.OS !== 'android' ? LIST_PRICES[d] : undefined);
  // Satış kapalıyken (Play ödemesi bağlanana kadar) yalnızca ücretsiz deneme seçilebilir
  useEffect(() => { if (!canBuy && goal !== 7) setGoal(7); }, [canBuy]);
  const [solo, setSolo] = useState(false); // vasisiz başla: zaman kilidi
  const [hideHabit, setHideHabit] = useState(false); // vasiler alışkanlığı görmesin
  const [openG, setOpenG] = useState<string | null>('g1'); // açık şahit kutusu (aynı anda bir tane)
  const [letter, setLetter] = useState('');
  const [acctName, setAcctName] = useState(app.name);
  const [email, setEmail] = useState(app.email);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sign, setSign] = useState('');
  const [consent, setConsent] = useState(false);
  const [vow, setVow] = useState<Vow | null>(null);
  const [hold, setHold] = useState(0);
  const [busy, setBusy] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false); // ücretsiz deneme hesap başına bir kez
  const [err, setErr] = useState('');
  const holding = useRef(false);
  const [net, setNet] = useState<'checking' | 'ok' | 'fail'>('checking');

  // Hesap adımında sunucuya erişimi test et (telefon–bilgisayar bağlantısı sorunlarını görünür kılar)
  useEffect(() => {
    if (step !== 7) return;
    setNet('checking');
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    fetch(API_URL + '/health', { signal: ctl.signal }).then(r => setNet(r.ok ? 'ok' : 'fail')).catch(() => setNet('fail')).finally(() => clearTimeout(t));
    return () => { clearTimeout(t); ctl.abort(); };
  }, [step]);

  // Vasisiz başlayan için yazılan alanlar yok sayılır (yanlışlıkla bir adrese davet gitmesin)
  const filled = solo ? [] : gs.filter(g => g.name.trim() || g.email.trim());
  const guardiansOk = solo || (filled.length >= 1 && filled.every(g => g.name.trim() && EMAIL.test(g.email.trim())));
  const emails = filled.map(g => g.email.trim().toLowerCase()).filter(Boolean);
  const dupEmail = emails.length !== new Set(emails).size;
  const selfEmail = (app.email || '').trim().toLowerCase();
  const selfGuardian = !!selfEmail && emails.includes(selfEmail);
  // Vasi alanı hataları: yazarken anında, hatalı alanın altında gösterilir
  const emailErr = (g: { name: string; email: string }, i: number) => {
    const e = g.email.trim().toLowerCase();
    if (!e) return g.name.trim() ? L.setup.emailRequired : '';
    if (!EMAIL.test(e)) return L.setup.emailInvalid;
    if (gs.some((x, j) => j < i && x.email.trim().toLowerCase() === e)) return L.setup.emailDup;
    if (selfEmail && e === selfEmail) return L.setup.emailSelf;
    return '';
  };
  const nameErr = (g: { name: string; email: string }) => (g.email.trim() && !g.name.trim() ? L.setup.nameMissing : '');
  const need = solo ? 0 : Math.min(2, filled.length);
  const names = joinNames(filled.map(g => g.name), L);
  const loggedIn = !!srv.token;
  useEffect(() => { if (loggedIn) srv.me().then(m => { setTrialUsed(m.trialUsed); }).catch(() => {}); }, [loggedIn]);
  // Kısayolla giriş: paktı olan hesap senkronla ana ekrana geçer (App yönlendirir).
  // Pakt yoksa boş verilerle sözleşmeye gitmesin: kurulumu 1. adımdan başlat, giriş açık kalsın.
  useEffect(() => {
    if (!viaLogin || !loggedIn) return;
    let live = true;
    srv.sync().then(() => {
      if (!live) return;
      setViaLogin(false); setDir(-1); setErr(''); setStep(0);
      setNotice(true);
    }).catch(() => {});
    return () => { live = false; };
  }, [viaLogin, loggedIn]);
  const trialBlocked = goal === 7 && trialUsed;
  const script = solo ? H.scriptSolo(sign || acctName || '…', goal) : H.script(sign || acctName || '…', names || L.setup.guardiansFallback, need, goal);

  // İmza: sunucuda pakt oluştur, videoyu yükle. Kimlik/niyet metinleri (neden, mektup, plan) yalnızca telefonda kalır.
  const sign_ = async () => {
    setBusy(true); setErr('');
    try {
      const label = types.length ? types.map(id => H.types[id] ?? id).join(', ') : H.label;
      app.set({ name: (sign.trim() || acctName).split(' ')[0], habit: app.habit, habitLabel: label, gamblingTypes: types, triggerTimes: when, monthlyLoss: Number(loss) || 0, plan, reason, letter, penalties: [], nextVerifyAt: Date.now() + 4 * 3600000, points: 100, role: 'user' });
      const created = await withPack(srv, goal, () => srv.createPact({ habitLabel: label, goalDays: goal, guardians: filled.map(g => ({ name: g.name.trim(), email: g.email.trim().toLowerCase(), phone: g.phone.trim() || undefined })), hideHabit: !solo && hideHabit }));
      if (!created) { setHold(0); setBusy(false); return; } // ödemeden vazgeçti: pakt kurulmadı, imza ekranında kalır
      if (vow) await srv.saveVow(vow.uri, vow.seconds, vow.mime); // isteğe bağlı; yalnızca telefonda saklanır
    } catch (e: any) { setErr(e.message ?? L.common.somethingWrong); setHold(0); }
    setBusy(false);
  };
  const signRef = useRef(sign_); signRef.current = sign_;

  useEffect(() => {
    if (step !== TOTAL - 1) return;
    const t = setInterval(() => setHold(p => {
      if (holding.current && p < 100) { const n = p + 4; if (n >= 100) { holding.current = false; setTimeout(() => signRef.current(), 0); return 100; } return n; }
      if (!holding.current && p > 0 && p < 100) return Math.max(0, p - 8);
      return p;
    }), 40);
    return () => clearInterval(t);
  }, [step]);
  // Söz verildi anı: tek ve sakin yerleşme titreşimi (imza başlarken tick, tamamlanınca settle)
  useEffect(() => { if (step === TOTAL - 1 && hold >= 100) settle(); }, [hold >= 100]);

  const valid =[types.length > 0, when.length > 0, reason.trim().length > 5, guardiansOk && !dupEmail, true, true, letter.trim().length > 10, loggedIn && !selfGuardian, sign.trim().length > 2 && consent && !trialBlocked][step];

  // Adım değişmedikçe aynı bileşen kalır: yazı yazarken başlık animasyonu yeniden oynamaz.
  // Başlık + (en çok) tek kısa açıklama; uzun açıklamalar "Neden böyle?" katlısında.
  const Head = useMemo(() => ({ big, small }: { big: string; small?: string }) => (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 }}>
      <Rise delay={0} y={8} ms={300}><Kicker color={c.acc2}>{L.setup.stepKicker(step + 1, TOTAL, STEPS[step])}</Kicker></Rise>
      <Rise delay={70} y={16} ms={420}><T size={36} ls={-1.1} lh={40} style={{ marginTop: 6 }}>{big}</T></Rise>
      {!!small && <Rise delay={170} y={10} ms={420}><T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 10 }}>{small}</T></Rise>}
    </View>
  ), [step, L, H]);
  const guard = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); try { await fn(); } catch (e: any) { setErr(e.message ?? L.common.error); } setBusy(false); };

  const price = priceOf(goal);
  const paidAtSign = goal !== 7 && canBuy && !bill?.demo;

  return (
    <Screen>
      <StepProgress step={step} total={TOTAL} />
      {step === 0 && <TopChips onGuardian={() => app.set({ role: 'guardian' })} />}
      {step > 0 ? <Back onPress={() => { setDir(-1); setHold(0); setErr(''); if (viaLogin && step === 7) { setViaLogin(false); setStep(0); } else setStep(step - 1); }} /> : <View style={{ height: 64 }} />}
      <StepTransition k={step} dir={dir}>
      {step === TOTAL - 1 ? (
        // Video adımı: tam ekran kayıt alanı + imza çubuğu
        <>
          <View style={{ paddingHorizontal: 16 }}><Kicker color={c.acc2}>{L.setup.stepKicker(step + 1, TOTAL, STEPS[step])}</Kicker><T size={32} ls={-1} lh={36} style={{ marginTop: 4 }}>{L.setup.vowTitle}</T></View>
          <VowRecorder script={script} onChange={v => { setVow(v); setHold(0); }} />
        </>
      ) : (
      <Body>
        {step === 0 && <>
          <Head big={L.setup.typesTitle} small={H.intro} />
          {notice
            ? <T w="s" size={15} lh={21} color={c.acc2} style={{ paddingHorizontal: 16, paddingBottom: 12 }}>{L.setup.loggedInNoPact}</T>
            : !loggedIn && <TextLink label={L.setup.haveAccount} onPress={() => { setDir(1); setViaLogin(true); setStep(7); }} />}
          {Object.entries(H.types).map(([x, label], i) => <Opt delay={120 + i * 50} key={x} label={label} on={types.includes(x)} onPress={() => setTypes(toggle(types, x))} />)}
          <Why src={H.introSrc}>{H.introScience}</Why>
        </>}

        {step === 1 && <>
          <Head big={L.setup.triggersTitle} small={H.whenSmall} />
          {Object.entries(H.when).map(([x, label], i) => <Opt delay={120 + i * 50} key={x} label={label} on={when.includes(x)} onPress={() => setWhen(toggle(when, x))} />)}
          <View style={{ paddingTop: 16 }}>
            <Field label={L.setup.lossLabel(currencySymbol(L))} placeholder={L.setup.lossPh} keyboardType="numeric" value={loss} onChangeText={setLoss} />
            <T w="r" size={13} lh={18} color={c.dim} style={{ paddingHorizontal: 16, marginBottom: 12 }}>{L.setup.lossNote}</T>
            <Field label={L.setup.planLabel(when[0] ? H.when[when[0]] ?? when[0] : undefined)} placeholder={H.planPh} value={plan} onChangeText={setPlan} multiline style={{ minHeight: 76 }} />
          </View>
          <Why src={H.whenSrc}>{H.whenScience}</Why>
        </>}

        {step === 2 && <>
          <Head big={L.setup.reasonTitle} small={L.setup.reasonSmall} />
          <Field multiline placeholder={L.setup.reasonPh} value={reason} onChangeText={setReason} />
          <Why src={L.setup.reasonSrc}>{L.setup.reasonScience}</Why>
        </>}

        {step === 3 && <>
          <Head big={L.setup.guardiansTitle} small={H.guardiansSmall} />
          {!solo && gs.map((g, i) => {
            // Kapalı kart: boşsa "eklemek için dokun", doluysa özet; hatalıysa kil kenar + kısa uyarı (ilerleyememenin sebebi görünür kalsın)
            const used = !!(g.name.trim() || g.email.trim());
            const bad = used && (!g.name.trim() || !EMAIL.test(g.email.trim()) || !!emailErr(g, i));
            if (openG !== g.id) return (
              <Pressable key={g.id} onPress={() => setOpenG(g.id)} accessibilityRole="button" accessibilityLabel={`${L.setup.keyLabel(i + 1, i >= 1)}. ${used ? [g.name.trim(), g.email.trim()].filter(Boolean).join(' · ') : L.setup.tapToAdd}`}>
                <View style={[pebble(64, g.id), { marginHorizontal: 16, marginVertical: 5, minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 22, paddingRight: 18, borderWidth: 2, borderColor: bad ? c.clay : c.line, backgroundColor: used ? c.sageWash : c.surf }]}>
                  <View style={{ flex: 1 }}>
                    <Kicker color={c.dim}>{L.setup.keyLabel(i + 1, i >= 1)}</Kicker>
                    <T w={used ? 'b' : 's'} size={used ? 17 : 15} color={used ? c.fg : c.act} numberOfLines={1} style={{ marginTop: 4 }}>{used ? [g.name.trim(), g.email.trim()].filter(Boolean).join(' · ') : L.setup.tapToAdd}</T>
                    {bad && <T w="s" size={13} color={c.acc2} style={{ marginTop: 2 }}>{L.setup.invalidShort}</T>}
                  </View>
                  {used ? <T w="s" size={14} color={c.dim} style={{ marginLeft: 12 }}>{L.setup.edit}</T> : <View style={{ marginLeft: 12 }}><PlusMark /></View>}
                </View>
              </Pressable>
            );
            return (
              <View key={g.id} style={[pebble(72, g.id), { marginHorizontal: 16, marginVertical: 5, paddingVertical: 6, borderWidth: 2, borderColor: c.act, backgroundColor: c.surf }]}>
                <Pressable onPress={() => setOpenG(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel={L.setup.collapse} style={{ minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22 }}>
                  <Kicker color={c.dim}>{L.setup.keyLabel(i + 1, i >= 1)}</Kicker>
                  <T w="s" size={14} color={c.act}>{L.setup.collapse}</T>
                </Pressable>
                <Field placeholder={L.setup.phName} value={g.name} onChangeText={t => setGs(gs.map(x => x.id === g.id ? { ...x, name: t } : x))} />
                {!!nameErr(g) && <T w="s" size={13} color={c.acc2} style={{ paddingHorizontal: 22, marginTop: -4, marginBottom: 6 }}>{nameErr(g)}</T>}
                <Field placeholder={L.setup.phEmail} keyboardType="email-address" autoCapitalize="none" value={g.email} onChangeText={t => setGs(gs.map(x => x.id === g.id ? { ...x, email: t } : x))} style={emailErr(g, i) ? { borderColor: c.clay } : undefined} />
                {!!emailErr(g, i) && <T w="s" size={13} lh={18} color={c.acc2} style={{ paddingHorizontal: 22, marginTop: -4, marginBottom: 6 }}>{emailErr(g, i)}</T>}
                <Field placeholder={L.setup.phPhone} keyboardType="phone-pad" value={g.phone} onChangeText={t => setGs(gs.map(x => x.id === g.id ? { ...x, phone: t } : x))} />
              </View>
            );
          })}
          {dupEmail && <T w="s" size={13} lh={18} color={c.acc2} style={{ paddingHorizontal: 16, paddingTop: 6 }}>{L.setup.dupNote}</T>}
          <View style={{ paddingTop: 10 }}>
            {!solo && <Opt label={L.setup.hideOpt} sub={L.setup.hideOptSub} on={hideHabit} onPress={() => setHideHabit(!hideHabit)} />}
            <Opt label={L.setup.soloOpt} sub={L.setup.soloOptSub} on={solo} onPress={() => setSolo(!solo)} />
          </View>
          {solo && <T w="r" size={14} lh={20} color={c.dim} style={{ paddingHorizontal: 16, paddingTop: 10 }}>{L.setup.soloNote}</T>}
          <Why src={L.setup.guardiansSrc}>{H.guardiansScience}</Why>
        </>}

        {step === 4 && <>
          <Head big={L.setup.packTitle} small={L.setup.packSmall} />
          <Opt delay={120} label={L.packs.trial} sub={L.packs.trialSub} on={goal === 7} onPress={() => setGoal(7)} />
          {/* Tek seferlik damgası fiyatlardan önce görünür */}
          {canBuy && <Rise delay={170} y={10}><OneTimeStamp text={L.packs.oneTime} /></Rise>}
          <View accessibilityRole="radiogroup" style={packRow ? { paddingHorizontal: 16, paddingTop: 10 } : { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 10 }}>
            {PAID.map((d, i) => (
              <Rise key={d} delay={220 + i * 70} y={10} style={packRow ? undefined : { flex: 1 }}>
                <PackPick d={d} variant={i} name={L.plan.tier[d]} days={L.plan.tierDays(d)} price={priceOf(d)} soon={!canBuy} soonLabel={L.packs.soon}
                  on={goal === d} onPress={() => setGoal(d)} row={packRow} />
              </Rise>
            ))}
          </View>
          <T w="r" size={14} lh={20} color={c.dim} style={{ paddingHorizontal: 16, paddingTop: 12 }}>{L.setup.packSub}</T>
          {(bill?.demo || !canBuy) && <T w="r" size={14} lh={20} color={c.dim} style={{ paddingHorizontal: 16, paddingTop: 10 }}>{bill?.demo ? L.setup.demoNote : L.setup.soonNote}</T>}
          <Why src={L.setup.packSrc}>{L.setup.packScience}</Why>
        </>}

        {step === 5 && <>
          <Head big={H.consequencesTitle} small={L.setup.consequencesSmall} />
          <Rise delay={140}>
            <PaperCard seed="consequences" tilt={0.7}>
              <PaperLine>{L.setup.consequence1}</PaperLine>
              <PaperLine>{L.setup.consequence2}</PaperLine>
              <PaperLine last>{L.setup.consequence3}</PaperLine>
            </PaperCard>
          </Rise>
          <Why src={L.setup.consequencesSrc}>{L.setup.consequencesScience}</Why>
        </>}

        {step === 6 && <>
          <Head big={L.setup.letterTitle} small={H.letterSmall} />
          <Field multiline placeholder={H.letterPh} value={letter} onChangeText={setLetter} />
          <Why src={L.setup.letterSrc}>{L.setup.letterScience}</Why>
        </>}

        {step === 7 && <>
          <Head big={L.setup.accountTitle} small={L.setup.accountSmall} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 28 }}>
              <Dot color={net === 'ok' ? c.act : net === 'fail' ? c.clay : c.edge} />
              <T w="s" size={14} color={net === 'fail' ? c.acc2 : c.dim}>{net === 'ok' ? L.setup.netOk : net === 'fail' ? L.setup.netFail : L.setup.netChecking}</T>
            </View>
            {net === 'fail' && <T w="r" size={14} lh={20} color={c.dim} style={{ marginTop: 4 }}>{L.setup.netHelp(API_URL, __DEV__)}</T>}
            {__DEV__ && <T w="r" size={13} color={c.dim} style={{ marginTop: 4, fontFamily: F.mono }}>API: {API_URL}</T>}
          </View>
          {loggedIn && selfGuardian && <T w="s" size={14} lh={20} color={c.acc2} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{L.setup.selfGuardianErr(selfEmail)}</T>}
          {loggedIn ? <View style={{ paddingHorizontal: 16 }}><Kicker color={c.acc2}>{L.setup.loggedIn}</Kicker><T size={18} style={{ marginTop: 4 }}>{app.email || email}</T></View> : <>
            <Field label={L.setup.nameLabel} placeholder={L.setup.namePh} value={acctName} onChangeText={setAcctName} />
            <Field label={L.setup.emailLabel} placeholder={L.setup.emailPh} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} editable={!codeSent} />
            {codeSent && <Field label={L.setup.codeLabel} placeholder="123456" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />}
            {!!err && <T w="s" size={14} color={c.acc2} style={{ paddingHorizontal: 16 }}>{err}</T>}
            {!codeSent
              ? <ActionBar label={L.setup.sendCode} disabled={busy || !EMAIL.test(email.trim()) || acctName.trim().length < 2} height={60} size={19} onPress={() => guard(async () => { await srv.requestCode(email.trim().toLowerCase(), acctName.trim()); setCodeSent(true); })} />
              : <ActionBar label={L.setup.verify} disabled={busy || code.length !== 6} height={60} size={19} onPress={() => guard(async () => { await srv.verify(email.trim().toLowerCase(), code, acctName.trim()); })} />}
            {codeSent && <ActionBar label={L.setup.otherEmail} right="" kind="ghost" height={60} size={19} onPress={() => { setCodeSent(false); setCode(''); setErr(''); }} />}
          </>}
        </>}

        {step === 8 && <>
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <Kicker color={c.acc2}>{L.setup.contractKicker(goal)}</Kicker>
            <T size={38} ls={-1.1} lh={42} style={{ marginTop: 6 }}>{H.contractTitle}</T>
          </View>
          <PaperCard seed="contract" tilt={-0.8}>
            <PaperLine>{H.contract1}</PaperLine>
            <PaperLine>{solo ? H.contract2Solo : H.contract2}</PaperLine>
            <PaperLine last>{solo ? L.setup.contract3Solo : L.setup.contract3(names, need)}</PaperLine>
          </PaperCard>
          {/* Paket damgası: gün sayısı, ad, (Play'den gelen) fiyat ve "tek seferlik" notu imzadan önce görünür */}
          <PaperCard seed="stamp" tilt={1} pad={16} mx={40}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Kicker color={c.dim}>{L.setup.packKicker}</Kicker>
                <T size={40} ls={-1.2} lh={46} style={{ marginTop: 2 }}>{L.setup.packDays(goal)}</T>
                <T w="s" size={15} color={c.dim} style={{ marginTop: 2 }}>{goal === 7 ? L.setup.packTrialKind : L.plan.tier[goal] ?? ''}</T>
                {paidAtSign && !!price && <T size={26} lh={32} style={{ marginTop: 8 }}>{price}</T>}
              </View>
              {goal !== 7 && <View style={{ marginLeft: 8 }}><TierPlant d={goal} height={84} /></View>}
            </View>
          </PaperCard>
          {paidAtSign && <OneTimeStamp text={L.packs.oneTime} />}
          {(trialBlocked || bill?.demo) && <T w="r" size={14} lh={20} color={trialBlocked ? c.acc2 : c.dim} style={{ paddingHorizontal: 16, paddingTop: 6 }}>{trialBlocked ? (canBuy ? L.setup.trialUsed : L.setup.trialUsedSoon) : L.setup.demoShort}</T>}
          <View style={{ paddingTop: 14 }}>
            <Field label={L.setup.signLabel} placeholder={L.setup.signPh} value={sign} onChangeText={setSign} style={{ fontFamily: F.hand, fontSize: 30, paddingVertical: 8 }} />
            <CheckRow on={consent} onPress={() => setConsent(!consent)}>{L.setup.consent}</CheckRow>
          </View>
          <Why src={H.contractSrc}>{H.contractScience}</Why>
        </>}
        <View style={{ flex: 1, minHeight: 12 }} />
      </Body>
      )}
      </StepTransition>

      {step === 3 && !valid && (
        <T w="s" size={14} lh={19} color={c.acc2} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          {dupEmail ? L.setup.dupBottom : filled.length === 0 ? L.setup.guardiansOrSolo : L.setup.guardiansInvalid}
        </T>
      )}
      {step < TOTAL - 2 && <ActionBar label={L.common.continue} disabled={!valid} onPress={() => { setDir(1); setStep(step + 1); }} />}
      {step === TOTAL - 2 && <ActionBar label={L.setup.toVideo} disabled={!valid} onPress={() => { setDir(1); setStep(step + 1); }} />}
      {step === TOTAL - 1 && <>
        {!!err && <T w="s" size={14} color={c.acc2} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>{err}</T>}
        <T w="r" size={15} color={c.dim} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>{busy ? L.setup.signing : vow ? L.setup.holdWithVow : L.setup.holdNoVow}</T>
        {paidAtSign && !busy && <T w="r" size={14} lh={19} color={c.dim} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{L.setup.payAtSign}</T>}
        {/* Video isteğe bağlı: videosuz da imzalanabilir. Tutma sayacı yukarıdaki aralıkta; burası yalnız görünüm + haptik. */}
        <SignHold label={L.setup.hold} doneLabel={L.setup.vowMade} pct={hold} busy={busy} onDown={() => { holding.current = true; tick(); }} onUp={() => { holding.current = false; }} />
      </>}
    </Screen>
  );
}
