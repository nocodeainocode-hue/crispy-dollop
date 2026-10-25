import React from 'react';
import { View, Linking } from 'react-native';
import PebbleBtn from './PebbleBtn';
import { T } from '../components/ui';
import { useL, useHelp } from '../i18n';

/**
 * Yardım hatları: bölgeye göre ücretsiz hatlar + acil numara, tek dokunuşla aranır.
 * Her düğme >= 64 dp (kriz hedefi). Kriz, Tekrar oynadım ve Çıkış ekranlarında ortak.
 * Hatlar helplines.ts'ten gelir (TR: ALO 182, Yeşilay 115, 112); bu bileşen numara tutmaz.
 */
export default function HelpRow({ h = 64, style }: { h?: number; style?: any }) {
  const L = useL();
  const help = useHelp();
  const lines = help.lines.slice(0, 2);
  const open = (tel: string) => () => { Linking.openURL(`tel:${tel}`).catch(() => {}); };
  const em = L.help.emergencyShort.charAt(0).toLocaleUpperCase(L.locale) + L.help.emergencyShort.slice(1);
  return (
    <View style={[{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }, style]}>
      {lines.map((l, i) => (
        <PebbleBtn key={l.tel} h={h} kind="sand" flex={1} label={`${l.short} · ${L.help.support}`} seed={l.tel} onPress={open(l.tel)} style={{ minWidth: 0 }}>
          <T w="b" size={15} lh={18} ls={0} maxFontSizeMultiplier={1.2} style={{ textAlign: 'center', flexShrink: 1 }} numberOfLines={2}>{l.short}</T>
        </PebbleBtn>
      ))}
      <PebbleBtn h={h} kind="wash" flex={1} label={`${help.emergency} · ${L.help.emergencyShort}`} seed={help.emergency} onPress={open(help.emergency)} style={{ minWidth: 0 }}>
        <T w="b" size={15} lh={18} ls={0} maxFontSizeMultiplier={1.2} style={{ textAlign: 'center', flexShrink: 1 }} numberOfLines={2}>{`${em} ${help.emergency}`}</T>
      </PebbleBtn>
    </View>
  );
}
