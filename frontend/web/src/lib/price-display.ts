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

/** Chooses the normalized display price, with a truthful provider-price fallback. */
export function getPricePresentation(
  conversion: PriceConversionSnapshot | undefined,
  fallbackAmount: number,
  fallbackCurrency: string,
): PricePresentation {
  if (conversion?.displayAmount != null && conversion.conversionStatus !== 'UNAVAILABLE') {
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
