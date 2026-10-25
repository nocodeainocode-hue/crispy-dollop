import React from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, alpha, pebble } from '../theme';
import { T } from '../components/ui';
import { DockIcon, type DockName } from '../art/misc';

// Ana ekranın küçük parçaları: üst çipler, 3 öğeli dock ve "Daha fazlası" alt sayfası. Hepsi token'dan renk alır.
// Simgeler art/misc (tuvaldeki çizgi simgeleri); dock'ta 3 öğe kalır (plan K17: Krizdeyim ayrı, tam genişlik).

/** Üst çip ("Ben"): çakıl biçimli, kenarlı, en az 48 dp; isteğe bağlı çizgi simgesi (Profil). */
export function ChipBtn({ label, a11y, icon, onPress }: { label: string; a11y?: string; icon?: DockName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} hitSlop={6}
      style={[pebble(48, label), { minHeight: 48, minWidth: 48, paddingHorizontal: 18, borderWidth: 2, borderColor: c.edge, backgroundColor: c.surf, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }]}>
      {icon ? <View style={{ marginRight: 8 }}><DockIcon name={icon} active size={22} /></View> : null}
      <T w="b" size={16}>{label}</T>
    </Pressable>
  );
}

/** "Daha fazlası" düğmesi: üç nokta View ile çizilir, görünür metin yok (erişilebilirlik etiketi var). */
export function DotsBtn({ a11y, onPress }: { a11y: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={6}
      style={[pebble(48, 'more'), { width: 56, height: 48, borderWidth: 2, borderColor: c.edge, backgroundColor: c.surf, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }]}>
      {[0, 1, 2].map(i => <View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.fg, marginHorizontal: 2.5 }} />)}
    </Pressable>
  );
}

export type DockItem = { key: string; label: string; glyph: DockName; onPress: () => void };

/** Altta kısa dock: 3 öğe, her biri en az 64 dp yüksek. Kâğıt yüzey, üst köşeler yuvarlak. */
export function Dock({ items }: { items: DockItem[] }) {
  return (
    <View style={{ marginTop: 4, backgroundColor: c.surf, borderTopWidth: 2, borderColor: c.line, borderTopLeftRadius: 36, borderTopRightRadius: 30, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 }}>
      {items.map(it => (
        <Pressable key={it.key} onPress={it.onPress} accessibilityRole="button" accessibilityLabel={it.label} style={{ flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center' }}>
          <DockIcon name={it.glyph} active />
          <T w="b" size={15} style={{ marginTop: 5 }} numberOfLines={1}>{it.label}</T>
        </Pressable>
      ))}
    </View>
  );
}

export type SheetRow = { key: string; label: string; icon?: DockName; onPress: () => void };

/** "Daha fazlası": alttan açılan kâğıt sayfa; az kullanılan hedefler burada. Android geri tuşu kapatır. */
export function MoreSheet({ visible, rows, closeLabel, onClose }: { visible: boolean; rows: SheetRow[]; closeLabel: string; onClose: () => void }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: alpha(c.fg, 0.32), justifyContent: 'flex-end', alignItems: 'center' }} onPress={onClose} accessibilityLabel={closeLabel}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 430, maxHeight: '86%', backgroundColor: c.surf, borderTopLeftRadius: 36, borderTopRightRadius: 30, borderTopWidth: 2, borderColor: c.edge, paddingTop: 14, paddingBottom: Math.max(ins.bottom, 12) + 10 }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: c.line, marginBottom: 8 }} />
          <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {rows.map(r => (
              <Pressable key={r.key} onPress={r.onPress} accessibilityRole="button" accessibilityLabel={r.label}
                style={[pebble(56, r.key), { minHeight: 56, marginVertical: 5, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: c.line, backgroundColor: c.bg }]}>
                {r.icon ? <View style={{ marginRight: 12 }}><DockIcon name={r.icon} active size={24} /></View> : null}
                <T w="b" size={18}>{r.label}</T>
              </Pressable>
            ))}
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel}
              style={[pebble(56, closeLabel), { minHeight: 56, marginVertical: 5, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: c.edge }]}>
              <T w="b" size={17} color={c.dim}>{closeLabel}</T>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
