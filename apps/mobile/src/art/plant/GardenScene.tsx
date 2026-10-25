import React, { memo, useMemo } from 'react';
import { Animated, StyleProp, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { F, c, currentTheme } from '../../theme';
import { LeafGlyph } from './Leaf';
import { RootsLayer } from './Roots';
import { Cloud, HandNote, Hills, Sun, WhyTag } from './Scenery';
import { StemLayer } from './Stem';
import { TulipGlyph } from './Tulip';
import {
  DayStates, Layout, PlantItem, SceneVariant, buildLayout, classify, stateOf, todayNote,
} from './layout';
import {
  MS, UNFURL_SWING, UnfurlAnim, bloomAnim, introAnim, introDelay, introTotal, unfurlAnim, useBudPulse, useSceneClock, useSway, useWind, windOffset,
} from './motion';
import { CRISIS, HALO_RGB, SOIL2, TULIP_CURL_DEG } from './paths';
import { Mat, mat6, mul, rotM, trans } from './wobble';

const AG = Animated.createAnimatedComponent(G);
const AP = Animated.createAnimatedComponent(Path);

/** Tasarım (tuval) boyutları: ekranlar bu koordinatlarda yerleşir, `width` ile ölçeklenir. */
export const SCENE_SIZE: Record<SceneVariant, { w: number; h: number }> = {
  home: { w: 390, h: 750 },          // Ana ekran: güneş, bulutlar, tepeler, bitki (Main.dc.html; dock'un altı kırpılır)
  crisis: { w: 390, h: CRISIS.h },    // Kriz: gökyüzü, toprak kesiti, kökler, rüzgârlı bitki (Kriz.dc.html)
  mini: { w: 342, h: 252 },           // Kemer pencere içeriği (SahitPortal.dc.html): bulut, tepe, toprak, bitki
};
const PLANT_AT: Record<SceneVariant, { x: number; y: number }> = { home: { x: 25, y: 196 }, crisis: { x: CRISIS.plantX, y: CRISIS.plantY }, mini: { x: 61, y: 12 } };

// ---------------- Düğümler ----------------
type Mode = 'static' | 'intro' | 'fresh';
interface NodeProps { item: PlantItem; mode: Mode; clock: Animated.Value; delay: number; swing: number; restMark: boolean; penOp: number }

const sameNode = (a: NodeProps, b: NodeProps) =>
  a.item.place === b.item.place && a.item.look === b.item.look && a.item.rest === b.item.rest && a.mode === b.mode && a.delay === b.delay
  && a.clock === b.clock && a.swing === b.swing && a.restMark === b.restMark && a.penOp === b.penOp;

/** Bir yaprak ya da lale. 'intro': Ana ekran girişi (leafIn); 'fresh': taze açılan (yaprak 1,6 sn / lale 1,9 sn, hafif aşma). Aksi halde durağan <G>. */
const ItemNode = memo(function ItemNode({ item, mode, clock, delay, swing, restMark, penOp }: NodeProps) {
  const { place, look, rest } = item;
  const anim = useMemo(() => {
    if (mode === 'static') return null;
    if (place.kind === 'leaf') return mode === 'fresh' ? unfurlAnim(clock, delay, swing) : introAnim(clock, delay, false);
    return mode === 'fresh' ? bloomAnim(clock, delay) : introAnim(clock, delay, true);
  }, [mode, clock, delay, swing, place.kind]);

  if (place.kind === 'leaf') {
    const inner = (
      <G transform={mat6(look === 'today' ? place.mToday : place.m)}>
        <LeafGlyph look={look} variant={place.variant} penOp={penOp} restMark={restMark && rest} />
      </G>
    );
    if (!anim) return inner;
    const a = anim as UnfurlAnim;
    return (
      <AG originX={place.ax} originY={place.ay} scale={a.scale} rotation={mode === 'fresh' ? a.rotation : 0} opacity={a.opacity}>{inner}</AG>
    );
  }
  // lale
  const m: Mat = look === 'curl' ? mul(mul(mul(trans(place.ax, place.ay), rotM(TULIP_CURL_DEG)), trans(-place.ax, -place.ay)), place.m) : place.m;
  if (mode === 'fresh' && anim) {
    const b = anim as ReturnType<typeof bloomAnim>;
    return (
      <G transform={mat6(m)}>
        <AG opacity={b.budOpacity}><TulipGlyph look="today" part="bud" variant={place.variant} /></AG>
        <AG originX={14} originY={38} scale={b.scale} opacity={b.opacity}><TulipGlyph look="ink" variant={place.variant} /></AG>
      </G>
    );
  }
  const inner = <G transform={mat6(m)}><TulipGlyph look={look} variant={place.variant} /></G>;
  if (!anim) return inner;
  const a = anim as ReturnType<typeof introAnim>;
  return <AG originX={place.ax} originY={place.ay} scale={a.scale} opacity={a.opacity}>{inner}</AG>;
}, sameNode);

/** Bugünün tomurcuğu (hardal yaprak ya da lale tomurcuğu): 3,6 sn nabız, en çok 6 devir. */
const TodayNode = memo(function TodayNode({ item, pulse }: { item: PlantItem; pulse: Animated.AnimatedInterpolation<number> }) {
  const { place } = item;
  return (
    <AG originX={place.ax} originY={place.ay} scale={pulse}>
      {place.kind === 'leaf'
        ? <G transform={mat6(place.mToday)}><LeafGlyph look="today" variant={place.variant} /></G>
        : <G transform={mat6(place.m)}><TulipGlyph look="today" part="bud" variant={place.variant} /></G>}
    </AG>
  );
});

/** Hardal halka: yalnız taze lalenin arkasında, TEK SEFERLİK (3,4 sn). Parıltı saçılması/döngü yok. */
function Halo({ cx, cy, clock, start }: { cx: number; cy: number; clock: Animated.Value; start: number }) {
  const a = useMemo(() => bloomAnim(clock, start), [clock, start]);
  return (
    <AG originX={cx} originY={cy} scale={a.haloScale} opacity={a.haloOpacity}>
      <Circle cx={cx} cy={cy} r={60} fill="url(#qv-halo)" />
    </AG>
  );
}

// ---------------- Bitki (tek Svg) ----------------
export interface PlantProps {
  layout: Layout; states: DayStates;
  clock: Animated.Value; introOn: boolean; freshDay?: number; halo?: boolean;
  pulse: Animated.AnimatedInterpolation<number>;
  swing?: number; restMark?: boolean;
  freshDelay?: { leaf: number; tulip: number };
}
/**
 * Tüm bitki TEK Svg'de: kurşun/mürekkep gövde + sürgünler, yapraklar (React.memo), laleler, bugünün tomurcuğu. Sahne tek saat değeriyle
 * sürülür; yaprak başına Animated.Value yoktur. Durağan parçalar yeniden çizilmez (memo + özel eşitlik).
 */
export const Plant = memo(function Plant({ layout, states, clock, introOn, freshDay, halo = true, pulse, swing = UNFURL_SWING, restMark = false, freshDelay = { leaf: 1000, tulip: 1300 }, }: PlantProps) {
  const items = useMemo(() => classify(layout, states), [layout, states]);
  const doneCount = useMemo(() => items.filter(i => i.look === 'ink' || i.look === 'curl').length, [items]);
  const { w, h, penOp } = { w: layout.geo.w, h: layout.geo.h, penOp: layout.geo.penOp };
  const nodes = (kind: 'leaf' | 'tulip') => items.filter(i => i.place.kind === kind && i.look !== 'today').map(it => {
    const fresh = freshDay === it.place.day;
    const mode: Mode = fresh ? 'fresh' : introOn && (it.look === 'ink' || it.look === 'curl') ? 'intro' : 'static';
    const delay = fresh ? (kind === 'leaf' ? freshDelay.leaf : freshDelay.tulip) : mode === 'intro' ? introDelay(it.place.day, doneCount) : 0;
    return <ItemNode key={kind + it.place.day} item={it} mode={mode} clock={clock} delay={delay} swing={swing} restMark={restMark} penOp={penOp} />;
  });
  const freshTulip = halo && freshDay != null ? layout.tulips.find(t => t.day === freshDay) : undefined;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <Defs>
        <RadialGradient id="qv-halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={HALO_RGB} stopOpacity={0.6} />
          <Stop offset="0.68" stopColor={HALO_RGB} stopOpacity={0} />
          <Stop offset="1" stopColor={HALO_RGB} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {freshTulip ? <Halo cx={freshTulip.tipX} cy={freshTulip.tipY - 10} clock={clock} start={freshDelay.tulip} /> : null}
      <StemLayer layout={layout} states={states} />
      {nodes('leaf')}
      {nodes('tulip')}
      {items.filter(i => i.look === 'today').map(it => <TodayNode key={'t' + it.place.day} item={it} pulse={pulse} />)}
    </Svg>
  );
});

