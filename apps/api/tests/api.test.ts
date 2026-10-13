import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createApp } from '../src/app.js';
import { all, one } from '../src/db.js';
import { checkMissedHeartbeats } from '../src/service.js';

let clock = 1_700_000_000_000;
const HOUR = 3600_000, DAY = 24 * HOUR;
let app: Awaited<ReturnType<typeof createApp>>['app'];
let ctx: Awaited<ReturnType<typeof createApp>>['ctx'];

beforeEach(async () => {
  clock = 1_700_000_000_000;
  const r = await createApp({
    memory: true, now: () => clock, // bellek içi gömülü Postgres (PGlite)
    cfg: { prod: false, jwtSecret: 'test-secret', adminEmail: 'admin@test.io', adminPassword: 'pw-admin-123', webUrl: 'http://web.test', databaseUrl: undefined },
  });
  app = r.app; ctx = r.ctx;
});

const outbox = async (kind?: string) => (await all(ctx.db, 'SELECT * FROM outbox ORDER BY created_at, id')).filter((m: any) => !kind || m.kind === kind);

async function login(email = 'adrian@test.io', name = 'Adrian') {
  await request(app).post('/auth/request-code').send({ email, name }).expect(200);
  const code = /: (\d{6})/.exec((await outbox('login_code')).at(-1).body)![1];
  const r = await request(app).post('/auth/verify').send({ email, code }).expect(200);
  return r.body.token as string;
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const tokenFromInvite = async (i: number) => /([0-9A-Z]{5}-[0-9A-Z]{5})/.exec((await (await outbox('invite')))[i].body)![1];

async function createPact(t: string) {
  return request(app).post('/pacts').set(auth(t)).send({
    habitLabel: 'Spor bahisi', goalDays: 90,
    guardians: [{ name: 'Elif', email: 'elif@test.io' }, { name: 'Murat', email: 'murat@test.io' }, { name: 'Baba', email: 'baba@test.io' }],
  });
}
async function activate(t: string) {
  await createPact(t).then(r => expect(r.status).toBe(201));
  const g: string[] = [];
  for (const i of [0, 1]) {
    const r = await request(app).post(`/public/invites/${(await tokenFromInvite(i))}/accept`).expect(200);
    g.push(r.body.token);
  }
  return g;
}

describe('giriş', () => {
  it('kodla giriş yapar; yanlış kodu reddeder; 5 yanlıştan sonra kilitler', async () => {
    await request(app).post('/auth/request-code').send({ email: 'a@test.io' }).expect(200);
    for (let i = 0; i < 5; i++) await request(app).post('/auth/verify').send({ email: 'a@test.io', code: '000000' }).expect(401);
    const code = /: (\d{6})/.exec((await outbox('login_code'))[0].body)![1];
    await request(app).post('/auth/verify').send({ email: 'a@test.io', code }).expect(401); // kilitli
  });
  it('profil: ad değiştirilir; şahit davetinde yeni ad görünür; geçersiz ad reddedilir', async () => {
    const tk = await login();
    await request(app).patch('/me').set(auth(tk)).send({ name: 'A' }).expect(400);
    await request(app).patch('/me').send({ name: 'Yeni Ad' }).expect(401);
    const r = await request(app).patch('/me').set(auth(tk)).send({ name: '  Yeni Ad  ' }).expect(200);
    expect(r.body.name).toBe('Yeni Ad');
    expect((await request(app).get('/me').set(auth(tk))).body.name).toBe('Yeni Ad');
    await createPact(tk);
    expect((await outbox('invite'))[0].subject).toContain('Yeni Ad');
  });

  it('korumalı uçlar token ister', async () => {
    await request(app).get('/me').expect(401);
    await request(app).get('/admin/stats').expect(401);
    const t = await login();
    await request(app).get('/admin/stats').set(auth(t)).expect(401); // kullanıcı admin değil
  });
});

describe('pakt akışı', () => {
  it('pakt şahit beklemeden hemen başlar; davetler gider; şahitler kabul ettikçe anahtarlar devreye girer', async () => {
    const t = await login();
    const r = await createPact(t);
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('active'); // onay beklenmez
    expect(r.body.day).toBe(1);
    expect(r.body.vow).toBeUndefined(); // imza videosu sunucuda tutulmaz
    expect((await outbox('invite'))).toHaveLength(3);
    expect((await outbox('invite'))[0].body).toContain('QuitVow uygulamasını indir');
    expect((await outbox('pact_active'))).toHaveLength(1);
    expect(r.body.guardians.every((g: any) => g.status === 'invited')).toBe(true);

    await request(app).post(`/public/invites/${(await tokenFromInvite(0))}/accept`).expect(200);
    const cur = (await request(app).get('/pacts/current').set(auth(t))).body;
    expect(cur.status).toBe('active');
    expect(cur.guardians.filter((g: any) => g.status === 'accepted')).toHaveLength(1);
  });

  it('çıkış için gereken onay = min(2, kabul eden şahit): kimse kabul etmediyse onay yerine 7 günlük zaman kilidi', async () => {
    const t = await login();
    await createPact(t);
    // 0 şahit kabul etti: onay gerekmez, ama anahtar yerine daha uzun bekleme
    const u0 = (await request(app).post('/pacts/current/unlock').set(auth(t)).expect(201)).body.unlock;
    expect(u0).toMatchObject({ need: 0, solo: true });
    clock += 72 * HOUR + 1;
    await request(app).post('/pacts/current/unlock/complete').set(auth(t)).expect(403); // 72 saat yetmez
    clock += 4 * DAY;
    const done = await request(app).post('/pacts/current/unlock/complete').set(auth(t)).expect(200);
    expect(done.body.status).toBe('closed');
  });

  it('1 şahit kabul ettiyse 1 onay, 2 kabul ettiyse 2 onay gerekir; talep sırasında kabul eden şahit sayıyı artırır', async () => {
    const t = await login();
    await createPact(t);
    const g1 = (await request(app).post(`/public/invites/${(await tokenFromInvite(0))}/accept`).expect(200)).body.token;
    const u = (await request(app).post('/pacts/current/unlock').set(auth(t)).expect(201)).body.unlock;
    expect(u.need).toBe(1);
    await request(app).post('/guardian/unlock/approve').set(auth(g1)).expect(200);
    // ikinci şahit talep sürerken kabul eder: artık 2 onay gerekir, bir onay yetmez
    await request(app).post(`/public/invites/${(await tokenFromInvite(1))}/accept`).expect(200);
    clock += 72 * HOUR + 1;
    const cur = (await request(app).get('/pacts/current').set(auth(t))).body;
    expect(cur.unlock.need).toBe(2);
    expect(cur.unlock.ready).toBe(false);
    await request(app).post('/pacts/current/unlock/complete').set(auth(t)).expect(403);
  });

  it('aynı kişi iki kez veya kendi kendini şahit eklenemez; en fazla 3 şahit (şahitsiz başlamak serbest: solo.test.ts)', async () => {
    const t = await login();
    const base = { habitLabel: 'Kumar', goalDays: 90 };
    const four = ['a', 'b', 'c', 'd'].map(x => ({ name: x, email: `${x}@x.io` }));
    await request(app).post('/pacts').set(auth(t)).send({ ...base, guardians: four }).expect(400);
    await request(app).post('/pacts').set(auth(t)).send({ ...base, guardians: [{ name: 'A', email: 'a@x.io' }, { name: 'B', email: 'a@x.io' }] }).expect(400);
    await request(app).post('/pacts').set(auth(t)).send({ ...base, guardians: [{ name: 'A', email: 'adrian@test.io' }, { name: 'B', email: 'b@x.io' }] }).expect(400);
  });

  it('nüks: temiz seri sıfırlanır (paket süresi değil), şahitlere mail gider, kendi bildirdiği de bildirmediği de kaydedilir', async () => {
    const t = await login();
    await activate(t);
    clock += 5 * DAY;
    const before = (await request(app).get('/pacts/current').set(auth(t))).body;
    expect(before.day).toBe(6);
    const r = await request(app).post('/pacts/current/relapse').set(auth(t)).send({ self: true }).expect(200);
    expect(r.body.day).toBe(6); // paket süresi değişmez
    expect(r.body.streakStartedAt).toBe(clock); // yalnızca temiz seri sıfırlanır
    expect(r.body.relapses).toEqual([clock]);
    expect(r.body.stake).toBeUndefined(); // para alanı yok
    expect((await outbox('relapse')).map(m => m.to_addr).sort()).toEqual(['elif@test.io', 'murat@test.io']);
    clock += 1000; // olay sırası zaman damgasına göre
    await request(app).post('/pacts/current/relapse').set(auth(t)).send({ self: false }).expect(200);
    const ev = await all(ctx.db, "SELECT payload FROM events WHERE type='relapse' ORDER BY at, id");
    expect(ev.map(e => JSON.parse(e.payload).self)).toEqual([true, false]);
  });

  it('paket süreleri: 7/30/60/90/180 kabul edilir, başkası reddedilir', async () => {
    const t = await login();
    const mk = (goalDays: number) => request(app).post('/pacts').set(auth(t)).send({ habitLabel: 'Kumar', goalDays, guardians: [{ name: 'A', email: 'a@x.io' }, { name: 'B', email: 'b@x.io' }] });
    await mk(45).expect(400);
    await mk(7).expect(201);
  });

  it('kriz: kabul eden şahit yoksa kimseye haber gitmez ve bu dürüstçe bildirilir (notified=0)', async () => {
    const t = await login();
    await createPact(t); // kimse kabul etmedi
    const cr = await request(app).post('/pacts/current/crisis').set(auth(t)).expect(200);
    expect(cr.body.notified).toBe(0);
    expect((await outbox('crisis'))).toHaveLength(0);
  });

  it('günlük kontrol günde bir kez: aynı gün ikinci kontrol reddedilir, ertesi gün olur', async () => {
    const t = await login();
    await activate(t);
    const ci = (day?: string) => request(app).post('/pacts/current/checkin').set(auth(t)).send({ urge: 3, day });
    await ci('2026-10-12').expect(200);
    const dup = await ci('2026-10-12').expect(409);
    expect(dup.body.error).toMatch(/zaten/);
    await ci('2026-10-13').expect(200);
    await ci('12-10-2026').expect(400); // geçersiz gün biçimi
  });

  it('kriz butonu şahitlere haber verir', async () => {
    const t = await login();
    await activate(t);
    const cr = await request(app).post('/pacts/current/crisis').set(auth(t)).expect(200);
    expect(cr.body.notified).toBe(2); // gerçekten haber verilen şahit sayısı
    expect((await outbox('crisis'))).toHaveLength(2);
  });

  it('süre dolunca pakt tamamlanır', async () => {
    const t = await login();
    await activate(t);
    clock += 91 * DAY;
    const cur = (await request(app).get('/pacts/current').set(auth(t))).body;
    expect(cur.status).toBe('completed');
    expect((await outbox('completed'))).toHaveLength(2);
  });
});

describe('çıkış: iki anahtar + 72 saat', () => {
  it('onay yoksa, onay var ama bekleme dolmadıysa reddeder; ikisi tamamsa kapatır ve emanet iade edilmez', async () => {
    const t = await login();
    const [g1, g2] = await activate(t);
    await request(app).post('/pacts/current/unlock').set(auth(t)).expect(201);
    expect((await outbox('unlock_requested'))).toHaveLength(2);
    await request(app).post('/pacts/current/unlock').set(auth(t)).expect(409); // çift talep

    await request(app).post('/pacts/current/unlock/complete').set(auth(t)).expect(403);
    await request(app).post('/guardian/unlock/approve').set(auth(g1)).expect(200);
    await request(app).post('/guardian/unlock/approve').set(auth(g1)).expect(200); // idempotent
    let cur = (await request(app).get('/pacts/current').set(auth(t))).body;
    expect(cur.unlock.approvals).toHaveLength(1);
    await request(app).post('/pacts/current/unlock/complete').set(auth(t)).expect(403);

    await request(app).post('/guardian/unlock/approve').set(auth(g2)).expect(200);
    const early = await request(app).post('/pacts/current/unlock/complete').set(auth(t)).expect(403);
    expect(early.body.error).toMatch(/Bekleme/);

    clock += 72 * HOUR + 1;
    const done = await request(app).post('/pacts/current/unlock/complete').set(auth(t)).expect(200);
    expect(done.body.status).toBe('closed');
  });

  it('şahit onayını geri çekebilir; nüks bekleyen talebi iptal eder', async () => {
    const t = await login();
    const [g1] = await activate(t);
    await request(app).post('/pacts/current/unlock').set(auth(t)).expect(201);
    await request(app).post('/guardian/unlock/approve').set(auth(g1)).expect(200);
    await request(app).post('/guardian/unlock/withdraw').set(auth(g1)).expect(200);
    expect((await request(app).get('/pacts/current').set(auth(t))).body.unlock.approvals).toHaveLength(0);
    await request(app).post('/pacts/current/relapse').set(auth(t)).send({ self: true }).expect(200);
    expect((await request(app).get('/pacts/current').set(auth(t))).body.unlock).toBeNull();
  });
});

describe('şahit portalı ve gizlilik', () => {
  it('şahit destek mesajı gönderir; kullanıcı ve başka kişi şahit uçlarına giremez', async () => {
    const t = await login();
    const [g1] = await activate(t);
    const me = await request(app).get('/guardian/me').set(auth(g1)).expect(200);
    expect(me.body.owner).toBe('Adrian');
    await request(app).post('/guardian/support').set(auth(g1)).send({ text: 'Yanındayım' }).expect(200);
    expect((await outbox('support'))[0].to_addr).toBe('adrian@test.io');
    await request(app).post('/guardian/support').set(auth(g1)).send({ text: 'x'.repeat(281) }).expect(400);
    await request(app).get('/guardian/me').set(auth(t)).expect(401); // kullanıcı token'ı şahit ucunda geçmez
  });

  it('reddeden şahit yetkisiz kalır; reddi kullanıcıya bildirilir', async () => {
    const t = await login();
    await createPact(t);
    await request(app).post(`/public/invites/${(await tokenFromInvite(2))}/decline`).expect(200);
    expect((await outbox('invite_status')).at(-1).body).toContain('reddetti');
    const acc = await request(app).post(`/public/invites/${(await tokenFromInvite(2))}/accept`);
    expect(acc.status).toBe(409);
  });

  it('geçersiz davet token\'ı 404', async () => {
    await request(app).get('/public/invites/deadbeef').expect(404);
  });

  it('KVKK: hesap silinince pakt ve şahitler de silinir', async () => {
    const t = await login();
    await activate(t);
    await request(app).delete('/me').set(auth(t)).expect(200);
    expect((await one(ctx.db, 'SELECT COUNT(*) n FROM pacts'))!.n).toBe(0);
    expect((await one(ctx.db, 'SELECT COUNT(*) n FROM guardians'))!.n).toBe(0);
  });

  it('sunucu imza videosu kabul etmez ve sunmaz (video yalnızca telefonda)', async () => {
    const t = await login();
    const [g1] = await activate(t);
    await request(app).put('/pacts/current/vow').set(auth(t)).set('Content-Type', 'video/mp4').send(Buffer.alloc(4096, 1)).expect(404);
    await request(app).get('/pacts/current/vow').set(auth(t)).expect(404);
    await request(app).get('/guardian/vow').set(auth(g1)).expect(404);
  });
});

describe('cihaz koruması (sabotaj tespiti)', () => {
  it('engel kapanınca şahitlere bir kez haber gider; yeniden açılınca olay yazılır', async () => {
    const t = await login();
    const [g1] = await activate(t);
    const hb = (shield: string) => request(app).post('/pacts/current/heartbeat').set(auth(t)).send({ platform: 'ios', shield }).expect(200);
    await hb('on');
    expect((await outbox('shield_off'))).toHaveLength(0);
    await hb('off');
    expect((await outbox('shield_off'))).toHaveLength(2);
    await hb('off'); // tekrar aynı durum: ikinci uyarı yok
    expect((await outbox('shield_off'))).toHaveLength(2);
    expect((await request(app).get('/guardian/me').set(auth(g1))).body.shield.shield).toBe('off');
    await hb('on');
    expect((await one(ctx.db, "SELECT COUNT(*) n FROM events WHERE type='shield_on'"))!.n).toBe(1);
  });
  it('24 saat sinyal gelmezse şahitlere bir kez haber gider', async () => {
    const t = await login();
    await activate(t);
    await request(app).post('/pacts/current/heartbeat').set(auth(t)).send({ platform: 'android', shield: 'on' }).expect(200);
    clock += 23 * HOUR;
    expect(await checkMissedHeartbeats(ctx)).toBe(0);
    clock += 2 * HOUR;
    expect(await checkMissedHeartbeats(ctx)).toBe(1);
    expect((await outbox('heartbeat_missed'))).toHaveLength(2);
    expect(await checkMissedHeartbeats(ctx)).toBe(0); // tekrar etmez
  });
});

describe('paketler: deneme hakkı, satın alma, uzatma, rapor', () => {
  const guards = [{ name: 'A', email: 'pa@x.io' }, { name: 'B', email: 'pb@x.io' }];
  const mk = (t: string, goalDays: number) => request(app).post('/pacts').set(auth(t)).send({ habitLabel: 'Kumar', goalDays, guardians: guards });

  it('7 günlük ücretsiz deneme hesap başına bir kez; bittikten sonra yenisi için paket gerekir', async () => {
    const t = await login();
    expect((await mk(t, 7)).status).toBe(201);
    expect((await request(app).get('/me').set(auth(t))).body.trialUsed).toBe(true);
    clock += 8 * DAY; // deneme bitti (completed)
    const again = await mk(t, 7);
    expect(again.status).toBe(402);
    expect(again.body.error).toMatch(/Ücretsiz deneme/);
    expect((await mk(t, 30)).status).toBe(201); // paketle devam
  });

  it('deneme paktı pakete uzatılır: gün sayısı korunur, 7 günde kısa/aynı süreye uzatma reddedilir', async () => {
    const t = await login();
    await mk(t, 7);
    clock += 3 * DAY;
    const up = await request(app).post('/pacts/current/upgrade').set(auth(t)).send({ goalDays: 60 }).expect(200);
    expect(up.body.goalDays).toBe(60);
    expect(up.body.plan).toBe('pack');
    expect(up.body.day).toBe(4); // seri bozulmadı
    await request(app).post('/pacts/current/upgrade').set(auth(t)).send({ goalDays: 30 }).expect(409); // daha kısa olamaz
    await request(app).post('/pacts/current/upgrade').set(auth(t)).send({ goalDays: 45 }).expect(400);
    const rows = (await all(ctx.db, 'SELECT product, source, used_pact_id FROM purchases')) as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].product).toBe('pack_60');
    expect(rows[0].used_pact_id).toBeTruthy(); // hak tüketildi
  });

  it('deneme bitince "şimdi değil" ücretsiz mod: kriz açık; paket alınınca pakt yeniden açılır, seri ve şahitler korunur', async () => {
    const t = await login();
    await mk(t, 7);
    for (const i of [0, 1]) await request(app).post(`/public/invites/${(await tokenFromInvite(i))}/accept`).expect(200);
    clock += 8 * DAY; // deneme bitti
    expect((await request(app).get('/pacts/current').set(auth(t))).body.status).toBe('completed');
    // ücretsiz mod: kriz butonu pakt bittikten sonra da şahitlere haber verir
    const cr = await request(app).post('/pacts/current/crisis').set(auth(t)).expect(200);
    expect(cr.body.notified).toBe(2);
    await request(app).post('/pacts/current/checkin').set(auth(t)).send({ urge: 1, day: '2026-10-20' }).expect(409); // kontrol/nüks pakt aktifken
    // paket alınır: pakt yeniden açılır, 8. günden devam eder
    const up = await request(app).post('/pacts/current/upgrade').set(auth(t)).send({ goalDays: 90 }).expect(200);
    expect(up.body.status).toBe('active');
    expect(up.body.goalDays).toBe(90);
    expect(up.body.day).toBe(9); // 8 gün geçti, 9. günde
    expect(up.body.guardians.filter((g: any) => g.status === 'accepted')).toHaveLength(2); // şahitler yerinde
  });

  it('çok önce biten pakt devam ettirilemez (yeni süre geçen günden uzun olmalı)', async () => {
    const t = await login();
    await mk(t, 7);
    clock += 40 * DAY;
    const r = await request(app).post('/pacts/current/upgrade').set(auth(t)).send({ goalDays: 30 });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/yeni bir pakt/);
  });

  it('uzman raporu yalnızca paketle; içerik kontrol, tekrar oynama ve krizleri sayar', async () => {
    const t = await login();
    await mk(t, 7);
    await request(app).get('/pacts/current/report').set(auth(t)).expect(402); // deneme: rapor yok
    await request(app).post('/pacts/current/upgrade').set(auth(t)).send({ goalDays: 30 }).expect(200);
    await request(app).post('/pacts/current/checkin').set(auth(t)).send({ urge: 2, day: '2026-10-01' }).expect(200);
    await request(app).post('/pacts/current/checkin').set(auth(t)).send({ urge: 6, day: '2026-10-02' }).expect(200);
    await request(app).post('/pacts/current/crisis').set(auth(t)).expect(200);
    await request(app).post('/pacts/current/relapse').set(auth(t)).send({ self: true }).expect(200);
    const rep = (await request(app).get('/pacts/current/report').set(auth(t)).expect(200)).body;
    expect(rep.checkins).toBe(2);
    expect(rep.avgUrge).toBe(4);
    expect(rep.crises).toBe(1);
    expect(rep.relapses).toHaveLength(1);
    expect(rep.relapses[0].self).toBe(true);
  });

  it('ödeme doğrulaması bağlıyken (demo kapalı) satın alma yoksa paket 402; deneme yine ücretsiz', async () => {
    const real = await createApp({ memory: true, now: () => clock, cfg: { prod: false, jwtSecret: 'x', adminPassword: 'p', demoPurchases: false, databaseUrl: undefined } });
    const code = async (email: string) => { await request(real.app).post('/auth/request-code').send({ email }); const m = (await all(real.ctx.db, "SELECT body FROM outbox WHERE kind='login_code' ORDER BY created_at DESC, id")) as any[]; return /: (\d{6})/.exec(m[0].body)![1]; };
    await request(real.app).post('/auth/request-code').send({ email: 'gercek@x.io' });
    const body = ((await all(real.ctx.db, "SELECT body FROM outbox WHERE kind='login_code'")) as any[])[0].body as string;
    const tok = (await request(real.app).post('/auth/verify').send({ email: 'gercek@x.io', code: /: (\d{6})/.exec(body)![1] })).body.token;
    const mkr = (goalDays: number) => request(real.app).post('/pacts').set(auth(tok)).send({ habitLabel: 'Kumar', goalDays, guardians: guards });
    const paid = await mkr(30);
    expect(paid.status).toBe(402);
    expect(paid.body.error).toMatch(/satın alma/);
    expect(((await all(real.ctx.db, 'SELECT id FROM pacts')) as any[])).toHaveLength(0); // pakt oluşmadı
    expect((await mkr(7)).status).toBe(201); // deneme hâlâ ücretsiz
    // gerçek satın alma kaydı varsa uzatma çalışır
    await real.ctx.db.q("INSERT INTO purchases(id,user_id,product,source,created_at) SELECT 'p1', id, 'pack_30', 'play', 1 FROM users LIMIT 1");
    await request(real.app).post('/pacts/current/upgrade').set(auth(tok)).send({ goalDays: 30 }).expect(200);
    await request(real.app).post('/pacts/current/upgrade').set(auth(tok)).send({ goalDays: 60 }).expect(402); // ikinci hak yok
    void code;
  });
});

