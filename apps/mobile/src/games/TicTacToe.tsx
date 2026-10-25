import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { T, ActionBar } from '../components/ui';
import { c, pebble } from '../theme';
import { useL } from '../i18n';

// XOX: sen X, bilgisayar O. Bilgisayar yenilebilir (kazanma/engelleme basit kuralla oynar). Mantık aynı; yüzey Bahçe token'ları.
type Cell = 'X' | 'O' | null;
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winnerOf = (b: Cell[]) => { for (const [a, x, y] of LINES) if (b[a] && b[a] === b[x] && b[a] === b[y]) return { who: b[a] as 'X' | 'O', line: [a, x, y] }; return null; };

function pickMove(b: Cell[]): number {
  const empty = b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
  const find = (who: 'X' | 'O') => { for (const [a, x, y] of LINES) { const cells = [a, x, y]; const mine = cells.filter(i => b[i] === who).length; const free = cells.filter(i => !b[i]); if (mine === 2 && free.length === 1) return free[0]; } return -1; };
  const w = find('O'); if (w >= 0) return w;       // kazanabiliyorsa kazan
  const bl = find('X'); if (bl >= 0) return bl;    // rakip kazanacaksa engelle
  if (!b[4] && Math.random() < 0.8) return 4;      // çoğu zaman merkez
  const corners = [0, 2, 6, 8].filter(i => !b[i]);
  if (corners.length && Math.random() < 0.7) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToe() {
  const L = useL();
  const [b, setB] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const res = winnerOf(b);
  const full = b.every(Boolean);
  const over = !!res || full;

  useEffect(() => {
    if (turn !== 'O' || over) return;
    const t = setTimeout(() => { setB(prev => { const n = [...prev]; n[pickMove(prev)] = 'O'; return n; }); setTurn('X'); }, 480);
    return () => clearTimeout(t);
  }, [turn, over]);

  const tap = (i: number) => { if (b[i] || over || turn !== 'X') return; setB(prev => prev.map((v, k) => (k === i ? 'X' : v))); setTurn('O'); };
  const reset = () => { setB(Array(9).fill(null)); setTurn('X'); };

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
      <View style={[pebble(80, 'xox'), { width: '100%', maxWidth: 330, alignSelf: 'center', aspectRatio: 1, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 3, borderColor: c.fg, overflow: 'hidden', backgroundColor: c.surf }]}>
        {b.map((v, i) => {
          const hot = res?.line.includes(i);
          return (
            <Pressable key={i} onPress={() => tap(i)} accessibilityRole="button" style={{ width: '33.33%', height: '33.33%', alignItems: 'center', justifyContent: 'center', borderRightWidth: i % 3 === 2 ? 0 : 2, borderBottomWidth: i > 5 ? 0 : 2, borderColor: c.line, backgroundColor: hot ? c.sageWash : 'transparent' }}>
              {!!v && <T size={64} ls={-1} lh={72} color={v === 'X' ? c.fg : c.clay}>{v}</T>}
            </Pressable>
          );
        })}
      </View>
      <T w="s" size={16} color={over ? c.fg : c.dim} style={{ marginTop: 14, textAlign: 'center' }}>
        {res ? (res.who === 'X' ? L.games.xWin : L.games.xLose) : full ? L.games.xDraw : turn === 'X' ? L.games.xTurn : L.games.xThinking}
      </T>
      <ActionBar label={over ? L.games.playAgain : L.games.restart} right="" kind="ghost" height={60} size={19} onPress={reset} />
    </View>
  );
}
