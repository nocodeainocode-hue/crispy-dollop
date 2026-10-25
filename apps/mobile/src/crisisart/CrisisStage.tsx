import React, { memo, useMemo, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { GardenScene, SCENE_SIZE, makeDayStates } from '../art/plant';
import { CRISIS } from '../art/plant/paths';
import { useBreath } from '../components/motion';
import { F, alpha, c } from '../theme';

/**
 * Kriz sahnesi: art/plant GardenScene variant "crisis" (gökyüzü, toprak kesiti, rüzgârlı bitki, kökler) + nefes diski.
 * Saf görünüm: süre, kilit ve sunucu Crisis.tsx'te. Bu bileşen yalnızca yerleşim ve hareket bağlar:
 *  - bitki rüzgârda en çok 11° sallanır (kütüphane: useSway "gust"), kökler `rootProgress` ile sırayla uzar;
 *  - nefes diski GardenScene'in `behind` yuvasında (rüzgâr çizgileri ile bitki arasında): al 4 sn, ver 6 sn, tutma yok;
 *  - sahne tasarım oranını (390x458) korur: genişliğe sığar, boy yetmezse boş gökyüzünün en çok CROP kadarı kırpılır, o da yetmezse küçülür
 *    (yanlarda gökyüzü ve toprak düz renkle sürer, zemin çizgisi iki ucu tutar). Kaydırma yok.
 * `children` (süre, nefes komutu) sahnenin sol üst gökyüzüne biner; bitki bilerek sağdadır.
 * Hareketi azalt açıkken kütüphane kancaları bitkiyi ve kökleri, useBreath diski durağan (orta boy) tutar.
 */
export const PROG_STEPS = 90; // 15 dk / 10 sn: kök ilerlemesi 10 sn adımlarıyla (her adım 1 sn doğrusal geçiş)
const DW = SCENE_SIZE.crisis.w;
const DH = SCENE_SIZE.crisis.h;
const CROP = 40;       // kırpılabilecek boş gökyüzü (tasarım px)
const LINE_Y = 304;    // zemin çizgisi orta noktası (groundLine uçları)
const DISC_CX = CRISIS.plantX + CRISIS.plantW / 2;
const DISC_CY = 186;
const DISC_D = 176;

/** Gökyüzü zemin renginde yumuşak hâle: rüzgâr çizgisi yazının arkasından geçerken üstü çizilmiş gibi görünmesin. */
export const skyHalo = () => ({ textShadowColor: c.sky, textShadowRadius: 7, textShadowOffset: { width: 0, height: 0 } } as const);

/** Nefes diski: al 4 sn, ver 6 sn (tutma yok). Ölçek 1 → 1,16; hareketi azalt açıkken orta boyda durur. */
function BreathDisc() {
  const v = useBreath(4000, 0, 6000);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: DISC_CX - DISC_D / 2, top: DISC_CY - DISC_D / 2, width: DISC_D, height: DISC_D, borderRadius: DISC_D / 2,
        backgroundColor: c.sageWash, borderWidth: 2, borderColor: alpha(c.edge, 0.6),
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) }],
      }}
    />
  );
}

type Place = { s: number; width: number; left: number; top: number };
/** Kapsayıcı (W x H) içinde sahnenin ölçeği ve konumu; alt kenar her zaman kapsayıcının altıdır (kökler görünür kalır). */
function place(W: number, H: number): Place | null {
  if (W < 1 || H < 1) return null;
  const sW = W / DW;
  if ((DH - CROP) * sW <= H) return { s: sW, width: W, left: 0, top: H - DH * sW };
  const s = H / (DH - CROP);
  const width = Math.round(DW * s);
  return { s, width, left: Math.round((W - width) / 2), top: -CROP * s };
}

const SceneLayer = memo(function SceneLayer({ at, goalDays, day, hardKey, rootProgress, rooting, breathKey }: {
  at: Place; goalDays: number; day: number; hardKey: string; rootProgress: number; rooting: string; breathKey: number;
}) {
  const states = useMemo(() => makeDayStates(goalDays, day, { curl: hardKey ? hardKey.split(',').map(Number) : [] }), [goalDays, day, hardKey]);
  const behind = useMemo(() => <BreathDisc key={breathKey} />, [breathKey]);
  const labels = useMemo(() => ({ roots: rooting }), [rooting]);
  const style = useMemo(() => ({ position: 'absolute' as const, left: at.left, top: at.top }), [at.left, at.top]);
  return <GardenScene variant="crisis" goalDays={goalDays} dayStates={states} width={at.width} rootProgress={rootProgress} labels={labels} behind={behind} style={style} />;
});

export default function CrisisStage({ goalDays, day, hard, rootProgress, rooting, steps, breathKey, children }: {
  goalDays: number;
  day: number;                 // paket günü (1 tabanlı)
  hard: number[];              // zor (tekrar oynama) günleri: yaprak silinmez, kenarı kıvrılır
  rootProgress: number;        // 0..1 geçen süre / toplam süre
  rooting: string;             // topraktaki el notu
  steps?: string[];            // gökyüzü el notları (yer varsa; her biri kısa)
  breathKey: number;           // değişince nefes diski baştan başlar (komut metniyle aynı başlangıç)
  children?: React.ReactNode;  // sol üstte: süre ve nefes komutu
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const at = place(box.w, box.h);
  const hardKey = hard.join(',');
  const textMax = at ? Math.max(150, Math.min(box.w - 32, Math.round(at.left + 200 * at.s) - 16)) : 240;
  const notesMax = at ? Math.max(100, Math.round(at.left + 168 * at.s) - 16 - 20) : 120;
  const showNotes = !!steps && steps.length > 0 && box.h >= 400 && box.w >= 340;
  return (
    <View style={{ flex: 1, minHeight: 120, backgroundColor: c.sky, overflow: 'hidden' }} onLayout={e => setBox({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}>
      {!!at && <>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: at.top + CRISIS.soilTop * at.s, bottom: 0, backgroundColor: c.soil }} />
        {at.left > 0 && [0, at.left + at.width].map(x => (
          <View key={x} pointerEvents="none" style={{ position: 'absolute', left: x, width: at.left, top: at.top + LINE_Y * at.s - 1.2, height: 2.4, backgroundColor: c.fg }} />
        ))}
        <SceneLayer at={at} goalDays={goalDays} day={day} hardKey={hardKey} rootProgress={Math.round(rootProgress * PROG_STEPS) / PROG_STEPS} rooting={rooting} breathKey={breathKey} />
      </>}
      <View pointerEvents="none" style={{ position: 'absolute', left: 16, top: 0, maxWidth: textMax }}>
        {children}
        {showNotes && (
          <View style={{ marginTop: 10, maxWidth: notesMax }}>
            {steps!.map(t => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <View style={{ width: 7, height: 6, marginRight: 8, backgroundColor: c.fg, opacity: 0.55, borderTopLeftRadius: 4, borderTopRightRadius: 3, borderBottomRightRadius: 4, borderBottomLeftRadius: 2 }} />
                <Text maxFontSizeMultiplier={1.2} style={[{ flexShrink: 1, fontFamily: F.hand, fontSize: 23, lineHeight: 28, color: c.fg }, skyHalo()]}>{t}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
