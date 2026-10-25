import React from 'react';
import { PackPlant, type PackTier } from '../art/misc';

/** Gün sayısını paket bitkisine çevirir: 30 Filiz, 60 Fidan, 90 Ağaç (7 günlük deneme de Filiz'in küçük hali). */
export const tierOf = (d: number): PackTier => (d <= 30 ? 'filiz' : d <= 60 ? 'fidan' : 'agac');

/**
 * Paket kartlarındaki saksı bitkisi: tuvaldeki (Paywall) çizim, art/misc PackPlant. `height` görünen yükseklik (tuval 112).
 * `swaying` yalnızca seçili kartta verilir (ekranda tek sonsuz hareket); hareketi azalt açıkken kütüphane durağan bırakır.
 */
export default function PackArt({ d, height = 112, swaying = false }: { d: number; height?: number; swaying?: boolean }) {
  return <PackPlant tier={tierOf(d)} height={height} swaying={swaying} />;
}
