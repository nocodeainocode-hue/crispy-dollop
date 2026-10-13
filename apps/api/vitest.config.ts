import { defineConfig } from 'vitest/config';

// Her test gömülü bir Postgres (PGlite) başlatır; dosyalar paralel koşunca işlemci yetmez, süreler taşar.
export default defineConfig({ test: { testTimeout: 30_000, hookTimeout: 30_000, fileParallelism: false } });
