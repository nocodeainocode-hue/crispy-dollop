// Ortak yardımcılar: Chrome (sistemde kurulu) ile gerçek telefon oranında (360x640 @3x = 1080x1920) çekim.
import { chromium } from 'playwright-core';

export const APP = process.env.APP_URL ?? 'http://localhost:8099/';
export const W = 360, H = 640, DPR = 3;

export async function launch({ scheme = 'light', locale = 'tr-TR', storageState } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale, colorScheme: scheme, isMobile: true, hasTouch: true, storageState });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0, 160)));
  // Mağaza karelerinde "Demo: ödeme alınmıyor" notu çıkmasın: yerel sunucu demo modunda, uygulamaya canlı faturalama görünümü ver.
  await page.route('**/health', r => r.fulfill({ json: { ok: true, db: 'pg', play: true, demo: false, billing: true } }));
  return { browser, ctx, page };
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
import fs from 'node:fs';
// Her kare için görünen metni yanına .txt olarak yazar: check.mjs yasaklı dizgeleri bundan tarar.
export const shot = async (page, path) => {
  await page.screenshot({ path, type: 'png' });
  fs.writeFileSync(path.replace(/.png$/, '.txt'), await page.evaluate(() => document.body.innerText));
};
export const bodyText = page => page.evaluate(() => document.body.innerText);
export const step = async page => ((await bodyText(page)).match(/(\d+)\/10 · ([^\n]+)/) || [])[0] ?? '?';
export const tap = async (page, name) => { await page.getByRole('button', { name, exact: true }).first().click(); await sleep(450); };
export const next = async (page, name = 'Devam') => { await tap(page, name); await sleep(1500); };
