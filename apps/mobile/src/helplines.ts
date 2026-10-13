import type { Dict } from './i18n';

export type Line = { name: string; short: string; sub: string; tel: string };
export type Helplines = { lines: Line[]; emergency: string };

/**
 * Ülkeye göre ücretsiz destek hatları (kumar paketi). Bölge cihaz ayarından gelir.
 * YAYINDAN ÖNCE: her ülkenin numarası resmi kaynaktan yeniden doğrulanmalı; kriz ekranında yanlış numara kabul edilemez.
 * Listede olmayan ülkede yalnızca acil numara gösterilir (112: AB ve çoğu GSM şebekesinde çalışır).
 */
const REGIONS: Record<string, (L: Dict) => Helplines> = {
  TR: L => ({
    lines: [
      { name: 'ALO 182', short: 'ALO 182', sub: L.help.psych, tel: '182' },
      { name: 'Yeşilay Danışmanlık · 115', short: 'Yeşilay 115', sub: L.help.addiction, tel: '115' },
    ],
    emergency: '112',
  }),
  US: L => ({
    lines: [
      { name: '1-800-GAMBLER', short: '1-800-GAMBLER', sub: L.help.gambling, tel: '18004262537' },
      { name: '988', short: '988', sub: L.help.crisis, tel: '988' },
    ],
    emergency: '911',
  }),
  GB: L => ({
    lines: [
      { name: 'National Gambling Helpline · 0808 8020 133', short: '0808 8020 133', sub: L.help.gambling, tel: '08088020133' },
      { name: 'Samaritans · 116 123', short: 'Samaritans', sub: L.help.psych, tel: '116123' },
    ],
    emergency: '999',
  }),
};

export function helplines(region: string, L: Dict): Helplines {
  return (REGIONS[region.toUpperCase()] ?? (() => ({ lines: [], emergency: '112' })))(L);
}
