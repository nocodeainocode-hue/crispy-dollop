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
// Blog: src/blog/*.mjs → dist/<path>/index.html (Article + FAQPage JSON-LD, canonical, OG, otomatik içindekiler, ilgili yazılar), /blog/ dizini, sitemap.xml, robots.txt
// Yazı eklemek: src/blog/<ad>.mjs yaz (kumari-birakmak-istiyorum.mjs şekli: lang, path, title, metaTitle, description, intro, faq, body), POSTS listesine adını ekle.
// Menü ve alt bilgi ana sayfayla aynı parçalardan üretilir (navHtml / footerHtml): iki yerde ayrı ayrı bakım gerekmez.
const POSTS = ['kumari-birakmak-istiyorum', 'bahis-oynama-istegi-nasil-gecer', 'kumar-borcu-nasil-kapanir', 'esim-kumar-oynuyor-ne-yapmaliyim', 'kumar-bagimliligi-belirtileri-test', 'how-to-stop-sports-betting'];
const PLAY = 'https://play.google.com/store/apps/details?id=com.quitvow.app';
const LOGO = template.match(/<svg viewBox="0 0 512 512"[\s\S]*?<\/svg>/)[0];
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const jsonLd = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const UI = {
  tr: { post: 'Yazı', read: 'dk okuma', upd: 'Güncelleme', toc: 'Bu yazıda', related: 'İlgili yazılar', all: 'Tüm yazılar', faq: 'Sık sorulan sorular', og: 'tr_TR', homeDir: '' },
  en: { post: 'Article', read: 'min read', upd: 'Updated', toc: 'In this article', related: 'Related articles', all: 'All articles', faq: 'Frequently asked questions', og: 'en_US', homeDir: 'en/' },
};
const BOX = {
  tr: `<div class="qv-box"><b>QuitVow ile bırakmayı bir sisteme bağla</b>
<p>QuitVow, kumarı ve bahsi bırakmak isteyenler için bir taahhüt uygulamasıdır: sözünü güvendiğin şahitlere, önceden yazılmış kurallara ve her gün dolan bir takvime bağlar. Dürtü geldiğinde tek dokunuşla <b>Krizdeyim</b> modunu açarsın; "neden" notun ve gelecekteki sana mektubun karşına çıkar, şahitlerine haber gider, sakinleşme oyunları ve yardım hatları (ALO 182, Yeşilay 115) bir dokunuş uzaktadır. İlk 7 gün ücretsiz; kriz modu ve şahit bildirimleri her zaman ücretsiz.</p>
<p><a class="btn" href="${PLAY}" rel="noopener">Google Play'den indir</a></p>
<p class="fine">QuitVow bir tedavi değildir ve başarı garantisi vermez; bahis engelleyici de değildir. Profesyonel desteğin yanında bir araç olarak kullanılır.</p></div>`,
  en: `<div class="qv-box"><b>Turn quitting into a system with QuitVow</b>
<p>QuitVow is a commitment app for people who want to stop gambling and betting. It ties your promise to witnesses you trust, to rules written in advance, and to a calendar that fills up every day. When an urge hits, one tap opens <b>crisis mode</b>: your own "why" note and a letter to your future self appear, your witnesses are notified, and calming games and helplines are one tap away. The first 7 days are free; crisis mode and witness alerts are always free.</p>
<p><a class="btn" href="${PLAY}" rel="noopener">Get it on Google Play</a></p>
<p class="fine">QuitVow is not a treatment, does not guarantee results, and is not a betting blocker. It works best alongside professional support. Android only for now; the app is currently in Turkish and English.</p></div>`,
};
const posts = await Promise.all(POSTS.map(async slug => (await import(pathToFileURL(path.join(SRC, 'blog', `${slug}.mjs`)).href)).default));
const sitemapUrls = [`${SITE_URL}/`, `${SITE_URL}/en/`, `${SITE_URL}/blog/`];

