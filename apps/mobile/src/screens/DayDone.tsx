import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated } from 'react-native';
import { useApp } from '../store';
import { Screen, Body, ActionBar, Opt, T, Kicker, Hair } from '../components/ui';
import { ND, EASE, dur, Rise } from '../components/motion';
import { useL, money } from '../i18n';
import { dayMessage } from '../dayMessage';
import { c } from '../theme';

const DAY = 86400000;

/**
 * Günlük kontrol "oynamadım" ile bitince: bugünün hücresi dolar, kişiye özel tek cümle, korunan para
 * ve "bugün seni ne tuttu?" (cevap Günlük'e "dayandım" olarak düşer, analizde "sana iyi gelenler" çıkar).
 */
export default function DayDone({ urge, onDone }: { urge: number | null; onDone: (helper: string) => void }) {
  const a = useApp();
  const L = useL();
  const [helper, setHelper] = useState('');
  const now = Date.now();
  const day = Math.min(a.goalDays, Math.floor((now - a.startedAt) / DAY) + 1);
  const streak = Math.max(1, Math.min(day, Math.floor((now - (a.streakStartedAt || a.startedAt)) / DAY) + 1));
  const msg = useMemo(() => dayMessage(L, { streak, day, goal: a.goalDays, urge, triggerTimes: a.triggerTimes, reason: a.reason, letter: a.letter, now: new Date(now) }), [L]);
  const perDay = a.monthlyLoss > 0 ? a.monthlyLoss / 30 : 0;

  // Bugünün hücresi: küçükten büyüyüp kırmızıdan kemik rengine dolar
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fill, { toValue: 1, duration: dur(900), easing: EASE, useNativeDriver: false }).start(); }, []);
  const scale = fill.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4, 1.12, 1] });
  const bg = fill.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['rgba(236,48,19,0)', '#EC3013', c.fg] });

  return (
    <Screen>
      <Body>
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <Kicker color={c.acc2}>{L.done.kicker(day, a.goalDays)}</Kicker>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
            <Animated.View style={{ width: 64, height: 64, borderWidth: 2, borderColor: c.fg, backgroundColor: bg, transform: [{ scale }] }} />
            <T size={44} ls={-1.6} lh={44} style={{ marginLeft: 16, flex: 1 }}>{L.done.title(streak)}</T>
          </View>
          <Rise delay={500} y={10}><T w="s" size={17} lh={24} style={{ marginTop: 22 }}>{msg}</T></Rise>
          {perDay > 0 && <Rise delay={700} y={8}><T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 12 }}>
            {L.done.money(money(Math.round(perDay), L), money(Math.round(perDay * day), L))}
          </T></Rise>}
          <T w="r" size={11.5} color={c.mute} style={{ marginTop: 10 }}>{L.done.points}</T>
        </View>
        <Kicker color={c.acc2} style={{ paddingHorizontal: 16, paddingTop: 24 }}>{L.done.helpQ}</Kicker>
        <T w="r" size={12} lh={17} color={c.dim} style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 }}>{L.done.helpSub}</T>
        <Hair />
        {Object.entries(L.done.helpers).map(([k, label], i) => (
          <Opt key={k} delay={900 + i * 40} label={label} on={helper === k} onPress={() => setHelper(helper === k ? '' : k)} />
        ))}
        <View style={{ height: 16 }} />
      </Body>
      <ActionBar label={L.common.backToPanel} onPress={() => onDone(helper)} />
    </Screen>
  );
}
