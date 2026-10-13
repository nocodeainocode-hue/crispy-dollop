import crypto from 'node:crypto';
import express, { Router } from 'express';
import { z } from 'zod';
import { all, one, run } from './db.js';
import { T } from './mail.js';
import { reqLocale } from './i18n.js';
import { HttpError, authOf, h, hashPassword, inviteCode, normCode, randomToken, rateLimit, requireRole, sha256, signToken, uid, verifyPassword } from './security.js';
import { PlayError } from './play.js';
import { DAY, acceptedGuardians, billingRef, consumePack, currentPact, isPack, nextPackDiscount, trialUsed, logEvent, notifyGuardians, ownerOf, publicGuardian, serializePact, unlockState, type Ctx } from './service.js';

const email = z.string().trim().toLowerCase().email().max(200);
const locale = z.enum(['tr', 'en']).optional();
const parse = <S extends z.ZodTypeAny>(s: S, v: unknown): z.infer<S> => {
  const r = s.safeParse(v);
  if (!r.success) throw new HttpError(400, r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data;
};

async function sendInvite(c: Ctx, pact: any, g: { id: string; name: string; email: string }, token: string) {
  const o = (await ownerOf(c, pact.id));
  await c.mail({ to: g.email, kind: 'invite', ...T(o.locale).invite(o.name, g.name, pact.hide_habit ? null : pact.habit_label, token, c.cfg.appUrl) });
}

export function buildRouter(c: Ctx) {
  const r = Router();
  const user = requireRole(c.cfg, 'user'), guardian = requireRole(c.cfg, 'guardian'), admin = requireRole(c.cfg, 'admin');

  // ───────────── Kullanıcı girişi (e-posta + 6 haneli kod) ─────────────
  r.post('/auth/request-code', rateLimit(6, 60_000), h(async (req, res) => {
    const b = parse(z.object({ email, name: z.string().trim().max(80).optional(), locale }), req.body);
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await run(c.db, 'INSERT INTO login_codes(email,code_hash,expires_at,attempts,name) VALUES(?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, attempts=0, name=excluded.name',
      b.email, sha256(b.email + code), c.now() + 10 * 60_000, b.name ?? null);
    await c.mail({ to: b.email, kind: 'login_code', ...T(b.locale ?? reqLocale(req)).code(code) });
    // Kullanıcı var mı yok mu sızdırılmaz: her zaman aynı yanıt
    res.json({ ok: true });
  }));

  r.post('/auth/verify', rateLimit(10, 60_000), h(async (req, res) => {
    const b = parse(z.object({ email, code: z.string().regex(/^\d{6}$/), name: z.string().trim().max(80).optional(), locale }), req.body);
    const row = (await one(c.db, 'SELECT * FROM login_codes WHERE email=?', b.email));
    if (!row || row.expires_at < c.now() || row.attempts >= 5) throw new HttpError(401, 'Kod geçersiz veya süresi doldu');
    if (row.code_hash !== sha256(b.email + b.code)) { (await run(c.db, 'UPDATE login_codes SET attempts=attempts+1 WHERE email=?', b.email)); throw new HttpError(401, 'Kod hatalı'); }
    await run(c.db, 'DELETE FROM login_codes WHERE email=?', b.email);
    const name = (b.name ?? row.name ?? '').trim(); // ad, yalnızca kod doğrulanınca kaydedilir
    let u = (await one(c.db, 'SELECT * FROM users WHERE email=?', b.email));
    if (!u) { const id = uid(); (await run(c.db, 'INSERT INTO users(id,email,name,created_at,locale) VALUES(?,?,?,?,?)', id, b.email, name, c.now(), b.locale ?? reqLocale(req))); u = (await one(c.db, 'SELECT * FROM users WHERE id=?', id)); }
    else if (name && name !== u.name) { (await run(c.db, 'UPDATE users SET name=? WHERE id=?', name, u.id)); u.name = name; }
    if (b.locale && b.locale !== u.locale) { await run(c.db, 'UPDATE users SET locale=? WHERE id=?', b.locale, u.id); u.locale = b.locale; }
    res.json({ token: signToken(c.cfg, 'user', u.id, '90d'), user: { id: u.id, email: u.email, name: u.name } });
  }));

  r.get('/me', user, h(async (_req, res) => {
    const u = (await one(c.db, 'SELECT id,email,name,locale FROM users WHERE id=?', authOf(res).id));
    if (!u) throw new HttpError(401, 'Kullanıcı yok');
    res.json({ ...u, trialUsed: await trialUsed(c, u.id), nextPackDiscount: await nextPackDiscount(c, u.id), demoPurchases: c.cfg.demoPurchases, billingRef: billingRef(u.id), playEnabled: !!c.play });
  }));

  // Profil: görünen ad (şahitlere giden e-postalarda bu ad geçer) ve dil (e-postalar bu dilde gider)
  r.patch('/me', user, h(async (req, res) => {
    const b = parse(z.object({ name: z.string().trim().min(2).max(80).optional(), locale }), req.body);
    if (!b.name && !b.locale) throw new HttpError(400, 'Ad veya dil gerekli');
    const id = authOf(res).id;
    if (b.name) await run(c.db, 'UPDATE users SET name=? WHERE id=?', b.name, id);
    if (b.locale) await run(c.db, 'UPDATE users SET locale=? WHERE id=?', b.locale, id);
    const u = (await one(c.db, 'SELECT name,locale FROM users WHERE id=?', id));
    res.json({ ok: true, name: u?.name, locale: u?.locale });
  }));

  // KVKK: hesabı ve tüm verileri (video dahil) sil
  r.delete('/me', user, h(async (_req, res) => {
    const id = authOf(res).id;
    const u = (await one(c.db, 'SELECT * FROM users WHERE id=?', id));
    for (const p of (await all(c.db, 'SELECT * FROM pacts WHERE user_id=?', id))) {
      if (p.status === 'active' || p.status === 'pending') (await notifyGuardians(c, p.id, () => T(u?.locale).closed(u?.name ?? ''), 'closed'));
    }
    await run(c.db, 'DELETE FROM users WHERE id=?', id);
    res.json({ ok: true });
  }));

  // ───────────── Pakt ─────────────
  r.post('/pacts', user, h(async (req, res) => {
    const uidv = authOf(res).id;
    const b = parse(z.object({
      habitLabel: z.string().trim().min(2).max(200), goalDays: z.number().int().refine(d => [7, 30, 60, 90, 180].includes(d), 'Paket süresi 7, 30, 60, 90 veya 180 gün olmalı'),
      guardians: z.array(z.object({ name: z.string().trim().min(1).max(80), email, phone: z.string().trim().max(30).optional() })).max(3).default([]),
      hideHabit: z.boolean().optional(),
    }), req.body);
    if ((await currentPact(c, uidv))?.status === 'active' || (await currentPact(c, uidv))?.status === 'pending') throw new HttpError(409, 'Zaten aktif bir paktın var');
    const me = (await one(c.db, 'SELECT * FROM users WHERE id=?', uidv))!;
    if (b.guardians.some(g => g.email === me.email)) throw new HttpError(400, 'Kendini şahit olarak ekleyemezsin');
    if (new Set(b.guardians.map(g => g.email)).size !== b.guardians.length) throw new HttpError(400, 'Aynı kişiyi iki kez ekleyemezsin');
    const pid = uid();
    const trial = !isPack(b.goalDays);
    if (trial && (await trialUsed(c, uidv))) throw new HttpError(402, 'Ücretsiz deneme zaten kullanıldı; devam için 30, 60 veya 90 günlük paket gerekir');
    if (!trial) await consumePack(c, uidv, b.goalDays, pid); // paket hakkı yoksa 402 (pakt oluşmadan)
    await run(c.db, "INSERT INTO pacts(id,user_id,habit_label,goal_days,status,started_at,streak_started_at,created_at,trial,hide_habit) VALUES(?,?,?,?,'active',?,?,?,?,?)", pid, uidv, b.habitLabel, b.goalDays, c.now(), c.now(), c.now(), trial, !!b.hideHabit);
    const pact = (await one(c.db, 'SELECT * FROM pacts WHERE id=?', pid))!;
    for (const g of b.guardians) {
      const gid = uid(), token = inviteCode();
      await run(c.db, 'INSERT INTO guardians(id,pact_id,name,email,phone,invite_hash,invited_at) VALUES(?,?,?,?,?,?,?)', gid, pid, g.name, g.email, g.phone ?? null, sha256(normCode(token)), c.now());
      await sendInvite(c, pact, { id: gid, ...g }, token);
    }
    await logEvent(c, pid, 'created');
    await logEvent(c, pid, 'activated'); // pakt şahit beklemeden başlar
    await c.mail({ to: me.email, kind: 'pact_active', ...T(me.locale).pactActive(me.name) });
    res.status(201).json((await serializePact(c, pact)));
  }));

  // Alışkanlığı şahitlerden gizle/göster (davet ve bildirimlerde "kişisel bir hedef" yazar)
  // ve şahitlere haftalık iyi haber e-postası
  r.patch('/pacts/current', user, h(async (req, res) => {
    const b = parse(z.object({ hideHabit: z.boolean().optional(), weeklyDigest: z.boolean().optional() }).refine(x => x.hideHabit !== undefined || x.weeklyDigest !== undefined, 'hideHabit veya weeklyDigest gerekli'), req.body);
    const p = (await mine(res, ['active', 'pending', 'completed']));
    if (b.hideHabit !== undefined) await run(c.db, 'UPDATE pacts SET hide_habit=? WHERE id=?', b.hideHabit, p.id);
    if (b.weeklyDigest !== undefined) await run(c.db, 'UPDATE pacts SET weekly_digest=? WHERE id=?', b.weeklyDigest, p.id);
    res.json((await serializePact(c, (await one(c.db, 'SELECT * FROM pacts WHERE id=?', p.id)))));
  }));

  r.get('/pacts/current', user, h(async (_req, res) => {
    const p = (await currentPact(c, authOf(res).id));
    res.json(p ? (await serializePact(c, p)) : null);
  }));

  const mine = async (res: express.Response, statuses: string[] = ['active']) => {
    const p = (await currentPact(c, authOf(res).id));
    if (!p || !statuses.includes(p.status)) throw new HttpError(409, 'Uygun bir pakt yok');
    return p;
  };

  // İmza videosu (isteğe bağlı): ≤60 sn. Pakt başlamadan değiştirilebilir; aktifken yalnızca henüz yoksa eklenebilir (kaçmak için yeniden çekme yok).

  r.post('/pacts/current/guardians', user, h(async (req, res) => {
    const p = (await mine(res, ['pending', 'active']));
    const b = parse(z.object({ name: z.string().trim().min(1).max(80), email, phone: z.string().trim().max(30).optional() }), req.body);
    const live = (await all(c.db, "SELECT * FROM guardians WHERE pact_id=? AND status IN ('invited','accepted')", p.id));
    if (live.length >= 3) throw new HttpError(409, 'En fazla 3 şahit');
    if ((await all(c.db, "SELECT 1 FROM guardians WHERE pact_id=? AND email=? AND status!='declined' AND status!='removed'", p.id, b.email)).length) throw new HttpError(409, 'Bu kişi zaten şahit');
    const gid = uid(), token = inviteCode();
    await run(c.db, 'INSERT INTO guardians(id,pact_id,name,email,phone,invite_hash,invited_at) VALUES(?,?,?,?,?,?,?)', gid, p.id, b.name, b.email, b.phone ?? null, sha256(normCode(token)), c.now());
    await sendInvite(c, p, { id: gid, ...b }, token);
    res.status(201).json((await serializePact(c, p)));
  }));

  r.post('/pacts/current/guardians/:gid/resend', user, rateLimit(5, 60_000), h(async (req, res) => {
    const p = (await mine(res, ['pending', 'active']));
    const g = (await one(c.db, "SELECT * FROM guardians WHERE id=? AND pact_id=? AND status IN ('invited','accepted')", req.params.gid, p.id));
    if (!g) throw new HttpError(404, 'Şahit yok');
    const token = inviteCode();
    await run(c.db, 'UPDATE guardians SET invite_hash=? WHERE id=?', sha256(normCode(token)), g.id);
    await sendInvite(c, p, g, token);
    res.json({ ok: true });
  }));

  r.post('/pacts/current/checkin', user, h(async (req, res) => {
    const p = (await mine(res));
    const b = parse(z.object({ urge: z.number().int().min(0).max(10).optional(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }), req.body ?? {});
    // Günlük kontrol günde bir kez: istemci yerel gün anahtarını (YYYY-AA-GG) gönderir
    if (b.day && (await one(c.db, "SELECT 1 x FROM events WHERE pact_id=? AND type='checkin' AND payload LIKE ?", p.id, `%"day":"${b.day}"%`))) throw new HttpError(409, 'Bugünkü kontrolünü zaten yaptın');
    await logEvent(c, p.id, 'checkin', { urge: b.urge ?? null, day: b.day ?? null });
    res.json({ ok: true });
  }));

  // Google Play satın alması: istemci satın alma belgesini (token) gönderir; sunucu Google'a doğrulatır,
  // hesap kimliğiyle eşleştirir, bir paket hakkı olarak kaydeder ve (tekrar alınabilsin diye) Google'da tüketir.
  r.post('/purchases/play', user, rateLimit(20, 60_000), h(async (req, res) => {
    if (!c.play) throw new HttpError(501, 'Google Play doğrulaması bu sunucuda yapılandırılmamış');
    const uidv = authOf(res).id;
    const b = parse(z.object({ productId: z.enum(['pack_30', 'pack_60', 'pack_90', 'pack_180']), purchaseToken: z.string().min(10).max(4000) }), req.body);
    const dup = await one(c.db, 'SELECT id, user_id FROM purchases WHERE play_token=?', b.purchaseToken);
    if (dup) { if (dup.user_id !== uidv) throw new HttpError(409, 'Bu satın alma başka bir hesaba ait'); return void res.json({ ok: true, duplicate: true }); } // istemci yeniden denemesi: güvenli
    let info;
    try { info = await c.play.getProduct(b.productId, b.purchaseToken); }
    catch (e) { throw new HttpError(e instanceof PlayError && e.status >= 500 ? 502 : 400, 'Satın alma doğrulanamadı'); }
    if (info.purchaseState !== 0) throw new HttpError(402, info.purchaseState === 2 ? 'Ödeme beklemede; tamamlanınca paket açılır' : 'Satın alma tamamlanmamış');
    if (info.obfuscatedExternalAccountId !== billingRef(uidv)) throw new HttpError(400, 'Satın alma bu hesapla eşleşmedi');
    const id = uid();
    await run(c.db, "INSERT INTO purchases(id,user_id,product,source,created_at,play_token,play_order_id) VALUES(?,?,?,'play',?,?,?)", id, uidv, b.productId, c.now(), b.purchaseToken, info.orderId ?? null);
    try { await c.play.consume(b.productId, b.purchaseToken); await run(c.db, 'UPDATE purchases SET play_consumed=TRUE WHERE id=?', id); }
    catch { /* hak verildi; tüketme arka planda yeniden denenir */ }
    res.status(201).json({ ok: true });
  }));

  // Deneme -> paket: mevcut pakt uzatılır (gün sayısı ve seri korunur). Deneme bittiyse (completed) paket alınınca pakt yeniden açılır.
  r.post('/pacts/current/upgrade', user, h(async (req, res) => {
    const p = await mine(res, ['active', 'completed']);
    const b = parse(z.object({ goalDays: z.number().int().refine(d => [30, 60, 90, 180].includes(d), 'Paket süresi 30, 60, 90 veya 180 gün olmalı') }), req.body);
    if (b.goalDays <= p.goal_days) throw new HttpError(409, 'Mevcut paketinden daha uzun bir paket seçmelisin');
    // Çok önce bitmiş bir pakt devam ettirilemez: yeni süre geçen günden uzun olmalı, yoksa hemen yine biter
    if (p.started_at && Math.floor((c.now() - p.started_at) / DAY) >= b.goalDays) throw new HttpError(409, 'Bu pakt çok önce bitti; yeni bir pakt kurmalısın');
    await consumePack(c, authOf(res).id, b.goalDays, p.id);
    await run(c.db, "UPDATE pacts SET goal_days=?, status='active' WHERE id=?", b.goalDays, p.id);
    await logEvent(c, p.id, 'upgraded', { from: p.goal_days, to: b.goalDays });
    res.json(await serializePact(c, await one(c.db, 'SELECT * FROM pacts WHERE id=?', p.id)));
  }));

  // Uzman/terapist raporu özeti (paket gerekir). Veriyi kullanıcı kendisi paylaşır; sunucu kimseye göndermez.
  r.get('/pacts/current/report', user, h(async (_req, res) => {
    const p = await mine(res, ['active', 'completed']);
    if (!isPack(p.goal_days)) throw new HttpError(402, 'Uzman raporu paket gerektirir');
    const ev = await all(c.db, 'SELECT type,payload,at FROM events WHERE pact_id=? ORDER BY at', p.id);
    const pl = (e: any) => { try { return JSON.parse(e.payload); } catch { return {}; } };
    const checkins = ev.filter((e: any) => e.type === 'checkin');
    const urges = checkins.map((e: any) => pl(e).urge).filter((u: any) => typeof u === 'number');
    res.json({
      habitLabel: p.habit_label, goalDays: p.goal_days, startedAt: p.started_at, day: p.started_at ? Math.min(p.goal_days, Math.floor((c.now() - p.started_at) / DAY) + 1) : 0,
      checkins: checkins.length, avgUrge: urges.length ? Math.round((urges.reduce((a: number, b: number) => a + b, 0) / urges.length) * 10) / 10 : null,
      relapses: ev.filter((e: any) => e.type === 'relapse').map((e: any) => ({ at: e.at, self: !!pl(e).self })),
      crises: ev.filter((e: any) => e.type === 'crisis').length,
    });
  }));

  // Cihaz koruma sinyali: uygulama engelin açık olduğunu periyodik bildirir. Kapanırsa şahitlere haber gider.
  r.post('/pacts/current/heartbeat', user, h(async (req, res) => {
    const p = (await mine(res));
    const b = parse(z.object({ platform: z.enum(['ios', 'android', 'web']), shield: z.enum(['on', 'off', 'unknown']) }), req.body);
    const now = c.now(), d = (await one(c.db, 'SELECT * FROM devices WHERE pact_id=?', p.id));
    if (!d) (await run(c.db, 'INSERT INTO devices(pact_id,platform,shield,last_seen,shield_since) VALUES(?,?,?,?,?)', p.id, b.platform, b.shield, now, now));
    else (await run(c.db, 'UPDATE devices SET platform=?, shield=?, last_seen=?, shield_since=CASE WHEN shield!=? THEN ? ELSE shield_since END WHERE pact_id=?', b.platform, b.shield, now, b.shield, now, p.id));
    if (b.shield === 'off' && d?.shield !== 'off') {
      await logEvent(c, p.id, 'shield_off');
      const o = (await ownerOf(c, p.id));
      await notifyGuardians(c, p.id, () => T(o.locale).shieldOff(o.name, !!p.hide_habit), 'shield_off');
      await run(c.db, 'UPDATE devices SET alerted_at=? WHERE pact_id=?', now, p.id);
    } else if (b.shield === 'on' && d?.shield === 'off') (await logEvent(c, p.id, 'shield_on'));
    res.json({ ok: true });
  }));

  r.post('/pacts/current/crisis', user, h(async (_req, res) => {
    const p = (await mine(res, ['active', 'completed'])); // ücretsiz modda (pakt bitti) da güvenlik açık
    const o = (await ownerOf(c, p.id));
    await logEvent(c, p.id, 'crisis');
    const notified = (await acceptedGuardians(c, p.id)).length; // yalnızca daveti kabul etmiş şahitlere gider
    await notifyGuardians(c, p.id, () => T(o.locale).crisis(o.name), 'crisis');
    res.json({ ok: true, notified });
  }));

  r.post('/pacts/current/relapse', user, h(async (req, res) => {
    const p = (await mine(res));
    const b = parse(z.object({ self: z.boolean(), note: z.string().max(500).optional() }), req.body);
    await run(c.db, 'UPDATE pacts SET streak_started_at=? WHERE id=?', c.now(), p.id); // temiz seri sıfırlanır; paket süresi (started_at) değişmez
    await run(c.db, "UPDATE unlock_requests SET status='cancelled' WHERE pact_id=? AND status='pending'", p.id);
    await logEvent(c, p.id, 'relapse', { self: b.self });
    const o = (await ownerOf(c, p.id));
    await notifyGuardians(c, p.id, () => T(o.locale).relapse(o.name, b.self, !!p.hide_habit), 'relapse');
    res.json((await serializePact(c, (await one(c.db, 'SELECT * FROM pacts WHERE id=?', p.id)))));
  }));

  r.post('/pacts/current/unlock', user, h(async (_req, res) => {
    const p = (await mine(res));
    if ((await unlockState(c, p.id))) throw new HttpError(409, 'Zaten bekleyen bir çıkış talebi var');
    const id = uid();
    await run(c.db, 'INSERT INTO unlock_requests(id,pact_id,requested_at) VALUES(?,?,?)', id, p.id, c.now());
    await logEvent(c, p.id, 'unlock_requested');
    const o = (await ownerOf(c, p.id));
    await notifyGuardians(c, p.id, () => T(o.locale).unlockRequested(o.name, c.cfg.appUrl), 'unlock_requested');
    res.status(201).json((await serializePact(c, p)));
  }));

  r.post('/pacts/current/unlock/cancel', user, h(async (_req, res) => {
    const p = (await mine(res));
    await run(c.db, "UPDATE unlock_requests SET status='cancelled' WHERE pact_id=? AND status='pending'", p.id);
    await logEvent(c, p.id, 'unlock_cancelled');
    res.json((await serializePact(c, p)));
  }));

  // Erken çıkış: iki şahit onayı + 72 saat. Pakt kapanır (tamamlama ödülü kazanılmaz).
  r.post('/pacts/current/unlock/complete', user, h(async (_req, res) => {
    const p = (await mine(res));
    const u = (await unlockState(c, p.id));
    if (!u) throw new HttpError(409, 'Çıkış talebi yok');
    if (!u.approved) throw new HttpError(403, `Yeterli onay yok (${u.approvals.length}/${u.need})`);
    if (!u.ready) throw new HttpError(403, 'Bekleme süresi dolmadı');
    await run(c.db, "UPDATE unlock_requests SET status='completed' WHERE id=?", u.id);
    await run(c.db, "UPDATE pacts SET status='closed' WHERE id=?", p.id);
    await logEvent(c, p.id, 'closed_early');
    const o = (await ownerOf(c, p.id));
    await notifyGuardians(c, p.id, () => T(o.locale).closed(o.name), 'closed');
    res.json((await serializePact(c, (await one(c.db, 'SELECT * FROM pacts WHERE id=?', p.id)))));
  }));

  // ───────────── Şahit daveti (herkese açık, kişiye özel token) ─────────────
  const byInvite = async (token: string) => {
    const g = (await one(c.db, 'SELECT * FROM guardians WHERE invite_hash=?', sha256(normCode(token))));
    if (!g || g.status === 'removed') throw new HttpError(404, 'Davet bulunamadı veya iptal edildi');
    return g;
  };
  r.get('/public/invites/:token', rateLimit(30, 60_000), h(async (req, res) => {
    const g = (await byInvite(String(req.params.token)));
    const p = (await one(c.db, 'SELECT * FROM pacts WHERE id=?', g.pact_id))!;
    const o = (await ownerOf(c, p.id));
    res.json({ guardianName: g.name, status: g.status, owner: o.name || (reqLocale(req) === 'en' ? 'Someone close to you' : 'Bir yakının'), habitLabel: p.hide_habit ? null : p.habit_label, hideHabit: !!p.hide_habit, goalDays: p.goal_days, pactStatus: p.status });
  }));
  r.post('/public/invites/:token/accept', rateLimit(15, 60_000), h(async (req, res) => {
    const g = (await byInvite(String(req.params.token)));
    if (g.status === 'declined') throw new HttpError(409, 'Bu daveti daha önce reddettin');
    if (g.status === 'invited') {
      await run(c.db, "UPDATE guardians SET status='accepted', accepted_at=? WHERE id=?", c.now(), g.id);
      await logEvent(c, g.pact_id, 'guardian_accepted', { guardian: g.id });
      const o = (await ownerOf(c, g.pact_id));
      await c.mail({ to: o.email, kind: 'invite_status', ...T(o.locale).inviteStatus(g.name, true) });
    }
    res.json({ token: signToken(c.cfg, 'guardian', g.id, '60d') });
  }));
  r.post('/public/invites/:token/decline', rateLimit(15, 60_000), h(async (req, res) => {
    const g = (await byInvite(String(req.params.token)));
    if (g.status === 'accepted') throw new HttpError(409, 'Kabul ettikten sonra şahitlikten ayrılmak için kişiyle konuş');
    await run(c.db, "UPDATE guardians SET status='declined' WHERE id=?", g.id);
    await logEvent(c, g.pact_id, 'guardian_declined', { guardian: g.id });
    const o = (await ownerOf(c, g.pact_id));
    await c.mail({ to: o.email, kind: 'invite_status', ...T(o.locale).inviteStatus(g.name, false) });
    res.json({ ok: true });
  }));

  // ───────────── Şahit portalı ─────────────
  const gctx = async (res: express.Response) => {
    const g = (await one(c.db, "SELECT * FROM guardians WHERE id=? AND status='accepted'", authOf(res).id));
    if (!g) throw new HttpError(403, 'Şahitlik geçerli değil');
    const p = (await one(c.db, 'SELECT * FROM pacts WHERE id=?', g.pact_id))!;
    return { g, p, o: (await ownerOf(c, p.id)) };
  };
  r.get('/guardian/me', guardian, h(async (_req, res) => {
    const { g, p, o } = (await gctx(res));
    const last = async (t: string) => (await one(c.db, 'SELECT at FROM events WHERE pact_id=? AND type=? ORDER BY at DESC LIMIT 1', p.id, t))?.at ?? null;
    const u = (await unlockState(c, p.id));
    res.json({
      guardian: { id: g.id, name: g.name },
      owner: o.name || 'Şahidi olduğun kişi',
      pact: { status: p.status, habitLabel: p.hide_habit ? null : p.habit_label, hideHabit: !!p.hide_habit, goalDays: p.goal_days, day: p.started_at ? Math.min(p.goal_days, Math.floor((c.now() - p.started_at) / DAY) + 1) : 0 },
      lastCheckIn: await last('checkin'), lastRelapse: await last('relapse'), lastCrisis: await last('crisis'),
      streakDays: Math.floor((c.now() - (p.streak_started_at ?? p.started_at)) / DAY) + 1,
      shield: (await one(c.db, 'SELECT shield, last_seen AS "lastSeen" FROM devices WHERE pact_id=?', p.id)) ?? null,
      unlock: u && { requestedAt: u.requestedAt, readyAt: u.readyAt, approvals: u.approvals.length, need: u.need, iApproved: u.approvals.includes(g.id) },
    });
  }));
  r.post('/guardian/unlock/approve', guardian, h(async (_req, res) => {
    const { g, p, o } = (await gctx(res));
    const u = (await unlockState(c, p.id));
    if (!u) throw new HttpError(409, 'Bekleyen çıkış talebi yok');
    await run(c.db, 'INSERT INTO unlock_approvals(request_id,guardian_id,at) VALUES(?,?,?) ON CONFLICT DO NOTHING', u.id, g.id, c.now());
    await logEvent(c, p.id, 'unlock_approved', { guardian: g.id });
    const n = (await unlockState(c, p.id))!.approvals.length;
    await c.mail({ to: o.email, kind: 'unlock_progress', ...T(o.locale).unlockProgress(g.name, n) });
    res.json({ ok: true, approvals: n });
  }));
  r.post('/guardian/unlock/withdraw', guardian, h(async (_req, res) => {
    const { g, p } = (await gctx(res));
    const u = (await unlockState(c, p.id));
    if (u) (await run(c.db, 'DELETE FROM unlock_approvals WHERE request_id=? AND guardian_id=?', u.id, g.id));
    res.json({ ok: true });
  }));
  r.post('/guardian/support', guardian, rateLimit(10, 60_000), h(async (req, res) => {
    const { g, p, o } = (await gctx(res));
    const b = parse(z.object({ text: z.string().trim().min(1).max(280) }), req.body);
    await logEvent(c, p.id, 'support_message', { guardian: g.id });
    await c.mail({ to: o.email, kind: 'support', ...T(o.locale).support(g.name, b.text) });
    res.json({ ok: true });
  }));

  // ───────────── Admin paneli ─────────────
  // Not: admin videoya ve kullanıcı yazılarına erişmez; yalnızca operasyonel veriyi görür.
  r.post('/admin/login', rateLimit(8, 60_000), h(async (req, res) => {
    const b = parse(z.object({ email, password: z.string().min(1).max(200) }), req.body);
    const a = (await one(c.db, 'SELECT * FROM admins WHERE email=?', b.email));
    if (!a || !verifyPassword(b.password, a.pass_hash)) throw new HttpError(401, 'E-posta veya şifre hatalı');
    res.json({ token: signToken(c.cfg, 'admin', a.id, '12h'), admin: { email: a.email } });
  }));
  const audit = async (res: express.Response, action: string, target?: string) =>
    run(c.db, 'INSERT INTO audit(id,admin_id,action,target,at) VALUES(?,?,?,?,?)', uid(), authOf(res).id, action, target ?? null, c.now());

  r.get('/admin/stats', admin, h(async (_req, res) => {
    const n = async (sql: string, ...p: any[]) => (await one(c.db, sql, ...p))?.n ?? 0;
    const week = c.now() - 7 * DAY;
    res.json({
      users: await n('SELECT COUNT(*) n FROM users'),
      pacts: { pending: await n("SELECT COUNT(*) n FROM pacts WHERE status='pending'"), active: await n("SELECT COUNT(*) n FROM pacts WHERE status='active'"), completed: await n("SELECT COUNT(*) n FROM pacts WHERE status='completed'"), closed: await n("SELECT COUNT(*) n FROM pacts WHERE status='closed'") },
      guardians: { invited: await n("SELECT COUNT(*) n FROM guardians WHERE status='invited'"), accepted: await n("SELECT COUNT(*) n FROM guardians WHERE status='accepted'"), declined: await n("SELECT COUNT(*) n FROM guardians WHERE status='declined'") },
      relapses7d: await n("SELECT COUNT(*) n FROM events WHERE type='relapse' AND at>=?", week),
      crises7d: await n("SELECT COUNT(*) n FROM events WHERE type='crisis' AND at>=?", week),
      pendingUnlocks: await n("SELECT COUNT(*) n FROM unlock_requests WHERE status='pending'"),
      shieldOff: await n("SELECT COUNT(*) n FROM devices d JOIN pacts p ON p.id=d.pact_id WHERE p.status='active' AND d.shield='off'"),
      mailFailed: await n("SELECT COUNT(*) n FROM outbox WHERE status='failed'"),
    });
  }));
  r.get('/admin/pacts', admin, h(async (req, res) => {
    const st = typeof req.query.status === 'string' ? req.query.status : null;
    res.json((await all(c.db, `SELECT p.id,p.status,p.habit_label AS "habitLabel",p.goal_days AS "goalDays",p.started_at AS "startedAt",p.created_at AS "createdAt",
      u.email AS "ownerEmail", u.name AS "ownerName",
      (SELECT COUNT(*) FROM guardians g WHERE g.pact_id=p.id AND g.status='accepted') accepted,
      (SELECT COUNT(*) FROM guardians g WHERE g.pact_id=p.id AND g.status='invited') invited
      FROM pacts p JOIN users u ON u.id=p.user_id ${st ? 'WHERE p.status=?' : ''} ORDER BY p.created_at DESC LIMIT 200`, ...(st ? [st] : []))));
  }));
  r.get('/admin/pacts/:id', admin, h(async (req, res) => {
    const p = (await one(c.db, 'SELECT * FROM pacts WHERE id=?', req.params.id));
    if (!p) throw new HttpError(404, 'Pakt yok');
    await audit(res, 'view_pact', p.id);
    const o = (await ownerOf(c, p.id));
    res.json({
      pact: (await serializePact(c, p)), owner: { email: o.email, name: o.name },
      events: (await all(c.db, 'SELECT type,payload,at FROM events WHERE pact_id=? ORDER BY at DESC LIMIT 200', p.id)).map((e: any) => ({ ...e, payload: JSON.parse(e.payload) })),
    });
  }));
  r.get('/admin/guardians', admin, h(async (_req, res) => {
    res.json((await all(c.db, `SELECT g.id,g.name,g.email,g.status,g.invited_at AS "invitedAt",g.accepted_at AS "acceptedAt",g.pact_id AS "pactId",u.email AS "ownerEmail",u.name AS "ownerName"
      FROM guardians g JOIN pacts p ON p.id=g.pact_id JOIN users u ON u.id=p.user_id ORDER BY g.invited_at DESC LIMIT 300`)));
  }));
  r.post('/admin/guardians/:id/resend', admin, h(async (req, res) => {
    const g = (await one(c.db, "SELECT * FROM guardians WHERE id=? AND status IN ('invited','accepted')", req.params.id));
    if (!g) throw new HttpError(404, 'Şahit yok');
    const p = (await one(c.db, 'SELECT * FROM pacts WHERE id=?', g.pact_id))!;
    const token = inviteCode();
    await run(c.db, 'UPDATE guardians SET invite_hash=? WHERE id=?', sha256(normCode(token)), g.id);
    await sendInvite(c, p, g, token);
    await audit(res, 'resend_invite', g.id);
    res.json({ ok: true });
  }));
  r.get('/admin/users', admin, h(async (_req, res) => {
    res.json((await all(c.db, `SELECT u.id,u.email,u.name,u.created_at AS "createdAt",(SELECT COUNT(*) FROM pacts p WHERE p.user_id=u.id) pacts FROM users u ORDER BY u.created_at DESC LIMIT 300`)));
  }));
  r.get('/admin/outbox', admin, h(async (_req, res) => {
    // Gövdede giriş kodu olabilir; yalnızca dev'de (SMTP yok) gösterilir
    const rows = (await all(c.db, 'SELECT id,to_addr AS "toAddr",subject,body,kind,status,error,created_at AS "createdAt" FROM outbox ORDER BY created_at DESC LIMIT 200'));
    res.json(rows.map((m: any) => (m.kind === 'login_code' && c.cfg.prod ? { ...m, body: '[gizli]' } : m)));
  }));
  r.get('/admin/audit', admin, h(async (_req, res) => {
    res.json((await all(c.db, 'SELECT a.action,a.target,a.at,d.email AS "adminEmail" FROM audit a JOIN admins d ON d.id=a.admin_id ORDER BY a.at DESC LIMIT 200')));
  }));

  return r;
}

export async function seedAdmin(c: Ctx) {
  if ((await one(c.db, 'SELECT 1 x FROM admins WHERE email=?', c.cfg.adminEmail))) return;
  const pw = c.cfg.adminPassword ?? randomToken(9);
  await run(c.db, 'INSERT INTO admins(id,email,pass_hash) VALUES(?,?,?)', uid(), c.cfg.adminEmail, hashPassword(pw));
  if (!c.cfg.adminPassword) console.log(`\n[admin] ilk admin oluşturuldu → ${c.cfg.adminEmail} / ${pw}  (bir kez gösterilir; ADMIN_PASSWORD ile sabitleyebilirsin)\n`);
}
