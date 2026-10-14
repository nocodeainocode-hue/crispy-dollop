// QuitVow · Van Gogh: "Gece ve dürtü" (dikey 1080×1920)
// Kompozisyon: üst üçte iki kıvrılan gece göğü = dürtü; ortada damlar bandı; sağda sokak lambası (hale = şahitler);
// altta ahşap masa, iki el ve telefon. Ana hareket: başparmak "KRİZDEYİM"e basar, girdaplar yavaşlayıp söner.
// Motifler: gökyüzü girdaplara kıvrılır; lamba halesi dışa doğru halka halka yayılır.
// Gökyüzü tonları 205–222° arasında tutuldu (deliver.py'nin 225–300° mor-mavi bandının dışında).
SCENES['qv_vangogh'] = (() => {
  const { clamp, lerp } = U, P = PAINT, TAU = Math.PI * 2;
  const W = () => STAGE.W, H = () => STAGE.H;
  const C = { line: '#162a4a', lamp: '#f6d34a', halo: '#fff2a8', roof: '#20304f', wall: '#4a6f95', win: '#f5c542',
    wood: '#c98a2e', wood2: '#8e5a1c', skin: '#e8b48c', skin2: '#c98b62', phone: '#121417', red: '#ee3216' };
  const LAMP = [850, 760];
  const HOUSES = [[30, 1205, 120, 125], [190, 1195, 140, 135], [380, 1190, 120, 140], [560, 1210, 150, 120], [760, 1198, 130, 132], [930, 1206, 140, 124]];
  const VP = [540, 1330];
  // Girdaplar: [x, y, yarıçap, yön]. Büyük olan dürtünün kendisi.
  const SW = [[430, 560, 300, 1], [860, 300, 140, -1], [170, 230, 120, -1], [760, 1010, 95, 1], [180, 980, 110, 1]];
  const STARS = [[620, 150, 22], [330, 160, 15], [980, 520, 18], [90, 520, 14], [540, 900, 12], [960, 140, 16]];
  // Krize bastıktan sonra dürtü sakinleşir: calm 0→1
  const calmAt = lt => U.ease.inOut(clamp((lt - 4.5) / 5.5));
  let LT = 0;
  const pressAt = lt => { const a = clamp((lt - 1.75) / 0.5), b = clamp((lt - 3.2) / 0.6); return U.ease.inOut(a) * (1 - U.ease.inOut(b) * 0.85); };

  function base(g, t, calm) {
    const w = W(), h = H();
    // Gökyüzü
    const sg = g.createLinearGradient(0, 0, 0, 1200); sg.addColorStop(0, '#13305e'); sg.addColorStop(0.6, '#1f4f8a'); sg.addColorStop(1, '#3a73a8');
    g.fillStyle = sg; g.fillRect(0, 0, w, 1220);
    g.lineCap = 'round';
    SW.forEach(([x, y, r, dir], k) => {
      const spin = t * (0.55 + k * 0.12) * dir * (1 - calm * 0.75), amp = k === 0 ? 1 - calm * 0.55 : 1;
      for (let ring = 0; ring < 4; ring++) {
        g.strokeStyle = ring % 2 ? '#9cc7ea' : '#4f86c2'; g.lineWidth = (k === 0 ? 30 : 18) - ring * 4; g.beginPath();
        for (let a = 0; a < Math.PI * 3.2; a += 0.12) {
          const rr = r * amp * (0.2 + a / (Math.PI * 3.2)) * (1 - ring * 0.1), aa = a * dir + spin + ring * 0.5;
          const px = x + Math.cos(aa) * rr, py = y + Math.sin(aa) * rr * 0.82; a ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
      }
    });
    // Ay
    g.fillStyle = C.lamp; g.beginPath(); g.arc(960, 140, 46, 0, TAU); g.fill();
    g.fillStyle = '#1a3a6c'; g.beginPath(); g.arc(940, 128, 38, 0, TAU); g.fill();
    // Lamba halesi zemini
    const hg = g.createRadialGradient(LAMP[0], LAMP[1], 8, LAMP[0], LAMP[1], 190);
    hg.addColorStop(0, '#fff8d0'); hg.addColorStop(0.45, '#f4d65a'); hg.addColorStop(1, 'rgba(80,120,170,0)');
    g.fillStyle = hg; g.beginPath(); g.arc(LAMP[0], LAMP[1], 190, 0, TAU); g.fill();
    // Damlar bandı (y 1120–1330)
    g.fillStyle = C.roof;
    g.beginPath(); g.moveTo(0, 1330);
    [[0, 1180], [70, 1150], [140, 1190], [210, 1130], [300, 1170], [360, 1110], [420, 1160], [520, 1140], [600, 1180], [660, 1120], [740, 1165], [800, 1150], [880, 1185], [960, 1140], [1080, 1170], [1080, 1330]].forEach(p => g.lineTo(...p));
    g.closePath(); g.fill();
    g.fillStyle = C.wall;
    HOUSES.forEach(r => g.fillRect(...r)); [[30, 1210, 120, 120], [190, 1200, 140, 130], [380, 1190, 120, 140], [560, 1215, 150, 115], [760, 1200, 130, 130], [930, 1210, 140, 120]].forEach(r => g.fillRect(...r));
    // Kilise kulesi (sivri, ufukta tek dikey)
    g.fillStyle = C.roof; g.beginPath(); g.moveTo(470, 1200); g.lineTo(500, 1010); g.lineTo(530, 1200); g.fill();
    // Sokak lambası direği
    g.fillStyle = '#1b2333'; g.fillRect(LAMP[0] - 9, LAMP[1] + 20, 18, 520);
    // Masa (perspektif tahtalar)
    g.fillStyle = C.wood; g.fillRect(0, 1330, w, h - 1330);
    g.strokeStyle = C.wood2; g.lineWidth = 7;
    for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(VP[0] + i * 40, 1330); g.lineTo(VP[0] + i * 260, h); g.stroke(); }
    g.fillStyle = '#5a3a14'; g.fillRect(0, 1322, w, 14);
  }

  // Göğün akış alanı: en yakın girdabın teğeti
  const angle = (x, y, t) => {
    if (y < 1210) {
      let best = null, bd = 1e9; SW.forEach(s => { const d = Math.hypot(x - s[0], y - s[1]) / s[2]; if (d < bd) { bd = d; best = s; } });
      const dl = Math.hypot(x - LAMP[0], y - LAMP[1]); if (dl < 200) return Math.atan2(y - LAMP[1], x - LAMP[0]) + Math.PI / 2;
      if (bd < 1.5) return Math.atan2(y - best[1], x - best[0]) + Math.PI / 2 * best[3];
      return 0.25 * Math.sin(x * 0.01 + y * 0.004 + t * 0.6);
    }
    if (y < 1330) return x % 260 < 130 ? 0.1 : -Math.PI / 2;
    return Math.atan2(y - VP[1], x - VP[0]);
  };
  const SWT = {
    sky: P.swatch(['#173a6e', '#24558f', '#3f78b4', '#6fa3d4', '#a7cdee', '#1c4a7e', '#2f6aa8'], 0.4),
    halo: P.swatch(['#fff2a0', '#f6d84a', '#ffe680', '#f0c040', '#fff8d0'], 0.3),
    town: P.swatch(['#20304f', '#2c4a6e', '#33557a', '#1a2840', '#3e5f7a'], 0.35),
    skin: P.swatch(['#eab58e', '#f2c6a0', '#d99a72', '#e0a882', '#f6d2b0', '#c98b62'], 0.35),
    wood: P.swatch(['#d6952f', '#b9781f', '#e8ac44', '#9a6018', '#c98a2e', '#7f9a4a'], 0.3),
  };
  const palette = (x, y, col, r) => {
    if (Math.hypot(x - LAMP[0], y - LAMP[1]) < 150) return SWT.halo(col, r);
    if (y < 1120) return SWT.sky(col, r);
    if (y < 1330) return SWT.town(col, r);
    return SWT.wood(col, r);
  };

  // Eller + telefon. Eller iki katman: arkadaki avuçlar, öndeki parmaklar/başparmaklar (ikisi de ince fırça + mavi kontur).
  const PH = { x: 540, y: 1545, w: 300, h: 560, rot: -0.05 };
  const BTN = { y: 120, h: 112 };
  const tf = (g, t) => { g.translate(PH.x, PH.y); g.rotate(PH.rot + Math.sin(t * 0.8) * 0.008); };
  const thumbs = press => ({
    L: [[-215, 430], [-150, 300], [-82, 236]],
    R: [[215, 430], [lerp(150, 120, press), lerp(300, 260, press)], [lerp(84, 18, press), lerp(236, BTN.y + 10, press)]],
  });
  // Avuç: alttan gelip telefonun arkasını kavrar; dış kenarda parmak boğumları (iç kısım telefonun arkasında kalır).
  function palmsPath() {
    const p = new Path2D();
    for (const sd of [-1, 1]) {
      p.moveTo(sd * 440, 480); p.bezierCurveTo(sd * 420, 330, sd * 300, 180, sd * 205, 60);
      [[60, -10], [-10, -80], [-80, -150], [-150, -215]].forEach(([y0, y1], k) => { const xm = sd * (212 - k * 4); p.quadraticCurveTo(sd * 236, (y0 + y1) / 2, xm, y1); });
      p.quadraticCurveTo(sd * 190, -248, sd * 140, -236); p.lineTo(sd * 140, 480); p.closePath();
    }
    return p;
  }
  function capsule(g, pts, w, fill, line) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = () => { g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]); };
    if (line) { g.strokeStyle = line; g.lineWidth = w + 9; path(); g.stroke(); }
    g.strokeStyle = fill; g.lineWidth = w; path(); g.stroke();
  }
  function frontHands(g, press, line) {
    const T = thumbs(press);
    capsule(g, T.L, 62, C.skin, line); capsule(g, T.R, 62, C.skin, line);
  }
  function nails(g, press) {
    const T = thumbs(press);
    [T.L, T.R].forEach(p => { const [a, b] = [p[1], p[2]], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      g.save(); g.translate(b[0] - Math.cos(ang) * 6, b[1] - Math.sin(ang) * 6); g.rotate(ang); g.fillStyle = '#f3cdb0'; g.strokeStyle = C.skin2; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, 0, 17, 15, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); });
  }
  function phone(g, press) {
    g.fillStyle = C.phone; g.beginPath(); g.roundRect(-PH.w / 2, -PH.h / 2, PH.w, PH.h, 42); g.fill();
    g.strokeStyle = '#2b2f36'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#0b0b0d'; g.beginPath(); g.roundRect(-PH.w / 2 + 14, -PH.h / 2 + 16, PH.w - 28, PH.h - 32, 30); g.fill();
    for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
      const n = j * 6 + i, x = -111 + i * 38, y = -232 + j * 38;
      const pop = n === 17 ? clamp((LT - 10.5) / 0.3) : 0, sz = 31 * (1 + Math.sin(pop * Math.PI) * 0.25);
      g.fillStyle = n < 17 || pop >= 0.5 ? '#e8e6e6' : n === 17 ? C.red : 'rgba(232,230,230,.13)'; g.fillRect(x + 15.5 - sz / 2, y + 15.5 - sz / 2, sz, sz);
    }
    g.fillStyle = '#e8e6e6'; g.font = '30px "Poppins-700"'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(LT < 10.5 ? '18. gün' : '18. gün tamam', 0, -48);
    g.fillStyle = 'rgba(232,230,230,.55)'; g.font = '22px "Poppins-600"'; g.fillText(LT < 2.25 ? 'Dürtü bir dalga. Geçer.' : 'Şahitlerine haber gitti.', 0, -10);
    const bs = 1 - press * 0.07;
    g.save(); g.translate(0, BTN.y); g.scale(bs, bs);
    g.fillStyle = C.red; g.beginPath(); g.roundRect(-112, -BTN.h / 2, 224, BTN.h, 24); g.fill();
    g.fillStyle = '#fff'; g.font = '32px "Poppins-800"'; g.textBaseline = 'middle'; g.fillText('KRİZDEYİM', 0, 3);
    g.restore();
  }
  function handsAndPhone(c, t, press) {
    const line = C.line;
    // arka: avuçlar
    const A = P.scratch('qvPalm'), ag = A.getContext('2d'); ag.reset(); ag.save(); tf(ag, t); ag.fillStyle = C.skin; ag.fill(palmsPath()); ag.restore();
    ag.save(); ag.globalCompositeOperation = 'source-atop';
    P.strokes(ag, A, { cell: 8, len: 22, width: 6, seed: 5, t, boil: 0, outline: 0, alphaMask: true, palette: (x, y, col, r) => SWT.skin(col, r), angle: (x, y) => -Math.PI / 2 + (x < 540 ? 0.45 : -0.45) });
    ag.restore();
    c.save(); tf(c, t); c.strokeStyle = line; c.lineWidth = 10; c.lineJoin = 'round'; c.stroke(palmsPath()); c.restore();
    c.drawImage(A, 0, 0);
    c.save(); tf(c, t); phone(c, press); c.restore();
    // ön: parmaklar + başparmaklar
    const F = P.scratch('qvFront'), fg = F.getContext('2d'); fg.reset(); fg.save(); tf(fg, t); frontHands(fg, press, null); fg.restore();
    c.save(); tf(c, t); const T = thumbs(press); capsule(c, T.L, 72, line, null); capsule(c, T.R, 72, line, null); c.restore();
    fg.save(); fg.globalCompositeOperation = 'source-atop';
    P.strokes(fg, F, { cell: 6, len: 14, width: 4.5, seed: 6, t, boil: 0, outline: 0, alphaMask: true, palette: (x, y, col, r) => { const L = col[0] + col[1] + col[2]; return L < 250 ? null : SWT.skin(col, r); }, angle: (x, y) => (x < 540 ? -0.9 : -2.2) });
    fg.restore(); c.drawImage(F, 0, 0);
    c.save(); tf(c, t); nails(c, press); c.restore();
  }

  function lines(c, t) {
    const sd = P.boilSeed(t, 8); c.save(); c.strokeStyle = C.line; c.lineWidth = 5; c.lineJoin = 'round';
    const R_ = (pts, closed = false) => { P.roughPath(c, pts, { amp: 2.4, seed: sd * 31 + pts.length + (pts[0][0] | 0), closed, step: 16 }); c.stroke(); };
    R_([[0, 1180], [70, 1150], [140, 1190], [210, 1130], [300, 1170], [360, 1110], [420, 1160], [520, 1140], [600, 1180], [660, 1120], [740, 1165], [800, 1150], [880, 1185], [960, 1140], [1080, 1170]]);
    R_([[470, 1200], [500, 1010], [530, 1200]]);
    HOUSES.forEach(([x, y, w, h]) => R_([[x, y + h], [x, y], [x + w, y], [x + w, y + h]]));
    R_([[LAMP[0] - 9, LAMP[1] + 20], [LAMP[0] - 9, 1330]]); R_([[LAMP[0] + 9, LAMP[1] + 20], [LAMP[0] + 9, 1330]]);
    R_([[0, 1330], [1080, 1330]]);
    c.restore();
  }

  return {
    draw(c, lt, t) {
      LT = lt;
      const calm = calmAt(lt), press = pressAt(lt);
      // Kamera: telefona yakın açılır (0–2.6) → basıştan sonra geri çekilip gökyüzünü gösterir (2.6–4.5)
      // → lambaya doğru yavaş yaklaşma (4.5–12) → sonda hafif geri çekilme (12–15).
      const io = U.ease.inOut, k1 = io(clamp((lt - 2.6) / 1.9)), k2 = io(clamp((lt - 4.5) / 7.5)), k3 = io(clamp((lt - 12) / 2.5));
      let z = lerp(lerp(1.75, 1.85, clamp(lt / 2.6)), 1, k1); z = z + 0.12 * k2 * (1 - k3);
      let fx = lerp(540, 540, k1) + 120 * k2 * (1 - k3), fy = lerp(1470, 960, k1) - 60 * k2 * (1 - k3);
      const hw = 540 / z, hh = 960 / z; fx = clamp(fx, hw, 1080 - hw); fy = clamp(fy, hh, 1920 - hh);
      c.save(); c.translate(540, 960); c.scale(z, z); c.translate(-fx, -fy);
      const b = P.scratch('qvBase'), bg = b.getContext('2d'); bg.reset(); base(bg, t, calm);
      c.drawImage(b, 0, 0);
      // Üç geçiş fırça: gök (uzun, girdaplı, 8fps kaynar), kasaba, masa
      P.strokes(c, b, { cell: 14, len: 46, width: 9, angle, seed: 11, t, boil: 8, outline: 0.8, outlineMix: 0.4, palette, outlineCol: [12, 26, 54], mask: (x, y) => y < 1120 });
      P.strokes(c, b, { cell: 11, len: 24, width: 7, angle, seed: 21, t, boil: 0, outline: 0.85, outlineMix: 0.45, palette, outlineCol: [12, 26, 54], mask: (x, y) => y >= 1120 && y < 1330 });
      P.strokes(c, b, { cell: 13, len: 52, width: 9, angle, seed: 31, t, boil: 0, outline: 0.8, outlineMix: 0.4, palette, outlineCol: [60, 30, 10], mask: (x, y) => y >= 1330 });
      lines(c, t);
      // Lamba başı
      c.fillStyle = '#1b2333'; c.beginPath(); c.moveTo(LAMP[0] - 34, LAMP[1] - 10); c.lineTo(LAMP[0] + 34, LAMP[1] - 10); c.lineTo(LAMP[0] + 22, LAMP[1] + 28); c.lineTo(LAMP[0] - 22, LAMP[1] + 28); c.fill();
      c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(LAMP[0], LAMP[1] + 8, 16, 0, TAU); c.fill();
      // Motif 2: lamba halesi halka halka dışa yayılır (krize basınca güçlenir = şahitlere haber gider)
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      const boost = 1 + calm * 1.2;
      for (let k = 0; k < 4; k++) { const ph = (t * 0.7 + k / 4) % 1, r = 50 + ph * 260; c.strokeStyle = `rgba(255,232,140,${Math.min(0.6, 0.26 * boost * (1 - ph))})`; c.lineWidth = 16; c.setLineDash([26, 16]); c.lineDashOffset = -t * 50 * (k % 2 ? 1 : -1); c.beginPath(); c.arc(LAMP[0], LAMP[1], r, 0, TAU); c.stroke(); }
      c.setLineDash([]); c.restore();
      // Yıldızlar
      STARS.forEach(([x, y, r], k) => { const tw = 0.75 + 0.3 * Math.sin(t * 4 + k * 1.7); c.fillStyle = 'rgba(251,238,160,.5)'; c.beginPath(); c.arc(x, y, r * 2 * tw, 0, TAU); c.fill(); c.fillStyle = C.lamp; c.beginPath(); c.arc(x, y, r * 0.8 * tw, 0, TAU); c.fill(); });
      // Pencere ışıkları
      [[60, 1240], [110, 1272], [230, 1232], [290, 1278], [410, 1250], [600, 1245], [660, 1275], [800, 1236], [850, 1280], [980, 1250]].forEach(([x, y], k) => { const on = (Math.floor(t * 1.2) + k * 3) % 9 !== 0; c.fillStyle = on ? C.win : '#2a3550'; c.fillRect(x, y, 22, 28); c.strokeStyle = C.line; c.lineWidth = 3; c.strokeRect(x, y, 22, 28); });
      handsAndPhone(c, t, press);
      // Ekran ışığı (sıcak değil, soğuk) masaya vurur
      c.save(); c.globalCompositeOperation = 'lighter'; const sg = c.createRadialGradient(PH.x, PH.y, 60, PH.x, PH.y, 420); sg.addColorStop(0, `rgba(238,50,22,${0.08 + press * 0.12})`); sg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sg; c.fillRect(0, 1180, 1080, 740); c.restore();
      c.restore();
      // Kapanış: gökyüzüne boyanmış marka yazısı (12.75'te vuruşla gelir)
      const e = clamp((lt - 12.75) / 0.6);
      if (e > 0) { c.save(); c.globalAlpha = e; c.textAlign = 'center'; c.lineJoin = 'round';
        const y0 = 300 - (1 - io(e)) * 30;
        c.font = '128px "Poppins-800"'; c.lineWidth = 16; c.strokeStyle = '#0f1f3a'; c.strokeText('QuitVow', 540, y0); c.fillStyle = '#f6eccd'; c.fillText('QuitVow', 540, y0);
        c.font = '54px "Poppins-700"'; c.lineWidth = 10; c.strokeText('İrade değil, sistem.', 540, y0 + 86); c.fillStyle = C.lamp; c.fillText('İrade değil, sistem.', 540, y0 + 86);
        c.restore(); }
    },
  };
})();
