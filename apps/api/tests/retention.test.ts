import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { all, run } from '../src/db.js';
import { DAY, purgeOld } from '../src/service.js';

const base = { prod: false, jwtSecret: 'test-secret', adminEmail: 'admin@test.io', adminPassword: 'pw-admin-123', webUrl: 'http://web.test', databaseUrl: undefined };

describe('veri saklama', () => {
  it('90 günden eski mail kayıtları ve süresi geçmiş giriş kodları silinir', async () => {
    const { app, ctx } = await createApp({ memory: true, cfg: base });
    await request(app).post('/auth/request-code').send({ email: 'old@test.io' }).expect(200);
    await request(app).post('/auth/request-code').send({ email: 'mid@test.io' }).expect(200);
    await request(app).post('/auth/request-code').send({ email: 'new@test.io' }).expect(200);
    // kayıtları yaşlandır: 91 gün, 89 gün; eskinin giriş kodunun süresi de geçmiş
    await run(ctx.db, "UPDATE outbox SET created_at=? WHERE to_addr='old@test.io'", Date.now() - 91 * DAY);
    await run(ctx.db, "UPDATE outbox SET created_at=? WHERE to_addr='mid@test.io'", Date.now() - 89 * DAY);
    await run(ctx.db, "UPDATE login_codes SET expires_at=? WHERE email='old@test.io'", Date.now() - 1);
    await purgeOld(ctx);
    expect((await all(ctx.db, 'SELECT to_addr FROM outbox')).map((r: any) => r.to_addr).sort()).toEqual(['mid@test.io', 'new@test.io']);
    expect((await all(ctx.db, 'SELECT email FROM login_codes')).map((r: any) => r.email).sort()).toEqual(['mid@test.io', 'new@test.io']);
  });

  it('hesap silinince kişinin kendi mail kayıtları da silinir', async () => {
    const { app, ctx } = await createApp({ memory: true, cfg: base });
    await request(app).post('/auth/request-code').send({ email: 'sam@test.io' }).expect(200);
    const code = /(\d{6})/.exec((await all(ctx.db, 'SELECT body FROM outbox'))[0].body)![1];
    const t = (await request(app).post('/auth/verify').send({ email: 'sam@test.io', code }).expect(200)).body.token;
    await request(app).post('/auth/request-code').send({ email: 'sam@test.io' }).expect(200); // bekleyen kod
    await request(app).delete('/me').set({ Authorization: `Bearer ${t}` }).expect(200);
    expect(await all(ctx.db, "SELECT * FROM outbox WHERE to_addr='sam@test.io'")).toHaveLength(0);
    expect(await all(ctx.db, "SELECT * FROM login_codes WHERE email='sam@test.io'")).toHaveLength(0);
  });
});
