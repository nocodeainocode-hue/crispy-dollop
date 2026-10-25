// Engel listesini yeniler: açık kaynak kumar listesi (Block List Project, kamu malı) + shield/extra-tr.txt
// → shield/gambling.txt.gz (bir satıra bir alan adı, küçük harf, tekrarsız, sıralı).
// Kullanım: node scripts/shield-list.mjs   (sonra commit'le; sunucu yeni listeyi bir sonraki açılışta sunar)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', 'shield');
const SOURCE = 'https://raw.githubusercontent.com/blocklistproject/Lists/master/alt-version/gambling-nl.txt';
const DOMAIN = /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/;

const clean = (text) => text.split(/\r?\n/).map(l => l.replace(/#.*/, '').trim().toLowerCase().replace(/^\*\./, '').replace(/\.$/, '')).filter(l => DOMAIN.test(l));

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Liste indirilemedi: ${res.status}`);
const upstream = clean(await res.text());
if (upstream.length < 50_000) throw new Error(`Liste beklenenden kısa (${upstream.length}); kaynak değişmiş olabilir, yazılmadı`);
const extra = clean(fs.readFileSync(path.join(DIR, 'extra-tr.txt'), 'utf8'));
const all = [...new Set([...upstream, ...extra])].sort();
fs.writeFileSync(path.join(DIR, 'gambling.txt.gz'), zlib.gzipSync(all.join('\n') + '\n', { level: 9 }));
console.log(`✓ shield/gambling.txt.gz: ${all.length} alan adı (kaynak ${upstream.length}, Türkiye eki ${extra.length})`);
