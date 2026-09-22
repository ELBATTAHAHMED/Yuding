import React from 'react';
import type { PriceConversionSnapshot } from '@/types/travel.types';
import { getPricePresentation } from '@/lib/price-display';

export interface PriceDisplayProps {
  conversion?: PriceConversionSnapshot;
  amount?: number | null;
  currency: string;
  className?: string;
}

/** A consistent, locale-aware display for normalized travel prices. */
export function PriceDisplay({ conversion, amount, currency, className = '' }: PriceDisplayProps) {
  const presentation = getPricePresentation(conversion, amount, currency);
  return (
    <span className={className}>
      <span>{presentation.primary}</span>
      {presentation.original && <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{presentation.original} · prix fournisseur</span>}
      {presentation.conversionUnavailable && <span className="block text-xs font-normal text-amber-700 dark:text-amber-300">Conversion MAD temporairement indisponible</span>}
    </span>
  );
}
