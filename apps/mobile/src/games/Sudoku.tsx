import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { T, ActionBar } from '../components/ui';
import { c, alpha, pebble } from '../theme';
import { useL } from '../i18n';

import { LEVELS, fits, makePuzzle } from './sudokuLogic';

// Mantık aynı (sudokuLogic). Görünüm: palet token'ları, çakıl köşeli kabuk ve düğmeler; dokunma hedefleri >= 48 dp.
export default function Sudoku() {
  const L = useL();
  const [level, setLevel] = useState('easy');
  const [seed, setSeed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [puz, setPuz] = useState<number[]>(Array(81).fill(0));
  const [sol, setSol] = useState<number[]>(Array(81).fill(0));
  const [cur, setCur] = useState<number[]>(Array(81).fill(0));
  const [hinted, setHinted] = useState<number[]>([]);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { // önce "hazırlanıyor" çizilsin, sonra üret
      const p = makePuzzle(level);
      setPuz(p.puz); setSol(p.sol); setCur(p.puz); setHinted([]); setSel(null); setLoading(false);
    }, 40);
    return () => clearTimeout(t);
  }, [level, seed]);

  const clues = puz.filter(Boolean).length;
  const locked = (i: number) => puz[i] !== 0 || hinted.includes(i);
  const conflict = (i: number) => cur[i] !== 0 && !fits(cur, i, cur[i]);
  const solved = !loading && cur.every(v => v !== 0) && cur.every((_, i) => !conflict(i));
  const put = (v: number) => { if (sel === null || locked(sel)) return; setCur(cur.map((x, i) => (i === sel ? v : x))); };
  const selVal = sel !== null ? cur[sel] : 0;

  // İpucu: seçili hücre boş ya da yanlışsa onu, değilse yanlış girilmiş bir hücreyi, o da yoksa rastgele boş hücreyi doldurur.
  const hint = () => {
    const wrongOrEmpty = (i: number) => !locked(i) && cur[i] !== sol[i];
    let target: number | null = sel !== null && wrongOrEmpty(sel) ? sel : null;
    if (target === null) { const wrong = cur.map((_, i) => i).filter(i => wrongOrEmpty(i) && cur[i] !== 0); if (wrong.length) target = wrong[Math.floor(Math.random() * wrong.length)]; }
    if (target === null) { const empty = cur.map((_, i) => i).filter(i => cur[i] === 0); if (empty.length) target = empty[Math.floor(Math.random() * empty.length)]; }
    if (target === null) return;
    setCur(cur.map((x, i) => (i === target ? sol[target!] : x)));
    setHinted(h => [...h, target!]);
    setSel(target);
  };

  const chip = (on: boolean, key: string) => [pebble(48, key), { minHeight: 48, justifyContent: 'center' as const, paddingHorizontal: 16, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: on ? c.act : c.edge, backgroundColor: on ? c.sageWash : c.surf }];

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
        {Object.keys(LEVELS).map(l => (
          <Pressable key={l} onPress={() => setLevel(l)} accessibilityRole="radio" accessibilityState={{ selected: level === l }} style={chip(level === l, l)}>
            <T w="b" size={15}>{L.games.levels[l]}</T>
          </Pressable>
        ))}
        <Pressable onPress={() => setSeed(s => s + 1)} accessibilityRole="button" style={chip(false, 'new')}><T w="b" size={15}>{L.games.newGame}</T></Pressable>
      </View>

      <View style={[pebble(40, 'sudoku'), { width: '100%', maxWidth: 380, alignSelf: 'center', borderWidth: 3, borderColor: c.fg, overflow: 'hidden', opacity: loading ? 0.25 : 1 }]}>
        {Array.from({ length: 9 }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {Array.from({ length: 9 }, (_, col) => {
              const i = r * 9 + col, v = cur[i], given = puz[i] !== 0, hintedCell = hinted.includes(i), bad = conflict(i);
              const peer = sel !== null && (Math.floor(sel / 9) === r || sel % 9 === col || (Math.floor(Math.floor(sel / 9) / 3) === Math.floor(r / 3) && Math.floor((sel % 9) / 3) === Math.floor(col / 3)));
              const thickR = col % 3 === 2 && col !== 8, thickB = r % 3 === 2 && r !== 8;
              return (
                <Pressable key={col} onPress={() => setSel(i)} style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
                  borderRightWidth: col === 8 ? 0 : thickR ? 2 : 0.5, borderBottomWidth: r === 8 ? 0 : thickB ? 2 : 0.5, borderRightColor: thickR ? c.fg : c.line, borderBottomColor: thickB ? c.fg : c.line, // yalnızca blok sınırı kalın/koyu
                  backgroundColor: sel === i ? alpha(c.act, 0.4) : bad ? alpha(c.clay, 0.22) : v !== 0 && v === selVal ? alpha(c.sage, 0.4) : peer ? c.tint(0.07) : 'transparent' }}>
                  {v !== 0 && <T w={given || hintedCell ? 'b' : 'r'} size={20} color={bad ? c.clay : hintedCell ? c.amber : given ? c.fg : c.blue}>{v}</T>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12, maxWidth: 380, alignSelf: 'center', width: '100%' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <Pressable key={n} onPress={() => put(n)} accessibilityRole="button" style={[pebble(48, n), { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.edge, backgroundColor: c.surf, marginRight: n === 9 ? 0 : 3 }]}><T size={19}>{n}</T></Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8, maxWidth: 380, alignSelf: 'center', width: '100%' }}>
        <Pressable onPress={() => put(0)} accessibilityRole="button" style={[pebble(48, 'erase'), { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.edge, backgroundColor: c.surf, marginRight: 8 }]}><T w="b" size={15}>{L.games.erase}</T></Pressable>
        <Pressable onPress={hint} disabled={loading || solved} accessibilityRole="button" style={[pebble(48, 'hint'), { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.amber, opacity: loading || solved ? 0.4 : 1 }]}><T w="b" size={15} color={c.amber}>{L.games.hint}{hinted.length ? ` · ${hinted.length}` : ''}</T></Pressable>
      </View>

      <T w="s" size={15} color={solved ? c.fg : c.dim} style={{ marginTop: 12, textAlign: 'center' }}>
        {loading ? L.games.preparing : solved ? L.games.solved : L.games.sudokuStatus(L.games.levels[level], clues)}
      </T>
      {solved && <ActionBar label={L.games.newGame} onPress={() => setSeed(s => s + 1)} height={60} size={19} />}
    </View>
  );
}
