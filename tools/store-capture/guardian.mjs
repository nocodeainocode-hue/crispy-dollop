// Şahit portalı: davet kodunu yerel API günlüğünden okuyup şahit olarak girer; 04 karesi ve davetin kabulü.
import fs from 'node:fs';
import { launch, sleep, shot, tap, bodyText } from './lib.mjs';
const API_LOG = process.env.API_LOG ?? 'C:/Users/eyupd/AppData/Local/Temp/api-dev2.log';
const m = [...fs.readFileSync(API_LOG, 'utf8').matchAll(/ŞAHİT DAVET KODU \(ayse@example\.com\): ([0-9A-Z]{5}-[0-9A-Z]{5})/g)];
const code = m.at(-1)[1];
const { browser, ctx, page } = await launch();
await page.goto('http://localhost:8099/', { waitUntil: 'load' });
await sleep(3500);
await page.getByText('ŞAHİT', { exact: true }).first().click(); await sleep(1500);
await page.getByPlaceholder('ABCDE-FGHJK').fill(code);
await tap(page, 'Devam'); await sleep(3000);
await shot(page, 'raw/04b-davet.png');
console.log((await bodyText(page)).split('\n').slice(0, 30).join(' | '));
await tap(page, 'Şahit ol'); await sleep(3500);
await shot(page, 'raw/04-sahit.png');
console.log('--- kabul sonrası:', (await bodyText(page)).split(String.fromCharCode(10)).slice(0, 30).join(' | '));
await ctx.storageState({ path: 'raw/_state-guardian.json' });
await browser.close();
