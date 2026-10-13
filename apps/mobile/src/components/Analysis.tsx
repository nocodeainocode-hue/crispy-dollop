import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { T, Kicker, Hair } from './ui';
import { Rise } from './motion';
import { c } from '../theme';
import type { Entry } from '../store';
import type { Go } from '../nav';
import { useL, useH, entryLabel, isTrigger } from '../i18n';

const DAY = 86400000;
const BLOCKS: [number, number][] = [[0, 6], [6, 12], [12, 18], [18, 24]];

function Bars({ rows, color = c.fg }: { rows: [string, number][]; color?: string }) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return (
    <View>
      {rows.map(([label, n]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 5 }}>
          <T w="s" size={12} color={c.dim} style={{ width: 110 }}>{label}</T>
          <View style={{ flex: 1, height: 10, backgroundColor: c.tint(0.1) }}><View style={{ width: `${(n / max) * 100}%`, height: '100%', backgroundColor: n ? color : 'transparent' }} /></View>
          <T size={13} style={{ width: 28, textAlign: 'right' }}>{n}</T>
        </View>
      ))}
    </View>
  );
}

const top = (xs: string[], n = 5): [string, number][] => {
  const m: Record<string, number> = {};
  xs.filter(Boolean).forEach(x => { m[x] = (m[x] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
};

/**
 * Detaylı tetik analizi (paketle açılır). Veri, yalnızca telefondaki Günlük kayıtlarından hesaplanır.
 * Ücretsiz denemede kilitli bir tanıtım kartı gösterilir.
 */
export default function Analysis({ entries, pack, go }: { entries: Entry[]; pack: boolean; go: Go }) {
  const L = useL(), H = useH();
  const data = useMemo(() => {
    const risky = entries.filter(e => e.kind !== 'iyi'); // tetik, kriz, oynadım
    const blocks = BLOCKS.map(([a, b], i) => [L.analysis.blocks[i], risky.filter(e => { const h = new Date(e.at).getHours(); return h >= a && h < b; }).length] as [string, number]);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * DAY);
      const k = d.toDateString();
      return [L.analysis.weekdays[d.getDay()], entries.filter(e => new Date(e.at).toDateString() === k).length] as [string, number];
    });
    const named = (rows: [string, number][]) => rows.map(([k, n]) => [entryLabel(k, H, L), n] as [string, number]);
    return { blocks, days, triggers: named(top(entries.map(e => e.trigger).filter(isTrigger))), moods: named(top(entries.map(e => e.mood))), helpers: top(entries.map(e => e.helper ?? '')).map(([k, n]) => [L.done.helpers[k] ?? k, n] as [string, number]), resisted: entries.filter(e => e.kind === 'iyi').length, total: entries.length };
  }, [entries, L, H]);

  if (!pack) {
    return (
      <Pressable onPress={() => go('plan')} style={{ marginHorizontal: 16, marginTop: 18, borderWidth: 1, borderColor: c.line, padding: 14 }}>
        <Kicker color={c.acc2}>{L.analysis.lockedKicker}</Kicker>
        <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 6 }}>{L.analysis.lockedBody}</T>
        <T w="s" size={13} color={c.acc2} style={{ marginTop: 8 }}>{L.analysis.cta}</T>
      </Pressable>
    );
  }
  return (
    <Rise delay={80}>
      <Kicker color={c.acc2} style={{ padding: 16, paddingBottom: 8 }}>{L.analysis.title}</Kicker>
      <Hair />
      {data.total === 0 ? <T w="r" size={13} color={c.dim} style={{ padding: 16 }}>{L.analysis.empty}</T> : <>
        <Kicker color={c.dim} style={{ padding: 16, paddingBottom: 4 }}>{L.analysis.hours}</Kicker>
        <Bars rows={data.blocks} color={c.acc2} />
        <Kicker color={c.dim} style={{ padding: 16, paddingBottom: 4, paddingTop: 14 }}>{L.analysis.triggers}</Kicker>
        {data.triggers.length ? <Bars rows={data.triggers} /> : <T w="r" size={12} color={c.dim} style={{ paddingHorizontal: 16 }}>{L.analysis.triggersEmpty}</T>}
        <Kicker color={c.dim} style={{ padding: 16, paddingBottom: 4, paddingTop: 14 }}>{L.analysis.moods}</Kicker>
        {data.moods.length ? <Bars rows={data.moods} /> : <T w="r" size={12} color={c.dim} style={{ paddingHorizontal: 16 }}>{L.analysis.moodsEmpty}</T>}
        <Kicker color={c.dim} style={{ padding: 16, paddingBottom: 4, paddingTop: 14 }}>{L.analysis.helpers}</Kicker>
        {data.helpers.length ? <Bars rows={data.helpers} color={c.fg} /> : <T w="r" size={12} color={c.dim} style={{ paddingHorizontal: 16 }}>{L.analysis.helpersEmpty}</T>}
        <Kicker color={c.dim} style={{ padding: 16, paddingBottom: 4, paddingTop: 14 }}>{L.analysis.last7}</Kicker>
        <Bars rows={data.days} />
        <T w="s" size={12.5} style={{ padding: 16 }}>{L.analysis.resisted}<T size={12.5}>{data.resisted}</T>{L.analysis.total}<T size={12.5}>{data.total}</T></T>
      </>}
    </Rise>
  );
}
