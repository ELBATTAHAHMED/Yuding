import type { PriceConversionSnapshot } from '@/types/travel.types';

export interface PricePresentation {
  primary: string;
  original?: string;
  conversionUnavailable: boolean;
  rateDate?: string;
}

export function formatMoney(amount: number, currency: string, locale = 'fr-MA'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getPricePresentation(
  conversion: PriceConversionSnapshot | undefined,
  fallbackAmount: number | null | undefined,
  fallbackCurrency: string,
): PricePresentation {
  if (fallbackAmount == null || isNaN(fallbackAmount) || fallbackAmount <= 0) {
    return {
      primary: 'Tarif indisponible',
      conversionUnavailable: false,
    };
  }
  if (conversion?.displayAmount != null && conversion.conversionStatus !== 'UNAVAILABLE' && conversion.displayAmount > 0) {
    return {
      primary: formatMoney(conversion.displayAmount, conversion.displayCurrency),
      original: formatMoney(conversion.providerAmount, conversion.providerCurrency),
      conversionUnavailable: false,
      rateDate: conversion.exchangeRateDate,
    };
  }
  return {
    primary: formatMoney(fallbackAmount, fallbackCurrency),
    conversionUnavailable: conversion?.conversionStatus === 'UNAVAILABLE',
  };
}
