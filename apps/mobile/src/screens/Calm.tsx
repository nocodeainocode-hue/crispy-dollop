import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Balloons from '../games/Balloons';
import Sudoku from '../games/Sudoku';
import Memory from '../games/Memory';
import TicTacToe from '../games/TicTacToe';
import { SeedPacket, CalmIcon, type CalmIconName } from '../art/misc';
import { Screen, Body, Back, ActionBar, T, Kicker } from '../components/ui';
import { c } from '../theme';
import { useL } from '../i18n';
import { useHapticsScope } from '../haptics';

// Stres düşürücü mini oyunlar. Bilinçli tasarım ilkesi: rastgele ödül, puan, seri, "bir tur daha" döngüsü YOK.
// Amaç dikkat dağıtmak ve dürtü dalgasını geçirmek; kumar mekaniğine benzeyen hiçbir şey eklenmez.
// Menü: art/misc "tohum paketi" kartları (hafif eğik kâğıt, zikzaklı üst kenar) + CalmIcon simgeleri, iki sütun. Haptik: bu ekranda ve oyunlarda sessiz.
type Game = 'menu' | 'balloons' | 'sudoku' | 'memory' | 'xox' | 'ground' | 'minus7';

const COUNTS = [5, 4, 3, 2, 1];
function Grounding() {
  const L = useL();
  const [step, setStep] = useState(0);
  const [n, setN] = useState(0);
  if (step >= COUNTS.length) return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <T size={36} ls={-0.5}>{L.calm.groundDone}</T>
      <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 8 }}>{L.calm.groundDoneBody}</T>
      <ActionBar label={L.calm.again} onPress={() => { setStep(0); setN(0); }} height={60} size={19} />
    </View>
  );
  const total = COUNTS[step], label = L.calm.senses[step];
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Kicker color={c.dim}>{L.calm.groundStep(step + 1)}</Kicker>
      <T size={120} ls={-4} lh={128} maxFontSizeMultiplier={1} style={{ marginTop: 4 }}>{total - n}</T>
      <T size={28} lh={34}>{L.calm.sense(total, label)}</T>
      <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 8 }}>{L.calm.groundHow}</T>
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
      <T size={36} ls={-0.5}>{L.calm.minusDone}</T>
      <T w="r" size={16} lh={23} color={c.dim} style={{ marginTop: 8 }}>{L.calm.minusDoneBody}</T>
      <ActionBar label={L.calm.again} onPress={() => { setCur(100); setMsg(''); }} height={60} size={19} />
    </View>
  );
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Kicker color={c.dim}>{L.calm.minusKicker}</Kicker>
      <T size={110} ls={-3} lh={118} maxFontSizeMultiplier={1} style={{ marginTop: 4 }}>{cur}</T>
      <T w="s" size={16} color={c.dim}>{msg || L.calm.minusAsk}</T>
      <View style={{ flex: 1 }} />
      {opts.map(o => <ActionBar key={o} label={String(o)} right="" hoverRed={false} height={64} size={22}
        onPress={() => { if (o === target) { setCur(target); setMsg(''); } else setMsg(L.calm.minusSlow); }} />)}
    </View>
  );
}

// Menü simgeleri (tuvaldeki Sakinles.dc.html .pk kartları): oyun/egzersiz -> CalmIcon
const ICONS: Record<string, CalmIconName> = { balloons: 'balloon', sudoku: 'sudoku', memory: 'memory', xox: 'xox', ground: 'senses', minus7: 'countdown' };

export default function Calm({ onBack }: { onBack: () => void }) {
  const [g, setG] = useState<Game>('menu');
  const L = useL();
  useHapticsScope('quiet');
  const keys = ['balloons', 'sudoku', 'memory', 'xox', 'ground', 'minus7'] as Game[];
  const titles = L.calm.titles;
  return (
    <Screen>
      <Back onPress={g === 'menu' ? onBack : () => setG('menu')} label={g === 'menu' ? L.common.back : L.calm.backToGames} />
      <T size={40} ls={-0.8} lh={46} style={{ paddingHorizontal: 16, paddingBottom: 4 }}>{titles[g]}</T>
      {g === 'menu' && <Body>
        <T w="s" size={16} lh={22} color={c.dim} style={{ paddingHorizontal: 16, paddingBottom: 2 }}>{L.calm.intro}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28 }}>
          {keys.map((k, i) => {
            const [t, s] = L.calm.items[k];
            return (
              <View key={k} style={{ width: '47%' }}>
                <SeedPacket label={titles[k]} variant={i} accessibilityLabel={s ? `${t}. ${s}` : t} onPress={() => setG(k)}>
                  <CalmIcon name={ICONS[k]} />
                </SeedPacket>
              </View>
            );
          })}
        </View>
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
