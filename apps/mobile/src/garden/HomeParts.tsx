import React from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, alpha, pebble } from '../theme';
import { T } from '../components/ui';

// Ana ekranın küçük parçaları: üst çipler, 3 öğeli dock ve "Daha fazlası" alt sayfası. Hepsi token'dan renk alır.

/** Üst çip ("Ben"): çakıl biçimli, kenarlı, en az 48 dp. */
export function ChipBtn({ label, a11y, onPress }: { label: string; a11y?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} hitSlop={6}
      style={[pebble(48, label), { minHeight: 48, minWidth: 48, paddingHorizontal: 20, borderWidth: 2, borderColor: c.edge, backgroundColor: c.surf, justifyContent: 'center', alignItems: 'center' }]}>
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

export type Glyph = 'calm' | 'book' | 'pair';
const RING = (size: number) => ({ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: c.fg } as const);

function GlyphIcon({ kind }: { kind: Glyph }) {
  return (
    <View style={{ width: 28, height: 26, alignItems: 'center', justifyContent: 'center' }}>
      {kind === 'calm' && (<><View style={RING(24)} /><View style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: c.fg }} /></>)}
      {kind === 'book' && (
        <View style={{ width: 20, height: 24, borderRadius: 5, borderWidth: 2.5, borderColor: c.fg, paddingTop: 5, paddingHorizontal: 3 }}>
          <View style={{ height: 2.5, borderRadius: 1, backgroundColor: c.fg, marginBottom: 3 }} />
          <View style={{ height: 2.5, width: '70%', borderRadius: 1, backgroundColor: c.fg }} />
        </View>
      )}
      {kind === 'pair' && (<><View style={[RING(16), { position: 'absolute', left: 0, top: 5 }]} /><View style={[RING(16), { position: 'absolute', right: 0, top: 5 }]} /></>)}
    </View>
  );
}

export type DockItem = { key: string; label: string; glyph: Glyph; onPress: () => void };

/** Altta kısa dock: 3 öğe, her biri en az 64 dp yüksek. Kâğıt yüzey, üst köşeler yuvarlak. */
export function Dock({ items }: { items: DockItem[] }) {
  return (
    <View style={{ marginTop: 4, backgroundColor: c.surf, borderTopWidth: 2, borderColor: c.line, borderTopLeftRadius: 36, borderTopRightRadius: 30, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 }}>
      {items.map(it => (
        <Pressable key={it.key} onPress={it.onPress} accessibilityRole="button" accessibilityLabel={it.label} style={{ flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center' }}>
          <GlyphIcon kind={it.glyph} />
          <T w="b" size={15} style={{ marginTop: 5 }} numberOfLines={1}>{it.label}</T>
        </Pressable>
      ))}
    </View>
  );
}

export type SheetRow = { key: string; label: string; onPress: () => void };

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
                style={[pebble(56, r.key), { minHeight: 56, marginVertical: 5, paddingHorizontal: 22, justifyContent: 'center', borderWidth: 2, borderColor: c.line, backgroundColor: c.bg }]}>
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
