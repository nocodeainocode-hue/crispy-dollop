import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Science, T, Kicker } from './ui';
import { c, F, BAHCE, alpha, pebble } from '../theme';
import { useL } from '../i18n';

// Kurulum, şahitler ve tamamlama ekranlarının ortak parçaları (ui.tsx'e dokunmadan). Hepsi View ile çizilir:
// yeni bağımlılık, yazı tipi glifi ve sabit renk yok; renkler token'dan.

/** Yan ok: View ile çizilen chevron (açıkken yukarı bakar). */
function Chev({ open, color }: { open: boolean; color: string }) {
  return <View style={{ width: 9, height: 9, marginLeft: 10, marginTop: open ? 4 : -3, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: color, transform: [{ rotate: open ? '-135deg' : '45deg' }] }} />;
}

/**
 * "Neden böyle?": bilimsel kutu ana akışta görünmez; bu düğmeyle açılır. Açılınca ui.tsx'teki Science kutusu belirir.
 * Düğme en az 48 dp yüksekliğindedir.
 */
export function Why({ children, src }: { children: string; src: string }) {
  const L = useL();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen(o => !o)} hitSlop={6} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={L.setup.why}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginHorizontal: 16, marginTop: 10, paddingRight: 14 }}>
        <T w="s" size={15} color={c.act}>{L.setup.why}</T>
        <Chev open={open} color={c.act} />
      </Pressable>
      {open && <Science src={src}>{children}</Science>}
    </View>
  );
}

/**
 * Eğik kâğıt kart: hafif döndürülmüş, kusurlu yuvarlak köşeli, altında sert kâğıt gölgesi (blur yok).
 * Sözleşme satırları, tamamlama belgesi ve sayaç kutuları bununla çizilir.
 */
export function PaperCard({ children, tilt = -0.8, seed = 'paper', pad = 20, mx = 16 }: { children: React.ReactNode; tilt?: number; seed?: string | number; pad?: number; mx?: number }) {
  const shape = pebble(72, seed);
  return (
    <View style={{ marginHorizontal: mx, marginVertical: 10, transform: [{ rotate: `${BAHCE ? tilt : 0}deg` }] }}>
      <View style={[shape, { position: 'absolute', left: 0, right: 0, top: 5, bottom: -5, backgroundColor: c.shadow }]} />
      <View style={[shape, { backgroundColor: c.surf, borderWidth: 2, borderColor: c.fg, padding: pad }]}>{children}</View>
    </View>
  );
}

/** Kâğıt kart içinde tek bir söz satırı (Fraunces); son satırın altında çizgi yok. */
export function PaperLine({ children, last }: { children: string; last?: boolean }) {
  return (
    <View style={{ paddingVertical: 9, borderBottomWidth: last ? 0 : 1.5, borderColor: c.line }}>
      <T size={20} lh={26} style={{ fontFamily: F.d }}>{children}</T>
    </View>
  );
}

/** Onay kutusu satırı: çizilmiş kutu + metin; satır en az 48 dp, tamamı dokunulabilir. */
export function CheckRow({ on, onPress, children }: { on: boolean; onPress: () => void; children: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={children}
      style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, minHeight: 48 }}>
      <View style={{ width: 30, height: 30, marginRight: 12, marginTop: 1, borderTopLeftRadius: 13, borderTopRightRadius: 9, borderBottomRightRadius: 12, borderBottomLeftRadius: 10, borderWidth: 2, borderColor: on ? c.act : c.edge, backgroundColor: on ? c.act : c.surf, alignItems: 'center', justifyContent: 'center' }}>
        {on && <View style={{ width: 8, height: 14, borderRightWidth: 3, borderBottomWidth: 3, borderColor: c.onAct, transform: [{ rotate: '45deg' }], marginTop: -3 }} />}
      </View>
      <T w="r" size={14} lh={20} color={c.dim} style={{ flex: 1 }}>{children}</T>
    </Pressable>
  );
}

/** Metin bağlantısı: en az 48 dp yüksekliğinde, ada çayı rengi. */
export function TextLink({ label, onPress, color = c.act, align = 'flex-start' }: { label: string; onPress: () => void; color?: string; align?: 'flex-start' | 'center' | 'flex-end' }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 48, justifyContent: 'center', alignSelf: align, paddingHorizontal: 16 }}>
      <T w="s" size={16} color={color}>{label}</T>
    </Pressable>
  );
}

/** Küçük artı işareti (yazı tipi glifine bağımlı değil). */
export function PlusMark({ color = c.act, size = 18 }: { color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: 2.5, borderRadius: 2, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 2.5, height: size, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

/** Durum noktası: yalnız renge dayanmaz; yanında her zaman bir metin bulunur. */
export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, marginRight: 8 }} />;
}

/** Şahit durumu simgesi: kabul = dolu daire + tik, bekliyor = boş halka, reddetti = kil dolgu + çarpı. Metinle birlikte kullanılır. */
export function StatusMark({ status }: { status: string }) {
  const size = 22;
  if (status === 'accepted') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.act, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        <View style={{ width: 5, height: 10, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: c.onAct, transform: [{ rotate: '45deg' }], marginTop: -2 }} />
      </View>
    );
  }
  if (status === 'declined') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.clay, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        <View style={{ position: 'absolute', width: 12, height: 2.5, borderRadius: 2, backgroundColor: c.onClay, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', width: 12, height: 2.5, borderRadius: 2, backgroundColor: c.onClay, transform: [{ rotate: '-45deg' }] }} />
      </View>
    );
  }
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: c.edge, backgroundColor: alpha(c.sage, 0.25), marginRight: 8 }} />;
}

/** Kutu üstü küçük etiket + büyük sayı/değer (Fraunces): şahit ekranındaki iki sayaç. */
export function Stat({ label, value, seed }: { label: string; value: string; seed: string }) {
  const shape = pebble(64, seed);
  return (
    <View style={[shape, { flex: 1, borderWidth: 2, borderColor: c.line, backgroundColor: c.surf, paddingVertical: 12, paddingHorizontal: 18 }]}>
      <Kicker color={c.dim}>{label}</Kicker>
      <T size={30} lh={36} style={{ marginTop: 2 }}>{value}</T>
    </View>
  );
}
