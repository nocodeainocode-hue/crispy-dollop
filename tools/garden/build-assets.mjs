// QuitVow marka varlıkları: "kemer pencere içinde filiz" işaretinden tüm PNG'leri üretir.
// Kullanım:  cd tools/garden && npm install && npm run build
// Yalnız `sharp` kullanır. Çıktılar (aynı dosya adları, app.json bunlara bakar):
//   apps/mobile/assets/icon.png                      1024 opak (RGB)
//   apps/mobile/assets/android-icon-foreground.png   1024 şeffaf, önemli şekiller merkez güvenli dairede
//   apps/mobile/assets/android-icon-monochrome.png   1024 şeffaf tek renk siluet (Android 13 temalı ikon)
//   apps/mobile/assets/splash-icon.png               1024 şeffaf, gündüz renkleri
//   apps/mobile/assets/splash-icon-dark.png          1024 şeffaf, gece renkleri
//   apps/mobile/assets/favicon.png                   48 opak
//   store/play/ikon-512.png                          512
//   store/play/one-cikan-gorsel-1024x500.png         1024x500 (alfa yok)
// Renkler apps/mobile/src/palette.ts içindeki DAY/NIGHT değerleriyle aynıdır (sabit kopya: o dosya TS ve RN'e bağlı).
// Kilit çağrışımı YOK, kırmızı YOK; kil (#A24622) yalnız toprak vurgusu.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const ASSETS = path.join(ROOT, 'apps', 'mobile', 'assets');
const PLAY = path.join(ROOT, 'store', 'play');

// ---------------------------------------------------------------- renkler
const DAY = {
  paper: '#F4ECDB', surf: '#FBF6EA', frame: '#3B6748', leaf: '#8FAA87', leafLine: '#3B6748',
  stem: '#3B6748', clay: '#A24622', shadow: 'rgba(36,53,42,0.2)', ink: '#24352A', dim: '#4B5B4B',
  hill: '#D5E0BF', hill2: '#B8CBA6',
};
const NIGHT = {
  paper: '#1B2820', surf: '#243329', frame: '#A9CBA0', leaf: '#7FA27A', leafLine: '#A9CBA0',
  stem: '#A9CBA0', clay: '#F0A584', shadow: 'rgba(10,16,12,0.5)', ink: '#F2E9D4', dim: '#C3CDB8',
  hill: '#2B4034', hill2: '#35503F',
};

// ---------------------------------------------------------------- işaret (tasarım uzayı: merkez 0,0)
// Kemer: orta çizgi yarıçapı 220, yarım daire merkezi y=-90, taban y=300. Toprak çizgisi tabanda.
// Filiz: gövde + iki yaprak (biri biraz küçük ve alçak: el yapımı his) + küçük toprak tümseği.
const ARCH_R = 220, ARCH_CY = -90, BASE_Y = 300, SOIL_HALF = 275, SOIL_W = 40;
const CONTENT_SHIFT_Y = 11; // içerik kutusu (y: -342..+320) merkeze oturur

function leafPath(L, W) {
  const f = n => Math.round(n * 10) / 10;
  return `M0 0 C${f(0.22 * L)} ${f(-0.66 * W)} ${f(0.68 * L)} ${f(-0.6 * W)} ${L} 0 `
       + `C${f(0.74 * L)} ${f(0.44 * W)} ${f(0.3 * L)} ${f(0.52 * W)} 0 0Z`;
}

/**
 * İşareti `<g>` olarak döndürür.
 * @param {object} col   renk seti (DAY | NIGHT)
 * @param {object} o     { cx, cy, s: ölçek, sw: kemer çizgi kalınlığı, lw: yaprak çizgisi, shadow, detail, mono }
 */
