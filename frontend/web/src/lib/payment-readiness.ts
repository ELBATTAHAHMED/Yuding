import { ApiError } from './api-client.ts';
import { bookingService } from '../services/booking.service.ts';
import type { BookingPricingResponseDto, BookingRevalidationResponseDto } from '../types/booking.types.ts';

export type PaymentReadiness =
  | { kind: 'ready'; pricing: BookingPricingResponseDto }
  | { kind: 'price_changed'; revalidation: BookingRevalidationResponseDto }
  | { kind: 'unavailable'; message: string };

const unavailableOffer = 'Cette offre n’est plus disponible. Choisissez une nouvelle prestation depuis la recherche.';

export async function preparePayment(reference: string): Promise<PaymentReadiness> {
  const booking = await bookingService.getBookingByReference(reference);
  if (booking.status !== 'DRAFT' && booking.status !== 'PENDING_PAYMENT') {
    return { kind: 'unavailable', message: 'Ce dossier ne peut plus être réglé depuis cette page. Consultez son état dans vos réservations.' };
  }

  let pricing: BookingPricingResponseDto | null = null;
  try {
    pricing = await bookingService.getAuthoritativePricing(reference);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
  }

  if (pricing?.canProceedToPayment) return { kind: 'ready', pricing };

  // A payment order already initiated can be resumed while its authoritative quote is live.
  if (booking.status === 'PENDING_PAYMENT') {
    if (pricing?.pricingStatus === 'PRICED' && Date.parse(pricing.validUntil) > Date.now()) {
      return { kind: 'ready', pricing };
    }
    return { kind: 'unavailable', message: 'Le tarif de ce paiement en attente a expiré. Consultez le dossier pour suivre son état.' };
  }

  if (!booking.offerSnapshot) return { kind: 'unavailable', message: unavailableOffer };

  const revalidation = await bookingService.revalidateBooking(reference);
  if (revalidation.availabilityStatus !== 'AVAILABLE') {
    return { kind: 'unavailable', message: unavailableOffer };
  }
  if (revalidation.requiresPriceConfirmation) {
    return { kind: 'price_changed', revalidation };
  }
  if (!revalidation.canProceedToPricing) {
    return { kind: 'unavailable', message: 'Le fournisseur n’a pas pu confirmer ce tarif. Réessayez ou choisissez une autre offre.' };
  }
  return priceRevalidatedBooking(reference);
}

export async function priceRevalidatedBooking(reference: string): Promise<PaymentReadiness> {
  const pricing = await bookingService.createAuthoritativePricing(reference);
  return pricing.canProceedToPayment
    ? { kind: 'ready', pricing }
    : { kind: 'unavailable', message: 'Le tarif de cette prestation ne peut pas être réglé en ligne.' };
}
