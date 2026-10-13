import type { Config } from './config.js';
import { all, one, run, type Db } from './db.js';
import type { Mailer } from './mail.js';
import { T } from './mail.js';
import { HttpError, uid } from './security.js';
import type { PlayClient } from './play.js';
import { sha256 } from './security.js';

export type Ctx = { db: Db; cfg: Config; now: () => number; mail: Mailer; play: PlayClient | null };
export const DAY = 86400000;

export const logEvent = async (c: Ctx, pactId: string, type: string, payload: object = {}) =>
  run(c.db, 'INSERT INTO events(id,pact_id,type,payload,at) VALUES(?,?,?,?,?)', uid(), pactId, type, JSON.stringify(payload), c.now());

export const ownerOf = async (c: Ctx, pactId: string) => {
  const o = await one<{ id: string; email: string; name: string; locale: string }>(c.db, 'SELECT u.id,u.email,u.name,u.locale FROM users u JOIN pacts p ON p.user_id=u.id WHERE p.id=?', pactId);
  if (!o) throw new Error('Pakt sahibi bulunamadı');
  return o;
};

export const acceptedGuardians = async (c: Ctx, pactId: string) =>
  all(c.db, "SELECT * FROM guardians WHERE pact_id=? AND status='accepted'", pactId);

export async function notifyGuardians(c: Ctx, pactId: string, build: (g: any) => { subject: string; body: string }, kind: string) {
  for (const g of await acceptedGuardians(c, pactId)) await c.mail({ to: g.email, kind, ...build(g) });
}

/** Süre dolduysa tamamlandı say (tembel değerlendirme). */
export async function refreshCompletion(c: Ctx, pact: any) {
  if (pact?.status === 'active' && c.now() - pact.started_at >= pact.goal_days * DAY) {
    await run(c.db, "UPDATE pacts SET status='completed' WHERE id=?", pact.id);
    await logEvent(c, pact.id, 'completed');
    const o = await ownerOf(c, pact.id);
    // Dürüst özet: arada tekrar oynadıysa "hiç bozmadan" denmez, son temiz gün sayısı söylenir
    const end = pact.started_at + pact.goal_days * DAY;
    const relapsed = !!(await one(c.db, "SELECT 1 FROM events WHERE pact_id=? AND type='relapse' LIMIT 1", pact.id));
    const cleanDays = relapsed ? Math.max(0, Math.floor((end - (pact.streak_started_at ?? pact.started_at)) / DAY)) : null;
    await notifyGuardians(c, pact.id, () => T(o.locale).completed(o.name, pact.goal_days, cleanDays, !!pact.hide_habit), 'completed');
    await c.mail({ to: o.email, kind: 'pack_completed', ...T(o.locale).packCompleted(o.name, pact.goal_days, cleanDays, isPack(pact.goal_days) ? c.cfg.completionDiscountPct : 0) });
    return { ...pact, status: 'completed' };
  }
  return pact;
}

export const currentPact = async (c: Ctx, userId: string) => {
  const p = await one(c.db, "SELECT * FROM pacts WHERE user_id=? AND status IN ('pending','active','completed') ORDER BY created_at DESC LIMIT 1", userId);
  return p ? refreshCompletion(c, p) : undefined;
};

export async function unlockState(c: Ctx, pactId: string) {
  const r = await one(c.db, "SELECT * FROM unlock_requests WHERE pact_id=? AND status='pending' ORDER BY requested_at DESC LIMIT 1", pactId);
  if (!r) return null;
  const approvals = (await all(c.db, 'SELECT guardian_id FROM unlock_approvals WHERE request_id=?', r.id)).map((a: any) => a.guardian_id);
  // Pakt hemen başlar; anahtarlar şahitler kabul ettikçe devreye girer: gereken onay = min(2, kabul eden şahit sayısı).
  // Kabul eden şahit yoksa anahtar yerine zaman kilidi: 72 saat değil 7 gün (kullanıcı kilitli kalmaz, ama dürtüyle de çıkamaz).
  const need = Math.min(c.cfg.requiredKeys, (await acceptedGuardians(c, pactId)).length);
  const solo = need === 0;
  const readyAt = r.requested_at + (solo ? c.cfg.soloUnlockWaitMs : c.cfg.unlockWaitMs);
  return { id: r.id, requestedAt: r.requested_at, approvals, need, solo, readyAt, approved: approvals.length >= need, ready: approvals.length >= need && c.now() >= readyAt };
}

