import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import type { Config } from './config.js';

/** Google Play Developer API (androidpublisher v3) ile tek seferlik ürün satın alma doğrulaması. */
export type PlayProduct = {
  purchaseState: number;            // 0 satın alındı, 1 iptal, 2 beklemede
  consumptionState: number;         // 0 tüketilmedi, 1 tüketildi
  acknowledgementState: number;     // 0 onaylanmadı, 1 onaylandı
  orderId?: string;
  obfuscatedExternalAccountId?: string; // satın alma sırasında uygulamanın verdiği hesap kimliği
};
export interface PlayClient {
  getProduct(productId: string, purchaseToken: string): Promise<PlayProduct>;
  consume(productId: string, purchaseToken: string): Promise<void>;
}
export class PlayError extends Error { constructor(public status: number, m: string) { super(m); } }

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

function loadServiceAccount(cfg: Config): { client_email: string; private_key: string } | null {
  try {
    const raw = cfg.googleServiceAccountJson ?? (cfg.googleServiceAccountFile ? fs.readFileSync(cfg.googleServiceAccountFile, 'utf8') : null);
    if (!raw) return null;
    const j = JSON.parse(raw);
    return j.client_email && j.private_key ? { client_email: j.client_email, private_key: j.private_key } : null;
  } catch { return null; }
}

/** Yapılandırma yoksa null döner (doğrulama kapalı). Erişim anahtarı süresi dolana kadar önbellekte tutulur. */
export function createPlayClient(cfg: Config): PlayClient | null {
  const sa = loadServiceAccount(cfg);
  if (!sa) return null;
  let cached: { token: string; exp: number } | null = null;

  const accessToken = async () => {
    const now = Math.floor(Date.now() / 1000);
    if (cached && cached.exp - 60 > now) return cached.token;
    const assertion = jwt.sign({ iss: sa.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }, sa.private_key, { algorithm: 'RS256' });
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw new PlayError(502, `Google kimlik doğrulaması başarısız: ${j.error_description ?? j.error ?? r.status}`);
    cached = { token: j.access_token, exp: now + (j.expires_in ?? 3600) };
    return cached.token;
  };
  const url = (productId: string, token: string, action = '') =>
    `${API}/${encodeURIComponent(cfg.googlePackage)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}${action}`;
  const call = async (u: string, method: 'GET' | 'POST') => {
    const r = await fetch(u, { method, headers: { Authorization: `Bearer ${await accessToken()}` } });
    const text = await r.text();
    if (!r.ok) throw new PlayError(r.status, `Google Play yanıtı ${r.status}: ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : {};
  };

  return {
    async getProduct(productId, purchaseToken) {
      const j = await call(url(productId, purchaseToken), 'GET');
      return { purchaseState: j.purchaseState ?? 0, consumptionState: j.consumptionState ?? 0, acknowledgementState: j.acknowledgementState ?? 0, orderId: j.orderId, obfuscatedExternalAccountId: j.obfuscatedExternalAccountId };
    },
    async consume(productId, purchaseToken) { await call(url(productId, purchaseToken, ':consume'), 'POST'); },
  };
}
