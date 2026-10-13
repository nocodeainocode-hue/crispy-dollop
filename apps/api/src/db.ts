import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

/**
 * Tek arayüz, iki motor:
 *  - DATABASE_URL varsa gerçek Postgres (Supabase) → `pg` havuzu
 *  - yoksa gömülü Postgres (PGlite): geliştirme (./data/pglite) ve testler (bellek)
 */
export type Db = {
  kind: 'pg' | 'pglite';
  q: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
  exec: (sql: string) => Promise<void>;
  close: () => Promise<void>;
};

// `?` yer tutucularını Postgres'in $1, $2… biçimine çevirir (SQL'de başka `?` kullanılmaz)
const toPg = (sql: string) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };
const int8 = (v: string) => parseInt(v, 10); // zaman damgaları BIGINT (ms); sayı olarak dön

/**
 * Adresi parçalara ayırır; şifrede `^ ! $ & +` gibi simgeler olsa da bozulmaz (URL çözümleme yok).
 * Şifre %XX içeriyorsa URL-kodlanmış sayılıp çözülür; aksi halde olduğu gibi kullanılır.
 */
export function parsePgUrl(url: string) {
  const m = /^postgres(?:ql)?:\/\/([^:]+):(.*)@([^@/]+?)(?::(\d+))?\/([^?\s]+)/i.exec(url.trim());
  if (!m) throw new Error('DATABASE_URL biçimi geçersiz. Beklenen: postgresql://KULLANICI:ŞİFRE@SUNUCU:5432/postgres');
  const [, user, rawPw, host, port, database] = m;
  let password = rawPw;
  if (/%[0-9A-Fa-f]{2}/.test(rawPw)) { try { password = decodeURIComponent(rawPw); } catch { /* olduğu gibi */ } }
  return { user: decodeURIComponent(user), password, host, port: port ? Number(port) : 5432, database };
}

export async function openDb(opts: { url?: string; dataDir?: string }): Promise<Db> {
  if (opts.url) {
    if (!/^postgres(ql)?:\/\//i.test(opts.url.trim())) {
      throw new Error('DATABASE_URL "postgresql://" ile başlamalı. Supabase proje adresi (https://….supabase.co) değil, panelde Connect → Session pooler bölümündeki bağlantı adresi gerekiyor.');
    }
    pg.types.setTypeParser(20, int8);
    // Supabase bağlantıları TLS ister. Havuz (pooler) sertifika zincirini doğrulamayı zorlaştırabildiği için
    // doğrulama kapalı; daha sıkı olması için DATABASE_CA ile Supabase CA sertifikası verilebilir.
    const ssl = process.env.DATABASE_CA ? { ca: process.env.DATABASE_CA } : { rejectUnauthorized: false };
    const pool = new pg.Pool({ ...parsePgUrl(opts.url), ssl, max: 10 });
    return {
      kind: 'pg',
      q: async (sql, params = []) => { const r = await pool.query(toPg(sql), params as any[]); return { rows: r.rows }; },
      exec: async sql => { await pool.query(sql); },
      close: () => pool.end(),
    };
  }
  if (opts.dataDir) fs.mkdirSync(path.dirname(opts.dataDir), { recursive: true }); // PGlite üst klasörü kendisi oluşturmaz
  const lite = new PGlite(opts.dataDir, { parsers: { 20: int8 } });
  await lite.waitReady;
  return {
    kind: 'pglite',
    q: async (sql, params = []) => { const r = await lite.query(toPg(sql), params as any[]); return { rows: r.rows as any[] }; },
    exec: async sql => { await lite.exec(sql); },
    close: () => lite.close(),
  };
}

export const one = async <T = any>(db: Db, sql: string, ...p: unknown[]): Promise<T | undefined> => (await db.q(sql, p)).rows[0] as T | undefined;
export const all = async <T = any>(db: Db, sql: string, ...p: unknown[]): Promise<T[]> => (await db.q(sql, p)).rows as T[];
export const run = async (db: Db, sql: string, ...p: unknown[]): Promise<void> => { await db.q(sql, p); };

