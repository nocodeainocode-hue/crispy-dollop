import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import Balloons from '../games/Balloons';
import Sudoku from '../games/Sudoku';
import Memory from '../games/Memory';
import TicTacToe from '../games/TicTacToe';
import { Screen, Body, Back, ActionBar, T, Kicker, Hair } from '../components/ui';
import { c } from '../theme';
import { useL } from '../i18n';

// Stres düşürücü mini oyunlar. Bilinçli tasarım ilkesi: rastgele ödül, puan, seri, "bir tur daha" döngüsü YOK.
// Amaç dikkat dağıtmak ve dürtü dalgasını geçirmek; kumar mekaniğine benzeyen hiçbir şey eklenmez.
type Game = 'menu' | 'balloons' | 'sudoku' | 'memory' | 'xox' | 'ground' | 'minus7';

const COUNTS = [5, 4, 3, 2, 1];
function Grounding() {
  const L = useL();
  const [step, setStep] = useState(0);
  const [n, setN] = useState(0);
  if (step >= COUNTS.length) return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <T size={34} ls={-1}>{L.calm.groundDone}</T>
      <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 8 }}>{L.calm.groundDoneBody}</T>
      <ActionBar label={L.calm.again} onPress={() => { setStep(0); setN(0); }} height={56} size={15} />
    </View>
  );
  const total = COUNTS[step], label = L.calm.senses[step];
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Kicker color={c.acc2}>{L.calm.groundStep(step + 1)}</Kicker>
      <T size={120} ls={-6} lh={120} style={{ marginTop: 4 }}>{total - n}</T>
      <T size={24} ls={-0.5}>{L.calm.sense(total, label)}</T>
      <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 8 }}>{L.calm.groundHow}</T>
      <View style={{ flex: 1 }} />
      <ActionBar label={n + 1 >= total ? L.calm.nextSense : L.calm.found} onPress={() => { if (n + 1 >= total) { setStep(step + 1); setN(0); } else setN(n + 1); }} />
    </View>
  );
}

function Minus7() {
  const L = useL();
  const [cur, setCur] = useState(100);
  const [msg, setMsg] = useState('');
  const target = cur - 7;
  const opts = useMemo(() => {
    const wrong = new Set<number>();
    while (wrong.size < 2) { const d = [-3, -2, -1, 1, 2, 3][Math.floor(Math.random() * 6)]; if (d !== 0) wrong.add(target + d); }
    return [target, ...wrong].sort(() => Math.random() - 0.5);
  }, [cur]);
  if (target < 0) return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <T size={34} ls={-1}>{L.calm.minusDone}</T>
      <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 8 }}>{L.calm.minusDoneBody}</T>
      <ActionBar label={L.calm.again} onPress={() => { setCur(100); setMsg(''); }} height={56} size={15} />
    </View>
  );
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Kicker color={c.acc2}>{L.calm.minusKicker}</Kicker>
      <T size={110} ls={-5} lh={110} style={{ marginTop: 4 }}>{cur}</T>
      <T w="s" size={14} color={c.dim}>{msg || L.calm.minusAsk}</T>
      <View style={{ flex: 1 }} />
      {opts.map(o => <ActionBar key={o} label={String(o)} right="" hoverRed={false} height={62} size={22}
        onPress={() => { if (o === target) { setCur(target); setMsg(''); } else setMsg(L.calm.minusSlow); }} />)}
    </View>
  );
}

export default function Calm({ onBack }: { onBack: () => void }) {
  const [g, setG] = useState<Game>('menu');
  const L = useL();
  const items = (['balloons', 'sudoku', 'memory', 'xox', 'ground', 'minus7'] as Game[]).map(k => [k, ...L.calm.items[k]] as [Game, string, string]);
  const titles = L.calm.titles;
  return (
    <Screen>
      <Back onPress={g === 'menu' ? onBack : () => setG('menu')} label={g === 'menu' ? L.common.back : L.calm.backToGames} />
      <T size={36} ls={-1.1} lh={36} style={{ paddingHorizontal: 16, paddingBottom: 12 }}>{titles[g]}</T>
      {g === 'menu' && <Body>
        <T w="r" size={13} lh={19} color={c.dim} style={{ paddingHorizontal: 16, paddingBottom: 14 }}>{L.calm.intro}</T>
        <Hair />
        {items.map(([k, t, s]) => (
          <Pressable key={k} onPress={() => setG(k)} style={{ padding: 16, borderBottomWidth: 1, borderColor: c.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}><T size={18}>{t}</T><T w="r" size={12} color={c.dim} style={{ marginTop: 2 }}>{s}</T></View>
            <T size={18}>→</T>
          </Pressable>
        ))}
      </Body>}
      {g === 'balloons' && <Balloons />}
      {g === 'sudoku' && <Body><Sudoku /></Body>}
      {g === 'memory' && <Body><Memory /></Body>}
      {g === 'xox' && <Body><TicTacToe /></Body>}
      {g === 'ground' && <Grounding />}
      {g === 'minus7' && <Minus7 />}
    </Screen>
  );
}
