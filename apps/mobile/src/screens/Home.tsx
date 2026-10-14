import React, { useEffect, useState } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { useApp } from '../store';
import { Screen, Body, ActionBar, T, Kicker, Hair, TopChips } from '../components/ui';
import { useL, useH, money } from '../i18n';
import { c } from '../theme';
import type { Go } from '../nav';
import { useShield } from '../useShield';
import { Rise, useCountUp, useIntro, usePulse } from '../components/motion';

export function useNow(step = 30000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), step); return () => clearInterval(t); }, [step]);
  return n;
}
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

export default function Home({ go }: { go: Go }) {
  const a = useApp();
  const L = useL(), H = useH();
  const intro = useIntro(1400, 300); // hücre ızgarasının dalga gibi dolması
  const pulse = usePulse(700); // bugünün hücresinin nabzı
  const now = useNow(15000);
  const goal = a.goalDays;
  const shownDay = useCountUp(Math.min(goal, Math.floor((Date.now() - a.startedAt) / 86400000) + 1));
  const day = Math.min(goal, Math.floor((now - a.startedAt) / 86400000) + 1);
  // Tekrar oynanan günler silinmez, işaretlenir; paket süresi sabit, temiz seri ayrı
  const relapseDays = new Set(a.relapses.map(t => Math.floor((t - a.startedAt) / 86400000) + 1));
  const streak = Math.max(1, Math.min(day, Math.floor((now - (a.streakStartedAt || a.startedAt)) / 86400000) + 1));
  const completed = a.pactStatus === 'completed'; // ücretsiz mod: pakt bitti, paket bekleniyor
  const done = a.checkIns.some(t => dayKey(t) === dayKey(now)) || (a.lastCheckIn > 0 && dayKey(a.lastCheckIn) === dayKey(now));
  const due = !done; // günlük kontrol günde bir kez
  const accepted = a.guardians.filter(g => g.status === 'accepted').length;
  const need = Math.min(2, accepted);

  const Link = ({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) => (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderColor: c.line }}>
      <T w="s" size={12.5} color={accent ? c.acc2 : c.dim}>{label}</T><T w="s" size={12.5} color={accent ? c.acc2 : c.dim}>→</T>
    </Pressable>
  );

  return (
    <Screen>
      <TopChips onGuardian={() => a.set({ role: 'guardian' })} onProfile={() => go('profile')} />
      <Body>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
          <View>
            <Kicker>{L.home.dayKicker(a.name)}</Kicker>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <T size={92} ls={-5.5} lh={92} style={{ textShadowColor: 'rgba(236,48,19,.7)', textShadowRadius: 28 }}>{shownDay}</T>
              <T size={28} ls={-0.6} color={c.mute}> /{goal}</T>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T w="s" size={12} lh={16} style={{ textAlign: 'right' }}>{completed ? L.home.statusCompleted : done ? L.home.statusDone : L.home.statusNone}</T>
            <T w="s" size={12} color={c.acc2} style={{ marginTop: 2 }}>{L.home.cellsLeft(goal - day)}</T>
            {a.relapses.length > 0 && <T w="s" size={12} style={{ marginTop: 2 }}>{L.home.cleanStreak(streak)}</T>}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -1.5 }}>
          {Array.from({ length: goal }, (_, i) => {
            const d = i + 1, ms = d % 30 === 0, rel = relapseDays.has(d) && d <= day, past = d < day && !rel, cur = d === day;
            const t0 = Math.min(0.72, (i / goal) * 0.72); // her hücre sırayla belirir
            return (
              <Animated.View key={d} style={{ width: '10%', padding: 1.5, opacity: intro.interpolate({ inputRange: [t0, t0 + 0.28], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: intro.interpolate({ inputRange: [t0, t0 + 0.28], outputRange: [0.6, 1], extrapolate: 'clamp' }) }] }}>
                <View style={{ aspectRatio: 1, backgroundColor: past ? c.fg : cur ? c.acc : rel ? 'rgba(236,48,19,0.16)' : 'transparent', borderWidth: 1.5, borderColor: cur || rel ? c.acc : past ? c.fg : ms ? c.fg : c.cell, justifyContent: 'flex-end', padding: 2 }}>
                  {rel && <T size={13} color={cur ? c.ink : c.acc2} style={{ position: 'absolute', alignSelf: 'center', top: '18%' }}>✕</T>}
                  {ms && !rel && <T size={8} color={past ? c.ink : c.fg}>{d}</T>}
                  {cur && <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -1.5, right: -1.5, top: -1.5, bottom: -1.5, borderWidth: 2, borderColor: c.acc2, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }] }} />}
                </View>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, marginTop: 14 }}>
          <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRightWidth: 1, borderColor: c.line }}>
            <Kicker>{L.home.packKicker(goal)}</Kicker>
            <T size={28} ls={-0.8}>{L.home.daysLeft(Math.max(0, goal - day))}</T>
          </View>
          <Pressable onPress={() => { if (completed) go('plan'); else if (!done) go('verify'); }} style={{ flex: 1 }}>
            {({ hovered }: any) => (
              <View style={{ paddingVertical: 10, paddingHorizontal: 16, flex: 1, backgroundColor: hovered ? c.fg : 'transparent' }}>
                <Kicker color={hovered ? c.ink : due || completed ? c.acc2 : c.fg}>{completed ? L.home.packWaiting : due ? L.home.checkDue : L.home.checkTitle}</Kicker>
                <T size={15} color={hovered ? c.ink : c.fg} style={{ marginTop: 4 }}>{completed ? L.home.myPack : done ? L.home.doneToday : L.home.doNow}</T>
              </View>
            )}
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10 }}>
          <T w="s" size={12} color={c.dim}>{L.home.saved(a.monthlyLoss > 0 ? money(Math.round((a.monthlyLoss / 30) * Math.max(0, (now - a.startedAt) / 86400000)), L) : '—')}</T>
          <T w="s" size={12} color={c.dim}>{L.home.points(a.points)}</T>
        </View>
        <View style={{ flex: 1, minHeight: 14 }} />
        {!completed && a.goalDays <= 7 && goal - day <= 2 && (
          <Pressable onPress={() => go('plan')} style={{ marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(236,48,19,0.45)', backgroundColor: 'rgba(236,48,19,0.07)', padding: 12 }}>
            <Kicker color={c.acc2}>{goal - day <= 0 ? L.home.trialLastDay : L.home.trialLeft(goal - day)}</Kicker>
            <T w="r" size={12.5} lh={18} color={c.dim} style={{ marginTop: 4 }}>{L.home.trialBody}</T>
            <T w="s" size={12.5} color={c.acc2} style={{ marginTop: 6 }}>{L.home.myPack}</T>
          </Pressable>
        )}
        <Link label={L.home.packLink(a.goalDays)} accent={a.goalDays <= 7} onPress={() => go('plan')} />
        <Link label={a.guardians.length ? L.home.guardiansLink(accepted) : L.home.addGuardianLink} accent={accepted < 2} onPress={() => go('guardians')} />
        {!a.vowUri && <Link label={L.home.vowLink} onPress={() => go('vow')} />}
        <Link label={L.home.calmLink} onPress={() => go('calm')} />
        <Link label={L.home.journalLink} onPress={() => go('journal')} />
        {!completed && <Link label={H.relapseLink} onPress={() => go('relapse')} />}
        {!completed && <Link label={need ? L.home.exitLink(need) : L.home.exitLinkSolo} onPress={() => go('exit')} />}
      </Body>
      {!completed && <ShieldCard go={go} />}
      <ActionBar label={L.home.crisis} kind="red" height={84} size={30} glow hoverRed={false} onPress={() => go('crisis')} />
    </Screen>
  );
}

/** Bahis engeli şeridi (yalnızca Android uygulamasında): açıkken sakin bir bilgi, kapandıysa kırmızı uyarı, hiç açılmadıysa davet. */
function ShieldCard({ go }: { go: Go }) {
  const L = useL();
  const s = useShield();
  if (!s) return null;
  const on = s.running && !s.privateDnsBypass;
  const off = s.wanted && !on;
  return (
    <Pressable onPress={() => go('shield')} style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: off ? 'rgba(236,48,19,0.45)' : c.line, backgroundColor: off ? 'rgba(236,48,19,0.07)' : 'transparent', flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Kicker color={off ? c.acc2 : on ? c.dim : c.fg}>{on ? L.shield.homeOn(s.blockedToday) : off ? L.shield.homeOff : L.shield.homeCta}</Kicker>
        {!on && <T w="r" size={12} lh={17} color={c.dim} style={{ marginTop: 3 }}>{off ? L.shield.homeOffSub : L.shield.homeCtaSub}</T>}
      </View>
      <T w="s" size={14} color={off ? c.acc2 : c.dim}>→</T>
    </Pressable>
  );
}
