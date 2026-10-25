// Mağaza karelerinin kabul ölçütleri (docs/TASARIM-BAHCE-PLANI.md F9-1): boyut, alfa, boyut sınırı, başlık kuralları, yasaklı sözcükler.
// Çıktıda herhangi bir satır "HATA" ise çıkış kodu 1. Kullanım: node check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../../store/play/telefon');
const cap = JSON.parse(fs.readFileSync(path.join(here, 'captions.json'), 'utf8')).tr;

// Kumar çağrışımı kuralları: "kazan" fiili, LockIn, hücre, konfeti/parıltı/madalya, sayı + puan; "ödül" yalnız olumsuzlamada ("ödül yok")
const FORBIDDEN = [/kazan/i, /lock\s?in/i, /hücre/i, /konfeti/i, /parıltı/i, /madalya/i, /\d+\s*puan/i, /puan\s*\d+/i, /ceza/i];
const words = s => s.trim().split(/\s+/).filter(Boolean).length;
let bad = 0;
const fail = m => { bad++; console.log('HATA  ' + m); };

let darkCount = 0;
for (const c of cap) {
  const f = path.join(dir, `${c.file}.png`);
  if (!fs.existsSync(f)) { fail(`${c.file}: dosya yok`); continue; }
  const meta = await sharp(f).metadata();
  const size = fs.statSync(f).size;
  if (meta.width !== 1080 || meta.height !== 1920) fail(`${c.file}: boyut ${meta.width}x${meta.height} (1080x1920 olmalı)`);
  if (meta.hasAlpha) fail(`${c.file}: alfa kanalı var`);
  if (size > 8 * 1024 * 1024) fail(`${c.file}: ${(size / 1048576).toFixed(1)} MB (8 MB sınırı)`);
  const text = [c.title, c.sub, c.badge].filter(Boolean).join(' ');
  if (words(text) > 15) fail(`${c.file}: ${words(text)} kelime (en çok 15)`);
  for (const re of FORBIDDEN) if (re.test(text)) fail(`${c.file}: başlıkta yasaklı dizge ${re}`);
  // Uygulamadan çekilen görünür metin
  const txt = path.join(here, 'raw', c.raw.replace(/\.png$/, '.txt'));
  if (fs.existsSync(txt)) {
    const t = fs.readFileSync(txt, 'utf8');
    for (const re of FORBIDDEN) if (re.test(t)) fail(`${c.file}: uygulama metninde yasaklı dizge ${re}`);
  } else console.log(`UYARI ${c.file}: görünür metin dosyası yok (${path.basename(txt)}), uygulama metni taranamadı`);
  if (c.dark) darkCount++;
  console.log(`tamam ${c.file}  ${meta.width}x${meta.height}  ${(size / 1024).toFixed(0)} KB  ${words(text)} kelime`);
}
const first = cap[0];
if (!/bahs|bahis/i.test(first.title)) fail('01: başlıkta "bahis" yok');
if (!/Rastgele ödül yok\./.test(first.badge)) fail('01: "Rastgele ödül yok." rozeti yok');
if (darkCount !== 1) fail(`koyu kare sayısı ${darkCount} (tam 1 olmalı)`);
console.log(bad ? `\n${bad} hata` : '\nTüm ölçütler geçti');
process.exit(bad ? 1 : 0);
