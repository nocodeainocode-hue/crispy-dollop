import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { all } from '../src/db.js';

const base = { prod: false, jwtSecret: 'test-secret', adminEmail: 'admin@test.io', adminPassword: 'pw-admin-123', webUrl: 'http://web.test', databaseUrl: undefined };

describe('Google Play inceleme hesabı', () => {
  it('inceleme adresine mail gitmez, sabit kodla girilir; başka adreslere etkisi yok', async () => {
    const { app, ctx } = await createApp({ memory: true, cfg: { ...base, reviewEmail: 'review@quitvow.com.tr', reviewCode: '246810' } });
    await request(app).post('/auth/request-code').send({ email: 'Review@QuitVow.com.tr' }).expect(200);
    expect(await all(ctx.db, 'SELECT * FROM outbox')).toHaveLength(0);
    const r = await request(app).post('/auth/verify').send({ email: 'review@quitvow.com.tr', code: '246810' }).expect(200);
    expect(r.body.token).toBeTruthy();
    // sıradan kullanıcı sabit kodla giremez
    await request(app).post('/auth/request-code').send({ email: 'sam@test.io' }).expect(200);
    expect(await all(ctx.db, "SELECT * FROM outbox WHERE kind='login_code'")).toHaveLength(1);
    await request(app).post('/auth/verify').send({ email: 'sam@test.io', code: '246810' }).expect(401);
  });

  it('kod tanımlı değilse inceleme adresi sıradan kullanıcıdır', async () => {
    const { app, ctx } = await createApp({ memory: true, cfg: { ...base, reviewEmail: 'review@quitvow.com.tr', reviewCode: undefined } });
    await request(app).post('/auth/request-code').send({ email: 'review@quitvow.com.tr' }).expect(200);
    expect(await all(ctx.db, "SELECT * FROM outbox WHERE kind='login_code'")).toHaveLength(1);
  });
});
