import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Animated, AppState, useWindowDimensions } from 'react-native';
import { useApp } from '../store';
import { Screen, Body, ActionBar, T } from '../components/ui';
import { useL } from '../i18n';
import { c, pebble } from '../theme';
import type { Go } from '../nav';
import { ND, EASE, dur } from '../components/motion';
import { stageFor } from '../art/plant';
import { HomeScene, HOME_SCENE_MIN_H, claimIntro, gardenCounts, gardenStates, hardDays, whyLabel, DAY_MS } from '../garden';
import { ChipBtn, DotsBtn, Dock, MoreSheet, type SheetRow } from '../garden/HomeParts';
import { Chev } from '../components/PaperKit';
import { useShield } from '../useShield';
import { shieldOn } from '../../modules/shield';

// Exit.tsx de kullanıyor: değişmeden kalır.
export function useNow(step = 30000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), step); return () => clearInterval(t); }, [step]);
  return n;
}
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

/**
 * Bugünün paket günü ve takvim günü anahtarı. 15 sn'de bir yeniden çizmek yerine yalnızca gün DEĞİŞİNCE (ve uygulama öne gelince)
 * durum güncellenir; boşta Home yeniden çizilmez. Gün hesabı eskisiyle aynı (geçen 24 sa dilimi).
 */
