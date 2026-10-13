import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { all, one } from '../src/db.js';
import { createPlayClient, PlayError, type PlayClient } from '../src/play.js';
import { billingRef, retryPlayConsume } from '../src/service.js';

const DAY = 86400000;
let clock = 1_700_000_000_000;

// ---------- Sunucu kuralları (sahte Google ile) ----------
describe('Google Play satın alma doğrulaması (/purchases/play)', () => {
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let ctx: Awaited<ReturnType<typeof createApp>>['ctx'];
  const calls = { get: [] as any[], consume: [] as any[] };
  const st = { purchaseState: 0, ref: '', fail: false, consumeFail: false };
  const fake: PlayClient = {
    async getProduct(p, t) { calls.get.push([p, t]); if (st.fail) throw new PlayError(404, 'yok'); return { purchaseState: st.purchaseState, consumptionState: 0, acknowledgementState: 0, orderId: 'GPA.1234', obfuscatedExternalAccountId: st.ref }; },
    async consume(p, t) { calls.consume.push([p, t]); if (st.consumeFail) throw new Error('ağ'); },
  };
  const mkApp = async (play: PlayClient | null) => createApp({ memory: true, now: () => clock, play, cfg: { prod: false, jwtSecret: 'x', adminPassword: 'p', demoPurchases: false, databaseUrl: undefined } });

  beforeEach(async () => {
    clock = 1_700_000_000_000; calls.get.length = 0; calls.consume.length = 0;
    Object.assign(st, { purchaseState: 0, ref: '', fail: false, consumeFail: false });
    const r = await mkApp(fake); app = r.app; ctx = r.ctx;
  });

  const login = async (a = app, c = ctx, email = 'play@x.io') => {
    await request(a).post('/auth/request-code').send({ email });
    const rows = await all(c.db, "SELECT body FROM outbox WHERE kind='login_code' AND to_addr=? ORDER BY created_at DESC, id", email);
    const code = /: (\d{6})/.exec(rows[0].body)![1];
    const r = await request(a).post('/auth/verify').send({ email, code });
    return { token: r.body.token as string, id: r.body.user.id as string };
  };
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const buy = (t: string, productId = 'pack_30', purchaseToken = 'tok_abcdefghij_1') => request(app).post('/purchases/play').set(auth(t)).send({ productId, purchaseToken });

  it('Google yapılandırılmamışsa 501; /me hesap kimliğini ve durumu verir', async () => {
    const r = await mkApp(null);
    const { token } = await login(r.app, r.ctx);
    await request(r.app).post('/purchases/play').set(auth(token)).send({ productId: 'pack_30', purchaseToken: 'tok_abcdefghij_1' }).expect(501);
    const me = (await request(r.app).get('/me').set(auth(token))).body;
    expect(me.playEnabled).toBe(false);
    expect(me.billingRef).toMatch(/^[a-f0-9]{40}$/);
  });

  it('doğrulanan satın alma bir paket hakkı olur, Google\'da tüketilir ve gerçekten pakt uzatır', async () => {
    const { token, id } = await login();
    st.ref = billingRef(id);
    await buy(token).expect(201);
    const row = (await one(ctx.db, "SELECT product, source, play_order_id, play_consumed, used_pact_id FROM purchases"))!;
    expect(row).toMatchObject({ product: 'pack_30', source: 'play', play_order_id: 'GPA.1234', play_consumed: true, used_pact_id: null });
    expect(calls.consume).toEqual([['pack_30', 'tok_abcdefghij_1']]);
    // demo kapalı: hak olmadan paket yoktu; şimdi hak var
    const g = [{ name: 'A', email: 'a@x.io' }, { name: 'B', email: 'b@x.io' }];
    await request(app).post('/pacts').set(auth(token)).send({ habitLabel: 'Kumar', goalDays: 7, guardians: g }).expect(201);
    await request(app).post('/pacts/current/upgrade').set(auth(token)).send({ goalDays: 30 }).expect(200);
    expect((await one(ctx.db, 'SELECT used_pact_id FROM purchases'))!.used_pact_id).toBeTruthy(); // hak tüketildi
    await request(app).post('/pacts/current/upgrade').set(auth(token)).send({ goalDays: 60 }).expect(402); // ikinci hak yok
  });

  it('başkasının hesabına ait ya da hesap kimliği olmayan satın alma reddedilir, kayıt oluşmaz', async () => {
    const { token } = await login();
    st.ref = 'baska-bir-hesap';
    await buy(token).expect(400);
    st.ref = ''; // istemci kimliği hiç vermedi
    await buy(token, 'pack_30', 'tok_abcdefghij_2').expect(400);
    expect(await all(ctx.db, 'SELECT id FROM purchases')).toHaveLength(0);
    expect(calls.consume).toHaveLength(0);
  });

  it('beklemede ya da iptal edilmiş ödeme hak vermez', async () => {
    const { token, id } = await login();
    st.ref = billingRef(id);
    st.purchaseState = 2; expect((await buy(token).expect(402)).body.error).toMatch(/beklemede/);
    st.purchaseState = 1; await buy(token, 'pack_30', 'tok_abcdefghij_3').expect(402);
    expect(await all(ctx.db, 'SELECT id FROM purchases')).toHaveLength(0);
  });

  it('Google belgeyi tanımazsa 400; geçersiz ürün 400', async () => {
    const { token } = await login();
    st.fail = true;
    await buy(token).expect(400);
    await buy(token, 'pack_999').expect(400);
  });

  it('aynı belge tekrar gönderilirse çift hak verilmez; başka hesap aynı belgeyi kullanamaz', async () => {
    const a = await login();
    st.ref = billingRef(a.id);
    await buy(a.token).expect(201);
    const again = await buy(a.token).expect(200);
    expect(again.body.duplicate).toBe(true);
    expect(await all(ctx.db, 'SELECT id FROM purchases')).toHaveLength(1);
    expect(calls.consume).toHaveLength(1);
    const b = await login(app, ctx, 'baska@x.io');
    await buy(b.token).expect(409);
  });

  it('Google\'da tüketme başarısız olsa da hak verilir; yeniden deneme tüketir', async () => {
    const { token, id } = await login();
    st.ref = billingRef(id);
    st.consumeFail = true;
    await buy(token).expect(201);
    expect((await one(ctx.db, 'SELECT play_consumed FROM purchases'))!.play_consumed).toBe(false);
    st.consumeFail = false;
    expect(await retryPlayConsume(ctx)).toBe(1);
    expect((await one(ctx.db, 'SELECT play_consumed FROM purchases'))!.play_consumed).toBe(true);
    expect(await retryPlayConsume(ctx)).toBe(0); // tekrar yok
  });
});