describe('admin paneli', () => {
  const adminToken = async () => (await request(app).post('/admin/login').send({ email: 'admin@test.io', password: 'pw-admin-123' }).expect(200)).body.token as string;

  it('yanlış şifreyi reddeder; istatistik, liste ve davet yeniden gönderimi çalışır; erişimler denetlenir', async () => {
    await request(app).post('/admin/login').send({ email: 'admin@test.io', password: 'yanlis' }).expect(401);
    const t = await login();
    await activate(t);
    const a = await adminToken();
    const s = (await request(app).get('/admin/stats').set(auth(a)).expect(200)).body;
    expect(s.users).toBe(1);
    expect(s.pacts.active).toBe(1);
    expect(s.guardians.accepted).toBe(2);
    expect(s.guardians.invited).toBe(1);

    const pacts = (await request(app).get('/admin/pacts').set(auth(a)).expect(200)).body;
    expect(JSON.stringify(pacts)).not.toContain('vow_key');

    const detail = (await request(app).get(`/admin/pacts/${pacts[0].id}`).set(auth(a)).expect(200)).body;
    expect(detail.pact.guardians).toHaveLength(3);
    expect(detail.events.some((e: any) => e.type === 'activated')).toBe(true);

    const gs = (await request(app).get('/admin/guardians').set(auth(a)).expect(200)).body;
    const pending = gs.find((g: any) => g.status === 'invited');
    const before = (await outbox('invite')).length;
    await request(app).post(`/admin/guardians/${pending.id}/resend`).set(auth(a)).expect(200);
    expect((await outbox('invite'))).toHaveLength(before + 1);

    const audit = (await request(app).get('/admin/audit').set(auth(a)).expect(200)).body;
    expect(audit.map((x: any) => x.action)).toEqual(expect.arrayContaining(['view_pact', 'resend_invite']));
  });

});
