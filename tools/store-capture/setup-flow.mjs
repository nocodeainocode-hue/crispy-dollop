// Kurulum akışı: 03 (paket) ve 05 (imza) karelerini çeker, taze bir test hesabıyla pakt kurar, oturum durumunu kaydeder.
// Yerel geliştirme API'si (demo, pglite) gerekir; giriş kodu API'nin konsol günlüğünden okunur (yalnız yerel test hesabı).
import fs from 'node:fs';
import { launch, sleep, shot, step, tap, next, bodyText } from './lib.mjs';

const API_LOG = process.env.API_LOG ?? 'C:/Users/eyupd/AppData/Local/Temp/api-dev2.log';
const loginCode = async email => {
  for (let i = 0; i < 30; i++) {
    const m = [...fs.readFileSync(API_LOG, 'utf8').matchAll(/GİRİŞ KODU \(([^)]+)\): (\d{6})/g)].filter(x => x[1] === email);
    if (m.length) return m.at(-1)[2];
    await sleep(500);
  }
  throw new Error('giriş kodu günlükte yok: ' + email);
};

const { browser, ctx, page } = await launch();
await page.goto('http://localhost:8099/', { waitUntil: 'load' });
await sleep(3500);
await page.getByRole('radio', { name: 'Spor bahisi' }).click(); await next(page);
await page.getByRole('radio').first().click(); await sleep(300); await next(page);
await page.getByRole('textbox').first().fill('Kızım için'); await next(page);
await page.getByPlaceholder('Ad', { exact: true }).fill('Ayşe');
await page.getByPlaceholder('E-posta', { exact: true }).fill('ayse@example.com');
await page.getByPlaceholder('Telefon (isteğe bağlı)', { exact: true }).fill('0532 000 00 00');
await sleep(400); await next(page);

// 5: deneme seçili; paketler ve tek seferlik damgası aynı karede
await page.getByRole('radio', { name: /7 günlük deneme/ }).click(); await sleep(700);
// Başlığın son satırı kesik görünmesin: kaydırmayı alt başlığın hemen altına hizala, damganın sığdığını doğrula
const fit = await page.evaluate(() => {
  const sc = [...document.querySelectorAll('div')].find(e => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible');
  const leafEl = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /araçların açık.$/.test(e.textContent)).pop();
  const stamp = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /^Tek seferlik ödeme./.test(e.textContent)).pop();
  const top = sc.getBoundingClientRect().top;
  sc.scrollTop = leafEl.getBoundingClientRect().bottom - top + sc.scrollTop + 6;
  return { scroll: Math.round(sc.scrollTop), stampBottom: Math.round(stamp.getBoundingClientRect().bottom), bodyBottom: Math.round(sc.getBoundingClientRect().bottom) };
});
console.log('paket kaydırma', JSON.stringify(fit));
await sleep(700); await shot(page, 'raw/03-paket.png');
await next(page);
console.log(await step(page));                                  // 6 sonuçlar
await next(page);
console.log(await step(page));                                  // 7 mektup
await page.getByRole('textbox').first().fill('Gelecekteki ben: durup düşün. Kızını düşün.'); await next(page);
console.log(await step(page));                                  // 8 hesap
await page.getByPlaceholder('Adın', { exact: true }).fill('Deniz');
const EMAIL = `magaza${Date.now()}@example.com`;
await page.getByPlaceholder('ornek@mail.com').fill(EMAIL);
await tap(page, 'Kod gönder'); await sleep(1200);
await page.getByPlaceholder('123456').fill(await loginCode(EMAIL));
await tap(page, 'Doğrula'); await sleep(2500);
await next(page);
console.log(await step(page));                                  // 9 sözleşme
await shot(page, 'raw/_s9a.png');
// 9: ad-soyad imzası + onay -> 10 imza
await page.getByPlaceholder('Ad Soyad', { exact: true }).fill('Deniz Yılmaz');
await page.getByRole('checkbox').first().click(); await sleep(500);
await next(page, 'İmzaya geç');
console.log((await bodyText(page)).slice(0, 300));
// 10: basılı tut, imzala -> yarıda 05 karesi, sonra tamamla
const holdBtn = page.getByText('Basılı tut, imzala', { exact: true });
const box = await holdBtn.boundingBox();
await page.mouse.move(box.x + 60, box.y + box.height / 2);
await page.mouse.down();
await sleep(Number(process.env.HOLD_MS ?? 720));
await shot(page, 'raw/05-imza.png');
for (let i = 0; i < 40; i++) { await sleep(400); if (/Bugün tamam|Günün kontrolü|Krizdeyim/.test(await bodyText(page))) break; }
await page.mouse.up();
await sleep(2500);
console.log((await bodyText(page)).slice(0, 200).split('\n').join(' | '));
fs.writeFileSync('raw/_email.txt', EMAIL);
await ctx.storageState({ path: 'raw/_state-home.json' });
await browser.close();
