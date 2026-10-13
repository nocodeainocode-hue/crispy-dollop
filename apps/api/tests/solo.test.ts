import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createApp } from '../src/app.js';
import { all } from '../src/db.js';

let clock = 1_700_000_000_000;
const DAY = 24 * 3600_000;
let app: Awaited<ReturnType<typeof createApp>>['app'];
let ctx: Awaited<ReturnType<typeof createApp>>['ctx'];

beforeEach(async () => {
  clock = 1_700_000_000_000;
  const r = await createApp({
    memory: true, now: () => clock,
    cfg: { prod: false, jwtSecret: 'test-secret', adminEmail: 'admin@test.io', adminPassword: 'pw-admin-123', webUrl: 'http://web.test', databaseUrl: undefined },
  });
  app = r.app; ctx = r.ctx;
});

const outbox = async (kind?: string) => (await all(ctx.db, 'SELECT * FROM outbox ORDER BY created_at, id')).filter((m: any) => !kind || m.kind === kind);
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
async function login(email = 'deniz@test.io') {
  await request(app).post('/auth/request-code').send({ email, name: 'Deniz' }).expect(200);
  const code = /(\d{6})/.exec((await outbox('login_code')).at(-1).body)![1];
  return (await request(app).post('/auth/verify').send({ email, code }).expect(200)).body.token as string;
}

describe('şahitsiz başlangıç', () => {
  it('şahit olmadan pakt kurulur; kimseye e-posta gitmez; çıkış 7 gün zaman kilidiyle açılır', async () => {
    const t = await login();
    const p = await request(app).post('/pacts').set(auth(t)).send({ habitLabel: 'Spor bahisi', goalDays: 30, guardians: [] }).expect(201);
    expect(p.body.guardians).toEqual([]);
    expect(await outbox('invite')).toHaveLength(0);

    await request(app).post('/pacts/current/crisis').set(auth(t)).send({}).expect(200).then(r => expect(r.body.notified).toBe(0));
    await request(app).post('/pacts/current/relapse').set(auth(t)).send({ self: true }).expect(200);
    expect(await outbox('crisis')).toHaveLength(0);
    expect(await outbox('relapse')).toHaveLength(0);

    const u = (await request(app).post('/pacts/current/unlock').set(auth(t)).expect(201)).body.unlock;
    expect(u).toMatchObject({ need: 0, solo: true, readyAt: clock + 7 * DAY });
    expect(await outbox('unlock_requested')).toHaveLength(0);
    clock += 7 * DAY - 1;
    await request(app).post('/pacts/current/unlock/complete').set(auth(t)).expect(403);
    clock += 2;
    expect((await request(app).post('/pacts/current/unlock/complete').set(auth(t)).expect(200)).body.status).toBe('closed');
  });

  it('şahit sonradan eklenip kabul edince zaman kilidi yerine anahtar ve 72 saat geçerli olur', async () => {
    const t = await login();
    await request(app).post('/pacts').set(auth(t)).send({ habitLabel: 'Slot', goalDays: 7 }).expect(201); // guardians alanı hiç yok
    await request(app).post('/pacts/current/guardians').set(auth(t)).send({ name: 'Ece', email: 'ece@test.io' }).expect(201);
    const code = /([0-9A-Z]{5}-[0-9A-Z]{5})/.exec((await outbox('invite')).at(-1).body)![1];
    await request(app).post(`/public/invites/${code}/accept`).expect(200);
    const u = (await request(app).post('/pacts/current/unlock').set(auth(t)).expect(201)).body.unlock;
    expect(u).toMatchObject({ need: 1, solo: false, readyAt: clock + 3 * DAY });
  });
});

describe('alışkanlığı şahitlerden gizleme', () => {
  it('gizliyse davet, şahit ekranları ve bildirimlerde alışkanlık geçmez; sonradan gösterilebilir', async () => {
    const t = await login();
    await request(app).post('/pacts').set(auth(t)).send({ habitLabel: 'Canlı bahis', goalDays: 7, hideHabit: true, guardians: [{ name: 'Ece', email: 'ece@test.io' }] }).expect(201);
    const inv = (await outbox('invite')).at(-1);
    expect(inv.body).not.toMatch(/bahis|kumar|oynar/i);
    expect(inv.body).toContain('kişisel bir hedef');

    const code = /([0-9A-Z]{5}-[0-9A-Z]{5})/.exec(inv.body)![1];
    const info = (await request(app).get(`/public/invites/${code}`).expect(200)).body;
    expect(info).toMatchObject({ habitLabel: null, hideHabit: true });
    const g = (await request(app).post(`/public/invites/${code}/accept`).expect(200)).body.token;
    const me = (await request(app).get('/guardian/me').set(auth(g)).expect(200)).body;
    expect(me.pact).toMatchObject({ habitLabel: null, hideHabit: true });

    await request(app).post('/pacts/current/relapse').set(auth(t)).send({ self: true }).expect(200);
    const rel = (await outbox('relapse')).at(-1);
    expect(rel.body).not.toMatch(/kumar|bahis/i);

    // Kullanıcı açılmaya karar verirse
    const p = await request(app).patch('/pacts/current').set(auth(t)).send({ hideHabit: false }).expect(200);
    expect(p.body.hideHabit).toBe(false);
    expect((await request(app).get('/guardian/me').set(auth(g)).expect(200)).body.pact.habitLabel).toBe('Canlı bahis');
  });
});
