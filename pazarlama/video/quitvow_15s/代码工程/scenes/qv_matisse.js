// QuitVow · Matisse kesik kâğıt: "Her gün bir hücre" (dikey 1080×1920)
// Kompozisyon: kobalt kâğıt zemin; ortada 30 günlük takvim, her geçen gün renkli bir kâğıt parçasıyla iğnelenmiş;
// bugünün kırmızı karesi havada süzülüp yerine iğnelenir (ana hareket). Altta siyah kâğıttan dürtü dalgası, günler doldukça düzleşir.
// Motifler: yosun formları kâğıt gibi kökünden sallanır + kenarı kıvrılır; köşedeki sarı güneş yıldızı döner ve parlar.
SCENES['qv_matisse'] = (() => {
  const TAU = Math.PI * 2, { clamp, lerp } = U, P = PAINT, cut = P.cut;
  const C = { cobalt: '#1d4fb8', sky: '#4f95dc', yel: '#f7d21e', red: '#ee3216', black: '#141414', white: '#f7f3e8', green: '#1f9a5a', pink: '#ef6f9a', org: '#f28a24' };
  const GRID = { x: 120, y: 560, cell: 150, gap: 18, cols: 5, rows: 6 };
  const TODAY = 17;   // 0 tabanlı: 18. gün
  const cellXY = n => [GRID.x + (n % GRID.cols) * (GRID.cell + GRID.gap), GRID.y + Math.floor(n / GRID.cols) * (GRID.cell + GRID.gap)];
  const shadow = (c, fn) => { c.save(); c.shadowColor = 'rgba(10,20,40,.32)'; c.shadowOffsetX = 6; c.shadowOffsetY = 7; c.shadowBlur = 4; fn(); c.restore(); };
  const placed = (c, path, x, y, rot, sx, sy, col) => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(sx, sy); c.fillStyle = col; c.fill(path); c.restore(); };
  const cache = {};
  const memo = (k, f) => cache[k] || (cache[k] = f());

  // Kapsül + yosun (Matisse "Lagün" formu): gövde + sırayla sağa sola uzanan yuvarlak uçlu parmaklar
  function capsule(A, th, L, w) {
    const d = [Math.sin(th), -Math.cos(th)], n = [-d[1], d[0]], T = [A[0] + d[0] * (L - w / 2), A[1] + d[1] * (L - w / 2)], pts = [];
    pts.push([A[0] + n[0] * w * 0.42, A[1] + n[1] * w * 0.42]);
    pts.push([A[0] + d[0] * L * 0.5 + n[0] * w * 0.55, A[1] + d[1] * L * 0.5 + n[1] * w * 0.55]);
    for (let k = 0; k <= 6; k++) { const a = Math.atan2(n[1], n[0]) - k / 6 * Math.PI; pts.push([T[0] + Math.cos(a) * w / 2, T[1] + Math.sin(a) * w / 2]); }
    pts.push([A[0] + d[0] * L * 0.5 - n[0] * w * 0.55, A[1] + d[1] * L * 0.5 - n[1] * w * 0.55]);
    pts.push([A[0] - n[0] * w * 0.42, A[1] - n[1] * w * 0.42]);
    return pts;
  }
  function algae(len, width, lobes, seed, bend) {
    const r = U.rng(seed), p = new Path2D(), sp = u => [Math.sin(u * 1.6) * bend * len * 0.25, -u * len];
    p.addPath(cut(capsule(sp(0), bend * 0.2, len, width * 0.24), seed, 16, 2));
    const n = Math.round(lobes * 2);
    for (let k = 0; k < n; k++) { const u = 0.12 + 0.78 * k / Math.max(1, n - 1), side = k % 2 ? 1 : -1, A = sp(u);
      const th = side * (1.05 - 0.55 * u) + bend * 0.2 + (r() - 0.5) * 0.25, L = width * (1.0 - 0.45 * u) * (0.8 + r() * 0.3), w = width * (0.34 - 0.12 * u);
      p.addPath(cut(capsule(A, th, L, w), seed + k * 11, 15, 1.8)); }
    return p;
  }
  const star = (k, r0, r1, n) => memo('st' + k, () => { const r = U.rng(k * 31 + 5), pts = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + (r() - 0.5) * 0.2, rr = (i % 2 ? r1 : r0) * (0.8 + r() * 0.35); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return cut(pts, k * 17, 16, 2); });
  const blob = (k, r) => memo('bl' + k, () => cut(Array.from({ length: 18 }, (_, i) => { const a = i / 18 * TAU, q = U.rng(k * 9)(); return [Math.cos(a) * r * (0.85 + 0.15 * Math.sin(a * 3 + k)), Math.sin(a) * r * (0.85 + 0.15 * Math.cos(a * 2 + k))]; }), k * 5, 14, 2));
  const leaf = (k, r) => memo('lf' + k, () => cut([[0, -r], [r * 0.55, -r * 0.3], [r * 0.45, r * 0.5], [0, r], [-r * 0.45, r * 0.5], [-r * 0.55, -r * 0.3]], k * 13, 14, 2));
  const square = (k, s) => memo('sq' + k + '_' + s, () => cut([[-s / 2, -s / 2], [s / 2, -s / 2 + 3], [s / 2 - 2, s / 2], [-s / 2 + 2, s / 2 - 2]], k * 7 + 1, 18, 2.2));
  // Gün parçaları: her geçen gün farklı bir kesik form (yaprak, güneş, damla, yıldız)
  const DAY = (n) => { const kinds = ['leaf', 'blob', 'star', 'leaf', 'blob'], cols = [C.yel, C.green, C.pink, C.org, C.cobalt, C.black];
    return { kind: kinds[(n * 3) % 5], col: cols[(n * 5 + 1) % 6], rot: (U.rng(n + 3)() - 0.5) * 0.8 }; };

  // Durağan zemin: kobalt kâğıt + açık mavi iki büyük kesik alan + takvim kartı (önbellek)
  const bg = () => P.cached('qvm_bg', STAGE.W, STAGE.H, (g) => {
    g.fillStyle = C.cobalt; g.fillRect(0, 0, 1080, 1920);
    g.fillStyle = C.sky; g.fill(cut([[0, 0], [430, 0], [380, 260], [0, 330]], 3, 26, 3));
    g.fill(cut([[1080, 1180], [1080, 1560], [820, 1600], [900, 1300]], 4, 26, 3));
    // Takvim kartı: büyük beyaz kâğıt
    shadow(g, () => { g.fillStyle = C.white; g.fill(cut([[80, 520], [1004, 512], [1000, 1590], [76, 1584]], 5, 28, 3)); });
    // Başlık şeridi: siyah kâğıt üzerine beyaz harfler
    shadow(g, () => { g.fillStyle = C.black; g.fill(cut([[80, 360], [700, 352], [706, 470], [76, 476]], 6, 24, 2.5)); });
    g.fillStyle = C.white; g.font = '86px "ArchivoBlack-400"'; g.textBaseline = 'middle'; g.fillText('18. GÜN', 120, 418);
  });
  const gouache = () => P.cached('qvm_gouache', STAGE.W, STAGE.H, (g) => {
    const r = U.rng(2026); g.lineCap = 'round';
    for (let i = 0; i < 2200; i++) { const x = r() * 1080, y = r() * 1920, a = -0.3 + (r() - 0.5) * 0.5, L = 60 + r() * 260;
      g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.04 + r() * 0.06})` : `rgba(0,0,0,${0.03 + r() * 0.05})`; g.lineWidth = 6 + r() * 16;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  });

  function grid(c, t, lt) {
    for (let n = 0; n < 30; n++) {
      const [x, y] = cellXY(n), s = GRID.cell, cx = x + s / 2, cy = y + s / 2;
      if (n < TODAY) {
        const d = DAY(n);
        shadow(c, () => placed(c, square(n, s - 6), cx, cy, d.rot * 0.08, 1, 1, '#ecd9b8'));
        const sh = d.kind === 'leaf' ? leaf(n, 58) : d.kind === 'star' ? star(n, 62, 30, 6) : blob(n, 52);
        const wob = d.kind === 'star' ? t * 0.4 : 0;
        const pq = clamp((lt - 9.0 - n * 0.07) / 0.35), ps = 1 + Math.sin(pq * Math.PI) * 0.28;
        shadow(c, () => placed(c, sh, cx, cy, d.rot + wob + Math.sin(pq * Math.PI) * 0.3, ps, ps, d.col));
      } else if (n > TODAY) {
        c.save(); c.globalAlpha = 0.9; placed(c, square(n, s - 6), cx, cy, 0, 1, 1, '#dfe7f2'); c.restore();
      } else {
        // bugünün boş yuvası: kesik çizgili kenar
        c.save(); c.strokeStyle = C.red; c.lineWidth = 5; c.setLineDash([16, 12]); c.lineDashOffset = -t * 30; c.strokeRect(x + 6, y + 6, s - 12, s - 12); c.restore();
      }
    }
  }
  // Ana hareket: kırmızı kare havada süzülür, döner, yerine oturur ve iğnelenir
  function todayPiece(c, t, lt) {
    const [x, y] = cellXY(TODAY), tx = x + GRID.cell / 2, ty = y + GRID.cell / 2;
    const q = U.ease.inOut(clamp((lt - 3.0) / 3.0)), land = clamp((lt - 6.0) / 0.25);
    const px = lerp(980, tx, q) + Math.sin(lt * 3.1) * 50 * (1 - q), py = lerp(-120, ty, q) + Math.sin(lt * 2.2) * 30 * (1 - q);
    const flip = (1 - q) > 0.02 ? Math.cos(lt * 5.5) : 1, rot = lerp(0.9, 0, q) + Math.sin(lt * 4) * 0.2 * (1 - q);
    const sq = 1 + (land > 0 && land < 1 ? Math.sin(land * Math.PI) * 0.08 : 0);
    shadow(c, () => placed(c, square(99, GRID.cell - 6), px, py, rot, flip * sq, sq, C.red));
    if (land >= 1) { c.fillStyle = C.black; c.beginPath(); c.arc(tx, y + 22, 9, 0, TAU); c.fill(); c.fillStyle = '#888'; c.beginPath(); c.arc(tx - 3, y + 19, 3, 0, TAU); c.fill(); }
  }
  // Siyah dürtü dalgası: soldan yükselip sağa doğru kırılan dudak; calm ile tepe alçalır, dudak düzleşir.
  function wave(c, t, calm) {
    const A = lerp(1, 0.25, calm), sw = Math.sin(t * 1.3) * 12, F = 1700;
    const Y = y => lerp(F, y, A), X = x => x + sw * A;
    const B = (p0, p1, p2, p3) => P.bez(p0, p1, p2, p3, 18);
    const crest = [].concat(
      B([-30, Y(1730)], [X(150), Y(1700)], [X(240), Y(1450)], [X(420), Y(1430)]),          // sırt
      B([X(420), Y(1430)], [X(540), Y(1420)], [X(620), Y(1480)], [X(600), Y(1560)]),       // dudak, öne kırılır
      B([X(600), Y(1560)], [X(560), Y(1520)], [X(500), Y(1515)], [X(480), Y(1570)]),       // dudağın altı (iç kıvrım)
      B([X(480), Y(1570)], [X(520), Y(1650)], [X(600), Y(1680)], [X(700), Y(1685)]));
    const pts = [[-30, 1950], ...crest];
    for (let x = 740; x <= 1110; x += 40) pts.push([x, Y(1685) - 26 * A * Math.sin(x * 0.012 + t * 1.8) - 10]);
    pts.push([1110, 1950]);
    shadow(c, () => { c.fillStyle = C.black; c.fill(cut(pts, 7, 22, 2)); });
    // köpük saçağı: sırttan dudağa kadar kenar boyunca sık beyaz kâğıt dilleri
    const edge = B([X(250), Y(1500)], [X(330), Y(1440)], [X(520), Y(1405)], [X(600), Y(1520)]);
    edge.forEach((p, k) => { if (k % 2 || k < 2) return; const q = edge[Math.min(edge.length - 1, k + 1)], ang = Math.atan2(q[1] - p[1], q[0] - p[0]) - Math.PI / 2;
      placed(c, memo('foam' + k, () => cut(capsule([0, 0], 0, 34 + (k % 3) * 8, 22), 70 + k, 9, 1.4)), p[0], p[1] + 6, ang + Math.PI / 2 + Math.sin(t * 5 + k) * 0.12, A, A, C.white); });
    // dalganın içinde kayan iki kâğıt şerit
    [[1780, 0.9, 0], [1862, 1.3, 2]].forEach(([y, sp, ph], k) => { const pts2 = []; for (let x = -60; x <= 1140; x += 30) pts2.push([x, y + 14 * Math.sin(x * 0.016 + t * sp + ph)]); for (let x = 1140; x >= -60; x -= 30) pts2.push([x, y + 20 + 14 * Math.sin(x * 0.016 + t * sp + ph)]);
      c.fillStyle = k ? C.sky : C.white; c.fill(cut(pts2, 60 + k, 20, 1.6)); });
  }
  // Kapanış: beyaz kâğıt şerit sağdan uçup dalganın üstüne iğnelenir (12.75 vuruşu)
  function brand(c, t, lt) {
    const q = io2(clamp((lt - 12.15) / 0.6)); if (q <= 0) return;
    const x = lerp(1500, 540, q), y = 1700, rot = lerp(0.5, -0.03, q), sq = lt > 12.75 && lt < 13.0 ? 1 + Math.sin((lt - 12.75) / 0.25 * Math.PI) * 0.05 : 1;
    shadow(c, () => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(sq, sq);
      c.fillStyle = C.white; c.fill(memo('brandStrip', () => cut([[-470, -120], [470, -128], [476, 116], [-466, 122]], 88, 26, 2.5)));
      c.fillStyle = C.black; c.font = '118px "ArchivoBlack-400"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('QuitVow', 0, -30);
      c.fillStyle = C.red; c.font = '46px "ArchivoBlack-400"'; c.fillText('İrade değil, sistem.', 0, 66);
      c.restore(); });
    if (lt >= 12.75) [[-430, -90], [430, -98]].forEach(([dx, dy]) => { c.fillStyle = C.black; c.beginPath(); c.arc(540 + dx, 1700 + dy, 10, 0, TAU); c.fill(); });
  }
  const io2 = k => U.ease.inOut(k);
  const ALG = [[90, 1600, 520, 190, 4, 0.35, C.white, 0], [990, 1640, 420, 170, 3.5, -0.4, C.yel, 1.4], [560, 330, 200, 100, 2.5, -0.3, C.pink, 2.2]];

  return {
    draw(c, lt, t) {
      const io = U.ease.inOut, calm = io(clamp((lt - 6.2) / 3.8));
      // Kamera: dalga ve boş hücreye yakın (0–3) → kâğıt gelirken geri çekilir (3–4.8) → yavaş yaklaşma (4.8–12) → sabit
      const k1 = io(clamp((lt - 3.0) / 1.8)), k2 = io(clamp((lt - 4.8) / 7.2)), k3 = io(clamp((lt - 12) / 1.5));
      const z = lerp(lerp(1.55, 1.65, clamp(lt / 3)), 1, k1) + 0.07 * k2 * (1 - k3);
      let fx = lerp(470, 540, k1), fy = lerp(1330, 960, k1) + 40 * k2 * (1 - k3);
      const hw = 540 / z, hh = 960 / z; fx = clamp(fx, hw, 1080 - hw); fy = clamp(fy, hh, 1920 - hh);
      c.save(); c.translate(540, 960); c.scale(z, z); c.translate(-fx, -fy);
      c.drawImage(bg(), 0, 0);
      // Motif 2: güneş yıldızı döner ve nabız gibi büyür
      const s = 0.9 + 0.12 * Math.sin(t * 5);
      shadow(c, () => placed(c, star(7, 120, 62, 9), 900, 220, t * 0.5, s, s, C.yel));
      grid(c, t, lt);
      // Motif 1: yosunlar kâğıt gibi sallanır + kenarı kıvrılır
      ALG.forEach(([x, y, len, wd, lobes, bend, col, ph], k) => {
        const rot = Math.sin(t * 2.6 + ph) * 0.12, sx = 0.92 + 0.08 * Math.sin(t * 3.4 + ph * 1.7);
        shadow(c, () => placed(c, memo('alg' + k, () => algae(len, wd, lobes, k * 7 + 3, bend)), x, y, rot, sx, 1, col));
      });
      wave(c, t, calm);
      todayPiece(c, t, lt);
      brand(c, t, lt);
      c.save(); c.globalCompositeOperation = 'overlay'; c.drawImage(gouache(), 0, 0); c.restore();
      c.restore();
    },
  };
})();
