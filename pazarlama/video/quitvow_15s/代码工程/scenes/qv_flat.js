// QuitVow · Çağdaş düz illüstrasyon (grenli, konturrsuz): "Dalga sörfü" (dikey 1080×1920)
// Kompozisyon: sıcak gökyüzü ve büyük güneş; sağdan yükselip sola kıvrılan dev dürtü dalgası; yüzünde kırmızı sörf tahtasıyla
// arkadan görünen bir kişi dengede duruyor. Ana hareket: kişi dalgayı aşar, dalga düzleşip sakin bir çizgiye döner.
// Motifler: gren dokusu nefes alır (yoğunluk yavaş dalgalanır); bulut ve kuşlar sönümlü ikincil hareketle salınır.
SCENES['qv_flat'] = (() => {
  const TAU = Math.PI * 2, { clamp, lerp } = U, P = PAINT;
  const C = { sky: '#f3e3cc', sky2: '#f6d2b0', sun: '#f2a93b', sunD: '#e0862a', cloud: '#fbf4ea', teal: '#2f5d62', teal2: '#3f7a78', foamT: '#5fb3a1',
    foam: '#f7f1e6', ink: '#1b1a17', skin: '#d99a72', skinD: '#b97a55', hair: '#2b2622', red: '#ee3216', redD: '#b8240f', sand: '#e9c99a' };

  // Gren: şekil içine yoğunluğu konuma bağlı 2px kare noktalar (önbellekli tam kare doku, source-atop ile basılır)
  const grain = (key, col, dens) => P.cached('qvf_gr_' + key, STAGE.W, STAGE.H, (g) => {
    const r = U.rng(key.length * 97 + 13); g.fillStyle = col;
    for (let i = 0; i < 160000; i++) { const x = r() * 1080, y = r() * 1920; if (r() < dens(x, y)) g.fillRect(x | 0, y | 0, 2, 2); }
  });
  const withGrain = (c, layer, key, col, dens, alpha = 1) => {
    const lg = layer.getContext('2d'); lg.save(); lg.globalCompositeOperation = 'source-atop'; lg.globalAlpha = alpha; lg.drawImage(grain(key, col, dens), 0, 0); lg.restore();
    c.drawImage(layer, 0, 0);
  };

  function sky(c, t) {
    const S = P.scratch('qvfSky'), g = S.getContext('2d'); g.reset();
    g.fillStyle = C.sky; g.fillRect(0, 0, 1080, 1920);
    g.fillStyle = C.sky2; g.fillRect(0, 620, 1080, 600);
    g.fillStyle = C.sun; g.beginPath(); g.arc(740, 560, 230, 0, TAU); g.fill();
    withGrain(c, S, 'sky', 'rgba(150,70,30,.55)', (x, y) => 0.05 + 0.35 * clamp((y - 330) / 900) + 0.25 * clamp(((x - 740) + (y - 560)) / 400) * (Math.hypot(x - 740, y - 560) < 232 ? 1 : 0));
    // bulutlar: hap biçimli, yavaşça sola kayar
    [[200, 300, 260, 0.9], [880, 250, 200, 1.3], [520, 820, 300, 0.7]].forEach(([x, y, w, sp], k) => {
      const dx = ((x - t * 14 * sp) % 1300 + 1300) % 1300 - 110;
      c.fillStyle = C.cloud; c.beginPath(); c.roundRect(dx - w / 2, y, w, 54, 27); c.fill(); c.beginPath(); c.roundRect(dx - w / 2 + w * 0.2, y - 34, w * 0.5, 54, 27); c.fill();
    });
    // kuşlar: iki çizgi, kanat çırpar
    [[300, 520], [360, 480], [410, 545]].forEach(([x, y], k) => { const f = Math.sin(t * 7 + k * 1.3) * 10; c.strokeStyle = C.ink; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 22, y - f); c.quadraticCurveTo(x - 8, y - 6, x, y); c.quadraticCurveTo(x + 8, y - 6, x + 22, y - f); c.stroke(); });
  }

  // Dalga: sağdan yükselip sola doğru kıvrılan tüp. calm 0→1 ile tepe alçalır.
  function wave(c, t, calm) {
    const A = lerp(1, 0.18, calm), F = 1560, Y = y => lerp(F, y, A), sw = Math.sin(t * 1.1) * 18 * A;
    const L = P.scratch('qvfWave'), g = L.getContext('2d'); g.reset();
    const B = (p0, p1, p2, p3) => P.bez(p0, p1, p2, p3, 22);
    const back = [[1120, 1960], [1120, Y(980)], ...B([1120, Y(980)], [900, Y(860)], [520, Y(820)], [300 + sw, Y(900)]),
      ...B([300 + sw, Y(900)], [140 + sw, Y(960)], [120 + sw, Y(1120)], [250 + sw, Y(1180)]),
      ...B([250 + sw, Y(1180)], [330 + sw, Y(1210)], [380 + sw, Y(1140)], [330 + sw, Y(1080)]), [200 + sw, Y(1180)], [-40, Y(1240)], [-40, 1960]];
    const poly = pts => { g.beginPath(); g.moveTo(...pts[0]); pts.slice(1).forEach(p => g.lineTo(...p)); g.closePath(); };
    g.fillStyle = C.teal; poly(back); g.fill();
    // iç yüz (tüpün içi, açık ton)
    g.fillStyle = C.teal2; poly([[330 + sw, Y(1080)], ...B([330 + sw, Y(1080)], [420, Y(1000)], [700, Y(980)], [1120, Y(1040)]), [1120, 1960], [0, 1960], [0, Y(1260)]]); g.fill();
    // dudak köpüğü
    g.fillStyle = C.foam; poly([...B([1120, Y(975)], [900, Y(852)], [520, Y(812)], [300 + sw, Y(892)]), ...B([300 + sw, Y(892)], [150 + sw, Y(950)], [126 + sw, Y(1100)], [240 + sw, Y(1176)]),
      ...B([240 + sw, Y(1176)], [190 + sw, Y(1080)], [260 + sw, Y(960)], [420, Y(930)]), ...B([420, Y(930)], [640, Y(890)], [900, Y(920)], [1120, Y(1010)])]); g.fill();
    // akış çizgileri (açık turkuaz bantlar)
    g.strokeStyle = C.foamT; g.lineCap = 'round';
    for (let k = 0; k < 5; k++) { const y0 = Y(1140 + k * 110), ph = t * 1.4 + k; g.lineWidth = 14 - k * 2; g.beginPath();
      for (let x = 420 + k * 40; x <= 1100; x += 20) { const y = y0 + Math.sin(x * 0.01 + ph) * 14 - (1100 - x) * 0.12; x === 420 + k * 40 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    // ön plan: köpük şeritleri
    g.fillStyle = C.foam; [1720, 1810].forEach((y, k) => { g.beginPath(); g.moveTo(-20, y); for (let x = -20; x <= 1100; x += 30) g.lineTo(x, y + 12 * Math.sin(x * 0.015 + t * (1.2 + k * 0.5))); g.lineTo(1100, y + 26); for (let x = 1100; x >= -20; x -= 30) g.lineTo(x, y + 26 + 12 * Math.sin(x * 0.015 + t * (1.2 + k * 0.5))); g.fill(); });
    // gren nefes alır: yoğunluk iki doku arasında yavaşça karışır
    const br = 0.5 + 0.5 * Math.sin(t * 1.6);
    withGrain(c, L, 'wave', 'rgba(10,30,32,.6)', (x, y) => 0.06 + 0.4 * clamp((y - 900) / 1000) * clamp((x + 100) / 1200), 0.65 + 0.35 * br);
  }

  // Sörfçü: arkadan görünüş, kollar açık; tahta kırmızı. Yüz yok.
  function surfer(c, t, ride) {
    const x = lerp(700, 560, ride) + Math.sin(t * 2.2) * 10, y = lerp(1190, 1300, ride) + Math.sin(t * 3) * 6, lean = -0.18 + Math.sin(t * 2.2) * 0.06;
    c.save(); c.translate(x, y); c.rotate(lean);
    // tahta
    c.fillStyle = C.redD; c.beginPath(); c.ellipse(4, 112, 170, 28, -0.12, 0, TAU); c.fill();
    c.fillStyle = C.red; c.beginPath(); c.ellipse(0, 104, 170, 26, -0.12, 0, TAU); c.fill();
    c.fillStyle = C.foam; c.fillRect(-150, 98, 300, 5);
    // bacaklar (dizler bükük)
    c.strokeStyle = C.ink; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 34;
    c.beginPath(); c.moveTo(-26, -10); c.lineTo(-62, 40); c.lineTo(-50, 96); c.stroke();
    c.beginPath(); c.moveTo(26, -10); c.lineTo(66, 44); c.lineTo(58, 96); c.stroke();
    // gövde (sırt) + omuz
    c.fillStyle = C.ink; c.beginPath(); c.moveTo(-46, -150); c.quadraticCurveTo(0, -170, 46, -150); c.lineTo(38, -4); c.quadraticCurveTo(0, 10, -38, -4); c.closePath(); c.fill();
    // kollar: açık, dengede
    const wv = Math.sin(t * 2.6) * 0.12;
    c.strokeStyle = C.skin; c.lineWidth = 22;
    c.beginPath(); c.moveTo(-40, -138); c.lineTo(-120, -104 + wv * 80); c.lineTo(-196, -128 + wv * 120); c.stroke();
    c.beginPath(); c.moveTo(40, -138); c.lineTo(122, -112 - wv * 80); c.lineTo(198, -84 - wv * 120); c.stroke();
    c.strokeStyle = C.ink; c.lineWidth = 30; c.beginPath(); c.moveTo(-40, -140); c.lineTo(-78, -122 + wv * 40); c.stroke(); c.beginPath(); c.moveTo(40, -140); c.lineTo(80, -126 - wv * 40); c.stroke();
    // boyun + baş (arkadan: saç)
    c.fillStyle = C.skinD; c.fillRect(-12, -178, 24, 26);
    c.fillStyle = C.hair; c.beginPath(); c.ellipse(0, -212, 38, 44, 0, 0, TAU); c.fill();
    c.fillStyle = C.skin; c.beginPath(); c.ellipse(-37, -206, 7, 12, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(37, -206, 7, 12, 0, 0, TAU); c.fill();
    c.restore();
    // tahtanın arkasında su izi
    c.save(); c.strokeStyle = 'rgba(247,241,230,.85)'; c.lineWidth = 10; c.lineCap = 'round';
    for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + 150, y + 100 + k * 14); c.quadraticCurveTo(x + 260, y + 60 + k * 18, x + 380 + k * 40, y + 30 + k * 26); c.stroke(); }
    c.restore();
  }

  return {
    draw(c, lt, t) {
      const ride = U.ease.inOut(clamp((lt - 0.5) / 3.2)), calm = clamp((lt - 2.6) / 2);
      sky(c, t);
      wave(c, t, calm);
      surfer(c, t, ride);
    },
  };
})();
