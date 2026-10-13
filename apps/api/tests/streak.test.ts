import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createApp } from '../src/app.js';
import { all } from '../src/db.js';
import { sendWeeklyDigests } from '../src/service.js';

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
async function pactWithWitness(t: string, goalDays = 30) {
  await request(app).post('/pacts').set(auth(t)).send({ habitLabel: 'Spor bahisi', goalDays, guardians: [{ name: 'Ece', email: 'ece@test.io' }] }).expect(201);
  const code = /([0-9A-Z]{5}-[0-9A-Z]{5})/.exec((await outbox('invite')).at(-1).body)![1];
  await request(app).post(`/public/invites/${code}/accept`).expect(200);
}

describe('paket süresi sabit, temiz seri ayrı', () => {
  it('20. günde tekrar oynayınca paket bitiş tarihi değişmez; kalan gün korunur', async () => {
    const t = await login();
    await pactWithWitness(t, 30);
    const start = clock;
    clock += 19 * DAY; // 20. gün
    const r = (await request(app).post('/pacts/current/relapse').set(auth(t)).send({ self: true }).expect(200)).body;
    expect(r).toMatchObject({ day: 20, startedAt: start, streakStartedAt: clock, goalDays: 30 });
    clock += 9 * DAY;
    expect((await request(app).get('/pacts/current').set(auth(t))).body.status).toBe('active'); // 29. gün: hâlâ sürüyor
    clock += 2 * DAY + 1; // toplam 30 gün
    expect((await request(app).get('/pacts/current').set(auth(t))).body.status).toBe('completed'); // 30 gün dolunca biter (90+ değil)
  });

  it('tamamlama e-postaları dürüst: hiç bozmadıysa "hiç bozmadan", bozduysa son temiz gün sayısı', async () => {
    const t = await login();
    await pactWithWitness(t, 30);
    clock += 30 * DAY + 1;
    await request(app).get('/pacts/current').set(auth(t)).expect(200);
    expect((await outbox('completed')).at(-1).body).toContain('hiç bozmadan');

    const t2 = await login('mert@test.io');
    await request(app).post('/pacts').set(auth(t2)).send({ habitLabel: 'Slot', goalDays: 30, guardians: [{ name: 'Can', email: 'can@test.io' }] }).expect(201);
    const code = /([0-9A-Z]{5}-[0-9A-Z]{5})/.exec((await outbox('invite')).at(-1).body)![1];
    await request(app).post(`/public/invites/${code}/accept`).expect(200);
    clock += 10 * DAY;
    await request(app).post('/pacts/current/relapse').set(auth(t2)).send({ self: true }).expect(200);
    clock += 20 * DAY + 1;
    await request(app).get('/pacts/current').set(auth(t2)).expect(200);
    const mail = (await outbox('completed')).at(-1);
    expect(mail.to_addr).toBe('can@test.io');
    expect(mail.body).toContain('son 20 günü temiz');
    expect(mail.body).not.toContain('hiç bozmadan');
  });

  it('paketi bitirene (arada bozmuş olsa da) tebrik e-postası ve sonraki pakette indirim hakkı; deneme hak vermez', async () => {
    const t = await login();
    await pactWithWitness(t, 30);
    expect((await request(app).get('/me').set(auth(t))).body.nextPackDiscount).toBe(0);
    clock += 5 * DAY;
    await request(app).post('/pacts/current/relapse').set(auth(t)).send({ self: false }).expect(200);
    clock += 25 * DAY + 1;
    await request(app).get('/pacts/current').set(auth(t)).expect(200);
    const own = (await outbox('pack_completed')).at(-1);
    expect(own.to_addr).toBe('deniz@test.io');
    expect(own.body).toContain('%40 indirim');
    expect((await request(app).get('/me').set(auth(t))).body.nextPackDiscount).toBe(40);

    const t2 = await login('deneme@test.io');
    await request(app).post('/pacts').set(auth(t2)).send({ habitLabel: 'Slot', goalDays: 7 }).expect(201);
    clock += 7 * DAY + 1;
    await request(app).get('/pacts/current').set(auth(t2)).expect(200);
    expect((await request(app).get('/me').set(auth(t2))).body.nextPackDiscount).toBe(0);
  });
});

describe('haftalık iyi haber', () => {
  it('kapalıyken gitmez; açılınca haftada bir, kontrol sayısıyla gider; tekrar oynanan haftada gitmez', async () => {
    const t = await login();
    await pactWithWitness(t, 30);
    const checkin = async (i: number) => request(app).post('/pacts/current/checkin').set(auth(t)).send({ urge: 3, day: `2023-11-${String(15 + i).padStart(2, '0')}` }).expect(200);
    clock += 3600_000; // pencere sınırına denk gelmesin
    for (let i = 0; i < 5; i++) { await checkin(i); clock += DAY; }
    clock += 2 * DAY - 3600_000; // pakt başlangıcından tam 7 gün sonra
    expect(await sendWeeklyDigests(ctx)).toBe(0); // kapalı

    expect((await request(app).patch('/pacts/current').set(auth(t)).send({ weeklyDigest: true }).expect(200)).body.weeklyDigest).toBe(true);
    expect(await sendWeeklyDigests(ctx)).toBe(1);
    const w = (await outbox('weekly')).at(-1);
    expect(w.to_addr).toBe('ece@test.io');
    expect(w.body).toContain("7 günün 5'inde");
    expect(await sendWeeklyDigests(ctx)).toBe(0); // aynı hafta ikinci kez gitmez

    clock += 3 * DAY;
    await request(app).post('/pacts/current/relapse').set(auth(t)).send({ self: true }).expect(200);
    clock += 4 * DAY + 1;
    expect(await sendWeeklyDigests(ctx)).toBe(0); // tekrar oynanan haftada "iyi haber" yok
  });
});
