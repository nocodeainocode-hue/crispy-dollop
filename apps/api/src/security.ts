import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Config } from './config.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const uid = () => crypto.randomUUID();

export function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [salt, h] = stored.split(':');
  if (!salt || !h) return false;
  const a = crypto.scryptSync(pw, salt, 64), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type Role = 'user' | 'guardian' | 'admin';
export type Auth = { role: Role; id: string };

export const signToken = (cfg: Config, role: Role, id: string, ttl: string) =>
  jwt.sign({ role, id }, cfg.jwtSecret, { expiresIn: ttl } as jwt.SignOptions);

export const requireRole = (cfg: Config, role: Role): RequestHandler => (req, res, next) => {
  const h = req.headers.authorization;
  const t = h?.startsWith('Bearer ') ? h.slice(7) : undefined; // token URL'de taşınmaz (log sızıntısı)
  if (!t) return next(new HttpError(401, 'Giriş gerekli'));
  try {
    const p = jwt.verify(t, cfg.jwtSecret) as Auth;
    if (p.role !== role) throw new Error('rol');
    res.locals.auth = p;
    next();
  } catch { next(new HttpError(401, 'Oturum geçersiz')); }
};
export const authOf = (res: Response) => res.locals.auth as Auth;

/** async route sarmalayıcı */
export const h = (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };

/** Basit bellek içi hız sınırlayıcı (tek süreç; çoklu örnekte Redis'e taşınmalı) */
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const hits = new Map<string, number[]>();
  return (req, _res, next) => {
    const k = `${req.ip}:${req.path}`, now = Date.now();
    const arr = (hits.get(k) ?? []).filter(t => now - t < windowMs);
    if (arr.length >= max) return next(new HttpError(429, 'Çok fazla deneme. Biraz bekle.'));
    arr.push(now); hits.set(k, arr); next();
  };
}

// Davet kodu: karışmayan 10 karakter (Crockford benzeri), XXXXX-XXXXX biçiminde gösterilir. Yalnızca hash'i saklanır.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const inviteCode = () => { const b = crypto.randomBytes(10); return Array.from(b, x => ALPHABET[x % 32]).join(''); };
export const fmtCode = (c: string) => `${c.slice(0, 5)}-${c.slice(5)}`;
export const normCode = (c: string) => c.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