// ---------- Gerçek Google istemcisi (fetch taklidiyle) ----------
describe('createPlayClient: servis hesabı kimlik doğrulaması ve istekler', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const sa = JSON.stringify({ client_email: 'svc@proje.iam.gserviceaccount.com', private_key: pem });
  const cfg: any = { googlePackage: 'com.quitvow.app', googleServiceAccountJson: sa };
  let fetchMock: ReturnType<typeof vi.fn>;
  let oauthCalls = 0;

  beforeEach(() => {
    oauthCalls = 0;
    fetchMock = vi.fn(async (url: string, init?: any) => {
      if (url === 'https://oauth2.googleapis.com/token') {
        oauthCalls++;
        const assertion = new URLSearchParams(init.body).get('assertion')!;
        const claims = jwt.verify(assertion, pub, { algorithms: ['RS256'] }) as any; // imza gerçekten servis hesabı anahtarıyla atılmış mı
        expect(claims.iss).toBe('svc@proje.iam.gserviceaccount.com');
        expect(claims.scope).toBe('https://www.googleapis.com/auth/androidpublisher');
        return new Response(JSON.stringify({ access_token: 'AT123', expires_in: 3600 }), { status: 200 });
      }
      expect(init.headers.Authorization).toBe('Bearer AT123');
      if (url.includes('tok_yok')) return new Response('{"error":{"code":404}}', { status: 404 });
      if (url.endsWith(':consume')) return new Response(null, { status: 204 });
      return new Response(JSON.stringify({ purchaseState: 0, consumptionState: 0, acknowledgementState: 1, orderId: 'GPA.9', obfuscatedExternalAccountId: 'ref1' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('yapılandırma yoksa null; varsa ürünü sorgular, doğru adreslere gider, erişim anahtarını önbellekler', async () => {
    expect(createPlayClient({ googlePackage: 'x' } as any)).toBeNull();
    const play = createPlayClient(cfg)!;
    const p = await play.getProduct('pack_60', 'tok_abc');
    expect(p).toMatchObject({ purchaseState: 0, orderId: 'GPA.9', obfuscatedExternalAccountId: 'ref1' });
    await play.consume('pack_60', 'tok_abc');
    const urls = fetchMock.mock.calls.map(c => c[0] as string).filter(u => u.includes('androidpublisher'));
    expect(urls[0]).toBe('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.quitvow.app/purchases/products/pack_60/tokens/tok_abc');
    expect(urls[1]).toBe(urls[0] + ':consume');
    expect(fetchMock.mock.calls.find(c => (c[0] as string).endsWith(':consume'))![1].method).toBe('POST');
    expect(oauthCalls).toBe(1); // ikinci çağrıda yeniden kimlik doğrulama yok
  });

  it('Google 404 verirse PlayError(404) fırlatır', async () => {
    const play = createPlayClient(cfg)!;
    await expect(play.getProduct('pack_30', 'tok_yok')).rejects.toMatchObject({ status: 404 });
  });
});

void DAY;
