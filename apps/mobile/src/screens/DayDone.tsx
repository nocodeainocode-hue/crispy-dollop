import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { useApp } from '../store';
import { Screen, Body, ActionBar, T } from '../components/ui';
import { ND, EASE, dur } from '../components/motion';
import { useL } from '../i18n';
import { dayMessage } from '../dayMessage';
import { c, pebble } from '../theme';
import { GardenScene, tulipNo } from '../garden';

const DAY = 86400000;

/**
 * Günlük kontrol kaydedilince: sakin bir yaprak açılışı (her 7. günde lale). Gecikme, asma, halka, parıltı, konfeti yok.
 * Kişiye özel tek cümle ve (isteğe bağlı) "bugün seni ne tuttu?" cevabı (Günlük'e "dayandım" olarak düşer).
 * `notice`: sunucuya gönderilemediyse görünür uyarı.
 */
export default function DayDone({ urge, onDone, notice }: { urge: number | null; onDone: (helper: string) => void; notice?: string | null }) {
  const a = useApp();
  const L = useL();
  const [helper, setHelper] = useState('');
  const now = Date.now();
  const goal = a.goalDays;
  const day = Math.max(1, Math.min(goal, Math.floor((now - a.startedAt) / DAY) + 1));
  const streak = Math.max(1, Math.min(day, Math.floor((now - (a.streakStartedAt || a.startedAt)) / DAY) + 1));
  const msg = useMemo(() => dayMessage(L, { streak, day, goal, urge, triggerTimes: a.triggerTimes, reason: a.reason, letter: a.letter, now: new Date(now) }), [L]);
  const hard = useMemo(() => [...new Set(a.relapses.map(t => Math.floor((t - a.startedAt) / DAY) + 1).filter(d => d >= 1 && d <= goal))].sort((x, y) => x - y), [a.relapses, a.startedAt, goal]);
  const tulip = tulipNo(day);

  // Bugünün yaprağı (7. günde lale): 1,6 sn, ölçek + opaklık, aşma yok. Hareketi azalt açıksa doğrudan açık.
  const open = useRef(new Animated.Value(dur(1) ? 0 : 1)).current;
  useEffect(() => {
    const t = Animated.timing(open, { toValue: 1, duration: dur(1600), easing: EASE, useNativeDriver: ND });
    t.start();
    return () => t.stop();
  }, []);

  return (
    <Screen>
      <Body>
        <View style={{ flex: 1 }}>
          <GardenScene style={{ flex: 1, minHeight: 240 }} goal={goal} day={day} doneToday hard={hard} opening={open} pulse={false}
            a11yLabel={tulip ? L.done.tulip(tulip) : L.done.leaf} />
          <View style={{ paddingHorizontal: 24, paddingTop: 14 }}>
            <T size={44} ls={-1} lh={50} maxFontSizeMultiplier={1.3}>{L.done.title(day)}</T>
            {tulip > 0 && <T size={26} lh={32} style={{ marginTop: 2 }}>{L.done.tulip(tulip)}</T>}
            <T w="s" size={18} lh={25} color={c.dim} style={{ marginTop: 8 }}>{msg}</T>
            {!!notice && (
              <View accessibilityRole="alert" style={[pebble(60, 'notice'), { marginTop: 14, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: c.clayWash }]}>
                <T w="s" size={15} lh={21}>{notice}</T>
              </View>
            )}
          </View>
          <T w="b" size={16} color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 6 }}>{L.done.helpQ}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingBottom: 14 }}>
            {Object.entries(L.done.chips).map(([k, label]) => {
              const on = helper === k;
              return (
                <Pressable key={k} onPress={() => setHelper(on ? '' : k)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={L.done.helpers[k] ?? label}
                  style={[pebble(48, k), { minHeight: 48, margin: 4, paddingHorizontal: 18, justifyContent: 'center', borderWidth: 2, borderColor: on ? c.act : c.line, backgroundColor: on ? c.sageWash : c.surf }]}>
                  <T w="b" size={16} lh={20}>{label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Body>
      <ActionBar label={L.common.backToPanel} onPress={() => onDone(helper)} />
    </Screen>
  );
}
