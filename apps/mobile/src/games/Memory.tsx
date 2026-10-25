import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { ND, EASE, dur } from '../components/motion';
import { T, ActionBar } from '../components/ui';
import { c, alpha, BAHCE, pebble } from '../theme';
import { useL } from '../i18n';

// Hafıza kartları: 8 çift, sayaç ve süre yok. Simgeler geometrik (iskambil takımı simgesi yok). Oyun renkleri palet dışı olabilir.
const SYMS: [string, string][] = BAHCE
  ? [['●', '#CF5F44'], ['▲', '#DCA83F'], ['■', '#6BA38A'], ['★', '#C97AA0'], ['✚', '#7A9CC6'], ['▼', '#B9714D'], ['☾', '#8E86C9'], ['▬', '#8FAA87']]
  : [['●', '#EC3013'], ['▲', '#FFB703'], ['■', '#2EC4B6'], ['★', '#FF6FA3'], ['✚', '#4CC9F0'], ['▼', '#FF5A3D'], ['☾', '#8E7DFF'], ['▬', '#9BE564']];
type Card = { id: number; sym: string; color: string };

const deal = (): Card[] => {
  const cards = SYMS.flatMap(([sym, color], k) => [{ id: k * 2, sym, color }, { id: k * 2 + 1, sym, color }]);
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards;
};

function Face({ card, up, matched, onPress }: { card: Card; up: boolean; matched: boolean; onPress: () => void }) {
  const v = useRef(new Animated.Value(1)).current;
  // açılırken kısa, aşmasız bir ölçek geçişi (yay yok)
  useEffect(() => { v.setValue(0.9); Animated.timing(v, { toValue: 1, duration: dur(180), easing: EASE, useNativeDriver: ND }).start(); }, [up]);
  return (
    <Pressable onPress={onPress} style={{ width: '25%', padding: 4 }} accessibilityRole="button">
      <Animated.View style={[pebble(80, card.id), { aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: matched ? card.color : c.edge, backgroundColor: up ? alpha(c.sage, 0.22) : c.surf, opacity: matched ? 0.6 : 1, transform: [{ scale: v }] }]}>
        <T size={up ? 34 : 24} color={up ? card.color : c.dim}>{up ? card.sym : '?'}</T>
      </Animated.View>
    </Pressable>
  );
}

export default function Memory() {
  const L = useL();
  const [cards, setCards] = useState<Card[]>(deal);
  const [up, setUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [lock, setLock] = useState(false);
  const done = matched.length === SYMS.length;

  const flip = (i: number) => {
    if (lock || up.includes(i) || matched.includes(cards[i].sym)) return;
    const next = [...up, i];
    setUp(next);
    if (next.length === 2) {
      setLock(true);
      setTimeout(() => {
        if (cards[next[0]].sym === cards[next[1]].sym) setMatched(m => [...m, cards[next[0]].sym]);
        setUp([]); setLock(false);
      }, 750);
    }
  };
  const again = () => { setCards(deal()); setUp([]); setMatched([]); setLock(false); };

  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', maxWidth: 400, alignSelf: 'center' }}>
        {cards.map((card, i) => <Face key={card.id} card={card} up={up.includes(i) || matched.includes(card.sym)} matched={matched.includes(card.sym)} onPress={() => flip(i)} />)}
      </View>
      <T w="s" size={16} color={done ? c.fg : c.dim} style={{ marginTop: 12, textAlign: 'center' }}>{done ? L.games.memDone : L.games.memHow}</T>
      <ActionBar label={done ? L.games.reshuffle : L.games.shuffle} right="" kind="ghost" height={60} size={19} onPress={again} />
    </View>
  );
}