export const publicGuardian = (g: any) => ({ id: g.id, name: g.name, email: g.email, phone: g.phone, status: g.status, invitedAt: g.invited_at, acceptedAt: g.accepted_at });

export async function serializePact(c: Ctx, p: any) {
  const gs = await all(c.db, "SELECT * FROM guardians WHERE pact_id=? AND status!='removed' ORDER BY invited_at", p.id);
  const last = async (type: string) => (await one(c.db, 'SELECT at FROM events WHERE pact_id=? AND type=? ORDER BY at DESC LIMIT 1', p.id, type))?.at ?? null;
  return {
    id: p.id, status: p.status, habitLabel: p.habit_label, hideHabit: !!p.hide_habit, weeklyDigest: !!p.weekly_digest, goalDays: p.goal_days, plan: isPack(p.goal_days) ? 'pack' : 'trial',
    // Paket süresi başlangıçtan sabit; tekrar oynama yalnızca temiz seriyi sıfırlar
    startedAt: p.started_at, streakStartedAt: p.streak_started_at ?? p.started_at, createdAt: p.created_at,
    relapses: (await all(c.db, "SELECT at FROM events WHERE pact_id=? AND type='relapse' ORDER BY at", p.id)).map((e: any) => Number(e.at)),
    day: p.started_at ? Math.min(p.goal_days, Math.floor((c.now() - p.started_at) / DAY) + 1) : 0,
    guardians: gs.map(publicGuardian),
    lastCheckIn: await last('checkin'), lastRelapse: await last('relapse'),
    unlock: await unlockState(c, p.id),
  };
}

/** Sinyali 24 saatten uzun kesilen aktif paktlar için şahitlere bir kez haber verir. Periyodik çalıştırılır. */
export async function checkMissedHeartbeats(c: Ctx) {
  const limit = c.now() - DAY;
  const rows = await all(c.db, `SELECT d.pact_id id FROM devices d JOIN pacts p ON p.id=d.pact_id
    WHERE p.status='active' AND d.last_seen < ? AND (d.alerted_at IS NULL OR d.alerted_at < d.last_seen)`, limit);
  for (const r of rows) {
    await logEvent(c, r.id, 'heartbeat_missed');
    const o = await ownerOf(c, r.id);
    await notifyGuardians(c, r.id, () => T(o.locale).heartbeatMissed(o.name), 'heartbeat_missed');
    await run(c.db, 'UPDATE devices SET alerted_at=? WHERE pact_id=?', c.now(), r.id);
  }
  return rows.length;
}

export const TRIAL_DAYS = 7;
export const isPack = (goalDays: number) => goalDays > TRIAL_DAYS;

/**
 * Paket satın alması tüketir (bir pakt/uzatma için bir hak). Kullanılmamış hak yoksa:
 *  - demo modda (üretim dışı): otomatik "demo" hak açılır,
 *  - aksi halde 402 (satın alma gerekli).
 */
export async function consumePack(c: Ctx, userId: string, goalDays: number, pactId: string) {
  const product = `pack_${goalDays}`;
  let row = await one(c.db, 'SELECT id FROM purchases WHERE user_id=? AND product=? AND used_pact_id IS NULL ORDER BY created_at LIMIT 1', userId, product);
  if (!row) {
    if (!c.cfg.demoPurchases) throw new HttpError(402, 'Bu paket için satın alma gerekli');
    const id = uid();
    await run(c.db, 'INSERT INTO purchases(id,user_id,product,source,created_at) VALUES(?,?,?,?,?)', id, userId, product, 'demo', c.now());
    row = { id };
  }
  await run(c.db, 'UPDATE purchases SET used_pact_id=? WHERE id=?', pactId, row.id);
}

