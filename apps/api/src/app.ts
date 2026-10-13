import express from 'express';
import cors from 'cors';
import { config as defaultConfig, type Config } from './config.js';
import { migrate, openDb } from './db.js';
import { createMailer } from './mail.js';
import { HttpError } from './security.js';
import { reqLocale, translateError } from './i18n.js';
import { buildRouter, seedAdmin } from './routes.js';
import { createPlayClient, type PlayClient } from './play.js';
import type { Ctx } from './service.js';

export async function createApp(opts: { cfg?: Partial<Config>; now?: () => number; memory?: boolean; play?: PlayClient | null } = {}) {
  const cfg = { ...defaultConfig, ...opts.cfg } as Config;
  // Test: bellek içi gömülü Postgres. Dev: ./data/pglite. Üretim/Supabase: DATABASE_URL
  const db = await openDb(opts.memory ? {} : { url: cfg.databaseUrl, dataDir: cfg.databaseUrl ? undefined : cfg.pgliteDir });
  if (process.env.AUTO_MIGRATE !== 'false') await migrate(db);
  const ctx: Ctx = { db, cfg, now: opts.now ?? Date.now, mail: async () => {}, play: opts.play !== undefined ? opts.play : createPlayClient(cfg) };
  ctx.mail = createMailer(db, cfg);
  await seedAdmin(ctx);

  const app = express();
  app.disable('x-powered-by');
  if (cfg.trustProxy) app.set('trust proxy', cfg.trustProxy);
  if (!cfg.prod) app.use((req, res, next) => { res.on('finish', () => console.log(`[${req.method}] ${req.path} → ${res.statusCode}`)); next(); });
  // Geliştirmede her origin'e izin ver (Expo web portu değişebiliyor); üretimde yalnızca CORS_ORIGINS listesi
  app.use(cors({ origin: cfg.prod ? cfg.corsOrigins : true }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (_req, res) => res.json({ ok: true, db: db.kind, play: !!ctx.play, demo: cfg.demoPurchases, billing: cfg.demoPurchases || !!ctx.play }));
  app.use(buildRouter(ctx));
  app.use((req, res) => res.status(404).json({ error: translateError('Bulunamadı', reqLocale(req)) }));
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const l = reqLocale(req);
    if (err instanceof HttpError) return res.status(err.status).json({ error: translateError(err.message, l) });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: translateError('Dosya çok büyük', l) });
    console.error(err);
    res.status(500).json({ error: translateError('Sunucu hatası', l) });
  });
  return { app, ctx };
}
