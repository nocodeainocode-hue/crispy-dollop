import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, Easing } from 'react-native';
import { Science, T, Kicker } from './ui';
import { dur, usePress } from './motion';
import { tick } from '../haptics';
import { PackPlant, SeedPacket, Signature, SproutInPot, Stamp, type PackTier } from '../art/misc';
import { c, F, BAHCE, alpha, pebble } from '../theme';
import { useL } from '../i18n';

// Kurulum, şahitler ve tamamlama ekranlarının ortak parçaları (ui.tsx'e dokunmadan). Küçük işaretler View ile çizilir;
// paket kartı, damga, filiz ve imza art/misc kütüphanesinden gelir. Yeni bağımlılık, yazı tipi glifi ve sabit renk yok; renkler token'dan.

/**
 * Bilimsel not: her adımda AÇIK görünür (kullanıcı kararı: dokunarak açılan katlı alan değil). Eski sürümdeki
 * "Neden böyle?" düğmesi kaldırıldı; ad (Why) Setup.tsx çağrıları değişmesin diye korunur.
 */
export function Why({ children, src }: { children: string; src: string }) {
  return <Science src={src}>{children}</Science>;
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

// ───────────── Paket seçimi ve imza anı (art/misc çizimleriyle) ─────────────

/** 30/60/90 gün -> kütüphanedeki saksı bitkisi. */
const TIER_OF: Record<number, PackTier> = { 30: 'filiz', 60: 'fidan', 90: 'agac' };

/** Paketin saksı bitkisi (30 Filiz, 60 Fidan, 90 Ağaç); deneme (7 gün) ve bilinmeyen gün için çizim yok. */
export function TierPlant({ d, height = 64, swaying = false }: { d: number; height?: number; swaying?: boolean }) {
  const tier = TIER_OF[d];
  return tier ? <PackPlant tier={tier} height={height} swaying={swaying} /> : null;
}

/** Seçili işareti: dolu daire + çizilmiş tik (yalnız renge dayanmaz; kenar kalınlığı ve zemin de değişir). */
function PickMark() {
  return (
    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.act, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 7, height: 12, borderRightWidth: 3, borderBottomWidth: 3, borderColor: c.onAct, transform: [{ rotate: '45deg' }], marginTop: -3 }} />
    </View>
  );
}

/**
 * Paket kartı (30/60/90 = Filiz/Fidan/Ağaç): tohum paketi kartı + saksı bitkisi, altında gün sayısı ve belirgin fiyat.
 * Tek dokunma hedefi (radio): seçili durum kalın ada çayı kenar + sage zemin + tik + bitkinin sallanmasıyla belli olur.
 * `row`: dar ekran / büyük yazıda yan yana yerine kart solda, bilgi sağda. `soon`: satış kapalı, seçilemez.
 */
export function PackPick({ d, name, days, price, soon, soonLabel, on, onPress, row, variant }: {
  d: number; name: string; days: string; price?: string; soon?: boolean; soonLabel: string; on: boolean; onPress: () => void; row: boolean; variant: number;
}) {
  const shape = pebble(96, `pk${d}`);
  const art = (
    <SeedPacket label={name} variant={variant} height={130}>
      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        <TierPlant d={d} height={64} swaying={on && !soon} />
      </View>
    </SeedPacket>
  );
  const info = (
    <View style={row ? { flex: 1, marginLeft: 14 } : { alignItems: 'center', marginTop: 12, alignSelf: 'stretch' }}>
      <T w="s" size={15} lh={20} color={c.dim} maxFontSizeMultiplier={1.3}>{days}</T>
      {!!price && !soon && <T size={row ? 26 : 22} lh={row ? 32 : 28} maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: F.d, marginTop: 2 }}>{price}</T>}
      {!!soon && <T w="r" size={13} lh={17} color={c.dim} maxFontSizeMultiplier={1.3} style={{ marginTop: 4, textAlign: row ? 'left' : 'center' }}>{soonLabel}</T>}
    </View>
  );
  const label = [name, days, soon ? soonLabel : price].filter(Boolean).join(', ');
  return (
    <Pressable onPress={() => { tick(); onPress(); }} disabled={soon} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: !!soon }} accessibilityLabel={label}
      style={({ pressed }) => ({ flex: row ? undefined : 1, marginBottom: row ? 12 : 0, opacity: soon ? 0.55 : 1, transform: [{ translateY: pressed ? -3 : 0 }] })}>
      <View style={[shape, { borderWidth: on ? 3 : 2, borderColor: on ? c.act : c.line, backgroundColor: on ? c.sageWash : c.surf, padding: 8, flexGrow: row ? 0 : 1, flexDirection: row ? 'row' : 'column', alignItems: row ? 'center' : 'stretch', paddingRight: row ? 16 : 8 }]}>
        <View style={row ? { width: 116 } : undefined}>{art}</View>
        {info}
        {on && !soon && (row ? <View style={{ marginLeft: 8 }}><PickMark /></View> : <View style={{ position: 'absolute', top: -8, right: -6 }}><PickMark /></View>)}
      </View>
    </Pressable>
  );
}

