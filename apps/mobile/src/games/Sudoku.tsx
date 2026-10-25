import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { T, ActionBar } from '../components/ui';
import { c, alpha, BAHCE } from '../theme';
import { useL } from '../i18n';

import { LEVELS, fits, makePuzzle } from './sudokuLogic';

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

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
        {Object.keys(LEVELS).map(l => (
          <Pressable key={l} onPress={() => setLevel(l)} style={{ paddingVertical: 8, paddingHorizontal: 12, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: level === l ? c.fg : c.line, backgroundColor: level === l ? c.fg : 'transparent' }}>
            <T size={12.5} color={level === l ? c.ink : c.fg}>{L.games.levels[l]}</T>
          </Pressable>
        ))}
        <Pressable onPress={() => setSeed(s => s + 1)} style={{ paddingVertical: 8, paddingHorizontal: 12, marginBottom: 6, borderWidth: 1, borderColor: c.line }}><T size={12.5}>{L.games.newGame}</T></Pressable>
      </View>

      <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center', borderWidth: 2, borderColor: c.fg, opacity: loading ? 0.25 : 1 }}>
        {Array.from({ length: 9 }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {Array.from({ length: 9 }, (_, col) => {
              const i = r * 9 + col, v = cur[i], given = puz[i] !== 0, hintedCell = hinted.includes(i), bad = conflict(i);
              const peer = sel !== null && (Math.floor(sel / 9) === r || sel % 9 === col || (Math.floor(Math.floor(sel / 9) / 3) === Math.floor(r / 3) && Math.floor((sel % 9) / 3) === Math.floor(col / 3)));
              const thickR = col % 3 === 2 && col !== 8, thickB = r % 3 === 2 && r !== 8;
              return (
                <Pressable key={col} onPress={() => setSel(i)} style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
                  borderRightWidth: col === 8 ? 0 : thickR ? 2 : 0.5, borderBottomWidth: r === 8 ? 0 : thickB ? 2 : 0.5, borderRightColor: thickR ? c.fg : c.line, borderBottomColor: thickB ? c.fg : c.line, // yalnızca blok sınırı kalın/koyu
                  backgroundColor: sel === i ? alpha(c.acc, 0.45) : bad ? alpha(c.acc, 0.18) : v !== 0 && v === selVal ? c.tint(0.22) : peer ? c.tint(0.07) : 'transparent' }}>
                  {v !== 0 && <T w={given || hintedCell ? 'b' : 'r'} size={20} color={bad ? c.acc2 : hintedCell ? c.amber : given ? c.fg : c.blue}>{v}</T>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12, maxWidth: 380, alignSelf: 'center', width: '100%' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <Pressable key={n} onPress={() => put(n)} style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, marginRight: n === 9 ? 0 : -1 }}><T size={18}>{n}</T></Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8, maxWidth: 380, alignSelf: 'center', width: '100%' }}>
        <Pressable onPress={() => put(0)} style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, marginRight: 8 }}><T size={13}>{L.games.erase}</T></Pressable>
        <Pressable onPress={hint} disabled={loading || solved} style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.amber, opacity: loading || solved ? 0.4 : 1 }}><T size={13} color={c.amber}>{L.games.hint}{hinted.length ? ` · ${hinted.length}` : ''}</T></Pressable>
      </View>

      <T w="s" size={12.5} color={solved ? c.fg : c.dim} style={{ marginTop: 12, textAlign: 'center' }}>
        {loading ? L.games.preparing : solved ? L.games.solved : L.games.sudokuStatus(L.games.levels[level], clues)}
      </T>
      {solved && <ActionBar label={L.games.newGame} onPress={() => setSeed(s => s + 1)} height={56} size={15} />}
    </View>
  );
}
