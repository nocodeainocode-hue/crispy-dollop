// Sudoku üretim/çözüm mantığı (arayüzden bağımsız, saf TypeScript).
// Klasik 9x9 Sudoku. Her bulmaca TEK ÇÖZÜMLÜ üretilir (ipucu bu yüzden her zaman doğru yönlendirir).
// Zorluk = ipucu (başlangıç sayısı) azlığı: ne kadar az sayı, o kadar zor.
export const shuffle = <A,>(a: A[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

const pop = (m: number) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

/** Çakışma kontrolü (oyuncu girişleri için) */
export const fits = (g: number[], i: number, v: number) => {
  const r = Math.floor(i / 9), col = i % 9;
  for (let k = 0; k < 9; k++) {
    if (r * 9 + k !== i && g[r * 9 + k] === v) return false;
    if (k * 9 + col !== i && g[k * 9 + col] === v) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(col / 3) * 3;
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const idx = (br + a) * 9 + bc + b; if (idx !== i && g[idx] === v) return false; }
  return true;
};

/** Çözüm sayar (en fazla `limit`). Bit maskeli, en az adaylı hücreyi önce dener: hızlıdır. */
export function countSolutions(puz: number[], limit = 2): number {
  const g = [...puz], row = Array(9).fill(0), col = Array(9).fill(0), box = Array(9).fill(0);
  const bx = (i: number) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);
  for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << g[i]; row[Math.floor(i / 9)] |= b; col[i % 9] |= b; box[bx(i)] |= b; }
  let count = 0;
  const rec = () => {
    if (count >= limit) return;
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const avail = ~(row[Math.floor(i / 9)] | col[i % 9] | box[bx(i)]) & 0x3fe;
      const n = pop(avail);
      if (n === 0) return;
      if (n < bestN) { best = i; bestMask = avail; bestN = n; if (n === 1) break; }
    }
    if (best < 0) { count++; return; }
    const r = Math.floor(best / 9), cc = best % 9, b2 = bx(best);
    for (let v = 1; v <= 9; v++) {
      if (!(bestMask & (1 << v))) continue;
      g[best] = v; row[r] |= 1 << v; col[cc] |= 1 << v; box[b2] |= 1 << v;
      rec();
      g[best] = 0; row[r] &= ~(1 << v); col[cc] &= ~(1 << v); box[b2] &= ~(1 << v);
      if (count >= limit) return;
    }
  };
  rec();
  return count;
}

export function fill(g: number[], i = 0): boolean {
  if (i === 81) return true;
  for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (fits(g, i, v)) { g[i] = v; if (fill(g, i + 1)) return true; g[i] = 0; }
  }
  return false;
}

// Hedef başlangıç sayısı (ipucu): azaldıkça zorlaşır. Ekstra zor, süre sınırı içinde ulaşılabilen en düşük sayıya iner.
/** Zorluk kimliği → verilen ipucu sayısı. Görünen adlar sözlükte (games.levels). */
export const LEVELS: Record<string, number> = { easy: 40, medium: 32, hard: 27, extreme: 23 };

export function makePuzzle(level: string) {
  const sol = Array(81).fill(0);
  fill(sol);
  const puz = [...sol];
  let clues = 81;
  const target = LEVELS[level], t0 = Date.now();
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k))) {
    if (clues <= target || Date.now() - t0 > 1800) break; // süre aşımı: ulaşılabildiği kadar
    const v = puz[i];
    puz[i] = 0;
    if (countSolutions(puz, 2) === 1) clues--; else puz[i] = v; // tek çözüm bozulursa geri koy
  }
  return { puz, sol };
}

