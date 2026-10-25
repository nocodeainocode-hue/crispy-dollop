// Oturum açmış, istenen günde bir bahçe durumuyla çekim: 01 ana ekran, 02 kriz, 06 günlük kontrol, 07 gün tamam (gece), 08 sakinleş.
// setup-flow.mjs önce çalışmış olmalı (raw/_state-home.json). Sunucudaki pakt cevabı yalnızca gün sayısı için yerinde yeniden yazılır.
import fs from 'node:fs';
import { launch, sleep, shot, tap, bodyText } from './lib.mjs';

const DAY = 86400000;
const base = JSON.parse(fs.readFileSync('raw/_state-home.json', 'utf8'));

/** Kayıtlı oturumu verilen güne taşır: startedAt geriye, önceki günlerin kontrolleri işlenmiş. */
function seeded(day, goal) {
  const startedAt = Date.now() - (day - 1) * DAY - 2 * 3600e3;
  const checkIns = Array.from({ length: day - 1 }, (_, i) => startedAt + i * DAY + 3600e3);
  const st = JSON.parse(JSON.stringify(base));
  const ls = st.origins.find(o => o.localStorage.some(x => x.name === 'lockin.v4')).localStorage;
  const e = ls.find(x => x.name === 'lockin.v4');
  const v = JSON.parse(e.value);
  Object.assign(v, { startedAt, streakStartedAt: startedAt, checkIns, lastCheckIn: checkIns.at(-1) ?? 0, goalDays: goal, reason: 'Kızım için', nextVerifyAt: 0 });
  e.value = JSON.stringify(v);
  const path = `raw/_state-day${day}.json`;
  fs.writeFileSync(path, JSON.stringify(st));
  return { path, startedAt };
}

async function open({ day, goal = 30, scheme = 'light' }) {
  const { path, startedAt } = seeded(day, goal);
  const c = await launch({ scheme, storageState: path });
  await c.page.route('**/pacts/current', async route => {
    if (route.request().method() === 'POST') return route.continue();
    const r = await route.fetch();
    let j; try { j = await r.json(); } catch { return route.fulfill({ response: r }); }
    if (j && typeof j === 'object' && 'goalDays' in j) Object.assign(j, { goalDays: goal, startedAt, streakStartedAt: startedAt, status: 'active', lastCheckIn: 0 });
    return route.fulfill({ response: r, json: j });
  });
  await c.page.goto('http://localhost:8099/', { waitUntil: 'load' });
  await sleep(3500);
  return c;
}

const only = process.argv.slice(2);
const want = n => !only.length || only.includes(n);

if (want('01')) {
  const { browser, page } = await open({ day: 9 });
  await sleep(6500);
  await shot(page, 'raw/01-ana-ekran.png');
  console.log('01', (await bodyText(page)).split('\n').slice(0, 6).join(' | '));
  await browser.close();
}
if (want('02')) {
  const { browser, page } = await open({ day: 9 });
  await sleep(2000);
  await tap(page, 'Krizdeyim'); await sleep(4500);
  await shot(page, 'raw/02-kriz.png');
  console.log('02', (await bodyText(page)).split('\n').slice(0, 8).join(' | '));
  await browser.close();
}
if (want('06')) {
  const { browser, page } = await open({ day: 9 });
  await sleep(2000);
  await tap(page, 'Günün kontrolü'); await sleep(1500);
  await tap(page, 'Hayır, oynamadım'); await sleep(1800);
  await page.getByText('3', { exact: true }).first().click(); await sleep(900);
  await shot(page, 'raw/06-gunluk-kontrol.png');
  console.log('06', (await bodyText(page)).split(String.fromCharCode(10)).slice(0, 8).join(' | '));
  await browser.close();
}
if (want('07')) {
  // 14. gün: kontrolü kaydedince ikinci lale açar (gece teması)
  const { browser, page } = await open({ day: 14, scheme: 'dark' });
  await sleep(2000);
  await tap(page, 'Günün kontrolü'); await sleep(1500);
  await tap(page, 'Hayır, oynamadım'); await sleep(1800);
  await page.getByText('2', { exact: true }).first().click(); await sleep(600);
  await tap(page, 'Kaydet'); await sleep(7500);
  await shot(page, 'raw/07-gun-tamam.png');
  console.log('07', (await bodyText(page)).split(String.fromCharCode(10)).slice(0, 8).join(' | '));
  await browser.close();
}
if (want('08')) {
  const { browser, page } = await open({ day: 9 });
  await sleep(2000);
  await tap(page, 'Sakinleş'); await sleep(2500);
  await shot(page, 'raw/08-sakinles.png');
  console.log('08', (await bodyText(page)).split('\n').slice(0, 8).join(' | '));
  await browser.close();
}
