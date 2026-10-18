// Landing page derleyicisi: src/template.html + src/i18n/<dil>.mjs → dist/ (statik, her dil kendi adresinde).
// Kullanım:  node build.mjs            (SITE_URL=https://alanadi.com node build.mjs → hreflang/canonical etiketleri de üretilir)
// Yeni dil: src/i18n/<kod>.mjs ekle (tr.mjs ile aynı şekil), src/img/<kod>/ altına ekran görüntülerini koy, LANGS listesine yaz.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src'), OUT = path.join(HERE, 'dist');
const LANGS = ['tr', 'en'];
const DEFAULT = 'tr'; // kökte yayınlanan dil
const SITE_URL = (process.env.SITE_URL ?? '').replace(/\/$/, '');

const dicts = Object.fromEntries(await Promise.all(LANGS.map(async l => [l, (await import(pathToFileURL(path.join(SRC, 'i18n', `${l}.mjs`)).href)).default])));
const dirOf = l => (l === DEFAULT ? '' : `${l}/`);

// Her sözlük varsayılan dille aynı şekilde olmalı: eksik/fazla anahtar derlemeyi durdurur.
// Liste uzunlukları serbest (örn. yardım hattı sayısı ülkeye göre değişir), ama her öğe aynı alanlara sahip olmalı.
function shape(v, p = '') {
  if (Array.isArray(v)) return [...new Set([`${p}[]`, ...v.flatMap(x => shape(x, `${p}[]`))])];
  if (v && typeof v === 'object') return Object.keys(v).sort().flatMap(k => shape(v[k], p ? `${p}.${k}` : k));
  return [p];
}
const base = shape(dicts[DEFAULT]);
for (const l of LANGS) {
  const s = shape(dicts[l]);
  const missing = base.filter(k => !s.includes(k)), extra = s.filter(k => !base.includes(k));
  if (missing.length || extra.length) throw new Error(`${l}.mjs şekli ${DEFAULT}.mjs ile aynı değil:\n  eksik: ${missing.join(', ') || '-'}\n  fazla: ${extra.join(', ') || '-'}`);
  for (const f of ['home', 'crisis', 'guardians', 'sudoku']) if (!fs.existsSync(path.join(SRC, 'img', l, `${f}.webp`))) throw new Error(`Eksik görsel: src/img/${l}/${f}.webp`);
}

const template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
fs.rmSync(OUT, { recursive: true, force: true });