function useGardenDay(startedAt: number) {
  const calc = () => { const n = Date.now(); return { n, day: Math.floor((n - startedAt) / DAY_MS) + 1, key: dayKey(n) }; };
  const [st, setSt] = useState(calc);
  useEffect(() => {
    const tick = () => setSt(p => { const q = calc(); return q.day === p.day && q.key === p.key ? p : q; });
    tick();
    const t = setInterval(tick, 30000);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') tick(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [startedAt]);
  return st;
}

export default function Home({ go }: { go: Go }) {
  const a = useApp();
  const L = useL(), H = L.home;
  const { height } = useWindowDimensions();
  const [more, setMore] = useState(false);
  const sh = useShield(); // bahis engeli (yalnız Android uygulaması)
  const st = useGardenDay(a.startedAt);
  const goal = a.goalDays;
  const day = Math.max(1, Math.min(goal, st.day));
  const completed = a.pactStatus === 'completed'; // ücretsiz mod: pakt bitti, paket bekleniyor
  const done = completed || a.checkIns.some(t => dayKey(t) === st.key) || (a.lastCheckIn > 0 && dayKey(a.lastCheckIn) === st.key);
  // Zor (tekrar oynama) günleri: yaprak silinmez, kenarı kıvrılır
  const hard = useMemo(() => hardDays(a.relapses, a.startedAt, goal), [a.relapses, a.startedAt, goal]);
  // Sahne durumları store'dan: geçen gün done, zor gün curl, kaçırılan gün rest, bugün today (kontrol yapıldıysa done), sonrası future
  const states = useMemo(() => gardenStates({ goal, day, done, hard, checkIns: a.checkIns, startedAt: a.startedAt }), [goal, day, done, hard, a.checkIns, a.startedAt]);
  const counts = gardenCounts(goal, day, done, hard);
  // Neden etiketi: yalnız kısa (en çok 3 sözcük) metin; uzun/kişisel metin sahnede gösterilmez (eski davranış korunur)
  const why = useMemo(() => whyLabel(a.reason), [a.reason]);
  const labels = useMemo(() => ({ today: H.note, why }), [H.note, why]);
  // Yaprakların sırayla belirmesi: takvim gününde ilk girişte bir kez; sonra durağan. Mount boyunca sabit.
  const [intro] = useState(() => claimIntro(st.key));
  const trialLeft = !completed && goal <= 7 ? goal - day : 99;

  // Gün sayısı yerleşir (0'dan sayma yok): 600 ms ölçek .94 → 1
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { const t = Animated.timing(pop, { toValue: 1, duration: dur(600), easing: EASE, useNativeDriver: ND }); t.start(); return () => t.stop(); }, []);
  const numSize = height < 680 ? 72 : height < 780 ? 88 : 112; // küçük ekranda 88 px; çok kısa ekranda 72

  const nav = (s: Parameters<Go>[0]) => () => { setMore(false); go(s); };
  const rows: SheetRow[] = [];
  if (!completed) rows.push({ key: 'plan', label: H.myPack, icon: 'pack', onPress: nav('plan') });
  if (!completed) rows.push({ key: 'relapse', label: H.relapse, onPress: nav('relapse') });
  if (!completed) rows.push({ key: 'exit', label: H.exit, onPress: nav('exit') });
  if (sh) rows.push({ key: 'shield', label: L.shield.more, onPress: nav('shield') });
  if (!a.vowUri) rows.push({ key: 'vow', label: H.vow, onPress: nav('vow') });
  rows.push({ key: 'guardian', label: H.asGuardian, onPress: () => { setMore(false); a.set({ role: 'guardian' }); } });

  const sentence = completed ? H.completed : done ? H.done : H.due;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 2 }}>
        <ChipBtn label={H.me} a11y={L.chips.profile} icon="profile" onPress={() => go('profile')} />
        <DotsBtn a11y={H.more} onPress={() => setMore(true)} />
      </View>
      <Body>
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 26, flexDirection: 'row', alignItems: 'flex-end' }}>
            <Animated.View style={{ opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
              <T size={numSize} ls={-2} maxFontSizeMultiplier={1} style={{ lineHeight: Math.round(numSize * 1.02) }} accessibilityLabel={`${H.day} ${day} / ${goal}`}>{day}</T>
            </Animated.View>
            <View style={{ paddingBottom: 12, marginLeft: 12 }}>
              <T w="s" size={17} color={c.dim}>{H.day}</T>
              <T size={30} color={c.dim} maxFontSizeMultiplier={1.2}>/{goal}</T>
            </View>
          </View>
          <T w="s" size={20} lh={26} color={c.dim} style={{ paddingHorizontal: 28, marginTop: 2 }}>{sentence}</T>

          <HomeScene
            style={{ flex: 1, minHeight: HOME_SCENE_MIN_H, marginTop: 4 }}
            goalDays={goal} dayStates={states} intro={intro} labels={labels}
            accessibilityLabel={H.a11y(day, goal, H.stage[stageFor(goal)], counts.tulips, counts.curled)}
          />

          {/* Bahis engeli: kullanıcı açmışken kapandıysa kil uyarı; hiç açılmadıysa ekran bir kez görülene dek davet */}
          {!!sh && !completed && (sh.wanted ? !shieldOn(sh) : !a.shieldSeen) && (
            <Pressable onPress={() => go('shield')} accessibilityRole="button" style={[pebble(60, 'shield'), { marginHorizontal: 16, marginTop: 8, minHeight: 56, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: sh.wanted ? c.clay : c.edge, backgroundColor: sh.wanted ? c.clayWash : c.surf }]}>
              <View style={{ flex: 1 }}>
                <T w="s" size={16} lh={21} color={sh.wanted ? c.clay : c.fg}>{sh.wanted ? L.shield.homeOff : L.shield.homeCta}</T>
                <T w="r" size={14} lh={19} color={c.dim}>{sh.wanted ? L.shield.homeOffSub : L.shield.homeCtaSub}</T>
              </View>
              <Chev color={sh.wanted ? c.clay : c.dim} />
            </Pressable>
          )}
          {trialLeft <= 2 && (
            <Pressable onPress={() => go('plan')} accessibilityRole="button" style={[pebble(60, 'trial'), { marginHorizontal: 16, marginTop: 8, minHeight: 56, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: c.edge, backgroundColor: c.surf }]}>
              <T w="s" size={16} lh={21} style={{ flex: 1 }}>{trialLeft <= 0 ? H.trialLastDay : H.trialLeft(trialLeft)}</T>
              <T w="b" size={16} color={c.act} style={{ marginLeft: 12 }}>{H.myPack}</T>
            </Pressable>
          )}

          {completed
            ? <ActionBar label={H.myPack} height={68} onPress={() => go('plan')} />
            : done
              ? <ActionBar label={H.checkDone} kind="ghost" height={68} right="" disabled onPress={() => {}} />
              : <ActionBar label={H.check} height={68} onPress={() => go('verify')} />}

          <Dock items={[
            { key: 'calm', label: H.calm, glyph: 'calm', onPress: () => go('calm') },
            { key: 'journal', label: H.journal, glyph: 'journal', onPress: () => go('journal') },
            { key: 'guardians', label: H.witnesses, glyph: 'witness', onPress: () => go('guardians') },
          ]} />
        </View>
      </Body>
      {/* Krizdeyim: kaydırma alanının DIŞINDA, tam genişlik, 84 dp, her zaman görünür */}
      <ActionBar label={H.crisis} kind="red" height={84} size={30} glow hoverRed={false} onPress={() => go('crisis')} />
      <MoreSheet visible={more} rows={rows} closeLabel={H.close} onClose={() => setMore(false)} />
    </Screen>
  );
}
