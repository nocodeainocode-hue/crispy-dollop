import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const base = { prod: false, jwtSecret: 'test-secret', adminEmail: 'admin@test.io', adminPassword: 'pw-admin-123', webUrl: 'http://web.test', databaseUrl: undefined };
// /auth/request-code: dakikada 6 istek
const burst = async (app: any, ip: string) => {
  const codes: number[] = [];
  for (let i = 0; i < 7; i++) codes.push((await request(app).post('/auth/request-code').set('X-Forwarded-For', ip).send({ email: `u${i}@test.io` })).status);
  return codes;
};

describe('ters vekil arkasında hız sınırı', () => {
  it('trustProxy açıkken her istemci IP’si ayrı sayılır', async () => {
    const { app } = await createApp({ memory: true, cfg: { ...base, trustProxy: 1 } });
    expect((await burst(app, '1.1.1.1')).at(-1)).toBe(429);
    expect((await burst(app, '2.2.2.2')).slice(0, 6).every(s => s === 200)).toBe(true);
  });

  it('trustProxy kapalıyken X-Forwarded-For ile sınır aşılamaz', async () => {
    const { app } = await createApp({ memory: true, cfg: { ...base, trustProxy: 0 } });
    await burst(app, '1.1.1.1');
    expect((await request(app).post('/auth/request-code').set('X-Forwarded-For', '3.3.3.3').send({ email: 'x@test.io' })).status).toBe(429);
  });
});