function mark(col, o = {}) {
  const { cx = 512, cy = 512, s = 1, sw = 64, lw = 22, stemW = 30, shadow = true, detail = true, mono = false } = o;
  const k = mono ? '#000' : null;
  const L = 215, W = 124;
  const leaf = leafPath(L, W);
  const archOuter = ARCH_R + sw / 2;
  const frame = `M${-ARCH_R} ${BASE_Y} V${ARCH_CY} A${ARCH_R} ${ARCH_R} 0 0 1 ${ARCH_R} ${ARCH_CY} V${BASE_Y}`;
  const inner = `M${-ARCH_R} ${BASE_Y} V${ARCH_CY} A${ARCH_R} ${ARCH_R} 0 0 1 ${ARCH_R} ${ARCH_CY} V${BASE_Y}Z`;
  const outer = `M${-archOuter} ${BASE_Y} V${ARCH_CY} A${archOuter} ${archOuter} 0 0 1 ${archOuter} ${ARCH_CY} V${BASE_Y}Z`;
  const leafFill = k || col.leaf;
  const leafStroke = mono ? 'none' : col.leafLine;
  const rib = detail && !mono
    ? `<path d="M${0.1 * L} 0 L${0.74 * L} 0" stroke="${col.leafLine}" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.85"/>`
    : '';
  const leafEl = (tf) =>
    `<g transform="${tf}"><path d="${leaf}" fill="${leafFill}" stroke="${leafStroke}" stroke-width="${mono ? 0 : lw}" stroke-linejoin="round"/>${rib}</g>`;
  const parts = [];
  if (shadow && !mono) parts.push(`<path d="${outer}" fill="${col.shadow}" transform="translate(18 18)"/>`);
  if (!mono) parts.push(`<path d="${inner}" fill="${col.surf}"/>`);
  parts.push(`<path d="M-72 ${BASE_Y} C-46 ${BASE_Y - 42} 46 ${BASE_Y - 42} 72 ${BASE_Y}Z" fill="${k || col.clay}"/>`);
  parts.push(`<path d="M0 ${BASE_Y} C-8 236 8 160 0 76" fill="none" stroke="${k || col.stem}" stroke-width="${stemW}" stroke-linecap="round"/>`);
  parts.push(leafEl('translate(0 84) rotate(-42)'));
  parts.push(leafEl('translate(0 116) scale(-0.86 0.86) rotate(-48)'));
  parts.push(`<path d="${frame}" fill="none" stroke="${k || col.frame}" stroke-width="${sw}" stroke-linejoin="round"/>`);
  parts.push(`<path d="M${-SOIL_HALF} ${BASE_Y} H${SOIL_HALF}" stroke="${k || col.clay}" stroke-width="${SOIL_W}" stroke-linecap="round"/>`);
  return `<g transform="translate(${cx} ${cy}) scale(${s}) translate(0 ${CONTENT_SHIFT_Y})">${parts.join('')}</g>`;
}

const svgDoc = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const render = (svg, w, h) => sharp(Buffer.from(svg), { density: 72 }).resize(w, h).png();