const TABLES = ['purchases', 'users', 'login_codes', 'pacts', 'guardians', 'unlock_requests', 'unlock_approvals', 'events', 'outbox', 'devices', 'admins', 'audit'];

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '', created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_codes (
  email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at BIGINT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, name TEXT
);
CREATE TABLE IF NOT EXISTS pacts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_label TEXT NOT NULL, goal_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | completed | closed
  started_at BIGINT, created_at BIGINT NOT NULL,
  vow_key TEXT, vow_seconds INTEGER, vow_mime TEXT, vow_at BIGINT
);
CREATE TABLE IF NOT EXISTS guardians (
  id TEXT PRIMARY KEY, pact_id TEXT NOT NULL REFERENCES pacts(id) ON DELETE CASCADE,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  status TEXT NOT NULL DEFAULT 'invited', -- invited | accepted | declined | removed
  invite_hash TEXT NOT NULL, invited_at BIGINT NOT NULL, accepted_at BIGINT
);
CREATE INDEX IF NOT EXISTS guardians_pact ON guardians(pact_id);
CREATE INDEX IF NOT EXISTS guardians_invite ON guardians(invite_hash);
CREATE TABLE IF NOT EXISTS unlock_requests (
  id TEXT PRIMARY KEY, pact_id TEXT NOT NULL REFERENCES pacts(id) ON DELETE CASCADE,
  requested_at BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' -- pending | cancelled | completed
);
CREATE TABLE IF NOT EXISTS unlock_approvals (
  request_id TEXT NOT NULL REFERENCES unlock_requests(id) ON DELETE CASCADE,
  guardian_id TEXT NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  at BIGINT NOT NULL, PRIMARY KEY (request_id, guardian_id)
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, pact_id TEXT NOT NULL REFERENCES pacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}', at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_pact ON events(pact_id, at);
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY, to_addr TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
  kind TEXT NOT NULL, status TEXT NOT NULL, error TEXT, created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
  pact_id TEXT PRIMARY KEY REFERENCES pacts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, shield TEXT NOT NULL, last_seen BIGINT NOT NULL,
  shield_since BIGINT NOT NULL, alerted_at BIGINT
);
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product TEXT NOT NULL, -- pack_30 | pack_60 | pack_90 | pack_180
  source TEXT NOT NULL, -- demo | play
  created_at BIGINT NOT NULL, used_pact_id TEXT
);
ALTER TABLE pacts ADD COLUMN IF NOT EXISTS trial BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'tr';
ALTER TABLE pacts ADD COLUMN IF NOT EXISTS hide_habit BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pacts ADD COLUMN IF NOT EXISTS streak_started_at BIGINT;
UPDATE pacts SET streak_started_at=started_at WHERE streak_started_at IS NULL;
ALTER TABLE pacts ADD COLUMN IF NOT EXISTS weekly_digest BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pacts ADD COLUMN IF NOT EXISTS digest_at BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discounts_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS play_token TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS play_order_id TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS play_consumed BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_play_token ON purchases(play_token);
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY, admin_id TEXT NOT NULL, action TEXT NOT NULL, target TEXT, at BIGINT NOT NULL
);

-- GÜVENLİK: Supabase tabloları, anon/authenticated anahtarlarıyla otomatik REST API'den açılabilir.
-- Satır güvenliğini (RLS) açıp politika tanımlamıyoruz: bu rollerle hiçbir veriye erişilemez.
-- Veriye yalnızca sunucumuz, doğrudan Postgres bağlantısıyla (RLS'i aşan rol) erişir.
${TABLES.map(t => `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`).join('\n')}
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
  END IF;
END $$;
`;

export async function migrate(db: Db) {
  await db.exec(SCHEMA);
  // Geçiş: pakt artık vasi beklemeden başlar. Eski kuraldan kalan 'pending' paktları başlat (idempotent).
  await db.exec("UPDATE pacts SET trial=TRUE WHERE goal_days=7 AND trial=FALSE"); // ücretsiz deneme hakkı tek seferlik
  await db.exec("UPDATE pacts SET status='active', started_at=(extract(epoch from now())*1000)::bigint WHERE status='pending'");
}