export const trialUsed = async (c: Ctx, userId: string) => !!(await one(c.db, 'SELECT 1 x FROM pacts WHERE user_id=? AND trial=TRUE LIMIT 1', userId));

/** Satın almayı kullanıcıya bağlayan, kişisel veri içermeyen kimlik. İstemci bunu satın alma sırasında "obfuscatedAccountId" olarak verir. */
export const billingRef = (userId: string) => sha256('lockin-billing:' + userId).slice(0, 40);

/** Google'da tüketilemeyen (ağ hatası vb.) satın almaları yeniden dener; tüketilmeden aynı ürün yeniden alınamaz. */
export async function retryPlayConsume(c: Ctx) {
  if (!c.play) return 0;
  const rows = await all(c.db, "SELECT id, product, play_token FROM purchases WHERE source='play' AND play_consumed=FALSE AND play_token IS NOT NULL LIMIT 50");
  let n = 0;
  for (const r of rows) {
    try { await c.play.consume(r.product, r.play_token); await run(c.db, 'UPDATE purchases SET play_consumed=TRUE WHERE id=?', r.id); n++; } catch { /* sonraki turda tekrar */ }
  }
  return n;
}

/** Sonraki pakette indirim hakkı: tamamlanan her paket (arada tekrar oynamış olsa bile) bir hak verir; kullanılan haklar düşülür. */
export async function nextPackDiscount(c: Ctx, userId: string) {
  const done = Number((await one(c.db, "SELECT COUNT(*) n FROM pacts WHERE user_id=? AND status='completed' AND goal_days>?", userId, TRIAL_DAYS))?.n ?? 0);
  const used = Number((await one(c.db, 'SELECT discounts_used n FROM users WHERE id=?', userId))?.n ?? 0);
  return done > used ? c.cfg.completionDiscountPct : 0;
}

/**
 * Haftalık iyi haber (kullanıcı açtıysa): son 7 günde kaç gün günlük kontrol yapıldığını şahitlere bildirir.
 * Yalnızca bildiğimizi söyler: kontrol sayısı ve o hafta tekrar oynama bildirilmediği. Haftada tek. Periyodik çalıştırılır.
 */
/** Saklama süresi: gönderilen e-postaların kaydı 90 gün tutulur (destek/denetim), süresi geçen giriş kodları silinir. Gizlilik politikasında yazan budur. */
export const OUTBOX_RETENTION_MS = 90 * DAY;
export async function purgeOld(c: Ctx) {
  await run(c.db, 'DELETE FROM outbox WHERE created_at < ?', c.now() - OUTBOX_RETENTION_MS);
  await run(c.db, 'DELETE FROM login_codes WHERE expires_at < ?', c.now());
}

export async function sendWeeklyDigests(c: Ctx) {
  const week = 7 * DAY, now = c.now();
  const rows = await all(c.db, "SELECT * FROM pacts WHERE status='active' AND weekly_digest=TRUE AND started_at <= ? AND (digest_at IS NULL OR digest_at <= ?)", now - week, now - week);
  let sent = 0;
  for (const p of rows) {
    await run(c.db, 'UPDATE pacts SET digest_at=? WHERE id=?', now, p.id);
    if ((await one(c.db, "SELECT 1 FROM events WHERE pact_id=? AND type='relapse' AND at>? LIMIT 1", p.id, now - week))) continue; // kötü haftada "iyi haber" yok
    const days = new Set((await all(c.db, "SELECT payload, at FROM events WHERE pact_id=? AND type='checkin' AND at>?", p.id, now - week))
      .map((e: any) => { try { return JSON.parse(e.payload).day; } catch { return undefined; } } ) .map((d: any, i: number) => d ?? String(i))).size;
    if (!days) continue;
    const o = await ownerOf(c, p.id);
    await notifyGuardians(c, p.id, () => T(o.locale).weekly(o.name, Math.min(7, days), !!p.hide_habit), 'weekly');
    sent++;
  }
  return sent;
}
