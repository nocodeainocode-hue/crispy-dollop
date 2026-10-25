import React from 'react';
import { View } from 'react-native';
import { c, alpha } from '../theme';

// Kriz kesit sahnesinin saf geometrisi ve View ile çizilen parçalar (react-native-svg yok).
export type Pt = { x: number; y: number };

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Sabit tohumlu sapma (-0.5..0.5). Math.random yok: aynı gün aynı bitki. */
export const jit = (i: number) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s) - 0.5; };

/** Gövde: zeminden yukarı hafif S eğrisi. t=0 zemin, t=1 tepe. Koordinatlar bitki grubunun içinde (gw x gh). */
export const stemPoint = (t: number, gw: number, gh: number, top = 16): Pt => {
  const amp = gw * 0.11;
  return { x: gw / 2 + amp * Math.sin(t * 6.4 + 0.55) * (1 - 0.42 * t), y: gh - t * (gh - top) };
};

/** Kübik Bézier'i n parçaya böler (n+1 nokta). */
export function bezier(p: [Pt, Pt, Pt, Pt], n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({
      x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
      y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
    });
  }
  return out;
}

/** İki nokta arasında kalın çizgi parçası (dönmüş View, yuvarlak uçlu). `dash` çizgiyi kesikli gösterir (gelecek). */
export function Seg({ a, b, w, color, opacity = 1 }: { a: Pt; b: Pt; w: number; color: string; opacity?: number }) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) + w * 0.7; // eklem yerleri kapansın
  const ang = Math.atan2(dy, dx);
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', left: (a.x + b.x) / 2 - len / 2, top: (a.y + b.y) / 2 - w / 2, width: len, height: w,
      borderRadius: w / 2, backgroundColor: color, opacity, transform: [{ rotate: `${ang}rad` }],
    }} />
  );
}

/** Yaprak biçimi: iki karşı köşesi yuvarlak, iki köşesi sivri (BL ve TR uçlu). */
export const leafRadii = (h: number) => ({
  borderTopLeftRadius: h * 0.85, borderBottomRightRadius: h * 0.85, borderTopRightRadius: h * 0.1, borderBottomLeftRadius: h * 0.1,
});

/**
 * Tek yaprak. kind: 'ink' = dolu sage + mürekkep çizgi (geçen gün), 'pencil' = kesik kurşun taslak (gelecek).
 * Durum yalnız renkle değil biçimle de ayrılır (dolu çizgi / kesik çizgi). Taban BL köşesi, uç TR köşesi.
 */
export function Leaf({ w, h, kind, rot = 0, flip = 1, left, top, children }: {
  w: number; h: number; kind: 'ink' | 'pencil'; rot?: number; flip?: 1 | -1; left?: number; top?: number; children?: React.ReactNode;
}) {
  const ink = kind === 'ink';
  const ang = -Math.atan2(h, w);
  const vein = Math.hypot(w, h) * 0.78;
  return (
    <View pointerEvents="none" style={[
      leafRadii(h),
      { position: left === undefined ? 'relative' : 'absolute', left, top, width: w, height: h, backgroundColor: ink ? c.sage : 'transparent', borderWidth: ink ? 1.6 : 1.4, borderColor: ink ? c.fg : c.edge, borderStyle: ink ? 'solid' : 'dashed', opacity: ink ? 1 : 0.8, transform: [{ scaleX: flip }, { rotate: `${rot}deg` }] },
    ]}>
      {ink && <View style={{ position: 'absolute', left: w / 2 - vein / 2, top: h / 2 - 0.6, width: vein, height: 1.2, backgroundColor: alpha(c.fg, 0.5), transform: [{ rotate: `${ang}rad` }] }} />}
      {children}
    </View>
  );
}

/** Lale başı: üç taç yaprak (View). pencil: kesik kurşun taslak. q ölçek. */
export function TulipHead({ q, kind, left, top }: { q: number; kind: 'ink' | 'pencil'; left: number; top: number }) {
  const ink = kind === 'ink';
  const pw = 11 * q, ph = 21 * q;
  const petal = (extra: object, key: string) => (
    <View key={key} style={[{
      position: 'absolute', width: pw, height: ph, borderTopLeftRadius: pw * 0.55, borderTopRightRadius: pw * 0.55, borderBottomLeftRadius: pw * 0.8, borderBottomRightRadius: pw * 0.8,
      backgroundColor: ink ? c.tulip : 'transparent', borderWidth: ink ? 1.5 : 1.3, borderColor: ink ? c.fg : c.edge, borderStyle: ink ? 'solid' : 'dashed',
    }, extra]} />
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top, width: pw * 2.2, height: ph * 1.15, opacity: ink ? 1 : 0.8 }}>
      {petal({ left: pw * 0.1, top: ph * 0.12, transform: [{ rotate: '-24deg' }] }, 'l')}
      {petal({ left: pw * 1.1, top: ph * 0.12, transform: [{ rotate: '24deg' }] }, 'r')}
      {petal({ left: pw * 0.6, top: 0 }, 'c')}
    </View>
  );
}

/** Bugünün tomurcuğu: küçük hardal çakıl (yalnız bu küçük yerde hardal kullanılır). */
export function Bud({ s, left, top }: { s: number; left: number; top: number }) {
  const w = 13 * s, h = 17 * s;
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', left, top, width: w, height: h, backgroundColor: c.mustard, borderWidth: 1.6, borderColor: c.fg,
      borderTopLeftRadius: h * 0.55, borderTopRightRadius: h * 0.45, borderBottomRightRadius: h * 0.5, borderBottomLeftRadius: h * 0.4,
    }} />
  );
}