/** "Tek seferlik ödeme. Abonelik değildir…": ilk cümle başlık, kalanı metin; art/misc kil damgası. Fiyatın hemen altında durur. */
export function OneTimeStamp({ text }: { text: string }) {
  const i = text.indexOf('. ');
  const head = i > 0 ? text.slice(0, i + 1) : text, rest = i > 0 ? text.slice(i + 2) : '';
  return (
    <View accessible accessibilityLabel={text} style={{ marginHorizontal: 24, marginTop: 14, marginBottom: 12 }}>
      <Stamp title={head} text={rest} />
    </View>
  );
}

/** 170 kutulu SproutInPot'u `size` kutuya sığdırır (merkezden ölçek + kaydırma; yerleşim kütüphanedekiyle aynı). */
function ScaledSprout({ size, progress, done }: { size: number; progress: Animated.Value; done: boolean }) {
  const s = size / 170;
  const off = (size - 170) / 2;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: 170, height: 170, transform: [{ translateX: off }, { translateY: off }, { scale: s }] }}>
        <SproutInPot progress={progress} state={done ? 'done' : 'hold'} />
      </View>
    </View>
  );
}

/**
 * İmza düğmesi (HoldBar'ın yerine): basılı tutuldukça saksıdaki tohum filizlenir, imza çizilerek belirir; %100'de "söz verildi".
 * Mantık dışarıda: pct 0..100 ve onDown/onUp Setup'ın tutma sayacından gelir. `busy` iken dokunulmaz.
 * Filiz ve imza kâğıt zeminde (c.surf) durur: mürekkep rengi ada çayı zeminde okunmaz.
 */
export function SignHold({ label, doneLabel, pct, busy, onDown, onUp }: { label: string; doneLabel: string; pct: number; busy: boolean; onDown: () => void; onUp: () => void }) {
  const h = 104;
  const shape = pebble(h, label);
  const done = pct >= 100;
  const pr = usePress(3);
  // 40 ms'lik adımlar arası yumuşatma (tek sahne değeri; filiz, imza ve dolgu aynı değerle büyür)
  const prog = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    const a = Animated.timing(prog, { toValue: pct, duration: dur(50), easing: Easing.linear, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [pct]);
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
      <Pressable onPressIn={() => { pr.onPressIn(); onDown(); }} onPressOut={() => { pr.onPressOut(); onUp(); }} disabled={busy}
        accessibilityRole="button" accessibilityLabel={done ? doneLabel : label} accessibilityState={{ disabled: busy, busy }} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
        <View style={{ marginBottom: 4 }}>
          <View style={[shape, { position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, backgroundColor: c.shadow }]} />
          <Animated.View style={[shape, { minHeight: h, backgroundColor: c.act, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 10, paddingRight: 16 }, pr.style]}>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: prog.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }), backgroundColor: alpha(c.onAct, 0.26) }} />
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.surf, borderWidth: 2, borderColor: c.fg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <ScaledSprout size={84} progress={prog} done={done} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <T w="b" size={20} lh={24} color={c.onAct} numberOfLines={2} maxFontSizeMultiplier={1.3}>{done ? doneLabel : label}</T>
              <View style={[pebble(40, 'sign-slip'), { marginTop: 8, alignSelf: 'flex-start', backgroundColor: c.surf, borderWidth: 2, borderColor: c.fg, paddingHorizontal: 12, paddingVertical: 2 }]}>
                <Signature progress={prog} width={120} />
              </View>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </View>
  );
}
