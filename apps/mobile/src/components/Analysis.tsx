import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { T, Kicker } from './ui';
import { Rise } from './motion';
import { GIcon } from '../art/misc';
import { c, pebble } from '../theme';
import type { Entry } from '../store';
import type { Go } from '../nav';
import { useL, useH, entryLabel, isTrigger } from '../i18n';

const DAY = 86400000;
const BLOCKS: [number, number][] = [[0, 6], [6, 12], [12, 18], [18, 24]];

const Sec = ({ children, first }: { children: string; first?: boolean }) => <Kicker color={c.dim} style={{ paddingHorizontal: 24, paddingTop: first ? 8 : 20, paddingBottom: 8 }}>{children}</Kicker>;

/** Yatay çubuklar: zemin sageWash, dolgu token rengi; sayı yanında yazılı (renk tek başına bilgi taşımaz). */
function Bars({ rows, color = c.act }: { rows: [string, number][]; color?: string }) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return (
    <View>
      {rows.map(([label, n]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 6 }}>
          <T w="s" size={14} color={c.dim} style={{ width: 112 }} numberOfLines={2}>{label}</T>
          <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: c.sageWash, overflow: 'hidden' }}>
            <View style={{ width: `${(n / max) * 100}%`, height: 14, borderRadius: 7, backgroundColor: n ? color : 'transparent' }} />
          </View>
          <T w="b" size={15} style={{ width: 32, textAlign: 'right' }}>{n}</T>
        </View>
      ))}
    </View>
  );
}

/** Son 7 gün: dikey sütunlar (sayı üstte, gün adı altta). */
function Columns({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, height: 112 }}>
      {rows.map(([label, n], i) => (
        <View key={`${label}${i}`} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <T w="b" size={14}>{n}</T>
          <View style={[pebble(40, label + i), { width: 24, height: n ? 12 + (n / max) * 48 : 6, marginTop: 4, backgroundColor: n ? c.act : c.sageWash }]} />
          <T w="s" size={13} color={c.dim} style={{ marginTop: 6 }}>{label}</T>
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
 * Denemede kilitli bir tanıtım kartı: kurşun kalem taslak (ÖRNEK etiketli) + kullanıcının kendi kayıt sayısı.
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
    // Kesik kurşun çizgili sütun taslağı: gerçek veri değil, ÖRNEK etiketi ile.
    const sketch = [16, 34, 24, 44];
    return (
      <Pressable onPress={() => go('plan')} accessibilityRole="button" accessibilityLabel={`${L.analysis.lockedKicker}. ${L.analysis.lockedBody} ${L.analysis.cta}`}>
        <View style={{ marginHorizontal: 16, marginTop: 22, paddingVertical: 18, paddingHorizontal: 22, backgroundColor: c.surf, borderWidth: 2, borderStyle: 'dashed', borderColor: c.edge, borderTopLeftRadius: 30, borderTopRightRadius: 24, borderBottomRightRadius: 32, borderBottomLeftRadius: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Kicker color={c.dim}>{L.analysis.lockedKicker}</Kicker>
            <View style={{ borderWidth: 1.5, borderColor: c.clay, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}><Kicker color={c.clay}>{L.analysis.sample}</Kicker></View>
          </View>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 52, marginTop: 14 }}>
            {sketch.map((h, i) => (
              <View key={i} style={{ width: 28, height: h, borderWidth: 2, borderStyle: 'dashed', borderColor: c.edge, borderTopLeftRadius: 10, borderTopRightRadius: 8, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
            ))}
          </View>
          <T w="r" size={15} lh={22} color={c.fg} style={{ marginTop: 12 }}>{L.analysis.lockedBody}</T>
          {data.total > 0 && <T w="s" size={15} lh={21} color={c.dim} style={{ marginTop: 4 }}>{L.analysis.yourCount(data.total)}</T>}
          <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, marginTop: 4 }}>
            <T w="b" size={16} color={c.act}>{L.analysis.cta}</T>
            <View style={{ marginLeft: 8 }}><GIcon name="arrowRight" size={20} color={c.act} /></View>
          </View>
        </View>
      </Pressable>
    );
  }
  return (
    <Rise delay={80}>
      <Kicker color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 6 }}>{L.analysis.title}</Kicker>
      {data.total === 0 ? <T w="r" size={15} lh={22} color={c.dim} style={{ paddingHorizontal: 24, paddingTop: 6 }}>{L.analysis.empty}</T> : <>
        <Sec first>{L.analysis.hours}</Sec>
        <Bars rows={data.blocks} color={c.clay} />
        <Sec>{L.analysis.triggers}</Sec>
        {data.triggers.length ? <Bars rows={data.triggers} /> : <T w="r" size={14} lh={20} color={c.dim} style={{ paddingHorizontal: 24 }}>{L.analysis.triggersEmpty}</T>}
        <Sec>{L.analysis.moods}</Sec>
        {data.moods.length ? <Bars rows={data.moods} /> : <T w="r" size={14} lh={20} color={c.dim} style={{ paddingHorizontal: 24 }}>{L.analysis.moodsEmpty}</T>}
        <Sec>{L.analysis.helpers}</Sec>
        {data.helpers.length ? <Bars rows={data.helpers} /> : <T w="r" size={14} lh={20} color={c.dim} style={{ paddingHorizontal: 24 }}>{L.analysis.helpersEmpty}</T>}
        <Sec>{L.analysis.last7}</Sec>
        <Columns rows={data.days} />
        <T w="s" size={15} lh={22} style={{ paddingHorizontal: 24, paddingTop: 14 }}>{L.analysis.resisted}<T w="b" size={15}>{data.resisted}</T>{L.analysis.total}<T w="b" size={15}>{data.total}</T></T>
      </>}
    </Rise>
  );
}