for (const l of LANGS) {
  const d = dicts[l];
  const root = l === DEFAULT ? '' : '../';
  const get = key => {
    const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
    if (v === undefined || typeof v === 'object') throw new Error(`${l}: "${key}" bulunamadı`);
    return String(v);
  };
  const alternates = SITE_URL
    ? [...LANGS.map(x => `<link rel="alternate" hreflang="${x}" href="${SITE_URL}/${dirOf(x)}">`),
       `<link rel="alternate" hreflang="x-default" href="${SITE_URL}/">`, `<link rel="canonical" href="${SITE_URL}/${dirOf(l)}">`].join('\n')
    : '<!-- SITE_URL verilmedi: hreflang/canonical etiketleri yok -->';
  const langSwitch = LANGS.map(x => (x === l ? `<span>${x}</span>` : `<a href="${root}${dirOf(x)}" hreflang="${x}" lang="${x}">${x}</a>`)).join('');
  const hints = JSON.stringify(Object.fromEntries(LANGS.filter(x => x !== l).map(x => [x, { href: `${root}${dirOf(x)}` || './', text: dicts[x].hint }])));

  let html = template.replace(/\{\{#each ([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, inner) => {
    const arr = key.split('.').reduce((o, k) => o?.[k], d);
    if (!Array.isArray(arr)) throw new Error(`${l}: "${key}" liste değil`);
    return arr.map(it => inner.replace(/\{\{it(?:\.(\w+))?\}\}/g, (_m, k) => {
      const v = k ? it[k] : it;
      if (v === undefined) throw new Error(`${l}: ${key} içinde "${k}" yok`);
      return String(v);
    })).join('');
  });
  html = html
    .replaceAll('{{lang}}', l).replaceAll('{{root}}', root)
    .replace('{{alternates}}', alternates).replace('{{langSwitch}}', langSwitch).replace('{{hints}}', hints)
    .replace(/\{\{([\w.]+)\}\}/g, (_, key) => get(key));
  if (/\{\{|\}\}/.test(html.replace(/<script>[\s\S]*?<\/script>/, ''))) throw new Error(`${l}: doldurulmamış yer tutucu kaldı`);

  const dir = path.join(OUT, dirOf(l));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log('✓', path.relative(HERE, path.join(dir, 'index.html')));
}
// Yasal sayfalar: src/legal/<dil>.mjs → dist/<dil-dizini>/<yol>/index.html (gizlilik, koşullar)
const company = (await import(pathToFileURL(path.join(SRC, 'legal', 'company.mjs')).href)).default;
const todo = Object.entries(company).filter(([, v]) => typeof v === 'string' && /\[.+\]/.test(v)).map(([k]) => k);
if (todo.length) console.warn(`⚠ src/legal/company.mjs içinde doldurulmamış alanlar: ${todo.join(', ')} (yayından önce doldur)`);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
for (const l of LANGS) {
  const legal = (await import(pathToFileURL(path.join(SRC, 'legal', `${l}.mjs`)).href)).default(company);
  for (const kind of ['privacy', 'terms']) {
    const pg = legal[kind];
    const root = l === DEFAULT ? '../' : '../../';
    const canon = SITE_URL ? `<link rel="canonical" href="${SITE_URL}/${dirOf(l)}${pg.path}/">` : '';
    const html = `<!doctype html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pg.title)} · QuitVow</title>
<meta name="theme-color" content="#0A0A0C">
${canon}
<link rel="icon" href="${root}img/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${root}style.css">
</head>
<body>
<div class="wrap legal">
  <nav><a class="brand" href="${root}${dirOf(l)}">QuitVow</a><a href="${root}${dirOf(l)}">${legal.back}</a></nav>
  <article>
    <div class="kicker">${legal.updatedLabel}: ${company.updated[l]}</div>
    <h1>${esc(pg.title)}</h1>
    ${pg.body}
  </article>
</div>
</body>
</html>
`;
    const dir = path.join(OUT, dirOf(l), pg.path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    console.log('✓', path.relative(HERE, path.join(dir, 'index.html')));
  }
}
// Blog: src/blog/*.mjs → dist/<path>/index.html (Article + FAQPage JSON-LD, canonical, OG), ardından sitemap.xml ve robots.txt
const POSTS = ['kumari-birakmak'];
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const jsonLd = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\u003c')}</script>`;
const sitemapUrls = [`${SITE_URL}/`, `${SITE_URL}/en/`];
for (const slug of POSTS) {
  const post = (await import(pathToFileURL(path.join(SRC, 'blog', `${slug}.mjs`)).href)).default;
  const url = `${SITE_URL}/${post.path}/`;
  const faqHtml = post.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');
  const body = post.body.replace('{{faq}}', faqHtml);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.description, inLanguage: 'tr',
      datePublished: post.published, dateModified: post.updated,
      author: { '@type': 'Organization', name: 'QuitVow' }, publisher: { '@type': 'Organization', name: 'QuitVow' },
      ...(SITE_URL ? { mainEntityOfPage: url } : {}) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: post.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ].map(jsonLd).join('\n');
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(post.metaTitle)}</title>
<meta name="description" content="${attr(post.description)}">
<meta name="theme-color" content="#0A0A0C">
<meta property="og:type" content="article">
<meta property="og:title" content="${attr(post.metaTitle)}">
<meta property="og:description" content="${attr(post.description)}">
<meta property="og:locale" content="tr_TR">
${SITE_URL ? `<link rel="canonical" href="${url}">\n<meta property="og:url" content="${url}">` : ''}
<link rel="icon" href="../img/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
${ld}
</head>
<body>
<div class="wrap legal blog">
  <nav><a class="brand" href="../">QuitVow</a><a href="../">Ana sayfa</a></nav>
  <article>
    <div class="kicker">Rehber · ${post.readMinutes} dk okuma · Güncelleme: ${post.updated.split('-').reverse().join('.')}</div>
    <h1>${esc(post.title)}</h1>
    <p class="lead">${esc(post.intro)}</p>
    ${body}
  </article>
  <p class="footlinks"><a href="../gizlilik/">Gizlilik ve KVKK</a><a href="../kosullar/">Kullanım koşulları</a><a href="mailto:${company.email}">${company.email}</a></p>
</div>
</body>
</html>
`;
  fs.mkdirSync(path.join(OUT, post.path), { recursive: true });
  fs.writeFileSync(path.join(OUT, post.path, 'index.html'), html);
  sitemapUrls.push(url);
  console.log('✓', `dist/${post.path}/index.html`);
}
if (SITE_URL) {
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  console.log('✓ dist/sitemap.xml, dist/robots.txt');
}
fs.copyFileSync(path.join(SRC, 'style.css'), path.join(OUT, 'style.css'));
fs.cpSync(path.join(SRC, 'img'), path.join(OUT, 'img'), { recursive: true });
console.log('✓ dist/style.css, dist/img/');