// ---------------- Sahne ----------------
function SceneFrame({ variant, width, style, children, accessibilityLabel }: { variant: SceneVariant; width?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode; accessibilityLabel?: string }) {
  const { w, h } = SCENE_SIZE[variant];
  const s = width ? width / w : 1;
  return (
    <View
      style={[{ width: w * s, height: h * s, overflow: 'hidden' }, style]}
      pointerEvents="none"
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: [{ scale: s }], transformOrigin: '0% 0%' }}>{children}</View>
    </View>
  );
}

/** Bitkinin sallandığı kutu (dönme merkezi tabanı). */
function SwayBox({ variant, kind, deg, ms, enabled, children }: { variant: SceneVariant; kind: 'calm' | 'gust'; deg?: number; ms?: number; enabled: boolean; children: React.ReactNode }) {
  const at = PLANT_AT[variant];
  const g = buildLayout(1, variant).geo;
  const sway = useSway(kind, { deg, ms, enabled });
  return (
    <Animated.View style={[{ position: 'absolute', left: at.x, top: at.y, width: g.w, height: g.h, transformOrigin: '50% 100%' }, sway]}>{children}</Animated.View>
  );
}

export interface GardenSceneProps {
  /** Hedef gün (30/60/90). Filiz/Fidan/Ağaç. */
  goalDays?: number;
  /** Gün durumları (dizin = gün-1 ya da {gün: durum}); bkz. makeDayStates. */
  dayStates: DayStates;
  /** home: Ana ekran; crisis: kesit (toprak altı kökler + rüzgâr); mini: kemer pencere içeriği (rest/curl tam yaprak). */
  variant?: SceneVariant;
  /** Ekranda px genişlik (tasarım genişliğinden ölçeklenir). */
  width?: number;
  /** Taze açılan gün (Gün tamam / tekrar oynama sonrası): yaprak 1,6 sn açılır; lale 1,9 sn hafif aşmayla açılır + hardal halka (tek sefer). */
  freshDay?: number;
  /** Ana ekran girişi: mürekkep yapraklar sırayla belirir (varsayılan: yalnız home). */
  intro?: boolean;
  /** false: tüm hareket kapalı (son kare). Hareketi-azalt açıkken zaten kapalıdır. */
  animate?: boolean;
  /** Değişince animasyonlar yeniden oynar. */
  playKey?: number | string;
  /** Esinti (home: 7 sn ±0,9°; Gün tamam: 8 sn ±0,7°). Kriz'de 28 sn rüzgâr (en çok 11°). */
  swayMs?: number; swayDeg?: number;
  /** crisis: kök ilerlemesi 0..1 (geçen süre / toplam süre) ya da Animated.Value. */
  rootProgress?: number | Animated.Value;
  /** El yazısı notlar (bileşen metin bilmez): bugün oku, neden etiketi, kök notu. */
  labels?: { today?: string; why?: string; roots?: string };
  /** Tepeler: Gün tamam'da 'done'. */
  hills?: 'home' | 'done';
  /** Taze lalenin arkasında tek seferlik hardal halka (varsayılan açık). */
  halo?: boolean;
  /** Dinlenme günü yaprağının altında ince kurşun nokta (yalnız kendi ekranında; varsayılan kapalı = tam yaprak). */
  restMark?: boolean;
  /** crisis: rüzgâr çizgileri ile bitki arasına çizilecek içerik (ör. nefes dairesi). Tasarım koordinatlarında. */
  behind?: React.ReactNode;
  /** Erişilebilirlik özeti (örn. "14. gün, 2 lale"); verilmezse sahne ekran okuyucudan gizlenir. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Ana bitki sahnesi (saf görünüm: store/sunucu/navigasyon bilmez). Tuvaldeki çizimler BİREBİR (yol verileri tuvalden), titreme yollara pişirilmiş.
 * Hareket: tek sahne saati + Animated; tüm süreler dur() ile sarılı, hareket azaltılmışsa son kare.
 */
export const GardenScene = memo(function GardenScene({
  goalDays = 30, dayStates, variant = 'home', width, freshDay, intro, animate = true, playKey = 0, swayMs, swayDeg, rootProgress = 0,
  labels, hills = 'home', halo = true, restMark = false, behind, accessibilityLabel, style,
}: GardenSceneProps) {
  const layout = useMemo(() => buildLayout(goalDays, variant), [goalDays, variant]);
  const skey = useMemo(() => layout.byDay.map(p => stateOf(dayStates, p.day)[0]).join(''), [layout, dayStates]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const states = useMemo(() => dayStates, [skey]);
  const introOn = (intro ?? variant === 'home') && animate && variant !== 'crisis';

  // Sahne saati: giriş (yaprak başına gecikme) ve taze açılış tek değerle sürülür.
  const total = useMemo(() => {
    let t = 0;
    if (introOn) {
      const n = layout.byDay.filter(p => { const s = stateOf(states, p.day); return s === 'done' || s === 'rest' || s === 'curl'; }).length;
      t = Math.max(t, introTotal(introDelay(Math.max(1, n), n)));
    }
    if (freshDay != null) {
      const pl = layout.byDay[freshDay - 1];
      t = Math.max(t, pl?.kind === 'tulip' ? 1300 + 200 + MS.halo : 1000 + MS.unfurl);
    }
    return Math.max(t, 1);
  }, [introOn, freshDay, layout, states]);
  const { clock, done } = useSceneClock(total, animate && (introOn || freshDay != null), playKey);
  const pulse = useBudPulse(animate && variant === 'home', playKey);
  const plantAt = PLANT_AT[variant];
  const geo = layout.geo;
  const note = labels?.today && variant === 'home' ? todayNote(layout, states) : null;
  const plant = (
    <Plant layout={layout} states={states} clock={clock} introOn={introOn && !done} freshDay={animate ? freshDay : undefined} halo={halo} pulse={pulse} restMark={restMark} />
  );

  if (variant === 'crisis') return <CrisisScene layout={layout} states={states} width={width} animate={animate} plant={plant} rootProgress={rootProgress} labels={labels} behind={behind} style={style} accessibilityLabel={accessibilityLabel} />;
  if (variant === 'mini') {
    return (
      <SceneFrame variant="mini" width={width} style={style} accessibilityLabel={accessibilityLabel}>
        <MiniBackdrop />
        <SwayBox variant="mini" kind="calm" deg={swayDeg ?? 0.7} ms={swayMs ?? MS.swayDone} enabled={animate}>{plant}</SwayBox>
      </SceneFrame>
    );
  }
  return (
    <SceneFrame variant="home" width={width} style={style} accessibilityLabel={accessibilityLabel}>
      <View style={{ position: 'absolute', right: 24, top: 26 }}><Sun /></View>
      <View style={{ position: 'absolute', left: 118, top: 34 }}><Cloud kind="a" drift={animate} /></View>
      <View style={{ position: 'absolute', left: 232, top: 92 }}><Cloud kind="b" drift={animate} durationMs={58000} /></View>
      <View style={{ position: 'absolute', left: 0, top: 420 }}><Hills variant={hills} /></View>
      <SwayBox variant="home" kind="calm" deg={swayDeg ?? 0.9} ms={swayMs ?? MS.sway} enabled={animate}>
        {plant}
        {note ? (
          <View style={{ position: 'absolute', left: note.x, top: note.y }}><HandNote text={labels!.today!} left={note.left} /></View>
        ) : null}
      </SwayBox>
      {labels?.why ? <View style={{ position: 'absolute', left: 22, top: 524 }}><WhyTag text={labels.why} /></View> : null}
    </SceneFrame>
  );
});

/** Kemer pencere arka planı (SahitPortal.dc.html): bulut, sageWash tepe, toprak, çizikler. Kemerin kendisi ve damla çağıran ekranındır. */
const MiniBackdrop = memo(function MiniBackdrop() {
  return (
    <Svg width={342} height={252} viewBox="0 0 342 252" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Path d="M40 60 C30 60 30 48 40 47 C40 38 54 36 58 44 C62 36 78 38 78 48 C88 46 94 58 84 60Z" fill={c.surf} stroke={c.edge} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M-4 170 C60 140 130 136 190 152 C250 168 300 140 346 150 L346 260 L-4 260Z" fill={c.sageWash} />
      <Path d="M-4 170 C60 140 130 136 190 152 C250 168 300 140 346 150" fill="none" stroke={c.edge} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M-4 210 C70 196 140 192 200 200 C260 204 300 198 346 206 L346 260 L-4 260Z" fill={c.soil} />
      <Path d="M-4 210 C70 196 140 192 200 200 C260 204 300 198 346 206" fill="none" stroke={c.fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M30 232 l10 -3 M80 224 l12 -3 M270 230 l10 -3 M300 222 l10 -3" fill="none" stroke={c.fg} strokeWidth={1.4} strokeLinecap="round" opacity={0.45} />
    </Svg>
  );
});

// ---------------- Kriz kesiti ----------------
function CrisisScene({ layout, states, width, animate, plant, rootProgress, labels, behind, style, accessibilityLabel }: {
  layout: Layout; states: DayStates; width?: number; animate: boolean; plant: React.ReactNode; rootProgress: number | Animated.Value;
  labels?: GardenSceneProps['labels']; behind?: React.ReactNode; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const wind = useWind(animate);
  const offs = useMemo(() => CRISIS.wind.map(w => windOffset(wind, w.delay)), [wind]);
  const night = currentTheme() === 'dark';
  const soil2 = night ? SOIL2.dark : SOIL2.light;
  const idle = !animate;
  return (
    <SceneFrame variant="crisis" width={width} style={style} accessibilityLabel={accessibilityLabel}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: 390, height: CRISIS.skyH, backgroundColor: c.sky }} />
      <View style={{ position: 'absolute', left: 0, top: CRISIS.soilTop, width: 390, height: CRISIS.soilH, backgroundColor: c.soil }} />
      <Svg width={390} height={260} viewBox="0 0 390 260" style={{ position: 'absolute', left: 0, top: 30 }}>
        {CRISIS.wind.map((w, i) => (
          <AP key={i} d={w.d} fill="none" stroke={c.dim} strokeWidth={2.2} strokeLinecap="round" strokeDasharray={[50, 110]} opacity={0.55} strokeDashoffset={idle ? 0 : (offs[i] as unknown as number)} />
        ))}
      </Svg>
      {behind}
      <View style={{ position: 'absolute', left: 0, top: CRISIS.soilTop, width: 390, height: CRISIS.soilH, overflow: 'hidden' }}>
        <Svg width={390} height={CRISIS.soilH} viewBox={`0 0 390 ${CRISIS.soilH}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path d={CRISIS.soilMarks} fill="none" stroke={c.fg} strokeWidth={1.4} strokeLinecap="round" opacity={0.4} />
          <G fill={soil2} stroke={c.fg} strokeWidth={1.4}>
            {CRISIS.soilPebbles.map((p, i) => <Ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} />)}
          </G>
          <RootsLayer set="crisis" prog={rootProgress} />
        </Svg>
        {labels?.roots ? (
          <View style={{ position: 'absolute', left: 28, top: 96, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text allowFontScaling={false} style={{ fontFamily: F.hand, fontSize: 30, lineHeight: 30, color: c.fg }}>{labels.roots}</Text>
            <Svg width={34} height={22} viewBox="0 0 34 22"><Path d={CRISIS.rootArrow} fill="none" stroke={c.fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </View>
        ) : null}
      </View>
      <SwayBox variant="crisis" kind="gust" enabled={animate}>{plant}</SwayBox>
      <Svg width={390} height={40} viewBox="0 0 390 40" style={{ position: 'absolute', left: 0, top: 284 }}>
        <Path d={CRISIS.groundLine} fill="none" stroke={c.fg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={CRISIS.groundTuft} fill="none" stroke={c.fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </SceneFrame>
  );
}

