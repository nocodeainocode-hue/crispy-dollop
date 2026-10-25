import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { rateLimit } from './security.js';

/** Telefondaki engel (VPN/DNS filtresi) için kurallar ve alan adı listesi. Giriş gerektirmez: içerik herkese açık bir kumar listesidir. */
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'shield');

export function shieldRouter() {
  const rules = JSON.parse(fs.readFileSync(path.join(DIR, 'rules.json'), 'utf8'));
  const list = fs.readFileSync(path.join(DIR, 'gambling.txt.gz'));
  const listVersion = crypto.createHash('sha256').update(list).digest('hex').slice(0, 16);
  const etag = `"${listVersion}"`;
  const { about: _about, ...publicRules } = rules;

  const r = Router();
  r.get('/shield/rules', rateLimit(60, 60_000), (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ ...publicRules, listVersion });
  });
  // Liste sıkıştırılmış hâliyle (gzip) gönderilir; telefon değişmediyse ETag ile 304 alır ve yeniden indirmez
  r.get('/shield/list', rateLimit(20, 60_000), (req, res) => {
    res.set({ ETag: etag, 'Cache-Control': 'public, max-age=86400' });
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Content-Encoding': 'gzip', 'X-List-Version': listVersion });
    res.send(list);
  });
  return r;
}
