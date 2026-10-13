import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createApp } from '../src/app.js';
import { all, one } from '../src/db.js';
import { EN_ERRORS, translateError } from '../src/i18n.js';

let app: Awaited<ReturnType<typeof createApp>>['app'];
let ctx: Awaited<ReturnType<typeof createApp>>['ctx'];

beforeEach(async () => {
  const r = await createApp({
    memory: true,
    cfg: { prod: false, jwtSecret: 'test-secret', adminEmail: 'admin@test.io', adminPassword: 'pw-admin-123', webUrl: 'http://web.test', databaseUrl: undefined },
  });
  app = r.app; ctx = r.ctx;
});

const outbox = async (kind?: string) => (await all(ctx.db, 'SELECT * FROM outbox ORDER BY created_at, id')).filter((m: any) => !kind || m.kind === kind);
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function login(email: string, locale?: 'tr' | 'en') {
  await request(app).post('/auth/request-code').send({ email, name: 'Sam', locale }).expect(200);
  const code = /(\d{6})/.exec((await outbox('login_code')).at(-1).body)![1];
  return (await request(app).post('/auth/verify').send({ email, code, locale }).expect(200)).body.token as string;
}
const pact = (t: string) => request(app).post('/pacts').set(auth(t)).send({
  habitLabel: 'Sports betting', goalDays: 7, guardians: [{ name: 'Ana', email: 'ana@test.io' }, { name: 'Ben', email: 'ben@test.io' }],
});

describe('dil (i18n)', () => {
  it('koddaki her hata mesajının İngilizce karşılığı var', () => {
    const src = path.join(__dirname, '..', 'src');
    const msgs = new Set<string>();
    for (const f of fs.readdirSync(src).filter(f => f.endsWith('.ts'))) {
      const s = fs.readFileSync(path.join(src, f), 'utf8');
      for (const m of s.matchAll(/HttpError\(\d+,\s*'([^']+)'/g)) msgs.add(m[1]);
    }
    expect(msgs.size).toBeGreaterThan(30);
    const missing = [...msgs].filter(m => !EN_ERRORS[m]);
    expect(missing).toEqual([]);
    // değişkenli mesajlar kalıpla çevrilir
    expect(translateError('Yeterli onay yok (1/2)', 'en')).toBe('Not enough approvals (1/2)');
  });

  it('hata mesajı uygulamanın istediği dilde döner; tarayıcı başlıkları Türkçeyi bozmaz', async () => {
    const en = await request(app).get('/pacts/current').set('Accept-Language', 'en').expect(401);
    expect(en.body.error).toBe('Sign-in required');
    const tr = await request(app).get('/pacts/current').expect(401);
    expect(tr.body.error).toBe('Giriş gerekli');
    const browser = await request(app).get('/pacts/current').set('Accept-Language', 'en-US,en;q=0.9').expect(401);
    expect(browser.body.error).toBe('Giriş gerekli');
  });

  it('İngilizce kullanıcı: giriş kodu, davet ve pakt e-postaları İngilizce; dil değişince e-postalar da değişir', async () => {
    const t = await login('sam@test.io', 'en');
    expect((await outbox('login_code')).at(-1).subject).toBe('Your QuitVow sign-in code');
    expect((await one(ctx.db, 'SELECT locale FROM users WHERE email=?', 'sam@test.io'))?.locale).toBe('en');
    expect((await request(app).get('/me').set(auth(t)).expect(200)).body.locale).toBe('en');

    expect((await pact(t)).status).toBe(201);
    const inv = (await outbox('invite')).at(-1);
    expect(inv.subject).toBe('Sam chose you as their witness on QuitVow');
    expect(inv.body).toContain('tap the WITNESS button');
    expect((await outbox('pact_active')).at(-1).subject).toBe('Your pact is active');

    // Şahit kabul eder: sahibine giden bildirim İngilizce
    const code = /([0-9A-Z]{5}-[0-9A-Z]{5})/.exec(inv.body)![1];
    await request(app).post(`/public/invites/${code}/accept`).expect(200);
    expect((await outbox('invite_status')).at(-1).subject).toContain('accepted');

    // Profil'den Türkçeye geçiş: sonraki şahit e-postaları Türkçe
    const p = await request(app).patch('/me').set(auth(t)).send({ locale: 'tr' }).expect(200);
    expect(p.body).toMatchObject({ ok: true, name: 'Sam', locale: 'tr' });
    await request(app).post('/pacts/current/crisis').set(auth(t)).send({}).expect(200);
    expect((await outbox('crisis')).at(-1).subject).toBe('Sam şu an krizde');
  });

  it('dil belirtilmezse Türkçe; PATCH /me boş gövdeyi reddeder', async () => {
    const t = await login('ayse@test.io');
    expect((await outbox('login_code')).at(-1).subject).toBe('QuitVow giriş kodun');
    expect((await one(ctx.db, 'SELECT locale FROM users WHERE email=?', 'ayse@test.io'))?.locale).toBe('tr');
    const r = await request(app).patch('/me').set(auth(t)).set('Accept-Language', 'en').send({}).expect(400);
    expect(r.body.error).toBe('A name or language is required');
    await request(app).patch('/me').set(auth(t)).send({ locale: 'de' }).expect(400); // desteklenmeyen dil
  });
});
