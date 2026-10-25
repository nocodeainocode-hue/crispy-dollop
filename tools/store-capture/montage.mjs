// İnceleme için 8 kareyi tek görselde birleştirir (yalnız önizleme; mağazaya yüklenmez).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const dir = path.resolve('../../store/play/telefon');
const files = fs.readdirSync(dir).filter(f => /^0[1-8]-.*\.png$/.test(f)).sort();
const w = 360, h = 640;
const tiles = await Promise.all(files.map(async (f, i) => ({ input: await sharp(path.join(dir, f)).resize(w, h).png().toBuffer(), left: (i % 4) * (w + 12), top: Math.floor(i / 4) * (h + 12) })));
await sharp({ create: { width: 4 * w + 36, height: 2 * h + 12, channels: 3, background: '#888' } }).composite(tiles).png().toFile('raw/_montage.png');
console.log(files.length, 'kare');
