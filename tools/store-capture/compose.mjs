// Ham ekran görüntülerinden 1080x1920 mağaza karelerini basar (Bahçe teması: krem zemin, başlık Fraunces, alt şeritte n. yaprak hardal).
// Çıktı: store/play/telefon/NN-ad.png (alfasız PNG). Kullanım: node compose.mjs [kare numaraları]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const fonts = path.join(root, 'apps/mobile/node_modules/@expo-google-fonts');
const out = path.join(root, 'store/play/telefon');
const cap = JSON.parse(fs.readFileSync(path.join(here, 'captions.json'), 'utf8')).tr;
const only = process.argv.slice(2).map(Number);

const LIGHT = { bg: '#F4ECDB', fg: '#24352A', dim: '#4D5E50', clay: '#A24622', surf: '#FBF6EA', leaf: '#8FAA87', leafLine: '#24352A', mustard: '#DCA83F', shadow: 'rgba(36,53,42,.16)' };
const NIGHT = { bg: '#1B2820', fg: '#F2E9D4', dim: '#B9C4B2', clay: '#F0A584', surf: '#24352A', leaf: '#8FAA87', leafLine: '#F2E9D4', mustard: '#DCA83F', shadow: 'rgba(0,0,0,.35)' };

const ff = (family, file, weight) => `@font-face{font-family:'${family}';font-weight:${weight};src:url('${pathToFileURL(path.join(fonts, file)).href}') format('truetype');}`;

// Hafif eğik, el çizimi görünümlü yaprak (uygulamadaki yaprak dilinden): gövde + orta damar
const leaf = (fill, line, tilt) => `<svg viewBox="0 0 64 64" width="68" height="68" style="transform:rotate(${tilt}deg)"><path d="M32 59 C 10 49, 8 24, 32 5 C 56 24, 54 49, 32 59 Z" fill="${fill}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/><path d="M32 57 L32 14" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round" opacity=".65"/></svg>`;

function html(c, rawFile, t) {
  const strip = Array.from({ length: 8 }, (_, i) => leaf(i + 1 === c.n ? t.mustard : t.leaf, t.leafLine, [-8, 6, -4, 9, -7, 5, -9, 4][i])).join('');
  const badge = c.badge ? `<div class="badge">${c.badge}</div>` : '';
  const sub = c.sub ? `<div class="sub">${c.sub}</div>` : '';
  return `<!doctype html><meta charset="utf-8"><style>
${ff('Fraunces', 'fraunces/600SemiBold/Fraunces_600SemiBold.ttf', 600)}
${ff('Nunito', 'nunito/700Bold/Nunito_700Bold.ttf', 700)}
${ff('Nunito', 'nunito/800ExtraBold/Nunito_800ExtraBold.ttf', 800)}
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;background:${t.bg};overflow:hidden}
.head{position:absolute;left:84px;right:84px;top:92px}
.title{font:600 88px/1.04 'Fraunces',serif;color:${t.fg};letter-spacing:-1.5px}
.sub{margin-top:22px;font:700 40px/1.25 'Nunito',sans-serif;color:${t.dim}}
.badge{display:inline-block;margin-top:26px;padding:12px 30px 14px;border:4px dashed ${t.clay};border-radius:44px 40px 46px 38px;background:${t.surf};color:${t.clay};font:800 38px/1.1 'Nunito',sans-serif;transform:rotate(-1.4deg)}
.shot{position:absolute;left:190px;top:424px;width:700px;height:1244px;border-radius:52px;border:4px solid ${t.fg};overflow:hidden;box-shadow:0 22px 0 ${t.shadow};background:${t.bg}}
.shot img{display:block;width:100%;height:100%;object-fit:cover}
.strip{position:absolute;left:0;right:0;bottom:64px;display:flex;justify-content:center;gap:20px}
</style>
<div class="head"><div class="title">${c.title}</div>${sub}${badge}</div>
<div class="shot"><img src="${pathToFileURL(path.join(here, 'raw', rawFile)).href}"></div>
<div class="strip">${strip}</div>`;
}

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
for (const c of cap) {
  if (only.length && !only.includes(c.n)) continue;
  const tmp = path.join(here, 'raw', `_poster-${c.n}.html`);
  fs.writeFileSync(tmp, html(c, c.raw, c.dark ? NIGHT : LIGHT));
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const png = await page.screenshot({ type: 'png' });
  const dest = path.join(out, `${c.file}.png`);
  await sharp(png).flatten({ background: c.dark ? NIGHT.bg : LIGHT.bg }).removeAlpha().png({ compressionLevel: 9 }).toFile(dest);
  console.log('yazıldı', path.relative(root, dest));
}
await browser.close();
