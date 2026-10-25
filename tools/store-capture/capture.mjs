// Tüm ham kareleri sırayla çeker: kurulum (03, 05) -> şahit (04) -> bahçe kareleri (01, 02, 06, 07, 08).
// Önkoşul: Expo web (8099) ve yerel geliştirme API'si (4000, demo) çalışıyor; bkz. README.md.
import { spawnSync } from 'node:child_process';
for (const f of ['setup-flow.mjs', 'guardian.mjs', 'frames.mjs']) {
  console.log('\n== ' + f);
  const r = spawnSync(process.execPath, [f], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
