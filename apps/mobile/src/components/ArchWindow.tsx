import React from 'react';
import { View } from 'react-native';
import { c } from '../theme';
import { T, Kicker } from './ui';
import { Rise } from './motion';

// Şahit portalının "kemer penceresi": üstü yarım daire View. İçinde YALNIZCA pakt günü ve lale sayısı vardır.
// Boşluk, kıvrık ya da soluk yaprak çizilmez: sunucu şahide gün gün durum vermez ve vermemelidir (ifşa olur).
const W = 236;

/** Tek lale: kadeh + sap. Kadehin üstündeki çentik pencere zemin rengiyle kesilir (sprite yok). */
function Tulip() {
  return (
    <View style={{ width: 18, height: 32, alignItems: 'center', marginHorizontal: 3, marginBottom: 4 }}>
      <View style={{ width: 16, height: 18, backgroundColor: c.tulip, borderWidth: 1.5, borderColor: c.clay, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 }} />
      <View style={{ position: 'absolute', top: -4, width: 7, height: 7, backgroundColor: c.waterWash, transform: [{ rotate: '45deg' }] }} />
      <View style={{ width: 3, height: 14, backgroundColor: c.act }} />
    </View>
  );
}

export function ArchWindow({ day, goal, tulips, dayLabel, tulipLabel, a11y }: { day: number; goal: number; tulips: number; dayLabel: string; tulipLabel: string; a11y: string }) {
  const shape = { borderTopLeftRadius: W / 2, borderTopRightRadius: W / 2, borderBottomLeftRadius: 26, borderBottomRightRadius: 18 };
  return (
    <Rise y={12} ms={460} style={{ alignSelf: 'center', marginVertical: 14 }}>
      <View accessible accessibilityLabel={a11y} style={{ width: W }}>
        <View style={[shape, { position: 'absolute', left: 4, right: -4, top: 5, bottom: -5, backgroundColor: c.shadow }]} />
        <View style={[shape, { width: W, backgroundColor: c.waterWash, borderWidth: 3, borderColor: c.water, alignItems: 'center', paddingTop: 58, paddingBottom: 26, overflow: 'hidden' }]}>
          <Kicker color={c.dim}>{dayLabel}</Kicker>
          <T size={76} lh={86} ls={-1.5}>{day}</T>
          <T w="s" size={18} color={c.dim}>{`/ ${goal}`}</T>
          {tulips > 0 && (
            <View style={{ alignItems: 'center', marginTop: 16, paddingHorizontal: 14 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {Array.from({ length: tulips }, (_, i) => <Tulip key={i} />)}
              </View>
              <T w="s" size={15} color={c.dim}>{tulipLabel}</T>
            </View>
          )}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, backgroundColor: c.soil }} />
        </View>
      </View>
    </Rise>
  );
}