// Ana sayfadaki menünün aynısı: logo · Blog · Android çipi · dil seçici
const navHtml = (root, l) => {
  const d = dicts[l], home = `${root}${UI[l].homeDir}`;
  const langs = LANGS.map(x => (x === l ? `<span>${x}</span>` : `<a href="${root}${dirOf(x)}" hreflang="${x}" lang="${x}">${x}</a>`)).join('');
  return `<nav>
    <a class="brand" href="${home}">${LOGO}QuitVow</a>
    <div class="navright">
      <a class="navlink" href="${root}${d.footer.blogHref}" aria-current="page">${d.footer.blog}</a>
      <span class="chip">${d.nav.chip}</span>
      <div class="langs" aria-label="${d.nav.language}">${langs}</div>
    </div>
  </nav>`;
};
// Ana sayfadaki alt bilginin aynısı: yardım hatları, uyarı, bağlantılar
const footerHtml = (root, l) => {
  const f = dicts[l].footer;
  return `<footer>
  <div class="wrap">
    <div class="kicker">${f.kicker}</div>
    <div class="help">
      ${f.lines.map(x => `<a href="tel:${x.tel}" class="${x.cls}"><b>${x.name}</b>${x.sub}</a>`).join('\n      ')}
    </div>
    <p>${f.disclaimer}</p>
    <p class="footlinks"><a href="${root}${f.privacyHref}">${f.privacy}</a><a href="${root}${f.termsHref}">${f.terms}</a><a href="${root}${f.blogHref}">${f.blog}</a><a href="mailto:${company.email}">${company.email}</a></p>
    <p style="margin-top:18px;color:var(--mute)">© 2026 QuitVow</p>
  </div>
</footer>`;
};
const pageHead = (root, l, title, desc, canon, extra = '') => `<!doctype html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc)}">
<meta name="theme-color" content="#0A0A0C">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:image" content="${SITE_URL}/img/ikon-180.png">
<meta property="og:locale" content="${UI[l].og}">
${SITE_URL ? `<link rel="canonical" href="${canon}">\n<meta property="og:url" content="${canon}">` : ''}
<link rel="icon" href="${root}img/favicon-32.png">
<link rel="apple-touch-icon" href="${root}img/ikon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${root}style.css">
${extra}
</head>
`;
for (const post of posts) {
  const l = post.lang, u = UI[l], root = '../'.repeat(post.path.split('/').length), url = `${SITE_URL}/${post.path}/`;
  const faqHtml = post.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');
  let n = 0;
  const body = post.body.replace('{{faq}}', `<h2 id="faq">${u.faq}</h2>\n${faqHtml}`).replace('{{quitvow}}', BOX[l])
    .replace(/<h2>/g, () => `<h2 id="b${++n}">`);
  if (/\{\{/.test(body)) throw new Error(`${post.path}: doldurulmamış yer tutucu`);
  const heads = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  const toc = `<details class="toc" open><summary class="kicker">${u.toc}</summary><ol>${heads.map(h => `<li><a href="#${h[1]}">${h[2].replace(/^\d+\.\s*/, '')}</a></li>`).join('')}</ol></details>`;
  const related = posts.filter(x => x !== post && x.lang === l);
  const relHtml = related.length ? `<h2 id="related">${u.related}</h2>\n<ul class="related">${related.map(x => `<li><a href="${root}${x.path}/">${esc(x.title)}</a></li>`).join('')}</ul>` : '';
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.description, inLanguage: l,
      datePublished: post.published, dateModified: post.updated,
      author: { '@type': 'Organization', name: 'QuitVow' }, publisher: { '@type': 'Organization', name: 'QuitVow' },
      ...(SITE_URL ? { mainEntityOfPage: url } : {}) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: post.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ].map(jsonLd).join('\n');
  const html = pageHead(root, l, post.metaTitle, post.description, url, `<meta property="og:type" content="article">\n${ld}`) + `<body>
<div class="wrap">
  ${navHtml(root, l)}
  <header class="bloghead">
    <div class="kicker">${u.post}</div>
    <h1>${esc(post.title)}</h1>
    <p class="lead">${esc(post.intro)}</p>
    <div class="postmeta"><span>${post.readMinutes} ${u.read}</span><span>${u.upd}: ${post.updated.split('-').reverse().join('.')}</span></div>
  </header>
  <div class="postwrap">
    ${toc}
    <article class="prose">
${body}
${relHtml}
<p class="back"><a href="${root}blog/">← ${u.all}</a></p>
    </article>
  </div>
</div>
${footerHtml(root, l)}
<script>if (matchMedia('(max-width: 860px)').matches) document.querySelector('.toc').open = false;</script>
</body>
</html>
`;
  fs.mkdirSync(path.join(OUT, post.path), { recursive: true });
  fs.writeFileSync(path.join(OUT, post.path, 'index.html'), html);
  sitemapUrls.push(url);
  console.log('✓', `dist/${post.path}/index.html`);
}
{ // /blog/ dizini: ana sayfadaki numaralı satır düzeniyle tüm yazılar
  const l = 'tr', root = '../';
  const items = posts.map((p, i) => `<a class="postrow" href="${root}${p.path}/">
      <span class="no">${String(i + 1).padStart(2, '0')}</span>
      <div><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p><span class="tags"><span>${p.readMinutes} ${UI[p.lang].read}</span><span>${p.lang === 'en' ? 'English' : 'Türkçe'}</span></span></div>
      <span class="arrow" aria-hidden="true">→</span>
    </a>`).join('\n    ');
  const html = pageHead(root, l, 'QuitVow Blog · Kumar ve bahis bırakma yazıları', 'Kumar ve bahis isteğini yenme, borçtan çıkış, bir yakının kumarıyla başa çıkma ve bırakma sürecine dair yazılar.', `${SITE_URL}/blog/`) + `<body>
<div class="wrap">
  ${navHtml(root, l)}
  <header class="bloghead">
    <div class="kicker">Blog</div>
    <h1>Bırakmaya dair<br>somut yazılar.</h1>
    <p class="lead">Dürtüyü yenmek, borçtan çıkmak, bir yakınına yaklaşmak ve nüksü aşmak. Genel bilgi içerir; tedavi ya da kişisel tavsiye yerine geçmez.</p>
  </header>
  <div class="postlist">
    ${items}
  </div>
</div>
${footerHtml(root, l)}
</body>
</html>
`;
  fs.mkdirSync(path.join(OUT, 'blog'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'blog', 'index.html'), html);
  console.log('✓ dist/blog/index.html');
}
if (SITE_URL) {
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  console.log('✓ dist/sitemap.xml, dist/robots.txt');
}
fs.copyFileSync(path.join(SRC, 'style.css'), path.join(OUT, 'style.css'));
fs.cpSync(path.join(SRC, 'img'), path.join(OUT, 'img'), { recursive: true });
console.log('✓ dist/style.css, dist/img/');
