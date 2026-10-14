import { describe, it, expect } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createApp } from '../src/app.js';

const base = { prod: false, jwtSecret: 'test-secret', adminEmail: 'admin@test.io', adminPassword: 'pw-admin-123', webUrl: 'http://web.test', databaseUrl: undefined };
const RULES = path.join(__dirname, '..', 'shield', 'rules.json');
const MOBILE_COPY = path.join(__dirname, '..', '..', 'mobile', 'modules', 'shield', 'android', 'src', 'main', 'assets', 'shield-rules.json');

describe('engel kuralları ve listesi', () => {
  it('kurallar giriş gerektirmeden sunulur; liste sürümü ve ETag ile önbellek çalışır', async () => {
    const { app } = await createApp({ memory: true, cfg: base });
    const r = await request(app).get('/shield/rules').expect(200);
    expect(r.body.roots).toContain('jojobet');
    expect(r.body.doh).toContain('dns.google');
    expect(r.body.about).toBeUndefined();
    expect(r.body.listVersion).toMatch(/^[0-9a-f]{16}$/);

    const l = await request(app).get('/shield/list').buffer(true).parse((res, cb) => { const b: Buffer[] = []; res.on('data', c => b.push(c)); res.on('end', () => cb(null, Buffer.concat(b))); }).expect(200);
    expect(l.headers['content-encoding']).toBe('gzip');
    expect(l.headers.etag).toBe(`"${r.body.listVersion}"`);
    const text = l.body.toString('utf8');
    const domains = text.trim().split('\n');
    expect(domains.length).toBeGreaterThan(100_000);
    expect(domains).toContain('bet365.com');
    expect(domains).toContain('bets10.com'); // Türkiye eki
    expect(domains).not.toContain('google.com');

    await request(app).get('/shield/list').set('If-None-Match', l.headers.etag).expect(304);
  });

  it('uygulamaya gömülü kural kopyası sunucudakiyle aynı', () => {
    expect(JSON.parse(fs.readFileSync(MOBILE_COPY, 'utf8'))).toEqual(JSON.parse(fs.readFileSync(RULES, 'utf8')));
  });

  it('liste dosyası geçerli: tekrarsız, sıralı, yalnızca alan adı', () => {
    const lines = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '..', 'shield', 'gambling.txt.gz'))).toString('utf8').trim().split('\n');
    expect(new Set(lines).size).toBe(lines.length);
    expect([...lines].sort()).toEqual(lines);
    expect(lines.every(d => /^[a-z0-9.-]+\.[a-z0-9-]+$/.test(d))).toBe(true);
  });
});