// ---------------------------------------------------------------- yazı (QuitVow başlığı + slogan)
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const firstExisting = list => list.find(p => p && fs.existsSync(p));
const FONTS = {
  // Marka yazı tipi Fraunces (uygulamadaki ile aynı); yoksa sistem Georgia; o da yoksa SVG yedeği.
  serif: firstExisting([
    process.env.QUITVOW_SERIF,
    path.join(ROOT, 'apps/mobile/node_modules/@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf'),
    'C:/Windows/Fonts/georgiab.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
  ]),
  serifFamily: 'Fraunces SemiBold',
  sans: firstExisting([
    process.env.QUITVOW_SANS,
    path.join(ROOT, 'apps/mobile/node_modules/@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
    'C:/Windows/Fonts/segoeuib.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  ]),
  sansFamily: 'Nunito Bold',
};
if (FONTS.serif && /georgia|dejavu/i.test(FONTS.serif)) FONTS.serifFamily = /georgia/i.test(FONTS.serif) ? 'Georgia Bold' : 'DejaVu Serif Bold';
if (FONTS.sans && /segoe|dejavu/i.test(FONTS.sans)) FONTS.sansFamily = /segoe/i.test(FONTS.sans) ? 'Segoe UI Bold' : 'DejaVu Sans Bold';

/** Şeffaf zeminde, mürekkep sınırına kırpılmış yazı PNG'si: { buf, w, h } */
async function textPng({ text, kind, size, color, letterSpacing = 0 }) {
  const file = kind === 'serif' ? FONTS.serif : FONTS.sans;
  const family = kind === 'serif' ? FONTS.serifFamily : FONTS.sansFamily;
  let raw;
  if (file) {
    const ls = letterSpacing ? ` letter_spacing="${Math.round(letterSpacing * 1024)}"` : '';
    raw = await sharp({
      text: { text: `<span foreground="${color}"${ls}>${esc(text)}</span>`, font: `${family} ${size}`, fontfile: file, rgba: true, dpi: 72 },
    }).png().toBuffer();
  } else {
    const fam = kind === 'serif' ? "Georgia, 'Times New Roman', serif" : "'Segoe UI', Arial, sans-serif";
    const w = Math.ceil(text.length * size * 0.75) + 40;
    const h = Math.ceil(size * 1.6);
    raw = await sharp(Buffer.from(svgDoc(w, h,
      `<text x="20" y="${Math.round(size * 1.15)}" font-family="${fam}" font-weight="700" font-size="${size}" fill="${color}" letter-spacing="${letterSpacing}">${esc(text)}</text>`)))
      .png().toBuffer();
  }
  const trimmed = await sharp(raw).trim({ threshold: 2 }).png().toBuffer({ resolveWithObject: true });
  return { buf: trimmed.data, w: trimmed.info.width, h: trimmed.info.height };
}

/** Yazıyı en çok `maxW` genişliğe sığacak en büyük boyutta (<= size) üretir. */
async function fitText(opts, maxW) {
  let size = opts.size;
  let t = await textPng({ ...opts, size });
  while (t.w > maxW && size > 8) { size -= 2; t = await textPng({ ...opts, size }); }
  return { ...t, size };
}

// ---------------------------------------------------------------- yazma yardımcıları
const report = [];
async function save(file, pipeline, { rgb = false, alpha = false } = {}) {
  let p = pipeline;
  if (rgb) p = p.flatten({ background: DAY.paper }).removeAlpha();
  if (alpha) p = p.ensureAlpha();
  await p.png({ compressionLevel: 9 }).toFile(file);
  const m = await sharp(file).metadata();
  report.push(`${path.relative(ROOT, file).replace(/\\/g, '/')}  ${m.width}x${m.height}  kanal=${m.channels}  alfa=${m.hasAlpha}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}

/** Şeffaf PNG'de alfa > eşik olan en uzak pikselin merkeze uzaklığı (güvenli daire denetimi). */
async function maxRadius(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r2 = 0;
  const cx = (info.width - 1) / 2, cy = (info.height - 1) / 2;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 16) {
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d > r2) r2 = d;
      }
    }
  }
  return Math.sqrt(r2);
}

// ---------------------------------------------------------------- üretim
async function main() {
  fs.mkdirSync(ASSETS, { recursive: true });
  fs.mkdirSync(PLAY, { recursive: true });

  // Adaptif ikon güvenli alanı: Android merkez %66 (676 px daire). Biz 640 px daireyi hedefleriz.
  const SAFE_S = 0.72;

  // (a) icon.png: kâğıt zemin, opak, köşeler düz
  const iconSvg = svgDoc(1024, 1024, `<rect width="1024" height="1024" fill="${DAY.paper}"/>${mark(DAY, { s: 0.96 })}`);
  await save(path.join(ASSETS, 'icon.png'), render(iconSvg, 1024, 1024), { rgb: true });

  // (b) adaptif ön plan (şeffaf) ve monokrom siluet
  const fgSvg = svgDoc(1024, 1024, mark(DAY, { s: SAFE_S }));
  await save(path.join(ASSETS, 'android-icon-foreground.png'), render(fgSvg, 1024, 1024), { alpha: true });
  const monoSvg = svgDoc(1024, 1024, mark(DAY, { s: SAFE_S, mono: true, shadow: false, detail: false }));
  await save(path.join(ASSETS, 'android-icon-monochrome.png'), render(monoSvg, 1024, 1024), { alpha: true });

  // (c) açılış ekranı: şeffaf, gündüz ve gece renkleri
  await save(path.join(ASSETS, 'splash-icon.png'), render(svgDoc(1024, 1024, mark(DAY, { s: SAFE_S })), 1024, 1024), { alpha: true });
  await save(path.join(ASSETS, 'splash-icon-dark.png'), render(svgDoc(1024, 1024, mark(NIGHT, { s: SAFE_S })), 1024, 1024), { alpha: true });

  // (d) favicon 48: kalın çizgi, gölge ve yaprak damarı yok
  const favSvg = svgDoc(1024, 1024,
    `<rect width="1024" height="1024" fill="${DAY.paper}"/>${mark(DAY, { s: 1.14, sw: 84, lw: 34, stemW: 44, shadow: false, detail: false })}`);
  const fav = await render(favSvg, 192, 192).toBuffer();
  await save(path.join(ASSETS, 'favicon.png'), sharp(fav).resize(48, 48, { kernel: 'lanczos3' }), { rgb: true });

  // (e) Play 512 ikon (icon.png ile aynı tasarım, köşe yuvarlatma Play'e bırakılır)
  await save(path.join(PLAY, 'ikon-512.png'), render(iconSvg, 512, 512), { alpha: true });

  // (f) öne çıkan görsel 1024x500
  const W = 1024, H = 500;
  const textX = 452, maxTextW = W - textX - 56;
  const title = await fitText({ text: 'QuitVow', kind: 'serif', size: 132, color: DAY.ink, letterSpacing: -1.5 }, maxTextW);
  const slogan = await fitText({ text: 'Bahsi bırak. Her gün bir yaprak.', kind: 'sans', size: 31, color: DAY.dim }, maxTextW);
  const gap = 26;
  const blockH = title.h + gap + slogan.h;
  const top = Math.round((H - blockH) / 2) - 6;
  const hills =
    `<path d="M0 436 C160 410 330 452 520 428 C700 405 860 446 1024 420 V500 H0Z" fill="${DAY.hill}"/>` +
    `<path d="M0 468 C210 448 390 478 580 462 C770 446 900 476 1024 456 V500 H0Z" fill="${DAY.hill2}"/>`;
  const bg = svgDoc(W, H, `<rect width="${W}" height="${H}" fill="${DAY.paper}"/>${hills}${mark(DAY, { cx: 226, cy: 232, s: 0.56 })}`);
  const base = await render(bg, W, H).toBuffer();
  const composed = sharp(base).composite([
    { input: title.buf, left: textX, top },
    { input: slogan.buf, left: textX + 4, top: top + title.h + gap },
  ]);
  await save(path.join(PLAY, 'one-cikan-gorsel-1024x500.png'), composed, { rgb: true });

  // ------------------------------------------------------------ rapor
  console.log(report.join('\n'));
  console.log(`yazı tipleri: serif=${FONTS.serif ?? 'SVG yedeği'}  sans=${FONTS.sans ?? 'SVG yedeği'}`);
  const rFg = await maxRadius(path.join(ASSETS, 'android-icon-foreground.png'));
  const rMono = await maxRadius(path.join(ASSETS, 'android-icon-monochrome.png'));
  const rSplash = await maxRadius(path.join(ASSETS, 'splash-icon.png'));
  console.log(`güvenli daire (yarıçap, sınır 338): ön plan=${rFg.toFixed(0)} monokrom=${rMono.toFixed(0)} splash=${rSplash.toFixed(0)}`);
  if (Math.max(rFg, rMono) > 338) { console.error('HATA: adaptif ikon güvenli alanın dışına taşıyor'); process.exitCode = 1; }
}

main().catch(e => { console.error(e); process.exit(1); });
