import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';
import { c } from '../theme';
import { GardenScene, SCENE_SIZE, type DayStates } from '../art/plant';

// Ana ekran ve Gün tamam için bahçe sahnesi çerçevesi. Çizimin kendisi art/plant GardenScene (variant "home"): sabit 390x750 tuval.
// Burada yalnız sığdırma yapılır: tuvalin bitki penceresi [WIN_TOP, WIN_BOT] verilen alana ölçeklenir ve alta oturur
// (üstteki gökyüzü, altta dock'un kapattığı toprak kırpılır). Ölçek alandan geniş kalırsa yanlarda tepe ve toprak şeritleri sürer.

const { w: DW, h: DH } = SCENE_SIZE.home;
/** Tuvalde görünmesi gereken bölge: bitkinin tepesi (y≈196, not payı ile) ile toprağın bitki tabanının biraz altı. */
const WIN_TOP = 165, WIN_BOT = 640;
/** Ölçek alt sınırı: altında alan yetmez, ekran kaydırılır (Body ScrollView). */
const MIN_SCALE = 0.5;
/** Bu ölçekte pencerenin yüksekliği; çağıran minHeight olarak kullanır. */
export const HOME_SCENE_MIN_H = Math.round((WIN_BOT - WIN_TOP) * MIN_SCALE);

// Tuval kenarlarında tepelerin ve toprağın y değeri (HILLS yolları, tepe tuvalde y=420'den başlar): [sol, sağ].
const EDGE = { hill1: [500, 480], hill2: [560, 544], soil: [596, 597] } as const;

export interface HomeSceneProps {
  goalDays: number;
  dayStates: DayStates;
  /** Giriş animasyonu (yalnız açılışta bir kez). */
  intro?: boolean;
  /** Taze açılan gün (Gün tamam). */
  freshDay?: number;
  hills?: 'home' | 'done';
  labels?: { today?: string; why?: string };
  swayMs?: number; swayDeg?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function HomeScene({ goalDays, dayStates, intro, freshDay, hills = 'home', labels, swayMs, swayDeg, accessibilityLabel, style }: HomeSceneProps) {
  const [sz, setSz] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSz(p => (Math.abs(p.w - width) < 1 && Math.abs(p.h - height) < 1 ? p : { w: width, h: height }));
  };
  const { w, h } = sz;
  const ready = w > 0 && h > 0;
  // Ölçek: genişliğe ve yüksekliğe sığan en büyük (en az MIN_SCALE); piksele yuvarlanır ki memo kararlı kalsın.
  const sw = ready ? Math.round(DW * Math.max(MIN_SCALE, Math.min(w / DW, h / (WIN_BOT - WIN_TOP)))) : DW;
  const s = sw / DW;
  const ox = Math.round((w - sw) / 2);
  const oy = Math.round(h - WIN_BOT * s); // tuval üstü; WIN_BOT hep alt kenara oturur
  const Y = (yd: number) => Math.round(h - (WIN_BOT - yd) * s);

  const sceneStyle = useMemo<ViewStyle>(() => ({ position: 'absolute', left: ox, top: oy, width: sw, height: Math.round(DH * s) }), [ox, oy, sw, s]);
  const side = (k: 0 | 1, key: string) => {
    const edge = k === 0 ? { left: 0 } : { right: 0 };
    const wd = ox + 1; // 1 px örtüşme: dikiş görünmesin
    return (
      <React.Fragment key={key}>
        <View pointerEvents="none" style={[{ position: 'absolute', top: Y(EDGE.hill1[k]), bottom: 0, width: wd, backgroundColor: c.hill, borderTopWidth: 1.6, borderColor: c.edge }, edge]} />
        <View pointerEvents="none" style={[{ position: 'absolute', top: Y(EDGE.hill2[k]), bottom: 0, width: wd, backgroundColor: c.hill2, borderTopWidth: 1.6, borderColor: c.edge }, edge]} />
        <View pointerEvents="none" style={[{ position: 'absolute', top: Y(EDGE.soil[k]), bottom: 0, width: wd, backgroundColor: c.soil, borderTopWidth: 2, borderColor: c.fg }, edge]} />
      </React.Fragment>
    );
  };

  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={onLayout}>
      {ready && ox > 1 ? [side(0, 'l'), side(1, 'r')] : null}
      {ready ? (
        <GardenScene
          goalDays={goalDays} dayStates={dayStates} variant="home" width={sw} style={sceneStyle}
          intro={intro} freshDay={freshDay} hills={hills} labels={labels} swayMs={swayMs} swayDeg={swayDeg}
          accessibilityLabel={accessibilityLabel}
        />
      ) : null}
    </View>
  );
}
